from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    professional_id: str | None = None
    user_id: str | None = None
    booking_id: str | None = None
    initial_message: str | None = Field(default=None, max_length=2000)


class ConversationResponse(BaseModel):
    id: str
    user_id: str
    professional_id: str
    booking_id: str | None = None

    counterpart_user_id: str
    counterpart_name: str
    counterpart_avatar_url: str | None = None

    last_message_preview: str | None = None
    last_message_at: datetime | None = None
    unread_count: int = 0

    created_at: datetime
    updated_at: datetime


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender_name: str | None = None
    sender_role: Literal["user", "professional"]
    body: str
    read_at: datetime | None = None
    created_at: datetime
    is_mine: bool = False


class MarkReadResponse(BaseModel):
    updated: int
