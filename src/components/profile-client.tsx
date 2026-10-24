"use client";

import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { BespokeImage } from "./bespoke-image";
import Link from "next/link";
import { 
  Package, 
  Settings, 
  LogOut, 
  ChevronRight, 
  MapPin, 
  Calendar,
  CreditCard,
  Heart,
  ExternalLink,
  ShieldCheck,
  Truck,
  MessageCircle,
  MessageSquare,
  X,
  Download,
  AlertCircle,
  UploadCloud,
  CheckCircle2,
  Image as ImageIcon,
  Info,
  ChevronDown,
  Check,
  Clock,
  Store
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "next-auth/react";
import { performSignOut, useIsNative } from "@/lib/native";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { retryPaymentAction, cancelPendingOrderAction, submitRefundRequestAction } from "@/lib/actions";
import { useParams } from "next/navigation";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { toast } from "react-hot-toast";
import { NativeProfileView } from "@/components/native/native-profile-view";

interface ProfileClientProps {
  user: any;
  orders: any[];
  dict: any;
}

const getTrackingUrl = (carrier?: string, trackingNumber?: string) => {
  if (!carrier || !trackingNumber) return null;
  const name = carrier.toLowerCase();
  if (name.includes("aramex")) {
    return `https://www.aramex.com/eg/en/track/results?shipmentNumber=${trackingNumber}`;
  }
  if (name.includes("bosta")) {
    return `https://bosta.co/track/${trackingNumber}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(carrier + " " + trackingNumber + " tracking")}`;
};

export function ProfileClient({ user, orders, dict }: ProfileClientProps) {
  const isNative = useIsNative();
  const params = useParams();
  const lang = (params?.lang as string) || "en";
  const isAr = lang === "ar";
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Refund / Dispute State
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedRefundOrder, setSelectedRefundOrder] = useState<any>(null);
  const [selectedRefundItem, setSelectedRefundItem] = useState<any>(null);
  const [refundReason, setRefundReason] = useState<'DAMAGED_IN_TRANSIT' | 'DEFECTIVE_OR_WRONG_ITEM' | 'NOT_AS_DESCRIBED' | 'ORDER_NOT_RECEIVED' | 'OTHER'>('DAMAGED_IN_TRANSIT');
  const [isReasonDropdownOpen, setIsReasonDropdownOpen] = useState(false);
  const [refundPreferredAction, setRefundPreferredAction] = useState<'REFUND' | 'REPLACEMENT'>('REFUND');
  const [refundDetails, setRefundDetails] = useState('');
  const [refundImages, setRefundImages] = useState<string[]>([]);
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const [viewingClaim, setViewingClaim] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reasonDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reasonDropdownRef.current && !reasonDropdownRef.current.contains(e.target as Node)) {
        setIsReasonDropdownOpen(false);
      }
    };
    if (isReasonDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isReasonDropdownOpen]);

  const reasonOptions = [
    { value: "DAMAGED_IN_TRANSIT", label: dict.profile?.reason_damaged || (isAr ? "وصل المنتج تالفاً أثناء الشحن" : "Arrived Damaged in Transit") },
    { value: "DEFECTIVE_OR_WRONG_ITEM", label: dict.profile?.reason_defective || (isAr ? "منتج معيب أو تم استلام منتج خاطئ" : "Defective or Wrong Item Received") },
    { value: "NOT_AS_DESCRIBED", label: dict.profile?.reason_not_described || (isAr ? "مختلف تماماً عن الوصف المعروض" : "Significantly Different from Listing") },
    { value: "ORDER_NOT_RECEIVED", label: dict.profile?.reason_not_received || (isAr ? "لم أستلم طلبي حتى الآن" : "Order Not Received") },
    { value: "OTHER", label: dict.profile?.reason_other || (isAr ? "سبب آخر" : "Other Issue") }
  ];

  const handleDownloadImage = async (url: string) => {
    try {
      if (url.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `custom_client_image_${Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      const cleanUrl = url.split("?")[0];
      const ext = cleanUrl.split(".").pop() || "jpg";
      link.download = `client_custom_image_${Date.now()}.${ext.length <= 4 ? ext : "jpg"}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 200);
    } catch (error) {
      console.error("Direct download failed, falling back:", error);
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.download = `client_custom_image_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const executeCancelOrder = async (orderId: string) => {
    setCancellingOrderId(orderId);
    try {
      const res = await cancelPendingOrderAction(orderId);
      if (!res.success) {
        toast.error(res.error || "Failed to cancel order.");
      }
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleRetryPayment = async (orderId: string) => {
    setRetryingOrderId(orderId);
    setRetryError(null);
    try {
      const res = await retryPaymentAction(orderId);
      if (res.success && res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        setRetryError(res.error || "Failed to regenerate payment session.");
        toast.error(res.error || "Failed to regenerate payment session.");
      }
    } catch (err) {
      setRetryError("An unexpected error occurred. Please try again.");
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setRetryingOrderId(null);
    }
  };

  const openRefundModal = (order: any, item?: any) => {
    setSelectedRefundOrder(order);
    setSelectedRefundItem(item || (order.items && order.items.length === 1 ? order.items[0] : null));
    setRefundReason('DAMAGED_IN_TRANSIT');
    setIsReasonDropdownOpen(false);
    setRefundPreferredAction('REFUND');
    setRefundDetails('');
    setRefundImages([]);
    setRefundModalOpen(true);
  };

  const handleRefundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (refundImages.length + files.length > 5) {
      toast.error(isAr ? "يمكنك إرفاق 5 صور كحد أقصى" : "You can upload a maximum of 5 images");
      return;
    }

    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(isAr ? "حجم الصورة يجب أن لا يتجاوز 5 ميجابايت" : "Image size must not exceed 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setRefundImages(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeRefundImage = (index: number) => {
    setRefundImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefundOrder) return;

    if (!refundDetails.trim()) {
      toast.error(isAr ? "يرجى كتابة تفاصيل المشكلة" : "Please explain the issue");
      return;
    }

    if ((refundReason === 'DAMAGED_IN_TRANSIT' || refundReason === 'DEFECTIVE_OR_WRONG_ITEM') && refundImages.length === 0) {
      toast.error(isAr ? "يرجى إرفاق صورة واحدة على الأقل لإثبات التلف أو العيب" : "Please attach at least one photo showing the damage/defect");
      return;
    }

    setIsSubmittingRefund(true);
    try {
      const res = await submitRefundRequestAction({
        orderId: selectedRefundOrder.id,
        orderItemId: selectedRefundItem?.id,
        reason: refundReason,
        details: refundDetails,
        images: refundImages,
        preferredAction: refundPreferredAction,
        lang: isAr ? 'ar' : 'en'
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(dict.profile?.refund_success || (isAr ? "تم إرسال طلبك بنجاح! سيتم مراجعته والتواصل معك فوراً." : "Claim submitted successfully! We are reviewing it and will notify you."));
        setRefundModalOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request");
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  return (
    <main className="min-h-screen bg-cream">
      {isNative ? (
        <NativeProfileView
          user={user}
          orders={orders}
          dict={dict}
          lang={lang}
          onRetryPayment={handleRetryPayment}
          onCancelOrder={executeCancelOrder}
          onOpenRefundModal={openRefundModal}
          retryingOrderId={retryingOrderId}
          cancellingOrderId={cancellingOrderId}
        />
      ) : (
        <>
          <Navbar dict={dict} />

          <div className="container mx-auto px-4 pt-24 md:pt-32 pb-20">
            <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-8 md:gap-12">
          
          {/* Sidebar / Profile Header */}
          <aside className="lg:col-span-4 space-y-6 md:space-y-8">
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl shadow-primary/5 border border-primary/5 relative overflow-hidden">
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="relative w-24 h-24 md:w-32 md:h-32 mb-4 md:mb-6 group">
                  <div className="absolute inset-0 bg-accent/20 rounded-full blur-2xl group-hover:blur-3xl transition-all" />
                  <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-xl">
                    <BespokeImage 
                      src={user.image || `https://api.dicebear.com/10.x/gaze/svg?seed=${user.name}`} 
                      alt={user.name} 
                      fill 
                      className="object-cover"
                    />
                  </div>
                </div>
                
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary mb-1">{user.name}</h1>
                <p className="text-charcoal/40 text-xs md:text-sm font-medium mb-6 md:mb-8">{user.email}</p>
                
                <div className="w-full grid grid-cols-1 gap-2">
                  <Link 
                    href="/profile/messages" 
                    className="flex items-center justify-between w-full p-3 md:p-4 bg-primary/5 rounded-2xl text-primary font-bold hover:bg-primary hover:text-white transition-all group text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 md:w-5 md:h-5 opacity-100" />
                      <span>{dict.common?.messages || (isAr ? "الرسائل والمحادثات" : "Messages & Inquiries")}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                  </Link>

                  <Link 
                    href="/profile/settings" 
                    className="flex items-center justify-between w-full p-3 md:p-4 bg-primary/5 rounded-2xl text-primary font-bold hover:bg-primary hover:text-white transition-all group text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="w-4 h-4 md:w-5 md:h-5 opacity-100" />
                      <span>{dict.profile.settings}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100" />
                  </Link>
                  {user.role === "ARTISAN" && (
                    <Link 
                      href="/studio"
                      className="flex items-center justify-between w-full p-3 md:p-4 bg-primary/5 rounded-2xl text-primary font-bold hover:bg-primary hover:text-white transition-all group text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <Store className="w-4 h-4 md:w-5 md:h-5 opacity-100" />
                        <span>{dict.profile?.studio || dict.common?.pro_studio || "Shop Manager"}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                    </Link>
                  )}
                  {user.role === "ADMIN" && (
                    <Link 
                      href="/admin"
                      className="flex items-center justify-between w-full p-3 md:p-4 bg-primary/5 rounded-2xl text-primary font-bold hover:bg-primary hover:text-white transition-all group text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 opacity-100" />
                        <span>{dict.profile.admin || "Admin"}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition-transform" />
                    </Link>
                  )}
                  <button 
                    onClick={() => performSignOut(lang)}
                    className="flex items-center justify-between w-full p-3 md:p-4 bg-red-50 rounded-2xl text-red-500 font-bold hover:bg-red-500 hover:text-white transition-all group text-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <LogOut className="w-4 h-4 md:w-5 md:h-5 opacity-100 lg:opacity-40 lg:group-hover:opacity-100" />
                      <span>{dict.profile.sign_out}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-primary text-white rounded-[2rem] md:rounded-[3rem] p-8 md:p-10 shadow-2xl shadow-primary/20">
              <h3 className="text-lg md:text-xl font-heading font-bold mb-4 md:mb-6">{dict.profile.order_impact}</h3>
              <div className="space-y-4 md:space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <span className="text-white/60 text-sm">{dict.profile.creations_owned}</span>
                  <span className="text-xl md:text-2xl font-bold">{orders.length}</span>
                </div>
                <div className="p-4 bg-white/10 rounded-2xl">
                  <p className="text-[10px] text-white/40 uppercase font-black mb-1">{dict.profile.our_mission}</p>
                  <p className="text-[10px] md:text-sm italic leading-relaxed text-white/80">"{dict.profile.mission_quote}"</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8 md:space-y-12">
            <section>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-8 gap-4">
                <div>
                  <h2 className="text-2xl md:text-4xl font-heading font-bold text-primary">
                    {(dict.profile.journey_title_base || dict.profile.your_journey?.split(' ')[0])}{" "}
                    <span className="serif italic font-normal text-accent">
                      {(dict.profile.journey_title_accent || dict.profile.your_journey?.split(' ').slice(1).join(' '))}
                    </span>
                  </h2>
                  <p className="text-charcoal/40 text-xs md:text-sm mt-1">{dict.profile.track_orders}</p>
                </div>
                <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-accent hover:underline">
                  {dict.checkout.continue_shopping} →
                </Link>
              </div>

              <div className="space-y-4 md:space-y-6">
                {orders.length === 0 ? (
                  <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-10 md:p-16 text-center border border-primary/5 shadow-xl shadow-primary/5">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-cream rounded-full flex items-center justify-center mx-auto mb-6">
                      <Package className="w-8 h-8 md:w-10 md:h-10 text-primary/20" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-heading font-bold text-primary mb-2">{dict.profile.no_treasures_yet}</h3>
                    <p className="text-charcoal/40 text-xs md:text-sm max-w-xs mx-auto mb-8">{dict.profile.ready_find_first}</p>
                    <Link href="/" className="inline-flex items-center justify-center px-8 md:px-10 h-12 md:h-14 bg-primary text-white font-bold rounded-full text-xs transition-all">
                      {dict.profile.explore_gallery}
                    </Link>
                  </div>
                ) : (
                  orders.map((order) => (
                    <motion.div 
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-primary/5 shadow-xl shadow-primary/5 overflow-hidden"
                    >
                    <div className="p-4 md:p-8 border-b border-primary/5 bg-cream/30 flex flex-wrap justify-between items-center gap-3">
                      <div className="flex flex-wrap gap-4 md:gap-8 overflow-x-auto no-scrollbar scrollbar-hide pb-1">
                          <div className="shrink-0 max-w-[200px] md:max-w-xs">
                            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-primary/40 mb-0.5 md:mb-1">{dict.profile.reference}</p>
                            <p className="text-xs md:text-sm font-bold text-primary font-mono tracking-tighter break-all">{order.id}</p>
                          </div>
                          <div className="shrink-0">
                            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-primary/40 mb-0.5 md:mb-1">{dict.profile.placed_on}</p>
                            <p className="text-xs md:text-sm font-bold text-primary shrink-0">
                              {new Date(order.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-primary/40 mb-0.5 md:mb-1">
                              {order.status === "PENDING" || order.status === "FAILED"
                                ? (isAr ? "إجمالي المبلغ" : "Total Amount") 
                                : dict.profile.total_paid}
                            </p>
                            <div className="flex flex-col">
                              <p className="text-xs md:text-sm font-bold text-accent shrink-0">{dict.product?.currency || "EGP"} {order.totalAmount.toLocaleString()}</p>
                              {order.discountApplied > 0 && (
                                <span className="text-[8px] md:text-[9px] font-black text-emerald-600 bg-emerald-500/10 border border-emerald-500/10 px-1.5 py-0.5 rounded mt-1 w-fit uppercase tracking-wider">
                                  {isAr ? "وفّرت:" : "Saved:"} {dict.product.currency} {order.discountApplied}
                                </span>
                              )}
                            </div>
                          </div>
                          {order.isGift && (
                            <div className="shrink-0 flex flex-col gap-1 items-end">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-accent">{dict.checkout.mark_as_gift}</span>
                              </div>
                              {order.giftMessage && (
                                <p className="text-xs italic text-charcoal/70 bg-accent/5 p-2.5 rounded-xl border border-accent/10 max-w-xs text-start">
                                  "{order.giftMessage}"
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {(order.status === "PENDING" || order.status === "FAILED") && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setOrderToCancel(order.id)}
                              disabled={cancellingOrderId !== null || retryingOrderId !== null}
                              className={cn(
                                "flex items-center gap-1.5 px-4 py-2.5 border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer",
                                cancellingOrderId === order.id && "animate-pulse"
                              )}
                            >
                              <X className="w-4 h-4" />
                              <span>{cancellingOrderId === order.id ? (isAr ? "جاري الإلغاء..." : "Cancelling...") : (dict.common?.cancel || (isAr ? "إلغاء الطلب" : "Cancel"))}</span>
                            </button>
                            <button
                              onClick={() => handleRetryPayment(order.id)}
                              disabled={retryingOrderId !== null || cancellingOrderId !== null}
                              className={cn(
                                "flex items-center gap-2 px-5 py-2.5 bg-accent text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-accent/90 transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer",
                                retryingOrderId === order.id && "animate-pulse"
                              )}
                            >
                              <CreditCard className="w-4 h-4" />
                              <span>{retryingOrderId === order.id ? dict.checkout.processing : dict.checkout.pay_now || "Pay Now"}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="p-4 md:p-8 space-y-6">
                        {order.status !== "PENDING" && order.status !== "CANCELLED" && order.status !== "FAILED" && (
                          <div className="mb-8 p-6 md:p-8 bg-cream/10 rounded-[2rem] border border-primary/5">
                            <div className="relative flex justify-between items-center max-w-xl mx-auto">
                              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary/10 -z-10" />
                              <div 
                                className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-accent transition-all duration-500 -z-10" 
                                style={{
                                  width: order.status === "DELIVERED" ? "100%" : order.status === "SHIPPED" ? "50%" : "0%"
                                }}
                              />

                              <div className="flex flex-col items-center gap-2 bg-cream/5 px-2">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all shadow-sm",
                                  order.status === "PROCESSING" || order.status === "SHIPPED" || order.status === "DELIVERED"
                                    ? "bg-accent border-accent text-white"
                                    : "bg-white border-primary/20 text-primary/40"
                                )}>
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                                <p className="text-[10px] md:text-xs font-black uppercase tracking-wider text-primary text-center">
                                  {dict.admin?.approved || "Paid"}
                                </p>
                              </div>

                              <div className="flex flex-col items-center gap-2 bg-cream/5 px-2">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all shadow-sm",
                                  order.status === "SHIPPED" || order.status === "DELIVERED"
                                    ? "bg-accent border-accent text-white"
                                    : "bg-white border-primary/20 text-primary/40"
                                )}>
                                  {order.status === "SHIPPED" || order.status === "DELIVERED" ? <Check className="w-4 h-4 text-white" /> : "2"}
                                </div>
                                <p className="text-[10px] md:text-xs font-black uppercase tracking-wider text-primary text-center">
                                  {dict.profile?.shipped || "Shipped"}
                                </p>
                              </div>

                              <div className="flex flex-col items-center gap-2 bg-cream/5 px-2">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all shadow-sm",
                                  order.status === "DELIVERED"
                                    ? "bg-accent border-accent text-white"
                                    : "bg-white border-primary/20 text-primary/40"
                                )}>
                                  {order.status === "DELIVERED" ? <Check className="w-4 h-4 text-white" /> : "3"}
                                </div>
                                <p className="text-[10px] md:text-xs font-black uppercase tracking-wider text-primary text-center">
                                  {dict.profile?.delivered || "Delivered"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {order.items.map((item: any) => {
                          const preparingText = dict.profile?.preparing || (isAr ? "جاري التجهيز" : "Preparing");
                          const awaitingPaymentText = isAr ? "بانتظار الدفع" : "Awaiting Payment";
                          const cancelledText = isAr ? "ملغي" : "Cancelled";
                          const itemClaim = item.refundRequests?.[0] || order.refundRequests?.find((r: any) => r.orderItemId === item.id || (!r.orderItemId && order.items.length === 1));

                          return (
                            <div key={item.id} className="border-b last:border-0 border-primary/5 pb-6 last:pb-0">
                              <div className="flex gap-4 md:gap-6 items-start md:items-center">
                                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl overflow-hidden bg-cream shrink-0">
                                  <BespokeImage src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <Link href={`/products/${item.product.slug || item.product.id}`} className="block text-sm md:text-base font-heading font-bold text-primary hover:text-accent transition-colors line-clamp-1">
                                    {item.product.name}
                                  </Link>
                                  <p className="text-[10px] md:text-xs text-charcoal/40 font-medium">{dict.profile.qty}: {item.quantity}{item.product.artisan ? ` • ${item.product.artisan.studioName || item.product.artisan.user?.name || item.product.artisan.name || ""}` : ""}</p>
                                  
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {order.status === "PENDING" ? (
                                      <div className="px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border shrink-0 bg-slate-100 text-slate-500 border-slate-200">
                                        {awaitingPaymentText}
                                      </div>
                                    ) : order.status === "CANCELLED" ? (
                                      <div className="px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border shrink-0 bg-red-50 text-red-600 border-red-200">
                                        {cancelledText}
                                      </div>
                                    ) : (
                                      <div className={cn(
                                        "px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border shrink-0",
                                        item.status === "PENDING" ? "bg-yellow-50 text-yellow-600 border-yellow-200" :
                                        item.status === "PROCESSING" ? "bg-purple-50 text-purple-700 border-purple-200 animate-pulse" :
                                        item.status === "SHIPPED" ? "bg-blue-50 text-blue-600 border-blue-200" :
                                        item.status === "REFUNDED" ? "bg-red-50 text-red-700 border-red-200 font-bold" :
                                        "bg-green-50 text-green-600 border-green-200"
                                      )}>
                                        {item.status === "PENDING" ? preparingText :
                                        item.status === "PROCESSING" ? (isAr ? "جاهز للشحن" : "Ready for Shipping") :
                                        item.status === "SHIPPED" ? dict.profile.shipped :
                                        item.status === "REFUNDED" ? (isAr ? "تم الاسترجاع" : "Refunded") :
                                        dict.profile.delivered}
                                      </div>
                                    )}

                                    {item.product.artisan?.userId && (
                                      <Link 
                                        href={`/profile/messages?userId=${item.product.artisan.userId}`}
                                        className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-primary/40 hover:text-accent transition-colors"
                                      >
                                        <MessageCircle className="w-3 h-3" />
                                        <span>{dict.profile?.contact || (isAr ? "تواصل" : "Contact")}</span>
                                      </Link>
                                    )}
                                  </div>

                                  {item.personalization && (
                                    <div className="mt-2 text-[9px] md:text-[10px] italic text-accent flex items-center gap-2">
                                      <span className="w-1 h-1 bg-accent rounded-full shrink-0" />
                                      <span className="line-clamp-1">{dict.profile.personalized}: "{item.personalization}"</span>
                                    </div>
                                  )}

                                  {item.customImage && (
                                    <div className="mt-2 text-[9px] md:text-[10px] text-accent flex items-center gap-2">
                                      <button 
                                        type="button"
                                        onClick={() => setViewingImage(item.customImage)}
                                        className="relative w-6 h-6 rounded overflow-hidden shrink-0 border border-accent/20 bg-white cursor-pointer hover:opacity-80 transition-opacity"
                                      >
                                        <img src={item.customImage} alt="Custom uploaded photo" className="w-full h-full object-cover" />
                                      </button>
                                      <span className="font-bold">{dict.product?.custom_image_attached || (isAr ? "صورة مخصصة مرفقة" : "Custom photo attached")}</span>
                                      <button 
                                        type="button"
                                        onClick={() => setViewingImage(item.customImage)} 
                                        className="underline ms-1 font-semibold cursor-pointer hover:text-accent-light"
                                      >
                                        {dict.common?.view_image || (isAr ? "عرض" : "View")}
                                      </button>
                                    </div>
                                  )}

                                  {order.status !== "PENDING" && order.status !== "CANCELLED" && order.status !== "FAILED" && (
                                    <div className="mt-3 pt-3 border-t border-primary/5 flex flex-wrap items-center justify-between gap-2">
                                      {itemClaim ? (
                                        <div className="flex items-center gap-2">
                                          <span className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider border shadow-sm",
                                            itemClaim.status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                            itemClaim.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                            itemClaim.status === "REPLACEMENT_ISSUED" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                            "bg-rose-50 text-rose-700 border-rose-200"
                                          )}>
                                            {itemClaim.status === "PENDING" && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                                            {itemClaim.status === "APPROVED" && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                            {itemClaim.status === "REPLACEMENT_ISSUED" && <Truck className="w-3 h-3 text-blue-600" />}
                                            {itemClaim.status === "REJECTED" && <AlertCircle className="w-3 h-3 text-rose-600" />}
                                            
                                            {itemClaim.status === "PENDING" ? (dict.profile?.refund_status_pending || (isAr ? "الطلب قيد المراجعة" : "Claim Pending Review")) :
                                             itemClaim.status === "APPROVED" ? (dict.profile?.refund_status_approved || (isAr ? "تمت الموافقة على الاسترجاع" : "Refund Approved")) :
                                             itemClaim.status === "REPLACEMENT_ISSUED" ? (dict.profile?.refund_status_replacement || (isAr ? "جاري تجهيز البديل" : "Replacement Dispatched")) :
                                             (dict.profile?.refund_status_rejected || (isAr ? "تم رفض الطلب" : "Claim Declined"))}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => setViewingClaim(itemClaim)}
                                            className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer"
                                          >
                                            <Info className="w-3 h-3" />
                                            <span>{dict.profile?.view_claim_details || (isAr ? "تفاصيل الشكوى" : "View Claim")}</span>
                                          </button>
                                        </div>
                                      ) : item.status === "REFUNDED" || order.status === "REFUNDED" ? (
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
                                          <CheckCircle2 className="w-3 h-3 text-rose-600" />
                                          <span>{isAr ? "تم استرجاع هذا المنتج" : "Item Refund Completed"}</span>
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => openRefundModal(order, item)}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] md:text-xs font-bold text-charcoal/70 hover:text-red-600 hover:bg-red-50/80 border border-primary/10 hover:border-red-200 transition-all active:scale-95 cursor-pointer"
                                        >
                                          <AlertCircle className="w-3.5 h-3.5 text-accent" />
                                          <span>{dict.profile?.request_refund_btn || (isAr ? "إبلاغ عن مشكلة / استرجاع" : "Report Issue / Refund")}</span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {item.status === "SHIPPED" && item.trackingNumber && (
                                <div className="mt-4 p-4 md:p-5 bg-primary/5 rounded-2xl md:rounded-[2rem] border border-primary/5 flex flex-col md:flex-row justify-between items-center gap-3">
                                  <div className="flex items-center gap-3 w-full md:w-auto">
                                    <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center text-accent shadow-sm shrink-0">
                                      <Truck className="w-4 h-4 md:w-5 md:h-5" />
                                    </div>
                                    <div>
                                      <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-primary/40 leading-none mb-1">{dict.profile.carrier}</p>
                                      <p className="text-xs md:text-sm font-bold text-primary">{item.carrier}</p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap md:flex-nowrap items-center gap-4 justify-between w-full md:w-auto border-t md:border-t-0 border-primary/5 pt-3 md:pt-0">
                                    <div className="flex flex-col md:items-end">
                                      <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-primary/20 leading-none mb-1 text-start md:text-end">{dict.profile.tracking_id}</p>
                                      <p className="text-xs md:text-sm font-mono font-bold text-primary text-start md:text-end break-all">{item.trackingNumber}</p>
                                    </div>
                                    {getTrackingUrl(item.carrier, item.trackingNumber) && (
                                      <a
                                        href={getTrackingUrl(item.carrier, item.trackingNumber) || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white font-bold rounded-lg text-xs hover:bg-brand transition-colors shadow-sm active:scale-95"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>Track</span>
                                      </a>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </section>
        </div>
      </div>
    </div>

          <Footer dict={dict} />
        </>
      )}

      <ConfirmationModal
        isOpen={orderToCancel !== null}
        onClose={() => setOrderToCancel(null)}
        onConfirm={() => {
          if (orderToCancel) {
            executeCancelOrder(orderToCancel);
          }
        }}
        title={isAr ? "إلغاء الطلب؟" : "Cancel Order?"}
        message={isAr ? "هل أنت متأكد من إلغاء هذا الطلب؟ سيتم استعادة المخزون فوراً." : "Are you sure you want to cancel this order? Reserved stock will be restored immediately."}
        confirmText={isAr ? "نعم، إلغاء" : "Yes, Cancel"}
        cancelText={dict.common?.cancel || (isAr ? "تراجع" : "Keep Order")}
        isDestructive={true}
      />

      {/* Claim / Refund Request Modal */}
      <AnimatePresence>
        {refundModalOpen && selectedRefundOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setRefundModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xl bg-white rounded-[2rem] p-6 md:p-8 shadow-2xl border border-primary/5 my-8"
            >
              <button
                type="button"
                onClick={() => setRefundModalOpen(false)}
                className="absolute top-6 end-6 w-9 h-9 rounded-full bg-cream hover:bg-primary/5 flex items-center justify-center text-charcoal/60 hover:text-primary transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-heading font-bold text-primary">
                    {dict.profile?.refund_modal_title || (isAr ? "تقديم طلب استرجاع أو إبلاغ عن مشكلة" : "Report an Issue & Request Refund")}
                  </h3>
                  <p className="text-[10px] md:text-xs text-charcoal/50">
                    {dict.profile?.refund_modal_subtitle || (isAr ? "حماية المشتري من جيفتيزان: نقوم بمراجعة كل طلب ونضمن حلاً عادلاً." : "Giftisan Buyer Protection: We review every claim and guarantee your rights.")}
                  </p>
                </div>
              </div>

              {selectedRefundItem && (
                <div className="p-3.5 bg-cream/40 rounded-2xl border border-primary/5 flex items-center gap-3.5 mb-5">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-cream shrink-0">
                    <img src={selectedRefundItem.product?.images?.[0]} alt={selectedRefundItem.product?.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-primary truncate">{selectedRefundItem.product?.name}</p>
                    <p className="text-[10px] text-charcoal/50 font-mono break-all">#{selectedRefundOrder.id} • EGP {(selectedRefundItem.price * selectedRefundItem.quantity).toLocaleString()}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitRefund} className="space-y-4">
                <div className="relative" ref={reasonDropdownRef}>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-primary/60 mb-2">
                    {dict.profile?.refund_reason_label || (isAr ? "سبب الطلب" : "Reason for Claim")}
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => setIsReasonDropdownOpen(!isReasonDropdownOpen)}
                    className={cn(
                      "w-full h-11 px-4 bg-cream/30 border rounded-xl text-xs md:text-sm font-bold text-primary flex items-center justify-between transition-all cursor-pointer",
                      isReasonDropdownOpen
                        ? "border-accent ring-2 ring-accent/20 bg-white"
                        : "border-primary/10 hover:border-primary/20 hover:bg-cream/50"
                    )}
                  >
                    <span className="truncate">
                      {reasonOptions.find(o => o.value === refundReason)?.label}
                    </span>
                    <ChevronDown className={cn("w-4 h-4 text-primary/40 transition-transform duration-200 shrink-0 ms-2", isReasonDropdownOpen && "rotate-180 text-accent")} />
                  </button>

                  <AnimatePresence>
                    {isReasonDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 start-0 end-0 mt-1.5 p-1.5 bg-white border border-primary/10 rounded-2xl shadow-xl shadow-primary/10 overflow-hidden space-y-0.5"
                      >
                        {reasonOptions.map((opt) => {
                          const isSelected = refundReason === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setRefundReason(opt.value as any);
                                setIsReasonDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center justify-between text-start transition-all cursor-pointer",
                                isSelected
                                  ? "bg-accent/10 text-accent"
                                  : "text-primary hover:bg-cream/50 hover:text-accent"
                              )}
                            >
                              <span>{opt.label}</span>
                              {isSelected && <Check className="w-4 h-4 text-accent shrink-0 ms-2" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-primary/60 mb-2">
                    {dict.profile?.refund_preferred_action || (isAr ? "الحل المفضل" : "Preferred Resolution")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRefundPreferredAction('REFUND')}
                      className={cn(
                        "p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer",
                        refundPreferredAction === 'REFUND'
                          ? "bg-accent text-white border-accent shadow-md shadow-accent/20"
                          : "bg-cream/20 border-primary/10 text-primary hover:bg-cream"
                      )}
                    >
                      {dict.profile?.action_refund || (isAr ? "استرداد المبلغ" : "Full Refund")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRefundPreferredAction('REPLACEMENT')}
                      className={cn(
                        "p-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer",
                        refundPreferredAction === 'REPLACEMENT'
                          ? "bg-accent text-white border-accent shadow-md shadow-accent/20"
                          : "bg-cream/20 border-primary/10 text-primary hover:bg-cream"
                      )}
                    >
                      {dict.profile?.action_replacement || (isAr ? "قطعة بديلة مجانية" : "Free Replacement")}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-primary/60 mb-2">
                    {dict.profile?.refund_details_label || (isAr ? "اشرح تفاصيل المشكلة" : "Explain the Issue in Detail")}
                  </label>
                  <textarea
                    rows={3}
                    value={refundDetails}
                    onChange={(e) => setRefundDetails(e.target.value)}
                    placeholder={dict.profile?.refund_details_placeholder || (isAr ? "يرجى توضيح ما حدث بدقة..." : "Please describe what happened...")}
                    className="w-full p-3 bg-cream/30 border border-primary/10 rounded-xl text-xs md:text-sm font-medium text-primary focus:ring-2 focus:ring-accent/30 focus:outline-none transition-all placeholder:text-primary/30"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-primary/60 mb-1">
                    {dict.profile?.refund_photos_label || (isAr ? "إرفاق صور إثبات (المنتج والتغليف)" : "Upload Photo Proof (Item & Box)")}
                  </label>
                  <p className="text-[10px] text-charcoal/40 mb-2">
                    {dict.profile?.refund_photos_hint || (isAr ? "الصور الواضحة مطلوبة لمراجعة مطالبات التلف والعيوب." : "Clear photos required for damage/defect review.")}
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleRefundImageUpload}
                    className="hidden"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    {refundImages.map((img, idx) => (
                      <div key={idx} className="relative w-14 h-14 rounded-xl overflow-hidden border border-primary/10 group shrink-0">
                        <img src={img} alt="Evidence" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeRefundImage(idx)}
                          className="absolute top-1 end-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {refundImages.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-14 h-14 rounded-xl border-2 border-dashed border-primary/20 hover:border-accent flex flex-col items-center justify-center text-primary/40 hover:text-accent transition-all cursor-pointer bg-cream/20"
                      >
                        <UploadCloud className="w-5 h-5" />
                        <span className="text-[8px] font-bold mt-0.5">+ Foto</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-primary/5">
                  <button
                    type="button"
                    onClick={() => setRefundModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-charcoal/60 hover:bg-cream transition-all cursor-pointer"
                  >
                    {dict.common?.cancel || (isAr ? "إلغاء" : "Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRefund}
                    className="px-6 py-2.5 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingRefund ? (dict.profile?.refund_submitting || (isAr ? "جاري الإرسال..." : "Submitting...")) : (dict.profile?.refund_submit_btn || (isAr ? "إرسال الطلب للمراجعة" : "Submit Claim for Review"))}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Claim Details Modal */}
      <AnimatePresence>
        {viewingClaim && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setViewingClaim(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-white rounded-[2rem] p-6 md:p-8 shadow-2xl border border-primary/5 my-8"
            >
              <button
                type="button"
                onClick={() => setViewingClaim(null)}
                className="absolute top-6 end-6 w-9 h-9 rounded-full bg-cream hover:bg-primary/5 flex items-center justify-center text-charcoal/60 hover:text-primary transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                  viewingClaim.status === "PENDING" ? "bg-amber-50 text-amber-600" :
                  viewingClaim.status === "APPROVED" ? "bg-emerald-50 text-emerald-600" :
                  viewingClaim.status === "REPLACEMENT_ISSUED" ? "bg-blue-50 text-blue-600" :
                  "bg-rose-50 text-rose-600"
                )}>
                  {viewingClaim.status === "PENDING" && <Clock className="w-5 h-5 animate-pulse" />}
                  {viewingClaim.status === "APPROVED" && <CheckCircle2 className="w-5 h-5" />}
                  {viewingClaim.status === "REPLACEMENT_ISSUED" && <Truck className="w-5 h-5" />}
                  {viewingClaim.status === "REJECTED" && <AlertCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-xl font-heading font-bold text-primary">
                    {isAr ? "تفاصيل طلب الاسترجاع" : "Claim Status Details"}
                  </h3>
                  <p className="text-[10px] font-mono text-charcoal/40 break-all">
                    Ticket #{viewingClaim.id}
                  </p>
                </div>
              </div>

              <div className="space-y-4 text-xs md:text-sm">
                <div className="p-3.5 bg-cream/40 rounded-xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-charcoal/50">{isAr ? "الحالة الحالية" : "Current Status"}:</span>
                    <span className="font-bold text-primary">
                      {viewingClaim.status === "PENDING" ? (isAr ? "قيد المراجعة من الإدارة" : "Pending Admin Review") :
                       viewingClaim.status === "APPROVED" ? (isAr ? "تمت الموافقة على الاسترجاع" : "Refund Approved") :
                       viewingClaim.status === "REPLACEMENT_ISSUED" ? (isAr ? "تم إرسال قطعة بديلة" : "Replacement Issued") :
                       (isAr ? "تم رفض الطلب" : "Claim Declined")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal/50">{isAr ? "الحل المطلوب" : "Requested Action"}:</span>
                    <span className="font-bold text-accent">{viewingClaim.preferredAction === 'REPLACEMENT' ? (isAr ? 'قطعة بديلة' : 'Replacement') : (isAr ? 'استرداد المبلغ' : 'Refund')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal/50">{isAr ? "تاريخ التقديم" : "Submitted Date"}:</span>
                    <span className="font-medium text-primary">
                      {new Date(viewingClaim.createdAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1">{isAr ? "شرح المشكلة" : "Claim Details"}</p>
                  <p className="p-3 bg-cream/20 rounded-xl text-primary/80 font-medium leading-relaxed">{viewingClaim.details}</p>
                </div>

                {viewingClaim.adminNote && (
                  <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-1">{isAr ? "ملاحظة من إدارة المنصة" : "Giftisan Admin Note"}</p>
                    <p className="text-primary font-medium">{viewingClaim.adminNote}</p>
                  </div>
                )}

                {viewingClaim.images && viewingClaim.images.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-2">{isAr ? "الصور المرفقة" : "Attached Evidence"}</p>
                    <div className="flex flex-wrap gap-2">
                      {viewingClaim.images.map((img: string, i: number) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setViewingImage(img)}
                          className="relative w-16 h-16 rounded-xl overflow-hidden border border-primary/10 hover:opacity-80 transition-opacity cursor-pointer shrink-0"
                        >
                          <img src={img} alt="Evidence" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewingImage(null)}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative max-w-4xl max-h-[85vh] flex items-center justify-center overflow-hidden rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setViewingImage(null)}
                className="absolute top-4 end-4 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 backdrop-blur-md text-white flex items-center justify-center transition-all shadow-lg active:scale-90 cursor-pointer"
                title={dict.product?.close || dict.common?.close || (isAr ? "إغلاق" : "Close")}
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={viewingImage}
                alt="Custom design preview"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
