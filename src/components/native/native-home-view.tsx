"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Heart,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Search,
  ChevronRight,
  Plus,
  MapPin,
  Sparkles,
  Clock,
  CheckCircle2,
  PenLine,
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

type FeedTab = "forYou" | "newFinds" | "personalized" | "under250" | "jewelry" | "home";

// Number of feed products shown before the "Meet the Maker" card is inserted
const MAKER_CARD_POSITION = 6;

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

  const [activeTab, setActiveTab] = useState<FeedTab>("forYou");
  const [visibleCount, setVisibleCount] = useState(24);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const feedRef = useRef<HTMLElement>(null);

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

  // Switch the discovery feed tab, optionally scrolling the feed into view
  const selectFeedTab = (tab: FeedTab, scroll = false) => {
    triggerHaptic("light");
    setActiveTab(tab);
    setVisibleCount(24);
    if (scroll) {
      feedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Dynamic Contextual Greeting (Time of Day & User Name)
  const sessionName = session?.user?.name;
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    let timeGreeting = isArabic ? "مساء الخير" : "Good afternoon";
    if (hour < 12) {
      timeGreeting = isArabic ? "صباح الخير" : "Good morning";
    } else if (hour >= 18) {
      timeGreeting = isArabic ? "مساء النور" : "Good evening";
    }

    const userName = sessionName ? sessionName.split(" ")[0] : null;
    if (userName) {
      return isArabic ? `${timeGreeting}، ${userName}` : `${timeGreeting}, ${userName}`;
    }
    return timeGreeting;
  }, [isArabic, sessionName]);

  // 1st gifting question: "Who is it for?" (maps to /gifts/[slug] recipient pages)
  const recipientBubbles = [
    {
      id: "for-her",
      nameEn: "For Her",
      nameAr: "لها",
      image: "/images/gifts/gifts-for-her.webp",
      href: "/gifts/for-her",
    },
    {
      id: "for-him",
      nameEn: "For Him",
      nameAr: "له",
      image: "/images/gifts/gifts-for-him.webp",
      href: "/gifts/for-him",
    },
    {
      id: "for-mom",
      nameEn: "For Mom",
      nameAr: "لست الحبايب",
      image: "/images/categories/beauty-apothecary.webp",
      href: "/gifts/for-mom",
    },
    {
      id: "for-couples",
      nameEn: "Couples",
      nameAr: "للعروسين",
      image: "/images/categories/wedding.webp",
      href: "/gifts/for-couples",
    },
    {
      id: "for-friends",
      nameEn: "Friends",
      nameAr: "للأصدقاء",
      image: "/images/categories/textiles.webp",
      href: "/gifts/for-friends",
    },
    {
      id: "for-kids",
      nameEn: "Kids",
      nameAr: "للأطفال",
      image: "/images/gifts/gifts-for-kids.webp",
      href: "/gifts/for-kids",
    },
  ];

  // 2nd gifting question: "What's the occasion?"
  const occasionPills = [
    { id: "birthday", href: "/gifts/birthday", labelEn: "Birthday", labelAr: "عيد ميلاد" },
    { id: "anniversary", href: "/gifts/anniversary", labelEn: "Anniversary", labelAr: "ذكرى سنوية" },
    { id: "wedding", href: "/gifts/wedding", labelEn: "Wedding & Engagement", labelAr: "خطوبة وزفاف" },
    { id: "ramadan", href: "/gifts/ramadan", labelEn: "Ramadan & Eid", labelAr: "رمضان والأعياد" },
    { id: "home-decor", href: "/gifts/home-decor", labelEn: "Housewarming", labelAr: "مباركة منزل" },
  ];

  // 3rd gifting question: "How much do I want to spend?"
  // Links use the price params supported by /gifts (maxPrice=250|500|1000, minPrice=1000)
  const budgetTiers = useMemo(() => {
    const pickImage = (match: (price: number) => boolean, fallback: string) =>
      masterCatalog.find((p) => match(p.price))?.images?.[0] || fallback;

    return [
      {
        id: "under-250",
        labelEn: "Under 250 EGP",
        labelAr: "أقل من ٢٥٠ ج.م",
        subEn: "Little treasures",
        subAr: "هدايا لطيفة",
        image: pickImage((p) => p <= 250, "/images/categories/personalized.webp"),
        href: "/gifts?maxPrice=250",
      },
      {
        id: "under-500",
        labelEn: "Under 500 EGP",
        labelAr: "أقل من ٥٠٠ ج.م",
        subEn: "Popular finds",
        subAr: "الأكثر طلباً",
        image: pickImage((p) => p > 250 && p <= 500, "/images/categories/gift-boxes-sets.webp"),
        href: "/gifts?maxPrice=500",
      },
      {
        id: "under-1000",
        labelEn: "Under 1,000 EGP",
        labelAr: "أقل من ١٠٠٠ ج.م",
        subEn: "Artisan crafts",
        subAr: "حرف يدوية مميزة",
        image: pickImage((p) => p > 500 && p <= 1000, "/images/categories/ceramics.webp"),
        href: "/gifts?maxPrice=1000",
      },
      {
        id: "over-1000",
        labelEn: "1,000+ EGP",
        labelAr: "أكثر من ١٠٠٠ ج.م",
        subEn: "Heirloom pieces",
        subAr: "قطع فاخرة للذكرى",
        image: pickImage((p) => p > 1000, "/images/categories/jewelry.webp"),
        href: "/gifts?minPrice=1000",
      },
    ];
  }, [masterCatalog]);

  // Top Master Artisan for "Meet the Maker"
  const topArtisan = featuredArtisans?.[0];

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

  const feedBeforeMaker = displayedFeedProducts.slice(0, MAKER_CARD_POSITION);
  const feedAfterMaker = displayedFeedProducts.slice(MAKER_CARD_POSITION);

  const handleLoadMore = () => {
    triggerHaptic("light");
    setVisibleCount((prev) => prev + 24);
  };

  const renderProductCard = (product: ShelfProduct) => {
    const favorite = isFavorite(product.id);
    const primaryImage = product.images?.[0] || "/placeholder.jpg";
    const productHref = `/products/${product.slug || product.id}`;
    const artisanName =
      product.artisan?.studioName ||
      product.artisan?.user?.name ||
      (isArabic ? "حرفي مصري" : "Egyptian Artisan");

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
                favorite ? "fill-current scale-110" : "stroke-[2] scale-100"
              )}
            />
          </button>

          {product.badge && (
            <span className="absolute bottom-2 start-2 px-2 py-0.5 rounded-full bg-cream/95 backdrop-blur-xs text-[9px] font-black text-primary uppercase tracking-wider border border-primary/10 shadow-xs">
              {product.badge}
            </span>
          )}
        </div>

        {/* Metadata & Pricing (artisan name only; no ratings until real review data exists) */}
        <div className="p-2.5 flex flex-col flex-1 justify-between gap-1">
          <Link href={productHref} onClick={() => triggerHaptic("light")} className="block">
            <h3 className="text-xs font-bold text-primary group-hover:text-accent transition-colors line-clamp-2 leading-tight">
              {product.name}
            </h3>
            <div className="flex items-center gap-1 text-[10px] text-charcoal/50 font-medium mt-1 truncate">
              <span className="truncate">{artisanName}</span>
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
  };

  return (
    <div className="min-h-screen bg-cream text-charcoal select-none pb-28">
      {/* 1. Sticky Search Bar & Language Switcher */}
      <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur-md px-3.5 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-2.5 border-b border-primary/5 shadow-2xs">
        <div className="flex items-center gap-2">
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
              {isArabic ? "ابحث عن هدية..." : "Search gifts..."}
            </span>
          </button>

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

      {/* 2. Greeting + "Who's it for?" */}
      <section className="pt-3 pb-2">
        <div className="px-3.5 mb-2.5">
          <h1 className="font-serif text-lg sm:text-xl font-bold text-primary tracking-tight">
            {greeting}
          </h1>
          <p className="text-[11px] text-charcoal/50 font-medium mt-0.5">
            {isArabic ? "لمين الهدية؟" : "Who are you shopping for?"}
          </p>
        </div>

        <div className="overflow-x-auto scrollbar-hide px-3">
          <div className="flex items-start gap-3.5 min-w-max px-1">
            {recipientBubbles.map((r) => (
              <Link
                key={r.id}
                href={r.href}
                onClick={() => triggerHaptic("light")}
                className="flex flex-col items-center gap-1.5 group active:scale-95 transition-transform"
              >
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary/15 shadow-xs bg-white group-hover:border-accent transition-colors">
                  <Image
                    src={r.image}
                    alt={r.nameEn}
                    fill
                    sizes="64px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <span className="text-[11px] font-bold text-primary max-w-[68px] truncate text-center">
                  {isArabic ? r.nameAr : r.nameEn}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. "What's the occasion?" + personalization shortcut */}
      <section className="px-3.5 pt-1 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
          <button
            type="button"
            onClick={() => selectFeedTab("personalized", true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-bold shrink-0 shadow-2xs active:scale-95 transition-transform cursor-pointer"
          >
            <PenLine className="w-3.5 h-3.5 text-amber-300" />
            <span>{isArabic ? "بالاسم" : "Add a name"}</span>
          </button>
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

      {/* 4. "Gifts for every budget" */}
      <section className="px-3.5 pt-2 pb-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-serif text-base sm:text-lg font-bold text-primary">
            {isArabic ? "هدايا لكل ميزانية" : "Gifts for every budget"}
          </h2>
          <Link
            href="/gifts/all"
            onClick={() => triggerHaptic("light")}
            className="text-xs font-bold text-accent hover:underline flex items-center gap-0.5"
          >
            <span>{isArabic ? "الكل" : "See all"}</span>
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {budgetTiers.map((tier) => (
            <Link
              key={tier.id}
              href={tier.href}
              onClick={() => triggerHaptic("light")}
              className="flex items-center gap-2.5 p-2.5 bg-white rounded-2xl border border-primary/10 shadow-2xs active:scale-[0.98] transition-all overflow-hidden"
            >
              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-cream/50 border border-primary/5 shrink-0">
                <Image src={tier.image} alt={tier.labelEn} fill sizes="48px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-black text-primary truncate leading-tight">
                  {isArabic ? tier.labelAr : tier.labelEn}
                </span>
                <span className="block text-[9px] text-charcoal/50 font-medium truncate mt-0.5">
                  {isArabic ? tier.subAr : tier.subEn}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 5. "Pick up where you left off" (returning users only) */}
      {recentViews.length > 0 && (
        <section className="pt-2 pb-1">
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
                  <Image src={item.image} alt={item.name} fill sizes="128px" className="object-cover" />
                </div>
                <div className="p-2 space-y-0.5">
                  <p className="text-[11px] font-bold text-primary truncate leading-tight">{item.name}</p>
                  <p className="text-[10px] font-black text-primary">
                    {currency} {item.price.toLocaleString()}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 6. Discovery Feed with filter tabs */}
      <section ref={feedRef} className="px-3.5 pt-3 pb-2 scroll-mt-16">
        <div className="space-y-2.5 mb-3">
          <h2 className="font-serif text-xl sm:text-2xl text-primary font-normal tracking-tight">
            {isArabic ? "أفكار هدايا لك" : "Gift ideas for you"}
          </h2>

          <div className="flex items-center gap-5 border-b border-primary/10 overflow-x-auto scrollbar-hide">
            {(
              [
                { id: "forYou", labelEn: "For You", labelAr: "خصيصاً لك" },
                { id: "personalized", labelEn: "Personalized", labelAr: "بالاسم" },
                { id: "newFinds", labelEn: "New Finds", labelAr: "أحدث القطع" },
                { id: "under250", labelEn: "Under 250 EGP", labelAr: "أقل من ٢٥٠ ج.م" },
                { id: "jewelry", labelEn: "Jewelry", labelAr: "مجوهرات وحلي" },
                { id: "home", labelEn: "Home & Living", labelAr: "ديكور البيت" },
              ] as { id: FeedTab; labelEn: string; labelAr: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectFeedTab(tab.id)}
                className={cn(
                  "relative pb-2.5 text-xs sm:text-sm font-bold transition-colors select-none whitespace-nowrap shrink-0 cursor-pointer",
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

        {/* First block of products */}
        <div className="grid grid-cols-2 gap-3 pt-1">{feedBeforeMaker.map(renderProductCard)}</div>

        {/* "Meet the Maker" woven into the feed */}
        {topArtisan && (
          <div className="pt-3">
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
                      <span>{isArabic ? "تعرّف على الحرفي" : "Meet the Maker"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <h3 className="text-xs sm:text-sm font-bold text-primary truncate">
                        {topArtisan.studioName || topArtisan.user?.name}
                      </h3>
                      {topArtisan.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </div>
                    {topArtisan.location && (
                      <div className="flex items-center gap-1 text-[10px] text-charcoal/60 truncate">
                        <MapPin className="w-3 h-3 text-accent/70 shrink-0" />
                        <span>{topArtisan.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Link
                  href={`/artisans/${topArtisan.slug}`}
                  onClick={() => triggerHaptic("light")}
                  className="px-3 py-1.5 rounded-full bg-primary text-white text-[11px] font-bold shadow-xs active:scale-95 transition-transform shrink-0 flex items-center gap-1"
                >
                  <span>{isArabic ? "زيارة الورشة" : "Visit Studio"}</span>
                  {isArabic ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                </Link>
              </div>

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
          </div>
        )}

        {/* Remaining products */}
        {feedAfterMaker.length > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-3">{feedAfterMaker.map(renderProductCard)}</div>
        )}

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
                  ? `عرض المزيد (متبقي ${activePool.length - visibleCount})`
                  : `Show more (${activePool.length - visibleCount} more)`}
              </span>
            </button>
          </div>
        )}
      </section>

      {/* 7. Trust end-cap (replaces the desktop footer in native mode) */}
      <section className="px-3.5 pt-8 pb-4">
        <div className="rounded-3xl p-5 bg-white/70 border border-primary/10 shadow-2xs text-center space-y-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary mx-auto">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-serif text-sm font-bold text-primary">
              {isArabic ? "كل هدية تروي قصة حرفي مصري" : "Every gift supports an Egyptian artisan"}
            </h4>
            <p className="text-[11px] text-charcoal/60 leading-relaxed max-w-xs mx-auto">
              {isArabic
                ? "دفع إلكتروني آمن عبر Paymob وتوصيل لباب بيتك بواسطة Bosta."
                : "Secure checkout with Paymob and doorstep delivery across Egypt via Bosta."}
            </p>
          </div>
        </div>
      </section>

      <NativeSearchView
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        dict={dict}
        masterCatalog={masterCatalog}
      />
    </div>
  );
}
