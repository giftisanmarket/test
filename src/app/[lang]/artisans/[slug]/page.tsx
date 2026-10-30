import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { ArtisanClient } from "@/components/artisan-client";
import { notFound } from "next/navigation";
import { cache } from "react";
import { slugify } from "@/lib/utils";
import { PUBLIC_USER_SELECT, sanitizePublicArtisan, sanitizePublicProduct } from "@/lib/public-selects";

const ARTISAN_PAGE_INCLUDE = {
  products: {
    where: {
      status: "APPROVED" as const,
    },
    include: {
      reviews: {
        include: {
          user: {
            select: PUBLIC_USER_SELECT,
          },
        },
      },
      orderItems: {
        where: {
          order: {
            status: {
              notIn: ["PENDING", "CANCELLED", "REFUNDED"] as string[],
            },
          },
        },
        select: {
          quantity: true,
        },
      },
    },
  },
  user: {
    select: PUBLIC_USER_SELECT,
  },
};

function sanitizeArtisanWithProducts(artisanProfile: any) {
  const sanitized = sanitizePublicArtisan(artisanProfile);
  if (!sanitized) return null;
  return {
    ...sanitized,
    products: Array.isArray(artisanProfile.products)
      ? artisanProfile.products.map((p: any) => sanitizePublicProduct(p))
      : [],
  };
}

// Cached fetch to deduplicate queries between generateMetadata and page rendering
const getArtisanBySlug = cache(async (rawSlug: string) => {
  let decodedSlug = rawSlug;
  try {
    decodedSlug = decodeURIComponent(rawSlug).trim();
  } catch (e) {
    console.error("Failed to decode artisan slug:", e);
  }

  // Try to find by the indexed slug or id field first
  const artisanBySlug = await prisma.artisanProfile.findFirst({
    where: {
      OR: [
        { slug: decodedSlug },
        { slug: rawSlug },
        { id: decodedSlug },
        { slug: { equals: decodedSlug, mode: "insensitive" } },
      ],
      status: "APPROVED",
    },
    include: ARTISAN_PAGE_INCLUDE,
  });

  if (artisanBySlug) {
    const safeProfile = sanitizeArtisanWithProducts(artisanBySlug);
    return {
      artisanProfile: safeProfile,
      name: artisanBySlug.studioName || (artisanBySlug as any).user?.name || "Artisan",
    };
  }

  // Lightweight fallback: fetch only minimal name/id metadata instead of loading all products & orderItems
  const candidates = await prisma.artisanProfile.findMany({
    where: {
      status: "APPROVED",
    },
    select: {
      id: true,
      studioName: true,
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  const matchedCandidate = candidates.find((c) => {
    const userNameSlug = c.user?.name ? slugify(c.user.name) : "";
    const studioSlug = c.studioName ? slugify(c.studioName) : "";
    return (
      userNameSlug === decodedSlug ||
      studioSlug === decodedSlug ||
      c.user?.name?.toLowerCase().replace(/\s+/g, "-") === decodedSlug
    );
  });

  if (!matchedCandidate) return null;

  const matchedProfile = await prisma.artisanProfile.findUnique({
    where: { id: matchedCandidate.id },
    include: ARTISAN_PAGE_INCLUDE,
  });

  if (!matchedProfile) return null;

  return {
    artisanProfile: sanitizeArtisanWithProducts(matchedProfile),
    name: matchedProfile.studioName || (matchedProfile as any).user?.name || "Artisan",
  };
});

import { getDictionary, hasLocale } from "../../dictionaries";
import { SITE_URL, SITE_NAME } from "@/lib/constants";

export const revalidate = 60; // ISR: Cache artisan profile for 60 seconds with on-demand invalidation

interface Props {
  params: Promise<{ slug: string, lang: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang as any);
  
  const data = await getArtisanBySlug(slug);
  
  if (!data || !data.artisanProfile) return { title: lang === 'ar' ? "لم يتم العثور على الحرفي" : "Artisan Not Found" };
  const artisan = data.artisanProfile;

  const description = artisan.bio || (lang === 'ar' 
    ? `اكتشف عالم ${data.name}. استكشف منتجاتاً فريدة مصنوعة بشغف.`
    : `Discover the world of ${data.name}. Explore unique products made with passion.`);
  const keywords = [data.name, artisan.studioName, artisan.location, lang === 'ar' ? "حرفي" : "Artisan", lang === 'ar' ? "صنع يدوي" : "Handmade", SITE_NAME].filter(Boolean) as string[];
  
  const getAbsoluteUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };
  
  const ogImage = getAbsoluteUrl(artisan.avatar || artisan.bannerImage) || `${SITE_URL}/hero.webp`;

  return {
    metadataBase: new URL(SITE_URL),
    title: data.name || "Artisan",
    description: description.slice(0, 160),
    keywords,
    alternates: {
      canonical: `${SITE_URL}/${lang}/artisans/${slug}`,
      languages: {
        "en-US": `${SITE_URL}/en/artisans/${slug}`,
        "ar-EG": `${SITE_URL}/ar/artisans/${slug}`,
        "x-default": `${SITE_URL}/en/artisans/${slug}`,
      }
    },
    openGraph: {
      title: data.name ? `${data.name} | ${SITE_NAME}` : SITE_NAME,
      description: description.slice(0, 160),
      url: `${SITE_URL}/${lang}/artisans/${slug}`,
      siteName: SITE_NAME,
      images: [{
        url: ogImage,
        width: 1200,
        height: 630,
        alt: lang === 'ar' ? `متجر ${data.name || ""}` : `${data.name || ""} Shop`
      }],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: data.name ? `${data.name} | ${SITE_NAME}` : SITE_NAME,
      description: description.slice(0, 160),
      images: [ogImage],
    }
  };
}

export default async function ArtisanPage({ params }: Props) {
  const { slug, lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang as any);
  
  const data = await getArtisanBySlug(slug);
  
  if (!data || !data.artisanProfile) {
    notFound();
  }

  const artisan = data.artisanProfile;

  const description = artisan.bio || (lang === 'ar' 
    ? `اكتشف عالم ${data.name}. استكشف منتجاتاً فريدة مصنوعة بشغف.`
    : `Discover the world of ${data.name}. Explore unique products made with passion.`);
  
  const getAbsoluteUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };
  
  const ogImage = getAbsoluteUrl(artisan.avatar || artisan.bannerImage) || `${SITE_URL}/hero.webp`;

  const storeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    "name": data.name,
    "description": description.slice(0, 160),
    "image": ogImage,
    "url": `${SITE_URL}/${lang}/artisans/${slug}`,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": artisan.location || "Egypt",
      "addressCountry": "EG"
    },
    "priceRange": "$$",
    "seller": {
      "@type": "Organization",
      "name": SITE_NAME,
      "url": SITE_URL
    }
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": dict.common?.home || "Home",
        "item": `${SITE_URL}/${lang}`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": dict.common?.artisans || "Artisans",
        "item": `${SITE_URL}/${lang}/artisans`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": data.name,
        "item": `${SITE_URL}/${lang}/artisans/${slug}`
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ArtisanClient artisan={data.artisanProfile} dict={dict} lang={lang} />
    </>
  );
}
