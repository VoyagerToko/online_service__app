"""
Admin router — user/pro management, analytics dashboard.
"""
from fastapi import APIRouter, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.deps import DbSession, RequireAdmin
from app.models.user import User, UserRole
from app.models.professional import Professional
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment, PaymentStatus
from app.models.dispute import Dispute, DisputeStatus
from app.models.kyc import KYCDocument, KYCStatus
from app.schemas.common import AnalyticsSummary, AdminAccountResponse
from app.services.account_service import soft_delete_user_account

router = APIRouter(prefix="/admin", tags=["admin"])


def _to_admin_account(user: User) -> AdminAccountResponse:
    pro = user.professional_profile
    return AdminAccountResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value,
        is_active=user.is_active,
        is_blocked=user.is_blocked,
        is_email_verified=user.is_email_verified,
        created_at=user.created_at,
        professional_id=pro.id if pro else None,
        is_suspended=pro.is_suspended if pro else None,
    )


@router.get("/analytics", response_model=AnalyticsSummary)
async def get_analytics(db: DbSession, _admin: RequireAdmin):
    """Platform-wide analytics for the admin dashboard."""
    total_users = await db.scalar(select(func.count(User.id)).where(User.role == UserRole.user))
    total_pros = await db.scalar(select(func.count(Professional.id)))
    total_bookings = await db.scalar(select(func.count(Booking.id)))
    completed = await db.scalar(select(func.count(Booking.id)).where(Booking.status == BookingStatus.completed))
    cancelled = await db.scalar(select(func.count(Booking.id)).where(Booking.status == BookingStatus.cancelled))
    revenue_result = await db.scalar(
        select(func.sum(Payment.amount)).where(Payment.status == PaymentStatus.paid)
    )
    open_disputes = await db.scalar(select(func.count(Dispute.id)).where(Dispute.status == DisputeStatus.open))
    pending_kyc = await db.scalar(select(func.count(KYCDocument.id)).where(KYCDocument.status == KYCStatus.pending))

    cancellation_rate = round(cancelled / total_bookings * 100, 2) if total_bookings else 0.0

    return AnalyticsSummary(
        total_users=total_users or 0,
        total_professionals=total_pros or 0,
        total_bookings=total_bookings or 0,
        completed_bookings=completed or 0,
        cancelled_bookings=cancelled or 0,
        cancellation_rate=cancellation_rate,
        total_revenue=float(revenue_result or 0),
        open_disputes=open_disputes or 0,
        pending_kyc=pending_kyc or 0,
    )


@router.patch("/users/{user_id}/block")
async def block_user(user_id: str, db: DbSession, _admin: RequireAdmin):
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == UserRole.admin:
        active_admins = await db.scalar(
            select(func.count(User.id)).where(
                User.role == UserRole.admin,
                User.id != user.id,
                User.is_active.is_(True),
                User.is_blocked.is_(False),
            )
        )
        if not active_admins:
            raise HTTPException(status_code=400, detail="Cannot block the last active admin account")

    user.is_blocked = True
    return {"message": f"User {user.email} has been blocked"}


@router.patch("/users/{user_id}/unblock")
async def unblock_user(user_id: str, db: DbSession, _admin: RequireAdmin):
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Cannot unblock an inactive/deleted account")

    user.is_blocked = False
    return {"message": f"User {user.email} has been unblocked"}


