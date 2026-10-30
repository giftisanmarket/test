import { prisma } from "@/lib/prisma";
import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

export const revalidate = 3600; // Revalidate sitemap once per hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL;

  // Fetch approved products, artisans, and distinct categories concurrently
  const [products, artisans, distinctCategories] = await Promise.all([
    prisma.product.findMany({
      where: { status: "APPROVED", artisan: { status: "APPROVED" } },
      select: { id: true, slug: true, updatedAt: true },
      take: 2000,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.artisanProfile.findMany({
      where: { status: "APPROVED" },
      select: { id: true, slug: true, updatedAt: true },
      take: 500,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.product.findMany({
      where: { status: "APPROVED", artisan: { status: "APPROVED" } },
      select: { category: true },
      distinct: ["category"],
    }),
  ]);

  const locales = ["en", "ar"] as const;

  const buildAlternates = (path: string) => ({
    languages: {
      en: `${baseUrl}/en${path}`,
      ar: `${baseUrl}/ar${path}`,
      "x-default": `${baseUrl}/en${path}`,
    },
  });

  // 1. Static Core Pages
  const staticPaths = [
    { path: "", priority: 1.0, changeFrequency: "daily" as const },
    { path: "/products", priority: 0.95, changeFrequency: "daily" as const },
    { path: "/artisans", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/categories", priority: 0.85, changeFrequency: "weekly" as const },
    { path: "/become-artisan", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/contact", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "monthly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "monthly" as const },
    { path: "/shipping", priority: 0.4, changeFrequency: "monthly" as const },
    { path: "/refund", priority: 0.4, changeFrequency: "monthly" as const },
  ];

  const staticEntries = staticPaths.flatMap((page) =>
    locales.map((lang) => ({
      url: `${baseUrl}/${lang}${page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: buildAlternates(page.path),
    }))
  );

  // 2. Product Detail Pages
  const productEntries = products.flatMap((p) => {
    const slugOrId = encodeURIComponent(p.slug || p.id);
    const subPath = `/products/${slugOrId}`;
    return locales.map((lang) => ({
      url: `${baseUrl}/${lang}${subPath}`,
      lastModified: p.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
      alternates: buildAlternates(subPath),
    }));
  });

  // 3. Artisan Showcase Pages
  const artisanEntries = artisans.flatMap((a) => {
    const slugOrId = encodeURIComponent(a.slug || a.id);
    const subPath = `/artisans/${slugOrId}`;
    return locales.map((lang) => ({
      url: `${baseUrl}/${lang}${subPath}`,
      lastModified: a.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.75,
      alternates: buildAlternates(subPath),
    }));
  });

  // 4. Category Pages (curated fallback merged with live catalog categories)
  const defaultCategories = [
    "ceramics",
    "jewelry",
    "stationery",
    "vintage",
    "textiles",
    "woodwork",
    "wedding",
    "personalized",
    "art-collectibles",
    "bags",
    "home-decor",
  ];

  const dbCategories = distinctCategories
    .map((c) => c.category?.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean) as string[];

  const allCategories = Array.from(new Set([...defaultCategories, ...dbCategories]));

  const categoryEntries = allCategories.flatMap((cat) => {
    const subPath = `/category/${encodeURIComponent(cat)}`;
    return locales.map((lang) => ({
      url: `${baseUrl}/${lang}${subPath}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
      alternates: buildAlternates(subPath),
    }));
  });

  return [
    ...staticEntries,
    ...productEntries,
    ...artisanEntries,
    ...categoryEntries,
  ];
}
