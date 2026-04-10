from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class ReviewCreate(BaseModel):
    booking_id: str
    rating: int
    comment: str | None = None

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v: int) -> int:
        if not (1 <= v <= 5):
            raise ValueError("Rating must be between 1 and 5")
        return v


class ReviewResponse(BaseModel):
    id: str
    booking_id: str
    reviewer_id: str
    reviewee_id: str
    rating: int
    comment: str | None
    is_verified: bool
    is_flagged: bool

    model_config = {"from_attributes": True}


class DisputeCreate(BaseModel):
    booking_id: str
    reason: str


class DisputeResponse(BaseModel):
    id: str
    booking_id: str
    raised_by: str
    against_id: str
    reason: str
    status: str
    resolution: str | None
    refund_amount: float | None

    model_config = {"from_attributes": True}


class DisputeResolve(BaseModel):
    resolution: str
    refund_amount: float | None = None


class ServiceCreate(BaseModel):
    category_id: str
    name: str
    description: str | None = None
    base_price: float
    icon: str
    requires_inspection: bool = False


class ServiceResponse(BaseModel):
    id: str
    category_id: str | None
    name: str
    description: str | None
    base_price: float
    icon: str
    is_active: bool
    avg_rating: float
    reviews_count: int

    model_config = {"from_attributes": True}


class CategoryCreate(BaseModel):
    name: str
    icon: str
    description: str | None = None


class CategoryResponse(BaseModel):
    id: str
    name: str
    icon: str
    description: str | None
    is_active: bool

    model_config = {"from_attributes": True}


class ProfessionalProfileUpdate(BaseModel):
    specialty: str | None = None
    bio: str | None = None
    experience_years: int | None = None
    base_location: str | None = None
    is_available: bool | None = None
    starting_price: float | None = None
    public_phone: str | None = None
    public_email: str | None = None
    whatsapp_number: str | None = None
    website_url: str | None = None
    contact_address: str | None = None
    photo_urls: list[str] | None = None

    @field_validator("experience_years")
    @classmethod
    def validate_experience_years(cls, v: int | None) -> int | None:
        if v is not None and v < 0:
            raise ValueError("experience_years cannot be negative")
        return v

    @field_validator("starting_price")
    @classmethod
    def validate_starting_price(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("starting_price cannot be negative")
        return v


class ProfessionalPhotoRemoveRequest(BaseModel):
    photo_url: str = Field(min_length=1)


class ProfessionalResponse(BaseModel):
    id: str
    user_id: str
    name: str | None = None
    avatar_url: str | None = None
    specialty: str
    bio: str | None
    experience_years: int
    is_available: bool
    is_kyc_verified: bool
    avg_rating: float
    total_jobs: int
    starting_price: float = 0.0
    public_phone: str | None = None
    public_email: str | None = None
    whatsapp_number: str | None = None
    website_url: str | None = None
    contact_address: str | None = None
    photo_urls: list[str] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    body: str
    is_read: bool
    metadata_: dict | None

    model_config = {"from_attributes": True, "populate_by_name": True}


class AnalyticsSummary(BaseModel):
    total_users: int
    total_professionals: int
    total_bookings: int
    completed_bookings: int
    cancelled_bookings: int
    cancellation_rate: float
    total_revenue: float
    open_disputes: int
    pending_kyc: int


class AdminAccountResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    is_active: bool
    is_blocked: bool
    is_email_verified: bool
    created_at: datetime
    professional_id: str | None = None
    is_suspended: bool | None = None
