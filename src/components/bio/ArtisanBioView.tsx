"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "react-qr-code";
import { 
  CheckCircle2, 
  MapPin, 
  ShoppingBag, 
  ExternalLink, 
  QrCode as QrIcon, 
  Share2, 
  ArrowRight, 
  X, 
  Copy, 
  Check,
  Sparkles,
  Store,
  Link as LinkIcon,
  Flame,
  Star,
  Palette
} from "lucide-react";
import { FaInstagram, FaFacebook, FaTiktok, FaPinterest } from "react-icons/fa6";
import { toast } from "react-hot-toast";
import { useCart } from "@/context/cart-context";
import { cn } from "@/lib/utils";

interface ProductItem {
  id: string;
  name: string;
  slug: string | null;
  price: number;
  images: string[];
  category: string;
  isFeatured?: boolean;
  stock?: number;
  badge?: string | null;
  views?: number;
  canPersonalize?: boolean;
  reviews?: { rating: number }[];
  orderItems?: { id: string }[];
  createdAt?: string | Date;
}

interface BioLinkItem {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  isFeatured: boolean;
  clicks: number;
}

interface ArtisanBioViewProps {
  artisan: {
    id: string;
    studioName: string | null;
    slug: string | null;
    bio: string | null;
    avatar: string | null;
    bannerImage: string | null;
    location: string | null;
    brandColor: string | null;
    isVerified: boolean;
    instagram: string | null;
    facebook: string | null;
    tiktok: string | null;
    pinterest?: string | null;
    phoneNumber: string | null;
    user: {
      name: string | null;
    };
    bioLinks: BioLinkItem[];
    products: ProductItem[];
  };
  lang: string;
}

