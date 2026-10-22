"use client";

import { useState, useMemo, useEffect, Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Footer } from "@/components/footer";
import {
  Heart,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Search,
  ChevronRight,
  Plus,
  Star,
  MapPin,
  Sparkles,
  Clock,
  Gift,
  Camera,
} from "lucide-react";
import { useFavorites } from "@/context/favorites-context";
import { useBrowsingHistory } from "@/hooks/use-browsing-history";
import { filterProductsByEtsyTab } from "@/lib/recommendations";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/utils";
import { NativeSearchView } from "@/components/native/native-search-view";
import type { ShelfProduct } from "@/components/home/product-shelf-row";

interface NativeHomeViewProps {
  allProducts?: ShelfProduct[];
  trendingProducts?: ShelfProduct[];
  bagProducts?: ShelfProduct[];
  homeDecorProducts?: ShelfProduct[];
  jewelryProducts?: ShelfProduct[];
  crochetApparelProducts?: ShelfProduct[];
  giftSetProducts?: ShelfProduct[];
  featuredArtisans?: any[];
  artisanCount?: number;
  dict: any;
}

export function NativeHomeView({
  allProducts = [],
  trendingProducts = [],
  bagProducts = [],
  homeDecorProducts = [],
  jewelryProducts = [],
  crochetApparelProducts = [],
  giftSetProducts = [],
  featuredArtisans = [],
  dict,
}: NativeHomeViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { toggleFavorite, isFavorite, favorites } = useFavorites();
  const { recentViews, categoryAffinities, clearHistory } = useBrowsingHistory();

  const [activeTab, setActiveTab] = useState<
    "forYou" | "newFinds" | "personalized" | "under250" | "jewelry" | "home"
  >("forYou");
  const [visibleCount, setVisibleCount] = useState(24);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const isArabic = dict?.common?.home === "الرئيسية" || dict?.common?.search?.includes("ابحث");
  const currency = dict?.product?.currency || "EGP";

  // Build favorite IDs set for fast scoring lookup
  const favoriteIds = useMemo(() => {
    return new Set((favorites || []).map((f: any) => f.id));
  }, [favorites]);

  // Master catalog of approved products
  const masterCatalog = useMemo(() => {
    const map = new Map<string, ShelfProduct>();
    allProducts.forEach((p) => map.set(p.id, p));
    [
      ...trendingProducts,
      ...jewelryProducts,
      ...homeDecorProducts,
      ...bagProducts,
      ...giftSetProducts,
      ...crochetApparelProducts,
    ].forEach((p) => {
      if (!map.has(p.id)) map.set(p.id, p);
    });
    return Array.from(map.values());
  }, [
    allProducts,
    trendingProducts,
    jewelryProducts,
    homeDecorProducts,
    bagProducts,
    giftSetProducts,
    crochetApparelProducts,
  ]);

  // Language switch handler with native haptics
  const handleToggleLang = () => {
    triggerHaptic("medium");
    const nextLang = pathname.startsWith("/en") ? "ar" : "en";
    document.cookie = `NEXT_LOCALE=${nextLang}; path=/; max-age=31536000`;
    const nextPath = pathname.replace(/^\/(en|ar)/, `/${nextLang}`);
    router.push(nextPath);
  };

  // Dynamic Contextual Greeting (Time of Day & User Name)
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    let timeGreeting = isArabic ? "مساء الخير" : "Good afternoon";
    if (hour < 12) {
      timeGreeting = isArabic ? "صباح الخير" : "Good morning";
    } else if (hour >= 18) {
      timeGreeting = isArabic ? "مساء النور" : "Good evening";
    }

    const userName = session?.user?.name ? session.user.name.split(" ")[0] : null;
    if (userName) {
      return isArabic ? `${timeGreeting}، ${userName}` : `${timeGreeting}, ${userName}`;
    }
    return timeGreeting;
  }, [isArabic, session?.user?.name]);

  // Visual Category Stories (Circular shortcuts)
  const categoryBubbles = [
    {
      id: "personalized",
      nameEn: "Personalized",
      nameAr: "مخصصة بالاسم",
      image: "/images/categories/personalized.webp",
      href: "/gifts",
    },
    {
      id: "jewelry",
      nameEn: "Jewelry",
      nameAr: "مجوهرات وحلي",
      image: "/images/categories/jewelry.webp",
      href: "/category/jewelry",
    },
    {
      id: "bags",
      nameEn: "Bags & Leather",
      nameAr: "حقائب وجلود",
      image: "/images/categories/fashion.webp",
      href: "/category/bags-and-purses",
    },
    {
      id: "home",
      nameEn: "Home Living",
      nameAr: "ديكور البيت",
      image: "/images/categories/woodwork.webp",
      href: "/category/home-and-living",
    },
    {
      id: "ceramics",
      nameEn: "Ceramics",
      nameAr: "خزف وفخار",
      image: "/images/categories/ceramics.webp",
      href: "/category/ceramics",
    },
    {
      id: "textiles",
      nameEn: "Crochet",
      nameAr: "كروشيه وتريكو",
      image: "/images/categories/textiles.webp",
      href: "/category/clothing",
    },
    {
      id: "gift-boxes",
      nameEn: "Gift Sets",
      nameAr: "بوكسات هدايا",
      image: "/images/categories/gift-boxes-sets.webp",
      href: "/category/gifts-sets",
    },
  ];

  // Gifting Intent & Occasion Hub Pills
  const occasionPills = [
    { id: "for-her", href: "/gifts/for-her", labelEn: "For Her", labelAr: "هدايا لها" },
    { id: "for-him", href: "/gifts/for-him", labelEn: "For Him", labelAr: "هدايا له" },
    { id: "under-250", href: "/gifts", labelEn: "Under 250 EGP", labelAr: "أقل من ٢٥٠ ج.م" },
    { id: "birthday", href: "/gifts/birthday", labelEn: "Birthday", labelAr: "أعياد ميلاد" },
    { id: "ramadan", href: "/gifts/ramadan", labelEn: "Ramadan & Eid", labelAr: "رمضان والأعياد" },
    { id: "home-decor", href: "/gifts/home-decor", labelEn: "Housewarming", labelAr: "مباركة منزل" },
    { id: "anniversary", href: "/gifts/anniversary", labelEn: "Anniversary", labelAr: "ذكرى مميزة" },
  ];

  // Top Master Artisan for "Meet the Maker"
  const topArtisan = featuredArtisans?.[0];

  // Under 250 EGP Psychological Shelf Products
  const under250Products = useMemo(() => {
    return masterCatalog.filter((p) => p.price <= 250).slice(0, 10);
  }, [masterCatalog]);

  // Fallback curated hero highlight cards if no browsing history exists
  const defaultHeroCards = useMemo(() => {
    return [
      {
        id: "crafts",
        titleEn: "Handcrafted in Egypt",
        titleAr: "صنع بكل فخر في مصر",
        subtitleEn: "Authentic artisan creations",
        subtitleAr: "قطع يدوية أصلية",
        image: "/images/categories/personalized.webp",
        href: "/gifts",
      },
      {
        id: "under250",
        titleEn: "Under 250 EGP",
        titleAr: "هدايا بأقل من ٢٥٠ ج.م",
        subtitleEn: "Thoughtful & affordable",
        subtitleAr: "هدايا راقية بأسعار في المتناول",
        image: "/images/categories/gift-boxes-sets.webp",
        href: "/gifts",
      },
      {
        id: "bespoke",
        titleEn: "Custom Keepsakes",
        titleAr: "قطع مخصصة بالاسم",
        subtitleEn: "Engraved & personalized",
        subtitleAr: "نقش وكتابة بالاسم",
        image: "/images/categories/jewelry.webp",
        href: "/category/jewelry",
      },
    ];
  }, []);

  // Algorithmic Ranked Pool for Active Tab
  const activePool = useMemo(() => {
    return filterProductsByEtsyTab(masterCatalog, activeTab, {
      userAffinities: categoryAffinities,
      favoriteIds,
    });
  }, [masterCatalog, activeTab, categoryAffinities, favoriteIds]);

  const displayedFeedProducts = useMemo(() => {
    return activePool.slice(0, visibleCount);
  }, [activePool, visibleCount]);

  const handleLoadMore = () => {
    triggerHaptic("light");
    setVisibleCount((prev) => prev + 24);
  };

  return (
    <div className="min-h-screen bg-cream text-charcoal select-none pb-32">
      {/* 1. Etsy Native Sticky Search Bar & Language Switcher */}
      <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur-md px-3.5 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-2.5 border-b border-primary/5 shadow-2xs">
        <div className="flex items-center gap-2">
          {/* Full-Width Rounded Pill Search Bar */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setIsSearchOpen(true);
            }}
            className="flex-1 flex items-center gap-2.5 bg-white border border-primary/10 rounded-full px-4 py-2.5 shadow-2xs text-charcoal/50 text-xs active:scale-[0.99] transition-transform text-start"
          >
            <Search className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate font-medium">
              {isArabic ? "ابحث عن شيء مميز في جيفتيزان..." : "Search for something special..."}
            </span>
            <Camera className="w-3.5 h-3.5 text-primary/40 shrink-0 ms-auto" />
          </button>

          {/* Clean Language Switcher Pill */}
          <button
            type="button"
            onClick={handleToggleLang}
            aria-label="Switch language"
            className="h-10 px-3.5 rounded-full bg-white border border-primary/10 text-primary text-xs font-black shadow-2xs shrink-0 flex items-center justify-center active:scale-95 transition-transform"
          >
            {isArabic ? "EN" : "عربي"}
          </button>
        </div>
      </header>

      {/* 2. Contextual Dynamic Greeting */}
      <section className="px-3.5 pt-3 pb-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-lg sm:text-xl font-bold text-primary tracking-tight">
              {greeting}
            </h1>
            <p className="text-[11px] text-charcoal/50 font-medium flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3 h-3 text-accent shrink-0" />
              <span>
                {isArabic
                  ? "اكتشف هدايا مصنوعة بأيدي أمهر الحرفيين في مصر"
                  : "Curated handmade gifts from Egyptian heritage workshops"}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* 3. Etsy "Pick Up Where You Left Off" / Curated Welcome Carousel */}
      <section className="pt-2 pb-1">
        {recentViews.length > 0 ? (
          <div>
            <div className="px-3.5 flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Clock className="w-3.5 h-3.5 text-accent" />
                <span>{isArabic ? "أكمل التصفح" : "Pick up where you left off"}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  clearHistory();
                }}
                className="text-[10px] font-bold text-charcoal/40 hover:text-red-500 transition-colors"
              >
                {isArabic ? "مسح السجل" : "Clear"}
              </button>
            </div>

            <div className="flex gap-2.5 overflow-x-auto px-3.5 pb-1 scrollbar-hide">
              {recentViews.slice(0, 8).map((item) => (
                <Link
                  key={item.id}
                  href={`/products/${item.slug || item.id}`}
                  onClick={() => triggerHaptic("light")}
                  className="w-32 shrink-0 bg-white rounded-2xl border border-primary/10 shadow-2xs overflow-hidden flex flex-col active:scale-95 transition-transform"
                >
                  <div className="relative aspect-square w-full bg-cream/40 overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-2 space-y-0.5">
                    <p className="text-[11px] font-bold text-primary truncate leading-tight">
                      {item.name}
                    </p>
                    <p className="text-[10px] font-black text-primary">
                      {currency} {item.price.toLocaleString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto ps-3.5 pe-3 scrollbar-hide">
            {defaultHeroCards.map((card) => (
              <Link
                key={card.id}
                href={card.href}
                onClick={() => triggerHaptic("light")}
                className="w-52 shrink-0 bg-white rounded-2xl border border-primary/10 shadow-2xs overflow-hidden flex flex-col active:scale-[0.98] transition-transform"
              >
                <div className="relative h-24 w-full bg-cream/40 overflow-hidden shrink-0">
                  <Image
                    src={card.image}
                    alt={card.titleEn}
                    fill
                    sizes="208px"
                    className="object-cover"
                  />
                </div>
                <div className="p-2.5 flex items-center justify-between bg-white border-t border-primary/5">
                  <div className="min-w-0 pr-1">
                    <h3 className="font-serif text-xs font-bold text-primary truncate">
                      {isArabic ? card.titleAr : card.titleEn}
                    </h3>
                    <p className="text-[10px] text-charcoal/50 font-medium truncate mt-0.5">
                      {isArabic ? card.subtitleAr : card.subtitleEn}
                    </p>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-cream border border-primary/10 flex items-center justify-center text-primary shrink-0">
                    {isArabic ? (
                      <ArrowLeft className="w-3 h-3" />
                    ) : (
                      <ArrowRight className="w-3 h-3" />
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 4. Circular Category Story Bubbles */}
      <section className="pt-2 pb-2 px-3 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-3.5 min-w-max px-1">
          {categoryBubbles.map((cat) => (
            <Link
              key={cat.id}
              href={cat.href}
              onClick={() => triggerHaptic("light")}
              className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform"
            >
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary/15 shadow-xs bg-white group-hover:border-accent transition-colors">
                <Image
                  src={cat.image}
                  alt={cat.nameEn}
                  fill
                  sizes="64px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <span className="text-[11px] font-bold text-primary max-w-[68px] truncate text-center">
                {isArabic ? cat.nameAr : cat.nameEn}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. Gifting Intent & Occasion Hub */}
      <section className="px-3.5 pt-1 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
          <div className="flex items-center gap-1 text-[11px] font-black text-primary/70 shrink-0 pe-1">
            <Gift className="w-3.5 h-3.5 text-accent" />
            <span>{isArabic ? "الهدايا:" : "Gifts:"}</span>
          </div>
          {occasionPills.map((pill) => (
            <Link
              key={pill.id}
              href={pill.href}
              onClick={() => triggerHaptic("light")}
              className="px-3 py-1.5 rounded-full bg-white border border-primary/10 text-primary text-xs font-bold shrink-0 shadow-2xs hover:border-accent/40 active:scale-95 transition-transform"
            >
              {isArabic ? pill.labelAr : pill.labelEn}
            </Link>
          ))}
        </div>
      </section>

      {/* 6. Curated Master Artisan Studio Spotlight ("Meet the Maker") */}
      {topArtisan && (
        <section className="px-3.5 pt-2 pb-2">
          <div className="bg-gradient-to-br from-white via-white to-cream/70 rounded-3xl p-4 border border-primary/10 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-primary/10 bg-cream shrink-0">
                  <Image
                    src={topArtisan.avatar || "/placeholder.jpg"}
                    alt={topArtisan.studioName || "Artisan"}
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-accent">
                    <Sparkles className="w-3 h-3 text-accent shrink-0" />
                    <span>{isArabic ? "ورشة مميزة" : "Featured Workshop"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <h3 className="text-xs sm:text-sm font-bold text-primary truncate">
                      {topArtisan.studioName || topArtisan.user?.name}
                    </h3>
                    {topArtisan.isVerified && (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-charcoal/60 truncate">
                    <MapPin className="w-3 h-3 text-accent/70 shrink-0" />
                    <span>{topArtisan.location || (isArabic ? "القاهرة، مصر" : "Cairo, Egypt")}</span>
                  </div>
                </div>
              </div>

              <Link
                href={`/artisans/${topArtisan.slug}`}
                onClick={() => triggerHaptic("light")}
                className="px-3 py-1.5 rounded-full bg-primary text-white text-[11px] font-bold shadow-xs active:scale-95 transition-transform shrink-0 flex items-center gap-1"
              >
                <span>{isArabic ? "زيارة المتجر" : "Visit Studio"}</span>
                {isArabic ? (
                  <ArrowLeft className="w-3 h-3" />
                ) : (
                  <ArrowRight className="w-3 h-3" />
                )}
              </Link>
            </div>

            {/* Top 3 Product Previews */}
            {topArtisan.products?.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-0.5">
                {topArtisan.products.slice(0, 3).map((p: any) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug || p.id}`}
                    onClick={() => triggerHaptic("light")}
                    className="group relative aspect-square rounded-2xl overflow-hidden bg-cream/40 border border-primary/10 shadow-2xs active:scale-95 transition-transform"
                  >
                    <Image
                      src={p.images?.[0] || "/placeholder.jpg"}
                      alt={p.name}
                      fill
                      sizes="33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/80 via-charcoal/30 to-transparent p-1.5 flex items-end">
                      <span className="text-[10px] font-black text-white truncate">
                        {currency} {p.price.toLocaleString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 7. Psychological Price Shelf: Under 250 EGP */}
      {under250Products.length > 0 && (
        <section className="pt-2 pb-2">
          <div className="px-3.5 flex items-center justify-between mb-2">
            <div>
              <h3 className="font-serif text-base sm:text-lg text-primary font-bold">
                {isArabic ? "هدايا مميزة بأقل من ٢٥٠ ج.م" : "Little Luxuries Under 250 EGP"}
              </h3>
              <p className="text-[10px] text-charcoal/50 font-medium">
                {isArabic ? "قطع يدوية فريدة بأسعار في المتناول" : "High-quality, thoughtful budget gifts"}
              </p>
            </div>
            <Link
              href="/gifts"
              onClick={() => triggerHaptic("light")}
              className="text-xs font-bold text-accent hover:underline flex items-center gap-0.5"
            >
              <span>{isArabic ? "الكل" : "See all"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex gap-2.5 overflow-x-auto px-3.5 pb-1 scrollbar-hide">
            {under250Products.map((p) => (
              <Link
                key={p.id}
                href={`/products/${p.slug || p.id}`}
                onClick={() => triggerHaptic("light")}
                className="w-32 shrink-0 flex flex-col bg-white rounded-2xl overflow-hidden border border-primary/10 shadow-2xs active:scale-95 transition-transform"
              >
                <div className="relative aspect-square w-full bg-cream/40">
                  <Image
                    src={p.images?.[0] || "/placeholder.jpg"}
                    alt={p.name}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                  <span className="absolute bottom-1.5 start-1.5 px-1.5 py-0.5 rounded-md bg-[#D97706] text-white text-[8px] font-black uppercase">
                    &lt; 250
                  </span>
                </div>
                <div className="p-2 space-y-0.5">
                  <h4 className="text-[11px] font-bold text-primary truncate leading-tight">
                    {p.name}
                  </h4>
                  <p className="text-[10px] font-black text-primary">
                    {currency} {p.price.toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 8. The Etsy Endless Discovery Feed ("Inspiration at your fingertips") with Multi-Intent Filter Tabs */}
      <section className="px-3.5 pt-3 pb-4">
        <div className="space-y-2.5 mb-3">
          <h2 className="font-serif text-xl sm:text-2xl text-primary font-normal tracking-tight">
            {isArabic ? "إلهام بين يديك" : "Inspiration at your fingertips"}
          </h2>

          {/* Sub-Tabs with Warm Etsy Amber Underline */}
          <div className="flex items-center gap-5 border-b border-primary/10 overflow-x-auto scrollbar-hide">
            {[
              { id: "forYou", labelEn: "For You", labelAr: "خصيصاً لك" },
              { id: "newFinds", labelEn: "New Finds", labelAr: "أحدث القطع" },
              { id: "personalized", labelEn: "Personalized", labelAr: "تخصيص بالاسم" },
              { id: "under250", labelEn: "Under 250 EGP", labelAr: "أقل من ٢٥٠ ج.م" },
              { id: "jewelry", labelEn: "Jewelry", labelAr: "مجوهرات وحلي" },
              { id: "home", labelEn: "Home & Living", labelAr: "ديكور البيت" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setActiveTab(tab.id as any);
                  setVisibleCount(24);
                }}
                className={cn(
                  "relative pb-2.5 text-xs sm:text-sm font-bold transition-colors select-none whitespace-nowrap shrink-0",
                  activeTab === tab.id ? "text-primary font-black" : "text-primary/50"
                )}
              >
                {isArabic ? tab.labelAr : tab.labelEn}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#D97706] rounded-full animate-in fade-in duration-200" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Dense 2-Column Product Grid */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {displayedFeedProducts.map((product) => {
            const favorite = isFavorite(product.id);
            const primaryImage = product.images?.[0] || "/placeholder.jpg";
            const productHref = `/products/${product.slug || product.id}`;
            const artisanName =
              product.artisan?.studioName ||
              product.artisan?.user?.name ||
              (isArabic ? "حرفي مصري" : "Artisan");

            return (
              <div
                key={product.id}
                className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-primary/10 shadow-2xs active:scale-[0.98] transition-all"
              >
                {/* Product Image & Floating Wishlist Heart */}
                <div className="relative aspect-square w-full overflow-hidden bg-cream/40">
                  <Link
                    href={productHref}
                    onClick={() => triggerHaptic("light")}
                    className="block w-full h-full relative"
                  >
                    <Image
                      src={primaryImage}
                      alt={product.name}
                      fill
                      sizes="50vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  </Link>

                  {/* Circular Floating Heart Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      triggerHaptic("medium");
                      toggleFavorite(product);
                    }}
                    aria-label="Add to favorites"
                    className={cn(
                      "absolute top-2 end-2 w-8 h-8 rounded-full bg-white/95 backdrop-blur-xs flex items-center justify-center shadow-md active:scale-75 transition-all duration-200 cursor-pointer",
                      favorite ? "text-[#E05A47] bg-red-50/90" : "text-charcoal/50 hover:text-charcoal hover:bg-white"
                    )}
                  >
                    <Heart
                      className={cn(
                        "w-4 h-4 transition-all duration-200",
                        favorite ? "fill-current scale-110 animate-heart-pop" : "stroke-[2] scale-100"
                      )}
                    />
                  </button>

                  {product.badge && (
                    <span className="absolute bottom-2 start-2 px-2 py-0.5 rounded-full bg-cream/95 backdrop-blur-xs text-[9px] font-black text-primary uppercase tracking-wider border border-primary/10 shadow-xs">
                      {product.badge}
                    </span>
                  )}
                </div>

                {/* Metadata & Pricing */}
                <div className="p-2.5 flex flex-col flex-1 justify-between gap-1">
                  <Link
                    href={productHref}
                    onClick={() => triggerHaptic("light")}
                    className="block"
                  >
                    <h3 className="text-xs font-bold text-primary group-hover:text-accent transition-colors line-clamp-2 leading-tight">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-1 text-[10px] text-charcoal/50 font-medium mt-1 truncate">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                      <span className="font-bold text-charcoal/70">4.9</span>
                      <span className="truncate">· {artisanName}</span>
                      {product.artisan?.isVerified && (
                        <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                      )}
                    </div>
                  </Link>

                  <div className="pt-1 mt-auto flex items-baseline justify-between gap-1">
                    <span className="text-xs sm:text-sm font-black text-primary">
                      {currency} {product.price.toLocaleString()}
                    </span>
                    {product.canPersonalize && (
                      <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full truncate">
                        {isArabic ? "بالاسم" : "Custom"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load More Button if active pool has more items */}
        {visibleCount < activePool.length && (
          <div className="pt-5 text-center">
            <button
              type="button"
              onClick={handleLoadMore}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white border border-primary/15 text-primary text-xs font-bold shadow-xs hover:border-primary/30 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-accent" />
              <span>
                {isArabic
                  ? `عرض المزيد من المنتجات (متبقي ${activePool.length - visibleCount})`
                  : `Show More Finds (${activePool.length - visibleCount} more)`}
              </span>
            </button>
          </div>
        )}
      </section>

      {/* 9. Minimalist Native App Footer with Dock Clearance */}
      <Footer dict={dict} />

      {/* 10. Native Etsy Search Overlay Modal */}
      <NativeSearchView
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        dict={dict}
        masterCatalog={masterCatalog}
      />
    </div>
  );
}
