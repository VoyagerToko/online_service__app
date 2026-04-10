from sqlalchemy import String, Float, ForeignKey, Text
from sqlalchemy.orm import mapped_column, Mapped, relationship

from app.database import Base
from app.models.base import TimestampMixin, generate_uuid


class ProfessionalPublicProfile(Base, TimestampMixin):
    __tablename__ = "professional_public_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    professional_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("professionals.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )

    starting_price: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    public_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    public_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    whatsapp_number: Mapped[str | None] = mapped_column(String(30), nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    contact_address: Mapped[str | None] = mapped_column(Text, nullable=True)

    # JSON-encoded list of image URLs served from /uploads.
    photo_urls_json: Mapped[str] = mapped_column(Text, default="[]", nullable=False)

    professional = relationship("Professional", back_populates="public_profile")

    def __repr__(self):
        return f"<ProfessionalPublicProfile pro_id={self.professional_id}>"
