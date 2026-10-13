"use client";

import Link from "next/link";
import { Footer } from "@/components/footer";
import { 
  Heart, 
  Search, 
  SlidersHorizontal, 
  ArrowUpDown, 
  CheckCircle2, 
  Sparkles, 
  MapPin, 
  X, 
  ChevronDown, 
  RotateCcw,
  Star
} from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useState, useMemo, useRef, useEffect } from "react";
import { useFavorites } from "@/context/favorites-context";
import { cn } from "@/lib/utils";
import { useParams } from "next/navigation";
import { BespokeImage } from "./bespoke-image";
import { useFilterPersistence } from "@/lib/use-filter-persistence";

interface SearchClientProps {
  query: string;
  initialProducts: any[];
  dict: any;
}

export function SearchClient({ query, initialProducts, dict }: SearchClientProps) {
  const params = useParams();
  const lang = (params?.lang as string) || "en";
  const isAr = lang === "ar" || dict?.common?.home === "الرئيسية";
  const currency = dict?.product?.currency || "EGP";

  const { toggleFavorite, isFavorite } = useFavorites();

  // Filter States
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [showCustomizableOnly, setShowCustomizableOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedGovernorate, setSelectedGovernorate] = useState<string>("ALL");
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "price-low" | "price-high" | "popular">("newest");

  // Persist search filtering state across navigations until explicitly cleared
  const { clearPersistedFilters } = useFilterPersistence({
    key: `giftisan_filters_search_${(query || "").trim().toLowerCase() || "all"}`,
    values: {
      showVerifiedOnly,
      showCustomizableOnly,
      selectedCategory,
      selectedGovernorate,
      selectedPriceRange,
      sortBy,
    },
    setters: {
      showVerifiedOnly: setShowVerifiedOnly,
      showCustomizableOnly: setShowCustomizableOnly,
      selectedCategory: setSelectedCategory,
      selectedGovernorate: setSelectedGovernorate,
      selectedPriceRange: setSelectedPriceRange,
      sortBy: setSortBy,
    },
    defaultValues: {
      showVerifiedOnly: false,
      showCustomizableOnly: false,
      selectedCategory: "ALL",
      selectedGovernorate: "ALL",
      selectedPriceRange: "ALL",
      sortBy: "newest" as const,
    },
    paramMapping: {
      showVerifiedOnly: "verified",
      showCustomizableOnly: "customizable",
      selectedCategory: "category",
      selectedGovernorate: "governorate",
      selectedPriceRange: "price",
      sortBy: "sort",
    },
  });
  
  // Single active dropdown controller
  const [openDropdown, setOpenDropdown] = useState<"sort" | "category" | "price" | "location" | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [stickyTop, setStickyTop] = useState<number | null>(null);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // Measure exact bottom of sticky navbar to ensure flawless alignment without overlap
  useEffect(() => {
    const updateStickyTop = () => {
      const navContainer = document.querySelector("nav")?.closest(".sticky") as HTMLElement;
      if (navContainer) {
        setStickyTop(navContainer.offsetHeight);
      }
    };

    updateStickyTop();
    window.addEventListener("resize", updateStickyTop);

    let observer: ResizeObserver | null = null;
    const navContainer = document.querySelector("nav")?.closest(".sticky");
    if (navContainer && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateStickyTop);
      observer.observe(navContainer);
    }

    return () => {
      window.removeEventListener("resize", updateStickyTop);
      observer?.disconnect();
    };
  }, []);

  // Prevent background scroll when mobile filter drawer is open
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileDrawerOpen]);

  // Close dropdowns on outside click or escape key
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (toolbarRef.current && !toolbarRef.current.contains(target)) {
        setOpenDropdown(null);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpenDropdown(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Dynamic list of unique categories from available products
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    initialProducts.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  }, [initialProducts]);

  // Dynamic list of unique governorates / locations
  const availableLocations = useMemo(() => {
    const locs = new Set<string>();
    initialProducts.forEach(p => {
      const loc = p.artisan?.location || p.artisan?.pickupCity;
      if (loc && loc !== "Egypt" && loc !== "Artisan Member") {
        locs.add(loc);
      }
    });
    return Array.from(locs);
  }, [initialProducts]);

  // Helper for category label
  const getCategoryLabel = (cat: string) => {
    if (cat === "ALL") return isAr ? "جميع التصنيفات" : "All Categories";
    const slugKey = cat.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-");
    return dict.common?.categories_list?.[slugKey] || dict.home?.categories_list?.[slugKey] || dict.common?.[cat.toLowerCase()] || cat;
  };

  // Price Range Definitions
  const priceRanges: Array<{ id: string; label: string; min?: number; max?: number }> = [
    { id: "ALL", label: isAr ? "جميع الأسعار" : "All Prices" },
    { id: "UNDER_250", label: isAr ? "أقل من 250 ج.م" : `Under 250 ${currency}`, min: 0, max: 250 },
    { id: "250_500", label: isAr ? "250 - 500 ج.م" : `250 - 500 ${currency}`, min: 250, max: 500 },
    { id: "500_1000", label: isAr ? "500 - 1000 ج.م" : `500 - 1000 ${currency}`, min: 500, max: 1000 },
    { id: "OVER_1000", label: isAr ? "أكثر من 1000 ج.م" : `Over 1000 ${currency}`, min: 1000, max: Infinity },
  ];

  // Sort Options
  const sortOptions = [
    { label: dict.home?.newest_arrivals || "Newest Arrivals", value: "newest" },
    { label: isAr ? "الأكثر شعبية" : "Most Popular", value: "popular" },
    { label: dict.home?.price_low_high || "Price: Low to High", value: "price-low" },
    { label: dict.home?.price_high_low || "Price: High to Low", value: "price-high" }
  ];

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return initialProducts
      .filter(p => {
        // 1. Verified Artisan
        if (showVerifiedOnly && !p.artisan?.isVerified) return false;

        // 2. Customizable / Bespoke
        if (showCustomizableOnly && !p.canPersonalize && !p.requiresClientImage) return false;

        // 3. Category Filter
        if (selectedCategory !== "ALL" && p.category !== selectedCategory) return false;

        // 4. Governorate / Location Filter
        if (selectedGovernorate !== "ALL") {
          const loc = (p.artisan?.location || p.artisan?.pickupCity || "").toLowerCase();
          if (!loc.includes(selectedGovernorate.toLowerCase())) return false;
        }

        // 5. Price Range Filter
        if (selectedPriceRange !== "ALL") {
          const range = priceRanges.find(r => r.id === selectedPriceRange);
          if (range && range.min !== undefined && range.max !== undefined) {
            if (p.price < range.min || p.price > range.max) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "price-low") return a.price - b.price;
        if (sortBy === "price-high") return b.price - a.price;
        if (sortBy === "popular") return (b.views || b.reviews?.length || 0) - (a.views || a.reviews?.length || 0);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [
    initialProducts, 
    showVerifiedOnly, 
    showCustomizableOnly, 
    selectedCategory, 
    selectedGovernorate, 
    selectedPriceRange, 
    sortBy
  ]);

  const activeFiltersCount = 
    (showVerifiedOnly ? 1 : 0) +
    (showCustomizableOnly ? 1 : 0) +
    (selectedCategory !== "ALL" ? 1 : 0) +
    (selectedGovernorate !== "ALL" ? 1 : 0) +
    (selectedPriceRange !== "ALL" ? 1 : 0);

  const resetAllFilters = () => {
    setShowVerifiedOnly(false);
    setShowCustomizableOnly(false);
    setSelectedCategory("ALL");
    setSelectedGovernorate("ALL");
    setSelectedPriceRange("ALL");
    setSortBy("newest");
    setOpenDropdown(null);
    clearPersistedFilters();
  };

  return (
    <div className="min-h-screen bg-cream">
      
      {/* Title & Stats Header */}
      <section className="pt-6 md:pt-10 pb-4 md:pb-6 text-center">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="space-y-2"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal text-primary tracking-tight">
              {query ? (
                <>
                  {dict.home?.search_results_for || (isAr ? "نتائج البحث عن" : "Results for")}{" "}
                  <span className="italic font-serif text-accent">"{query}"</span>
                </>
              ) : (
                <>
                  {(dict.home?.explore_title_base || dict.home?.explore_collection_title?.split(' ')[0] || "Explore")}{" "}
                  <span className="italic font-serif text-accent">
                    {(dict.home?.explore_title_accent || dict.home?.explore_collection_title?.split(' ').slice(1).join(' ') || "Collection")}
                  </span>
                </>
              )}
            </h1>
            <p className="text-xs md:text-sm text-charcoal/60 font-normal flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span>
                {dict.home?.found_treasures
                  ? dict.home.found_treasures.replace('{count}', filteredProducts.length.toString())
                  : (isAr ? `تم العثور على ${filteredProducts.length} منتج فريد` : `Found ${filteredProducts.length} unique products`)}
              </span>
            </p>
          </motion.div>
        </div>
      </section>

      {/* Etsy-Style Filter Pills Toolbar */}
      <div
        ref={toolbarRef}
        style={stickyTop !== null ? { top: `${stickyTop}px` } : undefined}
        className="sticky top-[105px] md:top-[124px] z-30 bg-cream/95 backdrop-blur-md py-2.5 md:py-3 border-y border-primary/5 mb-6 md:mb-8 transition-all"
      >
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
          
          {/* Mobile Toolbar: Single Clean Row with Horizontal Swiping Pills & Filters Drawer Button */}
          <div className="flex md:hidden items-center gap-2 w-full">
            {/* All Filters Trigger Button */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shadow-xs shrink-0 active:scale-95",
                activeFiltersCount > 0
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-charcoal/80 border-primary/20 hover:border-primary/40"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isAr ? "الفلاتر" : "Filters"}</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-accent text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Separator */}
            <div className="h-5 w-px bg-primary/10 shrink-0" />

            {/* Scrollable Pills Strip */}
            <div className="flex-1 overflow-x-auto scrollbar-none flex items-center gap-1.5 whitespace-nowrap py-0.5">
              {/* Quick Price Pills */}
              <button
                type="button"
                onClick={() => setSelectedPriceRange(prev => prev === "UNDER_250" ? "ALL" : "UNDER_250")}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border shrink-0 active:scale-95",
                  selectedPriceRange === "UNDER_250"
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-white text-charcoal/80 border-primary/15"
                )}
              >
                <span>{isAr ? "< 250 ج.م" : `< 250 ${currency}`}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPriceRange(prev => prev === "250_500" ? "ALL" : "250_500")}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border shrink-0 active:scale-95",
                  selectedPriceRange === "250_500"
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-white text-charcoal/80 border-primary/15"
                )}
              >
                <span>{isAr ? "250 - 500" : `250 - 500 ${currency}`}</span>
              </button>

              {/* Verified Artisans Pill */}
              <button
                type="button"
                onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border shrink-0 active:scale-95",
                  showVerifiedOnly
                    ? "bg-accent text-white border-accent shadow-xs"
                    : "bg-white text-charcoal/80 border-primary/15"
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{dict.home?.artisans_tab || (isAr ? "موثق" : "Verified")}</span>
              </button>

              {/* Customizable Pill */}
              <button
                type="button"
                onClick={() => setShowCustomizableOnly(!showCustomizableOnly)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border shrink-0 active:scale-95",
                  showCustomizableOnly
                    ? "bg-accent text-white border-accent shadow-xs"
                    : "bg-white text-charcoal/80 border-primary/15"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAr ? "مخصصة" : "Personalizable"}</span>
              </button>

              {/* Active Category Chip */}
              {selectedCategory !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory("ALL")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-white border border-primary shrink-0"
                >
                  <span>{getCategoryLabel(selectedCategory)}</span>
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Active Location Chip */}
              {selectedGovernorate !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setSelectedGovernorate("ALL")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary text-white border border-primary shrink-0"
                >
                  <MapPin className="w-3 h-3" />
                  <span>{selectedGovernorate}</span>
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Clear all on mobile if active */}
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold text-accent bg-accent/10 border border-accent/20 shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isAr ? "إلغاء" : "Reset"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Desktop Toolbar (>= md screen size) */}
          <div className="hidden md:flex items-center justify-between gap-3 w-full">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Category Pill Dropdown */}
              {availableCategories.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(prev => prev === "category" ? null : "category")}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border shadow-xs active:scale-95",
                      selectedCategory !== "ALL"
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-charcoal/80 border-primary/15 hover:border-primary/30 hover:text-primary"
                    )}
                  >
                    <span>
                      {selectedCategory !== "ALL" 
                        ? getCategoryLabel(selectedCategory) 
                        : (isAr ? "التصنيف" : "Category")}
                    </span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", openDropdown === "category" && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {openDropdown === "category" && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute start-0 top-full mt-2 w-56 bg-white border border-primary/10 shadow-xl rounded-2xl p-1.5 z-[100] max-h-64 overflow-y-auto"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory("ALL");
                            setOpenDropdown(null);
                          }}
                          className={cn(
                            "w-full text-start px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between",
                            selectedCategory === "ALL" ? "bg-primary/5 text-primary font-bold" : "text-charcoal/70 hover:bg-cream hover:text-primary"
                          )}
                        >
                          <span>{isAr ? "جميع التصنيفات" : "All Categories"}</span>
                          {selectedCategory === "ALL" && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        </button>
                        {availableCategories.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat);
                              setOpenDropdown(null);
                            }}
                            className={cn(
                              "w-full text-start px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between",
                              selectedCategory === cat ? "bg-primary/5 text-primary font-bold" : "text-charcoal/70 hover:bg-cream hover:text-primary"
                            )}
                          >
                            <span className="truncate">{getCategoryLabel(cat)}</span>
                            {selectedCategory === cat && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Price Pill Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(prev => prev === "price" ? null : "price")}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border shadow-xs active:scale-95",
                    selectedPriceRange !== "ALL"
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-charcoal/80 border-primary/15 hover:border-primary/30 hover:text-primary"
                  )}
                >
                  <span>
                    {selectedPriceRange !== "ALL" 
                      ? priceRanges.find(r => r.id === selectedPriceRange)?.label 
                      : `${isAr ? "السعر" : "Price"} (${currency})`}
                  </span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", openDropdown === "price" && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {openDropdown === "price" && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute start-0 top-full mt-2 w-52 bg-white border border-primary/10 shadow-xl rounded-2xl p-1.5 z-[100]"
                    >
                      {priceRanges.map(range => (
                        <button
                          key={range.id}
                          type="button"
                          onClick={() => {
                            setSelectedPriceRange(range.id);
                            setOpenDropdown(null);
                          }}
                          className={cn(
                            "w-full text-start px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between",
                            selectedPriceRange === range.id
                              ? "bg-primary/5 text-primary font-bold"
                              : "text-charcoal/70 hover:bg-cream hover:text-primary"
                          )}
                        >
                          <span>{range.label}</span>
                          {selectedPriceRange === range.id && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Location Pill Dropdown */}
              {availableLocations.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(prev => prev === "location" ? null : "location")}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border shadow-xs active:scale-95",
                      selectedGovernorate !== "ALL"
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-charcoal/80 border-primary/15 hover:border-primary/30 hover:text-primary"
                    )}
                  >
                    <MapPin className="w-3 h-3 text-accent" />
                    <span>{selectedGovernorate === "ALL" ? (isAr ? "المحافظة" : "Location") : selectedGovernorate}</span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", openDropdown === "location" && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {openDropdown === "location" && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute start-0 top-full mt-2 w-56 bg-white border border-primary/10 shadow-xl rounded-2xl p-1.5 z-[100] max-h-64 overflow-y-auto"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGovernorate("ALL");
                            setOpenDropdown(null);
                          }}
                          className={cn(
                            "w-full text-start px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between",
                            selectedGovernorate === "ALL" ? "bg-primary/5 text-primary font-bold" : "text-charcoal/70 hover:bg-cream hover:text-primary"
                          )}
                        >
                          <span>{isAr ? "جميع المحافظات" : "All Locations"}</span>
                          {selectedGovernorate === "ALL" && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        </button>
                        {availableLocations.map(loc => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => {
                              setSelectedGovernorate(loc);
                              setOpenDropdown(null);
                            }}
                            className={cn(
                              "w-full text-start px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between",
                              selectedGovernorate === loc ? "bg-primary/5 text-primary font-bold" : "text-charcoal/70 hover:bg-cream hover:text-primary"
                            )}
                          >
                            <span className="truncate">{loc}</span>
                            {selectedGovernorate === loc && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Verified Artisans Pill */}
              <button
                type="button"
                onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border shadow-xs active:scale-95",
                  showVerifiedOnly
                    ? "bg-accent text-white border-accent shadow-sm shadow-accent/20"
                    : "bg-white text-charcoal/80 border-primary/15 hover:border-primary/30 hover:text-primary"
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{dict.home?.artisans_tab || (isAr ? "حرفيون موثقون" : "Verified Artisans")}</span>
              </button>

              {/* Customizable Pill */}
              <button
                type="button"
                onClick={() => setShowCustomizableOnly(!showCustomizableOnly)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border shadow-xs active:scale-95",
                  showCustomizableOnly
                    ? "bg-accent text-white border-accent shadow-sm shadow-accent/20"
                    : "bg-white text-charcoal/80 border-primary/15 hover:border-primary/30 hover:text-primary"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAr ? "قابلة للتخصيص" : "Personalizable"}</span>
              </button>

              {/* Sort Pill Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(prev => prev === "sort" ? null : "sort")}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border shadow-xs active:scale-95",
                    sortBy !== "newest"
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-charcoal/80 border-primary/15 hover:border-primary/30 hover:text-primary"
                  )}
                >
                  <ArrowUpDown className="w-3 h-3 text-accent" />
                  <span>{sortOptions.find(o => o.value === sortBy)?.label}</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", openDropdown === "sort" && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {openDropdown === "sort" && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute start-0 md:end-0 md:start-auto top-full mt-2 w-52 bg-white border border-primary/10 shadow-xl rounded-2xl p-1.5 z-[100]"
                    >
                      {sortOptions.map(option => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setSortBy(option.value as any);
                            setOpenDropdown(null);
                          }}
                          className={cn(
                            "w-full text-start px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between",
                            sortBy === option.value
                              ? "bg-primary/5 text-primary font-bold"
                              : "text-charcoal/70 hover:bg-cream hover:text-primary"
                          )}
                        >
                          <span>{option.label}</span>
                          {sortBy === option.value && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Reset Filters */}
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs font-bold text-accent hover:underline flex items-center gap-1 ps-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isAr ? "إعادة تعيين" : "Reset"}</span>
                </button>
              )}
            </div>

            {/* Product Count */}
            <div className="text-xs text-charcoal/50 font-medium shrink-0">
              <span>{filteredProducts.length}</span>{" "}
              <span>{filteredProducts.length === 1 ? (dict.common?.treasure_single || "product") : (dict.common?.treasure_plural || "products")}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Product Grid / Empty State */}
      <section className="pb-12 w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
        {filteredProducts.length === 0 ? (
          <div className="py-16 md:py-24 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-primary/5 rounded-full flex items-center justify-center text-primary/30">
              <Search className="w-7 h-7 md:w-8 md:h-8" />
            </div>
            <div className="space-y-2 px-4 max-w-md">
              <h2 className="text-lg md:text-2xl font-serif text-primary font-medium">
                {dict.home?.no_treasures_found || (isAr ? "لم نجد منتجات تطابق بحثك" : "No products found")}
              </h2>
              <p className="text-charcoal/60 text-xs md:text-sm font-normal leading-relaxed">
                {activeFiltersCount > 0
                  ? (isAr ? "لم نجد قطع تطابق الفلاتر المحددة. جرب إزالة بعض الفلاتر لعرض المزيد من الإبداعات." : "No products match your selected filters. Try clearing some filters to explore more treasures.")
                  : (dict.home?.no_treasures_desc || (isAr ? "لم نجد ما يطابق بحثك. جرب تعديل الكلمات أو تصفح الأقسام الرئيسية." : "We couldn't find anything matching your search. Try adjusting your keywords or browse our top categories."))
                }
              </p>
              {activeFiltersCount > 0 && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary-light transition-all shadow-xs"
                  >
                    {isAr ? "إعادة تعيين الفلاتر" : "Clear All Filters"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6 2xl:gap-7">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product, idx) => {
                const artisanName = product.artisan?.studioName || product.artisan?.user?.name;
                const hasReviews = product.reviews && product.reviews.length > 0;
                const avgRating = hasReviews 
                  ? (product.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / product.reviews.length).toFixed(1)
                  : null;
                const ratingCount = product.reviews?.length || 0;

                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.25) }}
                  >
                    <Link
                      href={`/${lang}/products/${product.slug || product.id}`}
                      className="group block"
                    >
                      <div className="relative aspect-square rounded-xl md:rounded-2xl overflow-hidden mb-2 bg-cream/20 border border-primary/5 shadow-xs hover:shadow-md transition-shadow">
                        <BespokeImage
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(product);
                          }}
                          className={cn(
                            "absolute top-2 end-2 p-1.5 md:p-2 rounded-full transition-all shadow-sm active:scale-75 z-10",
                            isFavorite(product.id)
                              ? "bg-red-50 text-red-500 opacity-100"
                              : "bg-white/90 backdrop-blur text-primary opacity-0 group-hover:opacity-100 hover:bg-white"
                          )}
                          aria-label="Save to favorites"
                        >
                          <Heart className={cn("w-3.5 h-3.5 md:w-4 md:h-4", isFavorite(product.id) && "fill-current")} />
                        </button>

                        {product.badge && !["handmade", "صناعة يدوية", "صنع يدوي", "best seller", "bestseller", "الأكثر طلباً", "الأكثر مبيعاً", "personalized", "personalizable", "مخصص", "مخصصة", "قابل للتخصيص", "قابلة للتخصيص", "custom", "customizable"].includes(product.badge.trim().toLowerCase()) && (
                          <span className="absolute bottom-2 start-2 text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/90 text-white backdrop-blur-xs">
                            {product.badge}
                          </span>
                        )}
                      </div>

                      {/* Product Details (Etsy-Style Hierarchy) */}
                      <div className="space-y-0.5 px-0.5">
                        <div className="flex items-start justify-between gap-1.5">
                          <h3 className="text-xs sm:text-sm font-medium text-charcoal group-hover:text-primary transition-colors line-clamp-1 flex-1">
                            {product.name}
                          </h3>
                          {avgRating && (
                            <div className="flex items-center gap-0.5 text-[11px] font-bold text-charcoal shrink-0">
                              <span>{avgRating}</span>
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {ratingCount > 0 && (
                                <span className="text-charcoal/40 text-[10px]">({ratingCount})</span>
                              )}
                            </div>
                          )}
                        </div>

                        {artisanName && (
                          <p className="text-[11px] sm:text-xs text-charcoal/60 truncate group-hover:text-primary/80 transition-colors">
                            {artisanName}
                          </p>
                        )}

                        <p className="text-xs sm:text-sm font-bold text-primary pt-0.5">
                          {currency} {Number(product.price).toFixed(2)}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Streamlined More Discovery Section */}
      <section className="py-12 md:py-16 border-t border-primary/5 mt-10 bg-cream text-center">
        <div className="container mx-auto px-4 max-w-xl space-y-3.5">
          <h2 className="text-xl md:text-2xl font-serif text-primary font-normal">
            {dict.home?.not_found_title || "Looking for something bespoke?"}
          </h2>
          <p className="text-charcoal/60 text-xs md:text-sm leading-relaxed max-w-md mx-auto">
            {dict.home?.custom_commissions_desc || "Our master makers craft custom commissions made uniquely for you."}
          </p>
          <div className="pt-1">
            <Link href="/artisans">
              <button className="h-10 md:h-11 px-6 bg-primary text-white text-xs md:text-sm font-bold rounded-full hover:bg-primary-light transition-all shadow-md shadow-primary/10 group active:scale-95 duration-150">
                {dict.home?.explore_custom_makers || "Explore Custom Makers"}
                <span className="inline-block ms-1.5 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">→</span>
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Etsy-style Footer */}
      <Footer dict={dict} />

      {/* Mobile Filter & Sort Bottom Sheet Drawer */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="absolute inset-0 bg-charcoal/50 backdrop-blur-xs"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              drag="y"
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.05, bottom: 0.7 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 60 || info.velocity.y > 300) {
                  setIsMobileDrawerOpen(false);
                }
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="absolute inset-x-0 bottom-0 max-h-[85vh] bg-cream rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden border-t border-primary/10"
            >
              {/* Drag Handle Pill Area */}
              <div 
                onPointerDown={(e) => dragControls.start(e)}
                className="w-full pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none flex flex-col items-center justify-center select-none"
              >
                <div className="w-12 h-1.5 bg-charcoal/20 hover:bg-charcoal/30 rounded-full transition-colors" />
              </div>

              {/* Drawer Header */}
              <div 
                onPointerDown={(e) => {
                  if ((e.target as HTMLElement).closest("button")) return;
                  dragControls.start(e);
                }}
                className="px-5 py-3 border-b border-primary/10 flex items-center justify-between cursor-grab active:cursor-grabbing touch-none select-none"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  <h3 className="text-base font-heading font-bold text-primary">
                    {isAr ? "تصفية وترتيب" : "Filter & Sort"}
                  </h3>
                  {activeFiltersCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {activeFiltersCount > 0 && (
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="text-xs font-bold text-accent hover:underline"
                    >
                      {isAr ? "إعادة تعيين" : "Reset"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="p-1.5 hover:bg-primary/5 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-charcoal/70" />
                  </button>
                </div>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                {/* Section: Sort by */}
                <div>
                  <label className="text-xs font-bold text-charcoal/70 uppercase tracking-wider mb-2.5 block">
                    {isAr ? "الترتيب حسب" : "Sort By"}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {sortOptions.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSortBy(option.value as any)}
                        className={cn(
                          "p-3 rounded-2xl text-xs font-bold text-center border transition-all flex items-center justify-between",
                          sortBy === option.value
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-white text-charcoal border-primary/15 hover:border-primary/30"
                        )}
                      >
                        <span>{option.label}</span>
                        {sortBy === option.value && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section: Category */}
                {availableCategories.length > 0 && (
                  <div>
                    <label className="text-xs font-bold text-charcoal/70 uppercase tracking-wider mb-2.5 block">
                      {isAr ? "التصنيف" : "Category"}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("ALL")}
                        className={cn(
                          "px-3.5 py-2 rounded-xl text-xs font-bold border transition-all",
                          selectedCategory === "ALL"
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-white text-charcoal border-primary/15"
                        )}
                      >
                        {isAr ? "جميع التصنيفات" : "All Categories"}
                      </button>
                      {availableCategories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={cn(
                            "px-3.5 py-2 rounded-xl text-xs font-bold border transition-all",
                            selectedCategory === cat
                              ? "bg-primary text-white border-primary shadow-xs"
                              : "bg-white text-charcoal border-primary/15"
                          )}
                        >
                          {getCategoryLabel(cat)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section: Price Range */}
                <div>
                  <label className="text-xs font-bold text-charcoal/70 uppercase tracking-wider mb-2.5 block">
                    {isAr ? `السعر (${currency})` : `Price Range (${currency})`}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {priceRanges.map(range => (
                      <button
                        key={range.id}
                        type="button"
                        onClick={() => setSelectedPriceRange(range.id)}
                        className={cn(
                          "p-3 rounded-2xl text-xs font-bold text-center border transition-all flex items-center justify-between",
                          selectedPriceRange === range.id
                            ? "bg-primary text-white border-primary shadow-sm"
                            : "bg-white text-charcoal border-primary/15 hover:border-primary/30"
                        )}
                      >
                        <span>{range.label}</span>
                        {selectedPriceRange === range.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section: Location / Governorate */}
                {availableLocations.length > 0 && (
                  <div>
                    <label className="text-xs font-bold text-charcoal/70 uppercase tracking-wider mb-2.5 block">
                      {isAr ? "المحافظة / الورشة" : "Governorate / Shop Location"}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedGovernorate("ALL")}
                        className={cn(
                          "px-3.5 py-2 rounded-xl text-xs font-bold border transition-all",
                          selectedGovernorate === "ALL"
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-white text-charcoal border-primary/15"
                        )}
                      >
                        {isAr ? "جميع المحافظات" : "All Locations"}
                      </button>
                      {availableLocations.map(loc => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => setSelectedGovernorate(loc)}
                          className={cn(
                            "px-3.5 py-2 rounded-xl text-xs font-bold border transition-all",
                            selectedGovernorate === loc
                              ? "bg-primary text-white border-primary shadow-xs"
                              : "bg-white text-charcoal border-primary/15"
                          )}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section: Maker & Features */}
                <div>
                  <label className="text-xs font-bold text-charcoal/70 uppercase tracking-wider mb-2.5 block">
                    {isAr ? "خيارات الحرفيين والميزات" : "Makers & Features"}
                  </label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                      className={cn(
                        "w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between",
                        showVerifiedOnly
                          ? "bg-accent/10 border-accent text-accent font-bold"
                          : "bg-white border-primary/15 text-charcoal hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-accent" />
                        <span className="text-xs font-semibold">
                          {dict.home?.artisans_tab || (isAr ? "حرفيون موثقون فقط" : "Verified Artisans Only")}
                        </span>
                      </div>
                      <span className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center text-xs transition-colors",
                        showVerifiedOnly ? "bg-accent border-accent text-white" : "border-primary/20"
                      )}>
                        {showVerifiedOnly && "✓"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowCustomizableOnly(!showCustomizableOnly)}
                      className={cn(
                        "w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between",
                        showCustomizableOnly
                          ? "bg-accent/10 border-accent text-accent font-bold"
                          : "bg-white border-primary/15 text-charcoal hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-accent" />
                        <span className="text-xs font-semibold">
                          {isAr ? "قطع قابلة للتخصيص" : "Personalizable Items"}
                        </span>
                      </div>
                      <span className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center text-xs transition-colors",
                        showCustomizableOnly ? "bg-accent border-accent text-white" : "border-primary/20"
                      )}>
                        {showCustomizableOnly && "✓"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sticky Drawer Footer: Apply / View Count */}
              <div className="p-4 border-t border-primary/10 bg-cream/90 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="w-full py-3.5 bg-primary text-white rounded-2xl text-sm font-bold shadow-lg hover:bg-primary-light active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <span>
                    {isAr 
                      ? `عرض ${filteredProducts.length} من المنتجات` 
                      : `Show ${filteredProducts.length} ${filteredProducts.length === 1 ? (dict.common?.treasure_single || "Product") : (dict.common?.treasure_plural || "Products")}`}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
