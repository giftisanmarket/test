"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signIn, auth } from "@/auth";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { AuthError, CredentialsSignin } from "next-auth";
import { slugify, stripEmojis } from "@/lib/utils";
import cloudinary from "@/lib/cloudinary";
import sharp from "sharp";
import { sendWelcomeEmail, sendOrderNotification, sendMessageNotification, sendVerificationEmail, sendOrderStatusUpdateEmail, sendPasswordResetEmail, sendInquiryNotification, sendArtisanApprovalEmail, sendArtisanOutreachEmail, sendCustomEmail, sendProductStatusUpdateEmail, sendPayoutRequestEmail, sendPayoutApprovedEmail, sendPayoutDeclinedEmail, sendRefundRequestSubmittedEmail, sendRefundResolvedEmail, sendAbandonedCheckoutNotification, sendBuyerOrderReceiptEmail } from "@/lib/mail";
import { generateVerificationToken, generatePasswordResetToken } from "@/lib/tokens";
import { cookies, headers } from "next/headers";
import { createPaymobIntention, PAYMOB_PUBLIC_KEY } from "@/lib/paymob";
import { IS_CHAT_LOCKED, MIN_PAYOUT_AMOUNT } from "@/lib/constants";
import { matchEgyptGovernorate } from "@/lib/egypt-governorates";
import {
  ARTISAN_AGREEMENT_VERSION,
  isArtisanAgreementLanguage,
} from "@/lib/artisan-agreement";
import { getEffectiveArtisanCommissionRate } from "@/lib/commission";
import {
  recordArtisanOrderLedgerInTx,
  clearEligibleArtisanEscrow,
  processOrderCancellationInTx,
  processOrderRefundInTx,
} from "@/lib/services/order-service";
import {
  signOrderAccessToken,
  signDeliveryVerifyToken,
} from "@/lib/security";
import {
  PUBLIC_USER_SELECT,
  sanitizePublicArtisan,
  sanitizePublicProduct,
} from "@/lib/public-selects";

export async function revalidateCatalog(slug?: string) {
  try {
    revalidatePath("/", "layout");
    if (slug) {
      revalidatePath(`/en/products/${slug}`);
      revalidatePath(`/ar/products/${slug}`);
    }
  } catch (err) {
    console.error("Revalidation error:", err);
  }
}
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";
import {
  signUp as _signUp,
  login as _login,
  resendVerificationEmailAction as _resendVerificationEmailAction,
  getUserInfo as _getUserInfo,
  sendPasswordResetEmailAction as _sendPasswordResetEmailAction,
  resetPasswordAction as _resetPasswordAction,
  deleteAccountAction as _deleteAccountAction,
  convertGuestToAccount as _convertGuestToAccount,
} from "./actions/auth-actions";

import {
  shipOrderWithBosta as _shipOrderWithBosta,
  getBostaAWBAction as _getBostaAWBAction,
} from "./actions/shipping-actions";

import {
  submitInquiry as _submitInquiry,
  submitConciergeArtisanLead as _submitConciergeArtisanLead,
  sendOutreachAction as _sendOutreachAction,
  subscribeToNewsletter as _subscribeToNewsletter,
} from "./actions/inquiry-actions";

export async function signUp(formData: any, role: "CLIENT" | "ARTISAN") {
  return _signUp(formData, role);
}

export async function login(formData: any) {
  return _login(formData);
}

export async function resendVerificationEmailAction(email: string) {
  return _resendVerificationEmailAction(email);
}

export async function getUserInfo(userId: string) {
  return _getUserInfo(userId);
}

export async function sendPasswordResetEmailAction(email: string) {
  return _sendPasswordResetEmailAction(email);
}

export async function resetPasswordAction(token: string, password: any) {
  return _resetPasswordAction(token, password);
}

export async function deleteAccountAction(userId: string) {
  return _deleteAccountAction(userId);
}

export async function convertGuestToAccount(params: { orderId: string; password: string; accessToken?: string }) {
  return _convertGuestToAccount(params);
}

export async function shipOrderWithBosta(orderId: string) {
  return _shipOrderWithBosta(orderId);
}

export async function getBostaAWBAction(deliveryIdOrTracking: string) {
  return _getBostaAWBAction(deliveryIdOrTracking);
}

export async function submitInquiry(data: { name: string; email: string; message: string }) {
  return _submitInquiry(data);
}

export async function submitConciergeArtisanLead(data: {
  artisanName: string;
  contactNumber: string;
  instagramOrLink?: string;
  craftCategory?: string;
  notes?: string;
}) {
  return _submitConciergeArtisanLead(data);
}

export async function sendOutreachAction(data: { name: string; email: string; product: string; subject: string; lang: 'ar' | 'en' }) {
  return _sendOutreachAction(data);
}

export async function subscribeToNewsletter(email: string) {
  return _subscribeToNewsletter(email);
}

export async function uploadImage(base64Data: string, skipWebPConversion = true) {
  try {
    if (!base64Data || typeof base64Data !== "string") {
      return { success: false, error: "Invalid media payload" };
    }

    if (base64Data.startsWith("http://") || base64Data.startsWith("https://")) {
      if (base64Data.startsWith("https://res.cloudinary.com/")) {
        return { success: true, url: base64Data };
      }
      return { success: false, error: "External media URLs are not allowed" };
    }

    if (base64Data.length > 16_000_000) {
      return { success: false, error: "Media file exceeds maximum allowed size (12 MB)" };
    }

    const ip = await getClientIp();
    const rate = checkRateLimit(`upload:${ip}`, 25, 60_000);
    if (!rate.success) {
      return { success: false, error: "Too many uploads. Please wait a minute." };
    }

    const session = await auth();
    const resourceType: "image" | "auto" =
      session?.user?.role === "ADMIN" || session?.user?.role === "ARTISAN" ? "auto" : "image";

    if (resourceType === "image" && !base64Data.startsWith("data:image/")) {
      return { success: false, error: "Only image uploads are allowed" };
    }

    let uploadPayload: string | Buffer = base64Data;
    let isBuffer = false;

    // Convert to WebP if it's an image and NOT already WebP
    if (!skipWebPConversion && base64Data.startsWith("data:image/") && !base64Data.startsWith("data:image/webp") && !base64Data.includes("svg+xml")) {
      try {
        const base64Image = base64Data.split(";base64,").pop();
        if (base64Image) {
          const buffer = Buffer.from(base64Image, "base64");
          uploadPayload = await sharp(buffer)
            .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer();
          isBuffer = true;
          console.log(`[Image Optimization] Processed image (Buffer size: ${uploadPayload.length})`);
        }
      } catch (sharpError) {
        console.error("Sharp conversion error, falling back to original base64:", sharpError);
      }
    }

    // Use upload_stream for Buffers or large strings to be more reliable
    if (isBuffer || (typeof uploadPayload === "string" && uploadPayload.length > 50000)) {
      const bufferToUpload = isBuffer ? (uploadPayload as Buffer) : Buffer.from((uploadPayload as string).split(";base64,").pop() || "", "base64");
      
      const uploadResponse = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "giftisan",
            resource_type: resourceType,
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary stream error:", error);
              reject(error);
            } else resolve(result);
          }
        );
        uploadStream.end(bufferToUpload);
      });
      return { success: true, url: uploadResponse.secure_url };
    }

    // Standard upload for small strings or fallback
    const uploadResponse = await cloudinary.uploader.upload(uploadPayload as string, {
      folder: "giftisan",
      resource_type: resourceType,
    });
    return { success: true, url: uploadResponse.secure_url };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return { success: false, error: "Failed to upload media" };
  }
}

export async function getCloudinaryUploadSignature() {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }
    const timestamp = Math.round(Date.now() / 1000);
    const folder = "giftisan";
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    if (!apiSecret || !apiKey || !cloudName) {
      return { success: false, error: "Cloudinary credentials not configured" };
    }

    const signature = cloudinary.utils.api_sign_request(
      { folder, timestamp },
      apiSecret
    );

    return {
      success: true,
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
    };
  } catch (error: any) {
    console.error("Error generating Cloudinary upload signature:", error);
    return { success: false, error: error?.message || "Failed to generate signature" };
  }
}

async function processImage(imageSource: string | null | undefined, skipWebPConversion = true): Promise<string | null> {
  if (!imageSource) return null;
  // Upload any data URL (image, video, etc.)
  if (imageSource.startsWith('data:')) {
    try {
      const res = await uploadImage(imageSource, skipWebPConversion);
      if (res.success && res.url) return res.url;
    } catch (err) {
      console.error("Cloudinary upload failed:", err);
    }
    
    // Fallback for offline local development testing:
    // If we are in dev, fallback to saving the base64 string (client-side compression keeps it <50KB)
    if (process.env.NODE_ENV !== "production") {
      console.log("[DEV] Local dev detected. Falling back to compressed base64 string.");
      return imageSource;
    }
    
    console.error("Failed to upload base64 image to Cloudinary, discarding to prevent DB bloat");
    return null;
  }
  return imageSource;
}


const SEARCH_SYNONYMS: Record<string, { categories?: string[]; subcategories?: string[]; custom?: boolean; extraKeywords?: string[] }> = {
  // Bags
  "شنط": { categories: ["bags-and-purses"], subcategories: ["handbags", "totes", "pouches-coin-purses"] },
  "شنطة": { categories: ["bags-and-purses"], subcategories: ["handbags", "totes", "pouches-coin-purses"] },
  "شنط يد": { categories: ["bags-and-purses"], subcategories: ["handbags"] },
  "حقائب": { categories: ["bags-and-purses"] },
  "حقيبة": { categories: ["bags-and-purses"] },
  "توت باج": { subcategories: ["totes"], extraKeywords: ["tote"] },
  "tote": { subcategories: ["totes"] },
  "totes": { subcategories: ["totes"] },
  "tote bags": { subcategories: ["totes"] },
  "bags": { categories: ["bags-and-purses"] },
  "bag": { categories: ["bags-and-purses"] },
  "handbag": { categories: ["bags-and-purses"], subcategories: ["handbags"] },
  "handbags": { categories: ["bags-and-purses"], subcategories: ["handbags"] },

  // Home Decor
  "ديكور": { categories: ["home-and-living"], subcategories: ["home-decor"] },
  "ديكور المنزل": { categories: ["home-and-living"], subcategories: ["home-decor"] },
  "decor": { categories: ["home-and-living"], subcategories: ["home-decor"] },
  "home decor": { categories: ["home-and-living"], subcategories: ["home-decor"] },

  // Lighting
  "إضاءة": { subcategories: ["lighting"], extraKeywords: ["اباجورة", "أباجورة", "اباجوره", "lamp"] },
  "اضاءة": { subcategories: ["lighting"], extraKeywords: ["اباجورة", "أباجورة", "اباجوره", "lamp"] },
  "أباجورات": { subcategories: ["lighting"], extraKeywords: ["اباجورة", "أباجورة"] },
  "اباجورات": { subcategories: ["lighting"], extraKeywords: ["اباجورة", "أباجورة"] },
  "أباجورات وإضاءة": { subcategories: ["lighting"], extraKeywords: ["اباجورة", "أباجورة", "اضاءة"] },
  "lighting": { subcategories: ["lighting"] },
  "lamps": { subcategories: ["lighting"] },
  "lamps & lighting": { subcategories: ["lighting"] },

  // Personalized & Gifts
  "هدايا بالاسم": { custom: true, categories: ["gifts-sets"], extraKeywords: ["بإسم", "باسم", "حرف"] },
  "هدايا": { categories: ["gifts-sets", "gifts-mementos"] },
  "هدية": { categories: ["gifts-sets", "gifts-mementos"] },
  "personalized": { custom: true, categories: ["gifts-sets"] },
  "personalized gifts": { custom: true, categories: ["gifts-sets"] },

  // Jewelry
  "مجوهرات": { categories: ["jewelry"] },
  "مجوهرات يدوية": { categories: ["jewelry"], extraKeywords: ["pearl", "عقد", "سلسلة", "اسورة"] },
  "jewelry": { categories: ["jewelry"] },
  "handmade jewelry": { categories: ["jewelry"] },

  // Accessories
  "إكسسوارات": { categories: ["accessories"] },
  "اكسسوارات": { categories: ["accessories"] },
  "accessories": { categories: ["accessories"] },

  // Crochet
  "كروشيه": { extraKeywords: ["crochet"] },
  "crochet": { extraKeywords: ["كروشيه"] },

  // Toys & Dolls
  "دمى": { categories: ["toys-and-games"], subcategories: ["dolls-and-miniatures"] },
  "ألعاب": { categories: ["toys-and-games"] },
  "العاب": { categories: ["toys-and-games"] },
  "dolls": { subcategories: ["dolls-and-miniatures"] },
  "toys": { categories: ["toys-and-games"] },

  // Ceramics
  "سيراميك": { categories: ["ceramics"] },
  "خزف": { categories: ["ceramics"] },
  "ceramics": { categories: ["ceramics"] },

  // Seasonal: Halloween & Fall
  "halloween": { categories: ["art-and-collectibles", "clothing", "accessories", "home-and-living"] },
  "هالوين": { categories: ["art-and-collectibles", "clothing", "accessories", "home-and-living"] },
  "fall": { categories: ["home-and-living", "clothing", "accessories"] },
  "خريف": { categories: ["home-and-living", "clothing", "accessories"] }
};

