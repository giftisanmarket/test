import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getProductsByCategory } from "@/lib/actions";
import { SITE_URL } from "@/lib/constants";
import { getDictionary, hasLocale } from "../../dictionaries";
import { RecipientGiftsClient, RecipientSlug } from "@/components/recipient-gifts-client";

const VALID_SLUGS: RecipientSlug[] = [
  "for-her",
  "for-him",
  "for-mom",
  "for-couples",
  "for-friends",
  "for-kids",
  "all",
  "anniversary",
  "wedding",
  "birthday",
  "ramadan",
  "home-decor",
];

const META_MAP: Record<RecipientSlug, { titleEn: string; titleAr: string; descEn: string; descAr: string }> = {
  "for-her": {
    titleEn: "Handcrafted Gifts for Her | Artisan Jewelry, Bags & Wraps | Giftisan Egypt",
    titleAr: "هدايا لها | حلي، حقائب، وشموع معطرة مصنوعة يدوياً | جيفتيزان مصر",
    descEn: "Discover unique gifts for her handcrafted by independent Egyptian artisans.",
    descAr: "اكتشف أروع الهدايا الحرفية لها من مجوهرات وحقائب وأوشحة من صانعين مصريين مستقلين.",
  },
  "for-him": {
    titleEn: "Handcrafted Gifts for Him | Genuine Leather & Woodwork | Giftisan Egypt",
    titleAr: "هدايا له | مصنوعات جلدية وأخشاب فخمة مخصصة | جيفتيزان مصر",
    descEn: "Curated leather goods, desk accents, and woodwork accessories handcrafted for him.",
    descAr: "تشكيلة مختارة من المصنوعات الجلدية الطبيعية والإكسسوارات الخشبية المصنوعة يدوياً له.",
  },
  "for-mom": {
    titleEn: "Thoughtful Gifts for Mom | Keepsakes & Home Treasures | Giftisan Egypt",
    titleAr: "هدايا لست الحبايب | تذكارات دافئة وديكورات بيت مميزة | جيفتيزان مصر",
    descEn: "Warm, heartfelt artisan keepsakes and home treasures to celebrate Mom.",
    descAr: "عبر لأغلى الناس بلمسات دافئة، صواني خشبية، وشموع معطرة تليق بمقام ست الحبايب.",
  },
  "for-couples": {
    titleEn: "Wedding & Couples Gifts | Custom Keepsakes & Sets | Giftisan Egypt",
    titleAr: "هدايا للعروسين والمناسبات | صواني خطوبة وتذكارات بالاسم | جيفتيزان مصر",
    descEn: "Custom embroidery hoops, engagement trays, and heirloom keepsakes for couples.",
    descAr: "صواني خطوبة، طارات تطريز محفورة بالأسماء، وهدايا تذكارية توثق أسعد لحظات العمر.",
  },
  "for-friends": {
    titleEn: "Gifts for Friends | Fun Crochet, Mugs & Keychains | Giftisan Egypt",
    titleAr: "هدايا للأصدقاء | كروشيه مرح، أكواب، وميداليات بالاسم | جيفتيزان مصر",
    descEn: "Delightful surprises, playful crochet companions, and handmade tokens for close friends.",
    descAr: "مفاجآت مرحة ولمسات مبهجة وأكواب خزفية لأعز الرفاق.",
  },
  "for-kids": {
    titleEn: "Handmade Gifts for Kids | Wooden Toys & Knit Dolls | Giftisan Egypt",
    titleAr: "هدايا للأطفال | ألعاب خشبية وعرائس كروشيه يدوية | جيفتيزان مصر",
    descEn: "Safe, imaginative Montessori wooden blocks and hand-knit plush dolls for kids.",
    descAr: "ألعاب خشبية تعليمية آمنة وعرائس كروشيه يدوية تشعل خيال ومرح الأطفال.",
  },
  "anniversary": {
    titleEn: "Handcrafted Anniversary Gifts | Heirloom Keepsakes & Custom Sets | Giftisan Egypt",
    titleAr: "هدايا الذكرى السنوية وعيد الزواج | تذكارات محفورة وأطقم راقية | جيفتيزان مصر",
    descEn: "Celebrate your milestone with bespoke handcrafted anniversary gifts from Egyptian artisans.",
    descAr: "احتفل بأجمل الذكريات مع هدايا سنوية مصنوعة يدوياً خصيصاً لكما بأيدي حرفيين مصريين.",
  },
  "wedding": {
    titleEn: "Handcrafted Wedding & Engagement Gifts | Custom Trays & Keepsakes | Giftisan Egypt",
    titleAr: "هدايا الزفاف والخطوبة | صواني شبكة وتذكارات عرسان راقية | جيفتيزان مصر",
    descEn: "Cherish forever with handcrafted engagement trays, custom rings boxes, and wedding keepsakes.",
    descAr: "وثق أجمل البدايات بصواني شبكة وتذكارات عرسان صنعت خصيصاً لتوثيق الفرحة.",
  },
  "home-decor": {
    titleEn: "Housewarming & Home Decor Gifts | Handmade Ceramics & Woodwork | Giftisan Egypt",
    titleAr: "هدايا المنزل والديكور ومباركة البيت | فخار وأخشاب طبيعية راقية | جيفتيزان مصر",
    descEn: "Warm up any home with unique handcrafted ceramics, wooden trays, and artisanal decor.",
    descAr: "قطع ديكور فريدة، فخار يدوي، وصواني خشبية تضفي دفئاً وجمالاً على كل زاوية في البيت.",
  },
  "birthday": {
    titleEn: "Unique Handmade Birthday Gifts | Personalized Surprises | Giftisan Egypt",
    titleAr: "هدايا أعياد الميلاد | مفاجآت مبهجة وقطع مخصصة بالاسم | جيفتيزان مصر",
    descEn: "Make birthdays unforgettable with curated, customizable gifts crafted by local artisans.",
    descAr: "اجعل أعياد الميلاد استثنائية مع هدايا يدوية مخصصة ومبهجة صنعت بحب.",
  },
  "ramadan": {
    titleEn: "Handcrafted Ramadan & Eid Gifts | Traditional Lanterns & Decor | Giftisan Egypt",
    titleAr: "هدايا رمضان والأعياد | فوانيس صدفية، ديكورات إسلامية، ومباخر | جيفتيزان مصر",
    descEn: "Celebrate holy occasions with authentic Egyptian copper lanterns, incense burners, and tableware.",
    descAr: "استقبل المناسبات المباركة بفوانيس نحاسية يدوية، مباخر خزفية، وتحف إسلامية أصيلة.",
  },
  "all": {
    titleEn: "All Handcrafted Gifts | Curated Egyptian Artisan Marketplace | Giftisan",
    titleAr: "جميع الهدايا الحرفية | تسوق هدايا يدوية أصلية من مصر | جيفتيزان",
    descEn: "Browse all curated gifts from independent Egyptian makers and heritage workshops.",
    descAr: "تصفح جميع الهدايا الحرفية المميزة المصنوعة بأيدي أمهر الصناع والورش في مصر.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  const normalizedSlug = decodeURIComponent(slug).trim().replace(/\s*-\s*/g, "-") as RecipientSlug;
  if (!hasLocale(lang) || !VALID_SLUGS.includes(normalizedSlug)) return {};
  const isAr = lang === "ar";
  const validSlug = normalizedSlug;
  const meta = META_MAP[validSlug];

  const title = isAr ? meta.titleAr : meta.titleEn;
  const description = isAr ? meta.descAr : meta.descEn;
  const ogImage = `${SITE_URL}/images/gifts/gifts-for-her.webp`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/${lang}/gifts/${validSlug}`,
      languages: {
        "en-US": `${SITE_URL}/en/gifts/${validSlug}`,
        "ar-EG": `${SITE_URL}/ar/gifts/${validSlug}`,
        "x-default": `${SITE_URL}/en/gifts/${validSlug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${lang}/gifts/${validSlug}`,
      images: [
        {
          url: ogImage,
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
      images: [ogImage],
    },
  };
}

export const revalidate = 60;

export default async function RecipientGiftsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { lang, slug } = await params;
  const normalizedSlug = decodeURIComponent(slug).trim().replace(/\s*-\s*/g, "-") as RecipientSlug;

  // Auto-heal URLs with spaces or casing issues (e.g., "for -him" -> "for-him")
  if (hasLocale(lang) && normalizedSlug !== slug && VALID_SLUGS.includes(normalizedSlug)) {
    redirect(`/${lang}/gifts/${normalizedSlug}`);
  }

  if (!hasLocale(lang) || !VALID_SLUGS.includes(normalizedSlug)) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  let initialPrice = typeof resolvedSearchParams?.price === "string" ? resolvedSearchParams.price : undefined;
  if (!initialPrice) {
    if (resolvedSearchParams?.maxPrice === "250") {
      initialPrice = "UNDER_250";
    } else if (resolvedSearchParams?.maxPrice === "500") {
      initialPrice = "UNDER_500";
    } else if (resolvedSearchParams?.maxPrice === "1000") {
      initialPrice = "UNDER_1000";
    } else if (resolvedSearchParams?.minPrice === "1000") {
      initialPrice = "OVER_1000";
    }
  }

  const initialOccasion = typeof resolvedSearchParams?.occasion === "string" ? resolvedSearchParams.occasion : undefined;

  const dict = await getDictionary(lang as any);
  const products = await getProductsByCategory("gifts");

  const validSlug = normalizedSlug;
  const meta = META_MAP[validSlug];
  const isAr = lang === "ar";

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: dict.common?.home || "Home",
        item: `${SITE_URL}/${lang}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: dict.gifts_hub?.all_gifts || "Gift Guide",
        item: `${SITE_URL}/${lang}/gifts`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: isAr ? meta.titleAr : meta.titleEn,
        item: `${SITE_URL}/${lang}/gifts/${slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <RecipientGiftsClient
        initialProducts={products}
        dict={dict}
        slug={validSlug}
        initialPrice={initialPrice}
        initialOccasion={initialOccasion}
        lang={lang}
      />
    </>
  );
}
