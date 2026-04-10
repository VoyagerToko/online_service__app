"""Reset user/professional accounts and seed a minimal dataset for local testing.

Resulting accounts:
- Professionals: pro1@gmail.com, pro2@gmail.com
- Users: user1@gmail.com, user2@gmail.com

All existing user/professional-linked work is removed before seeding.
"""

from __future__ import annotations

import asyncio
import shutil
from pathlib import Path
import sys

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import delete, or_, select

import app.models.models_init  # noqa: F401
from app.config import settings
from app.database import AsyncSessionLocal
from app.models.booking import Booking, BookingStatusTimeline
from app.models.dispute import Dispute, DisputeEvidence
from app.models.kyc import KYCDocument
from app.models.message import Conversation, ConversationMessage
from app.models.notification import AvailabilitySlot, Notification
from app.models.payment import Payment, WalletTransaction
from app.models.professional import Professional
from app.models.professional_public_profile import ProfessionalPublicProfile
from app.models.review import Review
from app.models.user import User, UserRole
from app.services.auth_service import hash_password

DEFAULT_PASSWORD = "Password@123"

PROFESSIONAL_SEEDS = [
    {
        "name": "Pro One",
        "email": "pro1@gmail.com",
        "phone": "+91 9000000001",
        "specialty": "General Professional",
    },
    {
        "name": "Pro Two",
        "email": "pro2@gmail.com",
        "phone": "+91 9000000002",
        "specialty": "General Professional",
    },
]

USER_SEEDS = [
    {
        "name": "User One",
        "email": "user1@gmail.com",
        "phone": "+91 9000000011",
    },
    {
        "name": "User Two",
        "email": "user2@gmail.com",
        "phone": "+91 9000000012",
    },
]


def _remove_professional_uploads(professional_ids: list[str]) -> None:
    uploads_root = Path(settings.UPLOAD_DIR) / "professionals"
    for professional_id in professional_ids:
        shutil.rmtree(uploads_root / professional_id, ignore_errors=True)


