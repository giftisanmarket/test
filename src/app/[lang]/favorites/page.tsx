import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import FavoritesClient from "@/components/favorites-client";
import { Metadata } from "next";
import { getAllArtisans } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang as any);
  
  return {
    title: dict.home.favorites_title || "Your Favorites",
    description: "Your curated collection of artisanal products.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function FavoritesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  
  const dict = await getDictionary(lang as any);
  const [artisans, suggestedProducts] = await Promise.all([
    getAllArtisans(),
    prisma.product.findMany({
      where: { status: "APPROVED", artisan: { status: "APPROVED" } },
      take: 8,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        price: true,
        images: true,
        category: true,
        subcategory: true,
        canPersonalize: true,
        requiresClientImage: true,
        variants: true,
        stock: true,
        artisan: {
          select: {
            id: true,
            studioName: true,
            slug: true,
            isVerified: true,
            user: { select: { name: true, image: true } },
          },
        },
      },
    }),
  ]);

  return (
    <FavoritesClient
      dict={dict}
      allArtisans={artisans}
      suggestedProducts={suggestedProducts}
      lang={lang}
    />
  );
}

