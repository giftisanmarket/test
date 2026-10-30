import crypto from "crypto";
import { safeCompareSecrets } from "@/lib/security";

export const PAYMOB_PUBLIC_KEY = process.env.PAYMOB_PUBLIC_KEY || "";
export const PAYMOB_SECRET_KEY = process.env.PAYMOB_SECRET_KEY || "";
export const PAYMOB_HMAC = process.env.PAYMOB_HMAC || "";
export const PAYMOB_INTEGRATION_IDS = process.env.PAYMOB_INTEGRATION_IDS
  ? process.env.PAYMOB_INTEGRATION_IDS.split(",")
  : [];

export async function createPaymobIntention(
  amountCents: number,
  orderId: string,
  billingData: any,
  items: any[]
) {
  const normalizedTotalCents = Math.round(amountCents);

  const normalizedItems = items.map((item) => ({
    name: item.name || "Item",
    amount: Math.round(item.amount_cents ?? Number(item.price || 0) * 100),
    description: item.description || "Giftisan Product",
    quantity: Math.max(1, Math.round(Number(item.quantity || 1))),
    picture_url:
      item.image ||
      "https://res.cloudinary.com/dlnnwqgob/image/upload/v1714488310/placeholder_d49hxw.jpg",
  }));

  // Ensure item piastres sum identically to normalizedTotalCents so Paymob never rejects fractional rounding
  const itemsSumCents = normalizedItems.reduce(
    (sum, item) => sum + item.amount * item.quantity,
    0
  );
  const diffCents = normalizedTotalCents - itemsSumCents;
  if (diffCents !== 0) {
    normalizedItems.push({
      name: diffCents > 0 ? "Adjustment" : "Discount Adjustment",
      amount: diffCents,
      description: "Rounding reconciliation",
      quantity: 1,
      picture_url:
        "https://res.cloudinary.com/dlnnwqgob/image/upload/v1714488310/placeholder_d49hxw.jpg",
    });
  }

  const response = await fetch("https://accept.paymob.com/v1/intention/", {
    method: "POST",
    headers: {
      Authorization: `Token ${PAYMOB_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: normalizedTotalCents,
      currency: "EGP",
      payment_methods: PAYMOB_INTEGRATION_IDS.map((id) => parseInt(id.trim(), 10)).filter(
        Number.isFinite
      ),
      items: normalizedItems,
      billing_data: {
        first_name: billingData.firstName || "NA",
        last_name: billingData.lastName || "NA",
        email: billingData.email || "guest@giftisan.shop",
        phone_number: billingData.phone || "+201000000000",
        street: billingData.address || "NA",
        city: billingData.city || "NA",
        country: billingData.country || "EG",
        floor: billingData.floor || "NA",
        building: billingData.building || "NA",
        apartment: billingData.apartment || "NA",
      },
      special_reference: orderId,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Paymob Intention API Error:", data);
    throw new Error(data.message || "Paymob intention creation failed");
  }

  return data.client_secret;
}

/**
 * Verifies Paymob's SHA-512 HMAC on webhook JSON `obj` payloads.
 */
export function verifyPaymobWebhookHmac(obj: any, hmacReceived: string | null): boolean {
  if (!PAYMOB_HMAC || !hmacReceived || !obj) return false;

  const fieldsToHash = [
    obj.amount_cents,
    obj.created_at,
    obj.currency,
    obj.error_occured,
    obj.has_parent_transaction,
    obj.id,
    obj.integration_id,
    obj.is_3d_secure,
    obj.is_auth,
    obj.is_capture,
    obj.is_refunded,
    obj.is_standalone_payment,
    obj.is_voided,
    obj.order?.id,
    obj.owner,
    obj.pending,
    obj.source_data?.pan,
    obj.source_data?.sub_type,
    obj.source_data?.type,
    obj.success,
  ];

  const hmacString = fieldsToHash
    .map((v) => (v === undefined || v === null ? "" : String(v)))
    .join("");
  const hmacCalculated = crypto
    .createHmac("sha512", PAYMOB_HMAC)
    .update(hmacString)
    .digest("hex");

  return safeCompareSecrets(hmacCalculated, hmacReceived);
}

/**
 * Verifies Paymob's SHA-512 HMAC on browser redirect query parameters (`/checkout/success?...&hmac=...`).
 */
export function verifyPaymobRedirectHmac(
  search: Record<string, string | string[] | undefined>
): boolean {
  const hmacReceived = typeof search.hmac === "string" ? search.hmac : null;
  if (!PAYMOB_HMAC || !hmacReceived) return false;

  const getParam = (key: string) => {
    const val = search[key];
    if (Array.isArray(val)) return val[0] ?? "";
    return val === undefined || val === null ? "" : String(val);
  };

  const fieldsToHash = [
    getParam("amount_cents"),
    getParam("created_at"),
    getParam("currency"),
    getParam("error_occured"),
    getParam("has_parent_transaction"),
    getParam("id"),
    getParam("integration_id"),
    getParam("is_3d_secure"),
    getParam("is_auth"),
    getParam("is_capture"),
    getParam("is_refunded"),
    getParam("is_standalone_payment"),
    getParam("is_voided"),
    getParam("order"),
    getParam("owner"),
    getParam("pending"),
    getParam("source_data.pan"),
    getParam("source_data.sub_type"),
    getParam("source_data.type"),
    getParam("success"),
  ];

  const hmacString = fieldsToHash.join("");
  const hmacCalculated = crypto
    .createHmac("sha512", PAYMOB_HMAC)
    .update(hmacString)
    .digest("hex");

  return safeCompareSecrets(hmacCalculated, hmacReceived);
}
