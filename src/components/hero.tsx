"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { BespokeImage } from "@/components/bespoke-image";
import type { ShelfProduct } from "@/components/home/product-shelf-row";

interface HeroProps {
  artisanCount?: number;
  dict?: any;
  spotlightProducts?: ShelfProduct[];
}

export function Hero({ artisanCount, dict, spotlightProducts = [] }: HeroProps) {
  const isArabic = dict?.common?.home === "الرئيسية" || dict?.common?.search?.includes("ابحث");
  const currency = dict?.product?.currency || "EGP";

  // Primary Editorial Copy
  const headline = isArabic ? "هدايا مصنوعة بإيدين مصرية" : "Gifts made by real people";
  const subtitle = isArabic
    ? "اكتشف هدايا يدوية فريدة من مبدعين وحرفيين مصريين — تُصنع بحب وتُخصص بالاسم لتبقى في الذاكرة."
    : "Discover one-of-a-kind treasures crafted by independent Egyptian makers — personalized and delivered to your door.";

  const primaryCta = isArabic ? "تسوق دليل الهدايا" : "Shop Gift Guide";
  const secondaryCta = isArabic ? "هدايا مخصصة بالاسم" : "Custom & Engraved";

  // Quick High-Intent Gifting Entry Pills
  const quickLinks = [
    {
      label: isArabic ? "هدايا لها" : "For Her",
      href: "/gifts/for-her",
    },
    {
      label: isArabic ? "هدايا له" : "For Him",
      href: "/gifts/for-him",
    },
    {
      label: isArabic ? "الخطوبة والزفاف" : "Engagement & Weddings",
      href: "/gifts/wedding",
    },
    {
      label: isArabic ? "أقل من ٥٠٠ ج.م" : "Under 500 EGP",
      href: "/gifts/all?price=UNDER_500",
    },
  ];

  // Fallback showcase items if database has fewer than 3 spotlight products
  const fallbackCards = [
    {
      id: "fallback-1",
      name: isArabic ? "هدايا مخصصة بالاسم" : "Custom Engraved Keepsakes",
      studio: isArabic ? "صُناع جيفتيزان" : "Giftisan Makers",
      priceLabel: isArabic ? "تخصيص فوري" : "Made to Order",
      image: "/marketing/hero-egyptian-gifts.webp",
      href: "/gifts?picks=true",
      isProduct: false,
      isVerified: true,
    },
    {
      id: "fallback-2",
      name: isArabic ? "تذكارات الخطوبة والزفاف" : "Engagement & Bridal Trays",
      studio: isArabic ? "حرف يدوية مصرية" : "Egyptian Heritage",
      priceLabel: isArabic ? "تسوق الآن" : "Explore",
      image: "/images/categories/wedding.webp",
      href: "/gifts/wedding",
      isProduct: false,
      isVerified: true,
    },
    {
      id: "fallback-3",
      name: isArabic ? "فخار وديكورات منزلية" : "Artisan Home & Ceramics",
      studio: isArabic ? "ورش مستقلة" : "Local Studios",
      priceLabel: isArabic ? "تسوق الآن" : "Explore",
      image: "/images/categories/ceramics.webp",
      href: "/category/home-and-living",
      isProduct: false,
      isVerified: true,
    },
  ];

  const bentoItems = [0, 1, 2].map((index) => {
    const product = spotlightProducts[index];
    if (product && Array.isArray(product.images) && product.images[0]) {
      const slugOrId = (product.slug || product.id).trim();
      const studioName =
        product.artisan?.studioName ||
        product.artisan?.user?.name ||
        (isArabic ? "متجر حرفي مصري" : "Egyptian Artisan");
      return {
        id: product.id,
        name: product.name,
        studio: studioName,
        priceLabel: `${currency} ${product.price.toLocaleString()}`,
        image: product.images[0],
        href: `/products/${encodeURI(slugOrId)}`,
        isProduct: true,
        isVerified: Boolean(product.artisan?.isVerified),
      };
    }
    return fallbackCards[index];
  });

  const [primaryItem, secondaryTopItem, secondaryBottomItem] = bentoItems;

  return (
    <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-3 sm:px-4 md:px-8 2xl:px-12 3xl:px-16 py-2.5 sm:py-3.5 md:py-4 2xl:py-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 md:gap-5 2xl:gap-6 items-stretch"
      >
        {/* Left Column (6 Cols on Desktop): Brand Story + Direct Gifting Shortcuts */}
        <div className="lg:col-span-6 relative rounded-2xl 2xl:rounded-3xl overflow-hidden bg-[#0e4d4a] text-white shadow-xs border border-primary/10 p-4 sm:p-7 md:p-8 lg:p-9 2xl:p-11 flex flex-col justify-between min-h-0 sm:min-h-[300px] lg:min-h-[370px] 2xl:min-h-[420px]">
          {/* Subtle Warm Radial Glow */}
          <div className="absolute -top-24 -end-24 w-72 h-72 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -start-24 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

          {/* Main Copy */}
          <div className="relative z-10 space-y-2.5 sm:space-y-4 2xl:space-y-5 my-auto">
            <h1 className="font-serif text-[1.5rem] sm:text-3xl md:text-4xl lg:text-[2.35rem] xl:text-[2.65rem] 2xl:text-[3.1rem] font-normal text-white leading-[1.12] tracking-tight max-w-xl">
              {headline}
            </h1>

            <p className="text-white/80 text-xs sm:text-sm 2xl:text-base max-w-lg leading-relaxed font-light line-clamp-2 sm:line-clamp-none">
              {subtitle}
            </p>

            {/* Primary & Secondary Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 sm:pt-2">
              <Link
                href="/gifts"
                className="inline-flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 2xl:px-7 py-2 sm:py-3 rounded-full bg-white text-[#0e4d4a] font-bold text-xs sm:text-sm 2xl:text-base hover:bg-cream shadow-sm hover:shadow-md active:scale-95 transition-all"
              >
                <span>{primaryCta}</span>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 rtl:rotate-180" />
              </Link>

              <Link
                href="/search?customizable=true"
                className="inline-flex items-center gap-1.5 px-3.5 sm:px-5 2xl:px-6 py-2 sm:py-3 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold text-xs sm:text-sm 2xl:text-base active:scale-95 transition-all backdrop-blur-xs"
              >
                <span>{secondaryCta}</span>
              </Link>
            </div>
          </div>

          {/* Bottom High-Intent Quick Occasion / Recipient Pills (Single-line horizontal swipe on mobile) */}
          <div className="relative z-10 pt-3.5 sm:pt-6 mt-3.5 sm:mt-4 border-t border-white/10">
            <div
              className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto sm:overflow-visible flex-nowrap sm:flex-wrap scrollbar-none -mx-1 px-1"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <span className="text-[10px] sm:text-xs text-white/60 font-medium me-1 shrink-0">
                {isArabic ? "تسوق سريع:" : "Quick picks:"}
              </span>
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-2.5 sm:px-3 py-1 rounded-full bg-white/8 hover:bg-white/20 border border-white/12 text-[11px] sm:text-xs font-medium text-white/90 transition-colors active:scale-95 shrink-0"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (6 Cols on Desktop): Live 3-Product Bento Showcase */}
        <div className="lg:col-span-6 grid grid-cols-2 grid-rows-2 gap-2.5 sm:gap-4 md:gap-5 2xl:gap-6 h-[230px] sm:h-[310px] lg:h-auto lg:min-h-[370px] 2xl:min-h-[420px]">
          {/* Bento Card 1: Tall Featured Hero Product (Spans 2 Rows on Left of Bento) */}
          <Link
            href={primaryItem.href}
            className="col-span-1 row-span-2 group relative rounded-2xl 2xl:rounded-3xl overflow-hidden bg-cream border border-primary/10 shadow-xs hover:shadow-md transition-all duration-300"
          >
            {primaryItem.isProduct ? (
              <BespokeImage
                type="product"
                id={primaryItem.id}
                src={primaryItem.image}
                alt={primaryItem.name}
                fill
                priority
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                sizes="(max-width: 1024px) 50vw, 25vw"
              />
            ) : (
              <Image
                src={primaryItem.image}
                alt={primaryItem.name}
                fill
                priority
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                sizes="(max-width: 1024px) 50vw, 25vw"
              />
            )}

            {/* Top Floating Price Pill */}
            <div className="absolute top-3 start-3 z-10">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs text-primary font-heading font-bold text-[11px] sm:text-xs 2xl:text-sm shadow-sm border border-primary/10">
                {primaryItem.priceLabel}
              </span>
            </div>

            {/* Bottom Gradient & Product Metadata */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 via-45% to-transparent pointer-events-none" />
            <div className="absolute bottom-3 sm:bottom-4 start-3 sm:start-4 end-3 sm:end-4 z-10 text-white space-y-0.5">
              <p className="text-[10px] sm:text-[11px] text-white/80 font-medium flex items-center gap-1 truncate">
                <span className="truncate">
                  {isArabic ? `بواسطة ${primaryItem.studio}` : `By ${primaryItem.studio}`}
                </span>
                {primaryItem.isVerified && (
                  <ShieldCheck className="w-3 h-3 text-emerald-300 shrink-0" />
                )}
              </p>
              <h2 className="font-heading font-bold text-xs sm:text-sm md:text-base 2xl:text-lg text-white line-clamp-1 group-hover:underline underline-offset-2">
                {primaryItem.name}
              </h2>
            </div>
          </Link>

          {/* Bento Card 2: Top-Right Spotlight Product */}
          <Link
            href={secondaryTopItem.href}
            className="col-span-1 row-span-1 group relative rounded-2xl 2xl:rounded-3xl overflow-hidden bg-cream border border-primary/10 shadow-xs hover:shadow-md transition-all duration-300"
          >
            {secondaryTopItem.isProduct ? (
              <BespokeImage
                type="product"
                id={secondaryTopItem.id}
                src={secondaryTopItem.image}
                alt={secondaryTopItem.name}
                fill
                priority
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                sizes="(max-width: 1024px) 50vw, 25vw"
              />
            ) : (
              <Image
                src={secondaryTopItem.image}
                alt={secondaryTopItem.name}
                fill
                priority
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                sizes="(max-width: 1024px) 50vw, 25vw"
              />
            )}

            <div className="absolute top-2.5 start-2.5 z-10">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-primary font-heading font-bold text-[10px] sm:text-xs shadow-sm border border-primary/10">
                {secondaryTopItem.priceLabel}
              </span>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 via-50% to-transparent pointer-events-none" />
            <div className="absolute bottom-2 sm:bottom-3 start-2.5 sm:start-3 end-2.5 sm:end-3 z-10 text-white space-y-0.5">
              <p className="hidden sm:flex text-[10px] text-white/80 font-medium items-center gap-1 truncate">
                <span className="truncate">
                  {isArabic ? `بواسطة ${secondaryTopItem.studio}` : `By ${secondaryTopItem.studio}`}
                </span>
                {secondaryTopItem.isVerified && (
                  <ShieldCheck className="w-3 h-3 text-emerald-300 shrink-0" />
                )}
              </p>
              <h2 className="font-heading font-bold text-[11px] sm:text-sm text-white line-clamp-1 group-hover:underline underline-offset-2">
                {secondaryTopItem.name}
              </h2>
            </div>
          </Link>

          {/* Bento Card 3: Bottom-Right Spotlight Product */}
          <Link
            href={secondaryBottomItem.href}
            className="col-span-1 row-span-1 group relative rounded-2xl 2xl:rounded-3xl overflow-hidden bg-cream border border-primary/10 shadow-xs hover:shadow-md transition-all duration-300"
          >
            {secondaryBottomItem.isProduct ? (
              <BespokeImage
                type="product"
                id={secondaryBottomItem.id}
                src={secondaryBottomItem.image}
                alt={secondaryBottomItem.name}
                fill
                priority
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                sizes="(max-width: 1024px) 50vw, 25vw"
              />
            ) : (
              <Image
                src={secondaryBottomItem.image}
                alt={secondaryBottomItem.name}
                fill
                priority
                className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                sizes="(max-width: 1024px) 50vw, 25vw"
              />
            )}

            <div className="absolute top-2 start-2 sm:top-2.5 sm:start-2.5 z-10">
              <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full bg-white/95 backdrop-blur-xs text-primary font-heading font-bold text-[10px] sm:text-xs shadow-sm border border-primary/10">
                {secondaryBottomItem.priceLabel}
              </span>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 via-50% to-transparent pointer-events-none" />
            <div className="absolute bottom-2 sm:bottom-3 start-2.5 sm:start-3 end-2.5 sm:end-3 z-10 text-white space-y-0.5">
              <p className="hidden sm:flex text-[10px] text-white/80 font-medium items-center gap-1 truncate">
                <span className="truncate">
                  {isArabic ? `بواسطة ${secondaryBottomItem.studio}` : `By ${secondaryBottomItem.studio}`}
                </span>
                {secondaryBottomItem.isVerified && (
                  <ShieldCheck className="w-3 h-3 text-emerald-300 shrink-0" />
                )}
              </p>
              <h2 className="font-heading font-bold text-[11px] sm:text-sm text-white line-clamp-1 group-hover:underline underline-offset-2">
                {secondaryBottomItem.name}
              </h2>
            </div>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