export async function searchProducts(query: string) {
  try {
    const q = (query || "").trim();

    if (!q) {
      return await prisma.product.findMany({
        where: {
          status: "APPROVED",
          artisan: {
            status: "APPROVED"
          }
        },
        include: {
          artisan: {
            include: {
              user: true
            }
          },
          reviews: true,
          variants: true
        },
        orderBy: {
          createdAt: "desc"
        }
      });
    }

    const normalizedQ = q.toLowerCase();
    const orConditions: any[] = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
      { subcategory: { contains: q, mode: "insensitive" } },
      {
        artisan: {
          studioName: { contains: q, mode: "insensitive" },
        }
      }
    ];

    // Arabic letter normalizations (alif, taa marbouta, yaa)
    const normalizedArabic = q
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي");

    if (normalizedArabic !== q) {
      orConditions.push(
        { name: { contains: normalizedArabic, mode: "insensitive" } },
        { description: { contains: normalizedArabic, mode: "insensitive" } }
      );
    }

    // Synonym, category & subcategory resolution
    for (const [key, mapping] of Object.entries(SEARCH_SYNONYMS)) {
      if (normalizedQ === key || normalizedQ.includes(key) || key.includes(normalizedQ)) {
        if (mapping.categories?.length) {
          orConditions.push({ category: { in: mapping.categories } });
        }
        if (mapping.subcategories?.length) {
          orConditions.push({ subcategory: { in: mapping.subcategories } });
        }
        if (mapping.custom) {
          orConditions.push({ canPersonalize: true });
        }
        if (mapping.extraKeywords?.length) {
          for (const kw of mapping.extraKeywords) {
            orConditions.push({ name: { contains: kw, mode: "insensitive" } });
            orConditions.push({ description: { contains: kw, mode: "insensitive" } });
          }
        }
      }
    }

    let products;
    try {
      products = await prisma.product.findMany({
        where: {
          status: "APPROVED",
          artisan: {
            status: "APPROVED"
          },
          OR: orConditions
        },
        include: {
          artisan: {
            include: {
              user: true
            }
          },
          reviews: true,
          variants: true
        },
        orderBy: {
          createdAt: "desc"
        }
      });
    } catch (dbErr: any) {
      if (dbErr?.message?.includes("subcategory")) {
        const fallbackOr = orConditions.filter((c: any) => !("subcategory" in c));
        products = await prisma.product.findMany({
          where: {
            status: "APPROVED",
            artisan: {
              status: "APPROVED"
            },
            OR: fallbackOr
          },
          include: {
            artisan: {
              include: {
                user: true
              }
            },
            reviews: true,
            variants: true
          },
          orderBy: {
            createdAt: "desc"
          }
        });
      } else {
        throw dbErr;
      }
    }

    return products.map((p) => sanitizePublicProduct(p));
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

export async function getProductsByCategory(category: string) {
  if (!category) return [];

  // Map URL category slug back to official database name
  const categoryNames = [
    "Ceramics", "Jewelry", "Gift Boxes & Sets", "Stationery", "Vintage", "Textiles", 
    "Woodwork", "Leatherwork", "Culinary Arts", "Beauty & Apothecary", "Metalwork",
    "Glasswork", "Basketry", "Fashion",
    "Wedding", "Personalized", "Art & Collectibles"
  ];

  const matchedName = categoryNames.find(name => {
    const slug1 = name.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-");
    const slug2 = name.toLowerCase().replace(/\s+/g, "-");
    const slug3 = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    return slug1 === category.toLowerCase() || slug2 === category.toLowerCase() || slug3 === category.toLowerCase();
  }) || category;

  // Etsy Department to Craft Category Mapping
  const departmentSubcategoryMap: Record<string, string[]> = {
    "accessories": [
      "Accessories", "Adornments", "Jewelry & Accessories",
      "Hair Accessories", "Hats & Headwear", "Patches & Appliqués", "Keychains & Lanyards",
      "Scarves & Wraps", "Belts & Suspenders", "Pins & Clips", "Gloves & Sleeves",
      "Costume Accessories", "Sunglasses & Eyewear", "Bouquets & Corsages", "Aprons",
      "Suit & Tie Accessories", "Umbrellas & Rain Accessories", "Face Masks & Accessories",
      "Hand Fans", "Collars"
    ],
    "art-and-collectibles": [
      "Art & Collectibles", "Fine Art", "Prints", "Painting", "Paintings",
      "Sculpture", "Sculptures", "Collectibles", "Glass Art", "Fine Art Ceramics",
      "Photography", "Drawing & Illustration", "Dolls & Miniatures", "Fiber Arts",
      "Mixed Media & Collage", "Artist Trading Cards", "Vintage", "Antiques"
    ],
    "art-collectibles": [
      "Art & Collectibles", "Fine Art", "Prints", "Painting", "Paintings",
      "Sculpture", "Sculptures", "Collectibles", "Glass Art", "Fine Art Ceramics",
      "Photography", "Drawing & Illustration", "Dolls & Miniatures", "Fiber Arts",
      "Mixed Media & Collage", "Artist Trading Cards", "Vintage", "Antiques"
    ],
    "bags-and-purses": [
      "Bags & Purses", "Leatherwork", "Handbags", "Totes", "Backpacks",
      "Wallets & Money Clips", "Pouches & Coin Purses", "Cosmetic & Toiletry Storage",
      "Luggage & Travel", "Fanny Packs", "Messenger Bags", "Market Bags",
      "Accessory Cases", "Food & Insulated Bags", "Clothing & Shoe Bags",
      "Diaper Bags", "Sports Bags"
    ],
    "bags-purses": [
      "Bags & Purses", "Leatherwork", "Handbags", "Totes", "Backpacks",
      "Wallets & Money Clips", "Pouches & Coin Purses", "Cosmetic & Toiletry Storage",
      "Luggage & Travel", "Fanny Packs", "Messenger Bags", "Market Bags",
      "Accessory Cases", "Food & Insulated Bags", "Clothing & Shoe Bags",
      "Diaper Bags", "Sports Bags"
    ],
    "bath-and-beauty": [
      "Bath & Beauty", "Beauty & Apothecary", "Bath & Apothecary",
      "Spa & Relaxation", "Fragrances", "Skin Care", "Bath Accessories",
      "Makeup & Cosmetics", "Soaps", "Personal Care", "Hair Care",
      "Cosmetic & Toiletry Storage", "Baby & Child Care", "Essential Oils"
    ],
    "bath-beauty": [
      "Bath & Beauty", "Beauty & Apothecary", "Bath & Apothecary",
      "Spa & Relaxation", "Fragrances", "Skin Care", "Bath Accessories",
      "Makeup & Cosmetics", "Soaps", "Personal Care", "Hair Care",
      "Cosmetic & Toiletry Storage", "Baby & Child Care", "Essential Oils"
    ],
    "beauty-apothecary": [
      "Bath & Beauty", "Beauty & Apothecary", "Bath & Apothecary",
      "Spa & Relaxation", "Fragrances", "Skin Care", "Bath Accessories",
      "Makeup & Cosmetics", "Soaps", "Personal Care", "Hair Care",
      "Cosmetic & Toiletry Storage", "Baby & Child Care", "Essential Oils"
    ],
    "books-movies-and-music": [
      "Books, Movies & Music", "Books", "Movies", "Music", "Video Cases & Tins",
      "Journals"
    ],
    "clothing": [
      "Clothing", "Fashion", "Apparel", "Women's Clothing", "Men's Clothing",
      "Boys' Clothing", "Girls' Clothing", "Gender-Neutral Adult Clothing",
      "Gender-Neutral Kids' Clothing", "Dresses", "Robes"
    ],
    "clothing-shoes": [
      "Clothing", "Shoes", "Fashion", "Women's Clothing", "Men's Clothing",
      "Boys' Clothing", "Girls' Clothing", "Gender-Neutral Adult Clothing",
      "Gender-Neutral Kids' Clothing", "Leatherwork", "Accessories"
    ],
    "craft-supplies-and-tools": [
      "Craft Supplies & Tools", "Craft Supplies", "Raw Materials",
      "Home & Hobby", "Sewing & Fiber", "Jewelry & Beauty", "Visual Arts",
      "Paper, Party & Kids", "Sculpting & Forming", "Beads", "Yarn"
    ],
    "craft-supplies": [
      "Craft Supplies & Tools", "Craft Supplies", "Raw Materials",
      "Home & Hobby", "Sewing & Fiber", "Jewelry & Beauty", "Visual Arts",
      "Paper, Party & Kids", "Sculpting & Forming", "Beads", "Yarn"
    ],
    "electronics-and-accessories": [
      "Electronics & Accessories", "Tech Accessories", "Computers & Peripherals",
      "Video Games", "Gadgets", "Car Parts & Accessories", "Cameras & Equipment",
      "Telephones & Handsets", "Docking & Stands", "Cell Phone Accessories",
      "DIY Kits", "Electronics Cases", "Audio", "Decals & Skins", "TV & Projection",
      "Cables & Cords", "Batteries & Charging", "Parts & Electrical", "Maker Supplies",
      "Phone Cases"
    ],
    "gifts": ["Gifts", "Gift Boxes & Sets", "Gifts & Sets", "Personalized"],
    "gifts-sets": ["Gifts", "Gift Boxes & Sets", "Gifts & Sets", "Personalized"],
    "gift-boxes-sets": ["Gifts", "Gift Boxes & Sets", "Gifts & Sets", "Personalized"],
    "home-and-living": [
      "Home & Living", "Home Decor", "Lighting", "Floor & Rugs", "Kitchen & Dining",
      "Furniture", "Bathroom", "Storage & Organization", "Outdoor & Gardening",
      "Curtains & Window Treatments", "Bedding", "Office", "Food & Drink",
      "Spirituality & Religion", "Home Improvement", "Home Appliances", "Cleaning Supplies",
      "Ceramics", "Woodwork", "Textiles", "Metalwork", "Glasswork", "Basketry"
    ],
    "home-living": [
      "Home & Living", "Home Decor", "Lighting", "Floor & Rugs", "Kitchen & Dining",
      "Furniture", "Bathroom", "Storage & Organization", "Outdoor & Gardening",
      "Curtains & Window Treatments", "Bedding", "Office", "Food & Drink",
      "Spirituality & Religion", "Home Improvement", "Home Appliances", "Cleaning Supplies",
      "Ceramics", "Woodwork", "Textiles", "Metalwork", "Glasswork", "Basketry"
    ],
    "jewelry": [
      "Jewelry", "Jewelry & Accessories", "Adornments", "Earrings", "Necklaces",
      "Rings", "Bracelets", "Watches", "Jewelry Sets", "Body Jewelry",
      "Cremation & Memorial Jewelry", "Jewelry Storage", "Brooches, Pins & Clips",
      "Smart Jewelry", "Cuff Links & Tie Clips"
    ],
    "kids-and-baby": [
      "Kids & Baby", "Baby", "Nursery", "Kids Clothing", "Baby Gift Sets",
      "Nursery Decor", "Toys", "Baby Blankets", "Baby Clothing", "Kids' Furniture",
      "Games & Puzzles", "Children's Books", "Girls' Clothing", "Baby Care",
      "Boys' Clothing"
    ],
    "kids-baby": [
      "Kids & Baby", "Baby", "Nursery", "Kids Clothing", "Baby Gift Sets",
      "Nursery Decor", "Toys", "Baby Blankets", "Baby Clothing", "Kids' Furniture",
      "Games & Puzzles", "Children's Books", "Girls' Clothing", "Baby Care",
      "Boys' Clothing"
    ],
    "paper-and-party-supplies": [
      "Paper & Party Supplies", "Stationery & Paper", "Party Supplies", "Paper",
      "Stationery", "Cards"
    ],
    "stationery-paper": [
      "Paper & Party Supplies", "Stationery & Paper", "Party Supplies", "Paper",
      "Stationery", "Cards"
    ],
    "stationery": [
      "Paper & Party Supplies", "Stationery & Paper", "Party Supplies", "Paper",
      "Stationery", "Cards"
    ],
    "pet-supplies": [
      "Pet Supplies", "Pet Accessories", "Collars", "Pet Collars & Leashes",
      "Pet Gates & Fences", "Pet Bedding", "Pet Furniture",
      "Pet Clothing, Accessories & Shoes", "Pet Toys", "Pet Storage",
      "Urns & Memorials", "Pet Feeding", "Riding & Farm Animals",
      "Pet Carriers & Houses", "Pet Health & Wellness", "Beekeeping", "Training"
    ],
    "shoes": [
      "Shoes", "Footwear", "Women's Shoes", "Men's Shoes", "Girls' Shoes",
      "Insoles & Accessories", "Boys' Shoes", "Leather Shoes", "Slippers", "Sandals"
    ],
    "toys-and-games": [
      "Toys & Games", "Games & Puzzles", "Toys", "Sports & Outdoor Recreation",
      "Wooden Toys", "Puzzles"
    ],
    "weddings": [
      "Weddings", "Weddings & Celebrations", "Wedding", "Bridal", "Gifts & Mementos",
      "Decorations", "Accessories", "Clothing", "Jewelry", "Invitations & Paper", "Shoes"
    ],
    "wedding": [
      "Weddings", "Weddings & Celebrations", "Wedding", "Bridal", "Gifts & Mementos",
      "Decorations", "Accessories", "Clothing", "Jewelry", "Invitations & Paper", "Shoes"
    ],
    "vintage": ["Vintage & Heritage", "Vintage", "Antiques"],
    "vintage-heritage": ["Vintage & Heritage", "Vintage", "Antiques"],
    "fashion-leather": ["Clothing", "Bags & Purses", "Fashion", "Leatherwork"]
  };

  const normalizedCategory = category.toLowerCase().trim();

  // If this is the curated Gifts Hub, fetch approved marketplace products to showcase all giftable crafts
  if (normalizedCategory === "gifts" || normalizedCategory === "gift") {
    try {
      const products = await prisma.product.findMany({
        where: {
          status: "APPROVED",
          artisan: {
            status: "APPROVED"
          }
        },
        include: {
          artisan: {
            include: {
              user: true
            }
          },
          reviews: true,
          variants: true
        },
        orderBy: [
          { views: "desc" },
          { createdAt: "desc" }
        ],
        take: 80
      });
      return products.map((p) => sanitizePublicProduct(p));
    } catch (error) {
      console.error("Gifts fetch error:", error);
      return [];
    }
  }

  const subcategories = departmentSubcategoryMap[normalizedCategory] || [];

  // Generate all possible variations of the category string formats stored in the DB (e.g. "Gift Boxes & Sets", "gift-boxes-sets", "gift-boxes-&-sets", "gift boxes & sets")
  const baseTargets = [category, matchedName, ...subcategories];
  const variations = Array.from(new Set(
    baseTargets.flatMap(target => [
      target,
      target.toLowerCase(),
      target.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-"),
      target.toLowerCase().replace(/\s+/g, "-"),
      target.toLowerCase().replace(/ & /g, " ").replace(/ /g, " "),
      target.replace(/ & /g, " & ").replace(/  +/g, " ")
    ])
  ));

  try {
    const products = await prisma.product.findMany({
      where: {
        category: {
          in: variations,
          mode: "insensitive"
        },
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        }
      },
      include: {
        artisan: {
          include: {
            user: true
          }
        },
        reviews: true,
        variants: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return products.map((p) => sanitizePublicProduct(p));
  } catch (error) {
    console.error("Fetch error:", error);
    return [];
  }
}

export async function getFeaturedProducts() {
  try {
    const getCachedFeatured = unstable_cache(
      async () => {
        const items = await prisma.product.findMany({
          where: {
            status: "APPROVED",
            artisan: {
              status: "APPROVED"
            }
          },
          take: 8,
          include: {
            artisan: {
              include: {
                user: true
              }
            },
            reviews: true,
            variants: true
          },
          orderBy: [
            { isFeatured: "desc" },
            { createdAt: "desc" }
          ]
        });
        return items.map((p) => sanitizePublicProduct(p));
      },
      ["featured-products-cache-key-v2"],
      { revalidate: 300, tags: ["featured-products", "products"] }
    );
    return await getCachedFeatured();
  } catch (error) {
    console.error("Get featured products error:", error);
    return [];
  }
}

export async function getAllProducts() {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        }
      },
      include: {
        artisan: {
          include: {
            user: true
          }
        },
        reviews: true,
        variants: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    return products.map((p) => sanitizePublicProduct(p));
  } catch (error) {
    console.error("Get all products error:", error);
    return [];
  }
}

export async function getProductBySlug(slug: string) {
  try {
    const product = await prisma.product.findUnique({
      where: {
        slug
      },
      include: {
        artisan: {
          include: {
            user: true
          }
        },
        variants: true,
        reviews: {
          include: {
            user: true
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    // Check if product exists
    if (!product) return null;

    const isPublic = product.status === "APPROVED";
    const isArtisanPublic = product.artisan.status === "APPROVED";

    if (!isPublic || !isArtisanPublic) {
      const session = await auth();
      const isAdmin = session?.user?.role === "ADMIN";
      const isOwner = session?.user?.id === product.artisan.userId;

      if (!isAdmin && !isOwner) {
        return null;
      }
    }

    return sanitizePublicProduct(product);
  } catch (error) {
    console.error("Get product by slug error:", error);
    return null;
  }
}


export async function toggleFavoriteAction(productId: string, userId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.id !== userId && session.user.role !== "ADMIN")) {
      return { error: "Unauthorized" };
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId,
          productId
        }
      }
    });

    if (existing) {
      await prisma.favorite.delete({
        where: {
          id: existing.id
        }
      });
      return { success: true, action: "removed" };
    } else {
      await prisma.favorite.create({
        data: {
          userId,
          productId
        }
      });
      return { success: true, action: "added" };
    }
  } catch (error) {
    console.error("Toggle favorite error:", error);
    return { error: "Failed to update favorite" };
  }
}

export async function getUserFavorites(userId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.id !== userId && session.user.role !== "ADMIN")) {
      return [];
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            artisan: {
              include: {
                user: true
              }
            },
            variants: true
          }
        }
      }
    });
    return favorites
      .filter(f => f.product && f.product.status === "APPROVED" && f.product.artisan?.status === "APPROVED")
      .map(f => sanitizePublicProduct(f.product));
  } catch (error) {
    console.error("Get favorites error:", error);
    return [];
  }
}

export async function getProductsByIds(ids: string[]) {
  if (!ids || ids.length === 0) return [];
  try {
    const safeIds = ids.slice(0, 100);
    const products = await prisma.product.findMany({
      where: {
        id: { in: safeIds },
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        }
      },
      include: {
        artisan: {
          include: {
            user: true
          }
        },
        variants: true
      }
    });
    return products.map(p => sanitizePublicProduct(p));
  } catch (error) {
    console.error("Get products by IDs error:", error);
    return [];
  }
}

