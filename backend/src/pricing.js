import { config } from "./config.js";

export function calculatePrice(basePrice, addons = [], commissionRate = null, peakHour = false, demandFactor = 1.0) {
  const safeAddons = Array.isArray(addons) ? addons : [];
  const rate = commissionRate ?? config.defaultCommissionRate;
  const addonsTotal = safeAddons.reduce((sum, addon) => sum + Number(addon?.price || 0), 0);
  const rawSubtotal = Number(basePrice || 0) + addonsTotal;
  const dynamicMultiplier = demandFactor * (peakHour ? 1.1 : 1.0);
  const subtotal = Number((rawSubtotal * dynamicMultiplier).toFixed(2));
  const tax = Number((subtotal * config.gstRate).toFixed(2));
  const platformFee = Number(config.platformFee);
  const total = Number((subtotal + tax + platformFee).toFixed(2));
  const platformCommission = Number((total * rate).toFixed(2));
  const proPayout = Number((total - platformCommission).toFixed(2));

  return {
    base_price: Number(basePrice || 0),
    addons_total: Number(addonsTotal.toFixed(2)),
    dynamic_multiplier: Number(dynamicMultiplier.toFixed(4)),
    subtotal,
    platform_fee: platformFee,
    tax,
    total,
    platform_commission: platformCommission,
    pro_payout: proPayout,
  };
}
