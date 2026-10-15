"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { BespokeImage } from "@/components/bespoke-image";
import { useFavorites } from "@/context/favorites-context";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug?: string | null;
    price: number;
    images: string[];
    canPersonalize?: boolean;
    requiresClientImage?: boolean;
    category?: string;
    stock?: number;
    artisan: {
      studioName?: string | null;
      user?: {
        name?: string | null;
      };
    };
  };
  dict: any;
}

export function ProductCard({ product, dict }: ProductCardProps) {
  const { toggleFavorite, isFavorite } = useFavorites();
  const slugOrId = (product.slug || product.id).trim();
  const productUrl = `/products/${encodeURI(slugOrId)}`;

  return (
    <div className="group cursor-pointer block">
      <Link href={productUrl}>
        <div className="relative aspect-square rounded-xl md:rounded-2xl overflow-hidden mb-2.5 shadow-sm hover:shadow-md transition-shadow border border-primary/5 bg-cream/20">
          <BespokeImage
            type="product"
            id={product.id}
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />

          {/* Wishlist Button */}
          <div className="absolute top-2 end-2 z-10 flex flex-col gap-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(product);
              }}
              className={cn(
                "p-1.5 md:p-2 rounded-full transition-all scale-95 active:scale-75 shadow-md",
                isFavorite(product.id)
                  ? "bg-red-50 text-red-500 opacity-100"
                  : "bg-white/90 backdrop-blur text-primary opacity-80 md:opacity-0 md:group-hover:opacity-100 hover:bg-white"
              )}
              aria-label="Save to favorites"
            >
              <Heart className={cn("w-3.5 h-3.5 md:w-4 md:h-4", isFavorite(product.id) && "fill-current")} />
            </button>
          </div>

          {/* Out of Stock / Archived Badge */}
          {product.stock !== undefined && product.stock <= 0 && (
            <div className="absolute bottom-2 start-2 z-10">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-charcoal/80 text-white backdrop-blur-sm shadow-xs">
                {dict?.artisan_detail?.archive || dict?.product?.sold_out || "Archived"}
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="space-y-0.5">
        <h3 className="text-xs md:text-sm font-heading font-medium text-charcoal group-hover:text-primary transition-colors line-clamp-1">
          <Link href={productUrl}>{product.name}</Link>
        </h3>
        <p className="font-heading font-bold text-primary text-xs md:text-sm pt-0.5">
          {dict?.product?.currency || "EGP"} {product.price}.00
        </p>
      </div>
    </div>
  );
}
