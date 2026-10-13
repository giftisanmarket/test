"use client";

import { useFavorites } from "@/context/favorites-context";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Image from "next/image";
import Link from "next/link";
import { Heart, Trash2, ShoppingBag, Package, Store, ArrowRight } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { ArtisanCard } from "@/components/artisans/artisan-card";

interface FavoritesClientProps {
  dict: any;
  allArtisans?: any[];
}

export default function FavoritesClient({ dict, allArtisans = [] }: FavoritesClientProps) {
  const { favorites, toggleFavorite, favoriteArtisans } = useFavorites();
  const { addToCart } = useCart();
  const [activeTab, setActiveTab] = useState<"products" | "studios">("products");

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

  return (
    <main className="min-h-screen bg-cream">
      <Navbar dict={dict} />

      <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16 pt-28 md:pt-36 2xl:pt-40 pb-20 2xl:pb-28">
        <div className="max-w-6xl 2xl:max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-10 text-center md:text-start">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-primary mb-3">
              {dict.home?.favorites_title || (isArabic ? "قائمة المفضلة" : "Your Favorites")}
            </h1>
            <p className="text-charcoal/60 text-base md:text-lg leading-relaxed max-w-2xl">
              {dict.home?.favorites_desc ||
                (isArabic
                  ? "تشكيلة مختارة من منتجاتك ومتاجرك المفضلة. احفظها لوقت لاحق أو أضفها إلى مجموعتك اليوم."
                  : "A curated collection of your favorite artisanal products and shops. Save them for later or add them to your collection.")}
            </p>
          </header>

          {/* Navigation Tabs (Products vs Studios) */}
          <div className="flex items-center gap-3 mb-8 border-b border-primary/10 pb-4">
            <button
              type="button"
              onClick={() => setActiveTab("products")}
              className={cn(
                "px-5 py-2.5 rounded-full font-heading font-bold text-xs md:text-sm transition-all flex items-center gap-2",
                activeTab === "products"
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-white text-primary/70 hover:text-primary hover:bg-white/80 border border-primary/10"
              )}
            >
              <Package className="w-4 h-4" />
              <span>{isArabic ? "المنتجات" : "Products"}</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-mono",
                  activeTab === "products"
                    ? "bg-white/20 text-white"
                    : "bg-primary/10 text-primary"
                )}
              >
                {favorites.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("studios")}
              className={cn(
                "px-5 py-2.5 rounded-full font-heading font-bold text-xs md:text-sm transition-all flex items-center gap-2",
                activeTab === "studios"
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-white text-primary/70 hover:text-primary hover:bg-white/80 border border-primary/10"
              )}
            >
              <Store className="w-4 h-4" />
              <span>{isArabic ? "المتاجر والحرفيون" : "Shops & Makers"}</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-mono",
                  activeTab === "studios"
                    ? "bg-white/20 text-white"
                    : "bg-primary/10 text-primary"
                )}
              >
                {displayFavoriteArtisans.length}
              </span>
            </button>
          </div>

          {/* 1. PRODUCTS TAB */}
          {activeTab === "products" && (
            <div>
              {favorites.length === 0 ? (
                <div className="py-24 bg-white rounded-[2.5rem] border border-primary/5 text-center shadow-xl shadow-primary/5 px-8 max-w-3xl mx-auto">
                  <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Heart className="w-10 h-10 text-primary/20" />
                  </div>
                  <h2 className="text-2xl font-heading font-bold text-primary">
                    {dict.home?.favorites_empty || (isArabic ? "قائمة المنتجات فارغة حالياً" : "Your list is currently empty")}
                  </h2>
                  <p className="text-charcoal/60 mt-2 mb-8">
                    {dict.home?.favorites_empty_desc ||
                      (isArabic ? "ابدأ باستكشاف التشكيلة لإيجاد منتجات يدوية تحبها." : "Start exploring the collection to find products you love.")}
                  </p>
                  <Link
                    href="/"
                    className="h-14 px-10 bg-primary text-white font-bold rounded-full hover:bg-primary-light transition-all shadow-xl shadow-primary/20 flex items-center justify-center w-fit mx-auto group"
                  >
                    {dict.common?.start_shopping || (isArabic ? "اكتشف المنتجات" : "Explore Products")}
                    <ArrowRight className="ms-2 w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-6 max-w-4xl">
                  <AnimatePresence>
                    {favorites.map((product: any) => {
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
                          key={product.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="group bg-white rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center gap-8 border border-primary/5 shadow-xl shadow-primary/5 hover:border-accent/30 transition-all"
                        >
                          {/* Image */}
                          <Link
                            href={`/products/${product.slug || product.id}`}
                            className="relative w-full md:w-48 aspect-square rounded-[2rem] overflow-hidden shrink-0 shadow-lg block group"
                          >
                            {product.images?.[0] && (
                              <Image
                                src={product.images[0]}
                                alt={product.name}
                                fill
                                className={cn(
                                  "object-cover group-hover:scale-105 transition-transform duration-700",
                                  isOutOfStock && "grayscale"
                                )}
                              />
                            )}
                            {isOutOfStock && (
                              <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px] flex items-center justify-center">
                                <span className="px-3.5 py-1.5 bg-red-600 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg border border-white/20">
                                  {dict.product?.sold_out || "Sold Out"}
                                </span>
                              </div>
                            )}
                          </Link>

                          {/* Details */}
                          <div className="flex-1 text-center md:text-start space-y-2">
                            <p className="text-[10px] font-black text-accent uppercase tracking-widest">
                              {(product.artisan as any)?.studioName || product.artisan?.name}
                            </p>
                            <h3 className="text-2xl font-heading font-bold text-primary">
                              <Link
                                href={`/products/${product.slug || product.id}`}
                                className="hover:text-accent transition-colors"
                              >
                                {product.name}
                              </Link>
                            </h3>
                            {product.description && (
                              <p className="text-sm text-charcoal/60 line-clamp-2">
                                {product.description}
                              </p>
                            )}
                            <p className="text-2xl font-heading font-bold text-primary pt-2">
                              {dict.product?.currency || "EGP"} {product.price}.00
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                            {isOutOfStock ? (
                              <button
                                disabled
                                className="flex-1 md:w-48 h-14 bg-primary text-white font-bold rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 opacity-40 grayscale !cursor-not-allowed pointer-events-auto"
                              >
                                {dict.product?.sold_out || "Sold Out"}
                              </button>
                            ) : hasOptions ? (
                              <Link
                                href={`/products/${product.slug || product.id}`}
                                className="flex-1 md:w-48 h-14 bg-primary text-white font-bold rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 group hover:bg-primary-light shadow-primary/20"
                              >
                                <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                {dict.product?.add_to_cart || "Move to Cart"}
                              </Link>
                            ) : (
                              <button
                                onClick={() => addToCart(product)}
                                className="flex-1 md:w-48 h-14 bg-primary text-white font-bold rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2 group hover:bg-primary-light shadow-primary/20"
                              >
                                <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                {dict.product?.add_to_cart || "Move to Cart"}
                              </button>
                            )}
                            <button
                              onClick={() => toggleFavorite(product)}
                              title="Remove from favorites"
                              className="w-14 h-14 shrink-0 border border-primary/10 rounded-2xl text-primary/40 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center"
                            >
                              <Trash2 className="w-6 h-6" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* 2. STUDIOS TAB */}
          {activeTab === "studios" && (
            <div>
              {displayFavoriteArtisans.length === 0 ? (
                <div className="py-24 bg-white rounded-[2.5rem] border border-primary/5 text-center shadow-xl shadow-primary/5 px-8 max-w-3xl mx-auto">
                  <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Store className="w-10 h-10 text-primary/20" />
                  </div>
                  <h2 className="text-2xl font-heading font-bold text-primary">
                    {isArabic ? "لم تقم بحفظ أي متجر بعد" : "No favorite shops yet"}
                  </h2>
                  <p className="text-charcoal/60 mt-2 mb-8">
                    {isArabic
                      ? "استكشف سجل الحرفيين وتعرف على صناع الحرف المصريين المبدعين واحفظ متاجرك المفضلة."
                      : "Explore the Master Registry to discover and save Egyptian craft shops you love."}
                  </p>
                  <Link
                    href="/artisans"
                    className="h-14 px-10 bg-primary text-white font-bold rounded-full hover:bg-primary-light transition-all shadow-xl shadow-primary/20 flex items-center justify-center w-fit mx-auto group"
                  >
                    {isArabic ? "استكشف الحرفيين" : "Explore Artisans"}
                    <ArrowRight className="ms-2 w-4 h-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {displayFavoriteArtisans.map((artisan: any) => (
                      <motion.div
                        key={artisan.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ArtisanCard artisan={artisan} dict={dict} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer dict={dict} />
    </main>
  );
}


