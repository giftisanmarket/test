import { Metadata } from "next";
import { CategoryClient } from "@/components/category-client";
import { getProductsByCategory } from "@/lib/actions";
import { SITE_URL } from "@/lib/constants";
import { getDictionary, hasLocale } from "../../dictionaries";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }: { params: Promise<{ lang: string, slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang as any);
  
  const categoryName = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, " ");
  
  const title = (dict as any).common?.categories_list?.[slug] || (dict as any).home?.categories_list?.[slug] || categoryName;
  const description = `${dict.home.category_desc_prefix || "Discover unique handcrafted" } ${title} ${dict.home.category_desc_suffix || "from authentic Egyptian artisans."}`;
  const ogImage = `${SITE_URL}/images/categories/${slug}.webp`;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    keywords: [title, categoryName, lang === 'ar' ? "هدايا مصرية" : "Egyptian Handmade", "Giftisan"],
    alternates: {
      canonical: `${SITE_URL}/${lang}/category/${slug}`,
      languages: {
        "en-US": `${SITE_URL}/en/category/${slug}`,
        "ar-EG": `${SITE_URL}/ar/category/${slug}`,
        "x-default": `${SITE_URL}/en/category/${slug}`,
      }
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${lang}/category/${slug}`,
      images: [{
        url: ogImage,
        width: 1200,
        height: 630,
        alt: title
      }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage]
    }
  };
}

export const revalidate = 60;

export default async function CategoryPage({ params }: { params: Promise<{ slug: string, lang: string }> }) {
  const { slug, lang } = await params;
  if (!hasLocale(lang)) notFound();
  
  const dict = await getDictionary(lang as any);
  const products = await getProductsByCategory(slug);

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
        "name": (dict as any).common?.categories_list?.[slug] || (dict as any).home?.categories_list?.[slug] || slug,
        "item": `${SITE_URL}/${lang}/category/${slug}`
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
      <CategoryClient slug={slug} initialProducts={products} dict={dict} />
    </>
  );
}
