"""
Imports all models so SQLAlchemy can discover relationships
and Alembic can find all metadata.

Import order matters — parent models before children.
"""
from app.models.user import User, UserRole            # noqa: F401
from app.models.professional import Professional      # noqa: F401
from app.models.service import Category, Service      # noqa: F401
from app.models.booking import (                      # noqa: F401
    Booking, BookingStatus, BookingStatusTimeline,
)
from app.models.payment import (                      # noqa: F401
    Payment, PaymentMethod, PaymentStatus, WalletTransaction, TransactionType,
)
from app.models.review import Review                  # noqa: F401
from app.models.dispute import Dispute, DisputeEvidence, DisputeStatus  # noqa: F401
from app.models.notification import Notification, AvailabilitySlot       # noqa: F401
from app.models.kyc import KYCDocument, DocType, KYCStatus               # noqa: F401
