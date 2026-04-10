"""
Users and Professionals routers.
"""
import json
import os
from datetime import datetime, timezone

import aiofiles
from fastapi import APIRouter, HTTPException, UploadFile, File
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.config import settings
from app.deps import DbSession, CurrentUser, RequireAdmin
from app.models.user import User, UserRole
from app.models.professional import Professional
from app.models.professional_public_profile import ProfessionalPublicProfile
from app.schemas.auth import UserResponse
from app.schemas.common import ProfessionalPhotoRemoveRequest, ProfessionalProfileUpdate, ProfessionalResponse
from app.services.account_service import soft_delete_user_account

users_router = APIRouter(prefix="/users", tags=["users"])
professionals_router = APIRouter(prefix="/professionals", tags=["professionals"])

ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_PROFILE_PHOTOS = 10


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


@users_router.delete("/me")
async def delete_my_account(db: DbSession, current_user: CurrentUser):
    user = await db.scalar(
        select(User)
        .options(
            selectinload(User.professional_profile).selectinload(Professional.public_profile)
        )
        .where(User.id == current_user.id)
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
            raise HTTPException(
                status_code=400,
                detail="Cannot delete the last active admin account",
            )

    soft_delete_user_account(user)
    return {"message": "Account deleted successfully"}


@users_router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: DbSession, _admin: RequireAdmin):
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ─── Professionals ──────────────────────────────────────────────────────────────

@professionals_router.get("/", response_model=list[ProfessionalResponse])
async def list_professionals(db: DbSession, specialty: str | None = None, skip: int = 0, limit: int = 50):
    q = (
        select(Professional)
        .join(User, Professional.user_id == User.id)
        .options(selectinload(Professional.user), selectinload(Professional.public_profile))
        .where(
            Professional.is_suspended.is_(False),
            User.is_active.is_(True),
            User.is_blocked.is_(False),
        )
    )
    if specialty:
        q = q.where(Professional.specialty.ilike(f"%{specialty}%"))
    result = await db.execute(q.order_by(Professional.avg_rating.desc()).offset(skip).limit(limit))
    return result.scalars().all()


@professionals_router.get("/{pro_id}", response_model=ProfessionalResponse)
async def get_professional(pro_id: str, db: DbSession):
    pro = await db.scalar(
        select(Professional)
        .join(User, Professional.user_id == User.id)
        .options(selectinload(Professional.user), selectinload(Professional.public_profile))
        .where(
            Professional.id == pro_id,
            Professional.is_suspended.is_(False),
            User.is_active.is_(True),
            User.is_blocked.is_(False),
        )
    )
    if not pro:
        raise HTTPException(status_code=404, detail="Professional not found")
    return pro


@professionals_router.patch("/me", response_model=ProfessionalResponse)
async def update_pro_profile(body: ProfessionalProfileUpdate, db: DbSession, current_user: CurrentUser):
    if current_user.role != UserRole.professional:
        raise HTTPException(status_code=403, detail="Only professionals can update this profile")
    pro = await db.scalar(
        select(Professional)
        .options(selectinload(Professional.user), selectinload(Professional.public_profile))
        .where(Professional.user_id == current_user.id)
    )
    if not pro:
        raise HTTPException(status_code=404, detail="Professional profile not found")

    update_data = body.model_dump(exclude_none=True)

    professional_fields = {"specialty", "bio", "experience_years", "base_location", "is_available"}
    public_fields = {
        "starting_price",
        "public_phone",
        "public_email",
        "whatsapp_number",
        "website_url",
        "contact_address",
        "photo_urls",
    }

    for field in professional_fields:
        if field in update_data:
            setattr(pro, field, update_data[field])

    has_public_updates = any(field in update_data for field in public_fields)
    if has_public_updates and not pro.public_profile:
        pro.public_profile = ProfessionalPublicProfile(
            professional_id=pro.id,
            public_phone=current_user.phone,
            public_email=current_user.email,
        )

    if pro.public_profile:
        for field in public_fields - {"photo_urls"}:
            if field in update_data:
                setattr(pro.public_profile, field, update_data[field])

        if "photo_urls" in update_data:
            pro.public_profile.photo_urls_json = json.dumps(update_data["photo_urls"])

    return pro


