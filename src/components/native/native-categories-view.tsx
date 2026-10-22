"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Camera,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Flame,
  Gift,
  Home,
  Gem,
  Package,
  PencilLine,
  History,
  Shirt,
  Heart,
  Brush,
  ShoppingBag,
  Glasses,
  Footprints,
  Scissors,
  Baby,
  Gamepad2,
  Dog,
  Smartphone,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/native";
import { NativeSearchView } from "@/components/native/native-search-view";

interface DepartmentData {
  name: string;
  slug?: string;
  count: number;
  subcategories?: string[];
}

interface NativeCategoriesViewProps {
  categories: DepartmentData[];
  dict: any;
  lang?: string;
  masterProducts?: any[];
}

const departmentIconMap: Record<string, any> = {
  "home-and-living": Home,
  "Home & Living": Home,
  "home-living": Home,
  "jewelry": Gem,
  "Jewelry": Gem,
  "clothing": Shirt,
  "Clothing": Shirt,
  "clothing-shoes": Shirt,
  "fashion-leather": Shirt,
  "bags-and-purses": ShoppingBag,
  "Bags & Purses": ShoppingBag,
  "bags-purses": ShoppingBag,
  "accessories": Glasses,
  "Accessories": Glasses,
  "art-and-collectibles": Brush,
  "Art & Collectibles": Brush,
  "art-collectibles": Brush,
  "gifts": Package,
  "Gifts": Package,
  "gifts-sets": Package,
  "Gifts & Sets": Package,
  "bath-and-beauty": Sparkles,
  "Bath & Beauty": Sparkles,
  "bath-beauty": Sparkles,
  "Bath & Apothecary": Sparkles,
  "weddings": Heart,
  "Weddings": Heart,
  "Weddings & Celebrations": Heart,
  "wedding": Heart,
  "craft-supplies-and-tools": Scissors,
  "Craft Supplies & Tools": Scissors,
  "craft-supplies": Scissors,
  "kids-and-baby": Baby,
  "Kids & Baby": Baby,
  "kids-baby": Baby,
  "paper-and-party-supplies": PencilLine,
  "Paper & Party Supplies": PencilLine,
  "stationery-paper": PencilLine,
  "Stationery & Paper": PencilLine,
  "pet-supplies": Dog,
  "Pet Supplies": Dog,
  "shoes": Footprints,
  "Shoes": Footprints,
  "toys-and-games": Gamepad2,
  "Toys & Games": Gamepad2,
  "books-movies-and-music": BookOpen,
  "Books, Movies & Music": BookOpen,
  "electronics-and-accessories": Smartphone,
  "Electronics & Accessories": Smartphone,
  "vintage-heritage": History,
  "Vintage & Heritage": History,
  "vintage": History,
};

// Popular visual department circle keys for high-speed scanning
const TOP_DEPARTMENT_SLUGS = [
  "home-and-living",
  "jewelry",
  "bags-and-purses",
  "clothing",
  "gifts",
  "art-and-collectibles",
  "bath-and-beauty",
  "kids-and-baby",
];

