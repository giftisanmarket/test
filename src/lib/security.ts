import crypto from "crypto";

function getServerSigningSecret(): string {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.PAYMOB_HMAC;
  if (!secret) {
    throw new Error("Server signing secret (AUTH_SECRET / NEXTAUTH_SECRET) is not configured.");
  }
  return secret;
}

/**
 * Constant-time string comparison using SHA-256 digests so neither value nor length leaks.
 */
export function safeCompareSecrets(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (!a || !b) return false;
  const hashA = crypto.createHash("sha256").update(String(a), "utf8").digest();
  const hashB = crypto.createHash("sha256").update(String(b), "utf8").digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Generates an HMAC-signed token proving caller access to a newly created order
 * (used for SuccessPage receipt viewing and guest-to-account conversion).
 */
export function signOrderAccessToken(
  orderId: string,
  email?: string | null,
  ttlMs: number = 2 * 60 * 60 * 1000 // 2 hours
): string {
  const secret = getServerSigningSecret();
  const normalizedEmail = (email || "").trim().toLowerCase();
  const exp = Date.now() + ttlMs;
  const payload = `${orderId}:${normalizedEmail}:${exp}`;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`order-access:${payload}`, "utf8")
    .digest("hex");
  return `${exp}.${sig}`;
}

export function verifyOrderAccessToken(
  token: string | null | undefined,
  orderId: string,
  email?: string | null
): boolean {
  if (!token || !orderId) return false;
  const dotIdx = token.indexOf(".");
  if (dotIdx <= 0) return false;

  const expStr = token.slice(0, dotIdx);
  const providedSig = token.slice(dotIdx + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;

  try {
    const secret = getServerSigningSecret();
    const normalizedEmail = (email || "").trim().toLowerCase();
    const payload = `${orderId}:${normalizedEmail}:${exp}`;
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`order-access:${payload}`, "utf8")
      .digest("hex");
    return safeCompareSecrets(providedSig, expectedSig);
  } catch {
    return false;
  }
}

/**
 * Signs and verifies packing-slip QR delivery runner confirmation URLs.
 */
export function signDeliveryVerifyToken(targetId: string): string {
  const secret = getServerSigningSecret();
  return crypto
    .createHmac("sha256", secret)
    .update(`delivery-verify:${targetId}`, "utf8")
    .digest("hex");
}

export function verifyDeliveryVerifyToken(
  targetId: string | null | undefined,
  sig: string | null | undefined
): boolean {
  if (!targetId || !sig) return false;
  try {
    const expected = signDeliveryVerifyToken(targetId);
    return safeCompareSecrets(sig, expected);
  } catch {
    return false;
  }
}

/**
 * Escapes untrusted strings before interpolating into HTML responses or attributes.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Validates that a user-supplied external link uses strictly http: or https: protocol.
 */
export function isSafeHttpUrl(rawUrl: unknown): boolean {
  if (typeof rawUrl !== "string") return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2048) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
