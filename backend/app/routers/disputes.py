"""
Disputes router — user-reported issues with evidence upload and admin resolution.
"""
import os, aiofiles
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, UploadFile, File
from sqlalchemy import select

from app.deps import DbSession, CurrentUser, RequireAdmin
from app.models.dispute import Dispute, DisputeEvidence, DisputeStatus
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment, PaymentStatus, WalletTransaction, TransactionType
from app.models.user import User
from app.schemas.common import DisputeCreate, DisputeResponse, DisputeResolve
from app.config import settings

router = APIRouter(prefix="/disputes", tags=["disputes"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}


@router.post("/", response_model=DisputeResponse, status_code=status.HTTP_201_CREATED)
async def raise_dispute(body: DisputeCreate, db: DbSession, current_user: CurrentUser):
    """User raises a dispute on a completed booking."""
    booking = await db.scalar(select(Booking).where(Booking.id == body.booking_id))
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if booking.status not in (BookingStatus.completed, BookingStatus.rated):
        raise HTTPException(status_code=400, detail="Disputes can only be raised on completed bookings")

    existing = await db.scalar(select(Dispute).where(Dispute.booking_id == body.booking_id))
    if existing:
        raise HTTPException(status_code=409, detail="A dispute already exists for this booking")

    dispute = Dispute(
        booking_id=body.booking_id,
        raised_by=current_user.id,
        against_id=booking.pro_id or booking.user_id,
        reason=body.reason,
    )
    db.add(dispute)
    await db.flush()
    return dispute


@router.post("/{dispute_id}/evidence")
async def upload_evidence(
    dispute_id: str,
    db: DbSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
):
    """Upload supporting evidence (image or PDF, max 10MB)."""
    dispute = await db.scalar(select(Dispute).where(Dispute.id == dispute_id))
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    if dispute.raised_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {ALLOWED_TYPES}")

    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail=f"File too large. Max {settings.MAX_FILE_SIZE_MB}MB")

    upload_dir = os.path.join(settings.UPLOAD_DIR, "disputes", dispute_id)
    os.makedirs(upload_dir, exist_ok=True)
    safe_name = f"{dispute_id}_{file.filename}"
    file_path = os.path.join(upload_dir, safe_name)

    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)

    evidence = DisputeEvidence(
        dispute_id=dispute_id,
        uploaded_by=current_user.id,
        file_url=f"/uploads/disputes/{dispute_id}/{safe_name}",
        file_type=file.content_type,
    )
    db.add(evidence)
    return {"file_url": evidence.file_url}


@router.get("/", response_model=list[DisputeResponse])
async def list_disputes(db: DbSession, current_user: CurrentUser, skip: int = 0, limit: int = 20):
    from app.models.user import UserRole
    q = select(Dispute)
    if current_user.role != UserRole.admin:
        q = q.where(Dispute.raised_by == current_user.id)
    result = await db.execute(q.order_by(Dispute.created_at.desc()).offset(skip).limit(limit))
    return result.scalars().all()


@router.patch("/{dispute_id}/resolve", response_model=DisputeResponse)
async def resolve_dispute(dispute_id: str, body: DisputeResolve, db: DbSession, _admin: RequireAdmin, current_user: CurrentUser):
    """Admin resolves a dispute. Optionally issues a partial refund to the claimant's wallet."""
    dispute = await db.scalar(select(Dispute).where(Dispute.id == dispute_id))
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    if dispute.status == DisputeStatus.resolved:
        raise HTTPException(status_code=400, detail="Dispute already resolved")

    dispute.status = DisputeStatus.resolved
    dispute.resolution = body.resolution
    dispute.resolved_by = current_user.id
    dispute.resolved_at = datetime.now(timezone.utc)

    if body.refund_amount and body.refund_amount > 0:
        dispute.refund_amount = body.refund_amount
        # Credit wallet
        user_result = await db.execute(select(User).where(User.id == dispute.raised_by))
        user = user_result.scalar_one_or_none()
        if user:
            user.wallet_balance = float(user.wallet_balance) + body.refund_amount
            db.add(WalletTransaction(
                user_id=dispute.raised_by,
                amount=body.refund_amount,
                type=TransactionType.credit,
                reason=f"Dispute refund for booking {dispute.booking_id[:8].upper()}",
                booking_id=dispute.booking_id,
            ))

    return dispute