function roundCurrency(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export async function createOrder(
  _clientUserId: string | null,
  _clientTotalAmount: number,
  items: any[],
  shippingData?: any
) {
  try {
    const ip = await getClientIp();
    const rate = checkRateLimit(`checkout:${ip}`, 15, 60_000);
    if (!rate.success) {
      return { error: "Too many checkout attempts. Please wait a minute and try again." };
    }

    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return { error: "Your cart is empty or invalid." };
    }

    const buyerEmail = String(shippingData?.email || "").trim().toLowerCase();
    const buyerPhone = String(shippingData?.phone || "").trim();
    const buyerAddress = String(shippingData?.address || "").trim();
    const buyerCity = String(shippingData?.city || "").trim();

    if (!buyerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) {
      return { error: "A valid email address is required." };
    }
    if (!buyerPhone || buyerPhone.replace(/[^0-9]/g, "").length < 8) {
      return { error: "A valid phone number is required." };
    }
    if (!buyerAddress || !buyerCity) {
      return { error: "Complete shipping address and city are required." };
    }

    // 1. Validate item quantities and aggregate requested stock per SKU to block duplicate-row bypass
    const requestedVariantQty = new Map<string, number>();
    const requestedProductQty = new Map<string, number>();
    const productIds = new Set<string>();

    for (const rawItem of items) {
      const productId = typeof rawItem?.id === "string" ? rawItem.id.trim() : "";
      const qty = Number(rawItem?.quantity);
      if (!productId || !Number.isInteger(qty) || qty < 1 || qty > 999) {
        return { error: "Invalid item quantity in cart." };
      }
      productIds.add(productId);
      const variantId = typeof rawItem?.variantId === "string" && rawItem.variantId.trim() ? rawItem.variantId.trim() : null;
      if (variantId) {
        requestedVariantQty.set(variantId, (requestedVariantQty.get(variantId) || 0) + qty);
      } else {
        requestedProductQty.set(productId, (requestedProductQty.get(productId) || 0) + qty);
      }
    }

    // 2. Fetch authoritative products, variants, and artisan status from DB
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: Array.from(productIds) } },
      include: {
        variants: true,
        artisan: {
          select: {
            id: true,
            status: true,
            studioName: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });
    const dbProductMap = new Map(dbProducts.map((p) => [p.id, p]));

    const authoritativeItems = await Promise.all(
      items.map(async (rawItem) => {
        const productId = String(rawItem.id).trim();
        const quantity = Number(rawItem.quantity);
        const variantId =
          typeof rawItem?.variantId === "string" && rawItem.variantId.trim()
            ? rawItem.variantId.trim()
            : null;

        const product = dbProductMap.get(productId);
        if (!product || product.status !== "APPROVED" || product.artisan?.status !== "APPROVED") {
          throw new Error(
            `The item "${product?.name || rawItem?.name || "One of your items"}" is currently unavailable.`
          );
        }

        let unitPrice = roundCurrency(product.price);
        let variantName: string | null = null;
        let displayImage = product.images?.[0] || "";

        if (variantId) {
          // Verify variant strictly belongs to this product (blocks cross-product cheap variant substitution)
          const variant = product.variants.find((v) => v.id === variantId);
          if (!variant) {
            throw new Error(`Selected option for "${product.name}" is no longer valid.`);
          }
          const totalVariantNeeded = requestedVariantQty.get(variantId) || quantity;
          if (variant.stock < totalVariantNeeded) {
            throw new Error(
              `The variation "${variant.name}" of "${product.name}" just sold out! Please update your cart.`
            );
          }
          unitPrice = roundCurrency(variant.price);
          variantName = variant.name;
          if (variant.image) displayImage = variant.image;
        } else {
          const totalProductNeeded = requestedProductQty.get(productId) || quantity;
          if (product.stock < totalProductNeeded) {
            throw new Error(
              `The product "${product.name}" just sold out! Please remove it from your cart to proceed.`
            );
          }
        }

        const processedCustomImage = rawItem.customImage
          ? await processImage(rawItem.customImage)
          : null;

        return {
          id: product.id,
          variantId,
          variantName,
          name: product.name,
          description: product.description,
          artisanId: product.artisanId,
          artisan: product.artisan,
          quantity,
          price: unitPrice,
          image: displayImage,
          personalization:
            typeof rawItem.personalization === "string" && rawItem.personalization.trim()
              ? rawItem.personalization.trim().slice(0, 500)
              : null,
          processedCustomImage,
        };
      })
    );

    const serverSubtotal = roundCurrency(
      authoritativeItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    );

    // 3. Resolve authoritative ShippingMethod price from DB
    let shippingMethod = shippingData?.shippingMethodId
      ? await prisma.shippingMethod.findFirst({
          where: { id: String(shippingData.shippingMethodId), isActive: true },
        })
      : null;

    if (!shippingMethod) {
      shippingMethod = await prisma.shippingMethod.findFirst({
        where: { isActive: true },
        orderBy: { price: "asc" },
      });
    }

    const resolvedShippingMethodId = shippingMethod?.id || null;
    const serverShippingCost = roundCurrency(shippingMethod ? shippingMethod.price : 84);

    // 4. Recompute authoritative Coupon discount on the server
    let resolvedCouponId: string | null = null;
    let resolvedCouponCode: string | null = null;
    let serverDiscount = 0;

    const requestedCouponId =
      typeof shippingData?.couponId === "string" && shippingData.couponId.trim()
        ? shippingData.couponId.trim()
        : null;
    const requestedCouponCode =
      typeof shippingData?.couponCode === "string" && shippingData.couponCode.trim()
        ? shippingData.couponCode.trim().toUpperCase()
        : null;

    if (requestedCouponId || requestedCouponCode) {
      const coupon = requestedCouponId
        ? await prisma.coupon.findUnique({ where: { id: requestedCouponId } })
        : await prisma.coupon.findUnique({ where: { code: requestedCouponCode! } });

      if (!coupon) throw new Error("The coupon code used for this order is invalid.");
      if (!coupon.isActive) throw new Error("The coupon code used for this order is no longer active.");
      if (coupon.expiresAt && new Date() > coupon.expiresAt) {
        throw new Error("The coupon code used for this order has expired.");
      }
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        throw new Error("This coupon has just reached its maximum usage limit!");
      }

      let discountableSubtotal = serverSubtotal;
      if (coupon.artisanId) {
        const eligibleItems = authoritativeItems.filter(
          (item) => item.artisanId === coupon.artisanId
        );
        if (eligibleItems.length === 0) {
          throw new Error("This coupon does not apply to the items in your cart.");
        }
        discountableSubtotal = roundCurrency(
          eligibleItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
        );
      }

      if (coupon.minOrderAmount && discountableSubtotal < coupon.minOrderAmount) {
        throw new Error(
          `This coupon requires a minimum eligible subtotal of EGP ${coupon.minOrderAmount}.`
        );
      }

      let rawDiscount = 0;
      if (coupon.discountType === "PERCENTAGE") {
        rawDiscount = discountableSubtotal * (coupon.discountValue / 100);
        if (coupon.maxDiscount && rawDiscount > coupon.maxDiscount) {
          rawDiscount = coupon.maxDiscount;
        }
      } else if (coupon.discountType === "FIXED") {
        rawDiscount = coupon.discountValue;
      }

      serverDiscount = Math.min(roundCurrency(rawDiscount), discountableSubtotal);
      resolvedCouponId = coupon.id;
      resolvedCouponCode = coupon.code;
    }

    const serverTotalAmount = Math.max(
      0,
      roundCurrency(serverSubtotal - serverDiscount + serverShippingCost)
    );

    // 5. Derive buyer userId strictly from server session (or match guest email)
    const session = await auth();
    let effectiveUserId: string | null = session?.user?.id || null;
    if (!effectiveUserId && buyerEmail) {
      const existingUser = await prisma.user.findFirst({
        where: { email: { equals: buyerEmail, mode: "insensitive" } },
        select: { id: true },
      });
      if (existingUser) effectiveUserId = existingUser.id;
    }

    const firstName = String(shippingData?.firstName || "").trim();
    const lastName = String(shippingData?.lastName || "").trim();
    const customerName = `${firstName} ${lastName}`.trim() || buyerEmail.split("@")[0] || "Customer";

    const rawNotes = String(shippingData?.orderNotes || "").trim();
    const enrichedOrderNotes = [
      customerName && !/\[Customer:/i.test(rawNotes) ? `[Customer: ${customerName}]` : "",
      rawNotes,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const paymentMethod = shippingData?.paymentMethod === "cod" ? "cod" : "paymob";

    // ─── COD: Create order immediately with atomic stock guards ───────────────
    if (paymentMethod === "cod") {
      const codOrder = await prisma.$transaction(async (tx) => {
        // Conditional atomic stock decrements
        for (const [variantId, qty] of requestedVariantQty.entries()) {
          const updated = await tx.productVariant.updateMany({
            where: { id: variantId, stock: { gte: qty } },
            data: { stock: { decrement: qty } },
          });
          if (updated.count !== 1) {
            throw new Error("One of your selected variations just sold out! Please review your cart.");
          }
        }

        for (const [productId, qty] of requestedProductQty.entries()) {
          const updated = await tx.product.updateMany({
            where: { id: productId, stock: { gte: qty } },
            data: { stock: { decrement: qty } },
          });
          if (updated.count !== 1) {
            const pName = dbProductMap.get(productId)?.name || "One of your items";
            throw new Error(`The product "${pName}" just sold out! Please review your cart.`);
          }
        }

        if (resolvedCouponId) {
          const couponRow = await tx.coupon.findUnique({ where: { id: resolvedCouponId } });
          if (
            !couponRow ||
            !couponRow.isActive ||
            (couponRow.expiresAt && new Date() > couponRow.expiresAt) ||
            (couponRow.maxUses !== null && couponRow.usedCount >= couponRow.maxUses)
          ) {
            throw new Error("The promo code applied to this order is no longer available.");
          }
          await tx.coupon.update({
            where: { id: resolvedCouponId },
            data: { usedCount: { increment: 1 } },
          });
        }

        const newOrder = await tx.order.create({
          data: {
            userId: effectiveUserId,
            totalAmount: serverTotalAmount,
            status: "PROCESSING",
            shippingAddress: buyerAddress,
            shippingCity: buyerCity,
            shippingZip: shippingData?.zip ? String(shippingData.zip).trim() : null,
            shippingCountry: shippingData?.country ? String(shippingData.country).trim() : "Egypt",
            clientPhone: buyerPhone,
            clientEmail: buyerEmail,
            orderNotes: enrichedOrderNotes || null,
            isGift: Boolean(shippingData?.isGift),
            giftMessage:
              shippingData?.isGift && shippingData?.giftMessage
                ? String(shippingData.giftMessage).trim().slice(0, 1000)
                : null,
            couponId: resolvedCouponId,
            discountApplied: serverDiscount,
            shippingMethodId: resolvedShippingMethodId,
            shippingCost: serverShippingCost,
            items: {
              create: authoritativeItems.map((item) => ({
                productId: item.id,
                variantId: item.variantId,
                quantity: item.quantity,
                price: item.price,
                personalization: item.personalization,
                customImage: item.processedCustomImage,
              })),
            },
          },
        });

        await recordArtisanOrderLedgerInTx(tx, {
          orderId: newOrder.id,
          couponId: resolvedCouponId,
          discountApplied: serverDiscount,
          items: authoritativeItems.map((item) => ({
            productId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        });

        return newOrder;
      });

      // Non-blocking buyer receipt email
      try {
        const receiptItems = authoritativeItems.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        }));
        sendBuyerOrderReceiptEmail(
          buyerEmail,
          customerName,
          codOrder.id,
          serverTotalAmount,
          receiptItems,
          buyerCity || undefined
        ).catch((err) =>
          console.error(`Failed to send buyer COD receipt email to ${buyerEmail}:`, err)
        );
      } catch (err) {
        console.error("Failed to send buyer receipt email for COD order:", err);
      }

      // Non-blocking artisan order notification emails
      try {
        const artisanEarnings = new Map<string, { name: string; email: string; total: number }>();
        authoritativeItems.forEach((item) => {
          const artisan = item.artisan;
          if (artisan?.user?.email) {
            const current = artisanEarnings.get(artisan.user.email) || {
              name: artisan.user.name || artisan.studioName || "Artisan",
              email: artisan.user.email,
              total: 0,
            };
            current.total = roundCurrency(current.total + item.price * item.quantity);
            artisanEarnings.set(artisan.user.email, current);
          }
        });

        artisanEarnings.forEach((data) => {
          sendOrderNotification(data.email, data.name, codOrder.id, data.total).catch((err) =>
            console.error(`Failed to send artisan order notification to ${data.email}:`, err)
          );
        });
      } catch (err) {
        console.error("Failed to send artisan order notifications for COD order:", err);
      }

      return {
        success: true,
        orderId: codOrder.id,
        accessToken: signOrderAccessToken(codOrder.id, buyerEmail),
        paymentUrl: null,
      };
    }

    // ─── PAYMOB: Persist authoritative server-priced AbandonedCheckout ────────
    const createdLead = await prisma.abandonedCheckout.create({
      data: {
        customerName,
        customerEmail: buyerEmail,
        customerPhone: buyerPhone,
        shippingAddress: buyerAddress,
        shippingCity: buyerCity,
        totalAmount: serverTotalAmount,
        orderNotes: enrichedOrderNotes || null,
        couponCode: resolvedCouponCode,
        discountApplied: serverDiscount,
        shippingCost: serverShippingCost,
        status: "ABANDONED",
        items: authoritativeItems.map((item) => ({
          id: item.id,
          variantId: item.variantId,
          variantName: item.variantName,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          personalization: item.personalization,
          customImage: item.processedCustomImage,
          shippingData: {
            userId: effectiveUserId,
            couponId: resolvedCouponId,
            discountApplied: serverDiscount,
            shippingMethodId: resolvedShippingMethodId,
            shippingCost: serverShippingCost,
            address: buyerAddress,
            city: buyerCity,
            zip: shippingData?.zip ? String(shippingData.zip).trim() : null,
            country: shippingData?.country ? String(shippingData.country).trim() : "Egypt",
            phone: buyerPhone,
            email: buyerEmail,
            orderNotes: enrichedOrderNotes || null,
            isGift: Boolean(shippingData?.isGift),
            giftMessage:
              shippingData?.isGift && shippingData?.giftMessage
                ? String(shippingData.giftMessage).trim().slice(0, 1000)
                : null,
          },
        })),
      },
    });

    try {
      const amountCents = Math.round(serverTotalAmount * 100);
      const headersList = await headers();
      const host = headersList.get("host") || "localhost:3000";
      const proto = headersList.get("x-forwarded-proto") || "https";
      const origin = `${proto}://${host}`;

      const itemsForPaymob = authoritativeItems.map((item) => {
        let imageUrl = item.image || "";
        if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("data:")) {
          imageUrl = `${origin}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
        } else if (imageUrl.startsWith("data:")) {
          imageUrl = "";
        }
        return {
          name: item.name || "Item",
          price: item.price,
          description: (item.description || "Giftisan Product").slice(0, 200),
          quantity: item.quantity,
          image: imageUrl,
        };
      });

      if (serverDiscount > 0) {
        itemsForPaymob.push({
          name: "Promo Discount",
          price: -serverDiscount,
          description: "Applied coupon discount",
          quantity: 1,
          image: "",
        });
      }
      if (serverShippingCost > 0) {
        itemsForPaymob.push({
          name: "Shipping",
          price: serverShippingCost,
          description: "Shipping Cost",
          quantity: 1,
          image: "",
        });
      }

      const reference = `AC-${createdLead.id}-${Date.now()}`;
      const clientSecret = await createPaymobIntention(
        amountCents,
        reference,
        {
          firstName: firstName || "Customer",
          lastName: lastName || "NA",
          email: buyerEmail,
          phone: buyerPhone,
          address: buyerAddress,
          city: buyerCity,
          country: shippingData?.country || "EG",
          zip: shippingData?.zip || "",
        },
        itemsForPaymob
      );

      if (!clientSecret) {
        throw new Error("Paymob did not return a checkout session.");
      }

      const paymentUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${PAYMOB_PUBLIC_KEY}&clientSecret=${clientSecret}`;
      return { success: true, orderId: null, paymentUrl };
    } catch (paymobError: any) {
      console.error("Paymob initialization error:", paymobError);
      await prisma.abandonedCheckout
        .update({
          where: { id: createdLead.id },
          data: { status: "FAILED_PAYMENT" },
        })
        .catch(() => {});
      return {
        error:
          "Online payment gateway is temporarily unavailable. Please try again in a moment or select Cash on Delivery.",
      };
    }
  } catch (error: any) {
    console.error("Create order error:", error);
    return { error: error.message || "Failed to complete your order." };
  }
}

export async function retryPaymentAction(orderId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in to perform this action" };
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true
          }
        },
        user: true
      }
    });

    if (!order) {
      return { error: "Order not found" };
    }

    if (order.userId !== session.user.id) {
      return { error: "You are not authorized to retry payment for this order" };
    }

    if (order.status !== "PENDING" && order.status !== "FAILED") {
      return { error: `This order is already ${order.status.toLowerCase()}` };
    }

    if (order.status === "FAILED") {
      // Atomically re-reserve stock and set order status back to PENDING
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.order.updateMany({
          where: { id: orderId, status: "FAILED" },
          data: { status: "PENDING" },
        });
        if (claimed.count !== 1) {
          throw new Error("Order state changed concurrently. Please refresh and try again.");
        }

        for (const item of order.items) {
          if (item.variantId) {
            const updatedVariant = await tx.productVariant.updateMany({
              where: { id: item.variantId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            });
            if (updatedVariant.count !== 1) {
              throw new Error(
                "One of your selected variations just sold out! Please place a new order."
              );
            }
          } else {
            const updatedProduct = await tx.product.updateMany({
              where: { id: item.productId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            });
            if (updatedProduct.count !== 1) {
              throw new Error(
                `The product "${item.product?.name || "One of your items"}" just sold out! Please place a new order.`
              );
            }
          }
        }
      });
    }

    // Generate fresh Paymob Intention link
    const amountCents = Math.round(order.totalAmount * 100);
    
    const headersList = await headers();
    const host = headersList.get("host") || "localhost:3000";
    const proto = headersList.get("x-forwarded-proto") || "http";
    const origin = `${proto}://${host}`;

    const itemsForPaymob = order.items.map(item => {
      let imageUrl = item.product.images && item.product.images.length > 0 ? item.product.images[0] : "";
      if (imageUrl && !imageUrl.startsWith("http")) {
        imageUrl = `${origin}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
      }
      return {
        name: item.product.name || "Item",
        price: item.price,
        description: item.product.description || "Giftisan Product",
        quantity: item.quantity,
        image: imageUrl
      };
    });

    if (order.discountApplied && order.discountApplied > 0) {
      itemsForPaymob.push({
        name: "Promo Discount",
        price: -order.discountApplied,
        description: "Applied coupon discount",
        quantity: 1,
        image: ""
      });
    }

    if (order.shippingCost && order.shippingCost > 0) {
      itemsForPaymob.push({
        name: "Shipping",
        price: order.shippingCost,
        description: "Shipping Cost",
        quantity: 1,
        image: ""
      });
    }

    const shippingData = {
      firstName: order.user?.name?.split(" ")[0] || "NA",
      lastName: order.user?.name?.split(" ").slice(1).join(" ") || "NA",
      email: order.clientEmail || order.user?.email || "test@test.com",
      phone: order.clientPhone || "+201234567890",
      address: order.shippingAddress || "NA",
      city: order.shippingCity || "NA",
      country: order.shippingCountry || "EG",
      zip: order.shippingZip || ""
    };

    const clientSecret = await createPaymobIntention(
      amountCents,
      `${order.id}-${Date.now()}`, // using unique suffixed order ID as special_reference to avoid duplicate reference collisions
      shippingData,
      itemsForPaymob
    );

    if (clientSecret) {
      const paymentUrl = `https://accept.paymob.com/unifiedcheckout/?publicKey=${PAYMOB_PUBLIC_KEY}&clientSecret=${clientSecret}`;
      return { success: true, paymentUrl };
    } else {
      return { error: "Failed to initialize payment gateway" };
    }
  } catch (error: any) {
    console.error("Retry payment error:", error);
    return { error: error.message || "Failed to regenerate payment session" };
  }
}

export async function cancelOrder(orderId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "You must be signed in to cancel an order" };
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true
      }
    });

    if (!order) {
      return { error: "Order not found" };
    }

    if (order.userId !== session.user.id && session.user.role !== "ADMIN") {
      return { error: "You are not authorized to cancel this order" };
    }

    if (order.status !== "PENDING" && session.user.role !== "ADMIN") {
      return { error: `This order is already ${order.status.toLowerCase()} and cannot be cancelled directly.` };
    }

    await prisma.$transaction(async (tx) => {
      // Mark order as CANCELLED
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" }
      });

      // Process stock restoration and financial ledger reversals
      await processOrderCancellationInTx(tx, orderId);
    });

    revalidatePath("/admin", "layout");
    revalidatePath("/admin/orders");
    revalidatePath("/profile");
    revalidatePath("/studio");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Cancel order error:", error);
    return { error: error.message || "Failed to cancel order" };
  }
}

export const cancelPendingOrderAction = cancelOrder;

export async function getUserOrders(userId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.id !== userId && session.user.role !== "ADMIN")) {
      return [];
    }

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        refundRequests: {
          orderBy: { createdAt: "desc" }
        },
        items: {
          include: {
            refundRequests: {
              orderBy: { createdAt: "desc" }
            },
            product: {
              include: {
                artisan: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    return orders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({
        ...item,
        product: item.product ? sanitizePublicProduct(item.product) : item.product,
      })),
    }));
  } catch (error) {
    console.error("Get orders error:", error);
    return [];
  }
}

export async function refreshArtisanBalanceAction(artisanId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in to perform this action." };
    }

    const artisan = await prisma.artisanProfile.findUnique({
      where: { id: artisanId },
      select: { userId: true }
    });

    if (!artisan || (artisan.userId !== session.user.id && session.user.role !== "ADMIN")) {
      return { error: "Unauthorized access to this shop's finances." };
    }

    const { clearedCount } = await clearEligibleArtisanEscrow(artisanId);
    revalidatePath("/studio");
    return { success: true, clearedCount };
  } catch (error: any) {
    return { error: error.message || "Failed to refresh balance." };
  }
}

export async function getArtisanData(userId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.id !== userId && session.user.role !== "ADMIN")) {
      return null;
    }

    // 1. Lazy-clear any matured escrow sales for this artisan upon viewing studio
    const profile = await prisma.artisanProfile.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (profile) {
      await clearEligibleArtisanEscrow(profile.id);
    }

    const artisan = await prisma.artisanProfile.findUnique({
      where: { userId },
      include: {
        products: {
          include: {
            variants: true,
            _count: {
              select: {
                reviews: true,
                favoritedBy: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        user: true,
        balances: true,
        transactions: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });
    return artisan;
  } catch (error) {
    console.error("Get artisan data error:", error);
    return null;
  }
}

const VALID_PAYOUT_METHODS = new Set(["INSTAPAY", "VODAFONE_CASH", "BANK_TRANSFER"]);

export async function requestPayoutAction(
  artisanId: string,
  amount: number,
  method: string,
  address: string,
  name: string
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in to perform this action" };
    }

    const normalizedMethod = String(method || "").trim().toUpperCase();
    if (!VALID_PAYOUT_METHODS.has(normalizedMethod)) {
      return { error: "Invalid payout method selected." };
    }

    const cleanAddress = String(address || "").trim();
    const cleanName = String(name || "").trim();
    if (!cleanAddress || !cleanName) {
      return { error: "Beneficiary name and payout handle/address are required." };
    }

    const roundedAmount = roundCurrency(Number(amount));
    if (!Number.isFinite(roundedAmount) || roundedAmount < MIN_PAYOUT_AMOUNT) {
      return { error: `Minimum withdrawal amount is ${MIN_PAYOUT_AMOUNT} EGP.` };
    }

    // Auto-clear any matured escrow sales for this artisan right before verifying balances
    await clearEligibleArtisanEscrow(artisanId);

    const artisan = await prisma.artisanProfile.findUnique({
      where: { id: artisanId },
      include: { balances: true, user: true }
    });

    if (!artisan || artisan.userId !== session.user.id) {
      return { error: "You are not authorized to make withdrawal requests for this shop" };
    }

    const balance = artisan.balances[0] || { withdrawable: 0 };
    if (roundedAmount > balance.withdrawable) {
      return { error: "Insufficient withdrawable balance." };
    }

    await prisma.$transaction(async (tx) => {
      // Atomic conditional balance deduction prevents concurrent double-withdrawals
      const deducted = await tx.artisanBalance.updateMany({
        where: {
          artisanId: artisan.id,
          withdrawable: { gte: roundedAmount },
        },
        data: {
          withdrawable: { decrement: roundedAmount },
        },
      });

      if (deducted.count !== 1) {
        throw new Error("Insufficient withdrawable balance due to a concurrent pending transaction.");
      }

      // 1. Log transaction as a negative payout
      await tx.artisanTransaction.create({
        data: {
          artisanId: artisan.id,
          amount: -roundedAmount,
          type: "PAYOUT",
          status: "PENDING",
          description: `Withdrawal request via ${normalizedMethod}. Sent to: ${cleanAddress} (${cleanName})`
        }
      });

      // 2. Update preferred profile payout coordinates
      await tx.artisanProfile.update({
        where: { id: artisan.id },
        data: {
          payoutMethod: normalizedMethod as any,
          payoutAddress: cleanAddress,
          payoutName: cleanName
        }
      });
    });

    const artisanName = artisan.studioName || artisan.user?.name || "Artisan";
    sendPayoutRequestEmail(artisanName, roundedAmount, normalizedMethod, cleanAddress).catch((err) =>
      console.error("Failed to send payout request email notification:", err)
    );

    revalidatePath("/studio");
    return { success: true };
  } catch (error: any) {
    console.error("Request payout error:", error);
    return { error: error.message || "Failed to submit withdrawal request." };
  }
}

export async function updateArtisanCommission(artisanId: string, rate: number) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "You must be an admin to perform this action." };
    }

    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      return { error: "Commission rate must be between 0 and 1 (e.g., 0.15 for 15%)." };
    }

    await prisma.artisanProfile.update({
      where: { id: artisanId },
      data: { commissionRate: rate }
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error: any) {
    console.error("Update commission error:", error);
    return { error: error.message || "Failed to update commission rate." };
  }
}

export async function approvePayoutAction(transactionId: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "You must be an admin to perform this action." };
    }

    const transaction = await prisma.artisanTransaction.findUnique({
      where: { id: transactionId },
      include: { 
        artisan: { 
          include: { user: true } 
        } 
      }
    });

    if (!transaction || transaction.type !== "PAYOUT" || transaction.status !== "PENDING") {
      return { error: "Invalid transaction request." };
    }

    const payoutAmount = Math.abs(transaction.amount);

    await prisma.$transaction(async (tx) => {
      // Atomic claim: prevents double-approving if clicked twice
      const claimed = await tx.artisanTransaction.updateMany({
        where: { id: transactionId, type: "PAYOUT", status: "PENDING" },
        data: { status: "COMPLETED" }
      });

      if (claimed.count !== 1) {
        throw new Error("This payout request has already been processed.");
      }

      await tx.artisanBalance.update({
        where: { artisanId: transaction.artisanId },
        data: {
          withdrawn: { increment: payoutAmount }
        }
      });
    });

    if (transaction.artisan?.user?.email) {
      const email = transaction.artisan.user.email;
      const name = transaction.artisan.studioName || transaction.artisan.user.name || "Artisan";
      const method = transaction.description?.split("via ")?.[1]?.split(".")?.[0] || "INSTAPAY";
      const address = transaction.description?.split("Sent to: ")?.[1]?.split(" (")?.[0] || "N/A";

      sendPayoutApprovedEmail(email, name, payoutAmount, method, address).catch((err) =>
        console.error("Failed to send payout approved email:", err)
      );
    }

    revalidatePath("/admin/payouts");
    revalidatePath("/studio");
    return { success: true };
  } catch (error: any) {
    console.error("Approve payout error:", error);
    return { error: error.message || "Failed to approve payout." };
  }
}

export async function rejectPayoutAction(transactionId: string, reason?: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "You must be an admin to perform this action." };
    }

    const transaction = await prisma.artisanTransaction.findUnique({
      where: { id: transactionId },
      include: { 
        artisan: { 
          include: { user: true } 
        } 
      }
    });

    if (!transaction || transaction.type !== "PAYOUT" || transaction.status !== "PENDING") {
      return { error: "Invalid transaction request." };
    }

    const payoutAmount = Math.abs(transaction.amount);

    await prisma.$transaction(async (tx) => {
      // Atomic claim: prevents double-refunding withdrawable if clicked twice
      const claimed = await tx.artisanTransaction.updateMany({
        where: { id: transactionId, type: "PAYOUT", status: "PENDING" },
        data: { 
          status: "FAILED",
          description: `REJECTED: ${transaction.description}${reason ? ` (Reason: ${reason})` : ""}`
        }
      });

      if (claimed.count !== 1) {
        throw new Error("This payout request has already been processed.");
      }

      await tx.artisanBalance.update({
        where: { artisanId: transaction.artisanId },
        data: {
          withdrawable: { increment: payoutAmount }
        }
      });
    });

    if (transaction.artisan?.user?.email) {
      const email = transaction.artisan.user.email;
      const name = transaction.artisan.studioName || transaction.artisan.user.name || "Artisan";
      sendPayoutDeclinedEmail(email, name, payoutAmount, reason || "Invalid or unverified payout details.").catch((err) =>
        console.error("Failed to send payout declined email:", err)
      );
    }

    revalidatePath("/admin/payouts");
    revalidatePath("/studio");
    return { success: true };
  } catch (error: any) {
    console.error("Reject payout error:", error);
    return { error: error.message || "Failed to reject payout." };
  }
}

export async function triggerEscrowClearanceAction() {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "You must be an admin to perform this action." };
    }

    const { clearedCount } = await clearEligibleArtisanEscrow();

    if (clearedCount === 0) {
      return {
        success: true,
        clearedCount: 0,
        message: "No pending escrow balances older than 7 days matched the clearance criteria today.",
      };
    }

    revalidatePath("/admin/payouts");
    revalidatePath("/studio");
    return {
      success: true,
      clearedCount,
      message: `Successfully cleared ${clearedCount} transaction(s) from escrow to withdrawable balances.`,
    };
  } catch (error: any) {
    console.error("Manual escrow clearance error:", error);
    return { error: error.message || "Failed to trigger escrow settlement." };
  }
}

