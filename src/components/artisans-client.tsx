"use client";

import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ArtisanCard } from "@/components/artisans/artisan-card";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Search, X, CheckCircle2, Store, ArrowRight, RotateCcw, MapPin } from "lucide-react";
import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useFilterPersistence } from "@/lib/use-filter-persistence";

interface ArtisansClientProps {
  artisans: any[];
  dict: any;
}

export function ArtisansClient({ artisans, dict }: ArtisansClientProps) {
  const params = useParams();
  const lang = (params?.lang as string) || "en";
  const isAr = lang === "ar" || dict?.common?.home === "الرئيسية";

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("ALL");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Persist artisans filter state across navigations until explicitly cleared
  const { clearPersistedFilters } = useFilterPersistence({
    key: "giftisan_filters_artisans",
    values: {
      searchQuery,
      selectedRegion,
      verifiedOnly,
    },
    setters: {
      searchQuery: setSearchQuery,
      selectedRegion: setSelectedRegion,
      verifiedOnly: setVerifiedOnly,
    },
    defaultValues: {
      searchQuery: "",
      selectedRegion: "ALL",
      verifiedOnly: false,
    },
    paramMapping: {
      searchQuery: "q",
      selectedRegion: "region",
      verifiedOnly: "verified",
    },
  });

  // Extract top locations dynamically from artisan profiles
  const topRegions = useMemo(() => {
    const set = new Set<string>();
    artisans.forEach((a) => {
      if (a.location && typeof a.location === "string") {
        const clean = a.location.split(",")[0].trim();
        if (clean) set.add(clean);
      }
    });
    return Array.from(set).slice(0, 5);
  }, [artisans]);

  // Filter artisans based on search & pills
  const filteredArtisans = useMemo(() => {
    return artisans.filter((artisan) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const studioMatch = artisan.studioName?.toLowerCase().includes(q);
        const nameMatch = artisan.user?.name?.toLowerCase().includes(q);
        const locMatch = artisan.location?.toLowerCase().includes(q);
        const bioMatch = artisan.bio?.toLowerCase().includes(q);
        const productMatch = artisan.products?.some((p: any) => p.name?.toLowerCase().includes(q));
        if (!studioMatch && !nameMatch && !locMatch && !bioMatch && !productMatch) {
          return false;
        }
      }

      // 2. Verified Only Filter
      if (verifiedOnly && !artisan.isVerified) {
        return false;
      }

      // 3. Region Filter
      if (selectedRegion !== "ALL") {
        if (!artisan.location || !artisan.location.toLowerCase().includes(selectedRegion.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [artisans, searchQuery, verifiedOnly, selectedRegion]);

  const hasActiveFilters = searchQuery.trim() !== "" || selectedRegion !== "ALL" || verifiedOnly;

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedRegion("ALL");
    setVerifiedOnly(false);
    clearPersistedFilters();
  };

  return (
    <main className="min-h-screen bg-cream">
      <Navbar dict={dict} />

      {/* Editorial Centered Header — Matching /products and /categories style */}
      <section className="pt-8 md:pt-12 pb-6 text-center">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="max-w-2xl mx-auto space-y-2.5"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 text-primary text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>{dict.home?.artisans_registry || (isAr ? "سجل كبار الحرفيين" : "Artisan Collective")}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal text-primary tracking-tight">
              {dict.home?.artisans_meet_masters_prefix || (isAr ? "قابل" : "Meet the")}{" "}
              <span className="italic text-accent">
                {dict.home?.artisans_meet_masters_suffix || (isAr ? "المبدعين" : "Makers")}
              </span>
            </h1>

            <p className="text-sm md:text-base text-charcoal/60 leading-relaxed font-normal max-w-xl mx-auto">
              {dict.home?.artisans_desc || (isAr 
                ? "اكتشف متاجر المبدعين المستقلين والحرفيين وراء أكثر المنتجات اليدوية تميزاً في مصر." 
                : "Discover independent shops and skilled artisans behind Egypt's most original handcrafted creations.")}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search & Filter Toolbar */}
      <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16 mb-8">
        <div className="max-w-3xl mx-auto space-y-4">
          
          {/* Search Input Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute start-4 top-1/2 -translate-y-1/2 text-primary/40 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? "ابحث باسم المتجر، الحرفي، المدينة، أو نوع الحرفة..." : "Search by shop name, maker, location, or craft..."}
              className="w-full h-12 ps-11 pe-10 bg-white border border-primary/10 rounded-2xl text-xs md:text-sm font-bold text-primary placeholder:text-primary/30 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 p-1 text-primary/30 hover:text-primary transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Pills Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              {/* All Shops */}
              <button
                type="button"
                onClick={() => setSelectedRegion("ALL")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border shadow-xs active:scale-95",
                  selectedRegion === "ALL" && !verifiedOnly
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white text-charcoal/70 border-primary/15 hover:border-primary/30 hover:text-primary"
                )}
              >
                {isAr ? "جميع المتاجر" : "All Shops"}
              </button>

              {/* Verified Only Filter */}
              <button
                type="button"
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border shadow-xs active:scale-95",
                  verifiedOnly
                    ? "bg-accent text-white border-accent shadow-sm"
                    : "bg-white text-charcoal/70 border-primary/15 hover:border-primary/30 hover:text-primary"
                )}
              >
                <CheckCircle2 className={cn("w-3.5 h-3.5", verifiedOnly ? "text-white" : "text-accent")} />
                <span>{isAr ? "متاجر موثقة" : "Verified Only"}</span>
              </button>

              {/* Dynamic Region Pills */}
              {topRegions.map((region) => (
                <button
                  key={region}
                  type="button"
                  onClick={() => setSelectedRegion(selectedRegion === region ? "ALL" : region)}
                  className={cn(
                    "inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all border shadow-xs active:scale-95",
                    selectedRegion === region
                      ? "bg-primary text-white border-primary shadow-sm font-bold"
                      : "bg-white text-charcoal/70 border-primary/15 hover:border-primary/30 hover:text-primary"
                  )}
                >
                  <MapPin className="w-3 h-3 opacity-60" />
                  <span>{region}</span>
                </button>
              ))}
            </div>

            {/* Results Count & Clear Filter */}
            <div className="flex items-center gap-2 ms-auto text-xs font-bold text-charcoal/50">
              <span>
                {filteredArtisans.length} {isAr ? "متجر معروض" : "shops"}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline font-bold transition-colors ms-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isAr ? "إعادة ضبط" : "Reset"}</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* Main Artisan Cards Grid */}
      <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16 pb-20">
        {filteredArtisans.length === 0 ? (
          <div className="py-20 text-center space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary/40 mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base md:text-lg font-bold text-primary">
              {isAr ? "لم نتمكن من العثور على أي متجر يطابق بحثك." : "No artisan shops matched your search."}
            </h3>
            <p className="text-xs md:text-sm text-charcoal/50 font-medium">
              {isAr ? "جرب البحث باسم آخر أو إزالة التصفية النشطة." : "Try searching for a different keyword or reset your active filters."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-light transition-all active:scale-95 shadow-sm"
              >
                {isAr ? "عرض جميع المتاجر" : "Show All Shops"}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6 2xl:gap-7">
            <AnimatePresence mode="popLayout">
              {filteredArtisans.map((artisan, idx) => (
                <motion.div
                  key={artisan.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.3), duration: 0.3 }}
                >
                  <ArtisanCard artisan={artisan} dict={dict} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Invitation Call-to-Action for Makers */}
        <div className="mt-16 md:mt-24 p-8 md:p-12 rounded-3xl bg-white border border-primary/10 shadow-lg shadow-primary/5 text-center max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-start space-y-1.5 max-w-xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-accent flex items-center justify-center md:justify-start gap-1.5">
              <Store className="w-3.5 h-3.5" />
              {isAr ? "انضم إلى تجمع الحرفيين" : "Join the Artisan Collective"}
            </span>
            <h3 className="text-xl md:text-2xl font-serif font-normal text-primary">
              {isAr ? "هل تصنع منتجات يدوية بأناملك وشغفك؟" : "Are you a creator or independent workshop?"}
            </h3>
            <p className="text-xs md:text-sm text-charcoal/60 leading-relaxed font-normal">
              {isAr 
                ? "افتح متجرك الخاص على جيفتيزان بدون رسوم اشتراك، وتواصل مباشرة مع آلاف الباحثين عن الهدايا اليدوية الأصيلة." 
                : "Open your shop on Giftisan, showcase your products to design lovers, and grow your brand with 0% platform commission."}
            </p>
          </div>
          <Link
            href="/become-artisan"
            className="shrink-0 h-12 px-6 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-primary-light transition-all active:scale-95 shadow-md shadow-primary/10"
          >
            <span>{dict.common?.sell || (isAr ? "افتح متجرك الآن" : "Sell on Giftisan")}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </div>
      </div>

      <Footer dict={dict} />
    </main>
  );
}