export function NativeCategoriesView({
  categories = [],
  dict,
  lang = "en",
  masterProducts = [],
}: NativeCategoriesViewProps) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [expandedDeptSlug, setExpandedDeptSlug] = useState<string | null>(null);

  const isArabic = lang === "ar" || pathname.startsWith("/ar");

  // Trending searches curated for authentic Egyptian artisanal craft
  const trendingSearches = useMemo(() => {
    if (isArabic) {
      return [
        "فخار الفيوم",
        "كروشيه يدوي",
        "شنط جلد طبيعي",
        "شموع معطرة",
        "فضة عيار 925",
        "مفارش نول يدوي",
        "صواني ريزن",
        "هدايا بالاسم",
      ];
    }
    return [
      "Fayoum Pottery",
      "Handmade Crochet",
      "Genuine Leather",
      "Scented Candles",
      "925 Silver",
      "Handwoven Linens",
      "Resin Art",
      "Personalized Gifts",
    ];
  }, [isArabic]);

  // Language toggle handler
  const handleToggleLang = () => {
    triggerHaptic("light");
    const targetLang = isArabic ? "en" : "ar";
    const newPath = pathname.replace(/^\/(en|ar)/, `/${targetLang}`);
    router.push(newPath || `/${targetLang}`);
  };

  // Accordion toggle handler
  const handleToggleAccordion = (slug: string) => {
    triggerHaptic("light");
    setExpandedDeptSlug((prev) => (prev === slug ? null : slug));
  };

  // Quick department visual circle filter
  const topDepartments = useMemo(() => {
    return TOP_DEPARTMENT_SLUGS.map((slug) => {
      const match = categories.find((c) => {
        const cSlug = c.slug || c.name.toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-");
        return cSlug === slug;
      });
      return {
        slug,
        name: match?.name || slug,
        count: match?.count || 0,
      };
    });
  }, [categories]);

  return (
    <div className="min-h-screen bg-cream text-charcoal select-none pb-32">
      {/* 1. Etsy Native Sticky Search Bar Header */}
      <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur-md px-3.5 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-2.5 border-b border-primary/5 shadow-2xs">
        <div className="flex items-center gap-2">
          {/* Full-Width Search Input Button */}
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
              {isArabic
                ? "ابحث عن هدايا، ديكور، مجوهرات..."
                : "Search gifts, decor, jewelry..."}
            </span>
            <Camera className="w-3.5 h-3.5 text-primary/40 shrink-0 ms-auto" />
          </button>

          {/* Language Switcher Pill */}
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

      {/* 2. Page Title Header */}
      <section className="px-3.5 pt-3.5 pb-2">
        <div className="flex items-baseline justify-between">
          <h1 className="font-serif text-xl sm:text-2xl font-bold text-primary tracking-tight">
            {isArabic ? "تسوق حسب القسم" : "Shop by Department"}
          </h1>
          <span className="text-[11px] font-bold text-charcoal/50">
            {categories.length} {isArabic ? "أقسام رئيسية" : "departments"}
          </span>
        </div>
        <p className="text-[11px] text-charcoal/50 font-medium mt-0.5">
          {isArabic
            ? "استكشف كنوز الحرف اليدوية المصرية مقسمة بدقة"
            : "Browse curated handcrafted collections from independent Egyptian artisans"}
        </p>
      </section>

      {/* 3. Trending Searches (Fast Tap Chips) */}
      <section className="pt-1 pb-3 px-3.5">
        <div className="flex items-center gap-1.5 mb-2 text-primary font-bold text-[11px]">
          <Flame className="w-3.5 h-3.5 text-[#D97706] shrink-0" />
          <span>{isArabic ? "الأكثر بحثاً اليوم" : "Trending right now"}</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 -mx-3.5 px-3.5">
          {trendingSearches.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => {
                triggerHaptic("light");
                router.push(`/${lang}/search?q=${encodeURIComponent(term)}`);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-primary/10 text-primary text-xs font-semibold shadow-2xs shrink-0 active:scale-95 transition-transform hover:border-primary/25"
            >
              <span>{term}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 4. Top Department Visual Circles (Etsy Quick Thumb Scan) */}
      <section className="py-2 px-3.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-charcoal/70 uppercase tracking-wider">
            {isArabic ? "الأقسام الشائعة" : "Popular Departments"}
          </span>
        </div>
        <div className="flex items-start gap-3.5 overflow-x-auto scrollbar-none pb-2 -mx-3.5 px-3.5">
          {topDepartments.map((dept) => {
            const Icon = departmentIconMap[dept.slug] || departmentIconMap[dept.name] || ShoppingBag;
            const title =
              dict.common?.categories_list?.[dept.slug] ||
              dict.home?.categories_list?.[dept.slug] ||
              dept.name;

            return (
              <button
                key={dept.slug}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  router.push(`/${lang}/category/${dept.slug}`);
                }}
                className="flex flex-col items-center gap-1.5 shrink-0 group active:scale-95 transition-transform"
                style={{ width: "70px" }}
              >
                <div className="w-16 h-16 rounded-full bg-white border border-primary/12 shadow-2xs flex items-center justify-center text-primary group-hover:border-primary/30 group-hover:shadow-xs transition-all ring-2 ring-primary/5">
                  <Icon className="w-7 h-7 stroke-[1.6]" />
                </div>
                <span className="text-[11px] font-bold text-charcoal/80 text-center leading-tight line-clamp-2">
                  {title}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. Gift Discovery Spotlight Card (Etsy Gift Mode Feature) */}
      <section className="px-3.5 py-3">
        <Link
          href={`/${lang}/gifts`}
          onClick={() => triggerHaptic("light")}
          className="block"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-[#085a44] to-primary p-4 text-white shadow-sm active:scale-[0.99] transition-transform">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-black uppercase tracking-wider backdrop-blur-xs">
                  <Sparkles className="w-3 h-3 text-[#F59E0B]" />
                  <span>{isArabic ? "دليل الهدايا المتكامل" : "Gift Discovery Hub"}</span>
                </div>
                <h3 className="font-serif text-base sm:text-lg font-bold leading-snug">
                  {isArabic ? "تبحث عن الهدية المثالية؟" : "Looking for the perfect gift?"}
                </h3>
                <p className="text-[11px] text-white/80 font-medium leading-relaxed max-w-[260px]">
                  {isArabic
                    ? "اختر هديتك حسب المناسبة، المتلقي، أو الميزانية بكل سهولة"
                    : "Find handcrafted gifts tailored by occasion, recipient, and budget"}
                </p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-white shrink-0 shadow-inner">
                <Gift className="w-6 h-6 stroke-[1.8]" />
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs font-bold text-[#FDFCF0]">
              <span>{isArabic ? "استكشف كل خيارات الهدايا" : "Browse all gift guides"}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </div>
          </div>
        </Link>
      </section>

      {/* 6. Hierarchical Category Accordion List (Core Etsy Native Pattern) */}
      <section className="px-3.5 pt-2">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-charcoal/70 uppercase tracking-wider">
            {isArabic ? "تصفح جميع الأقسام" : "All Categories & Specialties"}
          </span>
          <span className="text-[11px] font-medium text-charcoal/50">
            {categories.length} {isArabic ? "فئة" : "sections"}
          </span>
        </div>

        <div className="space-y-2.5">
          {categories.map((cat) => {
            const rawSlug = cat.slug || cat.name.toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-");
            const Icon = departmentIconMap[cat.name] || departmentIconMap[rawSlug] || ShoppingBag;
            const categoryTitle =
              dict.common?.categories_list?.[rawSlug] ||
              dict.home?.categories_list?.[rawSlug] ||
              cat.name;
            const isExpanded = expandedDeptSlug === rawSlug;

            return (
              <div
                key={cat.name}
                className="bg-white rounded-2xl border border-primary/10 shadow-2xs overflow-hidden transition-all duration-200"
              >
                {/* Main Accordion Header Row */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleToggleAccordion(rawSlug)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleToggleAccordion(rawSlug);
                    }
                  }}
                  className="w-full p-3.5 flex items-center justify-between gap-3 text-start cursor-pointer active:bg-cream/50 transition-colors select-none"
                >
                  {/* Left: Icon + Title + Count Preview */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-cream flex items-center justify-center text-primary shrink-0 border border-primary/8 shadow-2xs">
                      <Icon className="w-5 h-5 stroke-[1.8]" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-serif font-bold text-sm text-primary truncate">
                          {categoryTitle}
                        </h2>
                      </div>
                      <p className="text-[11px] text-charcoal/50 font-medium truncate mt-0.5">
                        {cat.count > 0
                          ? isArabic
                            ? `${cat.count} منتج متوفر`
                            : `${cat.count} handcrafted items`
                          : isArabic
                          ? "استكشف التشكيلة"
                          : "Explore collection"}
                      </p>
                    </div>
                  </div>

                  {/* Right: Expand Chevron Indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cream text-charcoal/60 border border-primary/5">
                      {cat.subcategories?.length || 0}
                    </span>
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full bg-cream flex items-center justify-center text-primary transition-transform duration-200",
                        isExpanded ? "rotate-180 bg-primary text-white" : ""
                      )}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Expanded Accordion Subcategories Tray */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-1 border-t border-primary/5 bg-[#FCFBF4]/70 animate-in fade-in duration-150">
                    {/* View All in Department Link */}
                    <Link
                      href={`/${lang}/category/${rawSlug}`}
                      onClick={() => triggerHaptic("light")}
                      className="flex items-center justify-between py-2 px-3 mb-2.5 rounded-xl bg-primary text-white text-xs font-bold active:scale-[0.99] transition-transform shadow-2xs"
                    >
                      <span>
                        {isArabic ? `عرض كل منتجات ${categoryTitle}` : `View all in ${categoryTitle}`}
                      </span>
                      <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </Link>

                    {/* Subcategories Badges */}
                    {cat.subcategories && cat.subcategories.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-charcoal/50 uppercase tracking-wider mb-2">
                          {isArabic ? "التخصصات والحرف الفرعية" : "Subcategories & Crafts"}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.subcategories.map((sub) => {
                            const subSlug = sub
                              .toLowerCase()
                              .replace(/ & /g, "-")
                              .replace(/[',().]/g, "")
                              .replace(/\s+/g, "-")
                              .replace(/-+/g, "-");
                            const subLabel =
                              dict.common?.categories_list?.[subSlug] ||
                              dict.home?.categories_list?.[subSlug] ||
                              sub;

                            return (
                              <Link
                                key={sub}
                                href={`/${lang}/category/${rawSlug}?sub=${encodeURIComponent(subSlug)}`}
                                onClick={() => triggerHaptic("light")}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-primary/10 text-[11px] font-medium text-charcoal/80 shadow-2xs active:scale-95 transition-all hover:border-primary/30 hover:text-primary"
                              >
                                <span>{subLabel}</span>
                                <ChevronRight className="w-3 h-3 text-primary/40 rtl:rotate-180" />
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. Full-Screen Native Search View Overlay */}
      <NativeSearchView
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        dict={dict}
        masterCatalog={masterProducts}
      />
    </div>
  );
}
