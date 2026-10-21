"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface HeroProps {
  artisanCount?: number;
  dict?: any;
}

export function Hero({ dict }: HeroProps) {
  const isArabic = dict?.common?.home === "الرئيسية" || dict?.common?.search?.includes("ابحث");

  // Primary Card 1 Copy (Left Split Banner)
  const headline = isArabic ? "هدايا مصنوعة بإيدين مصرية" : "Gifts made by real people";
  const subtitle = isArabic
    ? "اكتشف هدايا يدوية مميزة من مبدعين وحرفيين مصريين — اتصنعت عشان تفضل في البال."
    : "Discover handmade gifts from Egyptian artisans — made to be remembered.";
  const cta1 = isArabic ? "تسوق الهدايا" : "Shop Gifts";

  // Card 2 Copy (Right Featured Card - Exact Etsy "Engagement Gifts" Style)
  const card2Title = isArabic ? "هدايا الخطوبة والتخصيص" : "Engagement & Custom Gifts";
  const card2Cta = isArabic ? "تسوق الآن" : "Shop now";

  // Value Proposition Strip (Clean editorial without emojis)
  const valueProps = isArabic
    ? ["صناعة يدوية", "مخصصة بالاسم", "مبدعون مصريون", "توصيل لباب بيتك"]
    : ["Handmade", "Personalized", "Egyptian", "Delivered to your door"];

  return (
    <section className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-3 sm:px-4 md:px-8 2xl:px-12 3xl:px-16 py-2.5 sm:py-3 md:py-4 2xl:py-5 3xl:py-6">
      {/* 2-Card Etsy Hero Grid */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 md:gap-5 2xl:gap-6 items-stretch"
      >
        {/* Left Card: 8 Columns on Desktop / Split Banner */}
        <div className="md:col-span-8 group relative rounded-2xl 2xl:rounded-3xl overflow-hidden bg-[#0e4d4a] shadow-xs border border-primary/10 flex flex-col justify-between">
          {/* Mobile Layout (< sm): Vertical Stack with Arched Image Window (Exact Etsy Mobile Design) */}
          <div className="sm:hidden flex flex-col w-full h-[320px] justify-between pt-5 px-4 pb-0 text-center">
            <div className="space-y-2.5 z-10">
              <h1 className="font-serif text-[1.4rem] font-normal text-white leading-tight tracking-tight">
                {headline}
              </h1>
              <p className="text-white/80 text-xs line-clamp-2 px-2 font-light">
                {subtitle}
              </p>
              <div className="pt-1">
                <Link
                  href="/gifts"
                  className="inline-flex items-center justify-center px-6 py-2 rounded-full bg-white text-[#0e4d4a] font-bold text-xs hover:bg-[#FDFCF0] shadow-sm active:scale-95 transition-all"
                >
                  {cta1}
                </Link>
              </div>
            </div>

            {/* Dome / Arch shaped image container */}
            <div className="relative w-full h-[160px] overflow-hidden rounded-t-[130px] mt-2">
              <Image
                src="/marketing/hero-egyptian-gifts.webp"
                alt={headline}
                fill
                priority
                className="object-cover group-hover:scale-104 transition-transform duration-700 ease-out"
                sizes="(max-width: 640px) 100vw, 450px"
              />
            </div>
          </div>

          {/* Tablet & Desktop Layout (sm and up): Split Banner Side-by-Side */}
          <div className="hidden sm:flex h-[260px] md:h-[290px] lg:h-[320px] xl:h-[340px] 2xl:h-[385px] 3xl:h-[425px] w-full">
            {/* Content Side (58% on sm/md, 56% on lg) */}
            <div className="basis-[58%] lg:basis-[56%] flex flex-col justify-center items-center text-center p-5 sm:p-6 md:p-6 lg:p-8 xl:p-10 2xl:p-12 3xl:p-14 z-10 space-y-2.5 sm:space-y-3 lg:space-y-3.5 2xl:space-y-4">
              <h1 className="font-serif text-xl sm:text-2xl md:text-[1.85rem] lg:text-[2.2rem] xl:text-[2.35rem] 2xl:text-[2.85rem] 3xl:text-[3.25rem] font-normal text-white leading-[1.12] tracking-tight max-w-[360px] 2xl:max-w-[480px] 3xl:max-w-[540px]">
                {headline}
              </h1>
              <p className="text-white/80 text-xs md:text-xs lg:text-sm 2xl:text-base 3xl:text-lg max-w-[340px] 2xl:max-w-[440px] 3xl:max-w-[500px] leading-relaxed font-light line-clamp-2 lg:line-clamp-3">
                {subtitle}
              </p>
              <div className="pt-0.5 sm:pt-1 2xl:pt-2">
                <Link
                  href="/gifts"
                  className="inline-flex items-center justify-center px-6 sm:px-7 2xl:px-8 3xl:px-9 py-2 sm:py-2.5 2xl:py-3 3xl:py-3.5 rounded-full bg-white text-[#0e4d4a] font-bold text-xs sm:text-sm 2xl:text-base hover:bg-[#FDFCF0] hover:shadow-md transition-all duration-200 active:scale-95 shrink-0"
                >
                  {cta1}
                </Link>
              </div>
            </div>

            {/* Image Side (42% on sm/md, 44% on lg) */}
            <div className="relative basis-[42%] lg:basis-[44%] h-full overflow-hidden">
              <Image
                src="/marketing/hero-egyptian-gifts.webp"
                alt={headline}
                fill
                priority
                className="object-cover group-hover:scale-104 transition-transform duration-700 ease-out"
                sizes="(max-width: 768px) 45vw, (max-width: 1024px) 35vw, (max-width: 1800px) 32vw, 30vw"
              />
            </div>
          </div>
        </div>

        {/* Right Card: Hidden on mobile screens for a fast, clean flow, visible on tablet & desktop (4 cols) */}
        <Link
          href="/gifts/for-couples"
          className="hidden md:block md:col-span-4 group relative rounded-2xl 2xl:rounded-3xl overflow-hidden md:h-full min-h-[280px] lg:min-h-[320px] xl:min-h-[340px] 2xl:min-h-[385px] 3xl:min-h-[425px] shadow-xs border border-primary/10 cursor-pointer"
        >
          <Image
            src="/images/categories/wedding.webp"
            alt={card2Title}
            fill
            priority
            className="object-cover object-center group-hover:scale-104 transition-transform duration-700 ease-out"
            sizes="(max-width: 1024px) 33vw, 25vw"
          />

          {/* Bottom Gradient Overlay for Legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 via-55% to-transparent pointer-events-none" />

          {/* Bottom Content */}
          <div className="absolute bottom-4 sm:bottom-5 2xl:bottom-7 start-4 sm:start-5 2xl:start-7 end-4 sm:end-5 2xl:end-7 text-white space-y-1 2xl:space-y-1.5 z-10">
            <h2 className="text-base sm:text-lg md:text-base lg:text-xl xl:text-2xl 2xl:text-[1.75rem] 3xl:text-3xl font-bold text-white leading-tight drop-shadow-sm font-heading">
              {card2Title}
            </h2>
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm 2xl:text-base font-semibold text-white/95 group-hover:underline underline-offset-4 decoration-white transition-all">
                <span>{card2Cta}</span>
                <ArrowRight className="w-3.5 h-3.5 2xl:w-4 2xl:h-4 rtl:rotate-180" />
              </span>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Value Proposition Strip: Hidden on mobile to avoid duplication with TrustBar, visible on tablet & desktop */}
      <div className="hidden sm:block mt-3 sm:mt-3.5 2xl:mt-4 3xl:mt-5 py-2.5 sm:py-3 2xl:py-3.5 3xl:py-4 px-4 2xl:px-8 rounded-xl 2xl:rounded-2xl bg-white/70 border border-primary/5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-around gap-4 md:gap-6 2xl:gap-8 text-xs sm:text-sm 2xl:text-base 3xl:text-lg text-charcoal/80 font-medium">
          {valueProps.map((label, idx) => (
            <div key={idx} className="flex items-center gap-2 2xl:gap-2.5">
              <span className="w-1.5 h-1.5 2xl:w-2 2xl:h-2 rounded-full bg-[#D97706]" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
