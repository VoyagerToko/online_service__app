import enum
from sqlalchemy import String, ForeignKey, Text, Enum as SAEnum, Numeric, DateTime, func
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database import Base
from app.models.base import TimestampMixin, generate_uuid


class DisputeStatus(str, enum.Enum):
    open = "open"
    under_review = "under_review"
    resolved = "resolved"
    rejected = "rejected"


class Dispute(Base, TimestampMixin):
    __tablename__ = "disputes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    booking_id: Mapped[str] = mapped_column(String(36), ForeignKey("bookings.id"), unique=True, nullable=False)
    raised_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    against_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)

    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[DisputeStatus] = mapped_column(
        SAEnum(DisputeStatus), default=DisputeStatus.open, nullable=False, index=True
    )

    resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    refund_amount: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    resolved_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)

    booking = relationship("Booking", back_populates="dispute")
    claimant = relationship("User", foreign_keys=[raised_by])
    defendant = relationship("User", foreign_keys=[against_id])
    admin = relationship("User", foreign_keys=[resolved_by])
    evidence = relationship("DisputeEvidence", back_populates="dispute", lazy="select")

    def __repr__(self):
        return f"<Dispute {self.id[:8]} status={self.status}>"


class DisputeEvidence(Base):
    __tablename__ = "dispute_evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    dispute_id: Mapped[str] = mapped_column(String(36), ForeignKey("disputes.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(100), nullable=False)  # image/jpeg, application/pdf, etc.
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    dispute = relationship("Dispute", back_populates="evidence")
    uploader = relationship("User", foreign_keys=[uploaded_by])
