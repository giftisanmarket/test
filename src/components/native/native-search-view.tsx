"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowLeft,
  ArrowRight,
  X,
  Clock,
  Star,
  Sparkles,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { triggerHaptic, registerNativeBackHandler } from "@/lib/native";
import { searchProducts } from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { ShelfProduct } from "@/components/home/product-shelf-row";

interface NativeSearchViewProps {
  isOpen: boolean;
  onClose: () => void;
  dict: any;
  masterCatalog?: ShelfProduct[];
}

export function NativeSearchView({
  isOpen,
  onClose,
  dict,
  masterCatalog = [],
}: NativeSearchViewProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<ShelfProduct[]>([]);

  const isArabic = dict?.common?.home === "الرئيسية" || dict?.common?.search?.includes("ابحث");
  const currency = dict?.product?.currency || "EGP";

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setQuery("");
      setSearchResults([]);
    }
  }, [isOpen]);

  // Handle Android Hardware Back Button to dismiss search
  useEffect(() => {
    if (!isOpen) return;
    return registerNativeBackHandler(() => {
      onClose();
      return true;
    });
  }, [isOpen, onClose]);

  // Load recent searches and recently viewed products from localStorage
  useEffect(() => {
    if (isOpen) {
      try {
        const storedSearches = JSON.parse(
          localStorage.getItem("giftisan_recent_searches") || "[]"
        );
        if (Array.isArray(storedSearches)) {
          setRecentSearches(storedSearches.slice(0, 5));
        }

        const storedViewed = JSON.parse(
          localStorage.getItem("giftisan_recently_viewed") || "[]"
        );
        if (Array.isArray(storedViewed)) {
          const matched = storedViewed
            .map((idOrSlug: string) =>
              masterCatalog.find((p) => p.id === idOrSlug || p.slug === idOrSlug)
            )
            .filter(Boolean) as ShelfProduct[];
          setRecentlyViewedProducts(matched.slice(0, 8));
        }
      } catch {}
    }
  }, [isOpen, masterCatalog]);

  // Save new search query to history
  const saveSearchTerm = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    try {
      const existing = JSON.parse(
        localStorage.getItem("giftisan_recent_searches") || "[]"
      );
      const updated = [trimmed, ...existing.filter((t: string) => t !== trimmed)].slice(0, 8);
      localStorage.setItem("giftisan_recent_searches", JSON.stringify(updated));
      setRecentSearches(updated.slice(0, 5));
    } catch {}
  };

  const clearRecentSearches = () => {
    triggerHaptic("light");
    try {
      localStorage.removeItem("giftisan_recent_searches");
      setRecentSearches([]);
    } catch {}
  };

  // Perform live search when typing
  useEffect(() => {
    if (query.trim().length >= 2) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        try {
          const results = await searchProducts(query.trim());
          setSearchResults(results || []);
        } catch {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 250);

      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [query]);

  // Handle Search Submission
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    triggerHaptic("medium");
    saveSearchTerm(trimmed);
    onClose();
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSelectKeyword = (term: string) => {
    triggerHaptic("light");
    saveSearchTerm(term);
    onClose();
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  // Curated Suggested Searches (Etsy "Jump back in")
  const suggestedSearches = useMemo(() => [
    { en: "Personalized jewelry box", ar: "بوكس مجوهرات مخصص بالاسم" },
    { en: "Customized photo frame", ar: "برواز صور وخشب محفور بالاسم" },
    { en: "Handmade leather bag", ar: "حقائب ومصنوعات جلد طبيعي" },
    { en: "Fine art ceramics & pottery", ar: "فخار وخزف أسواني فاخر" },
    { en: "Crochet bouquet & gifts", ar: "بوكيهات كروشيه ورد ستان" },
  ], []);

  // Top searches this week (Etsy badges with circular images)
  const topSearchesThisWeek = useMemo(() => [
    {
      en: "Personalized Gifts",
      ar: "هدايا بالاسم",
      image: "/images/categories/personalized.webp",
      query: "personalized",
    },
    {
      en: "Silver Jewelry",
      ar: "مجوهرات فضة",
      image: "/images/categories/jewelry.webp",
      query: "jewelry",
    },
    {
      en: "Leather Bags",
      ar: "حقائب وجلود",
      image: "/images/categories/fashion.webp",
      query: "bags",
    },
    {
      en: "Ceramics & Decor",
      ar: "خزف وديكور",
      image: "/images/categories/ceramics.webp",
      query: "ceramics",
    },
    {
      en: "Curated Gift Sets",
      ar: "بوكسات هدايا",
      image: "/images/categories/gift-boxes-sets.webp",
      query: "gifts",
    },
  ], []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-cream text-charcoal flex flex-col overflow-hidden select-none animate-in fade-in duration-150">
      {/* 1. Top Safe-Area Sticky Search Header */}
      <header className="sticky top-0 z-30 bg-cream/95 backdrop-blur-md px-3.5 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-2.5 border-b border-primary/5 shadow-2xs">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          {/* Back Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            aria-label="Back"
            className="w-10 h-10 rounded-full bg-white border border-primary/10 flex items-center justify-center text-primary active:scale-90 transition-transform shrink-0 shadow-2xs"
          >
            {isArabic ? (
              <ArrowRight className="w-5 h-5" />
            ) : (
              <ArrowLeft className="w-5 h-5" />
            )}
          </button>

          {/* Active Search Input Pill */}
          <div className="flex-1 relative flex items-center">
            <Search className="w-4 h-4 text-primary absolute start-3.5 pointer-events-none" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isArabic ? "ابحث عن شيء مميز..." : "Search for something special"}
              className="w-full bg-white border border-primary/15 rounded-full ps-10 pe-10 py-2.5 text-xs text-primary font-medium placeholder:text-charcoal/40 shadow-2xs focus:outline-hidden focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute end-3 w-5 h-5 rounded-full bg-charcoal/10 flex items-center justify-center text-charcoal/60 active:scale-90 transition-transform"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </form>
      </header>

      {/* 2. Scrollable Body Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-32 space-y-5">
        {/* State A: Live Search Query Suggestions */}
        {query.trim().length >= 2 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-charcoal/40">
                {isArabic ? "نتائج البحث" : "Search Results"}
              </span>
              {isSearching && (
                <span className="text-[10px] font-bold text-accent animate-pulse">
                  {isArabic ? "جاري البحث..." : "Searching..."}
                </span>
              )}
            </div>

            {searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.slice(0, 15).map((p: any) => {
                  const image = p.images?.[0] || "/placeholder.jpg";
                  const artisanName =
                    p.artisan?.studioName ||
                    p.artisan?.user?.name ||
                    (isArabic ? "حرفي مصري" : "Artisan");

                  return (
                    <Link
                      key={p.id}
                      href={`/products/${p.slug || p.id}`}
                      onClick={() => {
                        triggerHaptic("light");
                        saveSearchTerm(query);
                        onClose();
                      }}
                      className="flex items-center gap-3 p-2.5 bg-white rounded-2xl border border-primary/10 shadow-2xs active:scale-[0.98] transition-all"
                    >
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-cream/40 shrink-0 border border-primary/5">
                        <Image
                          src={image}
                          alt={p.name}
                          fill
                          sizes="48px"
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-primary truncate leading-tight">
                          {p.name}
                        </h4>
                        <p className="text-[10px] text-charcoal/50 font-medium truncate mt-0.5">
                          {artisanName}
                        </p>
                      </div>
                      <span className="text-xs font-black text-primary shrink-0">
                        {currency} {p.price?.toLocaleString()}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : !isSearching ? (
              <div className="py-12 text-center space-y-2">
                <Search className="w-8 h-8 text-charcoal/30 mx-auto" />
                <p className="text-xs font-bold text-primary">
                  {isArabic ? "لم نجد نتائج مطابقة" : "No exact matches found"}
                </p>
                <p className="text-[11px] text-charcoal/50">
                  {isArabic
                    ? "جرّب البحث بكلمة أخرى أو تصفح الأفكار المقترحة أدناه"
                    : "Try searching with a different term or explore suggestions"}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          /* State B: Etsy Default Search Exploration View */
          <>
            {/* 1. "Jump back in" (Popular Discovery Terms) */}
            <section className="space-y-2.5">
              <h3 className="font-serif text-lg font-bold text-primary tracking-tight">
                {isArabic ? "أفكار مقترحة للهدايا" : "Popular gift ideas"}
              </h3>
              <div className="space-y-1">
                {suggestedSearches.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectKeyword(isArabic ? item.ar : item.en)}
                    className="w-full flex items-center gap-3 py-2 px-1 text-start rounded-xl active:bg-white/60 transition-colors group"
                  >
                    <Search className="w-4 h-4 text-primary/40 group-hover:text-primary transition-colors shrink-0" />
                    <span className="text-xs font-bold text-charcoal/80 group-hover:text-primary transition-colors">
                      {isArabic ? item.ar : item.en}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* 2. "Recent searches" (Stored History) */}
            {recentSearches.length > 0 && (
              <section className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-lg font-bold text-primary tracking-tight">
                    {isArabic ? "عمليات البحث الأخيرة" : "Recent searches"}
                  </h3>
                  <button
                    type="button"
                    onClick={clearRecentSearches}
                    className="text-[11px] font-bold text-charcoal/40 hover:text-charcoal active:scale-95 transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{isArabic ? "مسح" : "Clear"}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {recentSearches.map((term, idx) => {
                    // Find a matching product image for visual enrichment (like Etsy)
                    const matchingProduct = masterCatalog.find(
                      (p) =>
                        p.name.toLowerCase().includes(term.toLowerCase()) ||
                        (p.category || "").toLowerCase().includes(term.toLowerCase())
                    );
                    const thumbnail = matchingProduct?.images?.[0];

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectKeyword(term)}
                        className="w-full flex items-center justify-between p-3 bg-white rounded-2xl border border-primary/10 shadow-2xs active:scale-[0.99] transition-transform text-start"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <Clock className="w-4 h-4 text-charcoal/40 shrink-0" />
                          <span className="text-xs font-bold text-primary truncate">
                            {term}
                          </span>
                        </div>
                        {thumbnail && (
                          <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-cream/40 border border-primary/5 shrink-0">
                            <Image
                              src={thumbnail}
                              alt={term}
                              fill
                              sizes="36px"
                              unoptimized
                              className="object-cover"
                            />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 3. "Recently viewed" (Product Thumbnails Row) */}
            {recentlyViewedProducts.length > 0 && (
              <section className="space-y-2.5 pt-1">
                <h3 className="font-serif text-lg font-bold text-primary tracking-tight">
                  {isArabic ? "شوهدت مؤخراً" : "Recently viewed"}
                </h3>
                <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
                  {recentlyViewedProducts.map((p) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.slug || p.id}`}
                      onClick={() => {
                        triggerHaptic("light");
                        onClose();
                      }}
                      className="w-20 shrink-0 flex flex-col gap-1 active:scale-95 transition-transform"
                    >
                      <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white border border-primary/10 shadow-2xs">
                        <Image
                          src={p.images?.[0] || "/placeholder.jpg"}
                          alt={p.name}
                          fill
                          sizes="80px"
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-primary truncate">
                        {p.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* 4. "Top searches this week" (Horizontal Badges with Photos) */}
            <section className="space-y-2.5 pt-1">
              <h3 className="font-serif text-lg font-bold text-primary tracking-tight">
                {isArabic ? "أقسام وتصنيفات مميزة" : "Popular categories"}
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {topSearchesThisWeek.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectKeyword(item.query)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-primary/10 shadow-2xs active:scale-95 transition-transform shrink-0"
                  >
                    <div className="relative w-6 h-6 rounded-full overflow-hidden bg-cream border border-primary/10 shrink-0">
                      <Image
                        src={item.image}
                        alt={item.en}
                        fill
                        sizes="24px"
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <span className="text-xs font-bold text-primary whitespace-nowrap">
                      {isArabic ? item.ar : item.en}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>

    </div>
  );
}