export async function getAllArtisans() {
  try {
    const artisans = await prisma.artisanProfile.findMany({
      where: {
        status: "APPROVED"
      },
      include: {
        user: true,
        products: {
          where: {
            status: "APPROVED"
          },
          include: {
            reviews: {
              select: {
                rating: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    return artisans.map((a) => ({
      ...sanitizePublicArtisan(a),
      products: a.products.map((p) => sanitizePublicProduct(p)),
    }));
  } catch (error) {
    console.error("Get all artisans error:", error);
    return [];
  }
}

export async function checkSlugAvailability(slug: string, currentUserId: string) {
  try {
    const existing = await prisma.artisanProfile.findUnique({
      where: { slug },
      select: { userId: true }
    });

    // Available if no one has it OR the current user already has it
    return {
      available: !existing || existing.userId === currentUserId
    };
  } catch (error) {
    console.error("Slug check error:", error);
    return { error: "Failed to verify slug" };
  }
}

export async function updateArtisanProfile(userId: string, data: any) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "You must be signed in to perform this action" };
    }

    const isAdmin = session.user.role === "ADMIN";
    if (!isAdmin && session.user.id !== userId) {
      return { error: "You are not authorized to update this profile" };
    }

    if (!data.studioName?.trim() || !data.slug?.trim() || !data.phoneNumber?.trim() || (!data.location?.trim() && !data.pickupCity?.trim())) {
      return { error: "Shop Name, Handle (Slug), Phone Number, and Location are required." };
    }

    // Only generate slug if it's not manually provided OR it's a new profile
    const slug = data.slug
      ? slugify(data.slug)
      : data.studioName
        ? `${slugify(data.studioName)}-${userId.slice(-4)}`
        : null;

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true }
    });

    const avatarUrl = data.avatar !== undefined ? await processImage(data.avatar) : undefined;
    const bannerUrl = data.bannerImage !== undefined ? await processImage(data.bannerImage) : undefined;

    const updated = await prisma.artisanProfile.upsert({
      where: { userId },
      create: {
        userId,
        studioName: data.studioName || null,
        slug,
        bio: data.bio || null,
        location: data.location || null,
        yearsOfExperience: typeof data.yearsOfExperience === 'number' ? data.yearsOfExperience : parseInt(data.yearsOfExperience) || 1,
        avatar: (avatarUrl !== undefined ? avatarUrl : dbUser?.image) || null,
        instagram: data.instagram || null,
        website: data.website || null,
        pinterest: data.pinterest || null,
        tiktok: data.tiktok || null,
        facebook: data.facebook || null,
        brandColor: data.brandColor || "#da7b5a",
        bannerImage: bannerUrl || null,
        phoneNumber: data.phoneNumber || null,
        payoutAddress: data.payoutAddress || null,
        payoutName: data.payoutName || null,
        pickupAddress: data.pickupAddress || null,
        pickupCity: data.pickupCity || null,
        pickupDistrict: data.pickupDistrict || null,
        pickupBuilding: data.pickupBuilding || null,
        pickupNotes: data.pickupNotes || null
      },
      update: {
        studioName: data.studioName || null,
        slug,
        bio: data.bio || null,
        location: data.location || null,
        yearsOfExperience: typeof data.yearsOfExperience === 'number' ? data.yearsOfExperience : parseInt(data.yearsOfExperience) || 1,
        ...(avatarUrl !== undefined && { avatar: avatarUrl || dbUser?.image || null }),
        ...(data.instagram !== undefined && { instagram: data.instagram || null }),
        ...(data.website !== undefined && { website: data.website || null }),
        ...(data.pinterest !== undefined && { pinterest: data.pinterest || null }),
        ...(data.tiktok !== undefined && { tiktok: data.tiktok || null }),
        ...(data.facebook !== undefined && { facebook: data.facebook || null }),
        brandColor: data.brandColor || "#da7b5a",
        ...(bannerUrl !== undefined && { bannerImage: bannerUrl || null }),
        phoneNumber: data.phoneNumber || null,
        ...(data.payoutAddress !== undefined && { payoutAddress: data.payoutAddress || null }),
        ...(data.payoutName !== undefined && { payoutName: data.payoutName || null }),
        pickupAddress: data.pickupAddress || null,
        pickupCity: data.pickupCity || null,
        pickupDistrict: data.pickupDistrict || null,
        pickupBuilding: data.pickupBuilding || null,
        pickupNotes: data.pickupNotes || null
      }
    });

    if (avatarUrl) {
      await prisma.user.update({
        where: { id: userId },
        data: { image: avatarUrl }
      });
    }

    revalidatePath("/studio");
    revalidatePath("/");
    revalidatePath("/artisans");
    revalidateCatalog();
    return {
      success: true,
      artisan: {
        id: updated.id,
        studioName: updated.studioName,
        bio: updated.bio,
        location: updated.location,
        avatar: updated.avatar,
        slug: updated.slug
      }
    };
  } catch (error: any) {
    console.error("Update artisan error:", error);
    // Return specific message for unique constraint (slug/studioName)
    if (error.code === 'P2002') {
      return { error: "This Shop Name is already taken. Please try another one." };
    }
    return { error: error.message || "Failed to update shop profile" };
  }
}

export async function updateProfileAvatar(avatarData: string, targetUserId?: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in to perform this action" };
    }

    const isAdmin = session.user.role === "ADMIN";
    const userId = (isAdmin && targetUserId) ? targetUserId : session.user.id;

    if (!isAdmin && targetUserId && targetUserId !== session.user.id) {
      return { error: "Unauthorized" };
    }

    if (!avatarData || typeof avatarData !== "string" || !avatarData.trim()) {
      return { error: "Invalid avatar data" };
    }

    const avatarUrl = await processImage(avatarData);
    if (!avatarUrl) {
      return { error: "Failed to process image" };
    }

    // 1. Update User image
    await prisma.user.update({
      where: { id: userId },
      data: { image: avatarUrl }
    });

    // 2. If user has an artisan profile, update artisanProfile.avatar too
    const existingArtisan = await prisma.artisanProfile.findUnique({
      where: { userId }
    });

    if (existingArtisan) {
      await prisma.artisanProfile.update({
        where: { userId },
        data: { avatar: avatarUrl }
      });
    }

    revalidatePath("/studio");
    revalidatePath("/profile");
    revalidatePath("/settings");
    revalidatePath("/artisans");
    revalidatePath("/");

    return {
      success: true,
      avatar: avatarUrl
    };
  } catch (error: any) {
    console.error("Update profile avatar error:", error);
    return { error: error.message || "Failed to update profile avatar" };
  }
}

export const updateArtisanAvatar = updateProfileAvatar;

export async function generateUniqueProductSlug(name: string, productId?: string): Promise<string> {
  const baseSlug = slugify(name);
  if (!baseSlug) return `product-${Math.random().toString(36).substring(2, 7)}`;

  let candidateSlug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.product.findFirst({
      where: {
        slug: { equals: candidateSlug, mode: "insensitive" },
        ...(productId ? { id: { not: productId } } : {})
      },
      select: { id: true }
    });

    if (!existing) {
      return candidateSlug;
    }

    counter++;
    candidateSlug = `${baseSlug}-${counter}`;
  }
}

export async function getProductForEdit(productId: string) {
  try {
    const session = await auth();
    if (!session?.user) return null;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    });

    if (!product) return null;

    // Artisans can only edit their own products; admins can edit any
    if (session.user.role !== "ADMIN") {
      const artisan = await prisma.artisanProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!artisan || artisan.id !== product.artisanId) return null;
    }

    return product;
  } catch (error) {
    console.error("getProductForEdit error:", error);
    return null;
  }
}

export async function createProduct(artisanId: string, formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "You must be signed in to perform this action" };
    }

    const artisan = await prisma.artisanProfile.findUnique({
      where: { id: artisanId }
    });

    if (!artisan || artisan.userId !== session.user.id) {
      return { error: "You are not authorized to list creations in this shop" };
    }

    if (artisan.termsVersion !== ARTISAN_AGREEMENT_VERSION || !artisan.termsAcceptedAt) {
      return { error: "Please review and accept the current Artisan Terms & Conditions before listing products." };
    }

    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      price: formData.get("price") as string,
      category: formData.get("category") as string,
      canPersonalize: formData.get("canPersonalize") === "true",
      personalizationPrompt: formData.get("personalizationPrompt") as string,
      requiresClientImage: formData.get("requiresClientImage") === "true",
      clientImagePrompt: formData.get("clientImagePrompt") as string,
      badge: formData.get("badge") as string,
      stock: formData.get("stock") as string,
    };

    const images: string[] = [];
    for (let i = 0; i < 10; i++) {
      const img = formData.get(`image-${i}`);
      if (img) images.push(img as string);
    }

    const slug = await generateUniqueProductSlug(data.name);
    const uploadedImages = await Promise.all(
      images.map((img: string) => processImage(img))
    );
    const finalImages = uploadedImages.filter(img => img !== null) as string[];

    const product = await prisma.product.create({
      data: {
        artisanId,
        name: data.name,
        slug,
        description: data.description,
        price: parseFloat(data.price.replace(/,/g, '.')) || 0,
        category: data.category,
        images: finalImages,
        canPersonalize: data.canPersonalize,
        personalizationPrompt: data.personalizationPrompt || null,
        requiresClientImage: data.requiresClientImage,
        clientImagePrompt: data.clientImagePrompt || null,
        badge: null,
        stock: parseInt(data.stock) || 0,
        status: "PENDING",
        variants: {
          create: await Promise.all(JSON.parse(formData.get("variants") as string || "[]").map(async (v: any) => ({
            name: v.name,
            price: parseFloat(v.price) || 0,
            stock: parseInt(v.stock) || 0,
            sku: v.sku || null,
            options: v.options || null,
            image: v.image ? await processImage(v.image) : null,
            badge: null
          })))
        }
      }
    });

    revalidatePath("/studio");
    revalidatePath("/");
    revalidatePath("/artisans");
    revalidateCatalog();
    revalidatePath("/categories");

    return { success: true, product };
  } catch (error: any) {
    console.error("Create product error detail:", error);
    return { error: error.message || "Failed to list new product" };
  }
}

export async function getArtisanSales(artisanId: string) {
  try {
    // Auth guard: only the artisan who owns this profile or an admin may fetch sales
    const session = await auth();
    if (!session?.user) return [];
    const isAdmin = session.user.role === "ADMIN";
    if (!isAdmin) {
      const artisan = await prisma.artisanProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!artisan || artisan.id !== artisanId) return [];
    }

    const sales = await prisma.orderItem.findMany({
      where: {
        product: {
          artisanId: artisanId
        },
        order: {
          status: {
            notIn: ["PENDING", "CANCELLED", "REFUNDED"]
          }
        },
        status: {
          notIn: ["REFUNDED", "CANCELLED"]
        }
      },
      include: {
        order: {
          select: {
            id: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
            status: true,
            shippingCity: true,
            isGift: true,
            giftMessage: true,
            discountApplied: true,
            orderNotes: true,
            user: {
              select: {
                id: true,
                name: true,
              }
            },
            coupon: {
              select: {
                id: true,
                code: true,
                artisanId: true,
                discountType: true,
                discountValue: true,
              }
            }
          }
        },
        product: true,
        variant: true
      },
      orderBy: {
        order: {
          createdAt: 'desc'
        }
      },
      take: 50
    });

    if (isAdmin) return sales;

    return sales.map((s) => ({
      ...s,
      order: {
        ...s.order,
        orderNotes: s.order.orderNotes?.match(/\[Payment:[^\]]+\]/i)?.[0] || null,
      },
    }));
  } catch (error) {
    console.error("Fetch sales error:", error);
    return [];
  }
}

export async function getArtisanReviews(artisanId: string) {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        product: {
          artisanId: artisanId
        }
      },
      include: {
        user: {
          select: PUBLIC_USER_SELECT
        },
        product: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    });

    return reviews;
  } catch (error) {
    console.error("Fetch artisan reviews error:", error);
    return [];
  }
}

export async function updateOrderItemStatus(itemId: string, status: string, trackingNumber?: string, carrier?: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "You must be signed in to perform this action" };
    }

    const allowedStatuses = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
    if (!allowedStatuses.includes(status)) {
      return { error: "Invalid order item status" };
    }

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: {
        product: {
          select: { artisanId: true }
        }
      }
    });

    if (!orderItem) {
      return { error: "Order item not found" };
    }

    const isAdmin = session.user.role === "ADMIN";
    const artisan = await prisma.artisanProfile.findUnique({
      where: { userId: session.user.id }
    });

    const isOwner = artisan && orderItem.product.artisanId === artisan.id;

    if (!isAdmin && (!isOwner || status !== "PROCESSING")) {
      return { error: "Only platform administrators can update shipping statuses. Artisans can only mark items as ready." };
    }

    const wasAlreadyDelivered = orderItem.status === "DELIVERED";

    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status: status,
        trackingNumber: trackingNumber || undefined,
        carrier: carrier || undefined,
      },
      include: {
        order: {
          include: {
            user: true
          }
        },
        product: true
      }
    });

    // Fetch all items for this order to compute parent order status
    const allOrderItems = await prisma.orderItem.findMany({
      where: { orderId: updatedItem.orderId }
    });

    const allDelivered = allOrderItems.every(item => item.status === "DELIVERED");
    const allShippedOrDelivered = allOrderItems.every(item => item.status === "SHIPPED" || item.status === "DELIVERED");

    let newOrderStatus = "PROCESSING";
    if (allDelivered) {
      newOrderStatus = "DELIVERED";
    } else if (allShippedOrDelivered) {
      newOrderStatus = "SHIPPED";
    }

    if (newOrderStatus !== updatedItem.order.status && updatedItem.order.status !== "CANCELLED" && updatedItem.order.status !== "REFUNDED") {
      await prisma.order.update({
        where: { id: updatedItem.orderId },
        data: { status: newOrderStatus }
      });
      updatedItem.order.status = newOrderStatus;
      console.log(`[Order Sync] Updated parent Order ${updatedItem.orderId} status to "${newOrderStatus}" because all items reached this milestone.`);
    }

    // Reset escrow countdown to START NOW only when transitioning into DELIVERED
    if (status === "DELIVERED" && !wasAlreadyDelivered) {
      await prisma.artisanTransaction.updateMany({
        where: {
          orderId: updatedItem.orderId,
          artisanId: orderItem.product.artisanId,
          type: "SALE",
          status: "PENDING"
        },
        data: {
          createdAt: new Date()
        }
      });
      console.log(`[Escrow Security] Reset transaction escrow clock for Order: ${updatedItem.orderId} to START NOW upon delivery.`);
    }

    const recipientEmail = updatedItem.order.user?.email || updatedItem.order.clientEmail;
    const recipientName = updatedItem.order.user?.name || "Customer";

    // Send email notification to the buyer
    if (recipientEmail) {
      sendOrderStatusUpdateEmail(
        recipientEmail,
        recipientName,
        updatedItem.order.id,
        status,
        updatedItem.product.name,
        updatedItem.product.slug || undefined,
        trackingNumber,
        carrier
      ).catch(err => console.error("Failed to send order status email:", err));
    }

    revalidatePath("/studio");
    revalidatePath("/profile");
    return { success: true };
  } catch (error: any) {
    console.error("CRITICAL Update status error:", error.message || error);
    return { error: `Failed to update item status: ${error.message || "Unknown error"}` };
  }
}

async function processOrderUncancellationInTx(tx: any, order: any) {
  // 1. Re-decrement inventory stock for all items with non-negative stock guard
  for (const item of order.items) {
    if (item.variantId) {
      const updated = await tx.productVariant.updateMany({
        where: { id: item.variantId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } }
      });
      if (updated.count === 0) {
        throw new Error(`Insufficient variant stock to restore order item "${item.product?.name || item.id}".`);
      }
    } else if (item.productId) {
      const updated = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } }
      });
      if (updated.count === 0) {
        throw new Error(`Insufficient product stock to restore order item "${item.product?.name || item.id}".`);
      }
    }
  }

  // 2. Re-instate failed transactions or create if missing
  const existingFailedTxs = await tx.artisanTransaction.findMany({
    where: {
      orderId: order.id,
      type: "SALE",
      status: "FAILED"
    }
  });

  if (existingFailedTxs.length > 0) {
    for (const t of existingFailedTxs) {
      await tx.artisanTransaction.update({
        where: { id: t.id },
        data: { status: "PENDING" }
      });

      await tx.artisanBalance.upsert({
        where: { artisanId: t.artisanId },
        update: { pending: { increment: Math.abs(t.amount) } },
        create: { artisanId: t.artisanId, pending: Math.abs(t.amount), withdrawable: 0, withdrawn: 0 }
      });
    }
  } else {
    await recordArtisanOrderLedgerInTx(tx, {
      orderId: order.id,
      couponId: order.couponId,
      discountApplied: order.discountApplied,
      items: order.items.map((item: any) => ({
        productId: item.productId,
        name: item.product?.name,
        price: item.price,
        quantity: item.quantity,
      })),
    });
  }
}

export async function updateOrderStatus(orderId: string, status: string, trackingNumber?: string, carrier?: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "Unauthorized: Admin privileges required" };
    }

    const allowedStatuses = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
    if (!allowedStatuses.includes(status)) {
      return { error: "Invalid order status" };
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return { error: "Order not found" };
    }

    const wasAlreadyDelivered = order.status === "DELIVERED";
    const isUnvoiding = (order.status === "CANCELLED" || order.status === "REFUNDED") && (status !== "CANCELLED" && status !== "REFUNDED");

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { 
          status,
          trackingNumber: trackingNumber || undefined,
          carrier: carrier || undefined
        }
      });

      if (status === "CANCELLED") {
        await processOrderCancellationInTx(tx, orderId);
      } else if (status === "REFUNDED") {
        await processOrderRefundInTx(tx, orderId);
      } else {
        if (isUnvoiding) {
          await processOrderUncancellationInTx(tx, order);
        }
        await tx.orderItem.updateMany({
          where: { orderId },
          data: {
            status,
            ...(trackingNumber ? { trackingNumber } : {}),
            ...(carrier ? { carrier } : {})
          }
        });
      }
    });

    if (status === "DELIVERED" && !wasAlreadyDelivered) {
      await prisma.artisanTransaction.updateMany({
        where: {
          orderId,
          type: "SALE",
          status: "PENDING"
        },
        data: {
          createdAt: new Date()
        }
      });
      console.log(`[Escrow Security] Reset transaction escrow clock for Order: ${orderId} to START NOW upon delivery.`);
    }

    const recipientEmail = order.user?.email || order.clientEmail;
    const recipientName = order.user?.name || "Customer";

    if (recipientEmail) {
      sendOrderStatusUpdateEmail(
        recipientEmail,
        recipientName,
        order.id,
        status,
        order.items[0]?.product?.name || "Your order",
        order.items[0]?.product?.slug || undefined,
        trackingNumber,
        carrier
      ).catch(err => console.error("Failed to send order status email:", err));
    }

    revalidatePath("/admin", "layout");
    revalidatePath("/admin/orders");
    revalidatePath("/studio");
    revalidatePath("/profile");
    return { success: true };
  } catch (error: any) {
    console.error("Update order status error:", error);
    return { error: error.message || "Failed to update order status" };
  }
}


export async function trackProductView(productId: string) {
  try {
    const cookieStore = await cookies();
    const viewCookieName = `vtd_${productId}`;
    const hasViewed = cookieStore.get(viewCookieName);

    if (!hasViewed) {
      console.log(`[SEO] Counting unique view for product: ${productId}`);
      await prisma.product.update({
        where: { id: productId },
        data: { views: { increment: 1 } }
      });

      cookieStore.set(viewCookieName, "1", {
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
      });
      return { success: true };
    }
    return { success: true, alreadyViewed: true };
  } catch (err) {
    console.error("Action view track error:", err);
    return { error: "Failed to track view" };
  }
}

export async function getSubscribers() {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return [];
    }

    return await prisma.newsletterSubscriber.findMany({
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error("Fetch subscribers error:", error);
    return [];
  }
}

export async function deleteSubscriber(id: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    await prisma.newsletterSubscriber.delete({
      where: { id }
    });
    revalidatePath("/admin/subscribers");
    return { success: true };
  } catch (error) {
    console.error("Delete subscriber error:", error);
    return { error: "Failed to remove subscriber" };
  }
}

