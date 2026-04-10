"""Account lifecycle helpers (soft-delete/deactivation)."""

from datetime import datetime, timezone
import os
import shutil

from app.config import settings
from app.models.user import User


def soft_delete_user_account(user: User) -> None:
    """Deactivate a user account and scrub personal/profile data."""
    marker = int(datetime.now(timezone.utc).timestamp())

    user.name = f"Deleted User {user.id[:6]}"
    user.email = f"deleted_{user.id}_{marker}@deleted.local"
    user.phone = None
    user.avatar_url = None
    user.hashed_password = None
    user.google_id = None
    user.is_active = False
    user.is_blocked = True

    pro = user.professional_profile
    if not pro:
        return

    pro.is_available = False
    pro.is_suspended = True
    pro.bio = None

    if pro.public_profile:
        pro.public_profile.starting_price = 0
        pro.public_profile.public_phone = None
        pro.public_profile.public_email = None
        pro.public_profile.whatsapp_number = None
        pro.public_profile.website_url = None
        pro.public_profile.contact_address = None
        pro.public_profile.photo_urls_json = "[]"

    upload_dir = os.path.join(settings.UPLOAD_DIR, "professionals", pro.id)
    shutil.rmtree(upload_dir, ignore_errors=True)
