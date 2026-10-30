/**
 * Safe Prisma `select` projections and DTO sanitizers for public storefront responses.
 * Prevents leaking private ArtisanProfile logistics/payout fields and private User emails/hashes.
 */

export const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  image: true,
} as const;

export const PUBLIC_ARTISAN_SELECT = {
  id: true,
  userId: true,
  bio: true,
  location: true,
  yearsOfExperience: true,
  avatar: true,
  studioName: true,
  slug: true,
  status: true,
  isVerified: true,
  instagram: true,
  website: true,
  pinterest: true,
  tiktok: true,
  facebook: true,
  brandColor: true,
  bannerImage: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: PUBLIC_USER_SELECT,
  },
} as const;

export function sanitizePublicUser<T extends Record<string, any> | null | undefined>(user: T) {
  if (!user || typeof user !== "object") return user;
  return {
    id: user.id,
    name: user.name ?? null,
    image:
      typeof user.image === "string" && user.image.length <= 300000
        ? user.image
        : null,
  };
}

export function sanitizePublicArtisan<T extends Record<string, any> | null | undefined>(artisan: T) {
  if (!artisan || typeof artisan !== "object") return artisan;
  const {
    phoneNumber: _phoneNumber,
    pickupAddress: _pickupAddress,
    pickupCity: _pickupCity,
    pickupDistrict: _pickupDistrict,
    pickupBuilding: _pickupBuilding,
    pickupNotes: _pickupNotes,
    payoutMethod: _payoutMethod,
    payoutAddress: _payoutAddress,
    payoutName: _payoutName,
    commissionRate: _commissionRate,
    rejectionReason: _rejectionReason,
    termsAcceptedAt: _termsAcceptedAt,
    termsVersion: _termsVersion,
    ...publicFields
  } = artisan as Record<string, any>;

  return {
    ...publicFields,
    avatar:
      typeof publicFields.avatar === "string" && publicFields.avatar.length <= 300000
        ? publicFields.avatar
        : null,
    bannerImage:
      typeof publicFields.bannerImage === "string" && publicFields.bannerImage.length <= 300000
        ? publicFields.bannerImage
        : null,
    user: publicFields.user ? sanitizePublicUser(publicFields.user) : undefined,
  };
}

export function sanitizePublicProduct<T extends Record<string, any> | null | undefined>(product: T) {
  if (!product || typeof product !== "object") return product;
  const p = product as Record<string, any>;
  return {
    ...p,
    images: Array.isArray(p.images)
      ? p.images.map((img: string) => ((img?.length || 0) > 300000 ? "" : img))
      : [],
    variants: Array.isArray(p.variants)
      ? p.variants.map((v: any) => ({
          ...v,
          image: typeof v?.image === "string" && v.image.length > 300000 ? null : v?.image ?? null,
        }))
      : p.variants,
    artisan: p.artisan ? sanitizePublicArtisan(p.artisan) : p.artisan,
    reviews: Array.isArray(p.reviews)
      ? p.reviews.map((r: any) => ({
          ...r,
          user: r?.user ? sanitizePublicUser(r.user) : r?.user,
        }))
      : p.reviews,
  };
}
