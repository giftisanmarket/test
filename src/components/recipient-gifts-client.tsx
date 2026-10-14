"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import {
  Heart,
  Sparkles,
  SlidersHorizontal,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Star,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  Gift,
  Package,
  X,
  Compass,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BespokeImage } from "@/components/bespoke-image";
import { useFavorites } from "@/context/favorites-context";
import { cn } from "@/lib/utils";
import { useFilterPersistence } from "@/lib/use-filter-persistence";

export type RecipientSlug = "for-her" | "for-him" | "for-mom" | "for-couples" | "for-friends" | "for-kids" | "all";

export interface RecipientGiftsClientProps {
  initialProducts: any[];
  dict: any;
  slug: RecipientSlug;
  initialPrice?: string;
  lang: string;
}

export function RecipientGiftsClient({
  initialProducts,
  dict,
  slug,
  initialPrice,
  lang,
}: RecipientGiftsClientProps) {
  const { toggleFavorite, isFavorite } = useFavorites();

  const isAr = lang === "ar" || dict?.common?.home === "الرئيسية";
  const currency = dict?.product?.currency || "EGP";
  const hubDict = dict?.gifts_hub || {};

  // Map slug to internal target recipient
  const recipientTarget = useMemo(() => {
    switch (slug) {
      case "for-her": return "her";
      case "for-him": return "him";
      case "for-mom": return "mom";
      case "for-couples": return "couples";
      case "for-friends": return "friends";
      case "for-kids": return "kids";
      case "all":
      default:
        return "all";
    }
  }, [slug]);

  // Filter States
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [showPersonalizedOnly, setShowPersonalizedOnly] = useState(false);
  const [showSetsOnly, setShowSetsOnly] = useState(false);
  const defaultPriceRange = initialPrice && ["UNDER_250", "UNDER_500", "UNDER_1000", "OVER_1000"].includes(initialPrice)
    ? initialPrice
    : "ALL";
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>(defaultPriceRange);
  const [sortBy, setSortBy] = useState<"popular" | "newest" | "price-low" | "price-high">("popular");
  const [openDropdown, setOpenDropdown] = useState<"price" | "sort" | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [stickyTop, setStickyTop] = useState<number | null>(null);

  // Persist recipient gifts filtering state across navigations until explicitly cleared
  const { clearPersistedFilters } = useFilterPersistence({
    key: `giftisan_filters_gifts_${slug}`,
    values: {
      showVerifiedOnly,
      showPersonalizedOnly,
      showSetsOnly,
      selectedPriceRange,
      sortBy,
    },
    setters: {
      showVerifiedOnly: setShowVerifiedOnly,
      showPersonalizedOnly: setShowPersonalizedOnly,
      showSetsOnly: setShowSetsOnly,
      selectedPriceRange: setSelectedPriceRange,
      sortBy: setSortBy,
    },
    defaultValues: {
      showVerifiedOnly: false,
      showPersonalizedOnly: false,
      showSetsOnly: false,
      selectedPriceRange: defaultPriceRange,
      sortBy: "popular" as const,
    },
    paramMapping: {
      showVerifiedOnly: "verified",
      showPersonalizedOnly: "personalized",
      showSetsOnly: "sets",
      selectedPriceRange: "price",
      sortBy: "sort",
    },
  });
  const dragControls = useDragControls();

  // Measure navbar height for sticky toolbar
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

  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (toolbarRef.current && !toolbarRef.current.contains(target)) {
        setOpenDropdown(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenDropdown(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const priceRanges = [
    { id: "ALL", label: isAr ? "جميع الأسعار" : "All Prices" },
    { id: "UNDER_250", label: hubDict.gifts_under_250 || (isAr ? "أقل من 250 ج.م" : `Under 250 ${currency}`), min: 0, max: 250 },
    { id: "UNDER_500", label: hubDict.gifts_under_500 || (isAr ? "أقل من 500 ج.م" : `Under 500 ${currency}`), min: 0, max: 500 },
    { id: "UNDER_1000", label: hubDict.gifts_under_1000 || (isAr ? "أقل من 1,000 ج.م" : `Under 1,000 ${currency}`), min: 0, max: 1000 },
    { id: "OVER_1000", label: isAr ? "أكثر من 1,000 ج.م" : `Over 1,000 ${currency}`, min: 1000, max: Infinity },
  ];

  const sortOptions = [
    { label: isAr ? "الأكثر شعبية" : "Most Popular", value: "popular" },
    { label: dict.home?.newest_arrivals || (isAr ? "وصل حديثاً" : "Newest Arrivals"), value: "newest" },
    { label: dict.home?.price_low_high || (isAr ? "السعر: من الأقل للأعلى" : "Price: Low to High"), value: "price-low" },
    { label: dict.home?.price_high_low || (isAr ? "السعر: من الأعلى للأقل" : "Price: High to Low"), value: "price-high" },
  ];

  const resetAllFilters = () => {
    setShowVerifiedOnly(false);
    setShowPersonalizedOnly(false);
    setShowSetsOnly(false);
    setSelectedPriceRange(defaultPriceRange);
    setSortBy("popular");
    setOpenDropdown(null);
    clearPersistedFilters();
  };

  const activeFiltersCount =
    (showVerifiedOnly ? 1 : 0) +
    (showPersonalizedOnly ? 1 : 0) +
    (showSetsOnly ? 1 : 0) +
    (selectedPriceRange !== "ALL" ? 1 : 0);



  // Helper function for Recipient Matching
  const matchesRecipient = (product: any, target: string): boolean => {
    if (target === "all") return true;

    const cat = (product.category || "").toLowerCase();
    const subcat = (product.subcategory || "").toLowerCase();
    const name = (product.name || "").toLowerCase();
    const tags = Array.isArray(product.tags) ? product.tags.map((t: string) => t.toLowerCase()) : [];
    const textCorpus = `${cat} ${subcat} ${name} ${tags.join(" ")}`;

    // Negative exclusions for masculine gifts
    const femaleExclusions = [
      "lip stick", "lipstick", "comb", "bun", "hair clip", "hair accessory", "scrunchie",
      "earring", "earrings", "necklace", "bracelet", "skirt", "dress", "heel",
      "makeup", "blush", "pink heart", "ruby pearl", "pastel cloud",
      "bouquet", "rose bouquet", "satin flower", "doll", "unicorn", "baby",
      "صنيه شبكه", "صينية خطوبة", "بصمه كتب كتاب", "طارة تطريز", "منديل كتب كتاب",
      "بوكيه", "حلق", "اسورة", "سلسلة", "عقد", "فستان", "روج", "مكياج", "مشط", "توكة",
      "طرحة", "عروسة", "بينك", "حريمي", "ستاتي", "دميه", "دمية", "طفلة", "يونيكورن",
      "flower", "flowers", "ورد", "زهور", "مرآة", "مراءه", "mirror", "trinket"
    ];

    if (target === "him") {
      // 1. Never match female items or floral jewelry
      if (femaleExclusions.some(kw => textCorpus.includes(kw))) {
        return false;
      }

      // 2. Positive matching for Him: leather, woodwork, desk, office, concrete, winter accessories, tech
      const himKeywords = [
        "leather", "wallet", "card holder", "laptop", "sleeve", "wood", "wooden", "desk", "stand",
        "mug", "cup", "watch", "tie", "belt", "cufflink", "gadget", "grooming", "pen", "pencil",
        "organizer", "concrete", "coaster", "tableaux", "game", "board game", "chess", "gloves",
        "winter", "art",
        "اباجورة", "استاند", "محفظة", "جلد", "خشب", "خشبي", "مقلمة", "حامل", "كارت", "لابتوب",
        "رجالي", "مكتب", "كونكريت", "تابلوه", "جوانتي", "شتاء", "دفتر", "شطرنج"
      ];
      const himCats = [
        "woodwork", "leatherwork", "accessories", "gadgets", "home-and-living",
        "sculpture", "clothing", "games-puzzles"
      ];

      return himCats.some(c => cat === c || cat.includes(c)) && himKeywords.some(kw => textCorpus.includes(kw));
    }

    if (target === "kids") {
      const kidsKeywords = [
        "doll", "toy", "puzzle", "kid", "kids", "baby", "child", "plush", "unicorn", "blocks",
        "montessori", "board game", "game", "x o",
        "دميه", "دمية", "لعبة", "اطفال", "أطفال", "طفل", "طفلة", "بيبي", "يونيكورن", "ألعاب", "العاب"
      ];
      const kidsCats = ["toys", "toys-and-games", "kids-and-baby", "kids-baby", "games-puzzles"];
      const weddingExclusions = ["شبكة", "خطوبة", "زفاف", "كتب كتاب", "wedding", "engagement", "bride", "groom"];
      if (weddingExclusions.some(kw => textCorpus.includes(kw))) return false;

      return kidsCats.some(c => cat === c || cat.includes(c)) || kidsKeywords.some(kw => textCorpus.includes(kw));
    }

    if (target === "couples") {
      const couplesKeywords = [
        "couple", "couples", "wedding", "engagement", "bride", "groom", "marriage", "anniversary",
        "matching", "ring box", "engagement tray",
        "خطوبة", "زفاف", "عريس", "عروسة", "شبكة", "دبل", "طارة", "منديل", "صنيه شبكه", "صينية خطوبة",
        "بصمه كتب كتاب", "تطريز", "كابلز", "couple keychains"
      ];
      return couplesKeywords.some(kw => textCorpus.includes(kw));
    }

    if (target === "mom") {
      const momExclusions = [
        "دميه", "دمية", "doll", "طفلة", "baby", "بيبي", "تخرج", "graduation",
        "صنيه شبكه", "صينية خطوبة", "بصمه كتب كتاب", "عريس", "groom", "رجالي",
        "lip stick", "lipstick", "روج"
      ];
      if (momExclusions.some(kw => textCorpus.includes(kw))) return false;

      const momKeywords = [
        "mom", "mother", "candle", "tray", "vase", "ceramic", "coaster", "decor", "home",
        "mirror", "comb", "bookmark", "trinket dish", "tapestry", "tableaux", "bouquet",
        "ماما", "أم", "أمي", "ست الحبايب", "صينية", "فازة", "شمع", "شمعة", "ديكور", "خزف",
        "مفرش", "مرآة", "مراءه", "تابلوه", "فاصل كتب", "كوستر", "ميدالية وَنَس", "بوكيه"
      ];
      const momCats = ["home-and-living", "ceramics", "fine-art-ceramics", "sculpture", "gifts-mementos", "gifts-sets"];
      return momCats.some(c => cat === c || cat.includes(c)) && momKeywords.some(kw => textCorpus.includes(kw));
    }

    if (target === "friends") {
      const friendsExclusions = [
        "صنيه شبكه", "صينية خطوبة", "بصمه كتب كتاب", "عريس", "groom", "شبكة"
      ];
      if (friendsExclusions.some(kw => textCorpus.includes(kw))) return false;

      const friendsKeywords = [
        "friend", "mug", "cup", "keychain", "bookmark", "notebook", "diary", "journal", "pouch",
        "tote", "crochet", "board game", "x o", "tote bag", "mini bag", "graduation", "bundle",
        "كوب", "مج", "ميدالية", "كروشيه", "نوت بوك", "صديق", "صديقة", "صحبتي", "أصدقاء", "محفظة",
        "فاصل كتب", "بوك مارك", "تخرج", "دميه التخرج", "توت باج", "شنطة", "شنطه", "لعبة"
      ];
      const friendsCats = ["accessories", "stationery", "bags-and-purses", "paper", "fine-art-ceramics", "keychains-lanyards", "games-puzzles"];
      return (friendsCats.some(c => cat === c || cat.includes(c)) && friendsKeywords.some(kw => textCorpus.includes(kw))) ||
        name.toLowerCase().includes("friend") || name.toLowerCase().includes("صحبت") || name.toLowerCase().includes("صديق");
    }

    if (target === "her") {
      if (name.includes("رجالي") || name.toLowerCase().includes("men's") || (cat === "woodwork" && name.includes("مقلمة"))) {
        return false;
      }
      const herKeywords = [
        "bag", "tote", "flower", "rose", "pearl", "necklace", "bracelet", "earring", "jewelry",
        "clutch", "scarf", "dress", "beauty", "apothecary", "bath", "candle", "trinket", "dish",
        "comb", "mirror", "hair", "clip", "bookmark", "diary", "notebook", "crochet",
        "شنطة", "حقيبة", "ورد", "بوكيه", "اسورة", "سلسلة", "حلق", "مجوهرات", "توت", "كروشيه",
        "مراءه", "مرآة", "بينك", "زهور", "عروس", "خطوبة", "حريمي", "ستات", "مكياج", "كوستر",
        "فيونكه", "طرحة", "مشط", "توكة", "فاصل كتب"
      ];
      const herCats = [
        "necklaces", "earrings", "bracelets", "jewelry", "bags-and-purses", "hair-accessories",
        "pins-clips", "brooches-pins-clips", "beauty-apothecary", "gifts-mementos", "clothing"
      ];
      return herCats.some(c => cat === c || cat.includes(c)) || herKeywords.some(kw => textCorpus.includes(kw));
    }

    return true;
  };

  // Filter and Sort Products
  const filteredProducts = useMemo(() => {
    return initialProducts
      .filter(p => {
        // Recipient filter
        if (recipientTarget !== "all" && !matchesRecipient(p, recipientTarget)) {
          return false;
        }

        // Verified Artisan filter
        if (showVerifiedOnly && !p.artisan?.isVerified) {
          return false;
        }

        // Personalized filter
        if (showPersonalizedOnly) {
          const isPersonalized =
            p.canPersonalize ||
            p.requiresClientImage ||
            (p.category || "").toLowerCase().includes("personalized") ||
            (p.name || "").includes("إسم") ||
            (p.name || "").includes("اسم") ||
            (p.name || "").includes("حرف");
          if (!isPersonalized) return false;
        }

        // Gift Sets & Boxes filter
        if (showSetsOnly) {
          const isSet =
            (p.category || "").toLowerCase().includes("gift-boxes") ||
            (p.category || "").toLowerCase().includes("gifts-sets") ||
            (p.name || "").toLowerCase().includes("set") ||
            (p.name || "").toLowerCase().includes("box") ||
            (p.name || "").includes("طقم") ||
            (p.name || "").includes("بوكيه") ||
            (p.name || "").includes("صندوق");
          if (!isSet) return false;
        }

        // Price range filter
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
        if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        // Default "popular"
        return (b.views || b.reviews?.length || 0) - (a.views || a.reviews?.length || 0);
      });
  }, [initialProducts, recipientTarget, showVerifiedOnly, showPersonalizedOnly, showSetsOnly, selectedPriceRange, sortBy]);

  // Page Header Copy
  const pageMeta = useMemo(() => {
    switch (slug) {
      case "for-her":
        return {
          title: hubDict.for_her_title || (isAr ? "هدايا لها" : "Gifts for Her"),
          subtitle: hubDict.for_her_desc || (isAr ? "فاجئها بهدية استثنائية تُبهج يومها وأيامها القادمة." : "Make her day, week, month, and year."),
        };
      case "for-him":
        return {
          title: hubDict.for_him_title || (isAr ? "هدايا له" : "Gifts for Him"),
          subtitle: hubDict.for_him_desc || (isAr ? "صعب الاختيار له؟ لدينا كل ما يناسب ذوقه بحرفية وفخامة." : "Hard to shop for? Not on our watch."),
        };
      case "for-mom":
        return {
          title: hubDict.for_mom_title || (isAr ? "هدايا لست الحبايب" : "Gifts for Mom"),
          subtitle: hubDict.for_mom_desc || (isAr ? "عبر لأغلى الناس بلمسات دافئة وهدايا تذكارية تليق بمقامها." : "Warmth, gratitude, and heartfelt treasures for Mom."),
        };
      case "for-couples":
        return {
          title: hubDict.for_couples_title || (isAr ? "هدايا للعروسين والمناسبات" : "Gifts for Couples & Weddings"),
          subtitle: hubDict.for_couples_desc || (isAr ? "قطع تذكارية وصواني خطوبة مخصصة لتوثيق أسعد لحظات العمر." : "Bespoke keepsakes to celebrate love and new beginnings."),
        };
      case "for-friends":
        return {
          title: hubDict.for_friends_title || (isAr ? "هدايا للأصدقاء" : "Gifts for Friends"),
          subtitle: hubDict.for_friends_desc || (isAr ? "مفاجآت مرحة ولمسات مبهجة ومصنوعات كروشيه لأعز الرفاق." : "Delightful surprises and playful artisan tokens."),
        };
      case "for-kids":
        return {
          title: hubDict.for_kids_title || (isAr ? "هدايا للأطفال" : "Gifts for Kids"),
          subtitle: hubDict.for_kids_desc || (isAr ? "ألعاب ومصنوعات خشبية وكروشيه تشعل خيالهم ومرحهم." : "Imaginative and fun—just like them."),
        };
      case "all":
      default:
        return {
          title: hubDict.browse_all_gifts || (isAr ? "جميع الهدايا الحرفية" : "All Handcrafted Gifts"),
          subtitle: isAr ? "وجهتك الأولى للهدايا المميزة والفريدة من المبدعين والورش المحلية في مصر." : "THE place for meaningful presents from small shops.",
        };
    }
  }, [slug, hubDict, isAr]);

  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <main className="min-h-screen bg-cream">
      <Navbar dict={dict} />

      {/* Breadcrumbs Strip */}
      <div className="bg-cream-dark/40 border-b border-primary/5 py-2.5">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-charcoal/60">
            <Link href={`/${lang}`} className="hover:text-primary transition-colors">
              {dict.common?.home || (isAr ? "الرئيسية" : "Home")}
            </Link>
            <ChevronRight className={cn("w-3.5 h-3.5 text-charcoal/40", isAr && "rotate-180")} />
            <Link href={`/${lang}/gifts`} className="hover:text-primary transition-colors font-medium">
              {hubDict.all_gifts || (isAr ? "دليل الهدايا" : "Gift Guide")}
            </Link>
            <ChevronRight className={cn("w-3.5 h-3.5 text-charcoal/40", isAr && "rotate-180")} />
            <span className="text-primary font-bold truncate">
              {pageMeta.title}
            </span>
          </nav>
        </div>
      </div>

      {/* Recipient Header */}
      <section className="pt-6 sm:pt-8 2xl:pt-10 pb-4 sm:pb-5 w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl md:text-4xl 2xl:text-5xl font-serif text-[#222222] font-normal tracking-tight">
                {pageMeta.title}
              </h1>
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                {filteredProducts.length} {isAr ? "هدية متاحة" : "gifts"}
              </span>
            </div>
            <p className="text-xs sm:text-sm 2xl:text-base text-charcoal/70 mt-1.5 font-normal max-w-2xl 2xl:max-w-3xl leading-relaxed">
              {pageMeta.subtitle}
            </p>
          </div>

          {/* Return to Full Gift Guide Link */}
          <Link
            href={`/${lang}/gifts`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-accent transition-colors self-start md:self-auto shrink-0 bg-white/80 border border-primary/10 px-3.5 py-1.5 rounded-full shadow-xs hover:border-primary/30"
          >
            <Compass className="w-3.5 h-3.5 text-accent" />
            <span>{isAr ? "استكشف دليل الهدايا الكامل" : "Explore Gift Guide Hub"}</span>
            <ArrowIcon className="w-3 h-3" />
          </Link>
        </div>
      </section>

      {/* Sticky Filter Toolbar */}
      <div
        ref={toolbarRef}
        style={stickyTop !== null ? { top: `${stickyTop}px` } : undefined}
        className="sticky top-[105px] md:top-[124px] z-30 bg-cream/95 backdrop-blur-md py-2.5 md:py-3 border-y border-primary/5 mb-6 md:mb-8 transition-all"
      >
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
          
          {/* Mobile Toolbar */}
          <div className="flex md:hidden items-center gap-2 w-full">
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
              <span>{hubDict.filters || (isAr ? "الفلاتر" : "Filters")}</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-accent text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <div className="h-5 w-px bg-primary/10 shrink-0" />

            <div className="flex-1 overflow-x-auto scrollbar-none flex items-center gap-1.5 whitespace-nowrap py-0.5">
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
                <span>{hubDict.gifts_under_250 || (isAr ? "< 250 ج.م" : "< 250 EGP")}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPriceRange(prev => prev === "UNDER_500" ? "ALL" : "UNDER_500")}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border shrink-0 active:scale-95",
                  selectedPriceRange === "UNDER_500"
                    ? "bg-primary text-white border-primary shadow-xs"
                    : "bg-white text-charcoal/80 border-primary/15"
                )}
              >
                <span>{hubDict.gifts_under_500 || (isAr ? "< 500 ج.م" : "< 500 EGP")}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPersonalizedOnly(!showPersonalizedOnly)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border shrink-0 active:scale-95",
                  showPersonalizedOnly
                    ? "bg-accent text-white border-accent"
                    : "bg-white text-charcoal/80 border-primary/15"
                )}
              >
                <Sparkles className="w-3 h-3" />
                <span>{hubDict.personalized_gifts || (isAr ? "مخصصة" : "Personalized")}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSetsOnly(!showSetsOnly)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border shrink-0 active:scale-95",
                  showSetsOnly
                    ? "bg-accent text-white border-accent"
                    : "bg-white text-charcoal/80 border-primary/15"
                )}
              >
                <Package className="w-3 h-3" />
                <span>{hubDict.gift_sets || (isAr ? "أطقم" : "Sets")}</span>
              </button>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold text-accent bg-accent/10 border border-accent/20 shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{hubDict.clear_filters || (isAr ? "إلغاء" : "Reset")}</span>
                </button>
              )}
            </div>
          </div>

          {/* Desktop Toolbar */}
          <div className="hidden md:flex items-center justify-between gap-3 w-full">
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Price Dropdown Pill */}
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
                      : `${isAr ? "الميزانية" : "Price"} (${currency})`}
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

              {/* Personalized Gifts Pill */}
              <button
                type="button"
                onClick={() => setShowPersonalizedOnly(!showPersonalizedOnly)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border shadow-xs active:scale-95",
                  showPersonalizedOnly
                    ? "bg-accent text-white border-accent shadow-sm shadow-accent/20"
                    : "bg-white text-charcoal/80 border-primary/15 hover:border-primary/30 hover:text-primary"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{hubDict.personalized_gifts || (isAr ? "هدايا مخصصة" : "Personalized")}</span>
              </button>

              {/* Gift Sets Pill */}
              <button
                type="button"
                onClick={() => setShowSetsOnly(!showSetsOnly)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border shadow-xs active:scale-95",
                  showSetsOnly
                    ? "bg-accent text-white border-accent shadow-sm shadow-accent/20"
                    : "bg-white text-charcoal/80 border-primary/15 hover:border-primary/30 hover:text-primary"
                )}
              >
                <Package className="w-3.5 h-3.5" />
                <span>{hubDict.gift_sets || (isAr ? "أطقم هدايا" : "Gift Sets")}</span>
              </button>

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

              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenDropdown(prev => prev === "sort" ? null : "sort")}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border shadow-xs active:scale-95",
                    sortBy !== "popular"
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

              {/* Clear All Filters Button */}
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs font-bold text-accent hover:underline flex items-center gap-1 ps-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{hubDict.clear_filters || (isAr ? "إعادة تعيين" : "Reset")}</span>
                </button>
              )}
            </div>

            {/* Product Count */}
            <div className="text-xs text-charcoal/50 font-medium shrink-0">
              <span>{filteredProducts.length}</span>{" "}
              <span>{isAr ? "هدية متاحة" : (filteredProducts.length === 1 ? "gift available" : "gifts available")}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Curated Gifts Product Grid */}
      <section className="pb-16 2xl:pb-24 w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
        
        {/* Empty State */}
        {filteredProducts.length === 0 ? (
          <div className="py-16 md:py-24 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-primary/5 rounded-full flex items-center justify-center text-primary/30">
              <SlidersHorizontal className="w-7 h-7 md:w-8 md:h-8" />
            </div>
            <div className="space-y-2 px-4 max-w-md">
              <h3 className="text-lg md:text-2xl font-serif text-primary font-medium">
                {hubDict.no_gifts_found || (isAr ? "لم نجد هدايا تطابق الفلتر المحدد" : "No gifts match your filter selection")}
              </h3>
              <p className="text-charcoal/60 text-xs md:text-sm font-normal leading-relaxed">
                {isAr
                  ? "جرب إزالة بعض الفلاتر أو تصفح باقي تصنيفات الهدايا لاكتشاف أروع القطع المصنوعة يدوياً."
                  : "Try clearing some filters or browse other gift collections to discover handcrafted treasures."}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-full hover:bg-primary-light transition-all shadow-xs"
                >
                  {hubDict.clear_filters || (isAr ? "إعادة ضبط الفلاتر" : "Reset Filters")}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Products Grid (Etsy Style) */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 2xl:gap-6">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product, idx) => {
                const reviews = product.reviews || [];
                const ratingCount = reviews.length;
                const avgRating = ratingCount > 0
                  ? (reviews.reduce((acc: number, r: any) => acc + (r.rating || 5), 0) / ratingCount).toFixed(1)
                  : null;
                const artisanName = product.artisan?.studioName || product.artisan?.user?.name;
                const slugOrId = (product.slug || product.id).trim();
                const productUrl = `/${lang}/products/${encodeURI(slugOrId)}`;

                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, delay: Math.min(idx * 0.02, 0.3) }}
                  >
                    <div className="group cursor-pointer block h-full flex flex-col justify-between">
                      <div>
                        {/* Image Frame */}
                        <div className="relative aspect-square rounded-xl md:rounded-2xl overflow-hidden mb-2.5 shadow-xs hover:shadow-md transition-shadow border border-primary/5 bg-cream/20">
                          <Link href={productUrl} className="block w-full h-full">
                            <BespokeImage
                              type="product"
                              id={product.id}
                              src={product.images?.[0] || "/images/placeholder.jpg"}
                              alt={product.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            />
                          </Link>

                          {/* Wishlist Button */}
                          <div className="absolute top-2 end-2 z-10">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleFavorite(product);
                              }}
                              className={cn(
                                "p-1.5 md:p-2 rounded-full transition-all scale-95 active:scale-75 shadow-md",
                                isFavorite(product.id)
                                  ? "bg-red-50 text-red-500 opacity-100"
                                  : "bg-white/90 backdrop-blur text-primary opacity-90 sm:opacity-0 group-hover:opacity-100 hover:bg-white"
                              )}
                              aria-label="Save to favorites"
                            >
                              <Heart className={cn("w-3.5 h-3.5 md:w-4 md:h-4", isFavorite(product.id) && "fill-current")} />
                            </button>
                          </div>
                        </div>

                        {/* Artisan Studio */}
                        {artisanName && (
                          <p className="text-[11px] text-charcoal/50 font-normal line-clamp-1">
                            {artisanName}
                          </p>
                        )}

                        {/* Title */}
                        <h3 className="text-xs md:text-sm font-heading font-medium text-charcoal group-hover:text-primary transition-colors line-clamp-1 mt-0.5">
                          <Link href={productUrl}>{product.name}</Link>
                        </h3>

                        {/* Rating */}
                        {avgRating && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span className="text-[11px] font-bold text-charcoal">{avgRating}</span>
                            <span className="text-[10px] text-charcoal/50 font-normal">({ratingCount})</span>
                          </div>
                        )}
                      </div>

                      {/* Price */}
                      <p className="font-heading font-bold text-primary text-xs md:text-sm pt-1 mt-1">
                        {currency} {Number(product.price).toFixed(2)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

      </section>

      {/* Explore More Gift Collections Bottom Banner */}
      <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16 pb-16 2xl:pb-24">
        <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5 rounded-3xl p-6 md:p-10 border border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center sm:text-start">
            <h3 className="text-xl sm:text-2xl font-serif font-medium text-primary">
              {isAr ? "تبحث عن المزيد من أفكار الهدايا؟" : "Looking for more gift inspiration?"}
            </h3>
            <p className="text-xs sm:text-sm text-charcoal/70 max-w-xl">
              {isAr
                ? "تصفح دليل الهدايا الكامل لاستكشاف تصنيفات حسب المناسبات، الميزانيات، والمجموعات التذكارية."
                : "Explore our complete Gift Guide Hub to find curated presents by occasion, budget, and artisan crafts."}
            </p>
          </div>
          <Link
            href={`/${lang}/gifts`}
            className="px-6 py-3 bg-primary text-white rounded-full text-xs sm:text-sm font-bold shadow-md hover:bg-primary-light transition-all flex items-center gap-2 shrink-0 active:scale-95"
          >
            <span>{isAr ? "دليل الهدايا الشامل" : "Gift Guide Hub"}</span>
            <ArrowIcon className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Mobile Filter & Sort Bottom Sheet Drawer */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="absolute inset-0 bg-charcoal/50 backdrop-blur-xs"
            />

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
              {/* Drag Handle */}
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
                    {hubDict.filter_and_sort || (isAr ? "تصفية وترتيب" : "Filter & Sort")}
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
                      {hubDict.clear_filters || (isAr ? "إعادة تعيين" : "Reset")}
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
                


                {/* Section: Budget */}
                <div>
                  <label className="text-xs font-bold text-charcoal/70 uppercase tracking-wider mb-2.5 block">
                    {hubDict.budget || (isAr ? "الميزانية" : "Budget")} ({currency})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {priceRanges.map(range => (
                      <button
                        key={range.id}
                        type="button"
                        onClick={() => setSelectedPriceRange(range.id)}
                        className={cn(
                          "px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all",
                          selectedPriceRange === range.id
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-white text-charcoal/80 border-primary/15 hover:border-primary/30"
                        )}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section: Special Features */}
                <div>
                  <label className="text-xs font-bold text-charcoal/70 uppercase tracking-wider mb-2.5 block">
                    {hubDict.special_features || (isAr ? "خيارات مميزة" : "Special Features")}
                  </label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowPersonalizedOnly(!showPersonalizedOnly)}
                      className={cn(
                        "w-full p-3 rounded-2xl text-xs font-bold border transition-all flex items-center justify-between",
                        showPersonalizedOnly
                          ? "bg-accent/10 text-accent border-accent"
                          : "bg-white text-charcoal/80 border-primary/15 hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-accent" />
                        <span>{hubDict.personalized_gifts || (isAr ? "هدايا مخصصة بالاسم" : "Personalized Gifts")}</span>
                      </div>
                      {showPersonalizedOnly && <CheckCircle2 className="w-4 h-4 text-accent" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowSetsOnly(!showSetsOnly)}
                      className={cn(
                        "w-full p-3 rounded-2xl text-xs font-bold border transition-all flex items-center justify-between",
                        showSetsOnly
                          ? "bg-accent/10 text-accent border-accent"
                          : "bg-white text-charcoal/80 border-primary/15 hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Package className="w-4 h-4 text-accent" />
                        <span>{hubDict.gift_sets || (isAr ? "صناديق وأطقم هدايا" : "Gift Boxes & Sets")}</span>
                      </div>
                      {showSetsOnly && <CheckCircle2 className="w-4 h-4 text-accent" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                      className={cn(
                        "w-full p-3 rounded-2xl text-xs font-bold border transition-all flex items-center justify-between",
                        showVerifiedOnly
                          ? "bg-accent/10 text-accent border-accent"
                          : "bg-white text-charcoal/80 border-primary/15 hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-accent" />
                        <span>{dict.home?.artisans_tab || (isAr ? "حرفيون موثقون فقط" : "Verified Artisans Only")}</span>
                      </div>
                      {showVerifiedOnly && <CheckCircle2 className="w-4 h-4 text-accent" />}
                    </button>
                  </div>
                </div>

                {/* Section: Sort By */}
                <div>
                  <label className="text-xs font-bold text-charcoal/70 uppercase tracking-wider mb-2.5 block">
                    {hubDict.sort_by || (isAr ? "ترتيب حسب" : "Sort By")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {sortOptions.map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSortBy(option.value as any)}
                        className={cn(
                          "p-2.5 rounded-xl text-xs font-semibold border transition-all text-center",
                          sortBy === option.value
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-white text-charcoal/80 border-primary/15 hover:border-primary/30"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Bottom Sticky Action */}
              <div className="p-4 bg-white/95 backdrop-blur-md border-t border-primary/10">
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="w-full py-3.5 bg-primary text-white text-sm font-bold rounded-2xl hover:bg-primary-light transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>
                    {isAr
                      ? `عرض ${filteredProducts.length} هدية`
                      : `Show ${filteredProducts.length} ${filteredProducts.length === 1 ? "Gift" : "Gifts"}`}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer dict={dict} />
    </main>
  );
}
