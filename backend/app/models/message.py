from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.base import TimestampMixin, generate_uuid


class Conversation(Base, TimestampMixin):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    professional_id: Mapped[str] = mapped_column(String(36), ForeignKey("professionals.id", ondelete="CASCADE"), nullable=False, index=True)
    booking_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True, index=True)

    created_by_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=False)

    last_message_preview: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_message_sender_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    user = relationship("User", foreign_keys=[user_id])
    professional = relationship("Professional", foreign_keys=[professional_id])
    booking = relationship("Booking", foreign_keys=[booking_id])

    created_by_user = relationship("User", foreign_keys=[created_by_user_id])
    last_message_sender = relationship("User", foreign_keys=[last_message_sender_id])

    messages = relationship(
        "ConversationMessage",
        back_populates="conversation",
        lazy="select",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Conversation {self.id[:8]} user={self.user_id[:8]} pro={self.professional_id[:8]}>"


class ConversationMessage(Base, TimestampMixin):
    __tablename__ = "conversation_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    conversation_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])

    def __repr__(self):
        return f"<ConversationMessage {self.id[:8]} conversation={self.conversation_id[:8]}>"
