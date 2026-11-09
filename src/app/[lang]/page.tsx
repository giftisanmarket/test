import { prisma } from "@/lib/prisma";
import HomeClient from "@/components/home-client";
import { Metadata } from "next";
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "@/lib/constants";
import { getDictionary, hasLocale } from "./dictionaries";
import { notFound } from "next/navigation";
import { rankProductsWithDiversity, rankArtisansForSpotlight } from "@/lib/recommendations";

export const revalidate = 60; // ISR: Cache the landing page for 60 seconds to prevent database pool exhaustion

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang as any);
  const title = dict.seo?.title || SITE_NAME;
  const description = dict.seo?.description || SITE_DESCRIPTION;
  const canonicalUrl = `${SITE_URL}/${lang}`;
  const ogImageUrl = `${SITE_URL}/hero.webp`;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      absolute: title,
    },
    description,
    keywords: dict.seo?.keywords?.split(",").map((k: string) => k.trim()) || [
      "Egyptian handmade",
      "artisan marketplace Egypt",
      "Cairo handcrafted gifts",
      "Giftisan",
    ],
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-US": `${SITE_URL}/en`,
        "ar-EG": `${SITE_URL}/ar`,
        "x-default": `${SITE_URL}/en`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      locale: lang === "ar" ? "ar_EG" : "en_US",
      alternateLocale: lang === "ar" ? "en_US" : "ar_EG",
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: "Giftisan - Handcrafted Mastery",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

const EXCLUDED_HOMEPAGE_ARTISAN_SLUGS = [
  "studiopelle",
  "b-khashab",
  "bkhashab",
  "soft-stitch-hmnr",
];

function isExcludedHomepageArtisan(slug?: string | null, studioName?: string | null) {
  const s = (slug || "").toLowerCase().trim();
  const studio = (studioName || "").toLowerCase().trim();
  return (
    EXCLUDED_HOMEPAGE_ARTISAN_SLUGS.includes(s) ||
    s.includes("b-khashab") ||
    s.includes("bkhashab") ||
    s.includes("soft-stitch") ||
    studio === "studiopelle" ||
    studio === "soft stitch" ||
    studio.includes("بخشب") ||
    studio.includes("b-khashab") ||
    studio.includes("bkhashab")
  );
}

/**
 * Full category taxonomy aligned with EtsyCategoryPicker (`src/components/studio/etsy-category-picker.tsx`)
 * so every subcategory ID chosen on the Create New Product page maps to its proper homepage shelf.
 */
