"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Heart, 
  Sparkles, 
  Gift, 
  PartyPopper, 
  Cake, 
  GraduationCap, 
  Baby, 
  Home, 
  Coins, 
  ArrowRight,
  Smile
} from "lucide-react";

interface GiftDiscoveryHubProps {
  dict: any;
}

export function GiftDiscoveryHub({ dict }: GiftDiscoveryHubProps) {
  const isArabic = dict?.common?.home === "الرئيسية" || dict?.common?.search?.includes("ابحث");
  const lang = isArabic ? "ar" : "en";
  const [activeTab, setActiveTab] = useState<"recipient" | "occasion" | "budget">("recipient");

  const recipients = [
    {
      id: "her",
      nameEn: "Gifts for Her",
      nameAr: "هدايا لها",
      subEn: "Jewelry, bags, scented candles & wraps",
      subAr: "حلي، حقائب، شموع معطرة، كروشيه فاخر",
      image: "/images/gifts/gifts-for-her.webp",
      href: `/${lang}/gifts/for-her`,
      badgeEn: "Most Popular",
      badgeAr: "الأكثر طلباً",
    },
    {
      id: "him",
      nameEn: "Gifts for Him",
      nameAr: "هدايا له",
      subEn: "Handmade leather, desk accents & woodwork",
      subAr: "جلود طبيعية، مقتنيات مكتب، وأخشاب فخمة",
      image: "/images/gifts/gifts-for-him.webp",
      href: `/${lang}/gifts/for-him`,
      badgeEn: "Thoughtful",
      badgeAr: "مختارات مميزة",
    },
    {
      id: "mom",
      nameEn: "Gifts for Mom",
      nameAr: "هدايا لست الحبايب",
      subEn: "Personalized keepsakes & home treasures",
      subAr: "تذكارات محفورة بالاسم وديكورات دافئة للبيت",
      image: "/images/categories/gift-boxes-sets.webp",
      href: `/${lang}/gifts/for-mom`,
      badgeEn: "Heartfelt",
      badgeAr: "من القلب",
    },
    {
      id: "couples",
      nameEn: "Weddings & Couples",
      nameAr: "هدايا للعروسين",
      subEn: "Custom plates, embroidery & luxury sets",
      subAr: "صواني خطوبة، طارات تطريز، وباقات للعروسين",
      image: "/images/categories/personalized.webp",
      href: `/${lang}/gifts/for-couples`,
      badgeEn: "Keepsake",
      badgeAr: "ذكرى خاصة",
    },
    {
      id: "friends",
      nameEn: "Gifts for Friends",
      nameAr: "هدايا للأصدقاء",
      subEn: "Mugs, quirky crochet & cute keychains",
      subAr: "أكواب خزفية، كروشيه مرح، وميداليات بالاسم",
      image: "/images/hero/hero-crochet-monster.webp",
      href: `/${lang}/gifts/for-friends`,
      badgeEn: "Fun & Unique",
      badgeAr: "مرحة وفريدة",
    },
    {
      id: "kids",
      nameEn: "Gifts for Kids",
      nameAr: "هدايا للأطفال",
      subEn: "Montessori wooden toys & plush knit dolls",
      subAr: "ألعاب خشبية تعليمية وعرائس كروشيه يدوية",
      image: "/images/gifts/gifts-for-kids.webp",
      href: `/${lang}/gifts/for-kids`,
      badgeEn: "Safe & Sweet",
      badgeAr: "آمنة ومحبوبة",
    },
  ];

  const occasions = [
    {
      id: "birthday",
      nameEn: "Birthday Celebrations",
      nameAr: "أعياد الميلاد",
      subEn: "Joyful gifts wrapped to make their year special",
      subAr: "هدايا مفرحة ومجهزة لتسعد قلوب أصحاب العيد",
      icon: Cake,
      color: "from-amber-500/10 to-amber-600/5 text-amber-700 border-amber-200/60",
      href: `/${lang}/search?q=birthday`,
    },
    {
      id: "wedding",
      nameEn: "Engagement & Katb Ketab",
      nameAr: "الخطوبة وكتب الكتاب",
      subEn: "Personalized trays, rings boxes & bridal keepsakes",
      subAr: "صواني شبكة، علب دبل محفورة، وتذكارات كتب الكتاب",
      icon: Heart,
      color: "from-rose-500/10 to-rose-600/5 text-rose-700 border-rose-200/60",
      href: `/${lang}/search?q=wedding`,
    },
    {
      id: "graduation",
      nameEn: "Graduation Milestones",
      nameAr: "حفلات التخرج والنجاح",
      subEn: "Custom engraved gifts to honor big achievements",
      subAr: "تذكارات محفورة بالاسم والتواريخ لتخليد التخرج",
      icon: GraduationCap,
      color: "from-emerald-500/10 to-emerald-600/5 text-emerald-800 border-emerald-200/60",
      href: `/${lang}/search?q=graduation`,
    },
    {
      id: "baby",
      nameEn: "New Baby & Sebou'",
      nameAr: "سبوع ومولود جديد",
      subEn: "Gentle organic knits, keepsake boxes & plaques",
      subAr: "منسوجات قطنية ناعمة، تابلوهات بالاسم، وتذكارات السبوع",
      icon: Baby,
      color: "from-sky-500/10 to-sky-600/5 text-sky-800 border-sky-200/60",
      href: `/${lang}/search?q=baby`,
    },
    {
      id: "housewarming",
      nameEn: "New Home & Mubarak",
      nameAr: "مباركة البيت الجديد",
      subEn: "Artisan ceramics, concrete sets & wall decor",
      subAr: "خزف يدوي، مجموعات كونكريت، وديكورات حائط أصيلة",
      icon: Home,
      color: "from-stone-500/10 to-stone-600/5 text-stone-700 border-stone-200/60",
      href: `/${lang}/category/home-and-living`,
    },
    {
      id: "anniversary",
      nameEn: "Anniversary & Romantic",
      nameAr: "ذكرى سنوية ورومانسية",
      subEn: "Customized date jewelry & shared memory boxes",
      subAr: "حلي منقوشة بالتواريخ وصناديق لحفظ أجمل الذكريات",
      icon: Sparkles,
      color: "from-purple-500/10 to-purple-600/5 text-purple-800 border-purple-200/60",
      href: `/${lang}/gifts/for-couples`,
    },
  ];

  const budgets = [
    {
      id: "UNDER_250",
      titleEn: "Under 250 EGP",
      titleAr: "أقل من 250 ج.م",
      subEn: "Sweet thoughtful tokens, keychains & mugs",
      subAr: "مفاجآت لطيفة، ميداليات مخصصة، وأكواب فنية",
      tagEn: "Budget Friendly",
      tagAr: "اقتصادي ولطيف",
      href: `/${lang}/gifts/all?price=UNDER_250`,
    },
    {
      id: "UNDER_500",
      titleEn: "Under 500 EGP",
      titleAr: "أقل من 500 ج.م",
      subEn: "Handcrafted accessories, candles & concrete sets",
      subAr: "إكسسوارات يدوية، شموع طبيعية، وديكورات أنيقة",
      tagEn: "Best Value",
      tagAr: "الأكثر اختياراً",
      href: `/${lang}/gifts/all?price=UNDER_500`,
    },
    {
      id: "UNDER_1000",
      titleEn: "500 – 1,000 EGP",
      titleAr: "500 – 1,000 ج.م",
      subEn: "Fine crochet bags, silver jewelry & bespoke gifts",
      subAr: "حقائب كروشيه وجلود، فضة يدوية، وتذكارات خاصة",
      tagEn: "Artisan Craft",
      tagAr: "صناعة مميزة",
      href: `/${lang}/gifts/all?price=UNDER_1000`,
    },
    {
      id: "OVER_1000",
      titleEn: "Premium Keepsakes",
      titleAr: "هدايا فاخرة ومقتنيات نادرة",
      subEn: "Luxury gift sets, heirloom wood & custom art",
      subAr: "صناديق هدايا ملكية، أخشاب مطعمة، وتحف تدوم لأجيال",
      tagEn: "Luxury Tier",
      tagAr: "فخامة استثنائية",
      href: `/${lang}/gifts/all?price=OVER_1000`,
    },
  ];

  return (
    <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16 py-8 md:py-12 2xl:py-16 border-t border-primary/5">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-8 2xl:mb-10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs 2xl:text-sm font-bold mb-2">
            <Gift className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
            <span>{isArabic ? "دليل الهدايا الذكي" : "Gift Discovery Concierge"}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl 2xl:text-[2.6rem] 3xl:text-5xl font-serif font-bold text-primary tracking-tight">
            {isArabic ? "من تحتفل معه اليوم؟" : "Find gifts that mean more."}
          </h2>
          <p className="text-xs sm:text-sm 2xl:text-base text-charcoal/65 mt-1 max-w-xl 2xl:max-w-2xl">
            {isArabic
              ? "ابحث حسب الشخص، المناسبة، أو الميزانية، وتصفح إبداعات حقيقية صُنعت خصيصاً لتفرح قلوب أحبائك."
              : "Discover one-of-a-kind Egyptian artisan gifts by recipient, occasion, or budget."}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-cream-dark/60 rounded-full border border-primary/10 self-start md:self-auto overflow-x-auto scrollbar-none max-w-full">
          <button
            onClick={() => setActiveTab("recipient")}
            className={`px-4 2xl:px-5 py-2 2xl:py-2.5 rounded-full text-xs 2xl:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "recipient"
                ? "bg-primary text-cream shadow-xs"
                : "text-charcoal/70 hover:text-primary"
            }`}
          >
            {isArabic ? "حسب الشخص" : "By Recipient"}
          </button>
          <button
            onClick={() => setActiveTab("occasion")}
            className={`px-4 2xl:px-5 py-2 2xl:py-2.5 rounded-full text-xs 2xl:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "occasion"
                ? "bg-primary text-cream shadow-xs"
                : "text-charcoal/70 hover:text-primary"
            }`}
          >
            {isArabic ? "حسب المناسبة" : "By Occasion"}
          </button>
          <button
            onClick={() => setActiveTab("budget")}
            className={`px-4 2xl:px-5 py-2 2xl:py-2.5 rounded-full text-xs 2xl:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "budget"
                ? "bg-primary text-cream shadow-xs"
                : "text-charcoal/70 hover:text-primary"
            }`}
          >
            {isArabic ? "حسب الميزانية" : "By Budget"}
          </button>
        </div>
      </div>

      {/* Mode 1: By Recipient */}
      {activeTab === "recipient" && (
        <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-5 2xl:gap-6 overflow-x-auto sm:overflow-visible pb-3 pt-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-none scroll-smooth">
          {recipients.map((rec) => (
            <Link
              key={rec.id}
              href={rec.href}
              className="w-[62vw] max-w-[240px] sm:w-auto shrink-0 snap-start sm:snap-align-none group relative rounded-2xl 2xl:rounded-3xl overflow-hidden bg-white border border-primary/10 shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col h-[235px] sm:h-[260px] md:h-[280px] 2xl:h-[320px] 3xl:h-[350px]"
            >
              {/* Card Image */}
              <div className="relative w-full h-[58%] sm:h-[60%] 2xl:h-[62%] overflow-hidden bg-cream/40">
                <Image
                  src={rec.image}
                  alt={isArabic ? rec.nameAr : rec.nameEn}
                  fill
                  className="object-cover group-hover:scale-106 transition-transform duration-500 ease-out"
                  sizes="(max-width: 640px) 65vw, (max-width: 1024px) 33vw, 16vw"
                />
                <span className="absolute top-2.5 start-2.5 2xl:top-3.5 2xl:start-3.5 px-2 2xl:px-2.5 py-0.5 rounded-full text-[10px] 2xl:text-xs font-bold bg-[#064E3B] text-white shadow-2xs">
                  {isArabic ? rec.badgeAr : rec.badgeEn}
                </span>
              </div>

              {/* Card Text */}
              <div className="p-3 sm:p-3.5 2xl:p-4.5 flex flex-col justify-between flex-1 bg-white">
                <div>
                  <h3 className="font-heading font-bold text-xs sm:text-sm 2xl:text-base text-primary group-hover:text-accent transition-colors leading-tight">
                    {isArabic ? rec.nameAr : rec.nameEn}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] 2xl:text-xs text-charcoal/60 line-clamp-2 mt-1 leading-snug">
                    {isArabic ? rec.subAr : rec.subEn}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] 2xl:text-xs font-bold text-accent pt-1 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                  <span>{isArabic ? "تسوق الآن" : "Shop"}</span>
                  <ArrowRight className="w-3 h-3 2xl:w-3.5 2xl:h-3.5 rtl:rotate-180" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Mode 2: By Occasion */}
      {activeTab === "occasion" && (
        <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-5 2xl:gap-6 overflow-x-auto sm:overflow-visible pb-3 pt-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-none scroll-smooth">
          {occasions.map((occ) => {
            const Icon = occ.icon;
            return (
              <Link
                key={occ.id}
                href={occ.href}
                className={`w-[50vw] max-w-[210px] sm:w-auto shrink-0 snap-start sm:snap-align-none group p-4 sm:p-5 2xl:p-6 rounded-2xl 2xl:rounded-3xl bg-gradient-to-b ${occ.color} border shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between h-[180px] sm:h-[200px] 2xl:h-[230px] 3xl:h-[250px]`}
              >
                <div className="w-10 h-10 2xl:w-12 2xl:h-12 rounded-xl 2xl:rounded-2xl bg-white shadow-xs flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
                  <Icon className="w-5 h-5 2xl:w-6 2xl:h-6" />
                </div>

                <div>
                  <h3 className="font-heading font-bold text-xs sm:text-sm 2xl:text-base text-primary group-hover:text-accent transition-colors leading-snug">
                    {isArabic ? occ.nameAr : occ.nameEn}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] 2xl:text-xs text-charcoal/65 line-clamp-2 mt-1 leading-snug">
                    {isArabic ? occ.subAr : occ.subEn}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-[11px] 2xl:text-xs font-bold text-primary/80 group-hover:text-accent group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                  <span>{isArabic ? "استكشف الهدايا" : "Explore"}</span>
                  <ArrowRight className="w-3 h-3 2xl:w-3.5 2xl:h-3.5 rtl:rotate-180" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Mode 3: By Budget */}
      {activeTab === "budget" && (
        <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 2xl:gap-6 overflow-x-auto sm:overflow-visible pb-3 pt-1 -mx-1 px-1 snap-x snap-mandatory scrollbar-none scroll-smooth">
          {budgets.map((b) => (
            <Link
              key={b.id}
              href={b.href}
              className="w-[70vw] max-w-[280px] sm:w-auto shrink-0 snap-start sm:snap-align-none group p-5 sm:p-6 2xl:p-8 rounded-2xl 2xl:rounded-3xl bg-white border border-primary/10 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2 2xl:space-y-3">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] 2xl:text-xs font-bold bg-[#D97706]/15 text-[#B45309]">
                  {isArabic ? b.tagAr : b.tagEn}
                </span>
                <h3 className="text-lg sm:text-xl 2xl:text-2xl 3xl:text-3xl font-serif font-bold text-primary group-hover:text-accent transition-colors">
                  {isArabic ? b.titleAr : b.titleEn}
                </h3>
                <p className="text-xs 2xl:text-sm text-charcoal/65 leading-relaxed">
                  {isArabic ? b.subAr : b.subEn}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 2xl:pt-3 border-t border-primary/5">
                <span className="text-xs 2xl:text-sm font-bold text-primary group-hover:text-accent transition-colors">
                  {isArabic ? "تصفح التشكيلة" : "Browse Gifts"}
                </span>
                <div className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-full bg-cream flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <ArrowRight className="w-4 h-4 2xl:w-4.5 2xl:h-4.5 rtl:rotate-180" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
