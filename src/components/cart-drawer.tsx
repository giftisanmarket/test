"use client";

import { useEffect, useMemo } from "react";
import { useCart } from "@/context/cart-context";
import { X, Minus, Plus, ShoppingBag, ArrowRight, CheckCircle2, Store, Lock, Trash2, Sparkles, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { BespokeImage } from "./bespoke-image";
import { cn, getOptimizedImageUrl } from "@/lib/utils";
import { triggerHaptic, registerNativeBackHandler, useIsNative } from "@/lib/native";
import toast from "react-hot-toast";

interface CartDrawerProps {
  dict: any;
  lang?: string;
}

export function CartDrawer({ dict, lang = "en" }: CartDrawerProps) {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, totalPrice, totalItems } = useCart();
  const isNative = useIsNative();
  const isAr = lang === "ar" || dict?.common?.home === "الرئيسية";
  const hasUnavailableItems = cart.some((item) => (item.stock || 0) <= 0);

  // Group items by Artisan Studio for Etsy-grade marketplace experience
  const artisanGroups = useMemo(() => {
    const groups: {
      [key: string]: {
        id: string;
        name: string;
        slug?: string;
        avatar?: string;
        isVerified?: boolean;
        items: typeof cart;
      };
    } = {};

    cart.forEach((item) => {
      const artisanId = item.artisan?.id || item.artisanId || "giftisan_workshop";
      const name =
        item.artisan?.studioName ||
        item.artisan?.name ||
        item.artisan?.user?.name ||
        (isAr ? "ورشة معتمدة في جفتيزان" : "Giftisan Verified Workshop");
      const slug = item.artisan?.slug;
      const avatar = item.artisan?.avatar || (item.artisan as any)?.user?.image;
      const isVerified = Boolean(item.artisan?.isVerified);

      if (!groups[artisanId]) {
        groups[artisanId] = {
          id: artisanId,
          name,
          slug,
          avatar,
          isVerified,
          items: [],
        };
      }
      groups[artisanId].items.push(item);
    });

    return Object.values(groups);
  }, [cart, isAr]);

  // Close cart drawer on Android hardware back button
  useEffect(() => {
    if (!isCartOpen) return;
    return registerNativeBackHandler(() => {
      setIsCartOpen(false);
      return true;
    });
  }, [isCartOpen, setIsCartOpen]);

  const checkoutUrl = `/${lang}/checkout`;

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs z-[100]"
          />

          {/* Drawer / Mobile Native Sheet */}
          <motion.div
            initial={{ x: isAr ? "-100%" : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: isAr ? "-100%" : "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed end-0 top-0 h-[100dvh] w-full max-w-md bg-cream shadow-2xl z-[101] flex flex-col pt-safe select-none"
          >
            {/* Native Mobile Pull Handle & Header */}
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-primary/10 bg-cream/90 backdrop-blur-md sticky top-0 z-20">
              {/* Subtle Mobile Drag Indicator Pill */}
              <div className="w-10 h-1 bg-primary/20 rounded-full mx-auto mb-2 md:hidden" />

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-heading font-bold text-primary leading-tight">
                      {dict?.cart?.your_cart || (isAr ? "سلة الهدايا" : "Your Cart")}
                    </h2>
                    {totalItems > 0 && (
                      <p className="text-[10px] text-charcoal/60 font-medium">
                        {totalItems} {totalItems === 1 ? (isAr ? "قطعة مميزة" : "unique piece") : (isAr ? "قطع حرفية" : "handcrafted pieces")}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    setIsCartOpen(false);
                  }}
                  aria-label="Close cart"
                  className="p-2 hover:bg-primary/5 rounded-full text-charcoal/70 hover:text-primary transition-all active:scale-90 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Cart Content Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-16 px-4 space-y-4">
                  <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center">
                    <ShoppingBag className="w-10 h-10 text-primary/30" />
                  </div>
                  <div className="space-y-1.5 max-w-xs">
                    <h3 className="font-heading font-bold text-primary text-lg">
                      {dict?.cart?.cart_empty || (isAr ? "سلتك فارغة حالياً" : "Your cart is empty")}
                    </h3>
                    <p className="text-xs text-charcoal/60 leading-relaxed">
                      {dict?.checkout?.empty_checkout_desc ||
                        (isAr
                          ? "استكشف قطعاً فنية يدوية فريدة مصممة بشغف بأيدي أمهر الحرفيين في مصر."
                          : "Explore one-of-a-kind handcrafted treasures made with passion across Egypt.")}
                    </p>
                  </div>
                  <Link
                    href={`/${lang}`}
                    onClick={() => {
                      triggerHaptic("light");
                      setIsCartOpen(false);
                    }}
                    className="mt-4 px-7 py-3 bg-primary text-white font-bold rounded-full hover:bg-primary-light transition-all shadow-md shadow-primary/10 flex items-center gap-2 group active:scale-95 text-xs uppercase tracking-widest"
                  >
                    <span>{dict?.cart?.start_gifting || (isAr ? "ابدأ التسوق" : "Start Discovering")}</span>
                    <ArrowRight className={cn("w-3.5 h-3.5 transition-transform group-hover:translate-x-1", isAr && "rotate-180 group-hover:-translate-x-1")} />
                  </Link>
                </div>
              ) : (
                /* Etsy-Style Multi-Artisan Groups */
                artisanGroups.map((group) => (
                  <div
                    key={group.id}
                    className="bg-white rounded-2xl p-4 border border-primary/10 shadow-2xs space-y-4 transition-all"
                  >
                    {/* Artisan Shop Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-primary/5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-cream border border-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                          {group.avatar ? (
                            <img src={group.avatar} alt={group.name} className="w-full h-full object-cover" />
                          ) : (
                            <Store className="w-3.5 h-3.5 text-accent" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-primary truncate">{group.name}</span>
                            {group.isVerified && <CheckCircle2 className="w-3 h-3 text-accent shrink-0" />}
                          </div>
                          <span className="text-[9px] font-medium text-charcoal/50 block">
                            {isAr ? "صناعة يدوية مباشرة من ورشة الحرفي" : "Ships direct from artisan workshop"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Items belonging to this artisan */}
                    <div className="flex flex-col">
                      {group.items.map((item, idx) => (
                        <div
                          key={`${item.id}-${item.variantId || "novar"}-${item.personalization || "nopers"}-${idx}`}
                        >
                          {idx > 0 && <div className="h-px bg-primary/10 my-4 w-full" />}
                          <div className="flex gap-3.5 items-start">
                          {/* Item Thumbnail */}
                          <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden bg-cream border border-primary/5 shrink-0 shadow-2xs">
                            <BespokeImage
                              src={item.image || item.images?.[0] || ""}
                              alt={item.name}
                              fill
                              className="object-cover"
                            />
                          </div>

                          {/* Item Details */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-heading font-bold text-xs sm:text-sm text-primary leading-snug line-clamp-2">
                                {item.name}
                              </h4>
                              <p className="font-bold text-primary text-xs sm:text-sm shrink-0 whitespace-nowrap">
                                {dict?.product?.currency || "EGP"} {item.price * item.quantity}
                              </p>
                            </div>

                            {/* Variant info */}
                            {item.variantName && (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-primary/70 font-bold bg-primary/5 px-2 py-0.5 rounded-md">
                                  {item.variantName}
                                </span>
                              </div>
                            )}

                            {/* Bespoke Personalization Badge */}
                            {item.personalization && (
                              <div className="bg-cream/80 border border-primary/5 rounded-lg p-2 mt-1.5 space-y-0.5">
                                <span className="text-[8px] text-accent uppercase font-black tracking-wider flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  {dict?.cart?.bespoke_detail || (isAr ? "تخصيص يدوي" : "Bespoke Note")}:
                                </span>
                                <p className="text-[10px] text-charcoal/80 italic leading-snug">
                                  "{item.personalization}"
                                </p>
                              </div>
                            )}

                            {/* Custom Image Upload Preview */}
                            {item.customImage && (
                              <div className="flex items-center gap-2 bg-primary/5 border border-primary/5 rounded-lg p-1.5 mt-1.5">
                                <div className="relative w-6 h-6 rounded overflow-hidden shrink-0 border border-primary/10 bg-white">
                                  <img
                                    src={getOptimizedImageUrl(item.customImage, { width: 60 })}
                                    alt="Custom upload"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <span className="text-[9px] text-primary font-bold truncate">
                                  {dict?.product?.custom_image_attached || (isAr ? "صورة مخصصة مرفقة" : "Custom photo attached")}
                                </span>
                              </div>
                            )}

                            {/* Quantity Controls & Remove */}
                            <div className="flex items-center justify-between pt-2">
                              {(() => {
                                const maxStock = typeof item.stock === "number" ? item.stock : 999;
                                const isMaxStock = item.quantity >= maxStock;

                                return (
                                  <div className="flex items-center border border-primary/10 rounded-full h-7 px-2 gap-2.5 bg-cream/60">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        triggerHaptic("light");
                                        updateQuantity(
                                          item.id,
                                          item.quantity - 1,
                                          item.personalization,
                                          item.variantId,
                                          item.customImage
                                        );
                                      }}
                                      aria-label="Decrease quantity"
                                      className="p-0.5 text-primary hover:text-accent transition-all active:scale-75 cursor-pointer"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-xs font-bold w-3 text-center text-primary leading-none">
                                      {item.quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isMaxStock) {
                                          triggerHaptic("warning");
                                          toast.error(
                                            isAr
                                              ? `وصلت للحد الأقصى للمخزون المتاح (${maxStock})`
                                              : `Maximum available stock reached (${maxStock})`,
                                            {
                                              id: "cart-stock-limit",
                                              style: { borderRadius: "16px", background: "#064E3B", color: "#fff" },
                                            }
                                          );
                                        } else {
                                          triggerHaptic("light");
                                          updateQuantity(
                                            item.id,
                                            item.quantity + 1,
                                            item.personalization,
                                            item.variantId,
                                            item.customImage
                                          );
                                        }
                                      }}
                                      disabled={isMaxStock}
                                      aria-label="Increase quantity"
                                      className={cn(
                                        "p-0.5 transition-all active:scale-75 cursor-pointer",
                                        isMaxStock ? "text-primary/20 cursor-not-allowed opacity-40" : "text-primary hover:text-accent"
                                      )}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              })()}

                              {/* Remove Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHaptic("medium");
                                  removeFromCart(item.id, item.personalization, item.variantId, item.customImage);
                                }}
                                aria-label="Remove item"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-charcoal/40 hover:text-red-600 transition-colors cursor-pointer active:scale-95 py-1 px-1.5"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>{dict?.cart?.remove || (isAr ? "إزالة" : "Remove")}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Sticky Checkout Summary & CTA Footer */}
            {cart.length > 0 && (
              <div className="p-4 sm:p-6 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] border-t border-primary/10 bg-white space-y-3.5 shadow-[0_-8px_30px_rgba(0,0,0,0.03)]">
                {/* Subtotal Strip */}
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="text-charcoal/60 font-bold uppercase tracking-wider text-[10px] block">
                      {dict?.cart?.subtotal || (isAr ? "المجموع الفرعي" : "Subtotal")}
                    </span>
                    <span className="text-[10px] text-charcoal/40 font-medium">
                      {dict?.cart?.shipping_info || (isAr ? "تكلفة الشحن تُحسب عند الخطوة التالية" : "Taxes and shipping calculated at checkout")}
                    </span>
                  </div>
                  <div className="text-end">
                    <span className="font-heading font-bold text-primary text-xl sm:text-2xl">
                      {dict?.product?.currency || "EGP"} {totalPrice}.00
                    </span>
                  </div>
                </div>

                {/* Primary Proceed to Checkout Button */}
                <Link
                  href={hasUnavailableItems ? "#" : checkoutUrl}
                  onClick={(e) => {
                    if (hasUnavailableItems) {
                      e.preventDefault();
                      toast.error(
                        isAr
                          ? "يرجى تعديل أو إزالة القطع التي نفدت كميتها للمتابعة"
                          : "Please review or remove sold-out items to proceed"
                      );
                      return;
                    }
                    triggerHaptic("medium");
                    setIsCartOpen(false);
                  }}
                  className={cn(
                    "w-full h-12 sm:h-14 font-bold rounded-xl sm:rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 text-sm sm:text-base active:scale-[0.98] cursor-pointer",
                    hasUnavailableItems
                      ? "bg-charcoal/10 text-charcoal/40 cursor-not-allowed shadow-none"
                      : "bg-primary text-white hover:bg-primary-light shadow-primary/20"
                  )}
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {hasUnavailableItems
                      ? (dict?.cart?.review_unavailable || (isAr ? "مراجعة القطع غير المتوفرة" : "Review Unavailable Items"))
                      : (dict?.cart?.proceed_to_checkout || (isAr ? "متابعة الشراء والدفع الآمن" : "Proceed to Checkout"))}
                  </span>
                  {!hasUnavailableItems && (
                    <ArrowRight className={cn("w-4 h-4 transition-transform", isAr && "rotate-180")} />
                  )}
                </Link>

                {/* Trust guarantee badge */}
                <div className="flex items-center justify-center gap-2 text-[10px] text-charcoal/50">
                  <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>{isAr ? "حماية المشتري ودفع إلكتروني مشفّر بالكامل" : "Buyer Protection & 256-Bit SSL Secure Checkout"}</span>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
