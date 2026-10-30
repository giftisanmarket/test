import { Metadata } from "next";
import { ProductsClient } from "@/components/products-client";
import { getAllProducts } from "@/lib/actions";
import { SITE_URL } from "@/lib/constants";
import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang as any);
  const title = `${dict.common?.explore || "Explore Handcrafted Products"} | Giftisan`;
  const description = dict.seo?.description || "Explore our collection of authentic handcrafted Egyptian products.";
  const canonicalUrl = `${SITE_URL}/${lang}/products`;
  const ogImageUrl = `${SITE_URL}/hero.webp`;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "en-US": `${SITE_URL}/en/products`,
        "ar-EG": `${SITE_URL}/ar/products`,
        "x-default": `${SITE_URL}/en/products`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "Giftisan",
      locale: lang === "ar" ? "ar_EG" : "en_US",
      alternateLocale: lang === "ar" ? "en_US" : "ar_EG",
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: title,
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

export const revalidate = 60;

export default async function ProductsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  
  const dict = await getDictionary(lang as any);
  const products = await getAllProducts();

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
        "name": dict.common?.explore || "Explore",
        "item": `${SITE_URL}/${lang}/products`
      }
    ]
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": products.map((p: any, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "url": `${SITE_URL}/${lang}/products/${p.slug || p.id}`
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <ProductsClient initialProducts={products} dict={dict} lang={lang} />
    </>
  );
}