@professionals_router.post("/me/photos", response_model=ProfessionalResponse)
async def upload_profile_photo(db: DbSession, current_user: CurrentUser, file: UploadFile = File(...)):
    if current_user.role != UserRole.professional:
        raise HTTPException(status_code=403, detail="Only professionals can upload profile photos")

    pro = await db.scalar(
        select(Professional)
        .options(selectinload(Professional.user), selectinload(Professional.public_profile))
        .where(Professional.user_id == current_user.id)
    )
    if not pro:
        raise HTTPException(status_code=404, detail="Professional profile not found")

    if file.content_type not in ALLOWED_PHOTO_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed: {ALLOWED_PHOTO_TYPES}")

    content = await file.read()
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail=f"File too large. Max {settings.MAX_FILE_SIZE_MB}MB")

    current_photos = pro.photo_urls
    if len(current_photos) >= MAX_PROFILE_PHOTOS:
        raise HTTPException(status_code=400, detail=f"You can upload up to {MAX_PROFILE_PHOTOS} photos")

    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    safe_name = f"{pro.id}_{int(datetime.now(timezone.utc).timestamp())}{ext}"
    upload_dir = os.path.join(settings.UPLOAD_DIR, "professionals", pro.id)
    os.makedirs(upload_dir, exist_ok=True)
    full_path = os.path.join(upload_dir, safe_name)

    async with aiofiles.open(full_path, "wb") as out_file:
        await out_file.write(content)

    if not pro.public_profile:
        pro.public_profile = ProfessionalPublicProfile(
            professional_id=pro.id,
            public_phone=current_user.phone,
            public_email=current_user.email,
        )

    photo_url = f"/uploads/professionals/{pro.id}/{safe_name}"
    pro.public_profile.photo_urls_json = json.dumps([*current_photos, photo_url])
    return pro


@professionals_router.delete("/me/photos", response_model=ProfessionalResponse)
async def remove_profile_photo(body: ProfessionalPhotoRemoveRequest, db: DbSession, current_user: CurrentUser):
    if current_user.role != UserRole.professional:
        raise HTTPException(status_code=403, detail="Only professionals can remove profile photos")

    pro = await db.scalar(
        select(Professional)
        .options(selectinload(Professional.user), selectinload(Professional.public_profile))
        .where(Professional.user_id == current_user.id)
    )
    if not pro:
        raise HTTPException(status_code=404, detail="Professional profile not found")

    current_photos = pro.photo_urls
    if body.photo_url not in current_photos:
        raise HTTPException(status_code=404, detail="Photo not found")

    if not pro.public_profile:
        pro.public_profile = ProfessionalPublicProfile(
            professional_id=pro.id,
            public_phone=current_user.phone,
            public_email=current_user.email,
        )

    updated_photos = [url for url in current_photos if url != body.photo_url]
    pro.public_profile.photo_urls_json = json.dumps(updated_photos)

    expected_prefix = f"/uploads/professionals/{pro.id}/"
    if body.photo_url.startswith(expected_prefix):
        filename = body.photo_url[len(expected_prefix):]
        if filename and "/" not in filename and "\\" not in filename:
            upload_dir = os.path.normpath(os.path.join(settings.UPLOAD_DIR, "professionals", pro.id))
            file_path = os.path.normpath(os.path.join(upload_dir, filename))
            try:
                if os.path.commonpath([upload_dir, file_path]) == upload_dir and os.path.isfile(file_path):
                    os.remove(file_path)
            except OSError:
                # Keep profile updates even if file cleanup fails.
                pass

    return pro
