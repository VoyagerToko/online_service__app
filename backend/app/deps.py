"""
Reusable FastAPI dependencies — injected into route handlers.
"""
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User, UserRole
from app.services.auth_service import decode_access_token

bearer_scheme = HTTPBearer()

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: DbSession,
) -> User:
    """Decode JWT and return the authenticated User."""
    token = credentials.credentials
    payload = decode_access_token(token)

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active or user.is_blocked:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive or blocked")

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: UserRole):
    """Factory for role-based access control dependencies."""
    async def role_checker(current_user: CurrentUser) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in roles]}",
            )
        return current_user
    return role_checker


# Convenience role dependencies
RequireUser = Annotated[User, Depends(require_roles(UserRole.user))]
RequireProfessional = Annotated[User, Depends(require_roles(UserRole.professional))]
RequireAdmin = Annotated[User, Depends(require_roles(UserRole.admin))]
RequireUserOrAdmin = Annotated[User, Depends(require_roles(UserRole.user, UserRole.admin))]
RequireAnyRole = Annotated[User, Depends(require_roles(UserRole.user, UserRole.professional, UserRole.admin))]
