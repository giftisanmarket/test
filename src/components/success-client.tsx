"use client";

import { trackTikTokEvent } from "@/lib/tiktok-pixel";

import { Navbar } from "@/components/navbar";
import Link from "next/link";
import { CheckCircle2, Package, ArrowRight, MessageSquare, CreditCard, Lock, Sparkles, UserCheck, Phone, AlertTriangle, XCircle, RefreshCcw, Truck } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
const Confetti = dynamic(() => import("react-confetti"), { ssr: false });
import { cn } from "@/lib/utils";
import { convertGuestToAccount } from "@/lib/actions";
import { ShippingAddressDisplay } from "@/lib/location-utils";
import { useCart } from "@/context/cart-context";

interface SuccessClientProps {
  dict: any;
  lang: string;
  order?: any;
  accessToken?: string;
  isFailed?: boolean;
  errorMessage?: string;
}

export function SuccessClient({ dict, lang, order, accessToken, isFailed, errorMessage }: SuccessClientProps) {
  const { clearCart } = useCart();
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [password, setPassword] = useState("");
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [accountError, setAccountError] = useState("");

  const isAr = lang === "ar";

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    if (!isFailed && order?.id) {
      clearCart();
      trackTikTokEvent("PlaceAnOrder", {
        content_id: String(order.id),
        value: Number(order.totalAmount || order.total || 0),
        currency: "EGP",
      });
      trackTikTokEvent("CompletePayment", {
        content_id: String(order.id),
        value: Number(order.totalAmount || order.total || 0),
        currency: "EGP",
      });
    }
  }, [isFailed, order?.id, clearCart]);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order?.id || !password) return;
    if (password.length < 8) {
      setAccountError(isAr ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل." : "Password must be at least 8 characters.");
      return;
    }
    setIsSubmittingAccount(true);
    setAccountError("");
    const res = await convertGuestToAccount({ orderId: order.id, password, accessToken });
    setIsSubmittingAccount(false);
    if (res.success) {
      setAccountCreated(true);
    } else {
      setAccountError(res.error || "Failed to create account.");
    }
  };

  return (
    <main className="min-h-screen bg-cream overflow-hidden">
      <Navbar dict={dict} />
      
      {/* Celebration Confetti (Only when payment succeeded) */}
      {!isFailed && windowSize.width > 0 && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          numberOfPieces={150}
          recycle={false}
          colors={["#064E3B", "#D97706", "#FDFCF0", "#0D9488"]}
          opacity={0.6}
        />
      )}

      {isFailed ? (
        <div className="container mx-auto px-6 pt-24 md:pt-40 pb-20 flex flex-col items-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="w-20 h-20 md:w-24 md:h-24 bg-rose-600 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-rose-600/20"
          >
            <XCircle className="w-10 h-10 md:w-12 md:h-12 text-white" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center max-w-2xl px-2 mb-10"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-primary mb-4 tracking-tight leading-tight">
              {isAr ? "لم يكتمل الدفع الإلكتروني" : "Payment Was Not Completed"}
            </h1>
            <p className="text-charcoal/65 text-sm sm:text-base md:text-lg leading-relaxed max-w-xl mx-auto">
              {errorMessage 
                ? (isAr ? `تعذر إتمام العملية: ${errorMessage}` : `Transaction could not be completed: ${errorMessage}`)
                : (isAr ? "لم يتم خصم أي مبالغ من بطاقتك أو محفظتك. يمكنك المحاولة مجدداً عبر صفحة الدفع." : "Your card or account was not charged. You can retry with the same card or choose another payment method.")}
            </p>
          </motion.div>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md"
          >
            <Link
              href={`/${lang}/checkout`}
              className="w-full sm:flex-1 h-13 px-6 bg-primary text-white font-bold rounded-2xl hover:bg-primary-light transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-primary/10 text-sm"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>{isAr ? "العودة لصفحة الدفع" : "Return to Checkout"}</span>
            </Link>
            <Link
              href={`/${lang}/contact`}
              className="w-full sm:flex-1 h-13 px-6 bg-white border border-primary/20 text-primary font-bold rounded-2xl hover:bg-cream transition-all flex items-center justify-center gap-2 active:scale-95 text-sm"
            >
              <span>{isAr ? "تواصل مع الدعم" : "Contact Support"}</span>
            </Link>
          </motion.div>
        </div>
      ) : (
        <div className="container mx-auto px-6 pt-24 md:pt-40 pb-20 flex flex-col items-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="w-20 h-20 md:w-24 md:h-24 bg-primary rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-primary/20"
          >
            <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12 text-white" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center max-w-2xl px-2 mb-12"
          >
            <h1 className="text-4xl md:text-7xl font-heading font-bold text-primary mb-6 tracking-tight leading-tight">
              {dict.checkout.success_title}
            </h1>
            <p className="text-charcoal/60 text-base md:text-xl leading-relaxed max-w-xl mx-auto">
              {dict.checkout.success_desc}
            </p>
          </motion.div>

        {/* Dynamic Digital Receipt */}
        {order && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full max-w-3xl bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-primary/5 shadow-2xl shadow-primary/5 overflow-hidden mb-8 sm:mb-12"
          >
            {/* Header of Receipt */}
            <div className="bg-cream/30 px-4 sm:px-6 md:px-10 py-4 sm:py-6 border-b border-primary/5 flex flex-wrap justify-between items-center gap-3 sm:gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1">{dict.profile.reference}</p>
                <h2 className="text-sm sm:text-base md:text-xl font-mono font-bold text-primary tracking-tight break-all">#{order.id}</h2>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 text-start sm:text-end">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1">{dict.profile.placed_on}</p>
                  <p className="text-xs sm:text-sm md:text-base font-bold text-primary">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="ps-3 sm:ps-4 border-s border-primary/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1">{dict.admin.status || "Status"}</p>
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border block text-center",
                    order.status === "PROCESSING" ? "bg-green-50 text-green-600 border-green-200" :
                    order.status === "PENDING" ? "bg-yellow-50 text-yellow-600 border-yellow-200" :
                    "bg-red-50 text-red-600 border-red-200"
                  )}>
                    {order.status === "PROCESSING" ? (dict.admin.approved || "Paid") : 
                     order.status === "PENDING" ? (dict.profile.pending || "Pending") : 
                     order.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 md:p-10 space-y-6 sm:space-y-8">
              {/* Items List */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary/40">{dict.admin.global_products || "Items"}</h3>
                <div className="divide-y divide-primary/5">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden bg-cream shrink-0 border border-primary/5">
                          {item.product.images?.[0] ? (
                            <img
                              src={item.product.images[0]}
                              alt={item.product.name}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/5">
                              <Package className="w-5 h-5 text-primary/20" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm md:text-base font-bold text-primary line-clamp-1">{item.product.name}</h4>
                          <p className="text-xs text-charcoal/50">
                            {dict.profile.qty}: {item.quantity} × {dict.product.currency} {item.price}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm md:text-base font-black text-primary font-mono shrink-0">
                        {dict.product.currency} {item.price * item.quantity}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address & Totals Grid */}
              <div className="grid md:grid-cols-2 gap-8 pt-6 border-t border-primary/5">
                {/* Shipping info */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary/40">{dict.checkout.shipping_address}</h3>
                  <div className="text-sm text-charcoal/70 leading-relaxed font-bold">
                    <p className="text-primary font-black mb-1">{order.clientName}</p>
                    <ShippingAddressDisplay 
                      address={order.shippingAddress} 
                      city={order.shippingCity}
                      country={order.shippingCountry || "Egypt"}
                      lang={lang}
                    />
                    <p className="font-mono text-xs mt-2 text-charcoal/50 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 inline shrink-0" />
                      <span>{order.clientPhone}</span>
                    </p>
                  </div>
                </div>

                {/* Price Summary */}
                {(() => {
                  const isAr = lang === "ar";
                  const subtotal = Math.round(
                    order.items.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0) * 100
                  ) / 100;
                  return (
                    <div className="bg-cream/20 p-6 rounded-2xl border border-primary/5 space-y-3 h-fit">
                      <div className="flex justify-between text-xs text-charcoal/60 font-medium">
                        <span>{dict.cart.subtotal}</span>
                        <span className="font-mono">{dict.product.currency} {subtotal}</span>
                      </div>
                      {order.discountApplied > 0 && (
                        <div className="flex justify-between text-xs text-emerald-600 font-bold">
                          <span>{isAr ? "خصم كوبون" : "Promo Discount"}</span>
                          <span className="font-mono">-{dict.product.currency} {order.discountApplied}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs text-charcoal/60 font-medium">
                        <span>{order.shippingMethod?.name || dict.checkout.cairo_shipping}</span>
                        <span className="font-mono">
                          {order.shippingCost === 0 ? dict.checkout.free : `${dict.product.currency} ${order.shippingCost}`}
                        </span>
                      </div>
                      <div className="pt-3 border-t border-primary/5 flex justify-between text-base font-black text-primary">
                        <span>{dict.checkout.total}</span>
                        <span className="font-mono">{dict.product.currency} {order.totalAmount}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        )}

        {/* Post-Purchase Account Creation Widget for Guest Checkout */}
        {order && !order.userId && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="w-full max-w-3xl bg-gradient-to-br from-primary to-primary-dark text-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-primary/20 mb-12 relative overflow-hidden"
          >
            <div className="absolute top-0 end-0 p-8 opacity-10 pointer-events-none">
              <Sparkles className="w-48 h-48 text-white" />
            </div>

            {accountCreated ? (
              <div className="flex flex-col items-center text-center py-4 space-y-3">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20 mb-2">
                  <UserCheck className="w-8 h-8 text-accent-light" />
                </div>
                <h3 className="text-2xl md:text-3xl font-heading font-bold text-white">
                  {isAr ? "تم إنشاء حسابك بنجاح!" : "Account Created Successfully!"}
                </h3>
                <p className="text-white/80 text-sm md:text-base max-w-lg leading-relaxed">
                  {isAr
                    ? `تم ربط هذا الطلب بحسابك الجديد (${order.clientEmail}). يمكنك تسجيل الدخول في أي وقت لتتبع شحناتك.`
                    : `This order is now saved under your new account (${order.clientEmail}). You can log in anytime to track your shipments.`}
                </p>
                <Link
                  href={`/${lang}/login`}
                  className="mt-4 px-8 py-3 bg-white text-primary font-bold rounded-xl hover:bg-cream transition-all text-sm shadow-lg"
                >
                  {isAr ? "تسجيل الدخول إلى حسابي" : "Log into My Account"}
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                    <Lock className="w-6 h-6 text-accent-light" />
                  </div>
                  <div>
                    <span className="inline-block px-3 py-1 bg-accent-light/20 text-accent-light rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-accent-light/30">
                      {isAr ? "خطوة سريعة واحدة" : "One-Click Account Setup"}
                    </span>
                    <h3 className="text-xl md:text-2xl font-heading font-bold text-white leading-tight">
                      {isAr ? "أنشئ كلمة مرورك وتتبع طلبك بسهولة!" : "Create a password to save your account & track orders!"}
                    </h3>
                    <p className="text-white/70 text-xs md:text-sm mt-1">
                      {isAr ? "طلبك مسجل باسم" : "Your order is registered under"}{" "}
                      <strong className="text-white font-mono">{order.clientEmail}</strong>. {isAr ? "أنشئ كلمة سر لحفظ بياناتك للطلبات القادمة." : "Set a password below to save your details for future purchases."}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateAccount} className="flex flex-col sm:flex-row gap-3 pt-2">
                  <input
                    type="password"
                    placeholder={isAr ? "أنشئ كلمة مرور (8 أحرف على الأقل)" : "Create a password (min 8 chars)"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    maxLength={72}
                    className="flex-1 px-6 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent-light text-sm font-medium transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingAccount || !password}
                    className="px-8 py-4 bg-white text-primary font-bold rounded-2xl hover:bg-cream active:scale-95 transition-all text-sm disabled:opacity-50 whitespace-nowrap shadow-xl"
                  >
                    {isSubmittingAccount
                      ? (isAr ? "جاري الإنشاء..." : "Saving...")
                      : (isAr ? "حفظ الحساب" : "Save Account")}
                  </button>
                </form>

                {accountError && (
                  <p className="text-accent-light text-xs font-bold bg-black/20 p-3 rounded-xl border border-accent-light/20 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-accent-light shrink-0" />
                    <span>{accountError}</span>
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Process Tracker Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid sm:grid-cols-2 gap-4 md:gap-6 mb-8 sm:mb-12 w-full max-w-3xl"
        >
          <div className="bg-white p-5 sm:p-6 md:p-8 rounded-[1.75rem] sm:rounded-[2.25rem] border border-primary/5 shadow-xl shadow-primary/5 flex flex-col sm:flex-row items-center sm:items-start gap-3.5 sm:gap-4 text-center sm:text-start">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-brand/10 rounded-2xl flex items-center justify-center shrink-0">
              <Package className="w-6 h-6 sm:w-7 sm:h-7 text-brand" />
            </div>
            <div>
              <h3 className="font-bold text-primary text-base sm:text-lg">{dict.checkout.artisan_prep_title}</h3>
              <p className="text-xs sm:text-sm text-charcoal/60 leading-relaxed mt-1">{dict.checkout.artisan_prep_desc}</p>
            </div>
          </div>
          <div className="bg-white p-5 sm:p-6 md:p-8 rounded-[1.75rem] sm:rounded-[2.25rem] border border-primary/5 shadow-xl shadow-primary/5 flex flex-col sm:flex-row items-center sm:items-start gap-3.5 sm:gap-4 text-center sm:text-start">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/5 rounded-2xl flex items-center justify-center shrink-0">
              <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-primary text-base sm:text-lg">{dict.checkout.direct_dialogue_title || (isAr ? "حوار مباشر مع الحرفي" : "Direct Dialogue")}</h3>
              <p className="text-xs sm:text-sm text-charcoal/60 leading-relaxed mt-1">{dict.checkout.direct_dialogue_desc || (isAr ? "يمكنك التواصل مباشرة مع صانع القطعة عبر صفحة طلباتك في أي وقت." : "Direct messaging with your artisan is available anytime from your account orders.")}</p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full max-w-3xl"
        >
          {order?.id && (
            <Link 
              href={`/${lang}/track/${order.id}`} 
              className="h-12 sm:h-13 md:h-14 px-6 sm:px-7 md:px-8 bg-accent hover:bg-accent-light text-white font-bold rounded-2xl transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2 group active:scale-95 text-xs sm:text-sm md:text-base whitespace-nowrap text-center shrink-0"
            >
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>{isAr ? "تتبع مسار الطلب" : "Track Order Live"}</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform rtl:rotate-180 shrink-0" />
            </Link>
          )}
          <Link 
            href={`/${lang}`} 
            className="h-12 sm:h-13 md:h-14 px-6 sm:px-7 md:px-8 bg-primary text-white font-bold rounded-2xl hover:bg-primary-light transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2 group active:scale-95 text-xs sm:text-sm md:text-base whitespace-nowrap text-center shrink-0"
          >
            <span>{dict.checkout.continue_discovery}</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform rtl:rotate-180 shrink-0" />
          </Link>
          <Link 
            href={`/${lang}/favorites`} 
            className="h-12 sm:h-13 md:h-14 px-5 sm:px-6 md:px-7 bg-white border border-primary/15 text-primary font-bold rounded-2xl hover:bg-cream transition-all shadow-2xs flex items-center justify-center active:scale-95 text-xs sm:text-sm md:text-base whitespace-nowrap text-center shrink-0"
          >
            <span>{dict.checkout.view_favorites}</span>
          </Link>
        </motion.div>

        {/* Decorative background elements */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-accent/10 rounded-full blur-[100px] -z-10" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px] -z-10" />
      </div>
      )}
    </main>
  );
}
