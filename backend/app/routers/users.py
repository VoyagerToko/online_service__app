"""
Users and Professionals routers.
"""
from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.deps import DbSession, CurrentUser, RequireAdmin
from app.models.user import User, UserRole
from app.models.professional import Professional
from app.schemas.auth import UserResponse
from app.schemas.common import ProfessionalProfileUpdate, ProfessionalResponse

users_router = APIRouter(prefix="/users", tags=["users"])
professionals_router = APIRouter(prefix="/professionals", tags=["professionals"])


# ─── Users ──────────────────────────────────────────────────────────────────────

@users_router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: CurrentUser):
    return current_user


@users_router.patch("/me", response_model=UserResponse)
async def update_profile(
    name: str | None = None,
    phone: str | None = None,
    avatar_url: str | None = None,
    db: DbSession = None,
    current_user: CurrentUser = None,
):
    if name: current_user.name = name
    if phone: current_user.phone = phone
    if avatar_url: current_user.avatar_url = avatar_url
    return current_user


@users_router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: DbSession, _admin: RequireAdmin):
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ─── Professionals ──────────────────────────────────────────────────────────────

@professionals_router.get("/", response_model=list[ProfessionalResponse])
async def list_professionals(db: DbSession, specialty: str | None = None, skip: int = 0, limit: int = 50):
    q = select(Professional).where(Professional.is_suspended == False)
    if specialty:
        q = q.where(Professional.specialty.ilike(f"%{specialty}%"))
    result = await db.execute(q.order_by(Professional.avg_rating.desc()).offset(skip).limit(limit))
    return result.scalars().all()


@professionals_router.get("/{pro_id}", response_model=ProfessionalResponse)
async def get_professional(pro_id: str, db: DbSession):
    pro = await db.scalar(select(Professional).where(Professional.id == pro_id))
    if not pro:
        raise HTTPException(status_code=404, detail="Professional not found")
    return pro


@professionals_router.patch("/me", response_model=ProfessionalResponse)
async def update_pro_profile(body: ProfessionalProfileUpdate, db: DbSession, current_user: CurrentUser):
    if current_user.role != UserRole.professional:
        raise HTTPException(status_code=403, detail="Only professionals can update this profile")
    pro = await db.scalar(select(Professional).where(Professional.user_id == current_user.id))
    if not pro:
        raise HTTPException(status_code=404, detail="Professional profile not found")
    update_data = body.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(pro, field, value)
    return pro
