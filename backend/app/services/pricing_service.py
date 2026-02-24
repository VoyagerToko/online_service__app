"""
Pricing engine — calculates final price for a booking.

Formula:
  subtotal = base_price + sum(addon prices)
  dynamic  = subtotal * dynamic_multiplier  (peaks / demand — currently stub)
  platform_fee = PLATFORM_FEE (flat)
  tax      = dynamic * GST_RATE
  total    = dynamic + platform_fee + tax
  commission = total * pro.commission_rate
  pro_payout = total - commission - platform_fee - tax
"""
from dataclasses import dataclass
from app.config import settings


@dataclass
class PriceBreakdown:
    base_price: float
    addons_total: float
    dynamic_multiplier: float
    subtotal: float
    platform_fee: float
    tax: float
    total: float
    platform_commission: float
    pro_payout: float


def calculate_price(
    base_price: float,
    addons: list[dict] | None = None,
    commission_rate: float | None = None,
    peak_hour: bool = False,
    demand_factor: float = 1.0,
) -> PriceBreakdown:
    """
    Compute a full price breakdown.

    :param base_price: service base price in INR
    :param addons: list of {"name": str, "price": float}
    :param commission_rate: pro's commission rate (overrides default)
    :param peak_hour: if True applies a 10% surcharge
    :param demand_factor: surge multiplier (e.g. 1.2 for 20% surge)
    """
    addons = addons or []
    commission_rate = commission_rate if commission_rate is not None else settings.DEFAULT_COMMISSION_RATE

    addons_total = sum(a.get("price", 0.0) for a in addons)
    raw_subtotal = base_price + addons_total

    # Dynamic pricing multiplier
    dynamic_multiplier = demand_factor * (1.1 if peak_hour else 1.0)
    subtotal = round(raw_subtotal * dynamic_multiplier, 2)

    tax = round(subtotal * settings.GST_RATE, 2)
    platform_fee = settings.PLATFORM_FEE
    total = round(subtotal + tax + platform_fee, 2)

    platform_commission = round(total * commission_rate, 2)
    pro_payout = round(total - platform_commission, 2)

    return PriceBreakdown(
        base_price=base_price,
        addons_total=addons_total,
        dynamic_multiplier=dynamic_multiplier,
        subtotal=subtotal,
        platform_fee=platform_fee,
        tax=tax,
        total=total,
        platform_commission=platform_commission,
        pro_payout=pro_payout,
    )
