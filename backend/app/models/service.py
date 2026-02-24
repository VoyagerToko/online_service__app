from sqlalchemy import String, Boolean, ForeignKey, Text
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    icon: Mapped[str] = mapped_column(String(100), nullable=False)  # Lucide icon name
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    services = relationship("Service", back_populates="category", lazy="select")

    def __repr__(self):
        return f"<Category {self.name}>"


class Service(Base, TimestampMixin):
    __tablename__ = "services"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    category_id: Mapped[str] = mapped_column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    base_price: Mapped[float] = mapped_column(nullable=False)
    icon: Mapped[str] = mapped_column(String(100), nullable=False)  # Lucide icon name
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Config flags
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    requires_inspection: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Stats (denormalised for perf)
    avg_rating: Mapped[float] = mapped_column(nullable=False, default=0.0)
    reviews_count: Mapped[int] = mapped_column(nullable=False, default=0)

    category = relationship("Category", back_populates="services")
    bookings = relationship("Booking", back_populates="service", lazy="select")

    def __repr__(self):
        return f"<Service {self.name} ₹{self.base_price}>"
