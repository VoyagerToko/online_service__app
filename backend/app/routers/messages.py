"""
Messaging router — 1:1 conversations between users and professionals.
Supports pre-booking, in-booking, and post-booking communication.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import selectinload

from app.deps import CurrentUser, DbSession
from app.models.booking import Booking
from app.models.message import Conversation, ConversationMessage
from app.models.professional import Professional
from app.models.user import User, UserRole
from app.schemas.messaging import (
    ConversationCreate,
    ConversationResponse,
    MarkReadResponse,
    MessageCreate,
    MessageResponse,
)

router = APIRouter(prefix="/messages", tags=["messages"])


def _assert_can_message(current_user: User) -> None:
    if current_user.role not in (UserRole.user, UserRole.professional):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Messaging is available only for user and professional accounts",
        )


async def _get_professional_profile_for_user(db: DbSession, user_id: str, required: bool = True) -> Professional | None:
    pro = await db.scalar(
        select(Professional)
        .options(selectinload(Professional.user))
        .where(
            Professional.user_id == user_id,
            Professional.is_suspended.is_(False),
        )
    )
    if required and not pro:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Professional profile required",
        )
    return pro


def _build_conversation_response(
    conversation: Conversation,
    current_user: User,
    unread_count: int,
) -> ConversationResponse:
    if current_user.role == UserRole.user:
        pro_user = conversation.professional.user if conversation.professional else None
        counterpart_user_id = (
            pro_user.id
            if pro_user
            else (conversation.professional.user_id if conversation.professional else conversation.user_id)
        )
        counterpart_name = (
            pro_user.name
            if pro_user
            else (conversation.professional.specialty if conversation.professional else "Professional")
        )
        counterpart_avatar_url = pro_user.avatar_url if pro_user else None
    else:
        counterpart_user_id = conversation.user.id if conversation.user else conversation.user_id
        counterpart_name = conversation.user.name if conversation.user else "User"
        counterpart_avatar_url = conversation.user.avatar_url if conversation.user else None

    return ConversationResponse(
        id=conversation.id,
        user_id=conversation.user_id,
        professional_id=conversation.professional_id,
        booking_id=conversation.booking_id,
        counterpart_user_id=counterpart_user_id,
        counterpart_name=counterpart_name,
        counterpart_avatar_url=counterpart_avatar_url,
        last_message_preview=conversation.last_message_preview,
        last_message_at=conversation.last_message_at,
        unread_count=unread_count,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


def _build_message_response(
    message: ConversationMessage,
    conversation: Conversation,
    viewer_user_id: str,
) -> MessageResponse:
    sender_role = "user" if message.sender_id == conversation.user_id else "professional"
    sender_name = message.sender.name if message.sender else None

    return MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        sender_name=sender_name,
        sender_role=sender_role,
        body=message.body,
        read_at=message.read_at,
        created_at=message.created_at,
        is_mine=message.sender_id == viewer_user_id,
    )


async def _get_conversation_for_actor(conversation_id: str, db: DbSession, current_user: User) -> Conversation:
    _assert_can_message(current_user)

    query = (
        select(Conversation)
        .options(
            selectinload(Conversation.user),
            selectinload(Conversation.professional).selectinload(Professional.user),
        )
        .where(Conversation.id == conversation_id)
    )

    if current_user.role == UserRole.user:
        query = query.where(Conversation.user_id == current_user.id)
    else:
        pro_profile = await _get_professional_profile_for_user(db, current_user.id, required=True)
        query = query.where(Conversation.professional_id == pro_profile.id)

    conversation = await db.scalar(query)
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    return conversation


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    db: DbSession,
    current_user: CurrentUser,
    booking_id: str | None = None,
    skip: int = 0,
    limit: int = 50,
):
    _assert_can_message(current_user)
    limit = min(max(limit, 1), 100)

    query = (
        select(Conversation)
        .options(
            selectinload(Conversation.user),
            selectinload(Conversation.professional).selectinload(Professional.user),
        )
    )

    if current_user.role == UserRole.user:
        query = query.where(Conversation.user_id == current_user.id)
    else:
        pro_profile = await _get_professional_profile_for_user(db, current_user.id, required=True)
        query = query.where(Conversation.professional_id == pro_profile.id)

    if booking_id:
        query = query.where(Conversation.booking_id == booking_id)

    result = await db.execute(
        query
        .order_by(func.coalesce(Conversation.last_message_at, Conversation.updated_at).desc())
        .offset(skip)
        .limit(limit)
    )
    conversations = [
        conversation for conversation in result.scalars().all()
        if conversation.user
        and conversation.user.is_active
        and not conversation.user.is_blocked
        and conversation.professional
        and not conversation.professional.is_suspended
        and conversation.professional.user
        and conversation.professional.user.is_active
        and not conversation.professional.user.is_blocked
    ]
    if not conversations:
        return []

    conversation_ids = [conversation.id for conversation in conversations]
    unread_result = await db.execute(
        select(
            ConversationMessage.conversation_id,
            func.count(ConversationMessage.id),
        )
        .where(
            ConversationMessage.conversation_id.in_(conversation_ids),
            ConversationMessage.sender_id != current_user.id,
            ConversationMessage.read_at.is_(None),
        )
        .group_by(ConversationMessage.conversation_id)
    )
    unread_map = {conversation_id: int(count) for conversation_id, count in unread_result.all()}

    return [
        _build_conversation_response(conversation, current_user, unread_map.get(conversation.id, 0))
        for conversation in conversations
    ]


@router.post("/conversations", response_model=ConversationResponse)
async def create_or_get_conversation(body: ConversationCreate, db: DbSession, current_user: CurrentUser):
    _assert_can_message(current_user)

    professional_profile: Professional | None = None
    user_id: str | None = None
    booking: Booking | None = None

    if current_user.role == UserRole.user:
        if not body.professional_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="professional_id is required for user conversations",
            )

        professional_profile = await db.scalar(
            select(Professional)
            .join(User, Professional.user_id == User.id)
            .options(selectinload(Professional.user))
            .where(
                Professional.id == body.professional_id,
                Professional.is_suspended.is_(False),
                User.is_active.is_(True),
                User.is_blocked.is_(False),
            )
        )
        if not professional_profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professional not found")

        user_id = current_user.id
    else:
        professional_profile = await _get_professional_profile_for_user(db, current_user.id, required=True)

        if body.user_id:
            target_user = await db.scalar(
                select(User).where(
                    User.id == body.user_id,
                    User.role == UserRole.user,
                    User.is_active.is_(True),
                    User.is_blocked.is_(False),
                )
            )
            if not target_user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
            user_id = target_user.id
        elif not body.booking_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user_id is required when booking_id is not provided",
            )

    if body.booking_id:
        booking = await db.scalar(select(Booking).where(Booking.id == body.booking_id))
        if not booking:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

        if current_user.role == UserRole.user:
            if booking.user_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            if booking.pro_id and booking.pro_id != professional_profile.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Booking is not linked to the selected professional",
                )
            user_id = booking.user_id
        else:
            if booking.pro_id != professional_profile.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            if body.user_id and body.user_id != booking.user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="booking_id and user_id do not belong to the same user",
                )
            user_id = booking.user_id

    if not user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to resolve conversation participants")

    conditions = [
        Conversation.user_id == user_id,
        Conversation.professional_id == professional_profile.id,
    ]
    if booking:
        conditions.append(Conversation.booking_id == booking.id)
    else:
        conditions.append(Conversation.booking_id.is_(None))

    existing = await db.scalar(
        select(Conversation)
        .options(
            selectinload(Conversation.user),
            selectinload(Conversation.professional).selectinload(Professional.user),
        )
        .where(*conditions)
    )
    if existing:
        return _build_conversation_response(existing, current_user, unread_count=0)

    conversation = Conversation(
        user_id=user_id,
        professional_id=professional_profile.id,
        booking_id=booking.id if booking else None,
        created_by_user_id=current_user.id,
    )
    db.add(conversation)
    await db.flush()

    initial_message = (body.initial_message or "").strip()
    if initial_message:
        message = ConversationMessage(
            conversation_id=conversation.id,
            sender_id=current_user.id,
            body=initial_message,
        )
        db.add(message)
        conversation.last_message_preview = initial_message[:280]
        conversation.last_message_sender_id = current_user.id
        conversation.last_message_at = datetime.now(timezone.utc)
        await db.flush()

    hydrated = await db.scalar(
        select(Conversation)
        .options(
            selectinload(Conversation.user),
            selectinload(Conversation.professional).selectinload(Professional.user),
        )
        .where(Conversation.id == conversation.id)
    )

    return _build_conversation_response(hydrated, current_user, unread_count=0)


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    conversation_id: str,
    db: DbSession,
    current_user: CurrentUser,
    skip: int = 0,
    limit: int = 100,
):
    conversation = await _get_conversation_for_actor(conversation_id, db, current_user)
    limit = min(max(limit, 1), 200)

    result = await db.execute(
        select(ConversationMessage)
        .options(selectinload(ConversationMessage.sender))
        .where(ConversationMessage.conversation_id == conversation.id)
        .order_by(ConversationMessage.created_at.asc())
        .offset(skip)
        .limit(limit)
    )
    messages = result.scalars().all()

    return [_build_message_response(message, conversation, current_user.id) for message in messages]


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    conversation_id: str,
    body: MessageCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    conversation = await _get_conversation_for_actor(conversation_id, db, current_user)

    text = body.body.strip()
    if not text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message cannot be empty")

    message = ConversationMessage(
        conversation_id=conversation.id,
        sender_id=current_user.id,
        body=text,
    )
    db.add(message)

    conversation.last_message_preview = text[:280]
    conversation.last_message_sender_id = current_user.id
    conversation.last_message_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(message)

    sender_role = "user" if current_user.role == UserRole.user else "professional"

    return MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        sender_id=message.sender_id,
        sender_name=current_user.name,
        sender_role=sender_role,
        body=message.body,
        read_at=message.read_at,
        created_at=message.created_at,
        is_mine=True,
    )


@router.post("/conversations/{conversation_id}/read", response_model=MarkReadResponse)
async def mark_conversation_read(conversation_id: str, db: DbSession, current_user: CurrentUser):
    conversation = await _get_conversation_for_actor(conversation_id, db, current_user)

    result = await db.execute(
        update(ConversationMessage)
        .where(
            ConversationMessage.conversation_id == conversation.id,
            ConversationMessage.sender_id != current_user.id,
            ConversationMessage.read_at.is_(None),
        )
        .values(read_at=datetime.now(timezone.utc))
    )

    return MarkReadResponse(updated=int(result.rowcount or 0))
