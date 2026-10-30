"use client";

import Link from "next/link";
import { Search, ShoppingCart, User, Heart, Menu, X, LogOut, LogIn, MessageSquare, HelpCircle, CheckCircle2, MapPin, Sparkles, Store, ChevronDown, ChevronLeft, ChevronRight, ShieldCheck, Package, Share2, Globe, Users, Gift, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/cart-context";
import { useNotifications } from "./notification-provider";
import { useFavorites } from "@/context/favorites-context";
import { useAuthModal } from "@/context/auth-modal-context";
import { useIsNative, triggerHaptic, performSignOut, shareNativeContent } from "@/lib/native";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { searchProducts } from "@/lib/actions";
import { PreLaunchBanner } from "./pre-launch-banner";
import { VerificationBanner } from "./verification-banner";
import { FoundingBanner } from "./founding-banner";
import { toast } from "react-hot-toast";

export function Navbar({ dict }: { dict?: any }) {
  // Safe fallback if dict is not provided
  const d = dict || {
    common: {
      search: "Search products, artisans, crafts...",
      categories: "Categories",
      login: "Login",
      signup: "Sign Up",
      logout: "Logout",
      home: "Home",
      artisans: "Artisans",
      manage_profile: "Manage Profile",
      purchases_orders: "Purchases & Orders",
      your_account: "Your Account",
      support: "Support",
      become_artisan: "Apply to Join",
      open_studio: "Open Your Shop",
      start_shopping: "Start Shopping",
      search_placeholder: "Search for unique gifts...",
      explore_trending: "Explore Trending Products",
      all_categories: "Browse All Categories",
      sell: "Sell",
      pro_studio: "Shop Manager",
      sign_in: "Sign In",
      sign_out: "Sign Out",
      menu: "Menu",
      explore: "Explore Products",
      terms: "Terms of Service",
      privacy: "Privacy Policy",
      shipping: "Shipping Policy",
      refund: "Refund Policy"
    }
  };
  const { data: session, update } = useSession();
  const isNative = useIsNative();
  const { setIsCartOpen, totalItems } = useCart();
  const { totalFavorites, totalFavoriteArtisans } = useFavorites();
  const allFavoritesCount = totalFavorites + (totalFavoriteArtisans || 0);
  const { openAuthModal } = useAuthModal();
  const { unreadCount } = useNotifications();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("success") === "EmailVerified") {
      toast.success(d.auth?.toast_email_verified || "Identity verified! Your account is now fully active.", {
        id: "global-verified",
        duration: 3000
      });
      update();

      // Clean up URL to prevent re-triggering on refresh
      const newUrl = pathname;
      window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
    }
  }, [searchParams, update, pathname]);

  // Global Keyboard Shortcut for switching languages (Alt + L)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "l" || e.key === "L" || e.key === "ل")) {
        e.preventDefault();
        const nextLang = pathname.startsWith("/en") ? "ar" : "en";
        document.cookie = `NEXT_LOCALE=${nextLang}; path=/; max-age=31536000`;
        const nextPath = pathname.replace(/^\/(en|ar)/, `/${nextLang}`);
        
        toast.success(
          nextLang === "ar" 
            ? "جاري التحويل إلى اللغة العربية..." 
            : "Switching to English...",
          { id: "lang-switch-toast", duration: 1500 }
        );
        
        router.push(nextPath);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pathname, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowResults(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        const results = await searchProducts(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Segment matches client-side into rich classified suggestions
  const suggestions = useMemo(() => {
    if (!searchResults || searchResults.length === 0) return { products: [], artisans: [], categories: [] };
    
    const artisansMap = new Map<string, any>();
    const categoriesSet = new Set<string>();
    
    searchResults.forEach((p) => {
      if (p.artisan) {
        const artisanId = p.artisan.id;
        if (!artisansMap.has(artisanId)) {
          artisansMap.set(artisanId, {
            id: artisanId,
            studioName: p.artisan.studioName || p.artisan.user?.name,
            slug: p.artisan.slug || p.artisan.user?.name?.toLowerCase().replace(/ /g, "-"),
            avatar: p.artisan.avatar,
            location: p.artisan.location,
            isVerified: p.artisan.isVerified
          });
        }
      }
      if (p.category) {
        categoriesSet.add(p.category);
      }
    });
    
    return {
      products: searchResults.slice(0, 4),
      artisans: Array.from(artisansMap.values()).slice(0, 3),
      categories: Array.from(categoriesSet).slice(0, 3),
    };
  }, [searchResults]);

  const navCategories = useMemo(() => [
    { id: "gifts", label: d.common?.categories_list?.["gifts"] || d.home?.categories_list?.["gifts"] || "Gifts" },
    { id: "home-and-living", label: d.common?.categories_list?.["home-and-living"] || d.home?.categories_list?.["home-and-living"] || "Home & Living" },
    { id: "jewelry", label: d.common?.categories_list?.["jewelry"] || d.home?.categories_list?.["jewelry"] || "Jewelry" },
    { id: "clothing", label: d.common?.categories_list?.["clothing"] || d.home?.categories_list?.["clothing"] || "Clothing" },
    { id: "bags-and-purses", label: d.common?.categories_list?.["bags-and-purses"] || d.home?.categories_list?.["bags-and-purses"] || "Bags & Purses" },
    { id: "accessories", label: d.common?.categories_list?.["accessories"] || d.home?.categories_list?.["accessories"] || "Accessories" },
    { id: "art-and-collectibles", label: d.common?.categories_list?.["art-and-collectibles"] || d.home?.categories_list?.["art-and-collectibles"] || "Art & Collectibles" },
    { id: "weddings", label: d.common?.categories_list?.["weddings"] || d.home?.categories_list?.["weddings"] || "Weddings" },
    { id: "bath-and-beauty", label: d.common?.categories_list?.["bath-and-beauty"] || d.home?.categories_list?.["bath-and-beauty"] || "Bath & Beauty" },
    { id: "craft-supplies-and-tools", label: d.common?.categories_list?.["craft-supplies-and-tools"] || d.home?.categories_list?.["craft-supplies-and-tools"] || "Craft Supplies & Tools" },
    { id: "kids-and-baby", label: d.common?.categories_list?.["kids-and-baby"] || d.home?.categories_list?.["kids-and-baby"] || "Kids & Baby" },
    { id: "paper-and-party-supplies", label: d.common?.categories_list?.["paper-and-party-supplies"] || d.home?.categories_list?.["paper-and-party-supplies"] || "Paper & Party Supplies" },
    { id: "pet-supplies", label: d.common?.categories_list?.["pet-supplies"] || d.home?.categories_list?.["pet-supplies"] || "Pet Supplies" },
    { id: "shoes", label: d.common?.categories_list?.["shoes"] || d.home?.categories_list?.["shoes"] || "Shoes" },
    { id: "toys-and-games", label: d.common?.categories_list?.["toys-and-games"] || d.home?.categories_list?.["toys-and-games"] || "Toys & Games" },
    { id: "books-movies-and-music", label: d.common?.categories_list?.["books-movies-and-music"] || d.home?.categories_list?.["books-movies-and-music"] || "Books, Movies & Music" },
    { id: "electronics-and-accessories", label: d.common?.categories_list?.["electronics-and-accessories"] || d.home?.categories_list?.["electronics-and-accessories"] || "Electronics & Accessories" },
  ], [d]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const isClickInDesktopSearch = searchRef.current && searchRef.current.contains(e.target as Node);
      const isClickInMobileSearch = mobileSearchRef.current && mobileSearchRef.current.contains(e.target as Node);
      if (!isClickInDesktopSearch && !isClickInMobileSearch) {
        setShowResults(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowResults(false);
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setIsProfileMenuOpen(false);
    setIsMenuOpen(false);
    setShowResults(false);
  }, [pathname]);

  const renderSearchOverlay = (isMobile = false) => {
    if (!showResults) return null;
    return (
      <div className={cn(
        "absolute top-full mt-2 bg-white shadow-2xl border border-primary/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50",
        isMobile
          ? "start-0 end-0 rounded-2xl max-h-[60vh] overflow-y-auto"
          : "left-0 right-0 rounded-3xl border-primary/5 max-w-[calc(100vw-32px)] md:max-w-none"
      )}>
        {!searchQuery ? (
          /* Empty Search State - Popular collections & categories */
          <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            <div className="space-y-3">
              <p className="text-[9px] md:text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] ms-1">{d.common.popular_collections}</p>
              <div className="flex flex-wrap gap-1.5 md:gap-2">
                {Object.entries(d.common.trending_tags || {}).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      const searchLabel = label as string;
                      setSearchQuery(searchLabel);
                      router.push(`/search?q=${encodeURIComponent(searchLabel)}`);
                      setShowResults(false);
                    }}
                    className="px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-cream text-primary/60 text-[11px] md:text-xs font-bold border border-primary/5 hover:bg-accent/5 hover:text-accent hover:border-accent/20 transition-all uppercase tracking-wider"
                  >
                    {label as string}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-primary/5">
              <Link
                href="/categories"
                onClick={() => setShowResults(false)}
                className="flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary/5 flex items-center justify-center">
                    <ShoppingCart className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                  </div>
                  <span className="text-xs font-bold text-primary">{d.common.all_categories}</span>
                </div>
                <span className="text-accent group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="p-3 md:p-4 border-b border-primary/5 flex justify-between items-center bg-cream/30">
              <span className="text-[10px] md:text-xs font-black text-primary/40 uppercase tracking-widest">{d.common.gifts_for_you}</span>
              <span className="text-[9px] md:text-[10px] font-bold text-accent px-2 py-0.5 bg-accent/5 rounded-full">
                {isSearching ? d.common.searching : d.common.items_found.replace('{count}', searchResults.length.toString())}
              </span>
            </div>

            {/* Split Multicolumn Suggestion Layout */}
            <div className="max-h-[350px] md:max-h-[500px] overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 p-3 md:p-5">
                  {/* Left Column: Matching Products */}
                  <div className="lg:col-span-7 space-y-3">
                    <p className="text-[9px] font-black text-primary/30 uppercase tracking-[0.2em] mb-2 px-1">
                      {pathname.includes("/ar") ? "المنتجات المتطابقة" : "Matching Products"}
                    </p>
                    <div className="space-y-2">
                      {suggestions.products.map((p) => (
                        <Link
                          key={p.id}
                          href={`/products/${p.slug || p.id}`}
                          onClick={() => setShowResults(false)}
                          className="flex items-center gap-3 p-2 hover:bg-primary/5 rounded-2xl transition-all group/item border border-transparent hover:border-primary/5"
                        >
                          <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-xl overflow-hidden shrink-0 border border-primary/5">
                            <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="48px" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-heading font-bold text-xs text-primary group-hover/item:text-accent transition-colors truncate">{p.name}</h4>
                              <span className="text-xs font-bold text-primary whitespace-nowrap">EGP {p.price}</span>
                            </div>
                            <p className="text-[10px] text-charcoal/40 font-medium truncate">
                              {p.artisan?.studioName || p.artisan?.user?.name}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Dynamic Categories & Artisans */}
                  <div className="lg:col-span-5 space-y-4 md:space-y-6 lg:border-s lg:border-primary/5 lg:ps-5">
                    {suggestions.categories.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-primary/30 uppercase tracking-[0.2em] mb-1">
                          {pathname.includes("/ar") ? "الفئات الحرفية" : "Local Craft Categories"}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestions.categories.map((cat) => {
                            const catSlug = cat.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-");
                            const translatedName = d.common.categories_list?.[catSlug] || cat;
                            return (
                              <Link
                                key={cat}
                                href={`/category/${catSlug}`}
                                onClick={() => setShowResults(false)}
                                className="px-2.5 py-1 md:px-3 md:py-1.5 rounded-xl bg-cream hover:bg-accent hover:text-white text-[10px] font-bold text-primary/70 transition-all border border-primary/5 hover:shadow-sm"
                              >
                                {translatedName}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {suggestions.artisans.length > 0 && (
                      <div className="space-y-2 md:space-y-3">
                        <p className="text-[9px] font-black text-primary/30 uppercase tracking-[0.2em]">
                          {pathname.includes("/ar") ? "المتاجر والحرفيون" : "Makers & Shops"}
                        </p>
                        <div className="space-y-1.5">
                          {suggestions.artisans.map((artisan) => (
                            <Link
                              key={artisan.id}
                              href={`/artisans/${artisan.slug}`}
                              onClick={() => setShowResults(false)}
                              className="flex items-center gap-2.5 p-1.5 md:p-2 hover:bg-accent/5 rounded-xl transition-all group/artisan"
                            >
                              <div className="relative w-7 h-7 md:w-8 md:h-8 rounded-full overflow-hidden shrink-0 border border-primary/5 bg-cream">
                                {artisan.avatar ? (
                                  <Image src={artisan.avatar} alt={artisan.studioName} fill className="object-cover" sizes="32px" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-primary/40">
                                    {artisan.studioName?.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <h5 className="text-[11px] font-bold text-primary group-hover/artisan:text-accent transition-colors truncate">
                                    {artisan.studioName}
                                  </h5>
                                  {artisan.isVerified && <CheckCircle2 className="w-3 h-3 text-accent shrink-0" />}
                                </div>
                                <p className="text-[9px] text-charcoal/40 flex items-center gap-0.5 truncate">
                                  <MapPin className="w-2.5 h-2.5 text-accent" /> {artisan.location}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : !isSearching ? (
                <div className="p-6 md:p-8 text-center space-y-4 md:space-y-6">
                  <div className="space-y-1 md:space-y-2">
                    <p className="text-charcoal/40 text-xs md:text-sm font-medium italic">"{d.common.nothing_matches.replace('{query}', searchQuery)}"</p>
                  </div>
                  <div className="space-y-2 md:space-y-3">
                    <p className="text-[9px] md:text-[10px] text-accent font-black uppercase tracking-widest">{d.common.try_trending}</p>
                    <div className="flex flex-wrap justify-center gap-1.5 md:gap-2">
                      {["tote_bags", "crochet", "home_decor", "personalized"].map(tagKey => {
                        const tagLabel = (d.common.trending_tags?.[tagKey]) || tagKey;
                        return (
                          <button
                            key={tagKey}
                            type="button"
                            onClick={() => {
                              setSearchQuery(tagLabel);
                              router.push(`/search?q=${encodeURIComponent(tagLabel)}`);
                              setShowResults(false);
                            }}
                            className="px-2.5 py-1 md:px-3 md:py-1.5 rounded-full bg-cream text-primary/40 text-[10px] font-bold border border-primary/5 hover:text-accent uppercase tracking-tighter"
                          >
                            {tagLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 md:p-8 text-center text-charcoal/40 animate-pulse text-xs font-bold uppercase tracking-widest">
                  {d.common.scanning_workshop}
                </div>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="p-2.5 md:p-3 bg-primary/5 text-center border-t border-primary/5">
                <button
                  type="button"
                  onClick={handleSearch}
                  className="text-[10px] font-black text-primary uppercase tracking-[0.25em] hover:text-accent transition-colors"
                >
                  {d.common.see_all_results} →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  if (isNative) {
    const isArabic = pathname.startsWith("/ar");
    const isProductDetail = Boolean(pathname.match(/\/(products|product)\/[^/]+/));
    const isSubPage = pathname !== "/" && pathname !== "/en" && pathname !== "/ar" && pathname !== "/en/" && pathname !== "/ar/";
    const searchPlaceholder = isArabic ? "ابحث عن شيء مميز..." : "Search for something special";

    // 1. Sleek Etsy-style top action bar on Product Detail Pages
    if (isProductDetail) {
      return (
        <header className="sticky top-0 z-40 w-full pt-safe bg-[#FDFCF0]/95 backdrop-blur-xl border-b border-primary/10 shadow-xs select-none transition-colors">
          <div className="px-3.5 py-2 flex items-center justify-between gap-2.5">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back();
                } else {
                  router.push(isArabic ? "/ar/products" : "/en/products");
                }
              }}
              aria-label="Go back"
              className="w-10 h-10 flex items-center justify-center text-primary bg-white/80 hover:bg-white rounded-full border border-primary/10 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
            >
              {isArabic ? (
                <ChevronRight className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
              )}
            </button>

            {/* Subtle Brand Center */}
            <div className="flex-1 flex items-center justify-center min-w-0 px-2">
              <span className="text-sm font-heading font-black text-primary tracking-tight truncate">
                Giftisan
              </span>
            </div>

            {/* Trailing Actions: Quick Search + Native Share + Cart Drawer */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Quick Search Button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  router.push(isArabic ? "/ar/search" : "/en/search");
                }}
                aria-label="Search"
                className="w-10 h-10 flex items-center justify-center text-primary/75 hover:text-primary bg-white/80 hover:bg-white rounded-full border border-primary/10 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <Search className="w-4 h-4 stroke-[2.2]" />
              </button>

              {/* Native OS Share Sheet */}
              <button
                type="button"
                onClick={async () => {
                  triggerHaptic("light");
                  const pageTitle = typeof document !== "undefined" ? document.title : "Giftisan";
                  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
                  const shared = await shareNativeContent({
                    title: pageTitle,
                    url: pageUrl,
                    dialogTitle: isArabic ? "مشاركة هذا المنتج" : "Share this handcrafted gift",
                  });
                  if (!shared) {
                    toast.success(isArabic ? "تم نسخ الرابط بنجاح" : "Link copied to clipboard", {
                      icon: <CheckCircle2 className="w-5 h-5 text-accent" />,
                    });
                  }
                }}
                aria-label="Share"
                className="w-10 h-10 flex items-center justify-center text-primary/75 hover:text-primary bg-white/80 hover:bg-white rounded-full border border-primary/10 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 stroke-[2.2]" />
              </button>

              {/* Cart Drawer Trigger with Live Badge */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("medium");
                  setIsCartOpen(true);
                }}
                aria-label="Cart"
                className="relative w-10 h-10 flex items-center justify-center text-primary bg-white/80 hover:bg-white rounded-full border border-primary/10 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4 stroke-[2.2]" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 bg-accent text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>
      );
    }

    return (
      <header className="sticky top-0 z-40 w-full pt-safe bg-[#FDFCF0]/95 backdrop-blur-xl border-b border-primary/10 shadow-xs select-none transition-colors">
        <div className="px-3.5 py-2.5 flex items-center gap-2.5">
          {/* Back Button on subpages */}
          {isSubPage && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                router.back();
              }}
              aria-label="Go back"
              className="p-2 -ms-1 text-primary hover:bg-primary/5 rounded-full active:scale-95 transition-all cursor-pointer shrink-0"
            >
              {isArabic ? (
                <ChevronRight className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
              )}
            </button>
          )}

          {/* Full-Width Etsy Search Pill - Giftisan Brand Style */}
          <div ref={mobileSearchRef} className="flex-1 relative">
            <form onSubmit={handleSearch} className="w-full relative group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                placeholder={searchPlaceholder}
                className="w-full h-11 ps-10 pe-16 bg-white border border-primary/20 rounded-full focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent text-primary text-[13px] font-medium placeholder:text-primary/45 shadow-[0_2px_8px_rgba(6,78,59,0.05)] transition-all"
              />
              <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 text-primary/50 w-4 h-4 group-focus-within:text-accent transition-colors pointer-events-none" />

              {/* Trailing Controls: Clear button + Compact Language Pill */}
              <div className="absolute end-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="text-primary/40 hover:text-primary p-1 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerHaptic("light");
                    const nextLang = pathname.startsWith("/en") ? "ar" : "en";
                    document.cookie = `NEXT_LOCALE=${nextLang}; path=/; max-age=31536000`;
                    const nextPath = pathname.replace(/^\/(en|ar)/, `/${nextLang}`);
                    router.push(nextPath);
                  }}
                  className="px-2.5 py-0.5 rounded-full bg-primary/5 hover:bg-primary/10 border border-primary/10 text-[10px] font-bold text-primary active:scale-95 transition-all"
                >
                  {pathname.startsWith("/en") ? "عربي" : "EN"}
                </button>
              </div>

              {renderSearchOverlay(true)}
            </form>
          </div>
        </div>
      </header>
    );
  }

  return (
    <div className="sticky top-0 z-50 w-full pt-safe">
      <FoundingBanner dict={d} />
      <VerificationBanner dict={d} />
      <nav className="w-full glass border-b border-primary/10">
        <div className="max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-3.5 md:px-8 lg:px-12 2xl:px-12 3xl:px-16 h-14 md:h-20 3xl:h-22 flex items-center justify-between gap-2 md:gap-4 lg:gap-6 xl:gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 md:gap-2.5 shrink-0 group">
            <div className="relative w-8 h-8 md:w-10 md:h-10 2xl:w-11 2xl:h-11 overflow-hidden shadow-lg shadow-primary/5 rounded-md">
              <Image
                src="/icon.png"
                alt="Giftisan Logo"
                fill
                priority
                className="object-cover"
                sizes="44px"
              />
            </div>
            <span className="text-xl md:text-2xl 2xl:text-[1.7rem] font-heading font-black text-primary tracking-tighter">
              Giftisan
            </span>
          </Link>

          {/* Search Bar - Desktop */}
          <div ref={searchRef} className="hidden md:flex flex-1 w-full max-w-2xl 2xl:max-w-3xl 3xl:max-w-4xl relative">
            <form onSubmit={handleSearch} className="w-full relative group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
                placeholder={d.common.search_placeholder}
                className="w-full py-3 ps-12 pe-10 bg-white border border-primary/20 rounded-full focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent text-primary font-medium placeholder:text-primary/50 transition-all shadow-inner"
              />
              <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-charcoal/40 w-5 h-5 group-focus-within:text-accent transition-colors" />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute end-4 top-1/2 -translate-y-1/2 text-charcoal/30 hover:text-charcoal transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {renderSearchOverlay(false)}
            </form>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 md:gap-1.5 xl:gap-2">
            {/* Favorites Icon (Visible on Mobile & Desktop) */}
            {/* Favorites Icon (Visible on Mobile & Desktop) */}
            <Link 
              href="/favorites" 
              title={d.common.favorites || "Favorites"} 
              className={cn(
                "flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full transition-all relative active:scale-95",
                pathname.includes("/favorites")
                  ? "text-primary bg-primary/10 ring-1 ring-primary/20"
                  : "text-charcoal/70 hover:text-primary hover:bg-primary/5"
              )}
            >
              <Heart className="w-4 h-4 md:w-5 md:h-5" />
              {allFavoritesCount > 0 && (
                <span className="absolute top-0.5 end-0.5 md:top-1 md:end-1 w-3.5 h-3.5 md:w-4 md:h-4 bg-accent text-white text-[8px] md:text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  {allFavoritesCount}
                </span>
              )}
            </Link>

            {/* Shop Studio Hub (Artisans Only - Standard Clean Styling) */}
            {session?.user?.role === "ARTISAN" && (
              <Link
                href="/studio"
                title={d.common.pro_studio || "Shop"}
                className={cn(
                  "flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full transition-all relative active:scale-95",
                  pathname.startsWith("/studio")
                    ? "text-primary bg-primary/10 ring-1 ring-primary/20"
                    : "text-charcoal/70 hover:text-primary hover:bg-primary/5"
                )}
              >
                <Store className="w-4 h-4 md:w-5 md:h-5" />
                {pathname.startsWith("/studio") && (
                  <span className="absolute top-1.5 end-1.5 w-1.5 h-1.5 rounded-full bg-accent ring-2 ring-white" />
                )}
              </Link>
            )}

            {/* Admin Portal Hub (Admins Only - Standard Clean Styling) */}
            {session?.user?.role === "ADMIN" && (
              <Link
                href="/admin"
                title={pathname.startsWith('/ar') ? "لوحة الإدارة" : "Admin Portal"}
                className={cn(
                  "flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full transition-all relative active:scale-95",
                  pathname.startsWith("/admin")
                    ? "text-primary bg-primary/10 ring-1 ring-primary/20"
                    : "text-charcoal/70 hover:text-primary hover:bg-primary/5"
                )}
              >
                <ShieldCheck className="w-4 h-4 md:w-5 md:h-5" />
                {pathname.startsWith("/admin") && (
                  <span className="absolute top-1.5 end-1.5 w-1.5 h-1.5 rounded-full bg-accent ring-2 ring-white" />
                )}
              </Link>
            )}

            {/* Messages Hub (Desktop) */}
            {session && (
              <Link
                href="/profile/messages"
                title={d.common.messages || "Messages"}
                className={cn(
                  "hidden md:flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full transition-all relative active:scale-95",
                  pathname.includes("/profile/messages")
                    ? "text-primary bg-primary/10 ring-1 ring-primary/20"
                    : "text-charcoal/70 hover:text-primary hover:bg-primary/5"
                )}
              >
                <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 end-0.5 md:top-1 md:end-1 w-3.5 h-3.5 md:w-4 md:h-4 bg-accent text-white text-[8px] md:text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}

            {/* Cart Icon (Visible on Mobile & Desktop) */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              title={d.common.cart || "Cart"}
              className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full text-charcoal/70 hover:text-primary hover:bg-primary/5 transition-all relative active:scale-95"
            >
              <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
              {totalItems > 0 && (
                <span className="absolute top-0.5 end-0.5 md:top-1 md:end-1 w-3.5 h-3.5 md:w-4 md:h-4 bg-accent text-white text-[8px] md:text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  {totalItems}
                </span>
              )}
            </button>

            {/* User Profile Hub (Avatar Dropdown or Sign In) */}
            {session ? (
              <>
                {/* Desktop Profile Dropdown */}
                <div ref={profileMenuRef} className="relative hidden md:block">
                  <button
                    type="button"
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className={cn(
                      "flex items-center gap-1 p-1 rounded-full transition-all focus:outline-none",
                      isProfileMenuOpen
                        ? "ring-2 ring-accent bg-accent/5"
                        : "hover:ring-2 hover:ring-primary/10 hover:bg-primary/5"
                    )}
                    title={d.common.account || "Account"}
                    aria-expanded={isProfileMenuOpen}
                  >
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-primary/10 bg-cream flex items-center justify-center shadow-xs">
                      {session.user?.image ? (
                        <Image
                          src={session.user.image}
                          alt={session.user.name || "User"}
                          fill
                          className="object-cover"
                          sizes="32px"
                        />
                      ) : (
                        <User className="w-4 h-4 text-primary/60" />
                      )}
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-3.5 h-3.5 text-charcoal/40 transition-transform duration-200 pe-0.5",
                        isProfileMenuOpen && "rotate-180 text-accent"
                      )}
                    />
                  </button>

                  {/* Etsy-Style Profile Dropdown Menu */}
                  {isProfileMenuOpen && (
                    <div className="absolute end-0 top-full mt-2 w-64 bg-white rounded-3xl shadow-2xl border border-primary/10 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* User Header */}
                      <div className="px-4 py-3 border-b border-primary/5">
                        <p className="text-xs font-bold text-primary truncate">
                          {session.user?.name || d.common.account}
                        </p>
                        <p className="text-[11px] text-charcoal/40 truncate">
                          {session.user?.email}
                        </p>
                        {session.user?.role === "ARTISAN" ? (
                          <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-accent/10 text-accent">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                            {d.common.pro_studio || "Master Artisan"}
                          </span>
                        ) : session.user?.role === "ADMIN" ? (
                          <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary">
                            <ShieldCheck className="w-3 h-3 text-primary" />
                            Admin
                          </span>
                        ) : null}
                      </div>

                      {/* Menu Links */}
                      <div className="py-1.5 px-2 text-xs font-bold text-primary/80 space-y-0.5">
                        <Link
                          href="/profile"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-cream/60 transition-colors"
                        >
                          <User className="w-4 h-4 text-primary/40" />
                          <span>{d.common.manage_profile || "View Profile"}</span>
                        </Link>

                        <Link
                          href="/profile"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-cream/60 transition-colors"
                        >
                          <Package className="w-4 h-4 text-primary/40" />
                          <span>{d.common.purchases_orders || "Purchases & Orders"}</span>
                        </Link>

                        <Link
                          href="/track"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-cream/60 transition-colors"
                        >
                          <Truck className="w-4 h-4 text-accent" />
                          <span>{d?.track?.btn_track || (pathname.startsWith('/ar') ? "تتبع مسار طلبك" : "Track Order")}</span>
                        </Link>

                        <Link
                          href="/profile/messages"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-cream/60 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4 text-primary/40" />
                          <div className="flex-1 flex justify-between items-center">
                            <span>{d.common.messages || "Messages"}</span>
                            {unreadCount > 0 && (
                              <span className="text-[10px] font-black bg-accent text-white px-2 py-0.5 rounded-full">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                        </Link>

                        <Link
                          href="/favorites"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-cream/60 transition-colors"
                        >
                          <Heart className="w-4 h-4 text-primary/40" />
                          <div className="flex-1 flex justify-between items-center">
                            <span>{d.common.favorites || "Favorites"}</span>
                            {allFavoritesCount > 0 && (
                              <span className="text-[10px] font-black bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                                {allFavoritesCount}
                              </span>
                            )}
                          </div>
                        </Link>

                        {session.user?.role === "ARTISAN" && (
                          <Link
                            href="/studio"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-cream/60 transition-colors text-accent font-black"
                          >
                            <Store className="w-4 h-4 text-accent" />
                            <span>{d.common.pro_studio || (pathname.startsWith('/ar') ? "لوحة تحكم المتجر" : "Shop Manager")}</span>
                          </Link>
                        )}

                        {session.user?.role === "ADMIN" && (
                          <Link
                            href="/admin"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-cream/60 transition-colors text-primary font-bold"
                          >
                            <ShieldCheck className="w-4 h-4 text-primary" />
                            <span>{pathname.startsWith('/ar') ? "لوحة الإدارة والتحكم" : "Admin Portal"}</span>
                          </Link>
                        )}

                        {session.user?.role !== "ARTISAN" && session.user?.role !== "ADMIN" && (
                          <Link
                            href="/become-artisan"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-cream/60 transition-colors text-accent font-black"
                          >
                            <Store className="w-4 h-4 text-accent" />
                            <span>{d.common.sell || (pathname.startsWith('/ar') ? "انضم كحرفي" : "Sell on Giftisan")}</span>
                          </Link>
                        )}

                        <Link
                          href="/contact"
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-cream/60 transition-colors"
                        >
                          <HelpCircle className="w-4 h-4 text-primary/40" />
                          <span>{d.common.support || "Support"}</span>
                        </Link>
                      </div>

                      {/* Sign Out */}
                      <div className="pt-1.5 px-2 border-t border-primary/5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            performSignOut(pathname.startsWith("/ar") ? "ar" : "en");
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>{d.common.sign_out || "Sign Out"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Quick Avatar Button */}
                <Link
                  href="/profile"
                  className="md:hidden flex items-center justify-center w-8 h-8 rounded-full overflow-hidden border border-primary/10 bg-cream shadow-xs active:scale-95"
                  title={d.common.profile || "Profile"}
                >
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <User className="w-3.5 h-3.5 text-primary/60" />
                  )}
                </Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="hidden md:flex items-center gap-2 h-9 px-4 rounded-full text-xs font-bold text-primary hover:text-accent border border-primary/15 hover:border-primary/30 transition-all bg-white shadow-xs active:scale-95 cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-primary/60" />
                  <span>{d.common.sign_in || "Sign In"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="md:hidden flex items-center gap-1.5 h-8 px-2.5 rounded-full text-xs font-black text-primary hover:text-accent border border-primary/20 hover:border-primary/40 bg-white/95 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
                  title={d.common.sign_in || "Sign In"}
                  aria-label={d.common.sign_in || "Sign In"}
                >
                  <LogIn className="w-3.5 h-3.5 text-accent" />
                  <span className="text-[11px] font-black">{pathname.startsWith("/ar") ? "دخول" : "Sign In"}</span>
                </button>
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-full text-charcoal/70 hover:text-primary hover:bg-primary/5 transition-colors active:scale-95"
              title={d.common.menu || "Menu"}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Language Switcher (Desktop only in top row; on mobile it lives inside the menu drawer) */}
            <div className="hidden md:flex items-center ps-1 border-s border-primary/10">
              <Link 
                href={pathname.replace(/^\/(en|ar)/, pathname.startsWith('/en') ? '/ar' : '/en')}
                onClick={() => {
                  document.cookie = `NEXT_LOCALE=${pathname.startsWith('/en') ? 'ar' : 'en'}; path=/; max-age=31536000`;
                }}
                className="px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[11px] md:text-xs font-bold text-primary/60 hover:text-primary hover:bg-primary/5 transition-colors active:scale-90"
                title="Switch Language (Alt+L)"
              >
                {pathname.startsWith('/en') ? 'عربي' : 'EN'}
              </Link>
            </div>
          </div>
        </div>

        {/* Tier 2: Dedicated Mobile Search Bar (Etsy Style) */}
        <div ref={mobileSearchRef} className="block md:hidden px-3.5 pb-2.5 relative">
          <form onSubmit={handleSearch} className="w-full relative group">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              placeholder={d.common.search_placeholder}
              className="w-full py-2 ps-9 pe-8 bg-white border border-primary/15 rounded-full focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-primary text-xs font-medium placeholder:text-primary/40 transition-all shadow-xs"
            />
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-charcoal/40 w-3.5 h-3.5 group-focus-within:text-accent transition-colors" />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-charcoal/30 hover:text-charcoal p-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {renderSearchOverlay(true)}
          </form>
        </div>


        {/* Tier 4: Desktop Categories Bar */}
        <div className="hidden md:block border-t border-primary/5 py-3 2xl:py-3.5">
          <div className="max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 lg:px-12 2xl:px-12 3xl:px-16 flex items-center justify-between gap-6 2xl:gap-8">
            <div className="flex items-center gap-5 lg:gap-7 2xl:gap-9 3xl:gap-10 overflow-x-auto no-scrollbar whitespace-nowrap flex-1 py-1">
              {navCategories.map((cat) => {
                const isActive = pathname.includes(`/category/${cat.id}`);
                return (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.id}`}
                    className={cn(
                      "text-[11px] lg:text-xs 2xl:text-sm font-bold transition-all uppercase tracking-wide whitespace-nowrap",
                      isActive
                        ? "text-accent font-black underline decoration-accent decoration-2 underline-offset-8"
                        : "text-charcoal/60 hover:text-primary hover:underline decoration-accent decoration-2 underline-offset-8"
                    )}
                  >
                    {cat.label}
                  </Link>
                );
              })}
            </div>
            <Link
              href="/categories"
              className="inline-flex items-center gap-1.5 text-[11px] lg:text-xs 2xl:text-sm font-black text-accent hover:text-primary transition-all uppercase tracking-widest border-s border-primary/10 ps-5 2xl:ps-6 whitespace-nowrap shrink-0 group"
            >
              <span>{d.common.all_categories || "View All"}</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 rtl:rotate-180 transition-transform" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={cn(
        "fixed inset-0 z-[60] md:hidden",
        isMenuOpen ? "pointer-events-auto" : "pointer-events-none"
      )}>
        {/* Clickable Backdrop */}
        <div 
          className={cn(
            "absolute inset-0 bg-charcoal/60 backdrop-blur-md transition-opacity duration-500",
            isMenuOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setIsMenuOpen(false)}
        />
        <div className={cn(
          "absolute end-0 top-0 h-[100dvh] w-[80%] max-w-sm bg-cream shadow-2xl transition-transform duration-500 flex flex-col pt-safe",
          isMenuOpen ? "translate-x-0" : (pathname.startsWith('/ar') ? "-translate-x-full" : "translate-x-full")
        )}>
          <div className="p-6 border-b border-primary/10 flex justify-between items-center">
            <span className="font-heading font-black text-primary text-xl">{d.common.menu}</span>
            <div className="flex items-center gap-3">
              <Link 
                href={pathname.replace(/^\/(en|ar)/, pathname.startsWith('/en') ? '/ar' : '/en')}
                onClick={() => {
                  document.cookie = `NEXT_LOCALE=${pathname.startsWith('/en') ? 'ar' : 'en'}; path=/; max-age=31536000`;
                  setIsMenuOpen(false);
                }}
                className="px-3 py-1.5 rounded-full bg-primary/5 text-[11px] font-black uppercase tracking-wider text-primary/60 hover:text-accent transition-all border border-primary/5 active:scale-95 shadow-sm"
                title="Switch Language (Alt+L)"
              >
                {pathname.startsWith('/en') ? 'عربي' : 'English'}
              </Link>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-primary/5 rounded-full transition-colors">
                <X className="w-6 h-6 text-primary" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Mobile Search */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-accent uppercase tracking-widest">{d.common.find_treasure}</p>
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={d.common.search_placeholder}
                  className="w-full py-3 ps-12 pe-4 bg-white border border-primary/20 rounded-2xl text-primary font-medium"
                />
                <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-charcoal/40 w-5 h-5" />
              </form>
            </div>

            {/* User Specific Links */}
            {session ? (
              <div className="space-y-6">
                {/* 1. Artisan Shop Studio Banner (for approved artisans) */}
                {session.user?.role === "ARTISAN" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-accent uppercase tracking-widest">
                        {pathname.startsWith('/ar') ? "ورشة عمل الحرفي" : "Your Workshop"}
                      </p>
                      <span className="text-[9px] font-black uppercase text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                        {pathname.startsWith('/ar') ? "متجر معتمد" : "Approved Shop"}
                      </span>
                    </div>

                    <Link
                      href="/studio"
                      onClick={() => setIsMenuOpen(false)}
                      className="p-3.5 bg-white hover:bg-cream/50 rounded-2xl border border-primary/10 shadow-xs flex items-center justify-between transition-all group active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm group-hover:bg-accent transition-colors">
                          <Store className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-heading font-black text-xs text-primary leading-tight">
                            {d.common.studio || (pathname.startsWith('/ar') ? "لوحة تحكم المتجر" : "Shop")}
                          </h4>
                          <p className="text-[10px] text-charcoal/50 mt-0.5">
                            {pathname.startsWith('/ar') ? "إدارة القطع والطلبات والمحادثات" : "Manage crafts, orders & messages"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-charcoal/40 group-hover:text-accent group-hover:translate-x-0.5 rtl:rotate-180 transition-all shrink-0" />
                    </Link>
                  </div>
                )}

                {/* 2. Admin Control Suite (for platform admins) */}
                {session.user?.role === "ADMIN" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-accent uppercase tracking-widest">
                        {pathname.startsWith('/ar') ? "إدارة المنصة" : "Platform Management"}
                      </p>
                      <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        {pathname.startsWith('/ar') ? "مدير المنصة" : "Platform Admin"}
                      </span>
                    </div>

                    {/* Main Admin Portal Entry Card */}
                    <Link
                      href="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className="p-3.5 bg-white hover:bg-cream/50 rounded-2xl border border-primary/10 shadow-xs flex items-center justify-between transition-all group active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm group-hover:bg-accent transition-colors">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-heading font-black text-xs text-primary leading-tight">
                            {pathname.startsWith('/ar') ? "لوحة الإدارة والتحكم" : "Admin Control Suite"}
                          </h4>
                          <p className="text-[10px] text-charcoal/50 mt-0.5">
                            {pathname.startsWith('/ar') ? "الطلبات، الحرفيين، المنتجات والمالية" : "Orders, artisans, products & finance"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-charcoal/40 group-hover:text-accent group-hover:translate-x-0.5 rtl:rotate-180 transition-all shrink-0" />
                    </Link>

                    {/* Admin Rapid Shortcuts (Orders, Products, Artisans) */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <Link
                        href="/admin/orders"
                        onClick={() => setIsMenuOpen(false)}
                        className="p-2.5 rounded-xl bg-white hover:bg-primary/5 border border-primary/10 text-center active:scale-95 transition-all group"
                      >
                        <span className="block text-[11px] font-black text-primary group-hover:text-accent">
                          {pathname.startsWith('/ar') ? "الطلبات" : "Orders"}
                        </span>
                        <span className="block text-[9px] text-charcoal/50 mt-0.5">
                          {pathname.startsWith('/ar') ? "المبيعات" : "Fulfillment"}
                        </span>
                      </Link>

                      <Link
                        href="/admin/products"
                        onClick={() => setIsMenuOpen(false)}
                        className="p-2.5 rounded-xl bg-white hover:bg-primary/5 border border-primary/10 text-center active:scale-95 transition-all group"
                      >
                        <span className="block text-[11px] font-black text-primary group-hover:text-accent">
                          {pathname.startsWith('/ar') ? "المنتجات" : "Products"}
                        </span>
                        <span className="block text-[9px] text-charcoal/50 mt-0.5">
                          {pathname.startsWith('/ar') ? "الاعتمادات" : "Catalog"}
                        </span>
                      </Link>

                      <Link
                        href="/admin/users"
                        onClick={() => setIsMenuOpen(false)}
                        className="p-2.5 rounded-xl bg-white hover:bg-primary/5 border border-primary/10 text-center active:scale-95 transition-all group"
                      >
                        <span className="block text-[11px] font-black text-primary group-hover:text-accent">
                          {pathname.startsWith('/ar') ? "الحرفيين" : "Artisans"}
                        </span>
                        <span className="block text-[9px] text-charcoal/50 mt-0.5">
                          {pathname.startsWith('/ar') ? "الأعضاء" : "Accounts"}
                        </span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* 3. Sell on Giftisan (for general buyers) */}
                {session.user?.role !== "ARTISAN" && session.user?.role !== "ADMIN" && (
                  <Link
                    href="/become-artisan"
                    onClick={() => setIsMenuOpen(false)}
                    className="p-3.5 bg-white hover:bg-cream/50 rounded-2xl border border-primary/10 shadow-xs flex items-center justify-between transition-all group active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                        <Store className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-heading font-black text-xs text-primary leading-tight">
                          {d.common.sell || (pathname.startsWith('/ar') ? "انضم كحرفي" : "Sell on Giftisan")}
                        </h4>
                        <p className="text-[10px] text-charcoal/50 mt-0.5">
                          {pathname.startsWith('/ar') ? "افتح متجرك واعرض قطعك" : "Open your handcrafted shop"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-charcoal/40 group-hover:text-accent rtl:rotate-180 transition-all shrink-0" />
                  </Link>
                )}

                {/* 4. Symmetrical 2x2 Activity Grid (4 tiles: Purchases, Favorites, Profile, Messages) */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest">
                    {pathname.startsWith('/ar') ? "حسابك ونشاطك" : "Your Account & Activity"}
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      href="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl border border-primary/5 text-center active:scale-95 transition-transform hover:border-primary/15 shadow-2xs"
                    >
                      <Package className="w-5 h-5 text-primary/50 mb-1.5" />
                      <span className="text-xs font-bold text-primary">
                        {d.common.purchases_orders || (pathname.startsWith('/ar') ? "الطلبات" : "Orders")}
                      </span>
                    </Link>

                    <Link
                      href="/favorites"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl border border-primary/5 text-center active:scale-95 transition-transform hover:border-primary/15 shadow-2xs"
                    >
                      <Heart className="w-5 h-5 text-primary/50 mb-1.5" />
                      <span className="text-xs font-bold text-primary">
                        {d.common.favorites || (pathname.startsWith('/ar') ? "المفضلة" : "Favorites")}
                      </span>
                    </Link>

                    <Link
                      href="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl border border-primary/5 text-center active:scale-95 transition-transform hover:border-primary/15 shadow-2xs"
                    >
                      <User className="w-5 h-5 text-primary/50 mb-1.5" />
                      <span className="text-xs font-bold text-primary">
                        {d.common.profile || (pathname.startsWith('/ar') ? "الملف الشخصي" : "Profile")}
                      </span>
                    </Link>

                    <Link
                      href="/profile/messages"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl border border-primary/5 text-center active:scale-95 transition-transform hover:border-primary/15 relative shadow-2xs"
                    >
                      <div className="relative">
                        <MessageSquare className="w-5 h-5 text-primary/50 mb-1.5" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -end-2 w-4 h-4 bg-accent text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-primary">
                        {d.common.messages || (pathname.startsWith('/ar') ? "الرسائل" : "Messages")}
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Guest Onboarding & Dual Auth Card */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold text-accent uppercase tracking-widest">
                      {pathname.startsWith('/ar') ? "مرحباً بك في جيفتيزان" : "Welcome to Giftisan"}
                    </p>
                    <span className="text-[9px] font-black uppercase text-accent bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20 inline-flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      {pathname.startsWith('/ar') ? "استكشف كزائر" : "Guest Explorer"}
                    </span>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-primary/10 shadow-xs space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-heading font-black text-xs text-primary leading-tight">
                          {pathname.startsWith('/ar') ? "انضم لمجتمع الحرفيين" : "Join the Giftisan Circle"}
                        </h4>
                        <p className="text-[10px] text-charcoal/60 mt-0.5 leading-normal">
                          {pathname.startsWith('/ar') 
                            ? "سجّل حسابك لحفظ المفضلة، محادثة الحرفيين، وتتبع طلباتك بكل سهولة." 
                            : "Sign in to save favorite crafts, message artisans, and track orders seamlessly."}
                        </p>
                      </div>
                    </div>

                    {/* Dual Action Buttons: Sign In / Create Account */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          openAuthModal("login");
                        }}
                        className="h-10 px-3 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary border border-primary/10 text-xs font-black transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                      >
                        {d.common.sign_in || (pathname.startsWith('/ar') ? "تسجيل الدخول" : "Sign In")}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          openAuthModal("signup");
                        }}
                        className="h-10 px-3 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-black transition-all active:scale-95 shadow-sm flex items-center justify-center cursor-pointer"
                      >
                        {d.common.signup || (pathname.startsWith('/ar') ? "إنشاء حساب" : "Register")}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Sell on Giftisan Banner */}
                <Link
                  href="/become-artisan"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-3.5 bg-white hover:bg-cream/50 rounded-2xl border border-primary/10 shadow-xs flex items-center justify-between transition-all group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-heading font-black text-xs text-primary leading-tight">
                        {d.common.sell || (pathname.startsWith('/ar') ? "انضم كحرفي وافتح متجرك" : "Sell on Giftisan")}
                      </h4>
                      <p className="text-[10px] text-charcoal/50 mt-0.5">
                        {pathname.startsWith('/ar') ? "افتح متجرك واعرض قطعك المميزة" : "Open your workshop & share your crafts"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-charcoal/40 group-hover:text-accent rtl:rotate-180 transition-all shrink-0" />
                </Link>

                {/* 3. Symmetrical 2x2 Discovery Grid for Guests */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-accent uppercase tracking-widest">
                    {pathname.startsWith('/ar') ? "استكشف الهدايا والحرف" : "Explore & Discover"}
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      href="/categories"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl border border-primary/5 text-center active:scale-95 transition-transform hover:border-primary/15 shadow-2xs"
                    >
                      <Sparkles className="w-5 h-5 text-primary/50 mb-1.5" />
                      <span className="text-xs font-bold text-primary">
                        {d.common.all_categories || (pathname.startsWith('/ar') ? "كل الأقسام" : "Categories")}
                      </span>
                    </Link>

                    <Link
                      href="/artisans"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl border border-primary/5 text-center active:scale-95 transition-transform hover:border-primary/15 shadow-2xs"
                    >
                      <Users className="w-5 h-5 text-primary/50 mb-1.5" />
                      <span className="text-xs font-bold text-primary">
                        {d.common.artisans || (pathname.startsWith('/ar') ? "الحرفيين" : "Artisans")}
                      </span>
                    </Link>

                    <Link
                      href="/favorites"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl border border-primary/5 text-center active:scale-95 transition-transform hover:border-primary/15 shadow-2xs relative"
                    >
                      <div className="relative">
                        <Heart className="w-5 h-5 text-primary/50 mb-1.5" />
                        {allFavoritesCount > 0 && (
                          <span className="absolute -top-1 -end-2 w-4 h-4 bg-accent text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                            {allFavoritesCount}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-primary">
                        {d.common.favorites || (pathname.startsWith('/ar') ? "المفضلة" : "Favorites")}
                      </span>
                    </Link>

                    <Link
                      href="/gifts"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl border border-primary/5 text-center active:scale-95 transition-transform hover:border-primary/15 shadow-2xs"
                    >
                      <Gift className="w-5 h-5 text-primary/50 mb-1.5" />
                      <span className="text-xs font-bold text-primary">
                        {pathname.startsWith('/ar') ? "أفكار الهدايا" : "Gift Ideas"}
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Track Order Banner for Mobile */}
            <Link
              href="/track"
              onClick={() => setIsMenuOpen(false)}
              className="p-3.5 bg-white hover:bg-cream/50 rounded-2xl border border-primary/10 shadow-xs flex items-center justify-between transition-all group active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-black text-xs text-primary leading-tight">
                    {d?.track?.btn_track || (pathname.startsWith('/ar') ? "تتبع مسار طلبك" : "Track Your Order")}
                  </h4>
                  <p className="text-[10px] text-charcoal/50 mt-0.5">
                    {pathname.startsWith('/ar') ? "متابعة الشحن والتوصيل لحظة بلحظة" : "Live courier & crafting status"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-charcoal/40 group-hover:text-accent rtl:rotate-180 transition-all shrink-0" />
            </Link>

            {/* Mobile Categories */}
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-accent uppercase tracking-widest">{d.common.categories}</p>
              <div className="grid grid-cols-1 gap-2">
                {navCategories.map((cat) => {
                  const isActive = pathname.includes(`/category/${cat.id}`);
                  return (
                    <Link
                      key={cat.id}
                      href={`/category/${cat.id}`}
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "flex justify-between items-center p-4 rounded-2xl border text-sm font-bold transition-all active:scale-[0.98] group",
                        isActive
                          ? "bg-accent/10 border-accent/30 text-accent font-black"
                          : "bg-white border-primary/5 text-primary hover:bg-primary/5"
                      )}
                    >
                      <span>{cat.label}</span>
                      <ChevronRight className="w-4 h-4 text-charcoal/40 group-hover:text-accent group-hover:translate-x-0.5 rtl:rotate-180 transition-all shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-primary/10 bg-primary/5 space-y-3">
            {!session ? (
              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-primary">
                  {pathname.startsWith('/ar') ? "منصة الحرف اليدوية المصرية الأصيلة" : "Authentic Egyptian Handmade Marketplace"}
                </p>
                <p className="text-[11px] text-charcoal/50">
                  {d.common.crafted_for_community || (pathname.startsWith('/ar') ? "صُنع بكل فخر بأيدي حرفيين مصريين" : "Crafted with pride by independent Egyptian artisans")}
                </p>
              </div>
            ) : (
              <button
                onClick={() => performSignOut(pathname.startsWith("/ar") ? "ar" : "en")}
                className="w-full h-11 border border-red-100 bg-red-50/50 text-red-500 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 transition-all active:scale-98"
              >
                <LogOut className="w-4 h-4" />
                {d.common.sign_out}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

