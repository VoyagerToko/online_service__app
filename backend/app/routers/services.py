"""
Services and Categories routers.
"""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import DbSession, CurrentUser, RequireAdmin
from app.models.service import Service, Category
from app.schemas.common import (
    ServiceCreate, ServiceResponse,
    CategoryCreate, CategoryResponse,
)

services_router = APIRouter(prefix="/services", tags=["services"])
categories_router = APIRouter(prefix="/categories", tags=["categories"])


# ─── Categories ─────────────────────────────────────────────────────────────────

@categories_router.get("/", response_model=list[CategoryResponse])
async def list_categories(db: DbSession, active_only: bool = True):
    q = select(Category)
    if active_only:
        q = q.where(Category.is_active == True)
    result = await db.execute(q.order_by(Category.name))
    return result.scalars().all()


@categories_router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(body: CategoryCreate, db: DbSession, _admin: RequireAdmin):
    cat = Category(name=body.name, icon=body.icon, description=body.description)
    db.add(cat)
    await db.flush()
    return cat


# ─── Services ──────────────────────────────────────────────────────────────────

@services_router.get("/", response_model=list[ServiceResponse])
async def list_services(
    db: DbSession,
    category_id: str | None = None,
    search: str | None = None,
    skip: int = 0,
    limit: int = 50,
):
    q = select(Service).where(Service.is_active == True)
    if category_id:
        q = q.where(Service.category_id == category_id)
    if search:
        q = q.where(Service.name.ilike(f"%{search}%"))
    result = await db.execute(q.offset(skip).limit(limit))
    return result.scalars().all()


@services_router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(service_id: str, db: DbSession):
    service = await db.scalar(select(Service).where(Service.id == service_id))
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    return service


@services_router.post("/", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(body: ServiceCreate, db: DbSession, _admin: RequireAdmin):
    svc = Service(**body.model_dump())
    db.add(svc)
    await db.flush()
    return svc


@services_router.patch("/{service_id}/approve")
async def approve_service(service_id: str, db: DbSession, _admin: RequireAdmin):
    svc = await db.scalar(select(Service).where(Service.id == service_id))
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    svc.is_active = True
    return {"message": "Service approved"}


@services_router.delete("/{service_id}")
async def deactivate_service(service_id: str, db: DbSession, _admin: RequireAdmin):
    svc = await db.scalar(select(Service).where(Service.id == service_id))
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    svc.is_active = False
    return {"message": "Service deactivated"}
