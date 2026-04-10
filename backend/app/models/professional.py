import json

from sqlalchemy import String, Boolean, Float, Integer, ForeignKey, Text
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Professional(Base, TimestampMixin):
    __tablename__ = "professionals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    specialty: Mapped[str] = mapped_column(String(255), nullable=False)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    experience_years: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Location (last known)
    base_location: Mapped[str | None] = mapped_column(String(500), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Status
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_kyc_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_suspended: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Stats
    avg_rating: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_ratings: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_jobs: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    commission_rate: Mapped[float] = mapped_column(Float, default=0.20, nullable=False)

    # Relationships
    user = relationship("User", back_populates="professional_profile")
    bookings = relationship("Booking", foreign_keys="Booking.pro_id", back_populates="professional", lazy="select")
    availability_slots = relationship("AvailabilitySlot", back_populates="professional", lazy="select")
    kyc_documents = relationship("KYCDocument", back_populates="professional", lazy="select")
    public_profile = relationship(
        "ProfessionalPublicProfile",
        back_populates="professional",
        uselist=False,
        lazy="select",
        cascade="all, delete-orphan",
    )
    reviews_received = relationship(
        "Review",
        primaryjoin="Review.reviewee_id == foreign(Professional.user_id)",
        viewonly=True,
        lazy="select",
    )

    @property
    def name(self) -> str | None:
        return self.user.name if self.user else None

    @property
    def avatar_url(self) -> str | None:
        return self.user.avatar_url if self.user else None

    @property
    def starting_price(self) -> float:
        if self.public_profile:
            return float(self.public_profile.starting_price)
        return 0.0

    @property
    def public_phone(self) -> str | None:
        if self.public_profile and self.public_profile.public_phone:
            return self.public_profile.public_phone
        return self.user.phone if self.user else None

    @property
    def public_email(self) -> str | None:
        if self.public_profile and self.public_profile.public_email:
            return self.public_profile.public_email
        return self.user.email if self.user else None

    @property
    def whatsapp_number(self) -> str | None:
        return self.public_profile.whatsapp_number if self.public_profile else None

    @property
    def website_url(self) -> str | None:
        return self.public_profile.website_url if self.public_profile else None

    @property
    def contact_address(self) -> str | None:
        return self.public_profile.contact_address if self.public_profile else None

    @property
    def photo_urls(self) -> list[str]:
        if not self.public_profile or not self.public_profile.photo_urls_json:
            return []
        try:
            photo_urls = json.loads(self.public_profile.photo_urls_json)
            if isinstance(photo_urls, list):
                return [str(url) for url in photo_urls]
        except (TypeError, ValueError):
            return []
        return []

    def __repr__(self):
        return f"<Professional {self.specialty} rating={self.avg_rating}>"
