import { calculateTierCommission, getEffectiveArtisanCommissionRate } from "../src/lib/commission";

console.log("=== Testing Graduated Commission Calculation Engine ===\n");

const now = new Date("2026-10-26T12:00:00Z");

// Test Case 1: Brand new artisan (account created today)
const newArtisan = {
  createdAt: new Date("2026-10-26T10:00:00Z"),
  termsAcceptedAt: new Date("2026-10-26T10:00:00Z"),
};
const tier1 = calculateTierCommission({ ...newArtisan, referenceDate: now });
console.log("1. New Artisan (0 days):");
console.log(`   - Rate: ${tier1.rate * 100}% (${tier1.tier})`);
console.log(`   - Label EN: "${tier1.tierLabelEn}"`);
console.log(`   - Next Tier Date: ${tier1.nextTierDate?.toISOString().slice(0, 10)}`);
console.log(`   - Effective Commission: ${getEffectiveArtisanCommissionRate(newArtisan, now) * 100}%\n`);

// Test Case 2: Artisan at Month 4 (120 days old)
const artisanMonth4 = {
  createdAt: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
};
const tier2 = calculateTierCommission({ ...artisanMonth4, referenceDate: now });
console.log("2. Artisan at Month 4 (120 days):");
console.log(`   - Rate: ${tier2.rate * 100}% (${tier2.tier})`);
console.log(`   - Effective Commission: ${getEffectiveArtisanCommissionRate(artisanMonth4, now) * 100}%\n`);

// Test Case 3: Artisan in Second 6 Months (Month 8 / 240 days old)
const artisanMonth8 = {
  createdAt: new Date(now.getTime() - 240 * 24 * 60 * 60 * 1000),
};
const tier3 = calculateTierCommission({ ...artisanMonth8, referenceDate: now });
console.log("3. Artisan in Month 8 (240 days):");
console.log(`   - Rate: ${tier3.rate * 100}% (${tier3.tier})`);
console.log(`   - Label EN: "${tier3.tierLabelEn}"`);
console.log(`   - Next Tier Date: ${tier3.nextTierDate?.toISOString().slice(0, 10)}`);
console.log(`   - Effective Commission: ${getEffectiveArtisanCommissionRate(artisanMonth8, now) * 100}%\n`);

// Test Case 4: Artisan in Standard Tier (Month 14 / 420 days old)
const artisanMonth14 = {
  createdAt: new Date(now.getTime() - 420 * 24 * 60 * 60 * 1000),
};
const tier4 = calculateTierCommission({ ...artisanMonth14, referenceDate: now });
console.log("4. Artisan in Month 14 (420 days):");
console.log(`   - Rate: ${tier4.rate * 100}% (${tier4.tier})`);
console.log(`   - Label EN: "${tier4.tierLabelEn}"`);
console.log(`   - Effective Commission: ${getEffectiveArtisanCommissionRate(artisanMonth14, now) * 100}%\n`);

console.log("=== All Tests Completed Successfully ===");
