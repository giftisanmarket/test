"use client";

import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { 
  MapPin, 
  Star, 
  ShieldCheck, 
  Share2, 
  Check, 
  ChevronRight, 
  Heart, 
  Package, 
  Clock,
  Sparkles
} from "lucide-react";
import { BespokeImage } from "./bespoke-image";
import { ProductCard } from "@/components/home/product-card";
import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { toggleFollowAction, checkFollowStatus } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { useFilterPersistence } from "@/lib/use-filter-persistence";

interface ArtisanClientProps {
  artisan: any;
  dict: any;
  lang?: string;
}

export function ArtisanClient({ artisan, dict, lang = "en" }: ArtisanClientProps) {
  const { data: session } = useSession();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'available' | 'soldout'>('all');

  useFilterPersistence({
    key: `giftisan_filters_artisan_${artisan.slug || artisan.id}`,
    values: {
      filter,
    },
    setters: {
      filter: setFilter,
    },
    defaultValues: {
      filter: "all" as const,
    },
    paramMapping: {
      filter: "tab",
    },
  });
  
  const isAr = lang === "ar" || dict?.common?.home === "الرئيسية";
  const products = artisan.products || [];
  const displayName = artisan.studioName || artisan.user?.name || (isAr ? "متجر الحرفي" : "Artisan Studio");
  const brandColor = artisan.brandColor?.trim() || "#da7b5a";

  // Real Data Calculations
  const allReviews = useMemo(() => {
    return products.flatMap((p: any) => p.reviews || []);
  }, [products]);

  const totalReviews = allReviews.length;
  const avgRating = totalReviews > 0
    ? (allReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / totalReviews).toFixed(1)
    : "5.0";

  const totalSales = useMemo(() => {
    return products.reduce((acc: number, p: any) => {
      return acc + (p.orderItems?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0);
    }, 0);
  }, [products]);

  const yearsExp = artisan.yearsOfExperience ?? (
    artisan.createdAt
      ? Math.max(1, new Date().getFullYear() - new Date(artisan.createdAt).getFullYear() + 1)
      : 1
  );

  const availableProducts = useMemo(() => {
    return products.filter((p: any) => (p.stock ?? 1) > 0);
  }, [products]);

  const soldOutProducts = useMemo(() => {
    return products.filter((p: any) => (p.stock ?? 1) <= 0);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (filter === 'available') return availableProducts;
    if (filter === 'soldout') return soldOutProducts;
    return products;
  }, [filter, products, availableProducts, soldOutProducts]);

  useEffect(() => {
    if (session?.user?.id) {
      checkFollowStatus(artisan.id, session.user.id as string).then(setIsFollowing);
    }
  }, [session, artisan.id]);

  const handleFollow = async () => {
    if (!session?.user?.id) {
      toast.error(dict.artisan_detail?.signin_to_follow || (isAr ? "يرجى تسجيل الدخول لمتابعة المتجر" : "Please sign in to follow this shop"), {
        style: { borderRadius: '12px', background: '#064E3B', color: '#fff' }
      });
      return;
    }

    setIsPending(true);
    const res = await toggleFollowAction(artisan.id, session.user.id as string);

    if (res.success) {
      setIsFollowing(res.action === "followed");
      if (res.action === "followed") {
        toast.success(
          (dict.artisan_detail?.now_following || (isAr ? "أنت الآن تتابع {name}" : "You are now following {name}")).replace('{name}', displayName),
          {
            icon: <Check className="w-4 h-4 text-emerald-400" />,
            style: { borderRadius: '12px', background: '#064E3B', color: '#fff' }
          }
        );
      }
    }
    setIsPending(false);
  };

  const handleShare = async () => {
    const shareData = {
      title: `${displayName} | Giftisan`,
      text: `${dict.home?.category_desc_prefix || ""} ${displayName} ${dict.home?.category_desc_suffix || ""}`.trim(),
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success(dict.artisan_detail?.studio_link_copied || (isAr ? "تم نسخ رابط المتجر!" : "Shop link copied to clipboard!"), {
          style: { borderRadius: '12px', background: '#064E3B', color: '#fff' }
        });
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
  };

  return (
    <main className="min-h-screen bg-cream">
      <Navbar dict={dict} />

      {/* Breadcrumbs Strip */}
      <div className="bg-cream-dark/40 border-b border-primary/5 py-2.5">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 2xl:px-12 3xl:px-16">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs lg:text-sm text-charcoal/60">
            <Link href={`/${lang}`} className="hover:text-primary transition-colors">
              {dict.common?.home || (isAr ? "الرئيسية" : "Home")}
            </Link>
            <ChevronRight className={cn("w-3.5 h-3.5 text-charcoal/40 shrink-0", isAr && "rotate-180")} />
            <Link href={`/${lang}/artisans`} className="hover:text-primary transition-colors font-medium">
              {dict.common?.artisans || (isAr ? "الحرفيون" : "Artisans")}
            </Link>
            <ChevronRight className={cn("w-3.5 h-3.5 text-charcoal/40 shrink-0", isAr && "rotate-180")} />
            <span className="text-primary font-bold truncate">
              {displayName}
            </span>
          </nav>
        </div>
      </div>

      <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 2xl:px-12 3xl:px-16 pt-6 sm:pt-8 lg:pt-10 2xl:pt-12 pb-16 lg:pb-24 2xl:pb-32">
        {/* Cover Banner */}
        <div className="relative rounded-2xl sm:rounded-3xl lg:rounded-[2rem] 2xl:rounded-[2.5rem] overflow-hidden border border-primary/10 shadow-xs bg-cream-dark/30">
          {artisan.bannerImage ? (
            <div className="relative h-44 sm:h-56 md:h-64 lg:h-80 xl:h-96 2xl:h-[420px] 3xl:h-[460px] w-full">
              <BespokeImage 
                src={artisan.bannerImage} 
                alt={`${displayName} banner`} 
                fill 
                className="object-cover" 
                priority 
                sizes="(max-width: 1600px) 100vw, 1840px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            </div>
          ) : (
            <div 
              className="h-32 sm:h-40 md:h-48 lg:h-60 xl:h-72 2xl:h-80 3xl:h-96 w-full relative overflow-hidden flex items-center justify-end px-8 lg:px-12"
              style={{
                background: `linear-gradient(135deg, ${brandColor}22 0%, rgba(6,78,59,0.06) 50%, ${brandColor}15 100%)`
              }}
            >
              <div 
                className="absolute -end-10 -bottom-10 w-48 lg:w-72 h-48 lg:h-72 rounded-full blur-3xl pointer-events-none" 
                style={{ backgroundColor: brandColor, opacity: 0.15 }}
              />
              <div className="hidden sm:flex items-center gap-3" style={{ color: `${brandColor}50` }}>
                <Sparkles className="w-8 h-8 lg:w-12 lg:h-12" />
              </div>
            </div>
          )}
        </div>

        {/* Profile Card Header Info */}
        <div className="relative -mt-12 sm:-mt-14 md:-mt-16 lg:-mt-20 xl:-mt-24 2xl:-mt-28 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 lg:gap-8">
            {/* Left: Avatar + Title & Meta */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 lg:gap-8 text-center sm:text-start">
              {/* Avatar */}
              <div 
                className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 xl:w-44 xl:h-44 2xl:w-48 2xl:h-48 3xl:w-52 3xl:h-52 rounded-full overflow-hidden border-4 lg:border-[6px] border-white shadow-lg bg-white shrink-0 transition-shadow duration-300"
                style={{
                  boxShadow: `0 0 0 2px ${brandColor}35, 0 12px 30px -6px ${brandColor}30`
                }}
              >
                <BespokeImage 
                  type="artisan" 
                  id={artisan.id} 
                  src={artisan.avatar} 
                  alt={displayName} 
                  fill 
                  className="object-cover" 
                  sizes="(max-width: 640px) 96px, (max-width: 768px) 112px, (max-width: 1024px) 128px, 208px" 
                />
              </div>

              {/* Identity & Badges */}
              <div className="space-y-1.5 lg:space-y-2 pb-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 lg:gap-3">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl 2xl:text-5xl 3xl:text-6xl font-serif text-[#222222] font-semibold tracking-tight">
                    {displayName}
                  </h1>
                  {artisan.isVerified && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 lg:px-3 lg:py-1 rounded-full text-[11px] lg:text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-emerald-700" />
                      <span>{dict.artisan_detail?.verified_artisan || (isAr ? "حرفي موثق" : "Verified Artisan")}</span>
                    </span>
                  )}
                </div>

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 lg:gap-6 text-xs sm:text-sm lg:text-base text-charcoal/70 pt-0.5 lg:pt-1">
                  {artisan.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-charcoal/50 shrink-0" />
                      <span>{artisan.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-amber-500 fill-amber-400 shrink-0" />
                    <span className="font-semibold text-primary">{avgRating}</span>
                    <span className="text-charcoal/50 font-normal">
                      ({totalReviews > 0 ? `${totalReviews} ${isAr ? "تقييم" : "reviews"}` : `${totalSales} ${dict.artisan_detail?.sales || (isAr ? "مبيعات" : "Sales")}`})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-charcoal/60">
                    <Clock className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-charcoal/40 shrink-0" />
                    <span>
                      {yearsExp} {yearsExp === 1 ? (isAr ? "سنة خبرة" : "Yr Mastery") : (isAr ? "سنوات خبرة" : "Yrs Mastery")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center justify-center sm:justify-start md:justify-end gap-2.5 lg:gap-3.5 pb-1">
              {/* Follow Button */}
              <button
                onClick={handleFollow}
                disabled={isPending}
                className={cn(
                  "h-10 sm:h-11 lg:h-12 px-5 sm:px-6 lg:px-8 rounded-full text-xs sm:text-sm lg:text-base font-semibold transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95 text-white",
                  isFollowing ? "bg-emerald-700 hover:bg-emerald-800" : ""
                )}
                style={!isFollowing ? {
                  backgroundColor: brandColor,
                  boxShadow: `0 8px 25px -4px ${brandColor}40`
                } : undefined}
              >
                {isFollowing ? (
                  <>
                    <Check className="w-4 h-4 lg:w-5 lg:h-5" />
                    <span>{dict.artisan_detail?.following || (isAr ? "تتابع المتجر" : "Following")}</span>
                  </>
                ) : (
                  <>
                    <Heart className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                    <span>{isPending ? (dict.artisan_detail?.wait || "...") : (dict.artisan_detail?.follow_studio || (isAr ? "متابعة المتجر" : "Follow Shop"))}</span>
                  </>
                )}
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                aria-label="Share"
                className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-full border bg-white text-charcoal/70 hover:text-primary flex items-center justify-center transition-all shadow-xs active:scale-90"
                style={{ borderColor: `${brandColor}35` }}
              >
                <Share2 className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            </div>
          </div>

          {/* Bio Quote */}
          {artisan.bio && (
            <div className="mt-5 lg:mt-7 2xl:mt-8 pt-5 lg:pt-6 2xl:pt-8 border-t border-primary/5 flex items-start gap-3">
              <div 
                className="w-1 self-stretch rounded-full shrink-0 min-h-[24px]"
                style={{ backgroundColor: brandColor }}
              />
              <p className="text-sm sm:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-charcoal/75 font-serif italic max-w-2xl lg:max-w-3xl xl:max-w-4xl 2xl:max-w-5xl leading-relaxed whitespace-pre-wrap">
                &ldquo;{artisan.bio}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Shop Catalog Section */}
        <section className="mt-8 lg:mt-12 2xl:mt-16">
          {/* Section Header & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-6 border-b border-primary/10 gap-4 mb-8 lg:mb-10 2xl:mb-12">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl 2xl:text-5xl font-serif text-[#222222] font-semibold">
                  {dict.artisan_detail?.in_the_studio || (isAr ? "معروضات المتجر" : "In the Shop")}
                </h2>
                <span 
                  className="inline-flex items-center px-2.5 py-0.5 lg:px-3 lg:py-1 2xl:px-3.5 2xl:py-1.5 rounded-full text-xs lg:text-sm 2xl:text-base font-semibold transition-colors"
                  style={{ backgroundColor: `${brandColor}18`, color: brandColor }}
                >
                  {filteredProducts.length}
                </span>
              </div>
              <p className="text-xs sm:text-sm lg:text-base 2xl:text-lg text-charcoal/60 mt-1 2xl:mt-2">
                {dict.artisan_detail?.vault_exploring || (isAr ? "استكشف قطعاً فريدة مصنوعة يدوياً بحرفية مصرية أصيلة." : "Exploring the collection of handcrafted pieces.")}
              </p>
            </div>

            {/* Filter Pill Tabs */}
            <div className="flex items-center gap-2 lg:gap-3 2xl:gap-3.5 shrink-0">
              <button
                onClick={() => setFilter('all')}
                className={cn(
                  "px-3.5 py-1.5 lg:px-5 lg:py-2 2xl:px-6 2xl:py-2.5 rounded-full text-xs lg:text-sm 2xl:text-base font-medium transition-all",
                  filter === 'all'
                    ? "text-white shadow-xs"
                    : "bg-white border border-primary/10 text-charcoal/70 hover:text-primary hover:border-primary/25"
                )}
                style={filter === 'all' ? {
                  backgroundColor: brandColor,
                  borderColor: brandColor,
                  boxShadow: `0 8px 20px -4px ${brandColor}35`
                } : undefined}
              >
                {isAr ? "الكل" : "All"} ({products.length})
              </button>
              <button
                onClick={() => setFilter('available')}
                className={cn(
                  "px-3.5 py-1.5 lg:px-5 lg:py-2 2xl:px-6 2xl:py-2.5 rounded-full text-xs lg:text-sm 2xl:text-base font-medium transition-all",
                  filter === 'available'
                    ? "text-white shadow-xs"
                    : "bg-white border border-primary/10 text-charcoal/70 hover:text-primary hover:border-primary/25"
                )}
                style={filter === 'available' ? {
                  backgroundColor: brandColor,
                  borderColor: brandColor,
                  boxShadow: `0 8px 20px -4px ${brandColor}35`
                } : undefined}
              >
                {dict.artisan_detail?.available || (isAr ? "متاح حالياً" : "Available")} ({availableProducts.length})
              </button>
              {soldOutProducts.length > 0 && (
                <button
                  onClick={() => setFilter('soldout')}
                  className={cn(
                    "px-3.5 py-1.5 lg:px-5 lg:py-2 2xl:px-6 2xl:py-2.5 rounded-full text-xs lg:text-sm 2xl:text-base font-medium transition-all",
                    filter === 'soldout'
                      ? "text-white shadow-xs"
                      : "bg-white border border-primary/10 text-charcoal/70 hover:text-primary hover:border-primary/25"
                  )}
                  style={filter === 'soldout' ? {
                    backgroundColor: brandColor,
                    borderColor: brandColor,
                    boxShadow: `0 8px 20px -4px ${brandColor}35`
                  } : undefined}
                >
                  {dict.artisan_detail?.archive || (isAr ? "أرشيف الأعمال" : "Archive")} ({soldOutProducts.length})
                </button>
              )}
            </div>
          </div>

          {/* Products Grid: Responsive up to 6 columns on ultra-wide screens */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-6 gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-7 2xl:gap-7 3xl:gap-8">
              {filteredProducts.map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={{
                    ...product,
                    artisan: {
                      studioName: displayName,
                      user: artisan.user
                    }
                  }}
                  dict={dict}
                />
              ))}
            </div>
          ) : (
            <div className="py-16 sm:py-20 lg:py-28 text-center bg-white rounded-2xl lg:rounded-3xl border border-dashed border-primary/15 p-8 max-w-lg mx-auto">
              <Package className="w-10 h-10 lg:w-14 lg:h-14 text-primary/30 mx-auto mb-3" />
              <p className="text-sm lg:text-base font-medium text-charcoal/70">
                {dict.artisan_detail?.no_pieces || (isAr ? "لا توجد منتجات متوفرة حالياً في هذا القسم." : "No pieces available in this section.")}
              </p>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="mt-4 px-4 py-1.5 lg:px-5 lg:py-2 rounded-full text-xs lg:text-sm font-semibold transition-colors"
                  style={{
                    backgroundColor: `${brandColor}18`,
                    color: brandColor
                  }}
                >
                  {isAr ? "عرض جميع المنتجات" : "View all pieces"}
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      <Footer dict={dict} />
    </main>
  );
}
