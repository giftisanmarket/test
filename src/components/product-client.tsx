"use client";

import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useRouter } from "next/navigation";
import { Heart, Share2, Star, Truck, ShieldCheck, Clock, MapPin, ArrowRight, ArrowLeft, ChevronRight, CheckCircle2, Sparkles, Camera, ImagePlus, X, Video, Radio, MessageSquare, XCircle, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/cart-context";
import { useFavorites } from "@/context/favorites-context";
import { addReview, trackProductView } from "@/lib/actions";
import { useSession } from "next-auth/react";
import { useIsNative, triggerHaptic, shareNativeContent } from "@/lib/native";
import { BespokeImage } from "./bespoke-image";
import { ContactArtisanButton } from "./contact-artisan-button";
import Image from "next/image";
import { toast } from "react-hot-toast";

export function ProductClient({ product, relatedProducts, dict, lang, isAdmin, isOwner }: { product: any, relatedProducts: any[], dict: any, lang: string, isAdmin?: boolean, isOwner?: boolean }) {
  const router = useRouter();
  const isNative = useIsNative();
  const isAr = lang === "ar" || dict?.common?.home === "الرئيسية";
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { data: session } = useSession();
  const [selectedImage, setSelectedImage] = useState(0);
  const [personalization, setPersonalization] = useState("");
  const [customImage, setCustomImage] = useState("");
  const [customImageError, setCustomImageError] = useState(false);
  const [isCompressingCustomImage, setIsCompressingCustomImage] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "artisan" | "reviews">("details");
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [personalizationError, setPersonalizationError] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const personalizationRef = useRef<HTMLTextAreaElement>(null);
  const customImageRef = useRef<HTMLDivElement>(null);

  // Extract unique options from variants
  const options = product.variants?.reduce((acc: any[], v: any) => {
    if (v.options) {
      // Safety: Handle both object and stringified JSON
      const vOptions = typeof v.options === 'string' ? JSON.parse(v.options) : v.options;
      Object.entries(vOptions).forEach(([name, value]) => {
        const existing = acc.find(o => o.name === name);
        if (existing) {
          if (!existing.values.includes(value)) existing.values.push(value as string);
        } else {
          acc.push({ name, values: [value as string] });
        }
      });
    }
    return acc;
  }, []) || [];

  useEffect(() => {
    if (options.length > 0 && Object.keys(selectedOptions).length === 0) {
      const initial: Record<string, string> = {};
      options.forEach((opt: any) => {
        initial[opt.name] = opt.values[0];
      });
      setSelectedOptions(initial);
    }
  }, [options]);

  useEffect(() => {
    if (product.variants?.length > 0) {
      const match = product.variants.find((v: any) => {
        const vOptions = typeof v.options === 'string' ? JSON.parse(v.options) : v.options;
        return Object.entries(selectedOptions).every(([name, val]) => vOptions[name] === val);
      });
      setSelectedVariant(match || null);
    }
  }, [selectedOptions, product.variants]);

  useEffect(() => {
    if (typeof window !== "undefined" && product?.id) {
      try {
        // Legacy ID list for backwards compatibility
        const stored = JSON.parse(localStorage.getItem("giftisan_recently_viewed") || "[]");
        const updated = [product.id, ...stored.filter((id: string) => id !== product.id)].slice(0, 10);
        localStorage.setItem("giftisan_recently_viewed", JSON.stringify(updated));

        // Rich browsing history item for Etsy-style continue browsing shelf
        const storedRich = JSON.parse(localStorage.getItem("giftisan_recent_views_v1") || "[]");
        const richItem = {
          id: product.id,
          slug: product.slug || null,
          name: product.name,
          price: product.price,
          category: product.category || null,
          image: product.images?.[0] || "/placeholder.jpg",
          artisanName: product.artisan?.studioName || product.artisan?.user?.name || null,
          viewedAt: Date.now(),
        };
        const updatedRich = [richItem, ...storedRich.filter((item: any) => item.id !== product.id)].slice(0, 16);
        localStorage.setItem("giftisan_recent_views_v1", JSON.stringify(updatedRich));

        // Category affinity increment for personalized feed ranking
        if (product.category) {
          const catKey = product.category.toLowerCase().trim();
          const storedAffinities = JSON.parse(localStorage.getItem("giftisan_category_affinities_v1") || "{}");
          storedAffinities[catKey] = (storedAffinities[catKey] || 0) + 1;
          localStorage.setItem("giftisan_category_affinities_v1", JSON.stringify(storedAffinities));
        }
      } catch {}
    }
  }, [product]);

  const isOptionValueAvailable = (optionName: string, value: string) => {
    if (!product.variants || product.variants.length === 0) return true;
    
    // Check if there is any variant that matches the currently selected options 
    // PLUS the value we are checking for this specific option
    return product.variants.some((v: any) => {
      const vOptions = typeof v.options === 'string' ? JSON.parse(v.options) : v.options;
      
      // We only care about matching the other selected options
      const matchesOtherSelections = Object.entries(selectedOptions).every(([name, val]) => {
        if (name === optionName) return true; // Skip the one we are checking
        return vOptions[name] === val;
      });

      return matchesOtherSelections && vOptions[optionName] === value && v.stock > 0;
    });
  };

  const displayPrice = selectedVariant ? selectedVariant.price : product.price;
  const displayStock = selectedVariant ? selectedVariant.stock : product.stock;

  useEffect(() => {
    if (product.id) {
      trackProductView(product.id);
    }
  }, [product.id]);
  
  const isVideo = (url: string) => {
    if (!url) return false;
    return url.includes('video/upload') || url.match(/\.(mp4|webm|ogg|mov|quicktime)/i) || url.startsWith('data:video');
  };
  

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new (window as any).Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_SIZE = 1000;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const compressedDataUrl = canvas.toDataURL(outType, 0.8);
          setReviewImages(prev => [...prev, compressedDataUrl].slice(0, 4));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    setIsSubmitting(true);
    const res = await addReview({
      productId: product.id,
      userId: session.user.id as string,
      rating: newReview.rating,
      comment: newReview.comment,
      images: reviewImages
    });

    if (res.success) {
      toast.success(dict.product.review_posted_success, {
        icon: <Sparkles className="w-5 h-5 text-accent" />,
      });
      setNewReview({ rating: 5, comment: "" });
      setReviewImages([]);
      router.refresh();
      setIsSubmitting(false);
    } else {
      setIsSubmitting(false);
      toast.error(res.error || "Failed to post review", {
        icon: <X className="w-5 h-5 text-red-500" />,
      });
    }
  };

  const handleShare = async () => {
    const shared = await shareNativeContent({
      title: `${product.name} | Giftisan`,
      text: `I found this incredible '${product.name}' by ${product.artisan?.studioName || product.artisan?.user?.name || "Egyptian Artisan"} on Giftisan. Check it out!`,
      url: window.location.href,
      dialogTitle: dict?.product?.share || "Share Gift",
    });

    if (!shared) {
      toast.success(dict?.product?.share_copied || (isAr ? "تم نسخ الرابط بنجاح" : "Link copied to clipboard"), {
        icon: <CheckCircle2 className="w-5 h-5 text-accent" />,
      });
    }
  };

  const executeAddToCart = (skipOpen = false) => {
    if (product.status !== "APPROVED" || product.artisan?.status !== "APPROVED") {
      toast.error(
        lang === "ar"
          ? "هذا المنتج في وضع المعاينة فقط ولا يمكن شراؤه حتى تتم الموافقة عليه وعلى المتجر."
          : "This product is in preview mode only and cannot be ordered until both product and shop are approved."
      );
      return false;
    }
    if (product.canPersonalize && !personalization.trim()) {
      setPersonalizationError(true);
      personalizationRef.current?.focus();
      toast.error(lang === 'ar' ? "يرجى إدخال تفاصيل التخصيص أولاً" : "Please provide personalization details first");
      return false;
    }
    if (product.requiresClientImage && !customImage) {
      setCustomImageError(true);
      customImageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.error(dict.product.image_upload_required_err || (lang === 'ar' ? "يرجى رفع الصورة المطلوبة قبل الشراء" : "Please upload the required photo before purchasing"));
      return false;
    }
    if (options.length > 0 && !selectedVariant) {
       toast.error("Please select a variation first");
       return false;
    }
    
    const productToCart = {
      ...product,
      price: displayPrice,
      image: selectedVariant?.image || product.images[0],
      stock: displayStock,
      variantId: selectedVariant?.id || null,
      variantName: selectedVariant?.name || null,
      customImage: customImage || undefined
    };
    addToCart(productToCart, personalization.trim(), skipOpen, customImage || undefined);
    triggerHaptic("medium");
    return true;
  };

  return (
    <main className={cn("min-h-screen bg-cream overflow-x-hidden", isNative ? "pb-32" : "pb-20 md:pb-0")}>
      <Navbar dict={dict} />

      <div className={cn(
        "w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 md:px-8 lg:px-12 2xl:px-12 3xl:px-16",
        isNative ? "pt-2.5 pb-6 md:py-12 2xl:py-16" : "py-6 md:py-12 2xl:py-16"
      )}>
        {/* Navigation Breadcrumb & Back Action (Hidden on Native Mobile where the top bar handles it) */}
        <div className={cn("mb-4 md:mb-6 flex items-center justify-between gap-4", isNative && "hidden sm:flex")}>
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push(`/${lang}/products`);
              }
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold text-charcoal/80 hover:text-primary hover:bg-white transition-all active:scale-95 border border-primary/10 bg-white/70 shadow-2xs group cursor-pointer"
          >
            <ArrowLeft className={cn("w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5", (lang === "ar" || isAr) && "rotate-180 group-hover:translate-x-0.5")} />
            <span>{dict?.common?.back || (lang === "ar" || isAr ? "رجوع" : "Back")}</span>
          </button>

          <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-charcoal/60 truncate">
            <Link href={`/${lang}`} className="hover:text-primary transition-colors">
              {dict?.common?.home || (lang === "ar" || isAr ? "الرئيسية" : "Home")}
            </Link>
            <ChevronRight className={cn("w-3 h-3 text-charcoal/40 shrink-0", (lang === "ar" || isAr) && "rotate-180")} />
            <Link href={`/${lang}/products`} className="hover:text-primary transition-colors">
              {dict?.common?.explore || (lang === "ar" || isAr ? "المنتجات" : "Products")}
            </Link>
            {product.category && (
              <>
                <ChevronRight className={cn("w-3 h-3 text-charcoal/40 shrink-0", (lang === "ar" || isAr) && "rotate-180")} />
                <Link
                  href={`/${lang}/category/${product.category.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}`}
                  className="hover:text-primary transition-colors truncate"
                >
                  {product.category}
                </Link>
              </>
            )}
            <ChevronRight className={cn("w-3 h-3 text-charcoal/40 shrink-0", (lang === "ar" || isAr) && "rotate-180")} />
            <span className="text-primary font-medium truncate max-w-[200px] md:max-w-[320px]">
              {product.name}
            </span>
          </nav>
        </div>

        {/* Status Banner for Shop Not Approved */}
        {product.artisan?.status !== "APPROVED" && (isAdmin || isOwner) && (
          <div className={cn(
            "mb-8 md:mb-12 p-6 md:p-8 rounded-[2rem] border-2 shadow-sm flex flex-col md:flex-row items-center gap-6 md:gap-8",
            product.artisan?.status === "REJECTED" ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"
          )}>
            <div className={cn(
              "w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center shrink-0 shadow-lg",
              product.artisan?.status === "REJECTED" ? "bg-red-500 text-white" : "bg-amber-500 text-white"
            )}>
              {product.artisan?.status === "REJECTED" ? <XCircle className="w-6 h-6 md:w-8 md:h-8" /> : <Clock className="w-6 h-6 md:w-8 md:h-8" />}
            </div>
            <div className="flex-1 text-center md:text-start">
              <h3 className={cn(
                "text-xl md:text-2xl font-heading font-black mb-2 tracking-tight",
                product.artisan?.status === "REJECTED" ? "text-red-700" : "text-amber-700"
              )}>
                {product.artisan?.status === "REJECTED" 
                  ? (lang === 'ar' ? "متجر الحرفي غير مقبول" : "Shop Not Approved") 
                  : (lang === 'ar' ? "متجر الحرفي قيد المراجعة" : "Shop Under Review")}
              </h3>
              <p className="text-sm md:text-base text-charcoal/60 leading-relaxed font-bold">
                {product.artisan?.status === "REJECTED" 
                  ? (lang === 'ar' ? "تم رفض متجر الحرفي. لن يظهر هذا المنتج للعملاء في الموقع أو محركات البحث حتى تتم الموافقة على المتجر." : "The artisan shop has been rejected. This product will not be visible to clients or indexed by search engines until the shop is approved.")
                  : (lang === 'ar' ? "متجر الحرفي قيد المراجعة حالياً. لن يظهر هذا المنتج للعملاء في الموقع أو محركات البحث حتى تتم الموافقة على المتجر." : "The artisan shop is currently under review. This product will remain hidden from clients and search engines until the shop is approved.")
                }
              </p>
            </div>
            {isAdmin && (
               <Link href="/admin/users" className="px-8 py-4 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-xl hover:bg-primary-light transition-all">
                 {dict.admin.overview}
               </Link>
            )}
          </div>
        )}

        {/* Status Banner for Product Status (when shop is approved but product is pending/rejected) */}
        {product.status !== "APPROVED" && product.artisan?.status === "APPROVED" && (isAdmin || isOwner) && (
          <div className={cn(
            "mb-8 md:mb-12 p-6 md:p-8 rounded-[2rem] border-2 shadow-sm flex flex-col md:flex-row items-center gap-6 md:gap-8",
            product.status === "REJECTED" ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"
          )}>
            <div className={cn(
              "w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center shrink-0 shadow-lg",
              product.status === "REJECTED" ? "bg-red-500 text-white" : "bg-amber-500 text-white"
            )}>
              {product.status === "REJECTED" ? <XCircle className="w-6 h-6 md:w-8 md:h-8" /> : <Clock className="w-6 h-6 md:w-8 md:h-8" />}
            </div>
            <div className="flex-1 text-center md:text-start">
              <h3 className={cn(
                "text-xl md:text-2xl font-heading font-black mb-2 tracking-tight",
                product.status === "REJECTED" ? "text-red-700" : "text-amber-700"
              )}>
                {product.status === "REJECTED" ? dict.admin.rejected : dict.admin.pending}
              </h3>
              <p className="text-sm md:text-base text-charcoal/60 leading-relaxed font-bold">
                {product.status === "REJECTED" 
                  ? (lang === 'ar' ? "تم رفض هذا المنتج. يرجى مراجعة تفاصيل المنتج أو التواصل مع الإدارة." : "This product has been rejected. Please review the details or contact support.")
                  : (lang === 'ar' ? "هذا المنتج قيد المراجعة حالياً ولن يظهر للجمهور حتى يتم قبوله." : "This product is currently under review and won't be visible to the public until approved.")
                }
              </p>
            </div>
            {isAdmin && (
               <Link href="/admin/products" className="px-8 py-4 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-xl hover:bg-primary-light transition-all">
                 {dict.admin.overview}
               </Link>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8 md:gap-10 lg:gap-14 2xl:gap-16 3xl:gap-20 min-w-0">
          {/* Image Gallery */}
          <div className="space-y-6 min-w-0">
            <div className="relative group">
              <motion.div
                key={selectedVariant?.image || selectedImage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_e, { offset, velocity }) => {
                  if (product.images.length <= 1) return;
                  const swipePower = Math.abs(offset.x) * velocity.x;
                  if (swipePower < -10000 || offset.x < -50) {
                    setSelectedImage(prev => (prev === product.images.length - 1 ? 0 : prev + 1));
                    if (selectedVariant?.image) setSelectedVariant((prev: any) => prev ? { ...prev, image: null } : null);
                  } else if (swipePower > 10000 || offset.x > 50) {
                    setSelectedImage(prev => (prev === 0 ? product.images.length - 1 : prev - 1));
                    if (selectedVariant?.image) setSelectedVariant((prev: any) => prev ? { ...prev, image: null } : null);
                  }
                }}
                onClick={() => {
                  setLightboxIndex(selectedImage);
                  setIsLightboxOpen(true);
                }}
                className="relative aspect-[4/5] sm:aspect-square rounded-3xl overflow-hidden shadow-2xl bg-cream/30 cursor-zoom-in touch-pan-y select-none"
              >
                {isVideo(selectedVariant?.image || product.images[selectedImage]) ? (
                  <video
                    src={selectedVariant?.image || product.images[selectedImage]}
                    className="w-full h-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <BespokeImage
                    src={selectedVariant?.image || product.images[selectedImage]}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                )}
              </motion.div>

              {/* Slider Controls */}
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(prev => (prev === 0 ? product.images.length - 1 : prev - 1));
                    }}
                    className="absolute start-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/80 backdrop-blur shadow-lg hidden md:flex items-center justify-center text-primary xl:opacity-0 xl:group-hover:opacity-100 opacity-100 transition-all hover:bg-white z-10"
                  >
                    <ArrowRight className="w-6 h-6 rtl:rotate-0 ltr:rotate-180" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(prev => (prev === product.images.length - 1 ? 0 : prev + 1));
                    }}
                    className="absolute end-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/80 backdrop-blur shadow-lg hidden md:flex items-center justify-center text-primary xl:opacity-0 xl:group-hover:opacity-100 opacity-100 transition-all hover:bg-white z-10"
                  >
                    <ArrowRight className="w-6 h-6 rtl:rotate-180 ltr:rotate-0" />
                  </button>
                  
                  {/* Floating Frosted Dots Indicator */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 px-3 py-1 rounded-full bg-[#1F2937]/40 backdrop-blur-md shadow-xs">
                    {product.images.map((_: any, i: number) => (
                      <div
                        key={i}
                        className={cn(
                          "rounded-full transition-all duration-300",
                          selectedImage === i ? "bg-white w-4 h-1.5 shadow-xs" : "bg-white/50 w-1.5 h-1.5"
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 md:gap-4 overflow-x-auto pt-3 pb-4 px-2 -mx-2 custom-scrollbar scrollbar-hide" dir="ltr">
              {product.images.map((img: string, idx: number) => {
                const isSelected = selectedImage === idx && !selectedVariant?.image;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      triggerHaptic("light");
                      setSelectedImage(idx);
                      // Clear variant image override when user manually clicks a gallery thumbnail
                      if (selectedVariant?.image) {
                        setSelectedVariant((prev: any) => prev ? { ...prev, image: null } : null);
                      }
                    }}
                    className={cn(
                      "relative w-20 md:w-24 aspect-square rounded-2xl overflow-hidden border-2 transition-all shrink-0 shadow-sm",
                      isSelected
                        ? "border-primary ring-2 ring-primary/20 scale-105 shadow-md"
                        : "border-transparent opacity-65 hover:opacity-100 hover:scale-102"
                    )}
                  >
                    {isVideo(img) ? (
                      <div className="relative w-full h-full">
                        <video src={img} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
                          <div className="w-8 h-8 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center shadow-md">
                            <Video className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <BespokeImage src={img} alt="" fill className="object-cover" sizes="96px" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col min-w-0">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-accent font-bold tracking-widest uppercase text-xs md:text-sm mb-1.5">{dict.common.categories_list?.[product.category.toLowerCase()] || product.category}</p>
                <h1 className="text-2xl sm:text-4xl md:text-5xl 2xl:text-5xl 3xl:text-6xl font-heading font-bold text-primary mb-3 md:mb-4 2xl:mb-6 leading-tight break-words">
                  {product.name}
                </h1>
                <div className="flex items-center gap-2 mb-4 md:mb-6">
                  <div className="flex text-accent">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 md:w-4 md:h-4 fill-current" />
                    ))}
                  </div>
                  <span className="text-xs md:text-sm text-charcoal/40 font-medium">({product.reviews?.length || 0} {dict.product.reviews})</span>
                </div>
              </div>
              <div className={cn("flex gap-2 shrink-0", isNative && "hidden")}>
                <button
                  onClick={handleShare}
                  className="p-2.5 md:p-3 border border-primary/10 rounded-full hover:bg-white transition-all text-primary group"
                >
                  <Share2 className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>


            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 mb-6 md:mb-8">
              <p className="text-2xl sm:text-3xl font-heading font-bold text-primary">
                {dict.product.currency} {displayPrice}.00
              </p>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  (displayStock || 0) > 5 ? "bg-green-500" : (displayStock || 0) > 0 ? "bg-orange-500" : "bg-red-500"
                )} />
                <span className={cn(
                  "text-[10px] sm:text-xs font-black uppercase tracking-widest",
                  (displayStock || 0) > 0 ? "text-primary/60" : "text-red-500"
                )}>
                  {(displayStock || 0) > 0 ? (
                    (displayStock || 0) < 5 
                      ? `${dict.product.in_stock.replace('{count}', displayStock.toString())} — ${dict.edit_product.low_stock_alert}` 
                      : dict.product.in_stock.replace('{count}', displayStock.toString())
                  ) : dict.product.sold_out}
                </span>
              </div>
            </div>

            {/* Options Selection */}
            {options.length > 0 && (
              <div className="space-y-6 mb-8">
                {options.map((opt: any, i: number) => (
                  <div key={i} className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary/40">
                      {opt.name}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {opt.values.map((val: string, j: number) => (
                        <button
                          key={j}
                          onClick={() => {
                            triggerHaptic("light");
                            setSelectedOptions(prev => ({ ...prev, [opt.name]: val }));
                          }}
                          disabled={!isOptionValueAvailable(opt.name, val)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold border transition-all relative overflow-hidden",
                            selectedOptions[opt.name] === val 
                              ? "bg-primary text-white border-primary shadow-lg shadow-primary/10" 
                              : "bg-white text-primary border-primary/10 hover:border-accent",
                            !isOptionValueAvailable(opt.name, val) && "opacity-20 cursor-not-allowed pointer-events-auto grayscale"
                          )}
                        >
                          {val}
                          {!isOptionValueAvailable(opt.name, val) && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-full h-[1px] bg-primary/20 -rotate-45" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-lg text-charcoal/70 leading-relaxed mb-8 border-l-4 border-accent/20 ps-6 py-2 break-words whitespace-pre-wrap">
              {product.description}
            </p>

            {/* Brand Link & Contact Shop */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <Link
                href={`/artisans/${encodeURI(product.artisan.slug || product.artisan.user.name.toLowerCase().replace(/\s+/g, "-"))}`}
                className="inline-flex items-center gap-1.5 text-base font-semibold text-primary underline underline-offset-4 decoration-primary/30 hover:text-accent hover:decoration-accent transition-colors"
              >
                <span>{product.artisan.studioName || product.artisan.user.name}</span>
                {product.artisan.isVerified && <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />}
              </Link>

              {product.artisan?.user?.id && (
                <ContactArtisanButton
                  artisanId={product.artisan.id}
                  artisanName={product.artisan.studioName || product.artisan.user.name}
                  productId={product.id}
                  productName={product.name}
                  productImage={product.images[0]}
                  artisanUserId={product.artisan.user.id}
                  dict={dict}
                  lang={lang}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-primary/15 bg-white text-primary text-xs font-bold hover:bg-primary/5 hover:border-accent hover:text-accent transition-all shadow-xs active:scale-95"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-accent" />
                  <span>{dict.contact_artisan?.message_artisan || (lang === "ar" ? "تواصل مع الحرفي" : "Message Shop")}</span>
                </ContactArtisanButton>
              )}
            </div>

            {product.canPersonalize && (
              <motion.div 
                animate={personalizationError ? { x: [-5, 5, -5, 5, 0] } : {}}
                className={cn(
                  "bg-white/50 border rounded-2xl p-6 mb-8 transition-colors",
                  personalizationError ? "border-red-400 bg-red-50/30" : "border-primary/10"
                )}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-accent" />
                  <h3 className="font-heading font-bold text-primary">
                    {dict.product.personalize_treasure}
                  </h3>
                </div>
                <p className="text-xs text-charcoal/50 mb-4">{product.personalizationPrompt || dict.product.personalization_desc || "Our artisans will hand-emboss your text onto this piece."}</p>
                <textarea
                  ref={personalizationRef}
                  placeholder={dict.product.personalize_placeholder}
                  className={cn(
                    "w-full bg-white border rounded-xl p-4 text-sm font-medium text-primary focus:outline-none focus:ring-2 focus:border-accent min-h-[100px] resize-none transition-all placeholder:text-primary/40 shadow-inner",
                    personalizationError ? "border-red-400 focus:ring-red-200" : "border-primary/20 focus:ring-accent/20"
                  )}
                  value={personalization}
                  onChange={(e) => {
                    setPersonalization(e.target.value);
                    if (personalizationError) setPersonalizationError(false);
                  }}
                  required
                />
              </motion.div>
            )}

            {product.requiresClientImage && (
              <motion.div 
                ref={customImageRef}
                animate={customImageError ? { x: [-5, 5, -5, 5, 0] } : {}}
                className={cn(
                  "bg-white/50 border rounded-2xl p-6 mb-8 transition-colors",
                  customImageError ? "border-red-400 bg-red-50/30" : "border-primary/10"
                )}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Camera className="w-5 h-5 text-accent" />
                  <h3 className="font-heading font-bold text-primary">
                    {dict.product.upload_client_image_title || "Upload Custom Image / Photo"}
                  </h3>
                </div>
                <p className="text-xs text-charcoal/50 mb-4 font-medium">
                  {product.clientImagePrompt || dict.product.client_image_upload_prompt || "Upload your custom photo for this piece"}
                </p>

                {customImage ? (
                  <div className="relative w-full aspect-video max-h-48 rounded-xl overflow-hidden border border-primary/20 bg-cream/40 flex items-center justify-center group">
                    <img src={customImage} alt="Custom upload" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setCustomImage("")}
                      className="absolute top-3 end-3 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 start-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      {dict.product.custom_image_attached || "Photo attached"}
                    </div>
                  </div>
                ) : (
                  <label className={cn(
                    "relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:bg-accent/5",
                    customImageError ? "border-red-400 bg-red-50/20" : "border-primary/20 bg-white"
                  )}>
                    <input 
                      type="file" 
                      accept="image/jpeg,image/png,image/webp" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error(dict.home.upload_rules?.image_size_error || "Image must be less than 5MB");
                          return;
                        }
                        setIsCompressingCustomImage(true);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          const img = new (window as any).Image();
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            let width = img.width;
                            let height = img.height;
                            const MAX_RES = 1280;
                            if (width > height) { if (width > MAX_RES) { height *= MAX_RES / width; width = MAX_RES; } }
                            else { if (height > MAX_RES) { width *= MAX_RES / height; height = MAX_RES; } }
                            canvas.width = width; canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            if (ctx) { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, width, height); }
                            setCustomImage(canvas.toDataURL('image/jpeg', 0.85));
                            setCustomImageError(false);
                            setIsCompressingCustomImage(false);
                          };
                          img.src = reader.result as string;
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    {isCompressingCustomImage ? (
                      <div className="flex items-center gap-2 py-4 text-primary">
                        <Camera className="w-6 h-6 animate-pulse text-accent" />
                        <span className="text-xs font-bold">{dict.home?.compressing || "Processing image..."}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center">
                        <ImagePlus className="w-8 h-8 text-accent" />
                        <span className="text-xs font-bold text-primary">{dict.product.upload_image_btn || "Upload Image"}</span>
                        <span className="text-[10px] text-charcoal/40 font-medium">JPG, PNG, WebP (Max 5MB)</span>
                      </div>
                    )}
                  </label>
                )}
              </motion.div>
            )}

            <div className="space-y-4 mb-8">
              <div className="flex gap-3">
                <button
                  onClick={() => executeAddToCart(false)}
                  disabled={(displayStock || 0) <= 0}
                  className={cn(
                    "flex-1 py-5 bg-primary text-white font-bold rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95",
                    (displayStock || 0) > 0 
                      ? "hover:bg-primary-light shadow-primary/20" 
                      : "bg-charcoal/20 shadow-none !cursor-not-allowed pointer-events-auto"
                  )}
                >
                  {(displayStock || 0) > 0 ? `${dict.product.add_to_cart} — ${dict.product.currency} ${displayPrice}` : dict.product.sold_out}
                </button>
                <button
                  onClick={() => {
                    triggerHaptic("light");
                    toggleFavorite(product);
                  }}
                  className={cn(
                    "w-16 py-5 border rounded-2xl transition-all flex items-center justify-center shrink-0 active:scale-95",
                    isFavorite(product.id)
                      ? "border-red-100 bg-red-50 text-red-500 shadow-inner"
                      : "border-primary/10 text-primary hover:bg-white"
                  )}
                >
                  <Heart className={cn("w-6 h-6", isFavorite(product.id) && "fill-current")} />
                </button>
              </div>
              <button 
                onClick={() => {
                  triggerHaptic("medium");
                  const ok = executeAddToCart(true);
                  if (ok) {
                    window.location.href = `/${lang}/checkout`;
                  }
                }}
                disabled={(displayStock || 0) <= 0}
                className={cn(
                  "w-full py-5 bg-white border-2 border-primary text-primary font-bold rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95",
                  (displayStock || 0) > 0 
                  ? "hover:bg-primary/5 shadow-xl shadow-primary/5" 
                  : "opacity-30 grayscale !cursor-not-allowed pointer-events-auto"
                )}
              >
                {(displayStock || 0) > 0 ? dict.product.buy_now : dict.product.sold_out}
              </button>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Truck, text: dict.product.benefit_fast_shipping },
                { icon: ShieldCheck, text: dict.product.benefit_carbon_neutral },
                { icon: Clock, text: dict.product.benefit_returns },
                { icon: Star, text: dict.product.benefit_gift_wrap },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-charcoal/60">
                  <item.icon className="w-5 h-5 text-accent/60" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Deep Detail Tabs */}
        <section className="mt-24">
          <div className="border-b border-primary/10 flex gap-8 mb-12 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <button
              onClick={() => setActiveTab("details")}
              className={cn(
                "pb-4 font-bold transition-all border-b-2",
                activeTab === "details" ? "border-primary text-primary" : "border-transparent text-charcoal/40 hover:text-primary"
              )}
            >
              {dict.product.details}
            </button>
            <button
              onClick={() => setActiveTab("artisan")}
              className={cn(
                "pb-4 font-bold transition-all border-b-2",
                activeTab === "artisan" ? "border-primary text-primary" : "border-transparent text-charcoal/40 hover:text-primary"
              )}
            >
              {dict.product.artisan_story}
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={cn(
                "pb-4 font-bold transition-all border-b-2",
                activeTab === "reviews" ? "border-primary text-primary" : "border-transparent text-charcoal/40 hover:text-primary"
              )}
            >
              {dict.product.reviews} ({product.reviews?.length || 0})
            </button>
          </div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="min-h-[200px]"
          >
            {activeTab === "details" && (
              <div className="grid md:grid-cols-2 gap-16">
                <div className="prose prose-stone leading-relaxed text-charcoal/70">
                  <h3 className="text-xl font-heading font-bold text-primary mb-4">{dict.product.story_behind}</h3>
                  <p>
                    {dict.product.handcrafted_by} {product.artisan.studioName || product.artisan.user.name} {dict.product.operating_out_of.toLowerCase()} {product.artisan.location}, {dict.product.details_text_1 || "this product represents the pinnacle of artisanal craftsmanship. Every detail has been carefully considered to ensure a one-of-a-kind experience."}
                  </p>
                  <ul className="mt-8 space-y-4 list-disc ps-5">
                    <li>{dict.product.details_category}: {dict.common.categories_list?.[product.category.toLowerCase()] || product.category}</li>
                    <li>{dict.product.details_handcrafted_by}: {product.artisan.studioName || product.artisan.user.name}</li>
                    <li>{dict.product.details_personalization}: {product.canPersonalize ? dict.product.details_available : dict.product.details_not_available}</li>
                    <li>{dict.product.details_stock}: {product.stock > 0 ? dict.product.details_in_stock : dict.product.details_limited}</li>
                    <li>{dict.product.details_eco}</li>
                  </ul>
                </div>
                <div className="relative aspect-video rounded-3xl overflow-hidden group">
                  {product.artisan.bannerImage ? (
                    <BespokeImage 
                      src={product.artisan.bannerImage} 
                      alt="" 
                      fill 
                      className="object-cover transition-transform duration-1000 group-hover:scale-110" 
                    />
                  ) : (
                    <div className="absolute inset-0 bg-primary/5" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/30 to-transparent" />
                  
                  <div className="absolute bottom-6 start-6 end-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-xl">
                        <BespokeImage type="artisan" id={product.artisan.id} src={product.artisan.avatar} alt="" fill className="object-cover" />
                      </div>
                      <div className="text-white">
                        <p className="text-[10px] font-black uppercase tracking-widest text-accent-light mb-0.5">{lang === "ar" ? "المتجر" : "The Shop"}</p>
                        <h4 className="font-heading font-bold text-lg leading-none">{product.artisan.studioName || product.artisan.user.name}</h4>
                      </div>
                    </div>
                    
                    <Link 
                      href={`/artisans/${product.artisan.slug || product.artisan.user.name.toLowerCase().replace(/ /g, "-")}`}
                      className="px-6 h-10 bg-white text-primary text-[10px] font-black uppercase tracking-widest rounded-full flex items-center justify-center hover:bg-accent hover:text-white transition-all shadow-xl"
                    >
                      {dict.product.visit_studio}
                    </Link>
                  </div>
                  
                  {/* Decorative badge */}
                  <div className="absolute top-6 end-6">
                    <div className="glass px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-primary bg-white/40 backdrop-blur-md border border-white/40">
                      {dict.product.studio_hub}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "artisan" && (
              <div className="max-w-4xl">
                <div className="flex flex-col md:flex-row gap-12 items-center md:items-start text-center md:text-start">
                  <div className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-2xl shrink-0">
                    <BespokeImage type="artisan" id={product.artisan.id} src={product.artisan.avatar} alt={product.artisan.studioName || product.artisan.user.name} fill className="object-cover" />
                  </div>
                  <div className="space-y-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3 justify-center md:justify-start">
                        <h3 className="text-4xl font-heading font-bold text-primary leading-tight">{product.artisan.studioName || product.artisan.user.name}</h3>
                        {product.artisan.isVerified && <CheckCircle2 className="w-6 h-6 text-accent" />}
                      </div>
                      <p className="text-accent font-black uppercase tracking-[0.2em] text-[10px]">
                        {dict.product.master_artisan || "Master Artisan"}: {product.artisan.user.name}
                      </p>
                    </div>
                    <p className="text-lg text-charcoal/70 italic leading-relaxed whitespace-pre-wrap">
                      "{product.artisan.bio}"
                    </p>
                    <div className="flex items-center gap-2 text-charcoal/40 font-medium justify-center md:justify-start">
                      <MapPin className="w-4 h-4" />
                      <span>{dict.product.operating_out_of} {product.artisan.location}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/artisans/${product.artisan.slug || product.artisan.user.name.toLowerCase().replace(/ /g, "-")}`}
                        className="inline-flex items-center gap-2 px-8 h-12 bg-primary text-white font-bold rounded-full hover:bg-primary-light transition-all"
                      >
                        {dict.product.visit_studio_gallery}
                      </Link>
                      {product.artisan?.user?.id && (
                        <ContactArtisanButton
                          artisanId={product.artisan.id}
                          artisanName={product.artisan.studioName || product.artisan.user.name}
                          productId={product.id}
                          productName={product.name}
                          productImage={product.images[0]}
                          artisanUserId={product.artisan.user.id}
                          dict={dict}
                          lang={lang}
                          className="inline-flex items-center gap-2 px-8 h-12 bg-white border border-primary/20 text-primary font-bold rounded-full hover:bg-primary/5 hover:border-accent hover:text-accent transition-all shadow-xs"
                        >
                          <MessageSquare className="w-4 h-4 text-accent" />
                          <span>{dict.contact_artisan?.message_artisan || (lang === "ar" ? "تواصل مع الحرفي" : "Message Shop")}</span>
                        </ContactArtisanButton>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="grid lg:grid-cols-12 gap-16 items-start">
                {/* Review List */}
                <div className="lg:col-span-7 space-y-8">
                  {product.reviews?.length === 0 ? (
                    <div className="py-20 text-center space-y-4">
                      <p className="text-2xl font-heading font-bold text-primary/20 italic">{dict.product.no_reviews_text}</p>
                      {!session && <p className="text-charcoal/40 text-sm">{dict.product.signin_to_share}</p>}
                    </div>
                  ) : (
                    product.reviews.map((review: any) => (
                      <div key={review.id} className="pb-8 border-b border-primary/5 last:border-0">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-primary/5 shadow-sm">
                              <BespokeImage src={review.user.image || `https://api.dicebear.com/10.x/gaze/svg?seed=${review.user.name}`} alt={review.user.name} fill className="object-cover" />
                            </div>
                            <div>
                              <p className="font-bold text-primary text-sm">{review.user.name}</p>
                              <p className="text-[10px] text-charcoal/40 font-medium">{new Date(review.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex text-accent">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={cn("w-3 h-3 translate-y-1", i < review.rating ? "fill-current" : "text-primary/10")} />
                            ))}
                          </div>
                        </div>
                        <p className="text-charcoal/70 leading-relaxed italic mb-4">"{review.comment}"</p>
                        {review.images && review.images.length > 0 && (
                          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {review.images.map((img: string, i: number) => (
                              <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-primary/5 flex-shrink-0">
                                <BespokeImage src={img} alt="Review" fill className="object-cover" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Add Review Sidebar */}
                <div className="lg:col-span-5">
                  {session ? (
                    <div className="sticky top-32 bg-white rounded-[2rem] p-8 border border-primary/5 shadow-2xl shadow-primary/5">
                      <h4 className="text-xl font-heading font-bold text-primary mb-6">{dict.product.leave_review}</h4>
                      <form onSubmit={handleReviewSubmit} className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-primary/40 uppercase tracking-widest">{dict.product.your_rating}</label>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setNewReview({ ...newReview, rating: star })}
                                className="group"
                              >
                                <Star
                                  className={cn(
                                    "w-6 h-6 transition-all",
                                    newReview.rating >= star ? "fill-accent text-accent scale-110" : "text-primary/10 group-hover:text-accent/30"
                                  )}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-primary/40 uppercase tracking-widest">{dict.product.your_experience}</label>
                          <textarea
                            required
                            value={newReview.comment}
                            onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                            placeholder={dict.product.experience_placeholder}
                            className="w-full h-32 p-4 bg-cream/30 border border-primary/10 rounded-xl focus:outline-none focus:border-accent transition-all text-sm font-bold text-primary placeholder:text-primary/40 resize-none shadow-inner"
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="text-xs font-black text-primary/40 uppercase tracking-widest">{dict.product.add_photo} ({dict.common.optional || "Optional"})</label>
                          <div className="flex flex-wrap gap-3">
                            {reviewImages.map((img, i) => (
                              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden group">
                                <Image src={img} alt="Preview" fill className="object-cover" />
                                <button 
                                  type="button" 
                                  onClick={() => setReviewImages(prev => prev.filter((_, idx) => idx !== i))}
                                  className="absolute top-1 end-1 bg-white/80 rounded-full p-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            {reviewImages.length < 4 && (
                              <label className="w-20 h-20 rounded-xl border-2 border-dashed border-primary/10 flex flex-col items-center justify-center cursor-pointer hover:border-accent/40 text-primary/30 hover:text-accent transition-all group bg-cream/20">
                                <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span className="text-[8px] font-black uppercase mt-1">{dict.product.add_photo}</span>
                                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                              </label>
                            )}
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-3 bg-primary text-white font-bold rounded-full hover:bg-primary-light transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/20"
                        >
                          {isSubmitting ? dict.product.posting_discovery : dict.product.post_review}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="sticky top-32 bg-primary text-white rounded-[2rem] p-10 shadow-2xl shadow-primary/20 text-center">
                      <h4 className="text-xl font-heading font-bold mb-4">{dict.product.sharing_story}</h4>
                      <p className="text-white/60 text-sm mb-8 leading-relaxed">{dict.product.signin_to_share}</p>
                      <Link href="/login" className="inline-block px-10 h-12 bg-white text-primary font-bold rounded-full shadow-lg">{dict.common.sign_in}</Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-20 pt-16 border-t border-primary/10">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
              <div>
                <h2 className="text-3xl font-heading font-bold text-primary italic serif">{dict.product.related_products}</h2>
                <p className="text-charcoal/60 mt-2">{dict.product.related_desc}</p>
              </div>
              <Link href={`/category/${product.category.toLowerCase()}`} className="text-primary font-bold hover:underline decoration-accent decoration-2 underline-offset-4">
                {dict.product.shop_collection}
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4 2xl:gap-5 3xl:gap-6">
              {relatedProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${encodeURI(p.slug || p.id)}`}
                  className="group cursor-pointer block"
                >
                  <div className="relative aspect-square rounded-xl md:rounded-2xl overflow-hidden mb-2.5 bg-cream/40 border border-primary/5 group-hover:shadow-md transition-all">
                    <BespokeImage
                      src={p.images[0]}
                      alt={p.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />

                    <div className="absolute top-2.5 end-2.5 p-2 rounded-full bg-white/90 backdrop-blur text-primary shadow-sm hover:scale-110 transition-all">
                      <Heart className={cn("w-4 h-4", isFavorite(p.id) && "fill-current text-red-500")} />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-primary truncate group-hover:text-accent transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-sm font-bold text-primary mt-1">{dict.product.currency} {p.price}.00</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsLightboxOpen(false)}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 cursor-pointer"
          >
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-8 end-8 text-white/60 hover:text-white transition-colors z-50 p-2"
            >
              <X className="w-10 h-10" />
            </button>

            <div className="relative w-full h-full max-w-6xl flex items-center justify-center">
               {/* Navigation Arrows */}
               {product.images.length > 1 && (
                  <>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(prev => prev === 0 ? product.images.length - 1 : prev - 1);
                      }}
                      className="absolute start-2 sm:start-4 md:start-8 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/20 hover:bg-white/40 border border-white/20 backdrop-blur-md hidden md:flex items-center justify-center text-white shadow-2xl transition-all z-50"
                      aria-label="Previous image"
                    >
                      <ArrowRight className={cn("w-7 h-7 md:w-8 md:h-8", lang === 'ar' ? "" : "rotate-180")} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(prev => prev === product.images.length - 1 ? 0 : prev + 1);
                      }}
                      className="absolute end-2 sm:end-4 md:end-8 top-1/2 -translate-y-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/20 hover:bg-white/40 border border-white/20 backdrop-blur-md hidden md:flex items-center justify-center text-white shadow-2xl transition-all z-50"
                      aria-label="Next image"
                    >
                      <ArrowRight className={cn("w-7 h-7 md:w-8 md:h-8", lang === 'ar' ? "rotate-180" : "")} />
                    </button>
                  </>
               )}

               <motion.div
                 key={lightboxIndex}
                 initial={{ opacity: 0, scale: 0.9 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ type: "spring", damping: 25, stiffness: 200 }}
                 drag="x"
                 dragConstraints={{ left: 0, right: 0 }}
                 dragElastic={0.2}
                 onDragEnd={(_e, { offset, velocity }) => {
                   if (product.images.length <= 1) return;
                   const swipePower = Math.abs(offset.x) * velocity.x;
                   if (swipePower < -10000 || offset.x < -50) {
                     setLightboxIndex(prev => (prev === product.images.length - 1 ? 0 : prev + 1));
                   } else if (swipePower > 10000 || offset.x > 50) {
                     setLightboxIndex(prev => (prev === 0 ? product.images.length - 1 : prev - 1));
                   }
                 }}
                 onClick={(e) => e.stopPropagation()}
                 className="relative w-full h-full flex items-center justify-center touch-pan-y select-none cursor-grab active:cursor-grabbing"
               >
                  {isVideo(product.images[lightboxIndex]) ? (
                    <video 
                      src={product.images[lightboxIndex]} 
                      className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl" 
                      autoPlay 
                      loop
                      muted
                      playsInline
                    />
                 ) : (
                    <div className="relative w-full h-full">
                      <Image 
                        src={product.images[lightboxIndex]} 
                        alt={product.name} 
                        fill 
                        className="object-contain" 
                        priority
                      />
                    </div>
                 )}
               </motion.div>

               {/* Counter */}
               <div className="absolute bottom-0 start-1/2 -translate-x-1/2 text-white/40 font-bold tracking-[0.3em] uppercase text-xs">
                  {lightboxIndex + 1} / {product.images.length}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <Footer dict={dict} />

      {/* Sticky Mobile Add to Cart Bar */}
      <div className={cn(
        "fixed bottom-0 start-0 end-0 z-40 md:hidden border-t px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] transition-colors",
        isNative 
          ? "bg-[#FDFCF0]/95 backdrop-blur-2xl border-primary/10 shadow-[0_-12px_40px_rgba(6,78,59,0.08)]" 
          : "bg-white/95 backdrop-blur-xl border-primary/10 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]"
      )}>
        <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
          <button
            onClick={() => {
              triggerHaptic("light");
              toggleFavorite(product);
            }}
            aria-label="Favorite"
            className={cn(
              "w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-all active:scale-90",
              isFavorite(product.id)
                ? "border-red-200 bg-red-50 text-red-500 shadow-inner"
                : "border-primary/10 bg-white/80 text-primary hover:bg-white"
            )}
          >
            <Heart className={cn("w-5 h-5 transition-transform duration-300", isFavorite(product.id) && "fill-current scale-110")} />
          </button>

          <div className="shrink-0 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-primary/40 leading-tight mb-0.5">{dict.common.price || "Price"}</p>
            <p className="text-base sm:text-lg font-heading font-bold text-primary leading-tight">{dict.product.currency} {displayPrice}</p>
          </div>

          <button
            onClick={() => executeAddToCart(false)}
            disabled={(displayStock || 0) <= 0}
            className={cn(
              "flex-1 h-12 bg-primary text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 text-xs flex items-center justify-center gap-2",
              (displayStock || 0) > 0 ? "shadow-primary/25 hover:bg-primary-light" : "opacity-30 grayscale"
            )}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{(displayStock || 0) > 0 ? dict.product.add_to_cart : dict.product.sold_out}</span>
          </button>
        </div>
      </div>
    </main>
  );
}

