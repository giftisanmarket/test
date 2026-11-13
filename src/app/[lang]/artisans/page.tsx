import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getAllArtisans } from "@/lib/actions";
import { ArtisansClient } from "@/components/artisans-client";
import { SITE_URL, SITE_NAME } from "@/lib/constants";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang as any);
  
  return {
    title: dict.home.artisans_registry,
    description: dict.home.artisans_desc,
    alternates: {
      canonical: `${SITE_URL}/${lang}/artisans`,
      languages: {
        "en-US": `${SITE_URL}/en/artisans`,
        "ar-EG": `${SITE_URL}/ar/artisans`,
      }
    },
    openGraph: {
      title: dict.home.artisans_registry,
      description: dict.home.artisans_desc,
      images: [`${SITE_URL}/hero.webp`],
      url: `${SITE_URL}/${lang}/artisans`,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: dict.home.artisans_registry,
      description: dict.home.artisans_desc,
      images: [`${SITE_URL}/hero.webp`],
    }
  };
}

export const revalidate = 60;

export default async function ArtisansPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  
  const dict = await getDictionary(lang as any);
  const artisans = await getAllArtisans();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": dict.common?.home || "Home",
        "item": SITE_URL
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": dict.common?.artisans || "Artisans",
        "item": `${SITE_URL}/${lang}/artisans`
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ArtisansClient artisans={artisans} dict={dict} />
    </>
  );
}
