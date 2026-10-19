import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Strips all emoji characters from a string (covers all Unicode emoji ranges)
export function stripEmojis(str: string): string {
  if (!str) return "";
  return str
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, "")  // flag sequences
    .replace(/[\u200D\uFE0F]/gu, "")          // zero-width joiners & variation selectors
    .replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]/g, ""); // surrogate pairs
}

export function hasEmoji(str: string): boolean {
  if (!str) return false;
  return /\p{Extended_Pictographic}|[\u{1F1E0}-\u{1F1FF}]|[\uD83C-\uDBFF\uDC00-\uDFFF]/u.test(str);
}

export function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')                     // Replace spaces with -
    .replace(/[^\w\u0600-\u06FF-]+/g, '')    // Preserve ASCII & Arabic characters
    .replace(/--+/g, '-')                     // Replace multiple - with single -
    .replace(/^-+/, '')                       // Trim - from start
    .replace(/-+$/, '');                      // Trim - from end
}

export function getOptimizedImageUrl(
  url?: string | null,
  options: { width?: number; height?: number; quality?: string | number; crop?: string } = {}
): string {
  if (!url || typeof url !== "string") return "/icon.png";
  if (!url.includes("res.cloudinary.com")) return url;

  const { width, height, quality = "auto", crop } = options;
  const transforms: string[] = ["f_auto", `q_${quality}`];

  if (width) transforms.push(`w_${Math.round(width)}`);
  if (height) transforms.push(`h_${Math.round(height)}`);
  if (crop) {
    transforms.push(`c_${crop}`);
  } else if (width && height) {
    transforms.push("c_fill");
  } else if (width || height) {
    transforms.push("c_limit");
  }

  const transformString = transforms.join(",");

  // Matches /image/upload/ followed by an optional existing transformation block (e.g. f_auto,q_auto,w_600/)
  const match = url.match(/\/image\/upload\/(?:(?:[a-z]_[^/]+,?[^/]*)\/)?/i);
  if (match) {
    return url.replace(match[0], `/image/upload/${transformString}/`);
  }

  return url.replace("/upload/", `/upload/${transformString}/`);
}

/**
 * Calculates the calendar cutoff date for escrow clearance.
 * An order delivered on calendar day D becomes eligible from the beginning (00:00)
 * of day D + holdingDays in Egypt time (UTC+3), rather than requiring the exact hour/minute to pass.
 */
export function getEscrowClearanceThresholdDate(holdingDays: number = 7): Date {
  const now = new Date();
  // Egypt timezone offset: UTC+3 (3 hours in ms)
  const cairoOffsetMs = 3 * 60 * 60 * 1000;
  const cairoNow = new Date(now.getTime() + cairoOffsetMs);

  // Start of today (00:00:00.000) in Cairo time
  const cairoStartOfToday = new Date(Date.UTC(
    cairoNow.getUTCFullYear(),
    cairoNow.getUTCMonth(),
    cairoNow.getUTCDate(),
    0, 0, 0, 0
  ));

  // If today is day T, all orders delivered on or before day (T - holdingDays) are eligible.
  // In other words, any order created before the start of day (T - holdingDays + 1) in Cairo.
  const cutoffCairo = new Date(cairoStartOfToday.getTime() - (holdingDays - 1) * 24 * 60 * 60 * 1000);

  // Return converted back to UTC
  return new Date(cutoffCairo.getTime() - cairoOffsetMs);
}
