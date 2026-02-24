from datetime import date
from pydantic import BaseModel
from app.models.booking import BookingStatus


class BookingCreate(BaseModel):
    service_id: str
    scheduled_date: date
    time_slot: str
    address: str
    latitude: float | None = None
    longitude: float | None = None
    addons: list[dict] | None = None
    notes: str | None = None


class BookingResponse(BaseModel):
    id: str
    service_id: str
    user_id: str
    pro_id: str | None
    status: BookingStatus
    scheduled_date: date
    time_slot: str
    address: str
    base_price: float
    addons: list[dict] | None
    platform_fee: float
    tax: float
    total_price: float
    notes: str | None
    reschedule_count: int
    cancellation_reason: str | None

    model_config = {"from_attributes": True}


class BookingStatusTimeline(BaseModel):
    status: BookingStatus
    note: str | None
    created_at: object

    model_config = {"from_attributes": True}


class CancelBookingRequest(BaseModel):
    reason: str


class RescheduleRequest(BaseModel):
    new_date: date
    new_slot: str


class PriceQuoteRequest(BaseModel):
    service_id: str
    addons: list[dict] | None = None


class PriceQuoteResponse(BaseModel):
    base_price: float
    addons_total: float
    dynamic_multiplier: float
    subtotal: float
    platform_fee: float
    tax: float
    total: float
    platform_commission: float
    pro_payout: float