export function ArtisanBioView({ artisan, lang }: ArtisanBioViewProps) {
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const { addToCart } = useCart();

  const isRtl = lang === "ar";
  const name = artisan.studioName || artisan.user.name || "Artisan";
  const brandColor = artisan.brandColor?.trim() || "#064E3B";
  const bioUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/bio/${artisan.slug || artisan.id}`
    : `https://giftisan.com/bio/${artisan.slug || artisan.id}`;

  // Smart Ranking Algorithm:
  // 1. Explicitly featured by artisan/admin (isFeatured === true)
  // 2. In-stock products prioritized over out-of-stock
  // 3. Sales volume (completed orders count)
  // 4. Rating & Reviews count
  // 5. Views
  // 6. Recency (createdAt desc)
  const rankedProducts = useMemo(() => {
    if (!artisan.products || artisan.products.length === 0) return [];

    return [...artisan.products].sort((a, b) => {
      // 1. Explicitly featured
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;

      // 2. In-stock vs out-of-stock
      const aInStock = (a.stock ?? 1) > 0 ? 1 : 0;
      const bInStock = (b.stock ?? 1) > 0 ? 1 : 0;
      if (aInStock !== bInStock) return bInStock - aInStock;

      // 3. Sales volume (orderItems)
      const aSales = a.orderItems?.length || 0;
      const bSales = b.orderItems?.length || 0;
      if (aSales !== bSales) return bSales - aSales;

      // 4. Reviews count
      const aReviews = a.reviews?.length || 0;
      const bReviews = b.reviews?.length || 0;
      if (aReviews !== bReviews) return bReviews - aReviews;

      // 5. Views
      const aViews = a.views || 0;
      const bViews = b.views || 0;
      if (aViews !== bViews) return bViews - aViews;

      // 6. Recency
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [artisan.products]);

  // Spotlight product: the #1 smart-ranked creation
  const featuredProduct = rankedProducts[0] || null;

  // Mini grid products: up to 4 products with MAXIMUM category and product-type variety
  // (Prevents duplicate categories or duplicate products like 2 combs & 2 bookmarks)
  const miniGridProducts = useMemo(() => {
    if (!featuredProduct) return rankedProducts.slice(0, 4);
    const pool = rankedProducts.filter((p) => p.id !== featuredProduct.id);

    const selected: ProductItem[] = [];
    const usedCategories = new Set<string>([featuredProduct.category].filter(Boolean));
    const usedNormalizedTitles = new Set<string>([featuredProduct.name.toLowerCase().trim()]);

    // Pass 1: Maximize diversity (unique categories and unique product titles)
    for (const p of pool) {
      if (selected.length >= 4) break;
      const cat = p.category;
      const title = p.name.toLowerCase().trim();
      if (cat && !usedCategories.has(cat) && !usedNormalizedTitles.has(title)) {
        selected.push(p);
        usedCategories.add(cat);
        usedNormalizedTitles.add(title);
      }
    }

    // Pass 2: If artisan has fewer than 4 categories, pick unique titles even if category was already seen
    if (selected.length < 4) {
      for (const p of pool) {
        if (selected.length >= 4) break;
        if (selected.some((s) => s.id === p.id)) continue;
        const title = p.name.toLowerCase().trim();
        if (!usedNormalizedTitles.has(title)) {
          selected.push(p);
          usedNormalizedTitles.add(title);
        }
      }
    }

    // Pass 3: Fill any remaining slots from the pool if catalog is very small
    if (selected.length < 4) {
      for (const p of pool) {
        if (selected.length >= 4) break;
        if (!selected.some((s) => s.id === p.id)) {
          selected.push(p);
        }
      }
    }

    return selected;
  }, [rankedProducts, featuredProduct]);

  // Smart Contextual Badge for Spotlight Hero Card
  const spotlightBadge = useMemo(() => {
    if (!featuredProduct) return null;
    const salesCount = featuredProduct.orderItems?.length || 0;
    const reviewCount = featuredProduct.reviews?.length || 0;
    const avgRating =
      reviewCount > 0
        ? featuredProduct.reviews!.reduce((acc, r) => acc + r.rating, 0) / reviewCount
        : 0;

    const isIgnored = (b?: string | null) => {
      if (!b) return true;
      const lower = b.trim().toLowerCase();
      return (
        ["handmade", "صناعة يدوية", "صنع يدوي", "best seller", "bestseller", "الأكثر طلباً", "الأكثر مبيعاً", "personalized", "personalizable", "مخصص", "مخصصة", "قابل للتخصيص", "قابلة للتخصيص", "custom", "customizable"].includes(lower) ||
        lower.startsWith("best seller") ||
        lower.startsWith("الأكثر مبيعاً") ||
        lower.startsWith("الأكثر طلباً")
      );
    };

    if (avgRating >= 4.5 && reviewCount > 0) {
      return {
        label: `${avgRating.toFixed(1)} ★ (${reviewCount})`,
        icon: "star",
        bg: "bg-gradient-to-r from-amber-500 to-amber-600",
      };
    }
    if (featuredProduct.badge && !isIgnored(featuredProduct.badge)) {
      return {
        label: featuredProduct.badge,
        icon: "sparkles",
        bg: "bg-[#064E3B]",
      };
    }
    if (featuredProduct.isFeatured) {
      return {
        label: isRtl ? "إصدار مميز" : "Spotlight",
        icon: "sparkles",
        bg: "bg-[#D97706]",
      };
    }
    return {
      label: isRtl ? "أحدث إبداع" : "New Arrival",
      icon: "sparkles",
      bg: "bg-[#064E3B]",
    };
  }, [featuredProduct, isRtl]);

  const handleLinkClick = async (linkId: string) => {
    try {
      fetch(`/api/bio-links/${linkId}/click`, { method: "POST" }).catch(() => {});
    } catch {}
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bioUrl);
    setCopied(true);
    toast.success(isRtl ? "تم نسخ الرابط!" : "Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: name,
          text: artisan.bio || `${name} on Giftisan`,
          url: bioUrl,
        });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF0] text-[#1F2937] flex flex-col items-center justify-between py-0 md:py-10 relative overflow-x-hidden font-sans selection:bg-[#064E3B] selection:text-white">
      {/* Background Soft Ambient Orbs */}
      <div 
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[140px] pointer-events-none" 
        style={{ backgroundColor: brandColor, opacity: 0.12 }}
      />
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container - Sleek Elevated Card on Desktop, Edge-to-Edge on Mobile */}
      <div className="w-full max-w-md md:rounded-[3rem] md:border md:border-[#064E3B]/10 md:shadow-2xl md:shadow-[#064E3B]/10 bg-white/70 md:backdrop-blur-xl flex flex-col items-center justify-between pb-8 relative z-10">
        <main className="w-full px-4 pt-6 pb-4 flex flex-col items-center gap-5">
          
          {/* Top Utility Bar */}
          <div className="w-full flex justify-between items-center px-1">
            <Link 
              href={`/${lang}`}
              className="flex items-center gap-2 text-xs font-bold text-[#064E3B] hover:text-[#064E3B]/80 transition bg-white/90 backdrop-blur-md ps-1.5 pe-3.5 py-1 rounded-full border border-[#064E3B]/15 shadow-sm active:scale-95 group"
            >
              <div className="relative w-5 h-5 rounded-full overflow-hidden shrink-0 shadow-xs border border-[#064E3B]/10">
                <Image
                  src="/icon.png"
                  alt="Giftisan"
                  fill
                  className="object-cover group-hover:scale-110 transition duration-300"
                  sizes="20px"
                />
              </div>
              <span className="font-heading font-extrabold tracking-tight">Giftisan</span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowQR(true)}
                className="p-2 rounded-full bg-white/80 hover:bg-white text-charcoal hover:text-[#064E3B] border border-[#064E3B]/15 shadow-sm transition active:scale-95"
                title={isRtl ? "رمز QR" : "Show QR Code"}
              >
                <QrIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="p-2 rounded-full bg-white/80 hover:bg-white text-charcoal hover:text-[#064E3B] border border-[#064E3B]/15 shadow-sm transition active:scale-95"
                title={isRtl ? "مشاركة" : "Share Bio"}
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Profile Card Header */}
          <div className="flex flex-col items-center text-center w-full mt-2">
            <div className="relative group">
              <div 
                className="absolute -inset-1 rounded-full blur-md opacity-70 transition duration-500 group-hover:opacity-100" 
                style={{ backgroundColor: brandColor }}
              />
              <div 
                className="relative w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white ring-2"
                style={{ borderColor: `${brandColor}40` }}
              >
                {artisan.avatar ? (
                  <Image
                    src={artisan.avatar}
                    alt={name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold bg-cream text-[#064E3B]">
                    {name.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            <h1 className="mt-4 text-2xl font-heading font-black tracking-tight text-[#064E3B] flex items-center justify-center gap-1.5">
              {name}
              {artisan.isVerified && (
                <CheckCircle2 className="w-5 h-5 text-[#D97706] fill-[#D97706]/15 shrink-0" />
              )}
            </h1>

            {artisan.location && (
              <p className="text-xs text-charcoal/60 font-medium flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-[#064E3B]" />
                {artisan.location}
              </p>
            )}

            {artisan.bio && (
              <p className="text-xs text-charcoal/80 max-w-sm mt-2.5 leading-relaxed font-medium px-2 whitespace-pre-wrap">
                {artisan.bio}
              </p>
            )}

            {/* Social Accounts Bar */}
            <div className="flex items-center gap-3 mt-4">
              {artisan.instagram && (
                <a
                  href={artisan.instagram.startsWith("http") ? artisan.instagram : `https://instagram.com/${artisan.instagram}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-full bg-white border border-[#064E3B]/10 shadow-sm text-pink-600 hover:scale-110 transition active:scale-95"
                  title="Instagram"
                >
                  <FaInstagram className="w-4 h-4" />
                </a>
              )}
              {artisan.tiktok && (
                <a
                  href={artisan.tiktok.startsWith("http") ? artisan.tiktok : `https://tiktok.com/@${artisan.tiktok}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-full bg-white border border-[#064E3B]/10 shadow-sm text-slate-800 hover:scale-110 transition active:scale-95"
                  title="TikTok"
                >
                  <FaTiktok className="w-4 h-4" />
                </a>
              )}
              {artisan.facebook && (
                <a
                  href={artisan.facebook.startsWith("http") ? artisan.facebook : `https://facebook.com/${artisan.facebook}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-full bg-white border border-[#064E3B]/10 shadow-sm text-blue-600 hover:scale-110 transition active:scale-95"
                  title="Facebook"
                >
                  <FaFacebook className="w-4 h-4" />
                </a>
              )}
              {artisan.pinterest && (
                <a
                  href={artisan.pinterest.startsWith("http") ? artisan.pinterest : `https://pinterest.com/${artisan.pinterest}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-full bg-white border border-[#064E3B]/10 shadow-sm text-red-600 hover:scale-110 transition active:scale-95"
                  title="Pinterest"
                >
                  <FaPinterest className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Featured Product Spotlight Card (Smart Ranked Hero) */}
          {featuredProduct && (
            <div className="w-full bg-white border border-[#D97706]/35 rounded-2xl p-3.5 shadow-md relative overflow-hidden group">
              {spotlightBadge && (
                <div className={cn(
                  "absolute top-3 end-3 z-10 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm",
                  spotlightBadge.bg
                )}>
                  {spotlightBadge.icon === "fire" && <Flame className="w-3 h-3 text-amber-200 fill-amber-200" />}
                  {spotlightBadge.icon === "star" && <Star className="w-3 h-3 text-yellow-200 fill-yellow-200" />}
                  {spotlightBadge.icon === "palette" && <Palette className="w-3 h-3 text-white" />}
                  {spotlightBadge.icon === "sparkles" && <Sparkles className="w-3 h-3 text-white" />}
                  <span>{spotlightBadge.label}</span>
                </div>
              )}

              <div className="flex gap-3.5 items-center">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-cream shrink-0 border border-primary/10">
                  <Image
                    src={featuredProduct.images[0] || "/icon.png"}
                    alt={featuredProduct.name}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-300"
                    unoptimized
                  />
                </div>

                {/* pe-24 prevents title text from colliding into the Spotlight badge */}
                <div className="flex flex-col justify-between flex-1 min-w-0 pe-24">
                  <div>
                    <h3 className="text-sm font-bold text-[#064E3B] truncate" title={featuredProduct.name}>
                      {featuredProduct.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-[#D97706] font-bold">
                        {featuredProduct.price} EGP
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <Link
                      href={`/${lang}/products/${featuredProduct.slug || featuredProduct.id}`}
                      className="flex-1 bg-cream hover:bg-cream/80 text-[#064E3B] border border-[#064E3B]/15 text-xs py-1.5 rounded-xl text-center font-bold transition active:scale-95"
                    >
                      {isRtl ? "التفاصيل" : "View"}
                    </Link>
                    {(featuredProduct.stock ?? 1) > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          addToCart(featuredProduct);
                          toast.success(isRtl ? "تمت الإضافة للسلة!" : "Added to bag!");
                        }}
                        className="text-white text-xs px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1 shadow-sm active:scale-95"
                        style={{ backgroundColor: brandColor }}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{isRtl ? "شراء" : "Buy"}</span>
                      </button>
                    ) : (
                      <span className="bg-gray-100 text-gray-400 text-xs px-2.5 py-1.5 rounded-xl font-bold cursor-not-allowed">
                        {isRtl ? "نفدت" : "Sold out"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Core Action Links Stack */}
          <div className="w-full flex flex-col gap-2.5 mt-1">
            {/* Primary Action 1: Shop Full Collection with dynamic count */}
            <Link
              href={`/${lang}/artisans/${artisan.slug || artisan.id}`}
              className="w-full p-3.5 sm:p-4 rounded-2xl text-white flex items-center justify-between transition group shadow-md active:scale-[0.99]"
              style={{
                backgroundColor: brandColor,
                boxShadow: `0 8px 25px -4px ${brandColor}40`
              }}
            >
              <span className="flex items-center gap-3 text-sm font-bold truncate">
                <span className="p-2.5 rounded-xl bg-white/15 text-white group-hover:scale-110 transition shrink-0">
                  <Store className="w-4 h-4" />
                </span>
                <span className="truncate">
                  {isRtl 
                    ? `تصفح متجري الكامل ${artisan.products?.length > 0 ? `(${artisan.products.length} قطعة)` : ""}` 
                    : `Shop My Full Collection ${artisan.products?.length > 0 ? `(${artisan.products.length} Items)` : ""}`}
                </span>
              </span>
              <ArrowRight className="w-4 h-4 text-white/70 group-hover:text-white group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180 transition shrink-0" />
            </Link>

            {/* Custom Bio Links configured by the artisan */}
            {artisan.bioLinks?.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleLinkClick(link.id)}
                className={cn(
                  "w-full p-3.5 sm:p-4 rounded-2xl flex items-center justify-between transition group shadow-sm active:scale-[0.99]",
                  link.isFeatured
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold hover:brightness-105"
                    : "bg-white hover:bg-cream/60 border border-[#064E3B]/15 text-[#064E3B] font-bold hover:border-[#064E3B]/30"
                )}
              >
                <span className="flex items-center gap-3 text-sm font-bold truncate">
                  <span className={cn(
                    "p-2.5 rounded-xl shrink-0 group-hover:scale-110 transition",
                    link.isFeatured ? "bg-white/20 text-white" : "bg-[#064E3B]/10 text-[#064E3B]"
                  )}>
                    <LinkIcon className="w-4 h-4" />
                  </span>
                  <span className="truncate">{link.title}</span>
                </span>
                <ExternalLink className={cn(
                  "w-4 h-4 shrink-0 transition",
                  link.isFeatured ? "text-white/80" : "text-[#064E3B]/50 group-hover:text-[#064E3B]"
                )} />
              </a>
            ))}
          </div>

          {/* Mini Product Showcase (Top 4) */}
          {miniGridProducts.length > 0 && (
            <div className="w-full mt-2">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal/60">
                  {isRtl ? "أحدث الإبداعات اليدوية" : "Top Handcrafted Items"}
                </h2>
                <Link 
                  href={`/${lang}/artisans/${artisan.slug || artisan.id}`}
                  className="text-xs font-bold hover:underline"
                  style={{ color: brandColor }}
                >
                  {isRtl ? "عرض الكل" : "View all"}
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {miniGridProducts.map((prod) => (
                  <div 
                    key={prod.id}
                    className="bg-white border border-[#064E3B]/10 rounded-2xl p-3 flex flex-col justify-between hover:border-[#064E3B]/30 hover:shadow-md transition group shadow-xs"
                  >
                    <div>
                      <div className="relative aspect-square rounded-xl overflow-hidden bg-cream mb-2 border border-primary/5">
                        <Image
                          src={prod.images[0] || "/icon.png"}
                          alt={prod.name}
                          fill
                          className="object-cover group-hover:scale-105 transition duration-300"
                          unoptimized
                        />
                        {(prod.stock ?? 1) <= 0 && (
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="bg-white/95 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                              {isRtl ? "نفدت الكمية" : "Sold out"}
                            </span>
                          </div>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-charcoal line-clamp-2 min-h-[2rem] leading-snug">
                        {prod.name}
                      </h4>
                      <p className="text-xs font-bold text-[#D97706] mt-1">
                        {prod.price} EGP
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2.5">
                      <Link
                        href={`/${lang}/products/${prod.slug || prod.id}`}
                        className="flex-1 text-center text-[11px] font-bold bg-cream hover:bg-cream/80 text-[#064E3B] border border-[#064E3B]/15 py-1.5 rounded-xl transition active:scale-95"
                      >
                        {isRtl ? "عرض" : "View"}
                      </Link>
                      {(prod.stock ?? 1) > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            addToCart(prod);
                            toast.success(isRtl ? "تمت الإضافة للسلة!" : "Added to bag!");
                          }}
                          className="p-1.5 bg-[#064E3B] hover:bg-[#064E3B]/90 text-white rounded-xl shadow-xs transition active:scale-95 shrink-0"
                          title={isRtl ? "إضافة للسلة" : "Add to Bag"}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span 
                          className="p-1.5 bg-gray-100 text-gray-400 rounded-xl cursor-not-allowed shrink-0"
                          title={isRtl ? "نفدت الكمية" : "Sold out"}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* Footer Branding Bar */}
        <footer className="z-10 flex flex-col items-center gap-2 mt-4 text-center px-4 w-full">
          <Link 
            href={`/${lang}`}
            className="flex items-center gap-1.5 text-xs text-charcoal/70 hover:text-[#064E3B] transition bg-white px-4 py-2 rounded-full border border-[#064E3B]/15 shadow-sm active:scale-95"
          >
            <span>Powered by</span>
            <span className="font-bold text-[#064E3B]">Giftisan</span>
          </Link>
          <p className="text-[10px] text-charcoal/50 font-medium">
            Discover unique handmade gifts directly from local Egyptian artisans.
          </p>
        </footer>
      </div>

      {/* Modal: Downloadable QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 bg-primary/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-primary/10 rounded-[2.5rem] p-6 max-w-xs w-full flex flex-col items-center text-center shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              type="button"
              onClick={() => setShowQR(false)}
              className="absolute top-4 right-4 text-charcoal/40 hover:text-charcoal p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-full bg-[#064E3B]/10 flex items-center justify-center text-[#064E3B] mb-3">
              <QrIcon className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-[#064E3B]">{name}</h3>
            <p className="text-xs text-charcoal/60 mt-0.5 mb-4">
              Scan to view bio links & shop handmade creations
            </p>

            <div id="artisan-qr-container" className="p-4 bg-cream rounded-2xl shadow-inner border border-primary/10 mb-4">
              <QRCode
                value={bioUrl}
                size={180}
                bgColor="#FDFCF0"
                fgColor="#064E3B"
                level="H"
              />
            </div>

            <div className="w-full flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2.5 px-4 rounded-xl bg-[#064E3B] hover:bg-[#064E3B]/90 text-xs font-bold text-white flex items-center justify-center gap-2 transition shadow active:scale-95"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                {copied ? (isRtl ? "تم النسخ!" : "Copied!") : (isRtl ? "نسخ الرابط" : "Copy Link")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
