import { prisma } from "@/lib/prisma";
import HomeClient from "@/components/home-client";
import { Metadata } from "next";
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "@/lib/constants";
import { getDictionary, hasLocale } from "./dictionaries";
import { notFound } from "next/navigation";
import { rankProductsWithDiversity } from "@/lib/recommendations";

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

const CURATED_FEATURED_ARTISAN_SLUGS = [
  "charm-threads-0e2u",
  "rimo-crochet-handmade",
  "gl-crochet-m4of",
  "ur-own-flower"
];

const EXCLUDED_HOMEPAGE_ARTISAN_SLUGS = [
  "studiopelle"
];

const baseApprovedProductWhere = {
  status: "APPROVED" as const,
  stock: { gt: 0 },
  artisan: {
    status: "APPROVED" as const,
    isAcceptingOrders: true,
    slug: { notIn: EXCLUDED_HOMEPAGE_ARTISAN_SLUGS },
    NOT: [
      { studioName: { equals: "StudioPelle", mode: "insensitive" as const } }
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
  user: {
    select: {
      name: true
    }
  },
  products: {
    where: {
      status: "APPROVED" as const
    },
    take: 3,
    select: {
      id: true,
      slug: true,
      images: true,
      name: true,
      status: true,
      price: true,
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
    .filter(p => {
      const slug = p.artisan?.slug?.toLowerCase();
      const studio = p.artisan?.studioName?.toLowerCase();
      return (
        !EXCLUDED_HOMEPAGE_ARTISAN_SLUGS.includes(slug || "") &&
        studio !== "studiopelle"
      );
    })
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
    .filter(a => {
      const slug = a.slug?.toLowerCase();
      const studio = a.studioName?.toLowerCase();
      return (
        !EXCLUDED_HOMEPAGE_ARTISAN_SLUGS.includes(slug || "") &&
        studio !== "studiopelle"
      );
    })
    .map(a => ({
      ...a,
      avatar: (a.avatar?.length || 0) > 60000 ? "" : a.avatar,
      bannerImage: (a.bannerImage?.length || 0) > 60000 ? "" : a.bannerImage,
      products: (a.products || []).map((p: any) => ({
        ...p,
        images: Array.isArray(p.images)
          ? p.images.slice(0, 1).map((img: string) => ((img?.length || 0) > 60000 ? "" : img))
          : [],
      }))
    }));
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
    // 1. Broad Marketplace Candidate Pool for Native Feed & Top Trending Ranking (up to 48 items)
    prisma.product.findMany({
      where: baseApprovedProductWhere,
      select: productSelect,
      take: 48,
      orderBy: [
        { isFeatured: 'desc' },
        { views: 'desc' },
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

    // 4. Handcrafted Bags & Leather Goods (up to 20 candidates)
    prisma.product.findMany({
      where: {
        ...baseApprovedProductWhere,
        category: { in: ["bags-and-purses", "handbags", "leatherwork"], mode: "insensitive" }
      },
      select: productSelect,
      take: 20,
      orderBy: [
        { isFeatured: 'desc' },
        { views: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 5. Artisan Ceramics, Woodwork & Home Collectibles (up to 20 candidates)
    prisma.product.findMany({
      where: {
        ...baseApprovedProductWhere,
        category: { in: ["home-and-living", "woodwork", "ceramics", "fine-art-ceramics", "sculpture", "art-and-collectibles"], mode: "insensitive" }
      },
      select: productSelect,
      take: 20,
      orderBy: [
        { isFeatured: 'desc' },
        { views: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 6. Bespoke Jewelry & Adornments (up to 24 candidates)
    prisma.product.findMany({
      where: {
        ...baseApprovedProductWhere,
        category: { in: ["jewelry", "necklaces", "earrings", "bracelets", "pins-clips", "brooches-pins-clips", "hair-accessories", "accessories"], mode: "insensitive" }
      },
      select: productSelect,
      take: 24,
      orderBy: [
        { isFeatured: 'desc' },
        { views: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 7. Handmade Crochet & Apparel (up to 20 candidates)
    prisma.product.findMany({
      where: {
        ...baseApprovedProductWhere,
        category: { in: ["clothing", "fashion", "textiles", "wearables"], mode: "insensitive" }
      },
      select: productSelect,
      take: 20,
      orderBy: [
        { isFeatured: 'desc' },
        { views: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 8. Curated Gift Sets & Keepsakes (up to 20 candidates)
    prisma.product.findMany({
      where: {
        ...baseApprovedProductWhere,
        category: { in: ["gifts-sets", "gifts", "gifts-mementos", "keychains-lanyards", "toys-and-games", "weddings", "games-puzzles", "paper"], mode: "insensitive" }
      },
      select: productSelect,
      take: 20,
      orderBy: [
        { isFeatured: 'desc' },
        { views: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 9. Featured Master Artisans (curated top Egyptian makers, including Charm Threads)
    prisma.artisanProfile.findMany({
      where: {
        status: "APPROVED",
        slug: { in: CURATED_FEATURED_ARTISAN_SLUGS }
      },
      select: artisanSelect,
    }).then(async (curated) => {
      // Sort according to curated list order
      curated.sort((a, b) => {
        const idxA = CURATED_FEATURED_ARTISAN_SLUGS.indexOf(a.slug || "");
        const idxB = CURATED_FEATURED_ARTISAN_SLUGS.indexOf(b.slug || "");
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
      });

      // If less than 4 curated are available, backfill with other approved artisans (excluding moon-by-alila and studiopelle)
      if (curated.length < 4) {
        const existingIds = curated.map((c) => c.id);
        const additional = await prisma.artisanProfile.findMany({
          where: {
            status: "APPROVED",
            id: { notIn: existingIds },
            slug: { notIn: ["moon-by-alila-wmp4", ...EXCLUDED_HOMEPAGE_ARTISAN_SLUGS] },
            NOT: [
              { studioName: { equals: "StudioPelle", mode: "insensitive" } }
            ]
          },
          select: artisanSelect,
          take: 4 - curated.length,
          orderBy: { createdAt: "desc" }
        });
        return [...curated, ...additional];
      }
      return curated;
    }),

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
