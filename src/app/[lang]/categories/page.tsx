import { CategoriesClient } from "@/components/categories-client";
import { prisma } from "@/lib/prisma";
import { Metadata } from "next";
import { getDictionary, hasLocale } from "../dictionaries";
import { notFound } from "next/navigation";

import { SITE_URL } from "@/lib/constants";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang as any);
  return {
    title: dict.common.all_categories || "Browse Categories",
    description: dict.home.category_desc || "Explore our diverse range of artisanal categories.",
    alternates: {
      canonical: `${SITE_URL}/${lang}/categories`,
      languages: {
        "en-US": `${SITE_URL}/en/categories`,
        "ar-EG": `${SITE_URL}/ar/categories`,
      }
    },
    openGraph: {
      title: dict.common.all_categories || "Browse Categories",
      description: dict.home.category_desc || "Explore our diverse range of artisanal categories.",
      images: [`${SITE_URL}/hero.webp`],
    }
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;


export default async function CategoriesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang as any);

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
        "name": dict.common?.all_categories || "Categories",
        "item": `${SITE_URL}/${lang}/categories`
      }
    ]
  };

  const departments = [
    {
      name: "Home & Living",
      slug: "home-and-living",
      subcategories: [
        "Home Decor",
        "Lighting",
        "Floor & Rugs",
        "Kitchen & Dining",
        "Furniture",
        "Bathroom",
        "Storage & Organization",
        "Outdoor & Gardening",
        "Curtains & Window Treatments",
        "Bedding",
        "Office",
        "Food & Drink",
        "Spirituality & Religion",
        "Home Improvement",
        "Home Appliances",
        "Cleaning Supplies"
      ],
      aliases: ["home-living", "home & living", "ceramics", "woodwork", "textiles", "metalwork", "glasswork", "basketry"]
    },
    {
      name: "Jewelry",
      slug: "jewelry",
      subcategories: [
        "Earrings",
        "Necklaces",
        "Rings",
        "Bracelets",
        "Watches",
        "Jewelry Sets",
        "Body Jewelry",
        "Cremation & Memorial Jewelry",
        "Jewelry Storage",
        "Brooches, Pins & Clips",
        "Smart Jewelry",
        "Cuff Links & Tie Clips"
      ],
      aliases: ["jewelry", "adornments"]
    },
    {
      name: "Clothing",
      slug: "clothing",
      subcategories: [
        "Women's Clothing",
        "Men's Clothing",
        "Boys' Clothing",
        "Girls' Clothing",
        "Gender-Neutral Adult Clothing",
        "Gender-Neutral Kids' Clothing"
      ],
      aliases: ["clothing", "fashion", "apparel", "clothing-shoes", "fashion-leather"]
    },
    {
      name: "Bags & Purses",
      slug: "bags-and-purses",
      subcategories: [
        "Handbags",
        "Totes",
        "Backpacks",
        "Wallets & Money Clips",
        "Pouches & Coin Purses",
        "Cosmetic & Toiletry Storage",
        "Luggage & Travel",
        "Fanny Packs",
        "Messenger Bags",
        "Market Bags",
        "Accessory Cases",
        "Food & Insulated Bags",
        "Clothing & Shoe Bags",
        "Diaper Bags",
        "Sports Bags"
      ],
      aliases: ["bags-and-purses", "bags-purses", "bags & purses", "leatherwork", "leather"]
    },
    {
      name: "Accessories",
      slug: "accessories",
      subcategories: [
        "Hair Accessories",
        "Hats & Headwear",
        "Patches & Appliqués",
        "Keychains & Lanyards",
        "Scarves & Wraps",
        "Belts & Suspenders",
        "Pins & Clips",
        "Gloves & Sleeves",
        "Costume Accessories",
        "Sunglasses & Eyewear",
        "Bouquets & Corsages",
        "Aprons",
        "Suit & Tie Accessories",
        "Umbrellas & Rain Accessories",
        "Face Masks & Accessories",
        "Hand Fans",
        "Collars"
      ],
      aliases: ["accessories", "adornments", "jewelry-accessories"]
    },
    {
      name: "Art & Collectibles",
      slug: "art-and-collectibles",
      subcategories: [
        "Prints",
        "Painting",
        "Sculpture",
        "Collectibles",
        "Glass Art",
        "Fine Art Ceramics",
        "Photography",
        "Drawing & Illustration",
        "Dolls & Miniatures",
        "Fiber Arts",
        "Mixed Media & Collage",
        "Artist Trading Cards"
      ],
      aliases: ["art-and-collectibles", "art-collectibles", "art & collectibles", "fine art", "vintage", "vintage-heritage", "paintings", "sculptures"]
    },
    {
      name: "Gifts",
      slug: "gifts",
      subcategories: ["Gift Boxes & Sets", "Personalized Gifts", "Keepsakes"],
      aliases: ["gifts", "gifts-sets", "gifts & sets", "gift-boxes-sets", "personalized"]
    },
    {
      name: "Bath & Beauty",
      slug: "bath-and-beauty",
      subcategories: [
        "Spa & Relaxation",
        "Fragrances",
        "Skin Care",
        "Bath Accessories",
        "Makeup & Cosmetics",
        "Soaps",
        "Personal Care",
        "Hair Care",
        "Cosmetic & Toiletry Storage",
        "Baby & Child Care",
        "Essential Oils"
      ],
      aliases: ["bath-and-beauty", "bath-beauty", "bath & beauty", "beauty & apothecary", "bath & apothecary", "beauty-apothecary"]
    },
    {
      name: "Weddings",
      slug: "weddings",
      subcategories: [
        "Gifts & Mementos",
        "Decorations",
        "Accessories",
        "Clothing",
        "Jewelry",
        "Invitations & Paper",
        "Shoes"
      ],
      aliases: ["weddings", "wedding", "weddings & celebrations"]
    },
    {
      name: "Craft Supplies & Tools",
      slug: "craft-supplies-and-tools",
      subcategories: [
        "Home & Hobby",
        "Sewing & Fiber",
        "Jewelry & Beauty",
        "Visual Arts",
        "Paper, Party & Kids",
        "Sculpting & Forming"
      ],
      aliases: ["craft-supplies-and-tools", "craft-supplies", "craft supplies & tools", "craft supplies"]
    },
    {
      name: "Kids & Baby",
      slug: "kids-and-baby",
      subcategories: [
        "Baby Gift Sets",
        "Nursery Decor",
        "Toys",
        "Baby Blankets",
        "Baby Clothing",
        "Kids' Furniture",
        "Games & Puzzles",
        "Children's Books",
        "Girls' Clothing",
        "Baby Care",
        "Boys' Clothing"
      ],
      aliases: ["kids-and-baby", "kids-baby", "kids & baby"]
    },
    {
      name: "Paper & Party Supplies",
      slug: "paper-and-party-supplies",
      subcategories: [
        "Party Supplies",
        "Paper"
      ],
      aliases: ["paper-and-party-supplies", "stationery-paper", "paper & party supplies", "stationery"]
    },
    {
      name: "Pet Supplies",
      slug: "pet-supplies",
      subcategories: [
        "Pet Collars & Leashes",
        "Pet Gates & Fences",
        "Pet Bedding",
        "Pet Furniture",
        "Pet Clothing, Accessories & Shoes",
        "Pet Toys",
        "Pet Storage",
        "Urns & Memorials",
        "Pet Feeding",
        "Riding & Farm Animals",
        "Pet Carriers & Houses",
        "Pet Health & Wellness",
        "Beekeeping",
        "Training"
      ],
      aliases: ["pet-supplies", "pet supplies"]
    },
    {
      name: "Shoes",
      slug: "shoes",
      subcategories: [
        "Women's Shoes",
        "Men's Shoes",
        "Girls' Shoes",
        "Insoles & Accessories",
        "Boys' Shoes"
      ],
      aliases: ["shoes", "footwear"]
    },
    {
      name: "Toys & Games",
      slug: "toys-and-games",
      subcategories: [
        "Games & Puzzles",
        "Toys",
        "Sports & Outdoor Recreation"
      ],
      aliases: ["toys-and-games", "toys & games"]
    },
    {
      name: "Books, Movies & Music",
      slug: "books-movies-and-music",
      subcategories: [
        "Books",
        "Movies",
        "Music",
        "Video Cases & Tins"
      ],
      aliases: ["books-movies-and-music", "books, movies & music", "books"]
    },
    {
      name: "Electronics & Accessories",
      slug: "electronics-and-accessories",
      subcategories: [
        "Computers & Peripherals",
        "Video Games",
        "Gadgets",
        "Car Parts & Accessories",
        "Cameras & Equipment",
        "Telephones & Handsets",
        "Docking & Stands",
        "Cell Phone Accessories",
        "DIY Kits",
        "Electronics Cases",
        "Audio",
        "Decals & Skins",
        "TV & Projection",
        "Cables & Cords",
        "Batteries & Charging",
        "Parts & Electrical",
        "Maker Supplies"
      ],
      aliases: ["electronics-and-accessories", "electronics & accessories", "tech accessories"]
    }
  ];

  const categoryCountsRaw = await prisma.product.groupBy({
    by: ['category'],
    where: {
      status: "APPROVED",
      artisan: {
        status: "APPROVED"
      }
    },
    _count: {
      _all: true
    }
  });

  const categories = departments.map(dept => {
    const subKeys = new Set([
      dept.name.toLowerCase(),
      dept.slug.toLowerCase(),
      ...(dept.aliases || []).map(a => a.toLowerCase()),
      ...dept.subcategories.map(s => s.toLowerCase()),
      ...dept.subcategories.map(s => s.toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-"))
    ]);

    let totalCount = 0;
    categoryCountsRaw.forEach(item => {
      const raw = (item.category || "").toLowerCase().trim();
      if (subKeys.has(raw)) {
        totalCount += item._count._all;
      }
    });

    return {
      name: dept.name,
      slug: dept.slug,
      subcategories: dept.subcategories,
      count: totalCount
    };
  }).sort((a, b) => b.count - a.count);




  const masterProducts = await prisma.product.findMany({
    where: {
      status: "APPROVED",
      artisan: {
        status: "APPROVED"
      }
    },
    take: 24,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      images: true,
      category: true,
      artisan: {
        select: {
          studioName: true,
          slug: true
        }
      }
    },
    orderBy: [
      { isFeatured: "desc" },
      { createdAt: "desc" }
    ]
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <CategoriesClient
        categories={categories}
        dict={dict}
        lang={lang}
        masterProducts={masterProducts}
      />
    </>
  );
}
