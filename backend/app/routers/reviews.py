"""
Reviews router — verified reviews only (booking must be completed).
"""
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select, func

from app.deps import DbSession, CurrentUser
from app.models.review import Review
from app.models.booking import Booking, BookingStatus
from app.models.professional import Professional
from app.schemas.common import ReviewCreate, ReviewResponse

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("/", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(body: ReviewCreate, db: DbSession, current_user: CurrentUser):
    """
    Create a review. Only allowed when the booking is completed or rated.
    Anti-spam: one review per booking enforced by DB UNIQUE constraint.
    """
    booking = await db.scalar(select(Booking).where(Booking.id == body.booking_id))
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only review your own bookings")
    if booking.status not in (BookingStatus.completed, BookingStatus.rated):
        raise HTTPException(
            status_code=400,
            detail="Reviews can only be submitted for completed bookings"
        )

    existing = await db.scalar(select(Review).where(Review.booking_id == body.booking_id))
    if existing:
        raise HTTPException(status_code=409, detail="You have already reviewed this booking")

    # Get the professional's user_id for reviewee
    pro = await db.scalar(select(Professional).where(Professional.id == booking.pro_id))
    if not pro:
        raise HTTPException(status_code=400, detail="No professional assigned to this booking")

    review = Review(
        booking_id=body.booking_id,
        reviewer_id=current_user.id,
        reviewee_id=pro.user_id,
        rating=body.rating,
        comment=body.comment,
        is_verified=True,
    )
    db.add(review)
    await db.flush()

    # Update booking status to 'rated'
    booking.status = BookingStatus.rated

    # Recalculate pro average rating
    avg_result = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id))
        .where(Review.reviewee_id == pro.user_id, Review.is_verified == True)
    )
    avg, count = avg_result.one()
    pro.avg_rating = round(float(avg or 0), 2)
    pro.total_ratings = count or 0
    pro.total_jobs += 1

    return review


@router.get("/professional/{professional_id}", response_model=list[ReviewResponse])
async def get_pro_reviews(professional_id: str, db: DbSession, skip: int = 0, limit: int = 20):
    """Get all verified reviews for a professional."""
    pro = await db.scalar(select(Professional).where(Professional.id == professional_id))
    if not pro:
        raise HTTPException(status_code=404, detail="Professional not found")
    result = await db.execute(
        select(Review)
        .where(Review.reviewee_id == pro.user_id, Review.is_verified == True, Review.is_flagged == False)
        .order_by(Review.created_at.desc())
        .offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.patch("/{review_id}/flag")
async def flag_review(review_id: str, db: DbSession, current_user: CurrentUser):
    """Flag a review for admin moderation (any user can flag)."""
    review = await db.scalar(select(Review).where(Review.id == review_id))
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.is_flagged = True
    return {"message": "Review flagged for moderation"}