export async function updateProduct(productId: string, formData: FormData) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "You must be signed in to update a product" };
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        artisan: {
          select: {
            userId: true,
            termsAcceptedAt: true,
            termsVersion: true,
          },
        },
      },
    });

    if (!existingProduct) return { error: "Product not found" };
    const isAdmin = session.user.role === "ADMIN";
    if (!isAdmin && existingProduct.artisan.userId !== session.user.id) {
      return { error: "You are not authorized to update this product" };
    }
    if (!isAdmin && (
      existingProduct.artisan.termsVersion !== ARTISAN_AGREEMENT_VERSION ||
      !existingProduct.artisan.termsAcceptedAt
    )) {
      return { error: "Please review and accept the current Artisan Terms & Conditions before updating products." };
    }

    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      price: formData.get("price") as string,
      category: formData.get("category") as string,
      canPersonalize: formData.get("canPersonalize") === "true",
      personalizationPrompt: formData.get("personalizationPrompt") as string,
      requiresClientImage: formData.get("requiresClientImage") === "true",
      clientImagePrompt: formData.get("clientImagePrompt") as string,
      badge: formData.get("badge") as string,
      stock: formData.get("stock") as string,
    };

    const images: string[] = [];
    for (let i = 0; i < 10; i++) {
      const img = formData.get(`image-${i}`);
      if (img) images.push(img as string);
    }

    const uploadedImages = await Promise.all(
      images.map((img: string) => processImage(img))
    );
    const finalImages = uploadedImages.filter(img => img !== null) as string[];

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price.replace(/,/g, '.')) || 0,
        category: data.category,
        images: finalImages,
        canPersonalize: data.canPersonalize,
        personalizationPrompt: data.personalizationPrompt || null,
        requiresClientImage: data.requiresClientImage,
        clientImagePrompt: data.clientImagePrompt || null,
        badge: null,
        stock: parseInt(data.stock) || 0,
        status: "PENDING", // Reset to pending on update for re-approval
        rejectionReason: null // Clear feedback once resubmitted
      }
    });

    // Update variants — safe sync: only delete variants NOT referenced by existing order items
    // to avoid orphaning OrderItem.variantId foreign keys for historical orders.
    const variantsData = JSON.parse(formData.get("variants") as string || "[]");

    await prisma.productVariant.deleteMany({
      where: {
        productId,
        orderItems: { none: {} }, // Preserve variants referenced by real orders
      },
    });

    if (variantsData.length > 0) {
      // Re-create all submitted variants (order-referenced ones will remain alongside)
      await prisma.productVariant.createMany({
        data: await Promise.all(
          variantsData.map(async (v: any) => ({
            productId,
            name: v.name,
            price: parseFloat(v.price) || 0,
            stock: parseInt(v.stock) || 0,
            sku: v.sku ? `${v.sku}-${Date.now()}` : null, // Avoid unique constraint conflict on recreate
            options: v.options || null,
            image: v.image ? await processImage(v.image) : null,
            badge: null,
          }))
        ),
        skipDuplicates: true,
      });
    }

    revalidatePath(`/products/${productId}`);
    revalidatePath("/studio");
    revalidatePath("/");
    revalidatePath("/artisans");
    revalidateCatalog();
    revalidatePath("/categories");

    return { success: true, product: updated };
  } catch (error: any) {
    console.error("Update product error:", error);
    return { error: error.message || "Failed to update product" };
  }
}

export async function deleteProduct(productId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "You must be signed in to perform this action" };
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { artisanId: true }
    });

    if (!product) {
      return { error: "Product not found" };
    }

    const isAdmin = session.user.role === "ADMIN";
    const artisan = await prisma.artisanProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!isAdmin && (!artisan || product.artisanId !== artisan.id)) {
      return { error: "You are not authorized to remove this product" };
    }

    // Protect historical OrderItem rows from onDelete: Cascade data loss
    const orderItemsCount = await prisma.orderItem.count({
      where: { productId }
    });

    if (orderItemsCount > 0) {
      await prisma.$transaction([
        prisma.product.update({
          where: { id: productId },
          data: {
            status: "DRAFT",
            stock: 0,
            isFeatured: false
          }
        }),
        prisma.productVariant.updateMany({
          where: { productId },
          data: { stock: 0 }
        })
      ]);
    } else {
      await prisma.product.delete({
        where: { id: productId }
      });
    }

    revalidatePath("/studio");
    revalidatePath("/");
    revalidatePath("/artisans");
    revalidateCatalog();
    revalidatePath("/categories");

    return { success: true, archived: orderItemsCount > 0 };
  } catch (error) {
    console.error("Delete product error:", error);
    return { error: "Failed to remove product" };
  }
}

export async function promoteToArtisan(userId: string, studioData: any) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "You must be signed in to perform this action" };
    }

    if (session.user.id !== userId) {
      return { error: "You are not authorized to onboard this account" };
    }

    const cleanStudioName = stripEmojis(studioData.studioName?.trim() || "");
    const cleanBio = stripEmojis(studioData.bio?.trim() || "") || "Handmade artisan workshop.";
    const cleanLocation = stripEmojis(studioData.location?.trim() || "");
    const cleanPhoneNumber = stripEmojis(studioData.phoneNumber?.trim() || "");

    if (!cleanStudioName || !cleanLocation || !cleanPhoneNumber) {
      return { error: "Shop Name, Location, and Phone Number are required for artisan registration." };
    }

    // Temporarily commented out agreement contract check
    // if (studioData.agreedToTerms !== true) {
    //   return { error: "You must review and agree to the Giftisan Artisan Terms & Conditions to launch your shop." };
    // }


    const baseSlug = slugify(cleanStudioName);
    let artisanSlug = baseSlug ? baseSlug : `artisan-${userId.slice(-4)}`;

    // Verify slug uniqueness against other artisans
    const existingArtisan = await prisma.artisanProfile.findFirst({
      where: {
        slug: artisanSlug,
        userId: { not: userId }
      }
    });

    if (existingArtisan) {
      artisanSlug = `${artisanSlug}-${userId.slice(-4)}`;
    }

    const cleanInstagram = studioData.instagram ? stripEmojis(studioData.instagram.replace(/^@/, '').trim()) : null;
    const cleanBrandColor = studioData.brandColor?.trim() || "#da7b5a";
    const cleanPickupCity = studioData.pickupCity ? stripEmojis(studioData.pickupCity.trim()) : null;
    const cleanPickupDistrict = (studioData.pickupDistrict || studioData.district)
      ? stripEmojis((studioData.pickupDistrict || studioData.district).trim())
      : null;

    const locationParts = cleanLocation.split(/[,،]/).map(s => s.trim()).filter(Boolean);
    const derivedDistrict = cleanPickupDistrict || (locationParts.length > 1 ? locationParts[0] : null);
    const derivedGov = cleanPickupCity || studioData.governorate || (locationParts.length > 1 ? locationParts[1] : locationParts[0]) || null;

    const acceptedAt = new Date();

    // 1. Fetch current user and existing artisan profile to get actual avatar (Google or previous upload)
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true, name: true }
    });

    const existingArtisanProfile = await prisma.artisanProfile.findUnique({
      where: { userId },
      select: { avatar: true }
    });

    // 2. Resolve avatar in priority order:
    // a. studioData.avatar (if user uploaded a custom logo/avatar during setup)
    // b. existing artisan avatar (if not a generic dicebear placeholder)
    // c. user's Google or uploaded image from DB
    // d. session image
    // e. DiceBear SVG fallback
    let resolvedAvatar: string | null = null;
    if (studioData.avatar) {
      resolvedAvatar = await processImage(studioData.avatar);
    } else if (existingArtisanProfile?.avatar && !existingArtisanProfile.avatar.includes("dicebear.com")) {
      resolvedAvatar = existingArtisanProfile.avatar;
    } else if (dbUser?.image) {
      resolvedAvatar = dbUser.image;
    } else if ((session.user as any)?.image) {
      resolvedAvatar = (session.user as any).image;
    } else {
      resolvedAvatar = `https://api.dicebear.com/10.x/gaze/svg?seed=${encodeURIComponent(cleanStudioName || userId)}`;
    }

    const profileData = {
      studioName: cleanStudioName,
      slug: artisanSlug,
      bio: cleanBio,
      location: cleanLocation,
      phoneNumber: cleanPhoneNumber,
      avatar: resolvedAvatar,
      termsAcceptedAt: acceptedAt,
      termsVersion: ARTISAN_AGREEMENT_VERSION,
      ...(cleanInstagram ? { instagram: cleanInstagram } : {}),
      ...(cleanBrandColor ? { brandColor: cleanBrandColor } : {}),
      ...(derivedGov ? { pickupCity: derivedGov } : {}),
      ...(derivedDistrict ? { pickupDistrict: derivedDistrict } : {}),
    };

    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || null;
    const language = isArtisanAgreementLanguage(studioData.agreementLanguage)
      ? studioData.agreementLanguage
      : "en";

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { 
          role: "ARTISAN",
          ...(studioData.avatar && resolvedAvatar ? { image: resolvedAvatar } : {})
        },
      });

      const artisan = await tx.artisanProfile.upsert({
        where: { userId },
        create: { userId, ...profileData, avatar: resolvedAvatar },
        update: { ...profileData, avatar: resolvedAvatar },
      });

      await tx.artisanAgreementAcceptance.upsert({
        where: {
          artisanId_agreementVersion: {
            artisanId: artisan.id,
            agreementVersion: ARTISAN_AGREEMENT_VERSION,
          },
        },
        create: {
          artisanId: artisan.id,
          agreementVersion: ARTISAN_AGREEMENT_VERSION,
          language,
          acceptedAt,
          signerUserId: userId,
          signerName: session.user.name || null,
          userAgent: requestHeaders.get("user-agent"),
          ipAddress,
        },
        // Do not overwrite the original acceptance record for this version.
        update: {},
      });
    });

    revalidatePath("/studio");
    revalidatePath("/become-artisan");
    revalidatePath("/artisans");

    return { success: true };
  } catch (error) {
    console.error("Promote to artisan error:", error);
    return { error: "Failed to become an artisan" };
  }
}

export async function acceptCurrentArtisanAgreement(language: unknown) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ARTISAN") {
      return { error: "Only signed-in artisans can accept the terms & conditions." };
    }
    if (!isArtisanAgreementLanguage(language)) {
      return { error: "Unsupported agreement language." };
    }
    const artisanUserId = session.user.id;

    const artisan = await prisma.artisanProfile.findUnique({
      where: { userId: artisanUserId },
      select: { id: true },
    });
    if (!artisan) return { error: "Artisan profile not found." };

    const requestHeaders = await headers();
    const forwardedFor = requestHeaders.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || null;
    const acceptedAt = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.artisanProfile.update({
        where: { id: artisan.id },
        data: { termsAcceptedAt: acceptedAt, termsVersion: ARTISAN_AGREEMENT_VERSION },
      });
      await tx.artisanAgreementAcceptance.upsert({
        where: {
          artisanId_agreementVersion: {
            artisanId: artisan.id,
            agreementVersion: ARTISAN_AGREEMENT_VERSION,
          },
        },
        create: {
          artisanId: artisan.id,
          agreementVersion: ARTISAN_AGREEMENT_VERSION,
          language,
          acceptedAt,
          signerUserId: artisanUserId,
          signerName: session.user.name || null,
          userAgent: requestHeaders.get("user-agent"),
          ipAddress,
        },
        update: {},
      });
    });

    revalidatePath("/studio");
    revalidatePath("/studio/settings");
    return { success: true, version: ARTISAN_AGREEMENT_VERSION, acceptedAt };
  } catch (error) {
    console.error("Accept artisan agreement error:", error);
    return { error: "Unable to record agreement acceptance. Please try again." };
  }
}

export async function addReview(data: { productId: string, userId: string, rating: number, comment: string, images?: string[] }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in to perform this action" };
    }

    if (session.user.id !== data.userId) {
      return { error: "You are not authorized to submit this review" };
    }

    const safeRating = Math.round(Number(data.rating));
    if (!Number.isFinite(safeRating) || safeRating < 1 || safeRating > 5) {
      return { error: "Rating must be between 1 and 5 stars." };
    }

    const cleanComment = stripEmojis((data.comment || "").trim());
    if (!cleanComment || cleanComment.length > 2000) {
      return { error: "Please enter a review comment (up to 2,000 characters)." };
    }

    const existingReview = await prisma.review.findFirst({
      where: {
        productId: data.productId,
        userId: session.user.id,
      },
      select: { id: true },
    });

    if (existingReview) {
      return { error: "You have already submitted a review for this product." };
    }

    const processedImages = await Promise.all(
      (data.images || []).slice(0, 5).map(img => processImage(img))
    );

    const review = await prisma.review.create({
      data: {
        productId: data.productId,
        userId: session.user.id,
        rating: safeRating,
        comment: cleanComment,
        images: processedImages.filter(Boolean) as string[]
      },
      include: {
        user: {
          select: PUBLIC_USER_SELECT
        }
      }
    });

    revalidatePath(`/products/${data.productId}`);
    revalidateCatalog();
    return { success: true, review };
  } catch (error: any) {
    console.error("Add review error detail:", error);
    return { error: `Review failed: ${error.message || "Please check your internet and try again."}` };
  }
}

export async function getAdminStats() {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { 
        userCount: 0, 
        productCount: 0, 
        orderCount: 0, 
        revenue: 0,
        platformEarnings: 0,
        pendingPayouts: 0,
        artisanPending: 0,
        artisanWithdrawable: 0,
        shippingRevenue: 0,
        readyToShipCount: 0
      };
    }

    const getCachedStats = unstable_cache(
      async () => {
        const [
          userCount, 
          productCount, 
          orderCount, 
          totalRevenue,
          artisanBalances,
          pendingPayouts,
          allSales,
          shippingRevenue,
          readyToShipCount,
          pendingArtisansCount,
          pendingProductsCount,
          pendingPayoutsCount
        ] = await Promise.all([
          prisma.user.count(),
          prisma.product.count(),
          prisma.order.count({
            where: {
              status: {
                notIn: ["PENDING", "CANCELLED", "REFUNDED"]
              }
            }
          }),
          prisma.order.aggregate({
            where: {
              status: {
                notIn: ["PENDING", "CANCELLED", "REFUNDED"]
              }
            },
            _sum: { totalAmount: true }
          }),
          prisma.artisanBalance.aggregate({
            _sum: {
              pending: true,
              withdrawable: true
            }
          }),
          prisma.artisanTransaction.aggregate({
            where: {
              type: "PAYOUT",
              status: "PENDING"
            },
            _sum: {
              amount: true
            }
          }),
          prisma.artisanTransaction.findMany({
            where: {
              type: "SALE",
              status: { in: ["PENDING", "CLEARED"] }
            },
            select: {
              amount: true,
              artisanId: true,
              orderId: true,
              order: {
                include: {
                  items: {
                    select: {
                      price: true,
                      quantity: true,
                      product: {
                        select: {
                          artisanId: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }),
          prisma.order.aggregate({
            where: { status: { notIn: ["PENDING", "CANCELLED", "REFUNDED"] } },
            _sum: { shippingCost: true }
          }),
          prisma.order.count({
            where: {
              status: { in: ["PENDING", "PROCESSING"] },
              items: {
                every: {
                  status: { in: ["PROCESSING", "SHIPPED", "DELIVERED"] }
                }
              }
            }
          }),
          prisma.artisanProfile.count({ where: { status: "PENDING" } }),
          prisma.product.count({ where: { status: "PENDING" } }),
          prisma.artisanTransaction.count({ where: { type: "PAYOUT", status: "PENDING" } })
        ]);

        let platformEarnings = 0;
        allSales.forEach(sale => {
          if (sale.order) {
            const artisanItems = sale.order.items.filter(item => item.product.artisanId === sale.artisanId);
            const itemTotal = artisanItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const commission = itemTotal - Math.abs(sale.amount);
            platformEarnings += commission;
          }
        });

        return {
          userCount,
          productCount,
          orderCount,
          revenue: totalRevenue._sum.totalAmount || 0,
          platformEarnings,
          pendingPayouts: Math.abs(pendingPayouts._sum.amount || 0),
          artisanPending: artisanBalances._sum.pending || 0,
          artisanWithdrawable: artisanBalances._sum.withdrawable || 0,
          shippingRevenue: shippingRevenue._sum.shippingCost || 0,
          readyToShipCount,
          pendingArtisansCount,
          pendingProductsCount,
          pendingPayoutsCount
        };
      },
      ["admin-stats-cache-key"],
      { revalidate: 60, tags: ["admin-stats"] }
    );

    return await getCachedStats();
  } catch (error) {
    console.error("Admin stats error:", error);
    return { 
      userCount: 0, 
      productCount: 0, 
      orderCount: 0, 
      revenue: 0,
      platformEarnings: 0,
      pendingPayouts: 0,
      artisanPending: 0,
      artisanWithdrawable: 0,
      shippingRevenue: 0,
      readyToShipCount: 0
    };
  }
}

export async function getAllUsers() {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return [];
    }

    return await prisma.user.findMany({
      include: {
        artisanProfile: true,
        orders: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error("Get all users error:", error);
    return [];
  }
}

export async function getAllOrders() {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return [];
    }

    const orders = await prisma.order.findMany({
      include: {
        user: true,
        refundRequests: {
          orderBy: { createdAt: 'desc' }
        },
        items: {
          include: {
            refundRequests: {
              orderBy: { createdAt: 'desc' }
            },
            product: {
              include: {
                artisan: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return orders.map((o) => ({
      ...o,
      verifySig: signDeliveryVerifyToken(o.id),
    }));
  } catch (error) {
    console.error("Get all orders error:", error);
    return [];
  }
}

export async function deleteUser(userId: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    if (session.user.id === userId) {
      return { error: "You cannot delete your own administrator account." };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        _count: { select: { orders: true } },
        artisanProfile: {
          select: {
            id: true,
            _count: {
              select: {
                transactions: true,
              },
            },
          },
        },
      },
    });

    if (!targetUser) {
      return { error: "User not found" };
    }

    const artisanOrderItems = targetUser.artisanProfile
      ? await prisma.orderItem.count({
          where: { product: { artisanId: targetUser.artisanProfile.id } },
        })
      : 0;

    // Preserve financial ledger & historical orders by soft-anonymizing accounts with transaction history
    if (
      targetUser._count.orders > 0 ||
      (targetUser.artisanProfile?._count.transactions ?? 0) > 0 ||
      artisanOrderItems > 0
    ) {
      const anonymizedEmail = `deleted+${userId}@deleted.giftisan.local`;
      await prisma.$transaction([
        prisma.session.deleteMany({ where: { userId } }),
        prisma.account.deleteMany({ where: { userId } }),
        prisma.user.update({
          where: { id: userId },
          data: {
            name: "Deleted User",
            email: anonymizedEmail,
            emailVerified: null,
            password: null,
            image: null,
            role: "CLIENT",
          },
        }),
        ...(targetUser.artisanProfile
          ? [
              prisma.artisanProfile.update({
                where: { id: targetUser.artisanProfile.id },
                data: {
                  status: "REJECTED",
                  isVerified: false,
                  phoneNumber: null,
                  payoutAddress: null,
                  payoutName: null,
                  payoutMethod: null,
                },
              }),
              prisma.product.updateMany({
                where: { artisanId: targetUser.artisanProfile.id },
                data: { status: "DRAFT", stock: 0, isFeatured: false },
              }),
            ]
          : []),
      ]);
    } else {
      await prisma.user.delete({
        where: { id: userId },
      });
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Delete user error:", error);
    return { error: "Failed to delete user" };
  }
}

export async function updateArtisanStatus(artisanId: string, status: "PENDING" | "APPROVED" | "REJECTED") {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    const profile = await prisma.artisanProfile.update({
      where: { id: artisanId },
      data: { status },
      include: { user: true }
    });

    if (status === "APPROVED" && profile.user.email) {
      sendArtisanApprovalEmail(profile.user.email, profile.user.name || "Artisan")
        .catch(err => console.error("Failed to send artisan approval email:", err));
    }

    revalidatePath("/admin/users");
    revalidatePath("/");
    revalidatePath("/artisans");
    revalidatePath("/categories");
    revalidatePath("/search");
    return { success: true };
  } catch (error) {
    console.error("Update status error:", error);
    return { error: "Failed to update shop status" };
  }
}

export async function updateProductStatus(productId: string, status: "PENDING" | "APPROVED" | "REJECTED" | "DRAFT", reason?: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "Unauthorized: Admin privileges required" };
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        artisan: {
          include: {
            user: true
          }
        }
      }
    });

    if (!product) {
      return { error: "Product not found" };
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        status,
        rejectionReason: status === "REJECTED" ? reason : null
      }
    });

    // Send notification email
    if (status !== "DRAFT" && product.artisan.user.email) {
      sendProductStatusUpdateEmail(
        product.artisan.user.email,
        product.artisan.user.name || "Artisan",
        product.name,
        status as "APPROVED" | "REJECTED" | "PENDING",
        reason
      ).catch(err => console.error("Failed to send product status email:", err));
    }

    revalidatePath("/");
    revalidatePath("/categories");
    revalidatePath("/artisans");
    revalidatePath("/admin/products");
    revalidateCatalog();
    return { success: true };
  } catch (error) {
    console.error("Update product status error:", error);
    return { error: "Failed to update product status" };
  }
}

export async function toggleProductFeatured(productId: string, isFeatured: boolean) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "Unauthorized: Admin privileges required" };
    }

    await prisma.product.update({
      where: { id: productId },
      data: { isFeatured }
    });
    revalidatePath("/");
    revalidatePath("/admin/products");
    revalidateCatalog();
    return { success: true };
  } catch (error) {
    console.error("Toggle featured error:", error);
    return { error: "Failed to update featured status" };
  }
}

export async function toggleArtisanVerification(artisanId: string, isVerified: boolean) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "Unauthorized: Admin privileges required" };
    }

    await prisma.artisanProfile.update({
      where: { id: artisanId },
      data: { isVerified }
    });
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Toggle verification error:", error);
    return { error: "Failed to update verification status" };
  }
}

