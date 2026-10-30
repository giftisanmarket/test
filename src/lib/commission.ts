/**
 * Commission Tiers & Policy Engine
 *
 * Implements the graduated commission policy:
 * - Months 1 to 6 (0 to 182 days): 0% platform commission
 * - Months 7 to 12 (183 to 365 days): 8% platform commission
 * - Months 13 and onward (366+ days): 10% platform commission
 *
 * An artisan can also have a manual override if an admin explicitly configures one.
 */

export interface CommissionTierInfo {
  tier: "FIRST_6_MONTHS" | "SECOND_6_MONTHS" | "STANDARD";
  rate: number; // e.g. 0.0, 0.08, 0.10
  percentage: number; // e.g. 0, 8, 10
  monthsPassed: number;
  daysPassed: number;
  tierLabelEn: string;
  tierLabelAr: string;
  nextTierDate?: Date;
  nextTierRate?: number;
}

export function calculateTierCommission(options: {
  createdAt?: Date | string | null;
  termsAcceptedAt?: Date | string | null;
  manualOverrideRate?: number | null;
  referenceDate?: Date;
}): CommissionTierInfo {
  const { createdAt, termsAcceptedAt, manualOverrideRate, referenceDate = new Date() } = options;

  if (
    typeof manualOverrideRate === "number" &&
    Number.isFinite(manualOverrideRate) &&
    manualOverrideRate > 0
  ) {
    const clampedRate = Math.min(1, Math.max(0, manualOverrideRate));
    const pct = Math.round(clampedRate * 1000) / 10;
    return {
      tier: "STANDARD",
      rate: clampedRate,
      percentage: pct,
      monthsPassed: 0,
      daysPassed: 0,
      tierLabelEn: `${pct}% Custom Rate`,
      tierLabelAr: `${pct}% نسبة مخصصة`,
    };
  }

  // Always measure graduated tenure from immutable account/shop creation timestamp first,
  // preventing terms re-acceptance from resetting the 6-month 0% introductory window.
  const startDate = createdAt
    ? new Date(createdAt)
    : termsAcceptedAt
    ? new Date(termsAcceptedAt)
    : referenceDate;

  const diffMs = Math.max(0, referenceDate.getTime() - startDate.getTime());
  const daysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const monthsPassed = Math.floor(daysPassed / 30.4375); // Average month length

  // 6 months is approx 182.5 days (~182 days)
  // 12 months is approx 365.25 days (~365 days)
  const SIX_MONTHS_DAYS = 182;
  const TWELVE_MONTHS_DAYS = 365;

  if (daysPassed <= SIX_MONTHS_DAYS) {
    const nextDate = new Date(startDate.getTime() + SIX_MONTHS_DAYS * 24 * 60 * 60 * 1000);
    return {
      tier: "FIRST_6_MONTHS",
      rate: 0.0,
      percentage: 0,
      monthsPassed,
      daysPassed,
      tierLabelEn: "0% Intro (Months 1–6)",
      tierLabelAr: "0% تمهيدية (الشهور 1–6)",
      nextTierDate: nextDate,
      nextTierRate: 0.08,
    };
  }

  if (daysPassed <= TWELVE_MONTHS_DAYS) {
    const nextDate = new Date(startDate.getTime() + TWELVE_MONTHS_DAYS * 24 * 60 * 60 * 1000);
    return {
      tier: "SECOND_6_MONTHS",
      rate: 0.08,
      percentage: 8,
      monthsPassed,
      daysPassed,
      tierLabelEn: "8% Tier (Months 7–12)",
      tierLabelAr: "8% مرحلية (الشهور 7–12)",
      nextTierDate: nextDate,
      nextTierRate: 0.10,
    };
  }

  return {
    tier: "STANDARD",
    rate: 0.10,
    percentage: 10,
    monthsPassed,
    daysPassed,
    tierLabelEn: "10% Standard (Month 13+)",
    tierLabelAr: "10% قياسية (الشهر 13 وما بعده)",
  };
}

/**
 * Returns the effective commission rate for an artisan.
 * If an admin set an explicit manual commission override (and indicated so), it uses that;
 * otherwise it calculates automatically from the graduated tiers.
 */
export function getEffectiveArtisanCommissionRate(artisan: {
  createdAt?: Date | string | null;
  termsAcceptedAt?: Date | string | null;
  commissionRate?: number | null;
}, atDate: Date = new Date()): number {
  const tier = calculateTierCommission({
    createdAt: artisan.createdAt,
    termsAcceptedAt: artisan.termsAcceptedAt,
    manualOverrideRate: artisan.commissionRate,
    referenceDate: atDate,
  });

  return tier.rate;
}
