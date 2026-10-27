"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Gift,
  ArrowRight,
  ArrowLeft,
  Mail,
  Copy,
  Check,
  Store,
  Sparkles,
  Lock,
  Unlock,
  AlertCircle,
  HelpCircle,
  XCircle,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { getPublicTrackedOrder } from "@/lib/actions";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface TrackClientProps {
  initialOrder?: any;
  initialQuery?: string;
  dict: any;
  lang: string;
}

export function TrackClient({
  initialOrder = null,
  initialQuery = "",
  dict,
  lang,
}: TrackClientProps) {
  const router = useRouter();
  const isAr = lang === "ar";
  const t = dict?.track || {};
  const currency = dict?.product?.currency || "EGP";

  const [orderQuery, setOrderQuery] = useState(initialQuery);
  const [verificationInput, setVerificationInput] = useState("");
  const [order, setOrder] = useState<any>(initialOrder);
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [copiedLink, setCopiedLink] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderQuery.trim()) {
      setError(isAr ? "يرجى كتابة رقم الطلب أو كود التتبع" : "Please enter an order number or tracking code.");
      return;
    }
    setError("");

    startTransition(async () => {
      const res = await getPublicTrackedOrder(orderQuery, verificationInput);
      if (res.success && res.order) {
        setOrder(res.order);
        // Update URL shallowly for shareability
        window.history.replaceState(null, "", `/${lang}/track/${res.order.id}`);
      } else {
        setOrder(null);
        setError(res.error || (isAr ? "تعذر العثور على هذا الطلب." : "Order not found."));
      }
    });
  };

  const handleVerifyDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!order?.id || !verificationInput.trim()) return;

    startTransition(async () => {
      const res = await getPublicTrackedOrder(order.id, verificationInput);
      if (res.success && res.order) {
        setOrder(res.order);
        setShowVerifyModal(false);
        toast.success(isAr ? "تم إثبات الهوية وإظهار التفاصيل كاملة" : "Identity verified. Full address unlocked.");
      } else {
        toast.error(isAr ? "بيانات التحقق غير مطابقة لهذا الطلب" : "Verification details did not match this order.");
      }
    });
  };

  const handleCopyLink = () => {
    if (typeof window === "undefined" || !order?.id) return;
    const url = `${window.location.origin}/${lang}/track/${order.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success(isAr ? "تم نسخ رابط التتبع بنجاح" : "Tracking link copied to clipboard");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Determine active step index
  // 0: Confirmed, 1: Preparing, 2: Shipped, 3: Out for Delivery, 4: Delivered
  const getStepIndex = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "DELIVERED") return 4;
    if (s === "SHIPPED") return 2;
    if (s === "PROCESSING") return 1;
    if (s === "PENDING") return 0;
    return 1;
  };

  const currentStep = order ? getStepIndex(order.status) : 0;
  const isCancelled = order?.status === "CANCELLED";

  const trackingSteps = [
    {
      title: t.step_confirmed_title || (isAr ? "تم تأكيد الطلب" : "Order Confirmed"),
      desc: t.step_confirmed_desc || (isAr ? "تم تسجيل وتأكيد الطلب بنجاح" : "Order received and confirmed"),
      icon: CheckCircle2,
    },
    {
      title: t.step_preparing_title || (isAr ? "التجهيز والتغليف بالورشة" : "Artisan Crafting & Packaging"),
      desc: t.step_preparing_desc || (isAr ? "الحرفي يقوم بإعداد قطعك وتغليفها وقائياً" : "The artisan is carefully finishing and packing your items"),
      icon: Sparkles,
    },
    {
      title: t.step_shipped_title || (isAr ? "في الطريق مع شركة الشحن" : "In Transit with Courier"),
      desc: t.step_shipped_desc || (isAr ? "تم تسليم الطرد لشركة الشحن" : "Picked up and on route to delivery center"),
      icon: Truck,
    },
    {
      title: t.step_out_title || (isAr ? "خرج للتوصيل اليوم" : "Out for Delivery"),
      desc: t.step_out_desc || (isAr ? "المندوب في منطقتك لتسليم الطرد اليوم" : "Courier agent is delivering your parcel today"),
      icon: MapPin,
    },
    {
      title: t.step_delivered_title || (isAr ? "تم الاستلام بنجاح" : "Delivered Safely"),
      desc: t.step_delivered_desc || (isAr ? "تم تسليم الطرد إلى باب منزلك" : "Parcel delivered to your doorstep"),
      icon: Package,
    },
  ];

  return (
    <main className="min-h-screen bg-cream text-charcoal flex flex-col relative selection:bg-primary/20">
      <Navbar dict={dict} />

      <div className="container mx-auto px-4 pt-28 md:pt-36 pb-20 max-w-5xl flex-1">
        {/* Header Breadcrumb / Intro */}
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-primary/10 text-primary text-xs font-bold shadow-2xs mb-4">
            <Package className="w-3.5 h-3.5 text-accent" />
            <span>{t.badge || (isAr ? "تتبع الشحنات الفوري" : "Order Concierge")}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-heading font-black text-primary tracking-tight">
            {t.headline || (isAr ? "تتبع مسار إبداعاتك اليدوية" : "Track Your Handcrafted Journey")}
          </h1>
          <p className="text-charcoal/70 text-sm md:text-base mt-3 leading-relaxed">
            {t.subheadline ||
              (isAr
                ? "متابعة دقيقة لحظة بلحظة أثناء تصنيع قطعك، تغليفها، وانطلاقها إليك في كافة محافظات مصر."
                : "Real-time updates as your bespoke gifts are crafted, packaged, and delivered across Egypt.")}
          </p>
        </div>

        {/* Search / Lookup Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-4 md:p-6 shadow-xl shadow-primary/5 border border-primary/10 mb-8 max-w-3xl mx-auto">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-primary/40 absolute start-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value)}
                placeholder={t.input_order_placeholder || (isAr ? "أدخل رقم الطلب أو كود التتبع (مثال: cm...)" : "Enter Order # or Tracking Code")}
                className="w-full ps-12 pe-4 py-3.5 md:py-4 bg-cream/40 border border-primary/10 rounded-2xl text-primary font-medium placeholder:text-charcoal/40 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:bg-white transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isPending || !orderQuery.trim()}
              className="px-8 py-3.5 md:py-4 bg-primary text-white font-bold rounded-2xl hover:bg-primary/95 active:scale-95 transition-all text-sm shadow-md shadow-primary/20 flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>{t.btn_tracking || (isAr ? "جاري البحث..." : "Locating...")}</span>
                </>
              ) : (
                <>
                  <span>{t.btn_track || (isAr ? "تتبع الطلب" : "Track Order")}</span>
                  {isAr ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </>
              )}
            </button>
          </form>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </motion.div>
          )}
        </div>

        {/* Order Result View */}
        <AnimatePresence mode="wait">
          {order && (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Order Meta Bar */}
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-primary/10 shadow-lg shadow-primary/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-primary/5">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary/40">
                        {t.order_reference || (isAr ? "رقم الطلب" : "Order Reference")}
                      </span>
                      <span className="font-mono text-xs font-bold text-primary bg-primary/5 px-2.5 py-0.5 rounded-lg border border-primary/10">
                        #{order.id}
                      </span>
                      {order.isGift && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20">
                          <Gift className="w-3 h-3" />
                          <span>{isAr ? "طلب هدية" : "Gift Order"}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-charcoal/60">
                      {t.placed_on || (isAr ? "تاريخ الطلب:" : "Placed on:")}{" "}
                      <strong className="text-charcoal/80 font-bold">
                        {new Date(order.createdAt).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3.5 py-2 rounded-xl bg-cream/70 hover:bg-cream border border-primary/10 text-primary text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-primary/60" />}
                      <span>{copiedLink ? (isAr ? "تم النسخ" : "Copied") : (isAr ? "نسخ رابط التتبع" : "Share Link")}</span>
                    </button>

                    <div className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                      <span>
                        {order.status === "DELIVERED"
                          ? (isAr ? "تم التسليم" : "Delivered")
                          : order.status === "SHIPPED"
                          ? (isAr ? "في الطريق" : "In Transit")
                          : order.status === "PROCESSING"
                          ? (isAr ? "قيد التجهيز" : "Preparing")
                          : order.status === "CANCELLED"
                          ? (isAr ? "ملغي" : "Cancelled")
                          : (isAr ? "قيد التأكيد" : "Confirmed")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cancelled State Card */}
                {isCancelled ? (
                  <div className="mt-8 p-6 rounded-2xl bg-red-50/80 border border-red-200 text-center space-y-2">
                    <XCircle className="w-10 h-10 text-red-500 mx-auto" />
                    <h3 className="font-bold text-red-800 text-lg">
                      {t.step_cancelled_title || (isAr ? "تم إلغاء هذا الطلب" : "Order Cancelled")}
                    </h3>
                    <p className="text-xs text-red-700/80 max-w-md mx-auto">
                      {t.step_cancelled_desc ||
                        (isAr
                          ? "تم إلغاء هذا الطلب واسترداد قيمته وفق سياسة الاسترجاع. تواصل مع الدعم في حال كان لديك أي استفسار."
                          : "This order was cancelled. If you have any inquiries, our support team is available to help.")}
                    </p>
                  </div>
                ) : (
                  /* Visual Milestones Stepper */
                  <div className="pt-8">
                    <div className="relative">
                      {/* Step lines connecting nodes (desktop horizontal) */}
                      <div className="hidden md:block absolute top-6 start-8 end-8 h-1 bg-primary/10 -z-0">
                        <div
                          className="h-full bg-accent transition-all duration-700 rounded-full"
                          style={{
                            width: `${(currentStep / (trackingSteps.length - 1)) * 100}%`,
                          }}
                        />
                      </div>

                      {/* Steps Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-2 relative z-10">
                        {trackingSteps.map((step, idx) => {
                          const IconComponent = step.icon;
                          const isCompleted = idx <= currentStep;
                          const isCurrent = idx === currentStep;

                          return (
                            <div key={idx} className="flex md:flex-col items-start md:items-center gap-4 md:gap-3 text-start md:text-center group">
                              {/* Step circle */}
                              <div
                                className={cn(
                                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all duration-500",
                                  isCompleted
                                    ? isCurrent
                                      ? "bg-accent text-white border-accent shadow-lg shadow-accent/20 scale-110"
                                      : "bg-primary text-white border-primary"
                                    : "bg-white text-primary/30 border-primary/10"
                                )}
                              >
                                <IconComponent className="w-5 h-5" />
                              </div>

                              {/* Step text */}
                              <div className="flex-1 md:flex-none">
                                <p
                                  className={cn(
                                    "text-xs font-bold leading-tight",
                                    isCurrent ? "text-accent font-black text-sm" : isCompleted ? "text-primary" : "text-charcoal/40"
                                  )}
                                >
                                  {step.title}
                                </p>
                                <p className="text-[11px] text-charcoal/50 mt-1 leading-snug line-clamp-2">
                                  {step.desc}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Details & Courier Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Courier / Shipping Card */}
                <div className="bg-white rounded-3xl p-6 border border-primary/10 shadow-md shadow-primary/5 space-y-4">
                  <div className="flex items-center gap-2.5 text-primary">
                    <Truck className="w-5 h-5 text-accent" />
                    <h3 className="font-heading font-bold text-sm text-primary">
                      {t.shipping_method || (isAr ? "بيانات الشحن والنقل" : "Shipping & Carrier")}
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-primary/40">{t.shipping_method || (isAr ? "الخدمة" : "Service")}</p>
                      <p className="font-bold text-primary mt-0.5">{order.shippingMethodName}</p>
                    </div>

                    {order.carrier && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-primary/40">{t.carrier || (isAr ? "شركة الشحن" : "Courier Partner")}</p>
                        <p className="font-bold text-primary mt-0.5">{order.carrier}</p>
                      </div>
                    )}

                    {order.trackingNumber && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-primary/40">{t.tracking_code || (isAr ? "رقم التتبع الرسمي" : "Tracking Code")}</p>
                        <p className="font-mono font-bold text-primary mt-0.5">{order.trackingNumber}</p>
                      </div>
                    )}
                  </div>

                  {order.trackingNumber && order.carrier?.toLowerCase().includes("bosta") && (
                    <a
                      href={`https://bosta.co/tracking-shipment/?track=${order.trackingNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-accent/10 hover:bg-accent text-accent hover:text-white text-xs font-bold border border-accent/20 transition-all active:scale-95"
                    >
                      <span>{t.btn_view_courier || (isAr ? "تتبع مباشر عبر بوسطة" : "Track on Bosta")}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Destination & Contact */}
                <div className="bg-white rounded-3xl p-6 border border-primary/10 shadow-md shadow-primary/5 space-y-4">
                  <div className="flex items-center justify-between text-primary">
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-5 h-5 text-accent" />
                      <h3 className="font-heading font-bold text-sm text-primary">
                        {t.delivery_destination || (isAr ? "وجهة التوصيل" : "Destination")}
                      </h3>
                    </div>
                    {order.isVerified ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>{isAr ? "معتمد" : "Verified"}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowVerifyModal(true)}
                        className="text-[10px] font-bold text-primary/70 hover:text-accent flex items-center gap-1 underline underline-offset-2"
                      >
                        <Lock className="w-3 h-3" />
                        <span>{isAr ? "إظهار العنوان كاملاً" : "Unlock"}</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 text-xs text-charcoal/80">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-primary/40">{isAr ? "العنوان المسجل" : "Address"}</p>
                      <p className="font-bold text-primary mt-0.5">{order.shippingAddress}</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-primary/40">{isAr ? "بيانات التواصل" : "Contact"}</p>
                      <p className="font-mono text-primary mt-0.5 font-medium">{order.clientPhone || "—"}</p>
                      <p className="font-mono text-charcoal/60 text-[11px]">{order.clientEmail || "—"}</p>
                    </div>

                    {!order.isVerified && (
                      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-800 flex items-start gap-1.5 leading-tight">
                        <Lock className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                        <span>{t.privacy_masked_notice || (isAr ? "البيانات محمية جزئياً. انقر على إظهار العنوان لإثبات الملكية." : "Some contact details are hidden for privacy.")}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery Time & Total Amount */}
                <div className="bg-white rounded-3xl p-6 border border-primary/10 shadow-md shadow-primary/5 space-y-4">
                  <div className="flex items-center gap-2.5 text-primary">
                    <Clock className="w-5 h-5 text-accent" />
                    <h3 className="font-heading font-bold text-sm text-primary">
                      {t.estimated_delivery || (isAr ? "الموعد المقدر" : "Estimated Timeline")}
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-primary/40">{isAr ? "الوصول المتوقع" : "Expected By"}</p>
                      <p className="font-bold text-primary text-sm mt-0.5">
                        {new Date(order.estimatedDeliveryMin).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        –{" "}
                        {new Date(order.estimatedDeliveryMax).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-primary/5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-primary/40">{isAr ? "إجمالي الطلب" : "Total Paid"}</p>
                      <p className="font-mono font-black text-primary text-lg mt-0.5">
                        {currency} {order.totalAmount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gift Message Card (if gift) */}
              {order.isGift && order.giftMessage && (
                <div className="bg-linear-to-r from-amber-50/90 to-cream border border-accent/20 rounded-3xl p-6 shadow-sm flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0 text-accent">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-primary text-sm">
                      {t.gift_message_title || (isAr ? "رسالة الإهداء المرفقة بالهدية" : "Includes Special Gift Note")}
                    </h4>
                    <p className="text-xs text-charcoal/80 mt-1 italic leading-relaxed font-serif">
                      &ldquo;{order.giftMessage}&rdquo;
                    </p>
                  </div>
                </div>
              )}

              {/* Ordered Items List */}
              <div className="bg-white rounded-3xl p-6 md:p-8 border border-primary/10 shadow-lg shadow-primary/5 space-y-6">
                <div className="flex items-center justify-between border-b border-primary/5 pb-4">
                  <h3 className="font-heading font-bold text-primary text-base flex items-center gap-2">
                    <Package className="w-4 h-4 text-accent" />
                    <span>{t.items_in_order || (isAr ? "محتويات هذا الطلب" : "Items in this Order")}</span>
                  </h3>
                  <span className="text-xs font-bold text-charcoal/50">
                    {order.items.length} {order.items.length === 1 ? (isAr ? "قطعة" : "item") : (isAr ? "قطع" : "items")}
                  </span>
                </div>

                <div className="divide-y divide-primary/5">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-cream shrink-0 border border-primary/10">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/5">
                              <Package className="w-6 h-6 text-primary/30" />
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Link
                            href={`/${lang}/products/${item.slug}`}
                            className="font-bold text-primary hover:text-accent text-sm md:text-base transition-colors line-clamp-1"
                          >
                            {item.name}
                          </Link>

                          {item.artisan && (
                            <Link
                              href={`/${lang}/artisans/${item.artisan.slug || ""}`}
                              className="inline-flex items-center gap-1.5 text-xs text-charcoal/60 hover:text-primary transition-colors"
                            >
                              <Store className="w-3.5 h-3.5 text-accent" />
                              <span>{item.artisan.studioName}</span>
                            </Link>
                          )}

                          {item.variantName && (
                            <span className="inline-block px-2 py-0.5 bg-cream rounded-md border border-primary/5 text-[10px] font-bold text-primary/70">
                              {item.variantName}
                            </span>
                          )}

                          {item.personalization && (
                            <p className="text-xs text-accent font-medium flex items-center gap-1">
                              <Sparkles className="w-3 h-3 shrink-0" />
                              <span>
                                {t.bespoke_customization || (isAr ? "تخصيص يدوي:" : "Customization:")} &ldquo;{item.personalization}&rdquo;
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="sm:text-end shrink-0 w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end">
                        <p className="font-mono font-bold text-primary text-sm md:text-base">
                          {currency} {item.price * item.quantity}
                        </p>
                        <p className="text-xs text-charcoal/50">
                          {isAr ? "الكمية:" : "Qty:"} {item.quantity} × {currency} {item.price}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Support & Concierge Footer */}
              <div className="bg-primary/5 rounded-3xl p-6 md:p-8 border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 text-center md:text-start">
                  <div className="w-12 h-12 rounded-2xl bg-white text-primary border border-primary/10 flex items-center justify-center shrink-0 shadow-2xs">
                    <HelpCircle className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-primary text-base">
                      {t.support_title || (isAr ? "هل تحتاج مساعدة بخصوص هذه الشحنة؟" : "Need help with this delivery?")}
                    </h4>
                    <p className="text-xs text-charcoal/60 mt-0.5">
                      {t.support_desc || (isAr ? "فريق خدمة عملاء جيفتيزان متاح لمساعدتك ومتابعة الشحنة مع الورشة." : "Our support team is available to assist with any questions regarding your delivery.")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <a
                    href="mailto:support@giftisan.com"
                    className="flex-1 md:flex-none px-6 py-3.5 rounded-2xl bg-primary hover:bg-brand text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-primary/20"
                  >
                    <Mail className="w-4 h-4" />
                    <span>{t.btn_email_support || (isAr ? "راسلنا بالبريد الإلكتروني" : "Email Support")}</span>
                  </a>
                  <Link
                    href={`/${lang}/contact`}
                    className="flex-1 md:flex-none px-5 py-3.5 rounded-2xl bg-white hover:bg-cream border border-primary/10 text-primary text-xs font-bold transition-all text-center flex items-center justify-center gap-2 active:scale-95 shadow-2xs"
                  >
                    <span>{dict?.common?.support || (isAr ? "صفحة الدعم" : "Contact Us")}</span>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verification Modal for unlocking sensitive address details */}
        <AnimatePresence>
          {showVerifyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-primary/10 shadow-2xl space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                    <Lock className="w-5 h-5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVerifyModal(false)}
                    className="text-charcoal/40 hover:text-charcoal p-1"
                  >
                    <Check className="sr-only" />
                    <span className="text-xl leading-none">&times;</span>
                  </button>
                </div>

                <div>
                  <h3 className="font-heading font-bold text-primary text-lg">
                    {t.btn_unlock_details || (isAr ? "إثبات الملكية وإظهار العنوان" : "Verify & Unlock Full Address")}
                  </h3>
                  <p className="text-xs text-charcoal/60 mt-1 leading-relaxed">
                    {isAr
                      ? "أدخل رقم الهاتف أو البريد الإلكتروني المسجل في الطلب لإظهار العنوان الشخصي ورقم التواصل كاملاً."
                      : "Enter the phone number or email registered with this order to unlock sensitive contact and delivery details."}
                  </p>
                </div>

                <form onSubmit={handleVerifyDetails} className="space-y-3 pt-2">
                  <input
                    type="text"
                    value={verificationInput}
                    onChange={(e) => setVerificationInput(e.target.value)}
                    placeholder={t.input_verify_placeholder || (isAr ? "رقم الهاتف أو البريد الإلكتروني" : "Phone number or email")}
                    className="w-full px-4 py-3 bg-cream/40 border border-primary/10 rounded-2xl text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                    required
                  />

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowVerifyModal(false)}
                      className="flex-1 py-3 bg-cream hover:bg-cream/80 text-primary font-bold rounded-2xl text-xs transition-all"
                    >
                      {dict?.common?.cancel || (isAr ? "إلغاء" : "Cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={isPending || !verificationInput.trim()}
                      className="flex-1 py-3 bg-primary hover:bg-primary/95 text-white font-bold rounded-2xl text-xs shadow-md shadow-primary/20 transition-all disabled:opacity-50"
                    >
                      {isPending ? (isAr ? "جاري التحقق..." : "Verifying...") : (isAr ? "تأكيد" : "Verify")}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <Footer dict={dict} />
    </main>
  );
}