async def reset_and_seed_accounts() -> None:
    async with AsyncSessionLocal() as db:
        try:
            target_user_ids = list(
                (
                    await db.execute(
                        select(User.id).where(
                            User.role.in_([UserRole.user, UserRole.professional])
                        )
                    )
                ).scalars().all()
            )

            target_professional_ids = list(
                (
                    await db.execute(
                        select(Professional.id).where(
                            Professional.user_id.in_(target_user_ids)
                        )
                    )
                ).scalars().all()
            )

            target_booking_ids = list(
                (
                    await db.execute(
                        select(Booking.id).where(
                            or_(
                                Booking.user_id.in_(target_user_ids),
                                Booking.pro_id.in_(target_professional_ids),
                            )
                        )
                    )
                ).scalars().all()
            )

            target_conversation_ids = list(
                (
                    await db.execute(
                        select(Conversation.id).where(
                            or_(
                                Conversation.user_id.in_(target_user_ids),
                                Conversation.professional_id.in_(target_professional_ids),
                                Conversation.created_by_user_id.in_(target_user_ids),
                                Conversation.last_message_sender_id.in_(target_user_ids),
                            )
                        )
                    )
                ).scalars().all()
            )

            target_dispute_ids = list(
                (
                    await db.execute(
                        select(Dispute.id).where(
                            or_(
                                Dispute.booking_id.in_(target_booking_ids),
                                Dispute.raised_by.in_(target_user_ids),
                                Dispute.against_id.in_(target_user_ids),
                                Dispute.resolved_by.in_(target_user_ids),
                            )
                        )
                    )
                ).scalars().all()
            )

            if target_user_ids or target_professional_ids:
                if target_dispute_ids:
                    await db.execute(
                        delete(DisputeEvidence).where(
                            or_(
                                DisputeEvidence.dispute_id.in_(target_dispute_ids),
                                DisputeEvidence.uploaded_by.in_(target_user_ids),
                            )
                        )
                    )

                await db.execute(
                    delete(Review).where(
                        or_(
                            Review.booking_id.in_(target_booking_ids),
                            Review.reviewer_id.in_(target_user_ids),
                            Review.reviewee_id.in_(target_user_ids),
                        )
                    )
                )

                await db.execute(
                    delete(Payment).where(
                        or_(
                            Payment.booking_id.in_(target_booking_ids),
                            Payment.user_id.in_(target_user_ids),
                        )
                    )
                )

                await db.execute(
                    delete(WalletTransaction).where(
                        or_(
                            WalletTransaction.booking_id.in_(target_booking_ids),
                            WalletTransaction.user_id.in_(target_user_ids),
                        )
                    )
                )

                await db.execute(
                    delete(BookingStatusTimeline).where(
                        or_(
                            BookingStatusTimeline.booking_id.in_(target_booking_ids),
                            BookingStatusTimeline.changed_by.in_(target_user_ids),
                        )
                    )
                )

                await db.execute(
                    delete(ConversationMessage).where(
                        or_(
                            ConversationMessage.conversation_id.in_(target_conversation_ids),
                            ConversationMessage.sender_id.in_(target_user_ids),
                        )
                    )
                )

                await db.execute(
                    delete(Conversation).where(Conversation.id.in_(target_conversation_ids))
                )

                await db.execute(
                    delete(Notification).where(Notification.user_id.in_(target_user_ids))
                )

                await db.execute(
                    delete(Dispute).where(
                        or_(
                            Dispute.id.in_(target_dispute_ids),
                            Dispute.booking_id.in_(target_booking_ids),
                            Dispute.raised_by.in_(target_user_ids),
                            Dispute.against_id.in_(target_user_ids),
                            Dispute.resolved_by.in_(target_user_ids),
                        )
                    )
                )

                await db.execute(
                    delete(Booking).where(Booking.id.in_(target_booking_ids))
                )

                await db.execute(
                    delete(KYCDocument).where(KYCDocument.pro_id.in_(target_professional_ids))
                )
                await db.execute(
                    delete(AvailabilitySlot).where(AvailabilitySlot.pro_id.in_(target_professional_ids))
                )
                await db.execute(
                    delete(ProfessionalPublicProfile).where(
                        ProfessionalPublicProfile.professional_id.in_(target_professional_ids)
                    )
                )
                await db.execute(
                    delete(Professional).where(Professional.id.in_(target_professional_ids))
                )
                await db.execute(
                    delete(User).where(User.id.in_(target_user_ids))
                )

                _remove_professional_uploads(target_professional_ids)

            for seed in USER_SEEDS:
                db.add(
                    User(
                        name=seed["name"],
                        email=seed["email"],
                        phone=seed["phone"],
                        role=UserRole.user,
                        hashed_password=hash_password(DEFAULT_PASSWORD),
                        is_email_verified=True,
                        is_active=True,
                        is_blocked=False,
                    )
                )

            for seed in PROFESSIONAL_SEEDS:
                pro_user = User(
                    name=seed["name"],
                    email=seed["email"],
                    phone=seed["phone"],
                    role=UserRole.professional,
                    hashed_password=hash_password(DEFAULT_PASSWORD),
                    is_email_verified=True,
                    is_active=True,
                    is_blocked=False,
                )
                db.add(pro_user)
                await db.flush()

                professional = Professional(
                    user_id=pro_user.id,
                    specialty=seed["specialty"],
                    is_available=True,
                    is_suspended=False,
                )
                db.add(professional)
                await db.flush()

                db.add(
                    ProfessionalPublicProfile(
                        professional_id=professional.id,
                        public_phone=seed["phone"],
                        public_email=seed["email"],
                        starting_price=0.0,
                    )
                )

            await db.commit()
            print("Reset complete.")
            print("Created professionals: pro1@gmail.com, pro2@gmail.com")
            print("Created users: user1@gmail.com, user2@gmail.com")
            print(f"Default password for all seeded accounts: {DEFAULT_PASSWORD}")
        except Exception:
            await db.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(reset_and_seed_accounts())