@router.patch("/users/{user_id}/suspend")
async def suspend_user_professional(user_id: str, db: DbSession, _admin: RequireAdmin):
    user = await db.scalar(
        select(User)
        .options(selectinload(User.professional_profile))
        .where(User.id == user_id)
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != UserRole.professional or not user.professional_profile:
        raise HTTPException(status_code=400, detail="User is not a professional account")

    user.professional_profile.is_suspended = True
    user.professional_profile.is_available = False
    return {"message": "Professional account suspended"}


@router.patch("/users/{user_id}/reinstate")
async def reinstate_user_professional(user_id: str, db: DbSession, _admin: RequireAdmin):
    user = await db.scalar(
        select(User)
        .options(selectinload(User.professional_profile))
        .where(User.id == user_id)
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != UserRole.professional or not user.professional_profile:
        raise HTTPException(status_code=400, detail="User is not a professional account")

    user.professional_profile.is_suspended = False
    return {"message": "Professional account reinstated"}


@router.patch("/professionals/{pro_id}/suspend")
async def suspend_professional(pro_id: str, db: DbSession, _admin: RequireAdmin):
    pro = await db.scalar(select(Professional).where(Professional.id == pro_id))
    if not pro:
        raise HTTPException(status_code=404, detail="Professional not found")
    pro.is_suspended = True
    return {"message": "Professional suspended"}


@router.patch("/professionals/{pro_id}/reinstate")
async def reinstate_professional(pro_id: str, db: DbSession, _admin: RequireAdmin):
    pro = await db.scalar(select(Professional).where(Professional.id == pro_id))
    if not pro:
        raise HTTPException(status_code=404, detail="Professional not found")
    pro.is_suspended = False
    return {"message": "Professional reinstated"}


@router.get("/kyc", summary="List pending KYC submissions")
async def list_kyc(db: DbSession, _admin: RequireAdmin, status_filter: KYCStatus = KYCStatus.pending):
    result = await db.execute(
        select(KYCDocument).where(KYCDocument.status == status_filter).order_by(KYCDocument.created_at)
    )
    return result.scalars().all()


@router.patch("/kyc/{doc_id}/approve")
async def approve_kyc(doc_id: str, db: DbSession, _admin: RequireAdmin, current_user=None):
    from app.deps import CurrentUser
    doc = await db.scalar(select(KYCDocument).where(KYCDocument.id == doc_id))
    if not doc:
        raise HTTPException(status_code=404, detail="KYC document not found")
    doc.status = KYCStatus.approved
    # Check if all docs for pro are approved → mark pro as kyc_verified
    pro_docs = await db.execute(select(KYCDocument).where(KYCDocument.pro_id == doc.pro_id))
    all_docs = pro_docs.scalars().all()
    if all(d.status == KYCStatus.approved for d in all_docs):
        pro = await db.scalar(select(Professional).where(Professional.id == doc.pro_id))
        if pro:
            pro.is_kyc_verified = True
    return {"message": "KYC document approved"}


@router.patch("/kyc/{doc_id}/reject")
async def reject_kyc(doc_id: str, db: DbSession, _admin: RequireAdmin):
    doc = await db.scalar(select(KYCDocument).where(KYCDocument.id == doc_id))
    if not doc:
        raise HTTPException(status_code=404, detail="KYC document not found")
    doc.status = KYCStatus.rejected
    return {"message": "KYC document rejected"}


@router.get("/users", response_model=list[AdminAccountResponse], summary="List all users (paginated)")
async def list_users(db: DbSession, _admin: RequireAdmin, skip: int = 0, limit: int = 200, role: UserRole | None = None):
    q = (
        select(User)
        .options(selectinload(User.professional_profile))
        .where(User.is_active.is_(True))
    )
    if role:
        q = q.where(User.role == role)
    result = await db.execute(q.order_by(User.created_at.desc()).offset(skip).limit(limit))
    users = result.scalars().all()
    return [_to_admin_account(user) for user in users]


@router.delete("/users/{user_id}")
async def delete_user_account(user_id: str, db: DbSession, _admin: RequireAdmin):
    user = await db.scalar(
        select(User)
        .options(
            selectinload(User.professional_profile).selectinload(Professional.public_profile)
        )
        .where(User.id == user_id)
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == UserRole.admin:
        active_admins = await db.scalar(
            select(func.count(User.id)).where(
                User.role == UserRole.admin,
                User.id != user.id,
                User.is_active.is_(True),
                User.is_blocked.is_(False),
            )
        )
        if not active_admins:
            raise HTTPException(status_code=400, detail="Cannot delete the last active admin account")

    soft_delete_user_account(user)
    return {"message": "Account deleted successfully"}
