"""
Bookings router — full booking lifecycle.
"""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.deps import DbSession, CurrentUser, RequireProfessional
from app.models.booking import Booking, BookingStatus, BookingStatusTimeline
from app.models.service import Service
from app.models.professional import Professional
from app.models.payment import Payment, PaymentMethod, PaymentStatus, WalletTransaction, TransactionType
from app.models.user import User
from app.schemas.booking import (
    BookingCreate, BookingResponse, CancelBookingRequest,
    RescheduleRequest, PriceQuoteRequest, PriceQuoteResponse,
)
from app.services.booking_service import transition_booking, cancel_booking, reschedule_booking
from app.services.pricing_service import calculate_price

router = APIRouter(prefix="/bookings", tags=["bookings"])


# ─── Price quote (no auth required) ────────────────────────────────────────────

@router.post("/quote", response_model=PriceQuoteResponse)
async def get_price_quote(body: PriceQuoteRequest, db: DbSession):
    """Get a price breakdown before booking."""
    service = await db.scalar(select(Service).where(Service.id == body.service_id))
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    breakdown = calculate_price(float(service.base_price), addons=body.addons)
    return PriceQuoteResponse(**breakdown.__dict__)


# ─── Create booking ─────────────────────────────────────────────────────────────

@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(body: BookingCreate, db: DbSession, current_user: CurrentUser):
    """Create a new booking. Deducts from wallet if user selects wallet payment."""
    service = await db.scalar(select(Service).where(Service.id == body.service_id, Service.is_active == True))
    if not service:
        raise HTTPException(status_code=404, detail="Service not found or unavailable")

    breakdown = calculate_price(float(service.base_price), addons=body.addons)

    booking = Booking(
        service_id=body.service_id,
        user_id=current_user.id,
        scheduled_date=body.scheduled_date,
        time_slot=body.time_slot,
        address=body.address,
        latitude=body.latitude,
        longitude=body.longitude,
        addons=body.addons,
        notes=body.notes,
        base_price=breakdown.base_price,
        platform_fee=breakdown.platform_fee,
        tax=breakdown.tax,
        total_price=breakdown.total,
        status=BookingStatus.requested,
    )
    db.add(booking)
    await db.flush()

    # Log initial timeline entry
    db.add(BookingStatusTimeline(
        booking_id=booking.id,
        status=BookingStatus.requested,
        changed_by=current_user.id,
        note="Booking created",
    ))
    return booking


# ─── List / Get ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[BookingResponse])
async def list_bookings(db: DbSession, current_user: CurrentUser, skip: int = 0, limit: int = 20):
    """List bookings for the current user (or all if admin)."""
    from app.models.user import UserRole
    q = select(Booking)
    if current_user.role == UserRole.user:
        q = q.where(Booking.user_id == current_user.id)
    elif current_user.role == UserRole.professional:
        # find their pro profile
        pro = await db.scalar(select(Professional).where(Professional.user_id == current_user.id))
        if pro:
            q = q.where(Booking.pro_id == pro.id)
    q = q.order_by(Booking.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: str, db: DbSession, current_user: CurrentUser):
    booking = await db.scalar(select(Booking).where(Booking.id == booking_id))
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    _assert_access(booking, current_user, db)
    return booking


# ─── State transitions ──────────────────────────────────────────────────────────

@router.patch("/{booking_id}/accept", response_model=BookingResponse)
async def accept_booking(booking_id: str, db: DbSession, current_user: CurrentUser):
    """Professional accepts a requested booking."""
    booking, pro = await _get_booking_and_pro(booking_id, db, current_user)
    booking.pro_id = pro.id
    return await transition_booking(db, booking, BookingStatus.accepted, current_user, note="Accepted by professional")


@router.patch("/{booking_id}/start", response_model=BookingResponse)
async def start_booking(booking_id: str, db: DbSession, current_user: CurrentUser):
    """Professional marks the job as in progress."""
    booking, _ = await _get_booking_and_pro(booking_id, db, current_user)
    return await transition_booking(db, booking, BookingStatus.in_progress, current_user, note="Work started")


@router.patch("/{booking_id}/complete", response_model=BookingResponse)
async def complete_booking(booking_id: str, db: DbSession, current_user: CurrentUser):
    """Professional marks the job as completed."""
    booking, _ = await _get_booking_and_pro(booking_id, db, current_user)
    return await transition_booking(db, booking, BookingStatus.completed, current_user, note="Work completed")


@router.patch("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking_endpoint(booking_id: str, body: CancelBookingRequest, db: DbSession, current_user: CurrentUser):
    """Cancel a booking. Issues wallet refund based on cancellation policy."""
    booking = await db.scalar(select(Booking).where(Booking.id == booking_id))
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return await cancel_booking(db, booking, current_user, body.reason)


@router.patch("/{booking_id}/reschedule", response_model=BookingResponse)
async def reschedule(booking_id: str, body: RescheduleRequest, db: DbSession, current_user: CurrentUser):
    """Reschedule a booking's date and time slot (max 2 times)."""
    booking = await db.scalar(select(Booking).where(Booking.id == booking_id))
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return await reschedule_booking(db, booking, current_user, str(body.new_date), body.new_slot)


@router.get("/{booking_id}/timeline")
async def get_timeline(booking_id: str, db: DbSession, current_user: CurrentUser):
    """Get the full status history of a booking."""
    result = await db.execute(
        select(BookingStatusTimeline)
        .where(BookingStatusTimeline.booking_id == booking_id)
        .order_by(BookingStatusTimeline.created_at)
    )
    return result.scalars().all()


# ─── Helpers ────────────────────────────────────────────────────────────────────

async def _get_booking_and_pro(booking_id: str, db: DbSession, current_user: User):
    pro = await db.scalar(select(Professional).where(Professional.user_id == current_user.id))
    if not pro:
        raise HTTPException(status_code=403, detail="Professional profile required")
    booking = await db.scalar(select(Booking).where(Booking.id == booking_id))
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking, pro


def _assert_access(booking: Booking, user: User, db):
    from app.models.user import UserRole
    if user.role == UserRole.admin:
        return
    if booking.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
