"""
Booking state machine and lifecycle management.

Valid transitions:
  requested   → accepted     (professional accepts)
  accepted    → in_progress  (professional starts)
  in_progress → completed    (professional marks done)
  completed   → rated        (user submits review)
  any (except completed/rated/refunded) → cancelled
  cancelled   → refunded     (automatic on certain conditions)
"""
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.booking import Booking, BookingStatus, BookingStatusTimeline
from app.models.payment import Payment, PaymentStatus, WalletTransaction, TransactionType
from app.models.user import User


# ─── Allowed transitions ────────────────────────────────────────────────────────

TRANSITIONS: dict[BookingStatus, list[BookingStatus]] = {
    BookingStatus.requested: [BookingStatus.accepted, BookingStatus.cancelled],
    BookingStatus.accepted: [BookingStatus.in_progress, BookingStatus.cancelled],
    BookingStatus.in_progress: [BookingStatus.completed, BookingStatus.cancelled],
    BookingStatus.completed: [BookingStatus.rated],
    BookingStatus.rated: [],
    BookingStatus.cancelled: [BookingStatus.refunded],
    BookingStatus.refunded: [],
}


# ─── Core transition helper ─────────────────────────────────────────────────────

async def transition_booking(
    db: AsyncSession,
    booking: Booking,
    new_status: BookingStatus,
    actor: User,
    note: str | None = None,
) -> Booking:
    """
    Apply a state transition to a booking, logging it to the timeline.
    Raises 400 if the transition is not allowed.
    """
    allowed = TRANSITIONS.get(booking.status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot move booking from '{booking.status}' to '{new_status}'",
        )

    booking.status = new_status
    booking.updated_at = datetime.now(timezone.utc)

    timeline_entry = BookingStatusTimeline(
        booking_id=booking.id,
        status=new_status,
        changed_by=actor.id,
        note=note,
    )
    db.add(timeline_entry)
    await db.flush()
    return booking


# ─── Cancellation + refund logic ───────────────────────────────────────────────

CANCELLATION_REFUND_RULES = {
    # status at time of cancel  → refund_pct
    BookingStatus.requested: 1.0,    # 100% refund — pro not assigned yet
    BookingStatus.accepted: 1.0,     # 100% refund — pro not started
    BookingStatus.in_progress: 0.5,  # 50% refund
}


async def cancel_booking(
    db: AsyncSession,
    booking: Booking,
    actor: User,
    reason: str,
) -> Booking:
    """Cancel a booking and trigger refund if payment was made via wallet."""
    pre_cancel_status = booking.status
    booking.cancellation_reason = reason

    booking = await transition_booking(db, booking, BookingStatus.cancelled, actor, note=reason)

    # Auto-refund for wallet payments
    payment = await db.scalar(select(Payment).where(
        Payment.booking_id == booking.id,
        Payment.status == PaymentStatus.paid,
    ))

    if payment and payment.method.value == "wallet":
        refund_pct = CANCELLATION_REFUND_RULES.get(pre_cancel_status, 0.0)
        if refund_pct > 0:
            refund_amount = round(float(payment.amount) * refund_pct, 2)
            await _issue_wallet_refund(db, booking, actor.id, refund_amount)

    return booking


async def _issue_wallet_refund(
    db: AsyncSession,
    booking: Booking,
    user_id: str,
    amount: float,
):
    """Credit wallet and record a WalletTransaction."""
    # Update wallet balance
    user_result = await db.execute(select(User).where(User.id == user_id))
    user: User | None = user_result.scalar_one_or_none()
    if user:
        user.wallet_balance = float(user.wallet_balance) + amount

    txn = WalletTransaction(
        user_id=user_id,
        amount=amount,
        type=TransactionType.credit,
        reason=f"Refund for cancelled booking {booking.id[:8].upper()}",
        booking_id=booking.id,
    )
    db.add(txn)

    # Mark booking as refunded
    await transition_booking(db, booking, BookingStatus.refunded, user, note=f"Auto-refund ₹{amount}")


# ─── Reschedule logic ──────────────────────────────────────────────────────────

MAX_RESCHEDULES = 2


async def reschedule_booking(
    db: AsyncSession,
    booking: Booking,
    actor: User,
    new_date: str,
    new_slot: str,
) -> Booking:
    if booking.status not in (BookingStatus.requested, BookingStatus.accepted):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking can only be rescheduled when requested or accepted",
        )
    if booking.reschedule_count >= MAX_RESCHEDULES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_RESCHEDULES} reschedules allowed per booking",
        )

    booking.scheduled_date = new_date
    booking.time_slot = new_slot
    booking.reschedule_count += 1

    timeline_entry = BookingStatusTimeline(
        booking_id=booking.id,
        status=booking.status,
        changed_by=actor.id,
        note=f"Rescheduled to {new_date} {new_slot}",
    )
    db.add(timeline_entry)
    await db.flush()
    return booking
