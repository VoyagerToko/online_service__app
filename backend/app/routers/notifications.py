"""
Notifications router — list, mark read, mark all read.
"""
from fastapi import APIRouter
from sqlalchemy import select, update

from app.deps import DbSession, CurrentUser
from app.models.notification import Notification
from app.schemas.common import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/", response_model=list[NotificationResponse])
async def list_notifications(db: DbSession, current_user: CurrentUser, unread_only: bool = False, skip: int = 0, limit: int = 50):
    q = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        q = q.where(Notification.is_read == False)
    result = await db.execute(q.order_by(Notification.created_at.desc()).offset(skip).limit(limit))
    return result.scalars().all()


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: str, db: DbSession, current_user: CurrentUser):
    await db.execute(
        update(Notification)
        .where(Notification.id == notification_id, Notification.user_id == current_user.id)
        .values(is_read=True)
    )
    return {"message": "Marked as read"}


@router.patch("/read-all")
async def mark_all_read(db: DbSession, current_user: CurrentUser):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id)
        .values(is_read=True)
    )
    return {"message": "All notifications marked as read"}
