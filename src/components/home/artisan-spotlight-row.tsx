"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, MapPin, ArrowRight, Sparkles, Store } from "lucide-react";
import { BespokeImage } from "@/components/bespoke-image";

interface ArtisanSpotlightRowProps {
  artisans: any[];
  dict: any;
}

export function ArtisanSpotlightRow({ artisans, dict }: ArtisanSpotlightRowProps) {
  const router = useRouter();
  const isArabic = dict?.common?.home === "الرئيسية" || dict?.common?.search?.includes("ابحث");

  if (!artisans || artisans.length === 0) return null;

  return (
    <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 2xl:px-12 3xl:px-16 py-6 sm:py-8 md:py-12 2xl:py-16 border-t border-primary/5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 sm:mb-6 md:mb-8 gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs 2xl:text-sm font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 text-accent" />
            <span>{isArabic ? "صُناع حقيقيون" : "Real Egyptian Makers"}</span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl 2xl:text-[2.6rem] 3xl:text-5xl font-serif font-bold text-primary tracking-tight">
            {isArabic ? "تعرف على صنّاع الهدايا" : "Meet the Makers Behind the Gifts"}
          </h2>
          <p className="text-xs sm:text-sm 2xl:text-base text-charcoal/65 mt-1 max-w-xl 2xl:max-w-2xl">
            {isArabic
              ? "كل هدية على جيفتيزان تصنعها ورشة أو يد فنانة مصرية. اشترِ مباشرة من الصانع وادعم الحرف المستقلة."
              : "Every gift on Giftisan is crafted in small batches by passionate creators across Egypt. Shop directly from their shops."}
          </p>
        </div>

        <Link
          href="/artisans"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm 2xl:text-base font-bold text-primary hover:text-accent transition-colors shrink-0 group"
        >
          <span>{isArabic ? "تصفح كافة متاجر الحرفيين" : "Explore All Artisan Shops"}</span>
          <ArrowRight className="w-4 h-4 2xl:w-4.5 2xl:h-4.5 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Artisans Track */}
      <div 
        className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 2xl:gap-8 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-4 pt-1 px-0.5"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {artisans.map((artisan) => {
          const shopName = artisan.studioName || artisan.user?.name || (isArabic ? "متجر حرفي" : "Artisan Shop");
          const location = artisan.location || (isArabic ? "القاهرة، مصر" : "Cairo, Egypt");
          const shopUrl = `/artisans/${artisan.slug || artisan.id}`;
          const products = artisan.products || [];
          const isVerified = Boolean(artisan.isVerified);

          const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
            const target = e.target as HTMLElement;
            // If the click is inside a product thumbnail link, let that link navigate to the product
            if (target.closest("a, button")) {
              return;
            }

            if (e.metaKey || e.ctrlKey) {
              window.open(shopUrl, "_blank");
              return;
            }

            router.push(shopUrl);
          };

          return (
            <div
              key={artisan.id}
              onClick={handleCardClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  if ((e.target as HTMLElement).tagName !== "A") {
                    e.preventDefault();
                    router.push(shopUrl);
                  }
                }
              }}
              className="w-[270px] sm:w-[300px] md:w-auto shrink-0 snap-start group rounded-2xl 2xl:rounded-3xl bg-white border border-primary/10 shadow-2xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div>
                {/* Shop Banner / Mini Header */}
                <div className="relative h-20 2xl:h-24 3xl:h-26 bg-gradient-to-r from-[#064E3B] to-[#0A634C] p-3 2xl:p-4 flex items-start justify-end group-hover:brightness-105 transition-all">
                  {artisan.bannerImage && (
                    <Image
                      src={artisan.bannerImage}
                      alt={shopName}
                      fill
                      className="object-cover opacity-35"
                    />
                  )}
                  {/* Verified Badge */}
                  {isVerified && (
                    <span className="relative z-10 inline-flex items-center gap-1 px-2 2xl:px-2.5 py-0.5 rounded-full text-[10px] 2xl:text-xs font-bold bg-white/90 text-primary shadow-2xs">
                      <BadgeCheck className="w-3 h-3 2xl:w-3.5 2xl:h-3.5 text-[#D97706]" />
                      <span>{isArabic ? "موثوق" : "Verified"}</span>
                    </span>
                  )}
                </div>

                {/* Avatar & Bio info */}
                <div className="px-4 2xl:px-5 pb-3 -mt-7 2xl:-mt-8 relative z-10">
                  <div className="w-14 h-14 2xl:w-16 2xl:h-16 rounded-full border-2 border-white shadow-sm overflow-hidden bg-cream relative mb-2 group-hover:scale-105 transition-transform duration-300">
                    {artisan.avatar ? (
                      <Image
                        src={artisan.avatar}
                        alt={shopName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary text-cream font-bold text-lg 2xl:text-xl">
                        {shopName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <h3 className="font-heading font-bold text-sm sm:text-base 2xl:text-lg text-primary group-hover:text-accent transition-colors truncate">
                    <Link href={shopUrl} className="hover:underline">{shopName}</Link>
                  </h3>

                  <div className="flex items-center gap-1 text-[11px] 2xl:text-xs text-charcoal/60 mt-0.5">
                    <MapPin className="w-3 h-3 2xl:w-3.5 2xl:h-3.5 text-accent shrink-0" />
                    <span className="truncate">{location}</span>
                  </div>
                </div>

                {/* Product Thumbnails from this maker */}
                {products.length > 0 && (
                  <div className="px-4 2xl:px-5 pt-1 pb-3 2xl:pb-4">
                    <p className="text-[10px] 2xl:text-[11px] font-semibold text-charcoal/50 uppercase tracking-wider mb-2">
                      {isArabic ? "أحدث إبداعات الورشة" : "From this maker"}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 2xl:gap-2">
                      {products.slice(0, 3).map((p: any) => (
                        <Link
                          key={p.id}
                          href={`/products/${encodeURI((p.slug || p.id).trim())}`}
                          onClick={(e) => e.stopPropagation()}
                          className="relative aspect-square rounded-lg 2xl:rounded-xl overflow-hidden bg-cream/50 border border-primary/5 hover:opacity-90 hover:scale-105 transition-all z-10"
                        >
                          <BespokeImage
                            type="product"
                            id={p.id}
                            src={p.images?.[0]}
                            alt={p.name}
                            fill
                            className="object-cover"
                            sizes="100px"
                          />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer: Visit Shop CTA */}
              <div className="p-3.5 2xl:p-4.5 bg-cream/40 border-t border-primary/5 mt-auto">
                <Link
                  href={shopUrl}
                  className="flex items-center justify-between text-xs 2xl:text-sm font-bold text-primary group-hover:text-accent transition-colors"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                    <span>{isArabic ? "زيارة المتجر" : "Visit Artisan Shop"}</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 rtl:rotate-180 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
