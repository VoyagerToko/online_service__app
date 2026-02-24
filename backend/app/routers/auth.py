"""
Auth router — register, login, email verify, refresh, forgot/reset password, Google OAuth stub.
"""
from fastapi import APIRouter, HTTPException, status, Query, BackgroundTasks
from sqlalchemy import select

from app.deps import DbSession, CurrentUser
from app.models.user import User, UserRole
from app.models.professional import Professional
from app.schemas.auth import (
    RegisterRequest, LoginRequest, TokenResponse, RefreshRequest,
    ForgotPasswordRequest, ResetPasswordRequest, UserResponse,
)
from app.services.auth_service import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_refresh_token,
    generate_email_token, verify_email_token,
)
from app.services.email_service import send_verification_email, send_password_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: DbSession, bg: BackgroundTasks):
    """Register a new user. Sends a verification email in the background."""
    existing = await db.scalar(select(User).where(User.email == body.email))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        name=body.name,
        email=body.email,
        hashed_password=hash_password(body.password),
        phone=body.phone,
        role=body.role,
    )
    db.add(user)
    await db.flush()  # get user.id

    # Auto-create professional profile if role = professional
    if body.role == UserRole.professional:
        pro = Professional(user_id=user.id, specialty="General")
        db.add(pro)

    token = generate_email_token(user.email, salt="email-verify")
    bg.add_task(send_verification_email, user.email, token, user.name)

    return user


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: DbSession):
    """Authenticate and return JWT access + refresh tokens."""
    user = await db.scalar(select(User).where(User.email == body.email))
    if not user or not user.hashed_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.is_blocked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account has been blocked")

    access_token = create_access_token(subject=user.id, extra={"role": user.role})
    refresh_token = create_refresh_token(subject=user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: DbSession):
    """Exchange a valid refresh token for a new access + refresh token pair."""
    payload = decode_refresh_token(body.refresh_token)
    user = await db.scalar(select(User).where(User.id == payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    return TokenResponse(
        access_token=create_access_token(user.id, extra={"role": user.role}),
        refresh_token=create_refresh_token(user.id),
        user=UserResponse.model_validate(user),
    )


@router.get("/verify-email")
async def verify_email(token: str = Query(...), db: DbSession = None):
    """Verify user email via signed token link."""
    email = verify_email_token(token, salt="email-verify")
    user = await db.scalar(select(User).where(User.email == email))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.is_email_verified:
        return {"message": "Email already verified"}
    user.is_email_verified = True
    return {"message": "Email verified successfully"}


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(body: ForgotPasswordRequest, db: DbSession, bg: BackgroundTasks):
    """Send a password reset link. Always returns 202 to prevent email enumeration."""
    user = await db.scalar(select(User).where(User.email == body.email))
    if user:
        token = generate_email_token(user.email, salt="password-reset")
        bg.add_task(send_password_reset_email, user.email, token)
    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: DbSession):
    """Set new password using a signed reset token."""
    email = verify_email_token(body.token, salt="password-reset", max_age_seconds=3600)
    user = await db.scalar(select(User).where(User.email == email))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.hashed_password = hash_password(body.new_password)
    return {"message": "Password updated successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser):
    """Return the currently authenticated user's profile."""
    return current_user


@router.get("/google")
async def google_oauth_stub():
    """Placeholder for Google OAuth redirect. Wire up with authlib in production."""
    return {"message": "Google OAuth not yet configured. Set GOOGLE_CLIENT_ID in .env"}
