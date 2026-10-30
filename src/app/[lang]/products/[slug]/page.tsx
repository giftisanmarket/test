import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { ProductClient } from "@/components/product-client";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { cache } from "react";

export const revalidate = 60; // ISR: Cache product page for 60 seconds with on-demand revalidation on edits/reviews

interface Props {
  params: Promise<{ slug: string; lang: string }>;
}

import { SITE_URL, SITE_NAME } from "@/lib/constants";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { PUBLIC_ARTISAN_SELECT, PUBLIC_USER_SELECT, sanitizePublicProduct } from "@/lib/public-selects";

// Cached product fetch to deduplicate queries between metadata generation and page rendering
const getProduct = cache(async (rawSlug: string) => {
  let decodedSlug = rawSlug;
  try {
    decodedSlug = decodeURIComponent(rawSlug).trim();
  } catch (e) {
    console.error("Failed to decode slug:", e);
  }

  // 1. Try exact match first for UTF-8 / Arabic support
  let product = await prisma.product.findFirst({
    where: {
      OR: [
        { id: decodedSlug },
        { slug: decodedSlug },
        { id: rawSlug },
        { slug: rawSlug },
        { slug: { equals: decodedSlug, mode: "insensitive" } }
      ]
    },
    include: {
      artisan: {
        select: PUBLIC_ARTISAN_SELECT
      },
      variants: true,
      reviews: {
        include: {
          user: {
            select: PUBLIC_USER_SELECT
          }
        }
      }
    }
  });

  // 2. RESILIENCE FALLBACK: Try hyphenated and space-replaced versions
  if (!product) {
    const cleanSlug = decodedSlug.replace(/%20/g, '-').replace(/\s+/g, '-');
    product = await prisma.product.findFirst({
      where: {
        OR: [
          { slug: cleanSlug },
          { slug: { equals: cleanSlug, mode: "insensitive" } }
        ]
      },
      include: {
        artisan: { select: PUBLIC_ARTISAN_SELECT },
        variants: true,
        reviews: { include: { user: { select: PUBLIC_USER_SELECT } } }
      }
    });
  }
  
  return product;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lang } = await params;
  const product = await getProduct(slug);

  if (!product) return { 
    title: lang === 'ar' ? "المنتج غير موجود" : "Product Not Found",
    robots: { index: false, follow: false }
  };

  const isApproved = product.status === "APPROVED" && product.artisan.status === "APPROVED";
  
  if (!isApproved) {
    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN";
    const isOwner = session?.user?.id === product.artisan.userId;
    if (!isAdmin && !isOwner) {
      return { 
        title: lang === 'ar' ? "المنتج غير موجود" : "Product Not Found",
        robots: { index: false, follow: false }
      };
    }
  }

  const getAbsoluteUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const firstImage = getAbsoluteUrl(Array.isArray(product.images) && product.images[0] ? product.images[0] : null) || `${SITE_URL}/api/image/product/${product.id}`;
  const description = product.description.slice(0, 160);

  return {
    metadataBase: new URL(SITE_URL),
    title: product.name,
    description: description,
    keywords: [product.name, product.category, lang === 'ar' ? "صنع يدوياً" : "Handcrafted", SITE_NAME, lang === 'ar' ? "مصر" : "Egypt"],
    robots: isApproved ? { index: true, follow: true } : { index: false, follow: false },
    alternates: {
      canonical: `${SITE_URL}/${lang}/products/${product.slug || product.id}`,
      languages: {
        "en-US": `${SITE_URL}/en/products/${product.slug || product.id}`,
        "ar-EG": `${SITE_URL}/ar/products/${product.slug || product.id}`,
        "x-default": `${SITE_URL}/en/products/${product.slug || product.id}`,
      }
    },
    openGraph: {
      title: product.name,
      description: description,
      images: [{
        url: firstImage,
        width: 1200,
        height: 630,
        alt: product.name
      }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: description,
      images: [firstImage],
    }
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug, lang } = await params;
  const dict = await getDictionary(lang as any);
  
  const product = await getProduct(slug);
  
  if (!product) {
    notFound();
  }

  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const isOwner = session?.user?.id === product.artisan.userId;
  const isApproved = product.status === "APPROVED" && product.artisan.status === "APPROVED";
  
  if (!isApproved && !isAdmin && !isOwner) {
    notFound();
  }

  // Views will be tracked on the client side to avoid cookie mutations in SSR

  const baseUrl = SITE_URL;

  const relatedProducts = await prisma.product.findMany({
    where: { 
      category: product.category, 
      id: { not: product.id },
      status: "APPROVED",
      artisan: {
        status: "APPROVED"
      }
    },
    include: { 
      artisan: { 
        select: PUBLIC_ARTISAN_SELECT
      },
      variants: true
    },
    take: 6
  });

  // Sanitize data to prevent PII leaks and serialization crashes
  const baseSanitizedProduct = sanitizePublicProduct(product);
  const sanitizedProduct = {
    ...baseSanitizedProduct,
    variants: baseSanitizedProduct.variants || [],
    rejectionReason: isAdmin || isOwner ? product.rejectionReason : null,
  };

  const sanitizedRelated = relatedProducts.map((p) => sanitizePublicProduct(p));

  const getAbsoluteUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": Array.isArray(product.images) ? product.images.map(img => getAbsoluteUrl(img)) : [getAbsoluteUrl(product.images as any)],
    "description": product.description,
    "sku": product.id,
    "mpn": product.id,
    "brand": {
      "@type": "Brand",
      "name": product.artisan.studioName || SITE_NAME
    },
    "category": product.category,
    "offers": {
      "@type": "Offer",
      "url": `${baseUrl}/${lang}/products/${product.slug || product.id}`,
      "priceCurrency": "EGP",
      "price": product.price,
      "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition",
      "seller": {
        "@type": "Organization",
        "name": product.artisan.studioName || SITE_NAME
      }
    },
    ...(product.reviews.length > 0 ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length,
        "reviewCount": product.reviews.length,
        "bestRating": "5",
        "worstRating": "1"
      },
      "review": product.reviews.map(r => ({
        "@type": "Review",
        "author": { "@type": "Person", "name": r.user.name || "Anonymous" },
        "datePublished": r.createdAt.toISOString().split('T')[0],
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": r.rating,
          "bestRating": "5",
          "worstRating": "1"
        },
        "reviewBody": r.comment
      }))
    } : {})
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": dict.common?.home || "Home",
        "item": `${baseUrl}/${lang}`
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": (dict.common?.categories_list as any)?.[product.category.toLowerCase().replace(/ /g, '-')] || product.category,
        "item": `${baseUrl}/${lang}/category/${product.category.toLowerCase().replace(/\s+/g, '-')}`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": product.name,
        "item": `${baseUrl}/${lang}/products/${product.slug || product.id}`
      }
    ]
  };

  return (
    <>
      {isApproved && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
          />
        </>
      )}
      <ProductClient 
        product={sanitizedProduct as any} 
        relatedProducts={sanitizedRelated} 
        dict={dict} 
        lang={lang} 
        isAdmin={isAdmin || false}
        isOwner={isOwner || false}
      />
    </>
  );
}
