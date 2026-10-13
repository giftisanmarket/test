import { prisma } from "@/lib/prisma";
import HomeClient from "@/components/home-client";
import { Metadata } from "next";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/constants";
import { getDictionary, hasLocale } from "./dictionaries";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  "ur-own-flower",
  "gl-crochet-m4of",
  "rimo-crochet-handmade",
  "charm-threads-0e2u"
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
    trendingProducts,
    bagProducts,
    homeDecorProducts,
    jewelryProducts,
    crochetApparelProducts,
    giftSetProducts,
    featuredArtisans,
    artisanCount
  ] = await Promise.all([
    // 1. Top Trending & Best Finds (10 items)
    prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        }
      },
      select: productSelect,
      take: 10,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 2. Handcrafted Bags & Leather Goods (up to 8 items)
    prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        },
        category: { in: ["bags-and-purses", "accessories"], mode: "insensitive" }
      },
      select: productSelect,
      take: 8,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 3. Artisan Woodwork & Home Collectibles (up to 8 items)
    prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        },
        category: { in: ["home-and-living", "woodwork", "ceramics"], mode: "insensitive" }
      },
      select: productSelect,
      take: 8,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 4. Bespoke Jewelry & Adornments (up to 8 items)
    prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        },
        category: { in: ["jewelry", "accessories"], mode: "insensitive" }
      },
      select: productSelect,
      take: 8,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 5. Handmade Crochet & Apparel (up to 8 items)
    prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        },
        category: { in: ["clothing", "fashion", "textiles", "wearables"], mode: "insensitive" }
      },
      select: productSelect,
      take: 8,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 6. Curated Gift Sets & Celebrations (up to 8 items)
    prisma.product.findMany({
      where: {
        status: "APPROVED",
        artisan: {
          status: "APPROVED"
        },
        category: { in: ["gifts-sets", "gifts", "toys-and-games", "weddings"], mode: "insensitive" }
      },
      select: productSelect,
      take: 8,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' }
      ]
    }),

    // 7. Featured Master Artisans (curated top Egyptian makers, including Charm Threads)
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

    // 8. Artisan Count
    prisma.artisanProfile.count({
      where: { status: "APPROVED" }
    })
  ]);

  return (
    <HomeClient
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