const HOMEPAGE_SHELF_CATEGORIES = {
  bagsAndLeather: [
    "bags-and-purses",
    "handbags",
    "totes",
    "backpacks",
    "wallets-money-clips",
    "pouches-coin-purses",
    "cosmetic-toiletry-storage",
    "luggage-travel",
    "fanny-packs",
    "messenger-bags",
    "market-bags",
    "accessory-cases",
    "food-insulated-bags",
    "clothing-shoe-bags",
    "diaper-bags",
    "sports-bags",
    "leatherwork",
    "Bags & Purses",
    "Handbags",
    "Totes",
    "Leatherwork",
  ],
  homeDecorAndArt: [
    "home-and-living",
    "home-decor",
    "lighting",
    "floor-rugs",
    "kitchen-dining",
    "furniture",
    "bathroom",
    "storage-organization",
    "outdoor-gardening",
    "curtains-window-treatments",
    "bedding",
    "office",
    "food-drink",
    "spirituality-religion",
    "home-improvement",
    "home-appliances",
    "cleaning-supplies",
    "woodwork",
    "ceramics",
    "glasswork",
    "metalwork",
    "basketry",
    "art-and-collectibles",
    "prints",
    "painting",
    "sculpture",
    "collectibles",
    "glass-art",
    "fine-art-ceramics",
    "photography",
    "drawing-illustration",
    "fiber-arts",
    "mixed-media-collage",
    "artist-trading-cards",
    "Home & Living",
    "Home Decor",
    "Ceramics",
    "Woodwork",
    "Art & Collectibles",
  ],
  jewelryAndAdornments: [
    "jewelry",
    "earrings",
    "necklaces",
    "rings",
    "bracelets",
    "watches",
    "jewelry-sets",
    "body-jewelry",
    "cremation-memorial-jewelry",
    "jewelry-storage",
    "brooches-pins-clips",
    "smart-jewelry",
    "cuff-links-tie-clips",
    "wedding-jewelry",
    "hair-accessories",
    "pins-clips",
    "sunglasses-eyewear",
    "suit-tie-accessories",
    "patches-applique",
    "belts-suspenders",
    "accessories",
    "Jewelry",
    "Accessories",
  ],
  clothingAndApparel: [
    "clothing",
    "womens-clothing",
    "mens-clothing",
    "boys-clothing",
    "girls-clothing",
    "gender-neutral-adult-clothing",
    "gender-neutral-kids-clothing",
    "wedding-clothing",
    "fashion",
    "textiles",
    "wearables",
    "scarves-wraps",
    "gloves-sleeves",
    "hats-headwear",
    "aprons",
    "collars",
    "costume-accessories",
    "face-masks-accessories",
    "baby-clothing",
    "baby-blankets",
    "womens-shoes",
    "mens-shoes",
    "girls-shoes",
    "boys-shoes",
    "wedding-shoes",
    "insoles-accessories",
    "shoes",
    "sewing-fiber",
    "Clothing",
    "Women's Clothing",
    "Men's Clothing",
    "Boys' Clothing",
    "Girls' Clothing",
    "Fashion",
    "Textiles",
    "Shoes",
  ],
  giftsAndCelebrations: [
    "gifts-sets",
    "gifts",
    "gift-boxes-sets",
    "personalized",
    "gifts-mementos",
    "decorations",
    "wedding-decorations",
    "wedding-accessories",
    "invitations-paper",
    "weddings",
    "wedding",
    "keychains-lanyards",
    "bouquets-corsages",
    "baby-gift-sets",
    "nursery-decor",
    "toys",
    "games-puzzles",
    "dolls-miniatures",
    "childrens-books",
    "sports-outdoor-recreation",
    "toys-and-games",
    "kids-and-baby",
    "party-supplies",
    "paper",
    "paper-and-party-supplies",
    "stationery",
    "books",
    "books-movies-and-music",
    "spa-relaxation",
    "fragrances",
    "skin-care",
    "soaps",
    "bath-accessories",
    "essential-oils",
    "bath-and-beauty",
    "cell-phone-accessories",
    "Gift Boxes & Sets",
    "Weddings",
    "Toys & Games",
    "Paper & Party Supplies",
    "Bath & Beauty",
  ],
};

const baseApprovedProductWhere = {
  status: "APPROVED" as const,
  artisan: {
    status: "APPROVED" as const,
    slug: { notIn: EXCLUDED_HOMEPAGE_ARTISAN_SLUGS },
    NOT: [
      { studioName: { equals: "StudioPelle", mode: "insensitive" as const } },
      { studioName: { contains: "بخشب", mode: "insensitive" as const } },
      { studioName: { contains: "b-khashab", mode: "insensitive" as const } },
      { slug: { contains: "b-khashab", mode: "insensitive" as const } },
    ]
  }
};

const productSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  stock: true,
  badge: true,
  images: true,
  isFeatured: true,
  category: true,
  canPersonalize: true,
  requiresClientImage: true,
  views: true,
  createdAt: true,
  _count: {
    select: {
      orderItems: true,
      favoritedBy: true,
      reviews: true,
    }
  },
  reviews: {
    select: {
      rating: true,
    }
  },
  artisan: {
    select: {
      id: true,
      studioName: true,
      slug: true,
      avatar: true,
      status: true,
      isVerified: true,
      user: {
        select: {
          name: true
        }
      }
    }
  }
};

