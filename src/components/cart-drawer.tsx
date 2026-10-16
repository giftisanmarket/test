"use client";

import { useCart } from "@/context/cart-context";
import { X, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { BespokeImage } from "./bespoke-image";
import { cn, getOptimizedImageUrl } from "@/lib/utils";
import toast from "react-hot-toast";

export function CartDrawer({ dict, lang }: { dict: any; lang?: string }) {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, totalPrice } = useCart();
  const hasUnavailableItems = cart.some(item => (item.stock || 0) <= 0);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: lang === 'ar' ? "-100%" : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: lang === 'ar' ? "-100%" : "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed end-0 top-0 h-[100dvh] w-full max-w-md bg-cream shadow-2xl z-[101] flex flex-col pt-safe"
          >
            <div className="p-4 md:p-6 border-b border-primary/10 flex justify-between items-center bg-cream/50 backdrop-blur-md sticky top-0 z-20">
              <h2 className="text-xl md:text-2xl font-heading font-bold text-primary flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 md:w-6 md:h-6" /> {dict.cart.your_cart}
              </h2>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-primary/5 rounded-full transition-all active:scale-90"
              >
                <X className="w-6 h-6 text-primary" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ShoppingBag className="w-10 h-10 text-primary/20" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-charcoal/40 font-bold text-lg">{dict.cart.cart_empty}</p>
                    <Link 
                      href={`/${lang}`}
                      onClick={() => setIsCartOpen(false)}
                      className="mt-6 px-8 h-12 bg-primary text-white font-bold rounded-full hover:bg-primary-light transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2 group active:scale-95 text-xs uppercase tracking-widest"
                    >
                      {dict.cart.start_gifting}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 rtl:rotate-180" />
                    </Link>
                  </div>
                </div>
              ) : (
                cart.map((item, idx) => {
                  const artisanName = item.artisan ? (item.artisan.studioName || item.artisan.name || item.artisan.user?.name) : null;
                  return (
                    <div key={`${item.id}-${item.variantId || 'novar'}-${item.personalization || 'nopers'}-${idx}`} className="flex gap-4 group items-start animate-in slide-in-from-end-4 duration-300">
                      <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-white border border-primary/5 shrink-0 shadow-lg shadow-primary/5">
                        <BespokeImage src={item.image || item.images?.[0] || ""} alt={item.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-heading font-bold text-sm md:text-base text-primary leading-tight line-clamp-2 md:line-clamp-1">{item.name}</h3>
                            <div className="flex flex-wrap gap-1 items-center">
                              {artisanName && (
                                <p className="text-[9px] md:text-xs text-accent font-bold uppercase tracking-widest truncate">{artisanName}</p>
                              )}
                              {item.variantName && (
                                <>
                                  {artisanName && <span className="text-[10px] text-primary/20">•</span>}
                                  <span className="text-[9px] md:text-xs text-primary/60 font-bold">{item.variantName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        <div className="text-end shrink-0">
                          <p className="font-bold text-primary text-sm md:text-base">{dict.product.currency} {item.price * item.quantity}</p>
                          {(item.stock || 0) <= 0 && (
                            <span className="text-[7px] font-black text-red-500 uppercase tracking-tighter bg-red-50 px-1.5 py-0.5 rounded-sm">{dict.product.sold_out}</span>
                          )}
                        </div>
                      </div>
                      
                      {item.personalization && (
                        <div className="bg-primary/5 border border-primary/5 rounded-xl p-2.5 mt-2">
                          <p className="text-[8px] text-primary/40 uppercase font-black tracking-tighter mb-0.5">{dict.cart.bespoke_detail}:</p>
                          <p className="text-[10px] text-primary italic leading-tight">"{item.personalization}"</p>
                        </div>
                      )}

                      {item.customImage && (
                        <div className="flex items-center gap-2 bg-primary/5 border border-primary/5 rounded-xl p-2 mt-2">
                          <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-primary/10 bg-white">
                            <img src={getOptimizedImageUrl(item.customImage, { width: 100 })} alt="Custom upload" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-[10px] text-primary font-bold">{dict.product.custom_image_attached || "Custom photo attached"}</span>
                        </div>
                      )}
                      
                      <div className="flex flex-col mt-4 gap-1">
                        <div className="flex items-center justify-between">
                          {(() => {
                            const maxStock = typeof item.stock === 'number' ? item.stock : 999;
                            const isMaxStock = item.quantity >= maxStock;
                            return (
                              <div className="flex items-center border border-primary/5 rounded-full h-8 md:h-9 px-3 gap-3 md:gap-4 bg-white shadow-sm">
                                <button 
                                  onClick={() => updateQuantity(item.id, item.quantity - 1, item.personalization, item.variantId, item.customImage)}
                                  className="p-1 text-primary hover:text-accent transition-all active:scale-75 cursor-pointer"
                                >
                                  <Minus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </button>
                                <span className="text-[11px] md:text-sm font-bold w-3 md:w-4 text-center text-primary leading-none">
                                  {item.quantity}
                                </span>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    if (isMaxStock) {
                                      toast.error(
                                        lang === 'ar'
                                          ? `وصلت للحد الأقصى للمخزون المتاح (${maxStock})`
                                          : `Maximum available stock reached (${maxStock})`,
                                        { id: "cart-stock-limit", style: { borderRadius: '20px', background: '#1a2c2c', color: '#fff' } }
                                      );
                                    } else {
                                      updateQuantity(item.id, item.quantity + 1, item.personalization, item.variantId, item.customImage);
                                    }
                                  }}
                                  title={isMaxStock ? (lang === 'ar' ? `الحد الأقصى للمخزون هو ${maxStock}` : `Max stock is ${maxStock}`) : undefined}
                                  className={cn(
                                    "p-1 transition-all active:scale-75",
                                    isMaxStock ? "text-primary/20 cursor-not-allowed opacity-30" : "text-primary hover:text-accent cursor-pointer"
                                  )}
                                >
                                  <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </button>
                              </div>
                            );
                          })()}
                          <button 
                            onClick={() => removeFromCart(item.id, item.personalization, item.variantId, item.customImage)}
                            className="text-[9px] md:text-xs font-black uppercase tracking-widest text-charcoal/30 hover:text-red-500 transition-all active:scale-95 cursor-pointer"
                          >
                            {dict.cart.remove}
                          </button>
                        </div>
                        {(() => {
                          const maxStock = typeof item.stock === 'number' ? item.stock : 999;
                          if (item.quantity >= maxStock && maxStock > 0 && maxStock < 999) {
                            return (
                              <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest leading-none mt-1">
                                {lang === 'ar' ? `الحد الأقصى للمخزون (${maxStock})` : `Max available stock (${maxStock})`}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5 md:p-8 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] border-t border-primary/10 bg-white space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-center">
                  <span className="text-charcoal/40 font-bold uppercase tracking-widest text-[10px]">{dict.cart.subtotal}</span>
                  <span className="font-heading font-bold text-primary text-2xl md:text-3xl">{dict.product.currency} {totalPrice}.00</span>
                </div>
                <p className="text-[9px] md:text-xs text-charcoal/40 text-center italic">{dict.cart.shipping_info}</p>
                <Link 
                  href={hasUnavailableItems ? "#" : "/checkout"}
                  onClick={(e) => {
                    if (hasUnavailableItems) {
                      e.preventDefault();
                      return;
                    }
                    setIsCartOpen(false);
                  }}
                  className={cn(
                    "w-full h-14 md:h-16 font-bold rounded-xl md:rounded-2xl transition-all shadow-xl flex items-center justify-center text-sm md:text-base active:scale-[0.98]",
                    hasUnavailableItems 
                      ? "bg-charcoal/10 text-charcoal/40 !cursor-not-allowed shadow-none pointer-events-auto" 
                      : "bg-primary text-white hover:bg-primary-light shadow-primary/20"
                  )}
                >
                  {hasUnavailableItems ? dict.cart.review_unavailable : dict.cart.proceed_to_checkout}
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

