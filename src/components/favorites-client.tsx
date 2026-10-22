"use client";

import { useFavorites } from "@/context/favorites-context";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  Trash2,
  ShoppingBag,
  Package,
  Store,
  ArrowRight,
  LayoutGrid,
  List,
} from "lucide-react";
import { useCart } from "@/context/cart-context";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { ArtisanCard } from "@/components/artisans/artisan-card";
import { triggerHaptic, useIsNative } from "@/lib/native";
import { NativeFavoritesView } from "@/components/native/native-favorites-view";

interface FavoritesClientProps {
  dict: any;
  allArtisans?: any[];
  suggestedProducts?: any[];
  lang?: string;
}

export default function FavoritesClient({
  dict,
  allArtisans = [],
  suggestedProducts = [],
  lang = "en",
}: FavoritesClientProps) {
  const isNative = useIsNative();
  const { favorites, toggleFavorite, favoriteArtisans } = useFavorites();
  const { addToCart } = useCart();
  const [activeTab, setActiveTab] = useState<"products" | "studios">("products");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  if (isNative) {
    return (
      <NativeFavoritesView
        dict={dict}
        lang={lang}
        allArtisans={allArtisans}
        suggestedProducts={suggestedProducts}
      />
    );
  }

  const isArabic = dict?.common?.home === "الرئيسية";

  // Resolve fresh artisan data for favorited studios
  const displayFavoriteArtisans = useMemo(() => {
    if (!Array.isArray(favoriteArtisans) || favoriteArtisans.length === 0) return [];
    return favoriteArtisans
      .map((fav: any) => {
        const id = typeof fav === "string" ? fav : fav?.id;
        const fresh = allArtisans?.find((a: any) => a.id === id);
        return fresh || (typeof fav === "object" ? fav : null);
      })
      .filter((a: any) => a && a.id);
  }, [favoriteArtisans, allArtisans]);

  // Ensure only valid products with a name/id are rendered
  const validFavorites = useMemo(() => {
    if (!Array.isArray(favorites) || favorites.length === 0) return [];
    return favorites.filter((p: any) => p && typeof p === "object" && p.name && (p.id || p.slug));
  }, [favorites]);

  return (
    <main className="min-h-screen bg-cream">
      <Navbar dict={dict} />

      <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-3 sm:px-6 md:px-8 2xl:px-12 3xl:px-16 pt-20 sm:pt-24 md:pt-36 2xl:pt-40 pb-32 sm:pb-28 md:pb-24 2xl:pb-28">
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-6 sm:mb-8 md:mb-10 text-start">
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-heading font-bold text-primary mb-1.5 sm:mb-3">
              {dict.home?.favorites_title || (isArabic ? "قائمة المفضلة" : "Your Favorites")}
            </h1>
            <p className="text-charcoal/60 text-xs sm:text-sm md:text-base leading-relaxed max-w-2xl">
              {dict.home?.favorites_desc ||
                (isArabic
                  ? "تشكيلة مختارة من منتجاتك ومتاجرك المفضلة. احفظها لوقت لاحق أو أضفها إلى مجموعتك اليوم."
                  : "A curated collection of your favorite artisanal products and shops. Save them for later or add them to your collection.")}
            </p>
          </header>

          {/* Navigation Tabs (Products vs Studios) + View Mode Toggle */}
          <div className="flex items-center justify-between gap-3 mb-5 sm:mb-8 border-b border-primary/10 pb-3 sm:pb-4">
            <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setActiveTab("products");
                }}
                className={cn(
                  "relative px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-heading font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer active:scale-95 transition-colors duration-200",
                  activeTab === "products"
                    ? "text-white"
                    : "bg-white text-primary/70 hover:text-primary hover:bg-white/80 border border-primary/10"
                )}
              >
                {activeTab === "products" && (
                  <motion.div
                    layoutId="favoritesActiveTabBadge"
                    className="absolute inset-0 bg-primary rounded-full shadow-md shadow-primary/20"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                  <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{isArabic ? "المنتجات" : "Products"}</span>
                  <span
                    className={cn(
                      "px-1.5 sm:px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-mono transition-colors",
                      activeTab === "products"
                        ? "bg-white/20 text-white"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {validFavorites.length}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setActiveTab("studios");
                }}
                className={cn(
                  "relative px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-heading font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shrink-0 cursor-pointer active:scale-95 transition-colors duration-200",
                  activeTab === "studios"
                    ? "text-white"
                    : "bg-white text-primary/70 hover:text-primary hover:bg-white/80 border border-primary/10"
                )}
              >
                {activeTab === "studios" && (
                  <motion.div
                    layoutId="favoritesActiveTabBadge"
                    className="absolute inset-0 bg-primary rounded-full shadow-md shadow-primary/20"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5 sm:gap-2">
                  <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{isArabic ? "المتاجر والحرفيون" : "Shops & Makers"}</span>
                  <span
                    className={cn(
                      "px-1.5 sm:px-2 py-0.5 rounded-full text-[11px] sm:text-xs font-mono transition-colors",
                      activeTab === "studios"
                        ? "bg-white/20 text-white"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {displayFavoriteArtisans.length}
                  </span>
                </span>
              </button>
            </div>

            {/* List / Grid view toggle (only on products tab) */}
            {activeTab === "products" && validFavorites.length > 0 && (
              <div className="flex items-center gap-1 bg-white border border-primary/10 rounded-full p-1 shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setViewMode("list");
                  }}
                  aria-label="List view"
                  className={cn(
                    "relative p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer",
                    viewMode === "list" ? "text-white" : "text-primary/50 hover:text-primary"
                  )}
                >
                  {viewMode === "list" && (
                    <motion.div
                      layoutId="favoritesViewModePill"
                      className="absolute inset-0 bg-primary rounded-full shadow-2xs"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <List className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setViewMode("grid");
                  }}
                  aria-label="Grid view"
                  className={cn(
                    "relative p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer",
                    viewMode === "grid" ? "text-white" : "text-primary/50 hover:text-primary"
                  )}
                >
                  {viewMode === "grid" && (
                    <motion.div
                      layoutId="favoritesViewModePill"
                      className="absolute inset-0 bg-primary rounded-full shadow-2xs"
                      transition={{ type: "spring", stiffness: 450, damping: 35 }}
                    />
                  )}
                  <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10" />
                </button>
              </div>
            )}
          </div>

          {/* TAB CONTENT WITH SMOOTH CROSSFADE */}
          <AnimatePresence mode="wait">
            {activeTab === "products" ? (
              <motion.div
                key="tab-products"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {validFavorites.length === 0 ? (
                  <div className="py-14 sm:py-20 md:py-24 bg-white rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] border border-primary/5 text-center shadow-xl shadow-primary/5 px-4 sm:px-8 max-w-2xl mx-auto">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                      <Heart className="w-7 h-7 sm:w-10 sm:h-10 text-primary/20" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-heading font-bold text-primary">
                      {dict.home?.favorites_empty || (isArabic ? "قائمة المنتجات فارغة حالياً" : "Your list is currently empty")}
                    </h2>
                    <p className="text-charcoal/60 text-xs sm:text-sm md:text-base mt-2 mb-6 sm:mb-8 max-w-md mx-auto">
                      {dict.home?.favorites_empty_desc ||
                        (isArabic ? "ابدأ باستكشاف التشكيلة لإيجاد منتجات يدوية تحبها." : "Start exploring the collection to find products you love.")}
                    </p>
                    <Link
                      href="/"
                      className="h-11 sm:h-14 px-6 sm:px-10 bg-primary text-white text-xs sm:text-sm md:text-base font-bold rounded-full hover:bg-primary-light transition-all shadow-xl shadow-primary/20 flex items-center justify-center w-fit mx-auto group active:scale-95"
                    >
                      {dict.common?.start_shopping || (isArabic ? "اكتشف المنتجات" : "Explore Products")}
                      <ArrowRight className="ms-2 w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                    </Link>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    {viewMode === "grid" ? (
                      /* GRID VIEW (2 cols on mobile, 3-4 on tablet/desktop) */
                      <motion.div
                        key="grid-view"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.16 }}
                        className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
                      >
                        <AnimatePresence>
                          {validFavorites.map((product: any) => {
                            const isOutOfStock = (() => {
                              if (Array.isArray(product.variants) && product.variants.length > 0) {
                                const totalVariantStock = product.variants.reduce(
                                  (sum: number, v: any) => sum + (Number(v.stock) || 0),
                                  0
                                );
                                if (totalVariantStock <= 0 && (Number(product.stock) || 0) <= 0) {
                                  return true;
                                }
                                return false;
                              }
                              if (product.stock !== undefined && product.stock !== null) {
                                return Number(product.stock) <= 0;
                              }
                              return false;
                            })();

                            const hasOptions = Boolean(
                              (product.variants && product.variants.length > 0) ||
                                product.canPersonalize ||
                                product.requiresClientImage
                            );

                            return (
                              <motion.div
                                key={`grid-${product.id}`}
                                layout="position"
                                initial={{ opacity: 0, scale: 0.92 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.18, ease: "easeOut" } }}
                                transition={{ layout: { duration: 0.25, ease: "easeOut" } }}
                                className="group bg-white rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 border border-primary/10 shadow-xs hover:shadow-md hover:border-accent/30 flex flex-col justify-between"
                              >
                                <div>
                                  {/* Product Image */}
                                  <div className="relative aspect-square w-full rounded-xl sm:rounded-2xl overflow-hidden bg-cream/50 mb-2">
                                    <Link
                                      href={`/products/${product.slug || product.id}`}
                                      className="block w-full h-full"
                                    >
                                      {product.images?.[0] && (
                                        <Image
                                          src={product.images[0]}
                                          alt={product.name}
                                          fill
                                          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 250px"
                                          className={cn(
                                            "object-cover group-hover:scale-105 transition-transform duration-500",
                                            isOutOfStock && "grayscale"
                                          )}
                                        />
                                      )}
                                    </Link>

                                    {/* Floating Remove Button */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        triggerHaptic("light");
                                        toggleFavorite(product);
                                      }}
                                      title={isArabic ? "إزالة من المفضلة" : "Remove from favorites"}
                                      aria-label="Remove from favorites"
                                      className="absolute top-2 end-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/95 backdrop-blur-xs flex items-center justify-center text-primary/40 hover:text-red-500 hover:bg-white shadow-md active:scale-75 transition-all duration-150 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>

                                    {isOutOfStock && (
                                      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-2xs flex items-center justify-center">
                                        <span className="px-2 py-0.5 bg-red-600 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider rounded-full shadow-xs">
                                          {dict.product?.sold_out || "Sold Out"}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Details */}
                                  <div className="space-y-0.5 text-start px-0.5">
                                    <p className="text-[10px] sm:text-xs font-bold text-accent uppercase tracking-wider truncate">
                                      {(product.artisan as any)?.studioName || product.artisan?.name}
                                    </p>
                                    <h3 className="text-xs sm:text-sm md:text-base font-heading font-bold text-primary line-clamp-2 leading-snug">
                                      <Link
                                        href={`/products/${product.slug || product.id}`}
                                        className="hover:text-accent transition-colors duration-200"
                                      >
                                        {product.name}
                                      </Link>
                                    </h3>
                                    <p className="text-xs sm:text-sm md:text-base font-heading font-bold text-primary pt-0.5">
                                      {dict.product?.currency || "EGP"} {product.price}.00
                                    </p>
                                  </div>
                                </div>

                                {/* Quick Action Button */}
                                <div className="pt-2">
                                  {isOutOfStock ? (
                                    <button
                                      disabled
                                      className="w-full h-8 sm:h-9 bg-primary/20 text-primary/50 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl flex items-center justify-center cursor-not-allowed"
                                    >
                                      {dict.product?.sold_out || "Sold Out"}
                                    </button>
                                  ) : hasOptions ? (
                                    <Link
                                      href={`/products/${product.slug || product.id}`}
                                      className="w-full h-8 sm:h-9 bg-primary text-white text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl shadow-xs flex items-center justify-center gap-1 hover:bg-primary-light active:scale-95 transition-all duration-150"
                                    >
                                      <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                      <span>{dict.product?.add_to_cart || "Move to Cart"}</span>
                                    </Link>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        triggerHaptic("medium");
                                        addToCart(product);
                                      }}
                                      className="w-full h-8 sm:h-9 bg-primary text-white text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl shadow-xs flex items-center justify-center gap-1 hover:bg-primary-light active:scale-95 transition-all duration-150"
                                    >
                                      <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                      <span>{dict.product?.add_to_cart || "Move to Cart"}</span>
                                    </button>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </motion.div>
                    ) : (
                      /* LIST VIEW (Compact horizontal rows on mobile, spacious rows on desktop) */
                      <motion.div
                        key="list-view"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.16 }}
                        className="space-y-3 sm:space-y-4 md:space-y-6 max-w-4xl"
                      >
                        <AnimatePresence>
                          {validFavorites.map((product: any) => {
                            const isOutOfStock = (() => {
                              if (Array.isArray(product.variants) && product.variants.length > 0) {
                                const totalVariantStock = product.variants.reduce(
                                  (sum: number, v: any) => sum + (Number(v.stock) || 0),
                                  0
                                );
                                if (totalVariantStock <= 0 && (Number(product.stock) || 0) <= 0) {
                                  return true;
                                }
                                return false;
                              }
                              if (product.stock !== undefined && product.stock !== null) {
                                return Number(product.stock) <= 0;
                              }
                              return false;
                            })();

                            const hasOptions = Boolean(
                              (product.variants && product.variants.length > 0) ||
                                product.canPersonalize ||
                                product.requiresClientImage
                            );

                            return (
                              <motion.div
                                key={`list-${product.id}`}
                                layout="position"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2, ease: "easeOut" } }}
                                transition={{ layout: { duration: 0.25, ease: "easeOut" } }}
                                className="group bg-white rounded-2xl sm:rounded-3xl md:rounded-[2rem] p-3 sm:p-4 md:p-6 flex flex-row items-stretch sm:items-center gap-3 sm:gap-5 md:gap-8 border border-primary/10 shadow-xs sm:shadow-md hover:border-accent/30"
                              >
                                {/* Product Image Thumbnail */}
                                <Link
                                  href={`/products/${product.slug || product.id}`}
                                  className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-44 md:h-44 aspect-square rounded-xl sm:rounded-2xl overflow-hidden shrink-0 shadow-xs block group bg-cream/40"
                                >
                                  {product.images?.[0] && (
                                    <Image
                                      src={product.images[0]}
                                      alt={product.name}
                                      fill
                                      sizes="(max-width: 640px) 96px, (max-width: 768px) 128px, 176px"
                                      className={cn(
                                        "object-cover group-hover:scale-105 transition-transform duration-500",
                                        isOutOfStock && "grayscale"
                                      )}
                                    />
                                  )}
                                  {isOutOfStock && (
                                    <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-2xs flex items-center justify-center p-1 text-center">
                                      <span className="px-1.5 py-0.5 bg-red-600 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider rounded-full shadow-xs">
                                        {dict.product?.sold_out || "Sold Out"}
                                      </span>
                                    </div>
                                  )}
                                </Link>

                                {/* Product Details & Mobile Actions */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 text-start">
                                  <div>
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-[10px] sm:text-xs font-bold text-accent uppercase tracking-wider truncate">
                                        {(product.artisan as any)?.studioName || product.artisan?.name}
                                      </p>

                                      {/* Quick remove button visible on small screens (< md) */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          triggerHaptic("light");
                                          toggleFavorite(product);
                                        }}
                                        title={isArabic ? "إزالة من المفضلة" : "Remove from favorites"}
                                        aria-label="Remove from favorites"
                                        className="md:hidden p-1 -me-1 text-primary/40 hover:text-red-500 active:scale-75 transition-all duration-150 rounded-lg cursor-pointer"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>

                                    <h3 className="text-xs sm:text-base md:text-xl font-heading font-bold text-primary leading-snug mt-0.5 sm:mt-1">
                                      <Link
                                        href={`/products/${product.slug || product.id}`}
                                        className="hover:text-accent transition-colors duration-200 line-clamp-2"
                                      >
                                        {product.name}
                                      </Link>
                                    </h3>

                                    {product.description && (
                                      <p className="hidden md:block text-xs sm:text-sm text-charcoal/60 line-clamp-2 mt-1">
                                        {product.description}
                                      </p>
                                    )}

                                    <p className="text-xs sm:text-base md:text-xl font-heading font-bold text-primary mt-1">
                                      {dict.product?.currency || "EGP"} {product.price}.00
                                    </p>
                                  </div>

                                  {/* Mobile inline Move to Cart button (< md) */}
                                  <div className="flex items-center gap-2 mt-2 md:hidden">
                                    {isOutOfStock ? (
                                      <button
                                        disabled
                                        className="flex-1 h-8 sm:h-9 bg-primary/20 text-primary/50 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl flex items-center justify-center cursor-not-allowed"
                                      >
                                        {dict.product?.sold_out || "Sold Out"}
                                      </button>
                                    ) : hasOptions ? (
                                      <Link
                                        href={`/products/${product.slug || product.id}`}
                                        className="flex-1 h-8 sm:h-9 bg-primary text-white text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl shadow-xs flex items-center justify-center gap-1.5 hover:bg-primary-light active:scale-95 transition-all duration-150"
                                      >
                                        <ShoppingBag className="w-3.5 h-3.5" />
                                        <span>{dict.product?.add_to_cart || "Move to Cart"}</span>
                                      </Link>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          triggerHaptic("medium");
                                          addToCart(product);
                                        }}
                                        className="flex-1 h-8 sm:h-9 bg-primary text-white text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl shadow-xs flex items-center justify-center gap-1.5 hover:bg-primary-light active:scale-95 transition-all duration-150"
                                      >
                                        <ShoppingBag className="w-3.5 h-3.5" />
                                        <span>{dict.product?.add_to_cart || "Move to Cart"}</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Desktop Actions (md and up) */}
                                <div className="hidden md:flex items-center gap-3 shrink-0">
                                  {isOutOfStock ? (
                                    <button
                                      disabled
                                      className="w-44 h-12 bg-primary text-white font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 opacity-40 grayscale !cursor-not-allowed pointer-events-auto"
                                    >
                                      {dict.product?.sold_out || "Sold Out"}
                                    </button>
                                  ) : hasOptions ? (
                                    <Link
                                      href={`/products/${product.slug || product.id}`}
                                      className="w-44 h-12 bg-primary text-white font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 group hover:bg-primary-light shadow-primary/20 active:scale-95 transition-all duration-150"
                                    >
                                      <ShoppingBag className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                                      {dict.product?.add_to_cart || "Move to Cart"}
                                    </Link>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        triggerHaptic("medium");
                                        addToCart(product);
                                      }}
                                      className="w-44 h-12 bg-primary text-white font-bold rounded-2xl shadow-md flex items-center justify-center gap-2 group hover:bg-primary-light shadow-primary/20 active:scale-95 transition-all duration-150"
                                    >
                                      <ShoppingBag className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                                      {dict.product?.add_to_cart || "Move to Cart"}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      triggerHaptic("light");
                                      toggleFavorite(product);
                                    }}
                                    title={isArabic ? "إزالة من المفضلة" : "Remove from favorites"}
                                    className="w-12 h-12 shrink-0 border border-primary/10 rounded-2xl text-primary/40 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all duration-150 flex items-center justify-center cursor-pointer active:scale-90"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </motion.div>
            ) : (
              /* 2. STUDIOS TAB */
              <motion.div
                key="tab-studios"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {displayFavoriteArtisans.length === 0 ? (
                  <div className="py-14 sm:py-20 md:py-24 bg-white rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] border border-primary/5 text-center shadow-xl shadow-primary/5 px-4 sm:px-8 max-w-2xl mx-auto">
                    <div className="w-14 h-14 sm:w-20 sm:h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                      <Store className="w-7 h-7 sm:w-10 sm:h-10 text-primary/20" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-heading font-bold text-primary">
                      {isArabic ? "لم تقم بحفظ أي متجر بعد" : "No favorite shops yet"}
                    </h2>
                    <p className="text-charcoal/60 text-xs sm:text-sm md:text-base mt-2 mb-6 sm:mb-8 max-w-md mx-auto">
                      {isArabic
                        ? "استكشف سجل الحرفيين وتعرف على صناع الحرف المصريين المبدعين واحفظ متاجرك المفضلة."
                        : "Explore the Master Registry to discover and save Egyptian craft shops you love."}
                    </p>
                    <Link
                      href="/artisans"
                      className="h-11 sm:h-14 px-6 sm:px-10 bg-primary text-white text-xs sm:text-sm md:text-base font-bold rounded-full hover:bg-primary-light transition-all shadow-xl shadow-primary/20 flex items-center justify-center w-fit mx-auto group active:scale-95"
                    >
                      {isArabic ? "استكشف الحرفيين" : "Explore Artisans"}
                      <ArrowRight className="ms-2 w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 md:gap-6">
                    <AnimatePresence>
                      {displayFavoriteArtisans.map((artisan: any) => (
                        <motion.div
                          key={`artisan-${artisan.id}`}
                          layout="position"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                          transition={{ layout: { duration: 0.25, ease: "easeOut" } }}
                        >
                          <ArtisanCard artisan={artisan} dict={dict} />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Footer dict={dict} />
    </main>
  );
}


