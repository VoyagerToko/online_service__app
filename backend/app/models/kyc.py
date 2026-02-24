import enum
from sqlalchemy import String, ForeignKey, Enum as SAEnum, DateTime, func
from sqlalchemy.orm import mapped_column, Mapped, relationship
from app.database import Base
from app.models.base import generate_uuid


class DocType(str, enum.Enum):
    aadhar = "aadhar"
    pan = "pan"
    police_verification = "police_verification"
    skill_certificate = "skill_certificate"
    bank_detail = "bank_detail"


class KYCStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class KYCDocument(Base):
    __tablename__ = "kyc_documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    pro_id: Mapped[str] = mapped_column(String(36), ForeignKey("professionals.id", ondelete="CASCADE"), nullable=False, index=True)

    doc_type: Mapped[DocType] = mapped_column(SAEnum(DocType), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[KYCStatus] = mapped_column(SAEnum(KYCStatus), default=KYCStatus.pending, nullable=False)

    reviewed_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    professional = relationship("Professional", back_populates="kyc_documents")
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    def __repr__(self):
        return f"<KYCDocument {self.doc_type} {self.status}>"