export async function updateUserRole(userId: string, role: "CLIENT" | "ARTISAN" | "ADMIN") {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "Unauthorized: Admin privileges required" };
    }

    if (!["CLIENT", "ARTISAN", "ADMIN"].includes(role)) {
      return { error: "Invalid user role" };
    }

    if (session.user.id === userId && role !== "ADMIN") {
      return { error: "You cannot remove your own administrator role." };
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role }
    });

    // If role is ARTISAN, ensure an ArtisanProfile exists
    if (role === "ARTISAN") {
      await prisma.artisanProfile.upsert({
        where: { userId },
        create: {
          userId,
          bio: "",
          location: "",
          avatar: `https://api.dicebear.com/10.x/gaze/svg?seed=${encodeURIComponent(user.name || userId)}`
        },
        update: {} // Do nothing if it already exists
      });
    }

    revalidatePath("/admin/users");
    revalidatePath("/studio");
    return { success: true };
  } catch (error) {
    console.error("Update user role error:", error);
    return { error: "Failed to update user role" };
  }
}

export async function sendMessage(senderId: string, receiverId: string, content: string, productId?: string, attachment?: string) {
  if (IS_CHAT_LOCKED) {
    return { error: "Messaging between clients and artisans is currently locked." };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be signed in to send messages." };
  }

  if (session.user.id !== senderId && session.user.role !== "ADMIN") {
    return { error: "Unauthorized sender." };
  }

  if (!senderId || !receiverId) {
    return { error: "Missing sender or receiver ID" };
  }

  const rl = checkRateLimit(`msg:${session.user.id}`, 30, 60_000);
  if (!rl.success) {
    return { error: "You are sending messages too quickly. Please wait a moment." };
  }

  const cleanContent = (content || "").trim();
  if (cleanContent.length > 4000) {
    return { error: "Message is too long (maximum 4,000 characters)." };
  }

  try {
    const attachmentUrl = await processImage(attachment, true);

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content: cleanContent,
        productId: productId || null,
        attachment: attachmentUrl
      },
      include: {
        sender: true,
        receiver: true,
        product: true
      }
    });

    // Send notification email to receiver ONLY if they don't already have unread messages from this sender
    // This prevents spamming if the user sends multiple quick messages
    if (message.receiver.email) {
      const hasUnreadFromSender = await prisma.message.count({
        where: {
          receiverId: message.receiverId,
          senderId: message.senderId,
          read: false,
          id: { not: message.id } // Don't count the message we just created
        }
      });

      if (hasUnreadFromSender === 0) {
        sendMessageNotification(
          message.receiver.email,
          message.receiver.name || "Artisan",
          message.sender.name || "A customer"
        ).catch(err => console.error("Failed to send message notification:", err));
      }
    }

    const sanitizeFlightString = (str: string | null | undefined): string | null => {
      if (!str) return null;
      // In development, allow base64 strings up to 150KB to support local offline media testing.
      // In production, strictly restrict strings to 2000 characters (only CDN URLs allowed).
      const maxLength = process.env.NODE_ENV === "production" ? 2000 : 150000;
      if (str.length > maxLength) return null;
      return str;
    };

    const plainMessage = {
      id: message.id,
      content: message.content || "",
      senderId: message.senderId,
      receiverId: message.receiverId,
      productId: message.productId || null,
      attachment: sanitizeFlightString(message.attachment),
      read: message.read,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender ? {
        id: message.sender.id,
        name: message.sender.name || "",
        image: sanitizeFlightString(message.sender.image) || ""
      } : null,
      receiver: message.receiver ? {
        id: message.receiver.id,
        name: message.receiver.name || "",
        image: sanitizeFlightString(message.receiver.image) || ""
      } : null,
      product: message.product ? {
        id: message.product.id,
        name: message.product.name || "",
        images: Array.isArray(message.product.images) && message.product.images.length > 0 && message.product.images[0]
          ? [sanitizeFlightString(message.product.images[0]) || ""]
          : []
      } : null
    };

    return { success: true, message: plainMessage };
  } catch (error: any) {
    console.error("CRITICAL Send message error:", error.code, error.message || error);
    if (error.code === 'P2003') {
      return { error: "Could not send message: one of the users or the product no longer exists." };
    }
    return { error: error.message || "Failed to send message" };
  }
}

export async function getInbox(userId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.id !== userId && session.user.role !== "ADMIN")) {
      return [];
    }

    const rawMessages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            images: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 40 // Optimized from 100 to 40 to slash payload size & prevent memory congestion
    });

    const sanitizeFlightString = (str: string | null | undefined): string | null => {
      if (!str) return null;
      // In development, allow base64 strings up to 150KB to support local offline media testing.
      // In production, strictly restrict strings to 2000 characters (only CDN URLs allowed).
      const maxLength = process.env.NODE_ENV === "production" ? 2000 : 150000;
      if (str.length > maxLength) return null;
      return str;
    };

    return rawMessages.map(m => ({
      id: m.id,
      content: m.content || "",
      senderId: m.senderId,
      receiverId: m.receiverId,
      productId: m.productId || null,
      attachment: sanitizeFlightString(m.attachment),
      read: m.read,
      createdAt: m.createdAt.toISOString(),
      sender: m.sender ? {
        id: m.sender.id,
        name: m.sender.name || "",
        image: sanitizeFlightString(m.sender.image) || ""
      } : null,
      receiver: m.receiver ? {
        id: m.receiver.id,
        name: m.receiver.name || "",
        image: sanitizeFlightString(m.receiver.image) || ""
      } : null,
      product: m.product ? {
        id: m.product.id,
        name: m.product.name || "",
        images: Array.isArray(m.product.images) && m.product.images.length > 0 && m.product.images[0]
          ? [sanitizeFlightString(m.product.images[0]) || ""]
          : []
      } : null
    }));
  } catch (error) {
    console.error("Get inbox error:", error);
    return [];
  }
}

export async function getAdminConversations() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return { error: "Unauthorized", messages: [] };
    }

    const rawMessages = await prisma.message.findMany({
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            artisanProfile: {
              select: {
                id: true,
                studioName: true,
                slug: true,
              }
            }
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            artisanProfile: {
              select: {
                id: true,
                studioName: true,
                slug: true,
              }
            }
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            images: true,
            slug: true,
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 500
    });

    const sanitizeFlightString = (str: string | null | undefined): string | null => {
      if (!str) return null;
      const maxLength = process.env.NODE_ENV === "production" ? 2000 : 150000;
      if (str.length > maxLength) return null;
      return str;
    };

    const messages = rawMessages.map(m => ({
      id: m.id,
      content: m.content || "",
      senderId: m.senderId,
      receiverId: m.receiverId,
      productId: m.productId || null,
      attachment: sanitizeFlightString(m.attachment),
      read: m.read,
      createdAt: m.createdAt.toISOString(),
      sender: m.sender ? {
        id: m.sender.id,
        name: m.sender.name || "User",
        email: m.sender.email || "",
        image: sanitizeFlightString(m.sender.image) || "",
        role: m.sender.role,
        studioName: m.sender.artisanProfile?.studioName || null,
        slug: m.sender.artisanProfile?.slug || null,
      } : null,
      receiver: m.receiver ? {
        id: m.receiver.id,
        name: m.receiver.name || "User",
        email: m.receiver.email || "",
        image: sanitizeFlightString(m.receiver.image) || "",
        role: m.receiver.role,
        studioName: m.receiver.artisanProfile?.studioName || null,
        slug: m.receiver.artisanProfile?.slug || null,
      } : null,
      product: m.product ? {
        id: m.product.id,
        name: m.product.name || "",
        slug: m.product.slug || null,
        images: Array.isArray(m.product.images) && m.product.images.length > 0 && m.product.images[0]
          ? [sanitizeFlightString(m.product.images[0]) || ""]
          : []
      } : null
    }));

    return { success: true, messages };
  } catch (error: any) {
    console.error("Get admin conversations error:", error);
    return { error: error.message || "Failed to load conversations", messages: [] };
  }
}

export async function updateUser(userId: string, formData: FormData) {
  try {
    // Auth guard: a user may only update their own profile unless they are an admin
    const session = await auth();
    if (!session?.user || (session.user.id !== userId && session.user.role !== "ADMIN")) {
      return { error: "Unauthorized" };
    }

    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const image = formData.get("image") as string;
    const imageUrl = await processImage(image);

    const currentUser = await prisma.user.findUnique({ where: { id: userId } });
    const emailChanged = email && currentUser && currentUser.email !== email;

    const data: any = { name, image: imageUrl };
    if (emailChanged) {
      // Check if email is already taken
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return { error: "Email is already in use by another account." };

      data.email = email;
      data.emailVerified = null;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data
    });

    if (emailChanged) {
      const verificationToken = await generateVerificationToken(email);
      await sendVerificationEmail(verificationToken.identifier, verificationToken.token);
    }

    return {
      success: true,
      emailChanged,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        emailVerified: user.emailVerified
      }
    };
  } catch (error) {
    console.error("Update user error:", error);
    return { error: "Failed to update profile" };
  }
}

export async function changeEmailAction({
  newEmail,
  currentPassword,
  lang = "en"
}: {
  newEmail: string;
  currentPassword: string;
  lang?: "en" | "ar";
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const trimmedEmail = newEmail?.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return { error: "Please provide a valid email address." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      omit: { password: false },
      include: {
        accounts: {
          select: { provider: true }
        }
      }
    });

    if (!user) {
      return { error: "User not found." };
    }

    const isOAuth = user.accounts.some((a) => a.provider === "google") || !user.password;
    if (isOAuth) {
      return { error: "Accounts registered via Google cannot change their email address here." };
    }

    if (!user.password) {
      return { error: "This account does not have a password set." };
    }

    if (!currentPassword) {
      return { error: "Current password is required." };
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return { error: "Current password is incorrect." };
    }

    if (user.email?.toLowerCase() === trimmedEmail) {
      return { error: "The new email address is the same as your current email address." };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail }
    });

    if (existingUser) {
      return { error: "This email address is already in use by another account." };
    }

    // Update user's email and reset verification status
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        email: trimmedEmail,
        emailVerified: null,
      }
    });

    // Generate token and send verification email to new address
    const verificationToken = await generateVerificationToken(trimmedEmail);
    await sendVerificationEmail(verificationToken.identifier, verificationToken.token, lang);

    revalidatePath("/profile/settings");
    revalidatePath("/profile");

    return {
      success: true,
      email: updatedUser.email
    };
  } catch (error) {
    console.error("Change email error:", error);
    return { error: "Failed to change email. Please try again." };
  }
}

export async function toggleFollowAction(artisanId: string, userId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.id !== userId) {
      return { error: "Unauthorized" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { following: { select: { id: true } } }
    });

    if (!user) return { error: "User not found" };

    const isFollowing = user.following.some(a => a.id === artisanId);

    if (isFollowing) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          following: {
            disconnect: { id: artisanId }
          }
        }
      });
      revalidatePath(`/artisans`);
      return { success: true, action: "unfollowed" };
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: {
          following: {
            connect: { id: artisanId }
          }
        }
      });
      revalidatePath(`/artisans`);
      return { success: true, action: "followed" };
    }
  } catch (error: any) {
    console.error("Toggle follow error:", error);
    return { error: `Follow failed: ${error.message || "Unknown Error"}` };
  }
}

export async function checkFollowStatus(artisanId: string, userId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.id !== userId) {
      return false;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        following: {
          where: { id: artisanId },
          select: { id: true }
        }
      }
    });

    return !!user?.following.length;
  } catch (error) {
    return false;
  }
}

export async function getUnreadMessageCount(userId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.id !== userId) {
      return 0;
    }

    const unreadCount = await prisma.message.count({
      where: {
        receiverId: userId,
        read: false
      }
    });
    return unreadCount;
  } catch (error) {
    return 0;
  }
}

export async function markMessagesAsRead(userId: string, senderId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.id !== userId) {
      return { success: false };
    }

    await prisma.message.updateMany({
      where: {
        receiverId: userId,
        senderId: senderId,
        read: false
      },
      data: {
        read: true
      }
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function sendCustomEmailAction(data: {
  to: string;
  subject: string;
  body: string;
  dir: 'ltr' | 'rtl';
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  templateStyle?: 'corporate' | 'artisan' | 'minimal';
}) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    let from: string | undefined;
    const email = data.fromEmail?.trim();
    let name = data.fromName?.trim() || "Giftisan";
    name = name.replace(/<[^>]*>/g, "").trim() || "Giftisan";

    if (email) {
      from = `${name} <${email}>`;
    }

    const replyTo = data.replyTo?.trim() || email || undefined;

    const result = await sendCustomEmail(data.to, data.subject, data.body, data.dir, {
      from,
      replyTo,
      templateStyle: data.templateStyle || 'corporate',
      senderName: name,
      senderEmail: email,
    });
    if (!result.success) {
      return { success: false, error: "Failed to send email via SMTP" };
    }
    return { success: true };
  } catch (error) {
    console.error("Send Custom Email Action Error:", error);
    return { success: false, error: "Internal Server Error" };
  }
}

export type AudienceGroup = 'artisans' | 'customers' | 'all' | 'subscribers';

export interface AudienceMember {
  email: string;
  name?: string | null;
  role?: string;
  detail?: string;
}

export async function getAudienceCountsAction(): Promise<{
  artisans: number;
  customers: number;
  allUsers: number;
  subscribers: number;
}> {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { artisans: 0, customers: 0, allUsers: 0, subscribers: 0 };
    }

    const [artisansCount, clientUsers, distinctOrderEmails, allUsersCount, subscribersCount] = await Promise.all([
      prisma.user.count({
        where: {
          email: { not: null },
          OR: [
            { role: "ARTISAN" },
            { artisanProfile: { isNot: null } }
          ]
        }
      }),
      prisma.user.findMany({
        where: {
          email: { not: null },
          OR: [
            { role: "CLIENT" },
            { orders: { some: {} } }
          ]
        },
        select: { email: true }
      }),
      prisma.order.findMany({
        where: { clientEmail: { not: null } },
        select: { clientEmail: true },
        distinct: ['clientEmail']
      }),
      prisma.user.count({
        where: { email: { not: null } }
      }),
      prisma.newsletterSubscriber.count()
    ]);

    const customerEmailSet = new Set<string>();
    for (const u of clientUsers) {
      if (u.email) customerEmailSet.add(u.email.trim().toLowerCase());
    }
    for (const o of distinctOrderEmails) {
      if (o.clientEmail) customerEmailSet.add(o.clientEmail.trim().toLowerCase());
    }

    return {
      artisans: artisansCount,
      customers: customerEmailSet.size,
      allUsers: allUsersCount,
      subscribers: subscribersCount,
    };
  } catch (error) {
    console.error("getAudienceCountsAction error:", error);
    return { artisans: 0, customers: 0, allUsers: 0, subscribers: 0 };
  }
}

export async function getAudienceRecipientsAction(
  target: AudienceGroup
): Promise<{ success: boolean; data?: AudienceMember[]; error?: string }> {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { success: false, error: "Unauthorized" };
    }

    const emailMap = new Map<string, AudienceMember>();

    if (target === 'artisans') {
      const artisans = await prisma.user.findMany({
        where: {
          email: { not: null },
          OR: [
            { role: "ARTISAN" },
            { artisanProfile: { isNot: null } }
          ]
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          artisanProfile: {
            select: {
              studioName: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      for (const a of artisans) {
        if (!a.email) continue;
        const normalized = a.email.trim().toLowerCase();
        if (!emailMap.has(normalized)) {
          emailMap.set(normalized, {
            email: a.email.trim(),
            name: a.name || a.artisanProfile?.studioName || null,
            role: "ARTISAN",
            detail: a.artisanProfile?.studioName ? `Studio: ${a.artisanProfile.studioName}` : "Artisan"
          });
        }
      }
    } else if (target === 'customers') {
      const clientUsers = await prisma.user.findMany({
        where: {
          email: { not: null },
          OR: [
            { role: "CLIENT" },
            { orders: { some: {} } }
          ]
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          _count: {
            select: { orders: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      for (const c of clientUsers) {
        if (!c.email) continue;
        const normalized = c.email.trim().toLowerCase();
        if (!emailMap.has(normalized)) {
          const orderCount = c._count?.orders || 0;
          emailMap.set(normalized, {
            email: c.email.trim(),
            name: c.name || null,
            role: "CLIENT",
            detail: orderCount > 0 ? `${orderCount} order${orderCount > 1 ? 's' : ''}` : "Registered Client"
          });
        }
      }

      const orders = await prisma.order.findMany({
        where: { clientEmail: { not: null } },
        select: {
          clientEmail: true,
        },
        distinct: ['clientEmail']
      });

      for (const o of orders) {
        if (!o.clientEmail) continue;
        const normalized = o.clientEmail.trim().toLowerCase();
        if (!emailMap.has(normalized)) {
          emailMap.set(normalized, {
            email: o.clientEmail.trim(),
            name: null,
            role: "CUSTOMER",
            detail: "Order Customer"
          });
        }
      }
    } else if (target === 'all') {
      const allUsers = await prisma.user.findMany({
        where: { email: { not: null } },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          artisanProfile: {
            select: {
              studioName: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      for (const u of allUsers) {
        if (!u.email) continue;
        const normalized = u.email.trim().toLowerCase();
        if (!emailMap.has(normalized)) {
          emailMap.set(normalized, {
            email: u.email.trim(),
            name: u.name || u.artisanProfile?.studioName || null,
            role: u.role,
            detail: u.artisanProfile?.studioName ? `Studio: ${u.artisanProfile.studioName}` : u.role
          });
        }
      }
    } else if (target === 'subscribers') {
      const subscribers = await prisma.newsletterSubscriber.findMany({
        select: {
          id: true,
          email: true,
        },
        orderBy: { createdAt: 'desc' }
      });

      for (const s of subscribers) {
        if (!s.email) continue;
        const normalized = s.email.trim().toLowerCase();
        if (!emailMap.has(normalized)) {
          emailMap.set(normalized, {
            email: s.email.trim(),
            name: null,
            role: "SUBSCRIBER",
            detail: "Newsletter Subscriber"
          });
        }
      }
    }

    return {
      success: true,
      data: Array.from(emailMap.values())
    };
  } catch (error) {
    console.error("getAudienceRecipientsAction error:", error);
    return { success: false, error: "Failed to fetch audience recipients" };
  }
}



export async function bulkDeleteProducts(ids: string[]) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "You must be signed in to perform this action" };
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: true };
    }

    const isAdmin = session.user.role === "ADMIN";
    
    if (!isAdmin) {
      const artisan = await prisma.artisanProfile.findUnique({
        where: { userId: session.user.id }
      });

      if (!artisan) {
        return { error: "You must be an artisan to perform this action" };
      }

      // Verify that all products belong to this artisan
      const productsCount = await prisma.product.count({
        where: {
          id: { in: ids },
          artisanId: artisan.id
        }
      });

      if (productsCount !== ids.length) {
        return { error: "You are not authorized to remove some of these products" };
      }
    }

    // Archive products with historical order items to prevent cascade deletion of OrderItem records
    const productsWithOrders = await prisma.product.findMany({
      where: {
        id: { in: ids },
        orderItems: { some: {} },
      },
      select: { id: true },
    });
    const archiveIds = productsWithOrders.map((p) => p.id);
    const hardDeleteIds = ids.filter((id) => !archiveIds.includes(id));

    await prisma.$transaction([
      ...(archiveIds.length > 0
        ? [
            prisma.product.updateMany({
              where: { id: { in: archiveIds } },
              data: { status: "DRAFT", stock: 0, isFeatured: false },
            }),
            prisma.productVariant.updateMany({
              where: { productId: { in: archiveIds } },
              data: { stock: 0 },
            }),
          ]
        : []),
      ...(hardDeleteIds.length > 0
        ? [
            prisma.product.deleteMany({
              where: { id: { in: hardDeleteIds } },
            }),
          ]
        : []),
    ]);

    revalidatePath("/studio");
    revalidatePath("/");
    revalidatePath("/artisans");
    revalidateCatalog();
    revalidatePath("/categories");

    return { success: true, archivedCount: archiveIds.length };
  } catch (error) {
    console.error("Bulk delete error:", error);
    return { error: "Failed to remove products" };
  }
}

export async function bulkUpdateProductStatus(ids: string[], status: "PENDING" | "APPROVED" | "REJECTED" | "DRAFT") {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "You must be signed in to perform this action" };
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return { success: true };
    }

    if (!["PENDING", "APPROVED", "REJECTED", "DRAFT"].includes(status)) {
      return { error: "Invalid product status" };
    }

    const isAdmin = session.user.role === "ADMIN";
    let targetStatus = status;

    if (!isAdmin) {
      const artisan = await prisma.artisanProfile.findUnique({
        where: { userId: session.user.id }
      });

      if (!artisan) {
        return { error: "You must be an artisan to perform this action" };
      }

      // Verify that all products belong to this artisan
      const productsCount = await prisma.product.count({
        where: {
          id: { in: ids },
          artisanId: artisan.id
        }
      });

      if (productsCount !== ids.length) {
        return { error: "You are not authorized to update some of these products" };
      }

      // Non-admin artisans may only move items to DRAFT or submit for review (PENDING)
      targetStatus = status === "DRAFT" ? "DRAFT" : "PENDING";
    }

    await prisma.product.updateMany({
      where: {
        id: { in: ids }
      },
      data: {
        status: targetStatus,
        rejectionReason: null
      }
    });

    revalidatePath("/");
    revalidatePath("/categories");
    revalidatePath("/artisans");
    revalidatePath("/admin/products");
    revalidateCatalog();
    revalidatePath("/studio");
    return { success: true };
  } catch (error) {
    console.error("Bulk update status error:", error);
    return { error: "Failed to update products status" };
  }
}

export async function validateCouponAction(code: string, subtotal: number, items: any[] = []) {
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase().trim() }
    });

    if (!coupon) {
      return { error: "This coupon code does not exist." };
    }

    if (!coupon.isActive) {
      return { error: "This coupon is no longer active." };
    }

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return { error: "This coupon has expired." };
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return { error: "This coupon has reached its maximum usage limit." };
    }

    let discountableSubtotal = subtotal;

    if (coupon.artisanId) {
      // Filter items belonging to this artisan
      const artisanItems = items.filter(item => {
        // Handle both possible locations for artisanId
        const id = item.artisanId || item.artisan?.id;
        return id === coupon.artisanId;
      });

      if (artisanItems.length === 0) {
        return { error: "This coupon only applies to products from a specific artisan that are not in your cart." };
      }

      discountableSubtotal = artisanItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }

    if (coupon.minOrderAmount && discountableSubtotal < coupon.minOrderAmount) {
      return { error: `This coupon is only valid for ${coupon.artisanId ? "eligible items" : "orders"} of EGP ${coupon.minOrderAmount} or more.` };
    }

    let appliedDiscount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      appliedDiscount = discountableSubtotal * (coupon.discountValue / 100);
      if (coupon.maxDiscount && appliedDiscount > coupon.maxDiscount) {
        appliedDiscount = coupon.maxDiscount;
      }
    } else if (coupon.discountType === "FIXED") {
      appliedDiscount = coupon.discountValue;
    }

    // Round to 2 decimal places and clamp to discountableSubtotal
    appliedDiscount = Math.min(Math.round(appliedDiscount * 100) / 100, discountableSubtotal);

    return {
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        appliedDiscount
      }
    };
  } catch (error) {
    console.error("Validate coupon error:", error);
    return { error: "An error occurred during coupon validation." };
  }
}