const artisanSelect = {
  id: true,
  slug: true,
  status: true,
  studioName: true,
  location: true,
  avatar: true,
  bannerImage: true,
  brandColor: true,
  isVerified: true,
  _count: {
    select: {
      followers: true,
      products: {
        where: {
          status: "APPROVED" as const,
        },
      },
    },
  },
  user: {
    select: {
      name: true
    }
  },
  products: {
    where: {
      status: "APPROVED" as const
    },
    orderBy: [
      { isFeatured: "desc" as const },
      { views: "desc" as const },
      { createdAt: "desc" as const }
    ],
    take: 3,
    select: {
      id: true,
      slug: true,
      images: true,
      name: true,
      status: true,
      price: true,
      views: true,
      _count: {
        select: {
          orderItems: true,
          favoritedBy: true
        }
      },
      reviews: {
        select: {
          rating: true
        }
      }
    }
  }
};

function sanitizeProducts(productsList: any[]) {
  return productsList
    .filter(p => !isExcludedHomepageArtisan(p.artisan?.slug, p.artisan?.studioName))
    .map(p => {
      const { _count, reviews, createdAt, ...rest } = p;
      const reviewList = Array.isArray(reviews) ? reviews : [];
      const reviewCount = _count?.reviews ?? reviewList.length;
      const avgRating =
        reviewList.length > 0
          ? Number(
              (
                reviewList.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) /
                reviewList.length
              ).toFixed(1)
            )
          : undefined;

      return {
        ...rest,
        createdAt: createdAt instanceof Date ? createdAt.toISOString() : createdAt,
        ordersCount: _count?.orderItems ?? 0,
        favoritesCount: _count?.favoritedBy ?? 0,
        reviewCount,
        avgRating,
        // Keep top 2 images only to prevent huge JSON serialization overhead
        images: Array.isArray(p.images)
          ? p.images
              .slice(0, 2)
              .map((img: string) => ((img?.length || 0) > 60000 ? "" : img))
          : [],
        artisan: {
          ...p.artisan,
          avatar: (p.artisan?.avatar?.length || 0) > 60000 ? "" : p.artisan?.avatar
        }
      };
    });
}

