/**
 * The version is the legal identifier recorded with every artisan acceptance.
 * Bump it before publishing a material change to the Artisan Agreement.
 */
export const ARTISAN_AGREEMENT_VERSION = "2026-v2";

export const ARTISAN_AGREEMENT_SUPPORTED_LANGUAGES = ["ar", "en"] as const;
export type ArtisanAgreementLanguage = (typeof ARTISAN_AGREEMENT_SUPPORTED_LANGUAGES)[number];

export function isArtisanAgreementLanguage(value: unknown): value is ArtisanAgreementLanguage {
  return typeof value === "string" && ARTISAN_AGREEMENT_SUPPORTED_LANGUAGES.includes(value as ArtisanAgreementLanguage);
}

