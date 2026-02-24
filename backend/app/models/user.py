import enum
from sqlalchemy import String, Boolean, Enum as SAEnum, Numeric
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database import Base
from app.models.base import TimestampMixin, generate_uuid


class UserRole(str, enum.Enum):
    user = "user"
    professional = "professional"
    admin = "admin"


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)  # nullable for OAuth users
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False, default=UserRole.user)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    wallet_balance: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0, nullable=False)

    # Status flags
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # OAuth
    google_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Relationships
    professional_profile = relationship("Professional", back_populates="user", uselist=False, lazy="select")
    bookings = relationship("Booking", foreign_keys="Booking.user_id", back_populates="user", lazy="select")
    reviews = relationship("Review", foreign_keys="Review.reviewer_id", back_populates="reviewer", lazy="select")
    wallet_transactions = relationship("WalletTransaction", back_populates="user", lazy="select")
    notifications = relationship("Notification", back_populates="user", lazy="select")

    def __repr__(self):
        return f"<User {self.email} ({self.role})>"
