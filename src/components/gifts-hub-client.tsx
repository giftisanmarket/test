"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Heart,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Gift,
  Coins,
  Cake,
  GraduationCap,
  Home,
  Baby,
  Star,
  CheckCircle2,
  Package,
  Gem,
  Crown,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BespokeImage } from "@/components/bespoke-image";
import { useFavorites } from "@/context/favorites-context";
import { cn } from "@/lib/utils";

export interface GiftsHubClientProps {
  initialProducts: any[];
  dict: any;
  initialRecipient?: string;
  initialPrice?: string;
  lang?: string;
}

export function GiftsHubClient({ 
  initialProducts, 
  dict,
  lang: langProp,
}: GiftsHubClientProps) {
  const { toggleFavorite, isFavorite } = useFavorites();

  const isAr = dict?.common?.home === "الرئيسية" || dict?.common?.search?.includes("ابحث");
  const lang = langProp || (isAr ? "ar" : "en");
  const currency = dict?.product?.currency || "EGP";
  const hubDict = dict?.gifts_hub || {};

  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;
    const container = carouselRef.current;
    const scrollLeft = Math.abs(container.scrollLeft);
    const itemWidth = container.firstElementChild?.clientWidth || 1;
    const index = Math.round(scrollLeft / itemWidth);
    setActiveSlide(Math.min(Math.max(index, 0), recipientCards.length - 1));
  };

  const scrollToSlide = (index: number) => {
    if (!carouselRef.current) return;
    const items = carouselRef.current.children;
    if (items[index]) {
      (items[index] as HTMLElement).scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      setActiveSlide(index);
    }
  };

  // 6 Recipient Cards linking to dedicated pages
  const recipientCards = [
    {
      id: "for-her",
      title: hubDict.for_her_title || (isAr ? "هدايا لها" : "Gifts for Her"),
      desc: hubDict.for_her_desc || (isAr ? "فاجئها بهدية استثنائية تُبهج يومها وأيامها القادمة." : "Make her day, week, month, and year."),
      image: "/images/gifts/gifts-for-her.webp",
      href: `/${lang}/gifts/for-her`,
      alt: isAr ? "هدايا لها - شموع وعطور ومجوهرات حرفية" : "Gifts for Her - artisanal scented candles and jewelry",
    },
    {
      id: "for-him",
      title: hubDict.for_him_title || (isAr ? "هدايا له" : "Gifts for Him"),
      desc: hubDict.for_him_desc || (isAr ? "صعب الاختيار له؟ لدينا كل ما يناسب ذوقه بحرفية وفخامة." : "Hard to shop for? Not on our watch."),
      image: "/images/gifts/gifts-for-him.webp",
      href: `/${lang}/gifts/for-him`,
      alt: isAr ? "هدايا له - إكسسوارات جلدية وخشبية" : "Gifts for Him - handcrafted leather and woodwork accessories",
    },
    {
      id: "for-mom",
      title: hubDict.for_mom_title || (isAr ? "هدايا لست الحبايب" : "For Mom"),
      desc: hubDict.for_mom_desc || (isAr ? "عبر لأغلى الناس بلمسات دافئة وهدايا تذكارية تليق بمقامها." : "Warmth, gratitude, and heartfelt treasures."),
      image: "/images/categories/gift-boxes-sets.webp",
      href: `/${lang}/gifts/for-mom`,
      alt: isAr ? "هدايا لست الحبايب - أطقم شمع وصواني وديكورات دافئة" : "Gifts for Mom - artisan candles, trays and home treasures",
    },
    {
      id: "for-couples",
      title: hubDict.for_couples_title || (isAr ? "هدايا للعروسين" : "Couples & Weddings"),
      desc: hubDict.for_couples_desc || (isAr ? "قطع تذكارية وصواني خطوبة مخصصة لتوثيق أسعد لحظات العمر." : "Bespoke keepsakes to celebrate love and new beginnings."),
      image: "/images/categories/personalized.webp",
      href: `/${lang}/gifts/for-couples`,
      alt: isAr ? "هدايا للعروسين - صواني خطوبة وطارات تطريز وتذكارات" : "Couples & Weddings - custom engagement plates and keepsakes",
    },
    {
      id: "for-friends",
      title: hubDict.for_friends_title || (isAr ? "هدايا للأصدقاء" : "For Friends"),
      desc: hubDict.for_friends_desc || (isAr ? "مفاجآت مرحة ولمسات مبهجة ومصنوعات كروشيه لأعز الرفاق." : "Delightful surprises and playful artisan tokens."),
      image: "/images/hero/hero-crochet-monster.webp",
      href: `/${lang}/gifts/for-friends`,
      alt: isAr ? "هدايا للأصدقاء - كروشيه مرح وأكواب وميداليات بالاسم" : "Gifts for Friends - playful crochet, mugs and personalized tokens",
    },
    {
      id: "for-kids",
      title: hubDict.for_kids_title || (isAr ? "هدايا للأطفال" : "Gifts for Kids"),
      desc: hubDict.for_kids_desc || (isAr ? "ألعاب ومصنوعات خشبية وكروشيه تشعل خيالهم ومرحهم." : "Imaginative and fun—just like them."),
      image: "/images/gifts/gifts-for-kids.webp",
      href: `/${lang}/gifts/for-kids`,
      alt: isAr ? "هدايا للأطفال - ألعاب ومجسمات يدوية" : "Gifts for Kids - wooden blocks and plush toys",
    },
  ];

  // Budget Cards
  const budgetCards = [
    {
      id: "under-250",
      title: isAr ? "أقل من 250 ج.م" : `Under 250 ${currency}`,
      subtitle: isAr ? "مفاجآت لطيفة، ميداليات مخصصة، وأكواب فنية" : "Sweet thoughtful tokens, keychains & mugs",
      href: `/${lang}/gifts/all?price=UNDER_250`,
      tag: isAr ? "اقتصادي ولطيف" : "Budget Friendly",
      icon: Coins,
      color: "bg-amber-50 text-amber-800 border-amber-200/60",
    },
    {
      id: "under-500",
      title: isAr ? "أقل من 500 ج.م" : `Under 500 ${currency}`,
      subtitle: isAr ? "إكسسوارات يدوية، شموع طبيعية، وديكورات أنيقة" : "Handcrafted accessories, candles & concrete sets",
      href: `/${lang}/gifts/all?price=UNDER_500`,
      tag: isAr ? "الأكثر اختياراً" : "Best Value",
      icon: Sparkles,
      color: "bg-teal-50 text-teal-800 border-teal-200/60",
    },
    {
      id: "under-1000",
      title: isAr ? "500 – 1,000 ج.م" : `500 – 1,000 ${currency}`,
      subtitle: isAr ? "حقائب كروشيه وجلود، فضة يدوية، وتذكارات خاصة" : "Fine crochet bags, silver jewelry & bespoke gifts",
      href: `/${lang}/gifts/all?price=UNDER_1000`,
      tag: isAr ? "صناعة مميزة" : "Artisan Craft",
      icon: Gem,
      color: "bg-rose-50 text-rose-800 border-rose-200/60",
    },
    {
      id: "over-1000",
      title: isAr ? `أكثر من 1,000 ${currency}` : `Over 1,000 ${currency}`,
      subtitle: isAr ? "صناديق هدايا ملكية، أخشاب مطعمة، ومجموعات راقية" : "Luxury gift sets, heirloom wood & custom art",
      href: `/${lang}/gifts/all?price=OVER_1000`,
      tag: isAr ? "فخامة استثنائية" : "Luxury Keepsakes",
      icon: Crown,
      color: "bg-purple-50 text-purple-800 border-purple-200/60",
    },
  ];

  // Occasions Strip
  const occasions = [
    {
      name: isAr ? "أعياد الميلاد" : "Birthday",
      icon: Cake,
      href: `/${lang}/gifts/for-friends`,
      color: "bg-amber-50 text-amber-700 border-amber-200/60",
    },
    {
      name: isAr ? "الخطوبة والزفاف" : "Wedding & Engagement",
      icon: Sparkles,
      href: `/${lang}/gifts/for-couples`,
      color: "bg-rose-50 text-rose-700 border-rose-200/60",
    },
    {
      name: isAr ? "عيد الأم والتكريم" : "Mother's Day & Gratitude",
      icon: Heart,
      href: `/${lang}/gifts/for-mom`,
      color: "bg-purple-50 text-purple-700 border-purple-200/60",
    },
    {
      name: isAr ? "التخرج والنجاح" : "Graduation",
      icon: GraduationCap,
      href: `/${lang}/gifts/for-him`,
      color: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    },
    {
      name: isAr ? "مباركة البيت الجديد" : "Housewarming",
      icon: Home,
      href: `/${lang}/category/home-and-living`,
      color: "bg-teal-50 text-teal-700 border-teal-200/60",
    },
    {
      name: isAr ? "السبوع والمواليد" : "Baby & Sebou'",
      icon: Baby,
      href: `/${lang}/gifts/for-kids`,
      color: "bg-blue-50 text-blue-700 border-blue-200/60",
    },
  ];

  // Preview Trending Gifts (8 items)
  const previewProducts = initialProducts.slice(0, 8);

  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  return (
    <main className="min-h-screen bg-cream">
      <Navbar dict={dict} />

      {/* 1. Etsy Editorial Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#EFE9F6] via-[#F7F4FA] to-cream pt-8 sm:pt-12 md:pt-16 pb-10 sm:pb-14 border-b border-primary/5">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
          
          {/* Header Title & Subtitle */}
          <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10 md:mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold mb-3">
              <Gift className="w-3.5 h-3.5" />
              <span>{isAr ? "دليل الهدايا الذكي" : "Gift Mode Guide"}</span>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-3xl sm:text-5xl md:text-6xl font-serif text-[#222222] tracking-tight font-normal leading-[1.15]"
            >
              {hubDict.title_main || (isAr ? "هدايا ستأسر" : "Gifts They'll")}{" "}
              <span className="font-serif italic font-normal text-primary">
                {hubDict.title_highlight || (isAr ? "قلوبهم" : "Love")}
              </span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mt-2 sm:mt-3 md:mt-4 text-xs sm:text-base md:text-lg text-charcoal/70 max-w-xl mx-auto font-normal leading-relaxed"
            >
              {hubDict.subtitle || (isAr ? "وجهتك الأولى للهدايا المميزة والفريدة من المبدعين والورش المحلية في مصر." : "THE place for meaningful presents from small shops.")}
            </motion.p>
          </div>

          {/* 2. 6 Recipient Cards Grid (Etsy Style Showcase) */}
          <div
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            className="flex md:grid md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-4 lg:gap-3.5 2xl:gap-5 max-w-7xl 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto overflow-x-auto md:overflow-visible pb-4 pt-1 px-4 -mx-4 md:px-0 md:mx-auto snap-x snap-mandatory scrollbar-none scroll-smooth"
          >
            {recipientCards.map((card, idx) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 + idx * 0.05 }}
                className="w-[70vw] max-w-[270px] sm:w-[42vw] md:w-auto shrink-0 snap-center md:snap-align-none"
              >
                <Link
                  href={card.href}
                  className="group block h-full flex flex-col justify-between transition-all rounded-2xl md:rounded-3xl p-3 bg-white/70 backdrop-blur-sm border border-primary/10 shadow-xs hover:border-primary/30 hover:shadow-md active:scale-[0.98]"
                >
                  {/* Editorial Image */}
                  <div className="relative aspect-[4/5] rounded-xl md:rounded-[18px] overflow-hidden mb-2.5 md:mb-3 bg-primary/5">
                    <Image
                      src={card.image}
                      alt={card.alt}
                      fill
                      sizes="(max-width: 640px) 70vw, (max-width: 1024px) 33vw, 16vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      priority={idx < 2}
                    />
                  </div>

                  {/* Content */}
                  <div className="px-0.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h2 className="text-sm sm:text-base md:text-lg lg:text-base xl:text-lg font-serif font-medium text-[#222222] group-hover:text-primary transition-colors tracking-tight line-clamp-1">
                        {card.title}
                      </h2>
                      <p className="mt-1 text-[11px] sm:text-xs text-charcoal/70 leading-relaxed font-normal line-clamp-2">
                        {card.desc}
                      </p>
                    </div>

                    {/* Shop Now CTA */}
                    <div className="pt-2.5 md:pt-3 flex items-center gap-1 font-bold text-xs text-[#222222] group-hover:text-primary transition-colors">
                      <span className="underline underline-offset-4">
                        {hubDict.shop_now || (isAr ? "تسوق الآن" : "Shop now")}
                      </span>
                      <ArrowIcon className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Mobile Carousel Indicators & Hint */}
          <div className="flex md:hidden items-center justify-between mt-2 px-1">
            <div className="flex items-center gap-1.5">
              {recipientCards.map((card, i) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => scrollToSlide(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    activeSlide === i ? "w-6 bg-primary" : "w-1.5 bg-primary/25 hover:bg-primary/50"
                  )}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-charcoal/50 font-medium">
              <span>{isAr ? "اسحب للاستكشاف" : "Swipe to explore"}</span>
              <ArrowIcon className="w-3 h-3 text-primary animate-pulse" />
            </div>
          </div>

        </div>
      </section>

      {/* 3. Occasions Quick Exploration Strip */}
      <section className="py-8 border-b border-primary/5 bg-white/60 backdrop-blur-xs">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-serif text-[#222222] font-medium">
                {isAr ? "تسوق حسب المناسبة" : "Shop by Occasion"}
              </h2>
              <p className="text-xs text-charcoal/60">
                {isAr ? "هدايا مصممة ومختارة خصيصاً للاحتفال بأجمل لحظات العمر" : "Find the right present to mark every memorable celebration"}
              </p>
            </div>
            <Link
              href={`/${lang}/gifts/all`}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>{isAr ? "تصفح جميع الهدايا" : "Browse all gifts"}</span>
              <ArrowIcon className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {occasions.map((occ) => {
              const Icon = occ.icon;
              return (
                <Link
                  key={occ.name}
                  href={occ.href}
                  className={cn(
                    "p-3 rounded-2xl border transition-all flex items-center gap-2.5 hover:shadow-xs active:scale-95",
                    occ.color
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-bold truncate">{occ.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Shop by Budget Section */}
      <section className="py-8 border-b border-primary/5 bg-white/60 backdrop-blur-xs">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-serif text-[#222222] font-medium">
                {isAr ? "اختر الهدية حسب ميزانيتك" : "Find Gifts in Your Price Range"}
              </h2>
              <p className="text-xs text-charcoal/60">
                {isAr ? "قطع فريدة مصنوعة يدوياً تناسب كل ميزانية دون التنازل عن القيمة والأناقة" : "Handmade treasures for every budget without compromising craft or care"}
              </p>
            </div>
            <Link
              href={`/${lang}/gifts/all`}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <span>{isAr ? "عرض كل الأسعار" : "View all prices"}</span>
              <ArrowIcon className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
            {budgetCards.map((b) => {
              const Icon = b.icon;
              return (
                <Link
                  key={b.id}
                  href={b.href}
                  className={cn(
                    "p-3 rounded-2xl border transition-all flex items-center gap-2.5 hover:shadow-xs active:scale-95 group",
                    b.color
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold truncate block group-hover:underline">{b.title}</span>
                    <span className="text-[10px] opacity-75 truncate block font-medium">{b.tag}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Trending Handcrafted Gifts Showcase (Preview Shelf) */}
      <section className="py-12 border-b border-primary/5">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 2xl:px-12 3xl:px-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAr ? "مختارات حصرية" : "Artisan Favorites"}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif text-[#222222] font-normal">
                {isAr ? "أشهر الهدايا طلباً وإعجاباً" : "Popular Gifts Loved Right Now"}
              </h2>
              <p className="text-xs sm:text-sm text-charcoal/65 mt-1">
                {isAr ? "إبداعات حقيقية يختارها المتسوقون لإسعاد أحبائهم في المناسبات الخاصة." : "Real handmade creations shoppers are choosing for their cherished moments."}
              </p>
            </div>

            <Link
              href={`/${lang}/gifts/all`}
              className="px-4 py-2 bg-primary text-white rounded-full text-xs font-bold shadow-xs hover:bg-primary-light transition-all flex items-center gap-1.5 self-start sm:self-auto shrink-0 active:scale-95"
            >
              <span>{isAr ? "تصفح جميع الهدايا" : "Browse All Gifts"}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Grid of Preview Products */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 2xl:gap-6">
            {previewProducts.map((product) => {
              const reviews = product.reviews || [];
              const ratingCount = reviews.length;
              const avgRating = ratingCount > 0
                ? (reviews.reduce((acc: number, r: any) => acc + (r.rating || 5), 0) / ratingCount).toFixed(1)
                : null;
              const artisanName = product.artisan?.studioName || product.artisan?.user?.name;
              const slugOrId = (product.slug || product.id).trim();
              const productUrl = `/${lang}/products/${encodeURI(slugOrId)}`;

              return (
                <div key={product.id} className="group cursor-pointer block h-full flex flex-col justify-between">
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
              );
            })}
          </div>

          <div className="mt-8 text-center">
            <Link
              href={`/${lang}/gifts/all`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-primary/15 rounded-full text-xs sm:text-sm font-bold text-primary hover:border-primary/40 hover:bg-cream shadow-xs transition-all active:scale-95"
            >
              <span>{isAr ? `استكشف جميع الهدايا الحرفية (${initialProducts.length}+)` : `Explore All Handcrafted Gifts (${initialProducts.length}+)`}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Artisanal Reassurance Banner */}
      <section className="py-12 container mx-auto px-4 md:px-6">
        <div className="bg-primary/5 rounded-3xl p-6 md:p-10 border border-primary/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-start">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#222222]">
                  {isAr ? "حرفيون مستقلون موثقون" : "Verified Independent Makers"}
                </h4>
                <p className="text-xs text-charcoal/70 mt-1 leading-relaxed">
                  {isAr ? "صناع حقيقيون تم التحقق من حرفيتهم وجودة مخرجاتهم لدعم الورش المحلية." : "Real artisans vetted for authenticity and craft, directly benefiting Egyptian studios."}
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#222222]">
                  {isAr ? "تخصيص يدوي بالاسم والذكريات" : "Bespoke & Personalized"}
                </h4>
                <p className="text-xs text-charcoal/70 mt-1 leading-relaxed">
                  {isAr ? "قطع محفورة ومطرزة بالاسم والتواريخ لتتحول الهدية إلى ذكرى تدوم." : "Custom engraved plates, name embroidery, and made-to-order keepsakes."}
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#222222]">
                  {isAr ? "تغليف هدايا وتوصيل لكل المحافظات" : "Gift-Ready & Doorstep Delivery"}
                </h4>
                <p className="text-xs text-charcoal/70 mt-1 leading-relaxed">
                  {isAr ? "شحن آمن وموثوق لجميع محافظات مصر مع خيارات الدفع عند الاستلام." : "Careful packaging delivered safely across all 27 Egyptian governorates."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer dict={dict} />
    </main>
  );
}
