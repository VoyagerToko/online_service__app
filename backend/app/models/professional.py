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
    reviews_received = relationship(
        "Review",
        primaryjoin="Review.reviewee_id == foreign(Professional.user_id)",
        viewonly=True,
        lazy="select",
    )

    def __repr__(self):
        return f"<Professional {self.specialty} rating={self.avg_rating}>"
