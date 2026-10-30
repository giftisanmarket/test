import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { cache } from "react";
import { ArtisanBioView } from "@/components/bio/ArtisanBioView";
import { sanitizePublicArtisan, sanitizePublicProduct } from "@/lib/public-selects";
import { isSafeHttpUrl } from "@/lib/security";
import { slugify } from "@/lib/utils";

export const revalidate = 60; // ISR: Cache artisan bio pages for 60 seconds

const BIO_INCLUDE = {
  user: {
    select: { id: true, name: true, image: true },
  },
  bioLinks: {
    orderBy: { order: "asc" as const },
  },
  products: {
    where: { status: "APPROVED" as const },
    include: {
      reviews: { select: { rating: true } },
      orderItems: {
        where: {
          order: {
            status: { notIn: ["PENDING", "CANCELLED", "REFUNDED"] as string[] },
          },
        },
        select: { id: true },
      },
    },
    orderBy: [
      { isFeatured: "desc" as const },
      { createdAt: "desc" as const },
    ],
    take: 50,
  },
};

function sanitizeBioArtisan(artisan: any) {
  const safeArtisan = sanitizePublicArtisan(artisan);
  if (!safeArtisan) return null;
  return {
    ...safeArtisan,
    bioLinks: Array.isArray(artisan.bioLinks)
      ? artisan.bioLinks.filter((l: any) => isSafeHttpUrl(l?.url))
      : [],
    products: Array.isArray(artisan.products)
      ? artisan.products.map((p: any) => sanitizePublicProduct(p))
      : [],
  };
}

const getArtisanBioBySlug = cache(async (rawSlug: string) => {
  let decodedSlug = rawSlug;
  try {
    decodedSlug = decodeURIComponent(rawSlug).trim();
  } catch (e) {
    console.error("Failed to decode bio slug:", e);
  }

  const artisan = await prisma.artisanProfile.findFirst({
    where: {
      OR: [
        { slug: decodedSlug },
        { slug: rawSlug },
        { id: rawSlug },
        { slug: { equals: decodedSlug, mode: "insensitive" } },
      ],
      status: { in: ["APPROVED", "PENDING"] },
    },
    include: BIO_INCLUDE,
  });

  if (artisan) return sanitizeBioArtisan(artisan);

  // Lightweight fallback match by studio/user name slug without full-table relation scan
  const candidates = await prisma.artisanProfile.findMany({
    where: {
      status: { in: ["APPROVED", "PENDING"] },
    },
    select: {
      id: true,
      studioName: true,
      user: { select: { name: true } },
    },
  });

  const matchedCandidate = candidates.find((c) => {
    const userSlug = c.user?.name ? slugify(c.user.name) : "";
    const studioSlug = c.studioName ? slugify(c.studioName) : "";
    return (
      c.user?.name?.toLowerCase().replace(/\s+/g, "-") === decodedSlug ||
      userSlug === decodedSlug ||
      studioSlug === decodedSlug
    );
  });

  if (!matchedCandidate) return null;

  const matchedProfile = await prisma.artisanProfile.findUnique({
    where: { id: matchedCandidate.id },
    include: BIO_INCLUDE,
  });

  return matchedProfile ? sanitizeBioArtisan(matchedProfile) : null;
});

interface Props {
  params: Promise<{ slug: string; lang: string }>;
}

import { SITE_URL, SITE_NAME } from "@/lib/constants";
import { auth } from "@/auth";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, lang } = await params;
  const artisan = await getArtisanBioBySlug(slug);

  if (!artisan) {
    return {
      title: "Artisan Not Found | Giftisan Bio",
      robots: { index: false, follow: false },
    };
  }

  const isApproved = artisan.status === "APPROVED";
  if (!isApproved) {
    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN";
    const isOwner = session?.user?.id === artisan.userId;
    if (!isAdmin && !isOwner) {
      return {
        title: "Artisan Not Found | Giftisan Bio",
        robots: { index: false, follow: false },
      };
    }
  }

  const name = artisan.studioName || artisan.user?.name || "Artisan";
  const bioDesc = artisan.bio || `Explore handcrafted creations and bio links for ${name} on Giftisan.`;
  
  const getAbsoluteUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const ogImage = getAbsoluteUrl(artisan.avatar || artisan.bannerImage) || `${SITE_URL}/hero.webp`;

  return {
    metadataBase: new URL(SITE_URL),
    title: `${name} | Giftisan Bio`,
    description: bioDesc.slice(0, 160),
    robots: isApproved ? { index: true, follow: true } : { index: false, follow: false },
    alternates: {
      canonical: `${SITE_URL}/${lang}/bio/${slug}`,
      languages: {
        "en-US": `${SITE_URL}/en/bio/${slug}`,
        "ar-EG": `${SITE_URL}/ar/bio/${slug}`,
        "x-default": `${SITE_URL}/en/bio/${slug}`,
      },
    },
    openGraph: {
      title: `${name} | ${SITE_NAME} Studio Bio`,
      description: bioDesc.slice(0, 160),
      url: `${SITE_URL}/${lang}/bio/${slug}`,
      siteName: SITE_NAME,
      images: [{
        url: ogImage,
        width: 1200,
        height: 630,
        alt: `${name} Studio`
      }],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} | ${SITE_NAME} Studio Bio`,
      description: bioDesc.slice(0, 160),
      images: [ogImage],
    }
  };
}

export default async function BioPage({ params }: Props) {
  const { slug, lang } = await params;
  const artisan = await getArtisanBioBySlug(slug);

  if (!artisan) {
    notFound();
  }

  if (artisan.status !== "APPROVED") {
    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN";
    const isOwner = session?.user?.id === artisan.userId;
    if (!isAdmin && !isOwner) {
      notFound();
    }
  }

  return <ArtisanBioView artisan={artisan as any} lang={lang} />;
}
