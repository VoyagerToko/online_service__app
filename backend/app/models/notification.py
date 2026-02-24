from sqlalchemy import String, ForeignKey, Text, Boolean, JSON, DateTime, func, Date, Time
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database import Base
from app.models.base import generate_uuid


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    type: Mapped[str] = mapped_column(String(100), nullable=False)   # booking_update | payment | dispute | system
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="notifications")


class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    pro_id: Mapped[str] = mapped_column(String(36), ForeignKey("professionals.id", ondelete="CASCADE"), nullable=False, index=True)
    date: Mapped[object] = mapped_column(Date, nullable=False)
    start_time: Mapped[object] = mapped_column(Time, nullable=False)
    end_time: Mapped[object] = mapped_column(Time, nullable=False)
    is_booked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    professional = relationship("Professional", back_populates="availability_slots")
