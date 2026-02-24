import enum
from datetime import date, time
from sqlalchemy import String, Boolean, ForeignKey, Text, Date, Time, JSON, Enum as SAEnum, Numeric, Integer, DateTime, func
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database import Base
from app.models.base import TimestampMixin, generate_uuid


class BookingStatus(str, enum.Enum):
    requested = "requested"
    accepted = "accepted"
    in_progress = "in_progress"
    completed = "completed"
    rated = "rated"
    cancelled = "cancelled"
    refunded = "refunded"


class Booking(Base, TimestampMixin):
    __tablename__ = "bookings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    service_id: Mapped[str] = mapped_column(String(36), ForeignKey("services.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    pro_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("professionals.id"), nullable=True)

    status: Mapped[BookingStatus] = mapped_column(
        SAEnum(BookingStatus), default=BookingStatus.requested, nullable=False, index=True
    )

    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False)
    time_slot: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    latitude: Mapped[float | None] = mapped_column(nullable=True)
    longitude: Mapped[float | None] = mapped_column(nullable=True)

    # Pricing snapshot (at booking time)
    base_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    addons: Mapped[dict | None] = mapped_column(JSON, nullable=True)          # [{name, price}]
    platform_fee: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    tax: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    total_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Reschedule tracking
    reschedule_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    service = relationship("Service", back_populates="bookings")
    user = relationship("User", foreign_keys=[user_id], back_populates="bookings")
    professional = relationship("Professional", foreign_keys=[pro_id], back_populates="bookings")
    status_timeline = relationship("BookingStatusTimeline", back_populates="booking", order_by="BookingStatusTimeline.created_at")
    payment = relationship("Payment", back_populates="booking", uselist=False)
    review = relationship("Review", back_populates="booking", uselist=False)
    dispute = relationship("Dispute", back_populates="booking", uselist=False)

    def __repr__(self):
        return f"<Booking {self.id[:8]} status={self.status}>"


class BookingStatusTimeline(Base):
    """Immutable audit trail of every status transition."""
    __tablename__ = "booking_status_timeline"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    booking_id: Mapped[str] = mapped_column(String(36), ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    status: Mapped[BookingStatus] = mapped_column(SAEnum(BookingStatus), nullable=False)
    changed_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    booking = relationship("Booking", back_populates="status_timeline")
    actor = relationship("User", foreign_keys=[changed_by])
