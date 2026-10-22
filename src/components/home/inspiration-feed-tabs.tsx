"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Sparkles, Compass } from "lucide-react";
import { useFavorites } from "@/context/favorites-context";
import { triggerHaptic } from "@/lib/native";
import { cn } from "@/lib/utils";
import type { ShelfProduct } from "./product-shelf-row";

interface InspirationFeedTabsProps {
  forYouProducts: ShelfProduct[];
  newFindsProducts: ShelfProduct[];
  dict: any;
}

export function InspirationFeedTabs({
  forYouProducts = [],
  newFindsProducts = [],
  dict,
}: InspirationFeedTabsProps) {
  const [activeTab, setActiveTab] = useState<"forYou" | "newFinds">("forYou");
  const { toggleFavorite, isFavorite } = useFavorites();

  const isArabic =
    dict?.common?.home === "الرئيسية" || dict?.common?.search?.includes("ابحث");
  const currency = dict?.product?.currency || "EGP";

  const displayedProducts =
    activeTab === "forYou"
      ? forYouProducts.slice(0, 8)
      : newFindsProducts.length > 0
      ? newFindsProducts.slice(0, 8)
      : forYouProducts.slice(4, 12);

  const handleTabChange = (tab: "forYou" | "newFinds") => {
    triggerHaptic("light");
    setActiveTab(tab);
  };

  return (
    <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] mx-auto px-3.5 sm:px-6 md:px-8 py-5 sm:py-7">
      {/* Editorial Header (Etsy Style) */}
      <div className="space-y-2 mb-3 sm:mb-4">
        <h2 className="font-serif text-xl sm:text-2xl md:text-3xl text-primary font-normal tracking-tight">
          {isArabic ? "إلهام بين يديك" : "Inspiration at your fingertips"}
        </h2>

        {/* Etsy Feed Sub-Tabs */}
        <div className="flex items-center gap-6 border-b border-primary/10 relative">
          <button
            type="button"
            onClick={() => handleTabChange("forYou")}
            className={cn(
              "relative pb-2.5 text-sm sm:text-base font-bold transition-colors cursor-pointer select-none",
              activeTab === "forYou"
                ? "text-primary font-black"
                : "text-primary/50 hover:text-primary/80"
            )}
          >
            {isArabic ? "خصيصاً لك" : "For You"}
            {activeTab === "forYou" && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#D97706] rounded-full animate-in fade-in duration-200" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("newFinds")}
            className={cn(
              "relative pb-2.5 text-sm sm:text-base font-bold transition-colors cursor-pointer select-none",
              activeTab === "newFinds"
                ? "text-primary font-black"
                : "text-primary/50 hover:text-primary/80"
            )}
          >
            {isArabic ? "أحدث القطع" : "New Finds"}
            {activeTab === "newFinds" && (
              <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#D97706] rounded-full animate-in fade-in duration-200" />
            )}
          </button>
        </div>
      </div>

      {/* 2-Column Responsive Product Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
        {displayedProducts.map((product) => {
          const favorite = isFavorite(product.id);
          const primaryImage = product.images?.[0] || "/placeholder.jpg";
          const productHref = `/products/${product.slug || product.id}`;
          const artisanName =
            product.artisan?.studioName ||
            product.artisan?.user?.name ||
            (isArabic ? "حرفي مصري" : "Artisan");

          return (
            <div
              key={product.id}
              className="group flex flex-col bg-white rounded-2xl sm:rounded-3xl overflow-hidden border border-primary/10 hover:border-primary/20 shadow-xs hover:shadow-md transition-all duration-300"
            >
              {/* Product Image Container */}
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
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                </Link>

                {/* Floating Heart Favorite Button */}
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
                    "absolute top-2.5 end-2.5 w-8 h-8 rounded-full bg-white/95 backdrop-blur-xs flex items-center justify-center shadow-md active:scale-75 transition-all duration-200 cursor-pointer",
                    favorite ? "text-[#E05A47] bg-red-50/90" : "text-charcoal/50 hover:text-charcoal hover:bg-white"
                  )}
                >
                  <Heart
                    className={cn(
                      "w-4 h-4 transition-all duration-200",
                      favorite ? "fill-current scale-110 animate-heart-pop" : "stroke-[2] scale-100"
                    )}
                  />
                </button>

                {/* Optional Badge */}
                {product.badge && (
                  <span className="absolute bottom-2 start-2 px-2 py-0.5 rounded-full bg-cream/90 backdrop-blur-xs text-[10px] font-black text-primary uppercase tracking-wider border border-primary/10 shadow-xs">
                    {product.badge}
                  </span>
                )}
              </div>

              {/* Product Metadata */}
              <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between gap-1">
                <Link
                  href={productHref}
                  onClick={() => triggerHaptic("light")}
                  className="block"
                >
                  <h3 className="text-xs sm:text-sm font-bold text-primary group-hover:text-accent transition-colors line-clamp-1">
                    {product.name}
                  </h3>
                  <p className="text-[11px] text-charcoal/50 line-clamp-1 font-medium mt-0.5">
                    {artisanName}
                  </p>
                </Link>

                <div className="pt-1 mt-auto flex items-baseline justify-between">
                  <span className="text-xs sm:text-sm font-black text-primary">
                    {currency} {product.price.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
