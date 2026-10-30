import { prisma } from "@/lib/prisma";
import HomeClient from "@/components/home-client";
import { Metadata } from "next";
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "@/lib/constants";
import { getDictionary, hasLocale } from "./dictionaries";
import { notFound } from "next/navigation";

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
  return productsList.map(p => ({
    ...p,
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
  }));
}

function sanitizeArtisans(artisansList: any[]) {
  return artisansList.map(a => ({
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

  // Fetch categorized product rows and featured artisans concurrently in parallel
  const [
    allFeedProducts,
    trendingProducts,
    bagProducts,
    homeDecorProducts,
    jewelryProducts,
    crochetApparelProducts,
    giftSetProducts,
    featuredArtisans,
    artisanCount
  ] = await Promise.all([
    // 1. Catalog for Native Discovery Feed (up to 24 items)
    prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        }
      },
      select: productSelect,
      take: 24,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 2. Top Trending for Web Shelf (up to 12 items)
    prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        }
      },
      select: productSelect,
      take: 12,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 3. Handcrafted Bags & Leather Goods (up to 10 items)
    prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        },
        category: { in: ["bags-and-purses", "handbags", "leatherwork"], mode: "insensitive" }
      },
      select: productSelect,
      take: 10,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 4. Artisan Ceramics, Woodwork & Home Collectibles (up to 10 items)
    prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        },
        category: { in: ["home-and-living", "woodwork", "ceramics", "fine-art-ceramics", "sculpture", "art-and-collectibles"], mode: "insensitive" }
      },
      select: productSelect,
      take: 10,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 5. Bespoke Jewelry & Adornments (up to 12 items)
    prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        },
        category: { in: ["jewelry", "necklaces", "earrings", "bracelets", "pins-clips", "brooches-pins-clips", "hair-accessories", "accessories"], mode: "insensitive" }
      },
      select: productSelect,
      take: 12,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 6. Handmade Crochet & Apparel (up to 10 items)
    prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        },
        category: { in: ["clothing", "fashion", "textiles", "wearables"], mode: "insensitive" }
      },
      select: productSelect,
      take: 10,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 7. Curated Gift Sets & Keepsakes (up to 10 items)
    prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        },
        category: { in: ["gifts-sets", "gifts", "gifts-mementos", "keychains-lanyards", "toys-and-games", "weddings", "games-puzzles", "paper"], mode: "insensitive" }
      },
      select: productSelect,
      take: 10,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 8. Featured Master Artisans (curated top Egyptian makers, including Charm Threads)
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

      // If less than 4 curated are available, backfill with other approved artisans (excluding moon-by-alila)
      if (curated.length < 4) {
        const existingIds = curated.map((c) => c.id);
        const additional = await prisma.artisanProfile.findMany({
          where: {
            status: "APPROVED",
            id: { notIn: existingIds },
            slug: { not: "moon-by-alila-wmp4" }
          },
          select: artisanSelect,
          take: 4 - curated.length,
          orderBy: { createdAt: "desc" }
        });
        return [...curated, ...additional];
      }
      return curated;
    }),

    // 9. Artisan Count
    prisma.artisanProfile.count({
      where: { status: "APPROVED" }
    })
  ]);

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
        allProducts={sanitizeProducts(allFeedProducts)}
        trendingProducts={sanitizeProducts(trendingProducts)}
        bagProducts={sanitizeProducts(bagProducts)}
        homeDecorProducts={sanitizeProducts(homeDecorProducts)}
        jewelryProducts={sanitizeProducts(jewelryProducts)}
        crochetApparelProducts={sanitizeProducts(crochetApparelProducts)}
        giftSetProducts={sanitizeProducts(giftSetProducts)}
        featuredArtisans={sanitizeArtisans(featuredArtisans)}
        artisanCount={artisanCount}
        dict={dict}
      />
    </>
  );
}
