"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  Heart,
  Store,
  Package,
  ShoppingCart,
  ArrowRight,
  LayoutGrid,
  List,
  Sparkles,
  CheckCircle2,
  MapPin,
  Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { triggerHaptic } from "@/lib/native";
import { useCart } from "@/context/cart-context";
import { useFavorites } from "@/context/favorites-context";
import toast from "react-hot-toast";

interface NativeFavoritesViewProps {
  dict: any;
  lang?: string;
  allArtisans?: any[];
  suggestedProducts?: any[];
}

export function NativeFavoritesView({
  dict,
  lang = "en",
  allArtisans = [],
  suggestedProducts = [],
}: NativeFavoritesViewProps) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const { favorites, toggleFavorite, favoriteArtisans, toggleFavoriteArtisan } = useFavorites();
  const { addToCart } = useCart();

  const [activeTab, setActiveTab] = useState<"products" | "studios">("products");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const isArabic = lang === "ar" || pathname.startsWith("/ar");
  const currency = dict?.product?.currency || (isArabic ? "ج.م" : "EGP");

  // Filter valid favorite products
  const validFavorites = Array.isArray(favorites)
    ? favorites.filter((p: any) => p && typeof p === "object" && p.name && (p.id || p.slug))
    : [];

  // Resolve favorited artisans
  const displayFavoriteArtisans = Array.isArray(favoriteArtisans)
    ? favoriteArtisans
        .map((fav: any) => {
          const id = typeof fav === "string" ? fav : fav?.id;
          const fresh = allArtisans?.find((a: any) => a.id === id);
          return fresh || (typeof fav === "object" ? fav : null);
        })
        .filter((a: any) => a && a.id)
    : [];

  // Toggle language handler
  const handleToggleLang = () => {
    triggerHaptic("light");
    const targetLang = isArabic ? "en" : "ar";
    const newPath = pathname.replace(/^\/(en|ar)/, `/${targetLang}`);
    router.push(newPath || `/${targetLang}`);
  };

  const handleAddToCart = (product: any, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHaptic("medium");

    const hasOptions = Boolean(
      (product.variants && product.variants.length > 0) ||
        product.canPersonalize ||
        product.requiresClientImage
    );

    if (hasOptions) {
      router.push(`/${lang}/products/${product.slug || product.id}`);
      return;
    }

    addToCart(product);
    toast.success(
      isArabic
        ? `تمت إضافة "${product.name}" إلى السلة`
        : `Added "${product.name}" to cart`,
      { id: "fav-cart-toast", duration: 1500 }
    );
  };

  return (
    <div className="min-h-screen bg-cream text-charcoal select-none pb-32">
      {/* 1. Etsy Native Sticky Header */}
      <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur-md px-3.5 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-2 border-b border-primary/5 shadow-2xs">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-baseline gap-2">
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-primary tracking-tight">
              {isArabic ? "المفضلة" : "Favorites"}
            </h1>
            <span className="text-xs font-bold text-charcoal/50">
              ({validFavorites.length + displayFavoriteArtisans.length})
            </span>
          </div>

          {/* Clean Language Switcher Pill */}
          <button
            type="button"
            onClick={handleToggleLang}
            aria-label="Switch language"
            className="h-9 px-3 rounded-full bg-white border border-primary/10 text-primary text-xs font-black shadow-2xs shrink-0 flex items-center justify-center active:scale-95 transition-transform"
          >
            {isArabic ? "EN" : "عربي"}
          </button>
        </div>

        {/* 2. Etsy Native Segmented Sub-Tabs + View Mode Toggle */}
        <div className="flex items-center justify-between gap-2">
          {/* Segmented Controls */}
          <div className="flex items-center bg-white/80 p-1 rounded-full border border-primary/10 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveTab("products");
              }}
              className={cn(
                "relative px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95",
                activeTab === "products"
                  ? "bg-primary text-white shadow-xs"
                  : "text-primary/60 hover:text-primary"
              )}
            >
              <Package className="w-3.5 h-3.5" />
              <span>{isArabic ? "المنتجات" : "Items"}</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                  activeTab === "products" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                )}
              >
                {validFavorites.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setActiveTab("studios");
              }}
              className={cn(
                "relative px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95",
                activeTab === "studios"
                  ? "bg-primary text-white shadow-xs"
                  : "text-primary/60 hover:text-primary"
              )}
            >
              <Store className="w-3.5 h-3.5" />
              <span>{isArabic ? "المتاجر" : "Shops"}</span>
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                  activeTab === "studios" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                )}
              >
                {displayFavoriteArtisans.length}
              </span>
            </button>
          </div>

          {/* Grid / List View Toggle (Only for Products tab with items) */}
          {activeTab === "products" && validFavorites.length > 0 && (
            <div className="flex items-center bg-white p-0.5 rounded-full border border-primary/10 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setViewMode("grid");
                }}
                aria-label="Grid view"
                className={cn(
                  "p-1.5 rounded-full transition-colors active:scale-90",
                  viewMode === "grid" ? "bg-primary text-white shadow-xs" : "text-primary/50"
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setViewMode("list");
                }}
                aria-label="List view"
                className={cn(
                  "p-1.5 rounded-full transition-colors active:scale-90",
                  viewMode === "list" ? "bg-primary text-white shadow-xs" : "text-primary/50"
                )}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 3. Main Content Container */}
      <main className="px-3.5 pt-3">
        {/* ================= PRODUCTS TAB ================= */}
        {activeTab === "products" && (
          <div>
            {validFavorites.length === 0 ? (
              /* Empty State */
              <div className="pt-8 text-center">
                <div className="w-16 h-16 rounded-full bg-white border border-primary/10 shadow-2xs flex items-center justify-center mx-auto mb-3 text-primary/30">
                  <Heart className="w-8 h-8 stroke-[1.6]" />
                </div>
                <h2 className="font-serif text-lg font-bold text-primary">
                  {isArabic ? "قائمة المنتجات فارغة" : "No saved items yet"}
                </h2>
                <p className="text-xs text-charcoal/50 max-w-[260px] mx-auto mt-1 mb-5">
                  {isArabic
                    ? "اضغط على رمز القلب في أي قطعة يدوية لحفظها والرجوع إليها بسهولة"
                    : "Tap the heart icon on any handcrafted piece to save it for later"}
                </p>

                <Link
                  href={`/${lang}/categories`}
                  onClick={() => triggerHaptic("light")}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white text-xs font-bold shadow-xs active:scale-95 transition-transform"
                >
                  <span>{isArabic ? "اكتشف المنتجات" : "Explore Products"}</span>
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </Link>

                {/* Recommended Finds Shelf (If available) */}
                {suggestedProducts.length > 0 && (
                  <div className="mt-10 text-start">
                    <div className="flex items-center gap-1.5 mb-3 text-primary font-bold text-xs uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
                      <span>{isArabic ? "قطع قد تعجبك" : "Handcrafted for you"}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {suggestedProducts.slice(0, 4).map((p: any) => (
                        <Link
                          key={p.id}
                          href={`/${lang}/products/${p.slug || p.id}`}
                          onClick={() => triggerHaptic("light")}
                          className="bg-white rounded-2xl p-2.5 border border-primary/8 shadow-2xs flex flex-col justify-between active:scale-[0.98] transition-transform"
                        >
                          <div>
                            <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-cream/40 mb-2">
                              <Image
                                src={p.images?.[0] || "/placeholder.jpg"}
                                alt={p.name}
                                fill
                                sizes="45vw"
                                className="object-cover"
                              />
                            </div>
                            <h3 className="font-serif text-xs font-bold text-primary line-clamp-2 leading-tight">
                              {p.name}
                            </h3>
                          </div>
                          <div className="mt-2 text-xs font-black text-primary">
                            {Number(p.price).toLocaleString()} {currency}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : viewMode === "grid" ? (
              /* GRID VIEW (2 Columns) */
              <div className="grid grid-cols-2 gap-3">
                {validFavorites.map((product: any) => {
                  const primaryImage =
                    product.images?.[0] || product.image || "/placeholder.jpg";
                  const studioName =
                    product.artisan?.studioName ||
                    product.artisan?.user?.name ||
                    (isArabic ? "حرفي مصري" : "Artisan");

                  return (
                    <div
                      key={`fav-grid-${product.id}`}
                      className="bg-white rounded-2xl p-2.5 border border-primary/10 shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        {/* Image + Heart Button */}
                        <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-cream/40 mb-2">
                          <Link
                            href={`/${lang}/products/${product.slug || product.id}`}
                            onClick={() => triggerHaptic("light")}
                            className="block w-full h-full"
                          >
                            <Image
                              src={primaryImage}
                              alt={product.name}
                              fill
                              sizes="45vw"
                              className="object-cover active:scale-105 transition-transform duration-300"
                            />
                          </Link>

                          {/* Un-favorite button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              triggerHaptic("medium");
                              toggleFavorite(product);
                            }}
                            className="absolute top-2 end-2 w-7 h-7 rounded-full bg-white/95 backdrop-blur-xs flex items-center justify-center shadow-xs active:scale-75 transition-transform"
                            aria-label="Remove from favorites"
                          >
                            <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                          </button>
                        </div>

                        {/* Title & Artisan */}
                        <Link
                          href={`/${lang}/products/${product.slug || product.id}`}
                          onClick={() => triggerHaptic("light")}
                          className="block"
                        >
                          <h3 className="font-serif text-xs font-bold text-primary line-clamp-2 leading-snug">
                            {product.name}
                          </h3>
                        </Link>
                        <p className="text-[10px] text-charcoal/50 font-medium truncate mt-0.5">
                          {studioName}
                        </p>
                      </div>

                      {/* Price & Add to Cart Action */}
                      <div className="mt-2.5 pt-2 border-t border-primary/5 flex items-center justify-between gap-1">
                        <span className="text-xs font-black text-primary truncate">
                          {Number(product.price).toLocaleString()} {currency}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleAddToCart(product, e)}
                          className="h-7 px-2.5 rounded-full bg-primary text-white text-[10px] font-bold shadow-2xs flex items-center gap-1 active:scale-95 transition-transform shrink-0"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          <span>{isArabic ? "أضف" : "Add"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* LIST VIEW */
              <div className="space-y-2.5">
                {validFavorites.map((product: any) => {
                  const primaryImage =
                    product.images?.[0] || product.image || "/placeholder.jpg";
                  const studioName =
                    product.artisan?.studioName ||
                    product.artisan?.user?.name ||
                    (isArabic ? "حرفي مصري" : "Artisan");

                  return (
                    <div
                      key={`fav-list-${product.id}`}
                      className="bg-white rounded-2xl p-2.5 border border-primary/10 shadow-2xs flex items-center gap-3"
                    >
                      {/* Thumbnail */}
                      <Link
                        href={`/${lang}/products/${product.slug || product.id}`}
                        onClick={() => triggerHaptic("light")}
                        className="relative w-20 h-20 rounded-xl overflow-hidden bg-cream/40 shrink-0"
                      >
                        <Image
                          src={primaryImage}
                          alt={product.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </Link>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/${lang}/products/${product.slug || product.id}`}
                          onClick={() => triggerHaptic("light")}
                          className="block"
                        >
                          <h3 className="font-serif text-xs font-bold text-primary truncate">
                            {product.name}
                          </h3>
                        </Link>
                        <p className="text-[10px] text-charcoal/50 font-medium truncate mt-0.5">
                          {studioName}
                        </p>
                        <div className="text-xs font-black text-primary mt-1">
                          {Number(product.price).toLocaleString()} {currency}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic("medium");
                            toggleFavorite(product);
                          }}
                          className="w-7 h-7 rounded-full bg-cream/60 flex items-center justify-center text-red-500 active:scale-75 transition-transform"
                          aria-label="Remove from favorites"
                        >
                          <Heart className="w-3.5 h-3.5 fill-red-500" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleAddToCart(product, e)}
                          className="h-7 px-2.5 rounded-full bg-primary text-white text-[10px] font-bold shadow-2xs flex items-center gap-1 active:scale-95 transition-transform"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          <span>{isArabic ? "أضف" : "Add"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= SHOPS & MAKERS TAB ================= */}
        {activeTab === "studios" && (
          <div>
            {displayFavoriteArtisans.length === 0 ? (
              /* Empty Studios State */
              <div className="pt-8 text-center">
                <div className="w-16 h-16 rounded-full bg-white border border-primary/10 shadow-2xs flex items-center justify-center mx-auto mb-3 text-primary/30">
                  <Store className="w-8 h-8 stroke-[1.6]" />
                </div>
                <h2 className="font-serif text-lg font-bold text-primary">
                  {isArabic ? "لم تتابع أي متاجر بعد" : "No favorite shops yet"}
                </h2>
                <p className="text-xs text-charcoal/50 max-w-[260px] mx-auto mt-1 mb-5">
                  {isArabic
                    ? "تابع ورش الحرفيين المفضلين لديك لتصلك أحدث إبداعاتهم"
                    : "Follow your favorite artisan workshops to see their latest releases"}
                </p>

                <Link
                  href={`/${lang}/artisans`}
                  onClick={() => triggerHaptic("light")}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white text-xs font-bold shadow-xs active:scale-95 transition-transform"
                >
                  <span>{isArabic ? "تصفح الحرفيين" : "Explore Artisans"}</span>
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </Link>
              </div>
            ) : (
              /* Shops List */
              <div className="space-y-3">
                {displayFavoriteArtisans.map((artisan: any) => {
                  const avatar =
                    artisan.avatar || artisan.user?.image || "/placeholder.jpg";
                  const studioName =
                    artisan.studioName || artisan.user?.name || (isArabic ? "ورشة يدوية" : "Handmade Studio");
                  const location = artisan.location || (isArabic ? "مصر" : "Egypt");
                  const slug = artisan.slug || artisan.id;

                  return (
                    <div
                      key={`fav-artisan-${artisan.id}`}
                      className="bg-white rounded-2xl p-3 border border-primary/10 shadow-2xs flex items-center justify-between gap-3"
                    >
                      <Link
                        href={`/${lang}/artisans/${slug}`}
                        onClick={() => triggerHaptic("light")}
                        className="flex items-center gap-3 min-w-0 flex-1"
                      >
                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-cream shrink-0 border border-primary/10 shadow-2xs">
                          <Image
                            src={avatar}
                            alt={studioName}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-serif text-sm font-bold text-primary truncate">
                              {studioName}
                            </h3>
                            {artisan.isVerified && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-charcoal/50 font-medium flex items-center gap-1 truncate mt-0.5">
                            <MapPin className="w-3 h-3 text-primary/40 shrink-0" />
                            <span>{location}</span>
                          </p>
                        </div>
                      </Link>

                      {/* Unfollow button */}
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("medium");
                          toggleFavoriteArtisan(artisan);
                        }}
                        className="h-8 px-3 rounded-full bg-cream/70 text-red-500 text-xs font-bold border border-red-200/50 flex items-center gap-1.5 active:scale-95 transition-transform shrink-0"
                      >
                        <Heart className="w-3.5 h-3.5 fill-red-500" />
                        <span>{isArabic ? "إلغاء" : "Following"}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