export async function getCouponsAdminAction() {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" }
    });

    return { success: true, coupons };
  } catch (error: any) {
    console.error("Get coupons admin error:", error);
    return { error: error.message || "Failed to fetch coupons." };
  }
}

export async function toggleCouponStatusAction(couponId: string, isActive: boolean) {
  try {
    const session = await auth();
    if (!session?.user) return { error: "Unauthorized" };

    const isAdmin = session.user.role === "ADMIN";
    const isArtisan = session.user.role === "ARTISAN";

    if (!isAdmin && !isArtisan) {
      return { error: "Unauthorized" };
    }

    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId }
    });

    if (!coupon) return { error: "Coupon not found" };

    if (!isAdmin) {
      const artisan = await prisma.artisanProfile.findUnique({
        where: { userId: session.user.id }
      });
      if (!artisan || coupon.artisanId !== artisan.id) {
        return { error: "Unauthorized" };
      }
    }

    const updated = await prisma.coupon.update({
      where: { id: couponId },
      data: { isActive }
    });

    revalidatePath("/studio");
    revalidatePath("/admin/coupons");
    return { success: true, coupon: updated };
  } catch (error: any) {
    console.error("Toggle coupon error:", error);
    return { error: error.message || "Failed to update coupon status." };
  }
}

export async function createCouponAction(data: {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  maxUses?: number;
  expiresAt?: string | null;
  artisanId?: string;
}) {
  try {
    const session = await auth();
    if (!session?.user) return { error: "Unauthorized" };

    const isAdmin = session.user.role === "ADMIN";
    const isArtisan = session.user.role === "ARTISAN";

    if (!isAdmin && !isArtisan) {
      return { error: "Unauthorized" };
    }

    if (!data.code || !data.code.trim()) {
      return { error: "Coupon code is required" };
    }

    const cleanCode = data.code.toUpperCase().trim();
    const exists = await prisma.coupon.findUnique({
      where: { code: cleanCode }
    });

    if (exists) {
      return { error: "A coupon code with this name already exists" };
    }

    let artisanId = data.artisanId;
    if (isArtisan && !isAdmin) {
      const artisan = await prisma.artisanProfile.findUnique({
        where: { userId: session.user.id }
      });
      artisanId = artisan?.id;
    }

    const newCoupon = await prisma.coupon.create({
      data: {
        code: cleanCode,
        discountType: data.discountType,
        discountValue: Number(data.discountValue),
        minOrderAmount: data.minOrderAmount ? Number(data.minOrderAmount) : null,
        maxDiscount: data.maxDiscount ? Number(data.maxDiscount) : null,
        maxUses: data.maxUses ? Number(data.maxUses) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: true,
        usedCount: 0,
        artisanId: artisanId || null
      }
    });

    revalidatePath("/studio");
    revalidatePath("/admin/coupons");
    return { success: true, coupon: newCoupon };
  } catch (error: any) {
    console.error("Create coupon error:", error);
    return { error: error.message || "Failed to create coupon." };
  }
}

// --- SHIPPING METHODS MANAGEMENT ---

export async function getAllShippingMethods() {
  try {
    let methods = await prisma.shippingMethod.findMany({
      orderBy: { price: "asc" }
    });

    if (methods.length === 0) {
      await prisma.shippingMethod.createMany({
        data: [
          { name: "Cairo & Giza", price: 84, estimatedDays: "1–2 Business Days", isActive: true },
          { name: "Delta & Canal Cities", price: 96, estimatedDays: "2–3 Business Days", isActive: true },
          { name: "Upper Egypt", price: 108, estimatedDays: "3–5 Business Days", isActive: true }
        ]
      });
      methods = await prisma.shippingMethod.findMany({
        orderBy: { price: "asc" }
      });
    }

    return methods;
  } catch (error) {
    console.error("Fetch shipping methods error:", error);
    return [];
  }
}

export async function createShippingMethod(data: { name: string; price: number; estimatedDays?: string }) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" };

    const method = await prisma.shippingMethod.create({
      data: {
        name: data.name,
        price: Number(data.price),
        estimatedDays: data.estimatedDays,
        isActive: true
      }
    });

    revalidatePath("/admin/shipping");
    return { success: true, method };
  } catch (error: any) {
    return { error: error.message || "Failed to create shipping method" };
  }
}

export async function updateShippingMethod(id: string, data: { name: string; price: number; estimatedDays?: string }) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" };

    const method = await prisma.shippingMethod.update({
      where: { id },
      data: {
        name: data.name,
        price: Number(data.price),
        estimatedDays: data.estimatedDays
      }
    });

    revalidatePath("/admin/shipping");
    return { success: true, method };
  } catch (error: any) {
    return { error: error.message || "Failed to update shipping method" };
  }
}

export async function toggleShippingMethod(id: string, isActive: boolean) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" };

    await prisma.shippingMethod.update({
      where: { id },
      data: { isActive }
    });

    revalidatePath("/admin/shipping");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to toggle shipping method" };
  }
}

export async function deleteShippingMethod(id: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" };

    await prisma.shippingMethod.delete({
      where: { id }
    });

    revalidatePath("/admin/shipping");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to delete shipping method" };
  }
}

export async function replyToReview(reviewId: string, reply: string) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ARTISAN") {
      return { error: "Only artisans can reply to reviews." };
    }

    const artisan = await prisma.artisanProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!artisan) return { error: "Artisan profile not found." };

    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { product: true }
    });

    if (!review) return { error: "Review not found." };
    if (review.product.artisanId !== artisan.id) {
      return { error: "You can only reply to reviews for your own products." };
    }

    await prisma.review.update({
      where: { id: reviewId },
      data: {
        artisanReply: reply,
        artisanReplyDate: new Date()
      }
    });

    revalidatePath("/studio");
    revalidatePath(`/products/${review.product.slug || review.product.id}`);

    return { success: true };
  } catch (error) {
    console.error("Reply to review error:", error);
    return { error: "Failed to post reply." };
  }
}

export async function updateOrderItemNotes(orderItemId: string, notes: string) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ARTISAN") {
      return { error: "Unauthorized" };
    }

    const artisan = await prisma.artisanProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!artisan) return { error: "Artisan profile not found." };

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: { product: true }
    });

    if (!orderItem) return { error: "Order item not found." };
    if (orderItem.product.artisanId !== artisan.id) {
      return { error: "Unauthorized" };
    }

    await prisma.orderItem.update({
      where: { id: orderItemId },
      data: { artisanNotes: notes }
    });

    revalidatePath("/studio");
    return { success: true };
  } catch (error) {
    console.error("Update order item notes error:", error);
    return { error: "Failed to update notes." };
  }
}

export async function getArtisanCoupons(artisanId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];

    if (session.user.role !== "ADMIN") {
      const artisan = await prisma.artisanProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!artisan || artisan.id !== artisanId) {
        return [];
      }
    }

    const coupons = await prisma.coupon.findMany({
      where: { artisanId },
      orderBy: { createdAt: 'desc' }
    });
    return coupons;
  } catch (error) {
    console.error("Get artisan coupons error:", error);
    return [];
  }
}

export async function deleteArtisanCoupon(couponId: string) {
  try {
    const session = await auth();
    if (!session?.user) return { error: "Unauthorized" };

    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId }
    });

    if (!coupon) return { error: "Coupon not found" };

    // Check if user is owner of the coupon
    const artisan = await prisma.artisanProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (session.user.role !== "ADMIN" && coupon.artisanId !== artisan?.id) {
      return { error: "Unauthorized" };
    }

    await prisma.coupon.delete({
      where: { id: couponId }
    });

    revalidatePath("/studio");
    return { success: true };
  } catch (error) {
    console.error("Delete coupon error:", error);
    return { error: "Failed to delete coupon" };
  }
}

export async function submitRefundRequestAction({
  orderId,
  orderItemId,
  reason,
  details,
  images,
  preferredAction,
  lang = 'en'
}: {
  orderId: string;
  orderItemId?: string;
  reason: 'DAMAGED_IN_TRANSIT' | 'DEFECTIVE_OR_WRONG_ITEM' | 'NOT_AS_DESCRIBED' | 'ORDER_NOT_RECEIVED' | 'OTHER';
  details: string;
  images: string[];
  preferredAction: 'REFUND' | 'REPLACEMENT';
  lang?: 'ar' | 'en';
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: lang === 'ar' ? "يرجى تسجيل الدخول أولاً" : "Please sign in to submit a claim" };
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order || order.userId !== session.user.id) {
      return { error: lang === 'ar' ? "الطلب غير موجود أو غير مصرح به" : "Order not found or unauthorized" };
    }

    // Eligibility Guard: Check Order Status
    if (order.status === "PENDING") {
      return {
        error: lang === 'ar'
          ? "هذا الطلب بانتظار الدفع، يمكنك إلغاؤه مباشرة دون الحاجة لطلب استرجاع."
          : "This order is awaiting payment. You can cancel it directly without submitting a claim."
      };
    }

    if (order.status === "CANCELLED") {
      return {
        error: lang === 'ar'
          ? "هذا الطلب ملغي بالفعل."
          : "This order has already been cancelled."
      };
    }

    // Check 14-day dispute window if delivered
    if (order.status === "DELIVERED") {
      const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;
      const orderAge = new Date().getTime() - new Date(order.updatedAt).getTime();
      if (orderAge > fourteenDaysInMs) {
        return {
          error: lang === 'ar'
            ? "تجاوز هذا الطلب مهلة الاسترجاع المسموحة (14 يوماً من تاريخ الاستلام)."
            : "This order has exceeded the 14-day dispute and return window from delivery date."
        };
      }
    }

    // Process and upload images
    const uploadedImages: string[] = [];
    for (const img of images) {
      const processed = await processImage(img);
      if (processed) uploadedImages.push(processed);
    }

    // Check if there is an existing pending refund request for this order/orderItem
    const existing = await prisma.refundRequest.findFirst({
      where: {
        orderId,
        orderItemId: orderItemId || null,
        status: "PENDING"
      }
    });

    if (existing) {
      return { error: lang === 'ar' ? "يوجد طلب قيد المراجعة بالفعل لهذا المنتج" : "A claim is already pending review for this item" };
    }

    const targetItem = orderItemId ? order.items.find(i => i.id === orderItemId) : (order.items.length === 1 ? order.items[0] : null);

    const refundRequest = await prisma.refundRequest.create({
      data: {
        orderId,
        orderItemId: orderItemId || null,
        userId: session.user.id,
        reason,
        details,
        images: uploadedImages,
        preferredAction,
        status: "PENDING",
        refundAmount: targetItem ? targetItem.price * targetItem.quantity : order.totalAmount
      }
    });

    // Send confirmation email
    const email = order.user?.email || order.clientEmail;
    if (email) {
      const customerName = order.user?.name || "Valued Client";
      const reasonLabels: Record<string, string> = {
        DAMAGED_IN_TRANSIT: lang === 'ar' ? "تلف أثناء الشحن" : "Damaged in transit",
        DEFECTIVE_OR_WRONG_ITEM: lang === 'ar' ? "منتج تالف أو خاطئ" : "Defective or wrong item",
        NOT_AS_DESCRIBED: lang === 'ar' ? "مختلف عن الوصف" : "Not as described",
        ORDER_NOT_RECEIVED: lang === 'ar' ? "لم يتم استلام الطلب" : "Order not received",
        OTHER: lang === 'ar' ? "سبب آخر" : "Other"
      };

      await sendRefundRequestSubmittedEmail({
        email,
        customerName,
        orderId,
        productName: targetItem?.product?.name,
        reason: reasonLabels[reason] || reason,
        preferredAction,
        ticketId: refundRequest.id,
        lang
      });
    }

    revalidatePath(`/${lang}/profile`);
    revalidatePath(`/${lang}/admin`);
    revalidatePath(`/${lang}/admin/refunds`);
    revalidatePath(`/${lang}/admin/orders`);
    return { success: true, refundRequest };
  } catch (error: any) {
    console.error("submitRefundRequest error:", error);
    return { error: error.message || "Failed to submit refund claim" };
  }
}

