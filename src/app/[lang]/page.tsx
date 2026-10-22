import { prisma } from "@/lib/prisma";
import HomeClient from "@/components/home-client";
import { Metadata } from "next";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/constants";
import { getDictionary, hasLocale } from "./dictionaries";
import { notFound } from "next/navigation";

export const revalidate = 60; // ISR: Cache the landing page for 60 seconds to prevent database pool exhaustion

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang as any);
  
  return {
    title: {
      absolute: dict.seo.title
    },
    description: dict.seo.description || SITE_DESCRIPTION,
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
  description: true,
  price: true,
  stock: true,
  badge: true,
  images: true,
  isFeatured: true,
  category: true,
  canPersonalize: true,
  requiresClientImage: true,
  variants: true,
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
    images: Array.isArray(p.images) ? p.images.map((img: string) => (img?.length || 0) > 300000 ? "" : img) : [],
    artisan: {
      ...p.artisan,
      avatar: (p.artisan?.avatar?.length || 0) > 300000 ? "" : p.artisan?.avatar
    }
  }));
}

function sanitizeArtisans(artisansList: any[]) {
  return artisansList.map(a => ({
    ...a,
    avatar: (a.avatar?.length || 0) > 300000 ? "" : a.avatar,
    bannerImage: (a.bannerImage?.length || 0) > 300000 ? "" : a.bannerImage,
    products: (a.products || []).map((p: any) => ({
      ...p,
      images: Array.isArray(p.images) ? p.images.map((img: string) => (img?.length || 0) > 300000 ? "" : img) : [],
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
    // 1. Comprehensive Catalog for Discovery Feed (all approved products, up to 150 items)
    prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        }
      },
      select: productSelect,
      take: 150,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 2. Top Trending for Web Shelf (up to 24 items)
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

    // 3. Handcrafted Bags & Leather Goods (up to 24 items)
    prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        },
        category: { in: ["bags-and-purses", "handbags", "leatherwork"], mode: "insensitive" }
      },
      select: productSelect,
      take: 24,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 4. Artisan Ceramics, Woodwork & Home Collectibles (up to 24 items)
    prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        },
        category: { in: ["home-and-living", "woodwork", "ceramics", "fine-art-ceramics", "sculpture", "art-and-collectibles"], mode: "insensitive" }
      },
      select: productSelect,
      take: 24,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 5. Bespoke Jewelry & Adornments (up to 36 items)
    prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        },
        category: { in: ["jewelry", "necklaces", "earrings", "bracelets", "pins-clips", "brooches-pins-clips", "hair-accessories", "accessories"], mode: "insensitive" }
      },
      select: productSelect,
      take: 36,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 6. Handmade Crochet & Apparel (up to 24 items)
    prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        },
        category: { in: ["clothing", "fashion", "textiles", "wearables"], mode: "insensitive" }
      },
      select: productSelect,
      take: 24,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 7. Curated Gift Sets & Keepsakes (up to 24 items)
    prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        },
        category: { in: ["gifts-sets", "gifts", "gifts-mementos", "keychains-lanyards", "toys-and-games", "weddings", "games-puzzles", "paper"], mode: "insensitive" }
      },
      select: productSelect,
      take: 24,
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

  return (
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
  );
}