function sanitizeArtisans(artisansList: any[]) {
  return artisansList
    .filter(a => !isExcludedHomepageArtisan(a.slug, a.studioName))
    .map(a => {
      const { _count, ...rest } = a;
      return {
        ...rest,
        avatar: (a.avatar?.length || 0) > 60000 ? "" : a.avatar,
        bannerImage: (a.bannerImage?.length || 0) > 60000 ? "" : a.bannerImage,
        products: (a.products || []).map((p: any) => {
          const { _count: pCount, ...pRest } = p;
          return {
            ...pRest,
            images: Array.isArray(p.images)
              ? p.images.slice(0, 1).map((img: string) => ((img?.length || 0) > 60000 ? "" : img))
              : [],
          };
        })
      };
    });
}

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  
  const dict = await getDictionary(lang as any);

  // Fetch candidate product pools and featured artisans concurrently in parallel
  const [
    rawCatalogCandidates,
    rawPersonalizedCandidates,
    rawNewArrivalsCandidates,
    rawBagCandidates,
    rawHomeDecorCandidates,
    rawJewelryCandidates,
    rawCrochetApparelCandidates,
    rawGiftSetCandidates,
    featuredArtisans,
    artisanCount
  ] = await Promise.all([
    // 1. Broad Marketplace Candidate Pool for Native Feed, Hero Spotlight & Top Trending (up to 48 items, Most Ordered + Newest first)
    prisma.product.findMany({
      where: baseApprovedProductWhere,
      select: productSelect,
      take: 48,
      orderBy: [
        { orderItems: { _count: 'desc' } },
        { createdAt: 'desc' }
      ]
    }),

    // 2. Personalizable & Custom Made-to-Order Gifts (up to 24 candidates)
    prisma.product.findMany({
      where: {
        ...baseApprovedProductWhere,
        OR: [
          { canPersonalize: true },
          { requiresClientImage: true }
        ]
      },
      select: productSelect,
      take: 24,
      orderBy: [
        { isFeatured: 'desc' },
        { views: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 3. Fresh From the Studios / New Arrivals Pool (up to 24 newest items)
    prisma.product.findMany({
      where: baseApprovedProductWhere,
      select: productSelect,
      take: 24,
      orderBy: [
        { createdAt: 'desc' }
      ]
    }),

    // 4. Handcrafted Bags & Leather Goods (up to 24 candidates)
    prisma.product.findMany({
      where: {
        ...baseApprovedProductWhere,
        OR: [
          { category: { in: HOMEPAGE_SHELF_CATEGORIES.bagsAndLeather, mode: "insensitive" } },
          { subcategory: { in: HOMEPAGE_SHELF_CATEGORIES.bagsAndLeather, mode: "insensitive" } },
        ]
      },
      select: productSelect,
      take: 24,
      orderBy: [
        { isFeatured: 'desc' },
        { views: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 5. Artisan Ceramics, Woodwork & Home Collectibles (up to 24 candidates)
    prisma.product.findMany({
      where: {
        ...baseApprovedProductWhere,
        OR: [
          { category: { in: HOMEPAGE_SHELF_CATEGORIES.homeDecorAndArt, mode: "insensitive" } },
          { subcategory: { in: HOMEPAGE_SHELF_CATEGORIES.homeDecorAndArt, mode: "insensitive" } },
        ]
      },
      select: productSelect,
      take: 24,
      orderBy: [
        { isFeatured: 'desc' },
        { views: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 6. Bespoke Jewelry & Adornments (up to 24 candidates, excluding wallets/cardholders/bags placed in generic accessories)
    prisma.product.findMany({
      where: {
        ...baseApprovedProductWhere,
        AND: [
          {
            OR: [
              { category: { in: HOMEPAGE_SHELF_CATEGORIES.jewelryAndAdornments, mode: "insensitive" } },
              { subcategory: { in: HOMEPAGE_SHELF_CATEGORIES.jewelryAndAdornments, mode: "insensitive" } },
            ],
          },
          {
            NOT: [
              { name: { contains: "card holder", mode: "insensitive" } },
              { name: { contains: "cardholder", mode: "insensitive" } },
              { name: { contains: "wallet", mode: "insensitive" } },
              { name: { contains: "محفظة", mode: "insensitive" } },
              { name: { contains: "كارت", mode: "insensitive" } },
              { name: { contains: "شنطة", mode: "insensitive" } },
            ],
          },
        ],
      },
      select: productSelect,
      take: 24,
      orderBy: [
        { isFeatured: 'desc' },
        { views: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 7. Handmade Crochet, Knits & Apparel (up to 24 candidates across all clothing/wearable subcategories)
    prisma.product.findMany({
      where: {
        ...baseApprovedProductWhere,
        AND: [
          {
            category: {
              notIn: [
                "bags-and-purses",
                "handbags",
                "totes",
                "backpacks",
                "wallets-money-clips",
                "pouches-coin-purses",
                "leatherwork",
              ],
            },
          },
          {
            OR: [
              { category: { in: HOMEPAGE_SHELF_CATEGORIES.clothingAndApparel, mode: "insensitive" } },
              { subcategory: { in: HOMEPAGE_SHELF_CATEGORIES.clothingAndApparel, mode: "insensitive" } },
              { name: { contains: "بلوزة", mode: "insensitive" } },
              { name: { contains: "فستان", mode: "insensitive" } },
              { name: { contains: "شال", mode: "insensitive" } },
              { name: { contains: "جوانتي", mode: "insensitive" } },
              { name: { contains: "طاقية", mode: "insensitive" } },
              { name: { contains: "قبعة", mode: "insensitive" } },
              { name: { contains: "سليبر", mode: "insensitive" } },
              { name: { contains: "لكلوك", mode: "insensitive" } },
              { name: { contains: "كارديجان", mode: "insensitive" } },
              { name: { contains: "بلوفر", mode: "insensitive" } },
              { name: { contains: "كوفية", mode: "insensitive" } },
              { name: { contains: "وشاح", mode: "insensitive" } },
              { name: { contains: "طرحة", mode: "insensitive" } },
              { name: { contains: "عباية", mode: "insensitive" } },
              { name: { contains: "قميص", mode: "insensitive" } },
              { name: { contains: "جاكيت", mode: "insensitive" } },
              { name: { contains: "هودي", mode: "insensitive" } },
              { name: { contains: "سويت شيرت", mode: "insensitive" } },
              { name: { contains: "جيبة", mode: "insensitive" } },
              { name: { contains: "تنورة", mode: "insensitive" } },
              { name: { contains: "سلوبت", mode: "insensitive" } },
              { name: { contains: "ملابس", mode: "insensitive" } },
              { name: { contains: "توب", mode: "insensitive" } },
              { name: { contains: "cardigan", mode: "insensitive" } },
              { name: { contains: "sweater", mode: "insensitive" } },
              { name: { contains: "shawl", mode: "insensitive" } },
              { name: { contains: "scarf", mode: "insensitive" } },
              { name: { contains: "dress", mode: "insensitive" } },
              { name: { contains: "blouse", mode: "insensitive" } },
              { name: { contains: "gloves", mode: "insensitive" } },
              { name: { contains: "beanie", mode: "insensitive" } },
              { name: { contains: "hoodie", mode: "insensitive" } },
              { name: { contains: "shirt", mode: "insensitive" } },
              { name: { contains: "skirt", mode: "insensitive" } },
              { name: { contains: "kimono", mode: "insensitive" } },
              { name: { contains: "abaya", mode: "insensitive" } },
            ],
          },
        ],
      },
      select: productSelect,
      take: 24,
      orderBy: [
        { isFeatured: 'desc' },
        { views: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 8. Curated Gift Sets & Keepsakes (up to 24 candidates)
    prisma.product.findMany({
      where: {
        ...baseApprovedProductWhere,
        OR: [
          { category: { in: HOMEPAGE_SHELF_CATEGORIES.giftsAndCelebrations, mode: "insensitive" } },
          { subcategory: { in: HOMEPAGE_SHELF_CATEGORIES.giftsAndCelebrations, mode: "insensitive" } },
        ]
      },
      select: productSelect,
      take: 24,
      orderBy: [
        { isFeatured: 'desc' },
        { views: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 9. Dynamic Quality-Gated Artisan Spotlight Pool (active makers with approved in-stock products)
    prisma.artisanProfile.findMany({
      where: {
        status: "APPROVED",
        isAcceptingOrders: true,
        slug: { notIn: ["moon-by-alila-wmp4", ...EXCLUDED_HOMEPAGE_ARTISAN_SLUGS] },
        NOT: [
          { studioName: { equals: "StudioPelle", mode: "insensitive" } },
          { studioName: { contains: "بخشب", mode: "insensitive" } },
          { studioName: { contains: "b-khashab", mode: "insensitive" } },
          { slug: { contains: "b-khashab", mode: "insensitive" } },
        ],
        products: {
          some: {
            status: "APPROVED"
          }
        }
      },
      select: artisanSelect,
      take: 24,
      orderBy: [
        { isVerified: "desc" },
        { createdAt: "desc" }
      ]
    }).then((candidates) => rankArtisansForSpotlight(candidates, 4)),

    // 10. Artisan Count
    prisma.artisanProfile.count({
      where: { status: "APPROVED" }
    })
  ]);

  // Stage 2 & 3: Sanitize, Score, Interleave by Artisan, and Deduplicate Across Shelves
  const allSanitizedCatalog = sanitizeProducts(rawCatalogCandidates);

  // Primary Shelf: Trending Gifts (strict maker diversity: max 1 per studio in any window of 8)
  const rankedTrending = rankProductsWithDiversity(allSanitizedCatalog, {
    maxPerShopInWindow: 1,
    windowSize: 8,
  }).slice(0, 12);

  // Track top visible hero items so subsequent shelves prioritize fresh variety first
  const seenHeroIds = new Set(rankedTrending.slice(0, 8).map((p) => p.id));

  // Second Shelf: Personalizable & Custom Keepsakes
  const rankedPersonalized = rankProductsWithDiversity(
    sanitizeProducts(rawPersonalizedCandidates),
    {
      maxPerShopInWindow: 1,
      windowSize: 6,
      deprioritizeIds: seenHeroIds,
    }
  ).slice(0, 12);

  rankedPersonalized.slice(0, 4).forEach((p) => seenHeroIds.add(p.id));

  // Category Shelves with Rolling-Window Artisan Diversity & Cross-Shelf Deduplication
  const rankedBags = rankProductsWithDiversity(sanitizeProducts(rawBagCandidates), {
    maxPerShopInWindow: 2,
    windowSize: 8,
    deprioritizeIds: seenHeroIds,
  }).slice(0, 12);

  const rankedHomeDecor = rankProductsWithDiversity(sanitizeProducts(rawHomeDecorCandidates), {
    maxPerShopInWindow: 2,
    windowSize: 8,
    deprioritizeIds: seenHeroIds,
  }).slice(0, 12);

  const rankedJewelry = rankProductsWithDiversity(sanitizeProducts(rawJewelryCandidates), {
    maxPerShopInWindow: 2,
    windowSize: 8,
    deprioritizeIds: seenHeroIds,
  }).slice(0, 12);

  const rankedCrochetApparel = rankProductsWithDiversity(
    sanitizeProducts(rawCrochetApparelCandidates),
    {
      maxPerShopInWindow: 2,
      windowSize: 8,
      deprioritizeIds: seenHeroIds,
    }
  ).slice(0, 12);

  const rankedGiftSets = rankProductsWithDiversity(sanitizeProducts(rawGiftSetCandidates), {
    maxPerShopInWindow: 2,
    windowSize: 8,
    deprioritizeIds: seenHeroIds,
  }).slice(0, 12);

  // Fresh From the Studios: Recency-weighted & strictly interleaved (1 per studio per 6 items)
  const rankedNewArrivals = rankProductsWithDiversity(
    sanitizeProducts(rawNewArrivalsCandidates),
    {
      maxPerShopInWindow: 1,
      windowSize: 6,
      preferFreshness: true,
      deprioritizeIds: seenHeroIds,
    }
  ).slice(0, 12);

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Giftisan",
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    description: SITE_DESCRIPTION,
    sameAs: [
      "https://instagram.com/giftisan",
      "https://facebook.com/giftisan",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "support@giftisan.com",
      areaServed: "EG",
      availableLanguage: ["Arabic", "English"],
    },
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Giftisan",
    url: `${SITE_URL}/${lang}`,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/${lang}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <HomeClient
        allProducts={allSanitizedCatalog.slice(0, 32)}
        trendingProducts={rankedTrending}
        personalizedProducts={rankedPersonalized}
        newArrivalsProducts={rankedNewArrivals}
        bagProducts={rankedBags}
        homeDecorProducts={rankedHomeDecor}
        jewelryProducts={rankedJewelry}
        crochetApparelProducts={rankedCrochetApparel}
        giftSetProducts={rankedGiftSets}
        featuredArtisans={sanitizeArtisans(featuredArtisans)}
        artisanCount={artisanCount}
        dict={dict}
      />
    </>
  );
}