export async function getAdminRefundRequestsAction() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  try {
    const claims = await prisma.refundRequest.findMany({
      include: {
        user: true,
        order: {
          include: {
            items: {
              include: {
                product: {
                  include: {
                    artisan: {
                      include: {
                        user: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        orderItem: {
          include: {
            product: {
              include: {
                artisan: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return { success: true, claims };
  } catch (error: any) {
    console.error("getAdminRefundRequests error:", error);
    return { error: "Failed to fetch refund claims" };
  }
}

export async function resolveRefundRequestAction({
  requestId,
  action,
  adminNote,
  lang = 'en'
}: {
  requestId: string;
  action: 'APPROVE' | 'REJECT' | 'REPLACEMENT';
  adminNote?: string;
  lang?: 'ar' | 'en';
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  if (!["APPROVE", "REJECT", "REPLACEMENT"].includes(action)) {
    return { error: "Invalid refund resolution action" };
  }

  try {
    const claim = await prisma.refundRequest.findUnique({
      where: { id: requestId },
      include: {
        user: true,
        order: {
          include: {
            user: true,
            items: {
              include: {
                product: {
                  include: {
                    artisan: true
                  }
                }
              }
            }
          }
        },
        orderItem: {
          include: {
            product: {
              include: {
                artisan: true
              }
            }
          }
        }
      }
    });

    if (!claim || !claim.order) {
      return { error: "Refund claim or associated order not found" };
    }

    if (claim.status !== "PENDING") {
      return { error: "This refund claim has already been resolved and cannot be modified." };
    }

    const statusMap = {
      APPROVE: "APPROVED" as const,
      REJECT: "REJECTED" as const,
      REPLACEMENT: "REPLACEMENT_ISSUED" as const,
    };

    const newStatus = statusMap[action];

    const result = await prisma.$transaction(async (tx) => {
      // 1. Atomically claim the PENDING refund request to prevent concurrent double-refunds
      const claimed = await tx.refundRequest.updateMany({
        where: { id: requestId, status: "PENDING" },
        data: {
          status: newStatus,
          adminNote: adminNote || null
        }
      });

      if (claimed.count === 0) {
        throw new Error("This refund claim has already been resolved.");
      }

      const updatedClaim = await tx.refundRequest.findUnique({
        where: { id: requestId }
      });

      // 2. Financial Debit & Status Synchronization on APPROVE
      if (action === "APPROVE") {
        if (claim.orderItemId) {
          // A. Item-Level Refund
          await tx.orderItem.update({
            where: { id: claim.orderItemId },
            data: { status: "REFUNDED" }
          });

          // Restore item stock
          const targetItem = claim.orderItem || claim.order.items.find(i => i.id === claim.orderItemId);
          if (targetItem) {
            if (targetItem.variantId) {
              await tx.productVariant.update({
                where: { id: targetItem.variantId },
                data: { stock: { increment: targetItem.quantity } }
              });
            } else if (targetItem.productId) {
              await tx.product.update({
                where: { id: targetItem.productId },
                data: { stock: { increment: targetItem.quantity } }
              });
            }
          }

          // Check if all items in the order are now refunded
          const remainingUnrefunded = await tx.orderItem.count({
            where: {
              orderId: claim.orderId,
              id: { not: claim.orderItemId },
              status: { not: "REFUNDED" }
            }
          });

          if (remainingUnrefunded === 0) {
            await tx.order.update({
              where: { id: claim.orderId },
              data: { status: "REFUNDED" }
            });

            // Mark SALE transactions as FAILED so escrow cron doesn't process them
            await tx.artisanTransaction.updateMany({
              where: {
                orderId: claim.orderId,
                type: "SALE",
                status: "PENDING"
              },
              data: { status: "FAILED" }
            });
          }

          // Debit specific artisan
          if (targetItem?.product?.artisan) {
            const artisan = targetItem.product.artisan;
            const itemTotal = targetItem.price * targetItem.quantity;
            const commission = getEffectiveArtisanCommissionRate(artisan);
            const artisanShare = Math.round(itemTotal * (1 - commission) * 100) / 100;

            // Check if there are sale transactions for this order
            const saleTxs = await tx.artisanTransaction.findMany({
              where: {
                orderId: claim.orderId,
                artisanId: artisan.id,
                type: "SALE",
                status: { in: ["PENDING", "CLEARED"] }
              }
            });

            const pendingSaleTx = saleTxs.find(t => t.status === "PENDING");
            const hasPendingSale = Boolean(pendingSaleTx);

            // Sync this artisan's PENDING SALE transaction so escrow cron never over-clears
            const remainingArtisanItems = await tx.orderItem.count({
              where: {
                orderId: claim.orderId,
                id: { not: claim.orderItemId },
                status: { not: "REFUNDED" },
                product: { artisanId: artisan.id }
              }
            });

            if (remainingArtisanItems === 0) {
              await tx.artisanTransaction.updateMany({
                where: {
                  orderId: claim.orderId,
                  artisanId: artisan.id,
                  type: "SALE",
                  status: "PENDING"
                },
                data: { status: "FAILED" }
              });
            } else if (pendingSaleTx) {
              const reducedSaleAmount = Math.max(0, Math.round((Math.abs(pendingSaleTx.amount) - artisanShare) * 100) / 100);
              await tx.artisanTransaction.update({
                where: { id: pendingSaleTx.id },
                data: reducedSaleAmount <= 0 ? { status: "FAILED" } : { amount: reducedSaleAmount }
              });
            }

            const balance = await tx.artisanBalance.findUnique({
              where: { artisanId: artisan.id }
            });

            if (balance) {
              if (hasPendingSale) {
                const newPending = Math.max(0, Math.round((balance.pending - artisanShare) * 100) / 100);
                await tx.artisanBalance.update({
                  where: { artisanId: artisan.id },
                  data: { pending: newPending }
                });
              } else {
                // Allow withdrawable to go negative on CLEARED post-escrow refunds so future sales recover the debt
                const newWithdrawable = Math.round((balance.withdrawable - artisanShare) * 100) / 100;
                await tx.artisanBalance.update({
                  where: { artisanId: artisan.id },
                  data: { withdrawable: newWithdrawable }
                });
              }
            } else if (!hasPendingSale && saleTxs.length > 0) {
              await tx.artisanBalance.create({
                data: {
                  artisanId: artisan.id,
                  pending: 0,
                  withdrawable: -artisanShare,
                  withdrawn: 0
                }
              });
            }

            // Create REFUND_DEBIT transaction log
            await tx.artisanTransaction.create({
              data: {
                artisanId: artisan.id,
                orderId: claim.orderId,
                amount: -artisanShare,
                type: "REFUND_DEBIT",
                status: "COMPLETED",
                description: `Refund debited for dispute #${claim.id} ("${targetItem.product.name}" Qty: ${targetItem.quantity})`
              }
            });
          }
        } else {
          // B. Full-Order Refund (all items via shared atomic service)
          await tx.order.update({
            where: { id: claim.orderId },
            data: { status: "REFUNDED" }
          });

          await processOrderRefundInTx(tx, claim.orderId);
        }
      }

      return updatedClaim;
    });

    // Send resolution email to customer
    const customerEmail = claim.user?.email || claim.order?.clientEmail;
    const customerName = claim.user?.name || "Valued Client";
    if (customerEmail) {
      await sendRefundResolvedEmail({
        email: customerEmail,
        customerName,
        orderId: claim.orderId,
        status: newStatus,
        adminNote,
        refundAmount: claim.refundAmount || undefined,
        lang
      });
    }

    revalidatePath(`/${lang}/admin`);
    revalidatePath(`/${lang}/admin/refunds`);
    revalidatePath(`/${lang}/admin/orders`);
    revalidatePath(`/${lang}/profile`);
    revalidatePath(`/${lang}/studio`);
    return { success: true, claim: result };
  } catch (error: any) {
    console.error("resolveRefundRequest error:", error);
    return { error: error.message || "Failed to resolve claim" };
  }
}

// -----------------------------------------------------------------------------
// PLATFORM EXPENSES MANAGEMENT ACTIONS
// -----------------------------------------------------------------------------

function getExpenseDb() {
  return prisma;
}

export async function getPlatformExpensesAction({
  category,
  timeframe = "ALL",
  fundingStatus = "ALL",
  requestedBy = "ALL",
  search
}: {
  category?: string;
  timeframe?: "ALL" | "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR";
  fundingStatus?: "ALL" | "PENDING_TRANSFER" | "FUNDED" | "REJECTED";
  requestedBy?: "ALL" | "HAZEM" | "NOUR" | "MOHAMED";
  search?: string;
} = {}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  try {
    const db = getExpenseDb();
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const startOfThisYear = new Date(now.getFullYear(), 0, 1);

    const where: any = {};

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (fundingStatus && fundingStatus !== "ALL") {
      where.fundingStatus = fundingStatus;
    }

    if (requestedBy && requestedBy !== "ALL") {
      where.requestedBy = requestedBy;
    }

    if (timeframe === "THIS_MONTH") {
      where.date = { gte: startOfThisMonth };
    } else if (timeframe === "LAST_MONTH") {
      where.date = { gte: startOfLastMonth, lte: endOfLastMonth };
    } else if (timeframe === "THIS_YEAR") {
      where.date = { gte: startOfThisYear };
    }

    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { paidBy: { contains: search.trim(), mode: "insensitive" } },
        { notes: { contains: search.trim(), mode: "insensitive" } },
        { fundedBy: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    const expenses = await db.platformExpense.findMany({
      where,
      orderBy: { date: "desc" }
    });

    // Calculate aggregated financial summaries across all expenses
    const allExpenses = await db.platformExpense.findMany({
      select: {
        id: true,
        amount: true,
        category: true,
        date: true,
        fundingStatus: true,
        requestedBy: true,
      }
    });

    let totalSpent = 0;
    let thisMonthSpent = 0;
    let lastMonthSpent = 0;
    let totalFunded = 0;
    let pendingFunding = 0;
    let hazemFunded = 0;
    let hazemPending = 0;
    let nourFunded = 0;
    let nourPending = 0;
    let mohamedDirect = 0;
    const categoryTotals: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};

    for (const exp of allExpenses) {
      totalSpent += exp.amount;
      const expDate = new Date(exp.date);

      if (expDate >= startOfThisMonth) {
        thisMonthSpent += exp.amount;
      } else if (expDate >= startOfLastMonth && expDate <= endOfLastMonth) {
        lastMonthSpent += exp.amount;
      }

      const fStatus = exp.fundingStatus || "PENDING_TRANSFER";
      const rBy = exp.requestedBy || "HAZEM";

      if (fStatus === "FUNDED") {
        totalFunded += exp.amount;
        if (rBy === "HAZEM") hazemFunded += exp.amount;
        else if (rBy === "NOUR") nourFunded += exp.amount;
        else if (rBy === "MOHAMED") mohamedDirect += exp.amount;
      } else if (fStatus === "PENDING_TRANSFER") {
        pendingFunding += exp.amount;
        if (rBy === "HAZEM") hazemPending += exp.amount;
        else if (rBy === "NOUR") nourPending += exp.amount;
      }

      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
      categoryCounts[exp.category] = (categoryCounts[exp.category] || 0) + 1;
    }

    return {
      success: true,
      expenses,
      analytics: {
        totalSpent,
        totalFunded,
        pendingFunding,
        hazemFunded,
        hazemPending,
        nourFunded,
        nourPending,
        mohamedDirect,
        thisMonthSpent,
        lastMonthSpent,
        totalCount: allExpenses.length,
        categoryTotals,
        categoryCounts
      }
    };
  } catch (error: any) {
    console.error("getPlatformExpenses error:", error);
    return { error: "Failed to fetch platform expenses" };
  }
}

export async function createPlatformExpenseAction({
  title,
  category,
  amount,
  currency = "EGP",
  date,
  requestedBy = "HAZEM",
  fundingStatus = "PENDING_TRANSFER",
  fundedBy = "Mohamed",
  fundedAt,
  transferMethod,
  transferProofImage,
  paidBy,
  paymentMethod,
  receiptImage,
  notes,
  lang = "en"
}: {
  title: string;
  category: "MARKETING" | "PACKAGING_SUPPLIES" | "LOGISTICS_SHIPPING" | "SOFTWARE_SERVICES" | "EQUIPMENT_TOOLS" | "OFFICE_OPERATIONS" | "SALARIES_CONTRACTORS" | "OTHER";
  amount: number;
  currency?: string;
  date?: string;
  requestedBy?: "HAZEM" | "NOUR" | "MOHAMED";
  fundingStatus?: "PENDING_TRANSFER" | "FUNDED" | "REJECTED";
  fundedBy?: string;
  fundedAt?: string | null;
  transferMethod?: string;
  transferProofImage?: string;
  paidBy?: string;
  paymentMethod?: string;
  receiptImage?: string;
  notes?: string;
  lang?: string;
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  if (!title || !title.trim()) {
    return { error: lang === "ar" ? "يرجى كتابة اسم أو وصف المصروف" : "Expense title is required" };
  }

  if (isNaN(amount) || amount <= 0) {
    return { error: lang === "ar" ? "يرجى إدخال مبلغ صحيح أكبر من صفر" : "Valid positive expense amount is required" };
  }

  try {
    const db = getExpenseDb();
    let receiptUrl: string | null = null;
    if (receiptImage && receiptImage.startsWith("data:")) {
      receiptUrl = await processImage(receiptImage);
    } else if (receiptImage) {
      receiptUrl = receiptImage;
    }

    let transferProofUrl: string | null = null;
    if (transferProofImage && transferProofImage.startsWith("data:")) {
      transferProofUrl = await processImage(transferProofImage);
    } else if (transferProofImage) {
      transferProofUrl = transferProofImage;
    }

    const isFunded = fundingStatus === "FUNDED";

    const expense = await db.platformExpense.create({
      data: {
        title: title.trim(),
        category,
        amount: Number(amount),
        currency,
        date: date ? new Date(date) : new Date(),
        requestedBy,
        fundingStatus,
        fundedBy: isFunded ? (fundedBy || "Mohamed") : null,
        fundedAt: isFunded ? (fundedAt ? new Date(fundedAt) : new Date()) : null,
        transferMethod: transferMethod ? transferMethod.trim() : null,
        transferProofUrl,
        paidBy: paidBy ? paidBy.trim() : null,
        paymentMethod: paymentMethod ? paymentMethod.trim() : null,
        receiptUrl,
        notes: notes ? notes.trim() : null,
        createdById: session.user.id
      }
    });

    revalidatePath(`/${lang}/admin/expenses`);
    revalidatePath(`/${lang}/admin`);
    return { success: true, expense };
  } catch (error: any) {
    console.error("createPlatformExpense error:", error);
    return { error: error.message || "Failed to record platform expense" };
  }
}

export async function updatePlatformExpenseAction({
  id,
  title,
  category,
  amount,
  currency = "EGP",
  date,
  requestedBy,
  fundingStatus,
  fundedBy,
  fundedAt,
  transferMethod,
  transferProofImage,
  paidBy,
  paymentMethod,
  receiptImage,
  notes,
  lang = "en"
}: {
  id: string;
  title: string;
  category: "MARKETING" | "PACKAGING_SUPPLIES" | "LOGISTICS_SHIPPING" | "SOFTWARE_SERVICES" | "EQUIPMENT_TOOLS" | "OFFICE_OPERATIONS" | "SALARIES_CONTRACTORS" | "OTHER";
  amount: number;
  currency?: string;
  date?: string;
  requestedBy?: "HAZEM" | "NOUR" | "MOHAMED";
  fundingStatus?: "PENDING_TRANSFER" | "FUNDED" | "REJECTED";
  fundedBy?: string;
  fundedAt?: string | null;
  transferMethod?: string;
  transferProofImage?: string;
  paidBy?: string;
  paymentMethod?: string;
  receiptImage?: string;
  notes?: string;
  lang?: string;
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  if (!id) {
    return { error: "Expense ID is required" };
  }

  if (!title || !title.trim()) {
    return { error: lang === "ar" ? "يرجى كتابة اسم أو وصف المصروف" : "Expense title is required" };
  }

  if (isNaN(amount) || amount <= 0) {
    return { error: lang === "ar" ? "يرجى إدخال مبلغ صحيح أكبر من صفر" : "Valid positive expense amount is required" };
  }

  try {
    const db = getExpenseDb();
    let receiptUrl: string | null | undefined = undefined;
    if (receiptImage && receiptImage.startsWith("data:")) {
      receiptUrl = await processImage(receiptImage);
    } else if (receiptImage !== undefined) {
      receiptUrl = receiptImage || null;
    }

    let transferProofUrl: string | null | undefined = undefined;
    if (transferProofImage && transferProofImage.startsWith("data:")) {
      transferProofUrl = await processImage(transferProofImage);
    } else if (transferProofImage !== undefined) {
      transferProofUrl = transferProofImage || null;
    }

    const dataToUpdate: any = {
      title: title.trim(),
      category,
      amount: Number(amount),
      currency,
      date: date ? new Date(date) : undefined,
      paidBy: paidBy ? paidBy.trim() : null,
      paymentMethod: paymentMethod ? paymentMethod.trim() : null,
      notes: notes ? notes.trim() : null
    };

    if (requestedBy) dataToUpdate.requestedBy = requestedBy;
    if (fundingStatus) {
      dataToUpdate.fundingStatus = fundingStatus;
      if (fundingStatus === "FUNDED") {
        dataToUpdate.fundedBy = fundedBy || "Mohamed";
        dataToUpdate.fundedAt = fundedAt ? new Date(fundedAt) : new Date();
      } else {
        dataToUpdate.fundedAt = null;
      }
    }
    if (transferMethod !== undefined) dataToUpdate.transferMethod = transferMethod;
    if (receiptUrl !== undefined) dataToUpdate.receiptUrl = receiptUrl;
    if (transferProofUrl !== undefined) dataToUpdate.transferProofUrl = transferProofUrl;

    const updated = await db.platformExpense.update({
      where: { id },
      data: dataToUpdate
    });

    revalidatePath(`/${lang}/admin/expenses`);
    revalidatePath(`/${lang}/admin`);
    return { success: true, expense: updated };
  } catch (error: any) {
    console.error("updatePlatformExpense error:", error);
    return { error: error.message || "Failed to update expense" };
  }
}

export async function markExpenseAsFundedAction({
  id,
  transferMethod = "INSTAPAY",
  transferProofImage,
  notes,
  lang = "en"
}: {
  id: string;
  transferMethod?: string;
  transferProofImage?: string;
  notes?: string;
  lang?: string;
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  if (!id) {
    return { error: "Expense ID is required" };
  }

  try {
    const db = getExpenseDb();
    let transferProofUrl: string | null = null;
    if (transferProofImage && transferProofImage.startsWith("data:")) {
      transferProofUrl = await processImage(transferProofImage);
    } else if (transferProofImage) {
      transferProofUrl = transferProofImage;
    }

    const dataToUpdate: any = {
      fundingStatus: "FUNDED",
      fundedBy: "Mohamed",
      fundedAt: new Date(),
      transferMethod: transferMethod || "INSTAPAY",
    };

    if (transferProofUrl) {
      dataToUpdate.transferProofUrl = transferProofUrl;
    }
    if (notes && notes.trim()) {
      dataToUpdate.notes = notes.trim();
    }

    const updated = await db.platformExpense.update({
      where: { id },
      data: dataToUpdate
    });

    revalidatePath(`/${lang}/admin/expenses`);
    revalidatePath(`/${lang}/admin`);
    return { success: true, expense: updated };
  } catch (error: any) {
    console.error("markExpenseAsFunded error:", error);
    return { error: error.message || "Failed to mark expense as funded" };
  }
}

export async function deletePlatformExpenseAction(id: string, lang = "en") {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  if (!id) {
    return { error: "Expense ID is required" };
  }

  try {
    const db = getExpenseDb();
    await db.platformExpense.delete({
      where: { id }
    });

    revalidatePath(`/${lang}/admin/expenses`);
    revalidatePath(`/${lang}/admin`);
    return { success: true };
  } catch (error: any) {
    console.error("deletePlatformExpense error:", error);
    return { error: error.message || "Failed to delete expense" };
  }
}

export async function updateProductStockAction(productId: string, newStock: number, lang = "en") {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (!productId || typeof newStock !== "number" || isNaN(newStock)) {
    return { error: "Invalid product or stock value" };
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { artisan: true }
    });

    if (!product) {
      return { error: "Product not found" };
    }

    const isAdmin = session.user.role === "ADMIN";
    const isOwner = product.artisan.userId === session.user.id;

    if (!isAdmin && !isOwner) {
      return { error: "Forbidden: You do not have permission to edit this product" };
    }

    const sanitizedStock = Math.max(0, Math.floor(newStock));
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { stock: sanitizedStock }
    });

    revalidatePath(`/${lang}/studio`);
    revalidatePath(`/${lang}/products/${product.slug || product.id}`);
    revalidateCatalog(product.slug || product.id);
    return { success: true, stock: updated.stock };
  } catch (error: any) {
    console.error("updateProductStockAction error:", error);
    return { error: error.message || "Failed to update stock" };
  }
}

// ─── ADMIN: Get Abandoned Checkouts (Leads) ──────────────────────────────────
export async function getAbandonedCheckouts(options?: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { leads: [], total: 0 };
  }

  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;
  const skip = (page - 1) * pageSize;
  const statusFilter = options?.status;

  const where = statusFilter ? { status: statusFilter } : {};

  const [leads, total] = await Promise.all([
    prisma.abandonedCheckout.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.abandonedCheckout.count({ where }),
  ]);

  return { leads, total };
}

// ─── ADMIN: Update Abandoned Checkout Lead ───────────────────────────────────
export async function updateAbandonedCheckoutLead(
  id: string,
  data: { isContacted?: boolean; adminNotes?: string }
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "Unauthorized" };
  }

  try {
    await prisma.abandonedCheckout.update({
      where: { id },
      data: {
        ...(data.isContacted !== undefined && { isContacted: data.isContacted }),
        ...(data.adminNotes !== undefined && { adminNotes: data.adminNotes }),
      },
    });
    return { success: true };
  } catch (error: any) {
    return { error: error.message || "Failed to update lead" };
  }
}

// ─── PUBLIC: Order Tracking Service ──────────────────────────────────────────
export async function getPublicTrackedOrder(
  query: string,
  verificationInput?: string
) {
  try {
    const ip = await getClientIp();
    const rl = checkRateLimit(`track-order:${ip}`, 15, 60_000);
    if (!rl.success) {
      return { success: false, error: "Too many tracking requests. Please wait a minute and try again." };
    }

    const cleanQuery = (query || "").trim().replace(/^#/, "");
    if (!cleanQuery || cleanQuery.length > 100) {
      return { success: false, error: "Please enter a valid order number or tracking code." };
    }

    // Try finding by order ID, or tracking number
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: cleanQuery },
          { id: { equals: cleanQuery, mode: "insensitive" } },
          { trackingNumber: cleanQuery },
          { trackingNumber: { equals: cleanQuery, mode: "insensitive" } },
          { items: { some: { trackingNumber: cleanQuery } } }
        ]
      },
      include: {
        shippingMethod: true,
        items: {
          include: {
            variant: true,
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
                price: true,
                artisan: {
                  select: {
                    id: true,
                    studioName: true,
                    slug: true,
                    avatar: true,
                    isVerified: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!order) {
      return { success: false, error: "Order not found. Please verify your order number or tracking code." };
    }

    // Check user authentication
    const session = await auth();
    const isOwner = Boolean(session?.user?.id && order.userId === session.user.id);
    const isAdmin = session?.user?.role === "ADMIN";

    // Check verification input (full phone or exact email required; 4-digit brute-force bypass removed)
    let isVerified = isOwner || isAdmin;
    if (!isVerified && verificationInput) {
      const vClean = verificationInput.trim().toLowerCase();
      const clientEmail = (order.clientEmail || "").trim().toLowerCase();
      const clientPhoneDigits = (order.clientPhone || "").replace(/\D/g, "");
      const vDigits = vClean.replace(/\D/g, "");

      if (vClean && clientEmail && vClean === clientEmail) {
        isVerified = true;
      } else if (
        vDigits.length >= 10 &&
        clientPhoneDigits.length >= 10 &&
        (clientPhoneDigits === vDigits || clientPhoneDigits.slice(-10) === vDigits.slice(-10))
      ) {
        isVerified = true;
      }
    }

    const maskPhone = (phone: string | null | undefined) => {
      if (!phone) return "";
      const clean = phone.trim();
      if (clean.length < 6) return "••••";
      return clean.slice(0, 4) + "••••" + clean.slice(-3);
    };

    const maskEmail = (email: string | null | undefined) => {
      if (!email) return "";
      const [user, domain] = email.split("@");
      if (!domain) return "••••";
      return (user.length > 2 ? user.slice(0, 2) : user.slice(0, 1)) + "••••@" + domain;
    };

    const statusUpper = (order.status || "PENDING").toUpperCase();
    const hideGiftPricing = Boolean(!isVerified && order.isGift);

    // Estimate delivery dates based on shipping method and createdAt
    const createdAtDate = new Date(order.createdAt);
    const estimatedDaysMin = order.shippingMethod?.estimatedDays?.includes("2") ? 2 : 3;
    const estimatedDeliveryMin = new Date(createdAtDate.getTime() + estimatedDaysMin * 24 * 60 * 60 * 1000);
    const estimatedDeliveryMax = new Date(createdAtDate.getTime() + (estimatedDaysMin + 2) * 24 * 60 * 60 * 1000);

    return {
      success: true,
      order: {
        id: order.id,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        status: statusUpper,
        isGift: order.isGift,
        giftMessage: isVerified ? order.giftMessage : null,
        carrier: order.carrier || (order.trackingNumber ? "Bosta" : null),
        trackingNumber: order.trackingNumber,
        shippingMethodName: order.shippingMethod?.name || "Doorstep Courier Delivery",
        shippingCost: hideGiftPricing ? null : order.shippingCost,
        totalAmount: hideGiftPricing ? null : order.totalAmount,
        discountApplied: hideGiftPricing ? 0 : (order.discountApplied || 0),
        estimatedDeliveryMin: estimatedDeliveryMin.toISOString(),
        estimatedDeliveryMax: estimatedDeliveryMax.toISOString(),
        shippingCity: order.shippingCity || "Cairo",
        shippingAddress: isVerified ? order.shippingAddress : (order.shippingCity ? `${order.shippingCity}, Egypt` : "Egypt"),
        clientPhone: isVerified ? order.clientPhone : maskPhone(order.clientPhone),
        clientEmail: isVerified ? order.clientEmail : maskEmail(order.clientEmail),
        isVerified,
        items: order.items.map(item => ({
          id: item.id,
          name: item.product?.name || "Handcrafted Creation",
          slug: item.product?.slug || item.product?.id,
          image: item.product?.images?.[0] || null,
          price: hideGiftPricing ? null : item.price,
          quantity: item.quantity,
          personalization: isVerified ? item.personalization : null,
          customImage: isVerified ? item.customImage : (item.customImage ? "uploaded" : null),
          variantName: item.variant?.name || null,
          status: item.status,
          trackingNumber: item.trackingNumber,
          carrier: item.carrier,
          artisan: item.product?.artisan ? {
            studioName: item.product.artisan.studioName,
            slug: item.product.artisan.slug,
            avatar: item.product.artisan.avatar,
            isVerified: item.product.artisan.isVerified
          } : null
        }))
      }
    };
  } catch (error: any) {
    console.error("Public track order error:", error);
    return { success: false, error: "Something went wrong while retrieving your order. Please try again." };
  }
}


