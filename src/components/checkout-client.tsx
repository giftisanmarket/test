"use client";

import { useCart } from "@/context/cart-context";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { 
  ShieldCheck, 
  Truck, 
  Lock, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2, 
  MessageSquare, 
  Loader2, 
  MapPin, 
  Gift, 
  AlertCircle,
  ShoppingBag,
  CreditCard,
  Banknote,
  ChevronDown,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { createOrder, validateCouponAction, getAllShippingMethods } from "@/lib/actions";
import { EGYPT_GOVERNORATES, findZoneForGovernorate, matchEgyptGovernorate, translateShippingZone, translateDeliveryDays } from "@/lib/egypt-governorates";
import { GovernorateSelect } from "@/components/ui/governorate-select";
import { useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { toast } from "react-hot-toast";
import { isNativePlatform } from "@/lib/native";

export function CheckoutClient({ dict }: { dict: any }) {
  const params = useParams();
  const lang = (params?.lang as string) || "en";
  const isAr = lang === "ar" || dict?.common?.home === "الرئيسية";
  const router = useRouter();

  // Feature Flags
  const ENABLE_COUPONS = true;
  const APPLY_COUPON_DISCOUNTS = true;

  const { cart, totalPrice, clearCart } = useCart();
  const { data: session } = useSession();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Mobile Order Summary Accordion
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);

  // Promo Coupon States
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Shipping Methods & Zone
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [isLoadingMethods, setIsLoadingMethods] = useState(true);
  const [selectedGovernorateId, setSelectedGovernorateId] = useState<string>("cairo");
  const [gpsPinUrl, setGpsPinUrl] = useState<string>("");

  // Payment Method: 'paymob' (Card / Wallet / InstaPay) or 'cod' (Cash on Delivery)
  const [paymentMethod, setPaymentMethod] = useState<"paymob" | "cod">("paymob");

  const promoPlaceholder = isAr ? "كود الخصم (مثال: GIFT10)" : "Promo Code (e.g. GIFT10)";
  const promoApply = isAr ? "تطبيق" : "Apply";
  const promoRemove = isAr ? "إزالة" : "Remove";
  const promoDiscountLabel = isAr ? "خصم ترويجي" : "Promo Discount";

  const [shippingData, setShippingData] = useState({
    firstName: "",
    lastName: "",
    address: "",
    building: "",
    floor: "",
    apartment: "",
    city: "Cairo",
    zip: "",
    country: "Egypt",
    phone: "",
    email: session?.user?.email || "",
    isGift: false,
    giftMessage: "",
    deliveryNotes: ""
  });

  // Auto-restore saved shipping address from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("giftisan_saved_shipping");
      if (saved) {
        const parsed = JSON.parse(saved);
        setShippingData(prev => ({
          ...prev,
          firstName: prev.firstName || parsed.firstName || "",
          lastName: prev.lastName || parsed.lastName || "",
          address: prev.address || parsed.address || "",
          building: prev.building || parsed.building || "",
          floor: prev.floor || parsed.floor || "",
          apartment: prev.apartment || parsed.apartment || "",
          city: prev.city || parsed.city || "Cairo",
          zip: prev.zip || parsed.zip || "",
          phone: prev.phone || parsed.phone || "",
          email: prev.email || parsed.email || session?.user?.email || ""
        }));
      }
    } catch (e) {
      // Ignore parse error
    }
  }, [session]);

  // Load Shipping Methods on mount
  useEffect(() => {
    async function loadMethods() {
      try {
        const res = await getAllShippingMethods();
        const methodsList = Array.isArray(res) ? res : (res as any)?.data || [];
        if (methodsList.length > 0) {
          setShippingMethods(methodsList);
          const matched = findZoneForGovernorate(selectedGovernorateId, methodsList);
          if (matched) {
            setSelectedMethod(matched);
          } else {
            setSelectedMethod(methodsList[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load shipping methods:", err);
      } finally {
        setIsLoadingMethods(false);
      }
    }
    loadMethods();
  }, [selectedGovernorateId]);

  const updateShippingField = (field: string, value: any) => {
    setShippingData(prev => ({ ...prev, [field]: value }));
    if (validationErrors.includes(field)) {
      setValidationErrors(prev => prev.filter(f => f !== field));
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError(isAr ? "خدمة تحديد الموقع غير مدعومة في متصفحك." : "Geolocation is not supported by your browser.");
      return;
    }

    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const googleMapsPin = `https://maps.google.com/?q=${latitude},${longitude}`;

          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.address) {
            const detectedCity = data.address.city || data.address.state || data.address.town || data.address.governorate || "Cairo";
            const detectedStreet = [data.address.road, data.address.suburb, data.address.neighbourhood].filter(Boolean).join(", ") || data.display_name?.split(",")[0] || "";

            const matchedGov = matchEgyptGovernorate(data.address, data.display_name || "");
            if (matchedGov) {
              setSelectedGovernorateId(matchedGov.id);
              const matched = findZoneForGovernorate(matchedGov.id, shippingMethods);
              if (matched) setSelectedMethod(matched);
            }

            setGpsPinUrl(googleMapsPin);

            setShippingData(prev => ({
              ...prev,
              address: detectedStreet || prev.address,
              city: matchedGov ? (isAr ? matchedGov.nameAr : matchedGov.nameEn) : detectedCity
            }));

            toast.success(
              isAr
                ? "تم تحديد موقعك بدقة. يرجى كتابة رقم المبنى والشقة."
                : "Exact GPS detected. Please add your Building & Apt/Floor number.",
              { duration: 5000 }
            );
          }
        } catch (err) {
          setError(isAr ? "تعذر تحديد العنوان تلقائياً." : "Could not fetch address details.");
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (err) => {
        setIsDetectingLocation(false);
        setError(isAr ? "يرجى السماح بالوصول للموقع لتحديد العنوان." : "Location access was denied or unavailable.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleApplyCoupon = async () => {
    if (!ENABLE_COUPONS || !couponCode.trim()) return;

    if (!APPLY_COUPON_DISCOUNTS) {
      setCouponError(isAr ? "أكواد الخصم معطلة مؤقتًا حاليًا." : "Promo codes are temporarily inactive.");
      setAppliedCoupon(null);
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError("");
    try {
      const res = await validateCouponAction(couponCode, totalPrice, cart);
      if (res.success && res.coupon) {
        setAppliedCoupon(res.coupon);
        setCouponError("");
        toast.success(isAr ? "تم تطبيق كود الخصم بنجاح!" : "Promo code applied successfully!");
      } else {
        setCouponError(res.error || (isAr ? "كود الخصم غير صالح." : "Invalid coupon code."));
        setAppliedCoupon(null);
      }
    } catch (err) {
      setCouponError(isAr ? "تعذر تطبيق كود الخصم." : "Failed to apply coupon.");
      setAppliedCoupon(null);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const discountValue = ENABLE_COUPONS && APPLY_COUPON_DISCOUNTS && appliedCoupon ? appliedCoupon.appliedDiscount : 0;
  const shippingCost = selectedMethod?.price || 0;
  const finalPrice = Math.max(totalPrice - discountValue + shippingCost, 0);

  const handlePurchase = async () => {
    const mandatoryFields: (keyof typeof shippingData)[] = ["firstName", "lastName", "address", "city", "phone", "email"];
    const emptyFields = mandatoryFields.filter(field => !shippingData[field]);

    if (emptyFields.length > 0) {
      setError(dict.checkout?.error_shipping || (isAr ? "يرجى ملء جميع بيانات الشحن الإلزامية." : "Please fill in all mandatory shipping details."));
      setValidationErrors(emptyFields as string[]);
      // Smooth scroll to top of form
      window.scrollTo({ top: 120, behavior: "smooth" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shippingData.email)) {
      setError(isAr ? "يرجى إدخال بريد إلكتروني صحيح." : "Please enter a valid email address.");
      setValidationErrors(["email"]);
      return;
    }

    setIsProcessing(true);

    const addressDetailsParts = [
      shippingData.address,
      shippingData.building ? (isAr ? `عمارة/مبنى: ${shippingData.building}` : `Bldg: ${shippingData.building}`) : "",
      shippingData.floor ? (isAr ? `دور: ${shippingData.floor}` : `Floor: ${shippingData.floor}`) : "",
      shippingData.apartment ? (isAr ? `شقة: ${shippingData.apartment}` : `Apt: ${shippingData.apartment}`) : ""
    ].filter(Boolean).join(" - ");

    const fullAddressForOrder = gpsPinUrl && !addressDetailsParts.includes("[GPS Pin:")
      ? `${addressDetailsParts} [GPS Pin: ${gpsPinUrl}]`
      : addressDetailsParts;

    const paymentTag = paymentMethod === 'cod' ? '[COD - Cash on Delivery]' : '[Paymob Online]';
    const giftTag = shippingData.isGift && shippingData.giftMessage ? `[Gift Note: ${shippingData.giftMessage}]` : '';
    const userNotes = shippingData.deliveryNotes ? shippingData.deliveryNotes.trim() : '';

    const notesWithPayment = [paymentTag, giftTag, userNotes].filter(Boolean).join(" ").trim();

    const res = await createOrder(session?.user?.id || null, finalPrice, cart, {
      ...shippingData,
      address: fullAddressForOrder,
      orderNotes: notesWithPayment,
      couponId: ENABLE_COUPONS && APPLY_COUPON_DISCOUNTS && appliedCoupon ? appliedCoupon.id : null,
      couponCode: ENABLE_COUPONS && appliedCoupon ? appliedCoupon.code : null,
      discountApplied: discountValue,
      shippingMethodId: selectedMethod?.id,
      shippingCost: shippingCost,
      paymentMethod // ← pass payment method so server knows which flow to use
    });

    if (res.success) {
      try {
        localStorage.setItem("giftisan_saved_shipping", JSON.stringify({
          firstName: shippingData.firstName,
          lastName: shippingData.lastName,
          address: shippingData.address,
          building: shippingData.building,
          floor: shippingData.floor,
          apartment: shippingData.apartment,
          city: shippingData.city,
          zip: shippingData.zip,
          phone: shippingData.phone,
          email: shippingData.email
        }));
      } catch (e) {
        // Ignore storage error
      }
      setIsRedirecting(true);
      clearCart();
      if (res.paymentUrl && paymentMethod === 'paymob') {
        if (isNativePlatform()) {
          const { Browser } = await import("@capacitor/browser");
          // Reset loading state if the user manually dismisses the in-app payment sheet without completing payment
          Browser.addListener("browserFinished", () => {
            setIsRedirecting(false);
            setIsProcessing(false);
          });
          await Browser.open({
            url: res.paymentUrl,
            windowName: "_blank",
            presentationStyle: "popover",
            toolbarColor: "#064E3B",
          });
        } else {
          // Paymob: redirect to payment gateway on web
          window.location.href = res.paymentUrl;
        }
      } else if (res.orderId) {
        // COD: order already created, go to success page
        router.push(`/${lang}/checkout/success?orderId=${res.orderId}`);
      } else {
        // Fallback: go to success page without orderId
        router.push(`/${lang}/checkout/success`);
      }
    } else {
      setError(res.error || (isAr ? "حدث خطأ أثناء معالجة الطلب." : "An error occurred during checkout."));
      setIsProcessing(false);
    }
  };

  // Back Navigation Arrow Icon
  const ArrowBackIcon = isAr ? ArrowRight : ArrowLeft;

  // Empty Cart State
  if (cart.length === 0 && !isRedirecting) {
    return (
      <main className="min-h-screen bg-cream">
        {/* Minimal Distraction-free Header */}
        <header className="w-full bg-white/80 backdrop-blur-md border-b border-primary/10 sticky top-0 z-50">
          <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 2xl:px-12 3xl:px-16 h-16 sm:h-20 flex items-center justify-between">
            <Link href={`/${lang}`} className="flex items-center gap-2 group">
              <div className="relative w-8 h-8 md:w-9 md:h-9 overflow-hidden rounded-md shadow-sm">
                <Image src="/icon.png" alt="Giftisan" fill className="object-cover" sizes="36px" />
              </div>
              <span className="text-xl md:text-2xl font-heading font-black text-primary tracking-tight">Giftisan</span>
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-charcoal/70 bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
              <Lock className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium">{isAr ? "دفع آمن 256-Bit" : "256-Bit Secure Checkout"}</span>
            </div>
          </div>
        </header>

        <div className="max-w-xl mx-auto px-4 py-28 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center text-primary/40 mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-serif text-[#222222] font-semibold">
              {dict.cart?.cart_empty || (isAr ? "سلتك فارغة حالياً" : "Your Cart is Empty")}
            </h1>
            <p className="text-sm text-charcoal/60 leading-relaxed max-w-md mx-auto">
              {dict.checkout?.empty_checkout_desc || (isAr ? "أضف بعض القطع الحرفية الفريدة لتصلك مغلفة بحب وإتقان." : "Explore one-of-a-kind handcrafted gifts from local Egyptian artisans.")}
            </p>
          </div>
          <div className="pt-2">
            <Link 
              href={`/${lang}/gifts`}
              className="inline-flex items-center justify-center px-8 py-3.5 bg-primary text-white text-sm font-semibold rounded-full hover:bg-primary-light transition-all shadow-xs active:scale-95"
            >
              {dict.checkout?.continue_shopping || (isAr ? "تصفح الهدايا الحرفية" : "Explore Handcrafted Gifts")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream pb-24">
      {/* 1. Distraction-Free High-Trust Checkout Header */}
      <header className="w-full bg-white/90 backdrop-blur-md border-b border-primary/10 sticky top-0 z-50">
        <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 2xl:px-12 3xl:px-16 h-16 sm:h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href={`/${lang}`} className="flex items-center gap-2 group">
            <div className="relative w-8 h-8 md:w-9 md:h-9 overflow-hidden rounded-md shadow-sm">
              <Image src="/icon.png" alt="Giftisan" fill className="object-cover" sizes="36px" />
            </div>
            <span className="text-xl md:text-2xl font-heading font-black text-primary tracking-tight">Giftisan</span>
          </Link>

          {/* Secure Trust Badge */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-charcoal/70 bg-primary/5 px-3.5 py-1.5 rounded-full border border-primary/10">
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium">{isAr ? "دفع آمن ومشفّر 256-Bit SSL" : "256-Bit SSL Encrypted Checkout"}</span>
          </div>

          {/* Return to Cart / Shopping Link */}
          <button 
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-charcoal/70 hover:text-primary transition-colors"
          >
            <ArrowBackIcon className="w-4 h-4" />
            <span>{isAr ? "العودة للسلة" : "Back to cart"}</span>
          </button>
        </div>
      </header>

      {/* 2. Mobile Collapsible Order Summary Accordion (Screens < lg) */}
      <div className="lg:hidden bg-white border-b border-primary/10 sticky top-16 z-40">
        <button
          type="button"
          onClick={() => setIsMobileSummaryOpen(!isMobileSummaryOpen)}
          className="w-full px-4 sm:px-6 py-3.5 flex items-center justify-between text-xs sm:text-sm"
        >
          <div className="flex items-center gap-2 text-primary font-semibold">
            <ShoppingBag className="w-4 h-4 text-primary" />
            <span>
              {isMobileSummaryOpen 
                ? (isAr ? "إخفاء ملخص الطلب" : "Hide order summary") 
                : (isAr ? "عرض ملخص الطلب" : "Show order summary")}
            </span>
            <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isMobileSummaryOpen && "rotate-180")} />
          </div>
          <span className="font-serif font-bold text-primary text-base">
            {dict.product?.currency || "EGP"} {finalPrice}.00
          </span>
        </button>

        {/* Collapsed Drawer Content */}
        <AnimatePresence>
          {isMobileSummaryOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-cream-dark/30 border-t border-primary/5 px-4 sm:px-6 py-5 space-y-4"
            >
              {/* Item Previews */}
              <div className="space-y-3 max-h-64 overflow-y-auto pe-1">
                {cart.map((item) => (
                  <div key={item.id + (item.personalization || "")} className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-primary/10 bg-white">
                      <Image src={item.image || item.images[0]} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#222222] truncate">{item.name}</p>
                      {item.variantName && (
                        <p className="text-[10px] text-charcoal/60">{item.variantName}</p>
                      )}
                      <p className="text-[10px] text-charcoal/50">{dict.checkout?.qty || "Qty"}: {item.quantity}</p>
                    </div>
                    <span className="text-xs font-semibold text-primary">
                      {dict.product?.currency || "EGP"} {item.price * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              {/* Promo Code Input on Mobile */}
              {ENABLE_COUPONS && (
                <div className="pt-3 border-t border-primary/10 flex gap-2">
                  <input
                    type="text"
                    placeholder={promoPlaceholder}
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={appliedCoupon !== null}
                    className="flex-1 h-10 px-3 bg-white border border-primary/15 rounded-lg text-xs outline-none focus:border-primary uppercase tracking-wider"
                  />
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}
                      className="px-3 h-10 bg-white border border-primary/15 text-charcoal/70 rounded-lg text-xs font-medium"
                    >
                      {promoRemove}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={isValidatingCoupon || !couponCode.trim()}
                      className="px-4 h-10 bg-primary text-white rounded-lg text-xs font-medium disabled:opacity-50"
                    >
                      {isValidatingCoupon ? "..." : promoApply}
                    </button>
                  )}
                </div>
              )}

              {/* Price Breakdown */}
              <div className="pt-3 border-t border-primary/10 space-y-1.5 text-xs text-charcoal/70">
                <div className="flex justify-between">
                  <span>{dict.cart?.subtotal || "Subtotal"}</span>
                  <span className="font-medium text-[#222222]">{dict.product?.currency || "EGP"} {totalPrice}.00</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>{promoDiscountLabel} ({appliedCoupon.code})</span>
                    <span>-{dict.product?.currency || "EGP"} {appliedCoupon.appliedDiscount}.00</span>
                  </div>
                )}
                {selectedMethod && (
                  <div className="flex justify-between">
                    <span>{translateShippingZone(selectedMethod.name, isAr)}</span>
                    <span className="font-medium text-[#222222]">
                      {selectedMethod.price === 0 ? (dict.checkout?.free || "Free") : `${dict.product?.currency || "EGP"} ${selectedMethod.price}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-primary/10 text-sm font-serif font-bold text-primary">
                  <span>{dict.checkout?.total || "Total"}</span>
                  <span>{dict.product?.currency || "EGP"} {finalPrice}.00</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Main Checkout Grid (max-w-[1600px] matching rest of site) */}
      <div className="w-full max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 2xl:px-12 3xl:px-16 pt-6 sm:pt-8 lg:pt-10 2xl:pt-12">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Left Column: Delivery, Gifting & Payment Forms */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-6 lg:space-y-8">
            
            {/* Step 1: Contact & Delivery Address Card */}
            <section className="bg-white rounded-2xl lg:rounded-3xl border border-primary/10 shadow-xs p-6 sm:p-8 lg:p-10">
              <div className="flex items-center justify-between pb-4 border-b border-primary/10 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-serif text-[#222222] font-semibold flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary shrink-0" />
                    <span>{isAr ? "بيانات وعنوان التوصيل" : "Delivery Details"}</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-charcoal/60 mt-0.5">
                    {isAr ? "أدخل تفاصيل الشحن ليصلك طلبك مباشرة حتى باب المنزل" : "Where should we send your handcrafted order?"}
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/5 text-primary border border-primary/10">
                  {isAr ? "الخطوة 1 من 2" : "Step 1 of 2"}
                </span>
              </div>

              <form className="space-y-4 sm:space-y-5" onSubmit={(e) => { e.preventDefault(); handlePurchase(); }}>
                {/* Name Row */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal/80 flex items-center justify-between">
                      <span>{dict.checkout?.first_name || (isAr ? "الاسم الأول" : "First Name")} *</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      autoComplete="given-name"
                      placeholder={isAr ? "أحمد" : "Jane"}
                      value={shippingData.firstName}
                      onChange={(e) => updateShippingField("firstName", e.target.value)}
                      className={cn(
                        "w-full h-12 px-4 rounded-xl border bg-white text-sm outline-none transition-all placeholder:text-charcoal/30",
                        validationErrors.includes("firstName")
                          ? "border-red-500 ring-2 ring-red-100"
                          : "border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/15"
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal/80">
                      <span>{dict.checkout?.last_name || (isAr ? "اسم العائلة" : "Last Name")} *</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      autoComplete="family-name"
                      placeholder={isAr ? "محمود" : "Doe"}
                      value={shippingData.lastName}
                      onChange={(e) => updateShippingField("lastName", e.target.value)}
                      className={cn(
                        "w-full h-12 px-4 rounded-xl border bg-white text-sm outline-none transition-all placeholder:text-charcoal/30",
                        validationErrors.includes("lastName")
                          ? "border-red-500 ring-2 ring-red-100"
                          : "border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/15"
                      )}
                    />
                  </div>
                </div>

                {/* Phone & Email Row */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal/80">
                      <span>{dict.checkout?.phone_number || (isAr ? "رقم الهاتف للمندوب" : "Phone Number (for courier)")} *</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      autoComplete="tel"
                      placeholder="01012345678"
                      value={shippingData.phone}
                      onChange={(e) => updateShippingField("phone", e.target.value)}
                      className={cn(
                        "w-full h-12 px-4 rounded-xl border bg-white text-sm outline-none transition-all placeholder:text-charcoal/30",
                        validationErrors.includes("phone")
                          ? "border-red-500 ring-2 ring-red-100"
                          : "border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/15"
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal/80">
                      <span>{dict.checkout?.email || (isAr ? "البريد الإلكتروني للإيصال" : "Email (for confirmation)")} *</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="name@example.com"
                      value={shippingData.email}
                      onChange={(e) => updateShippingField("email", e.target.value)}
                      className={cn(
                        "w-full h-12 px-4 rounded-xl border bg-white text-sm outline-none transition-all placeholder:text-charcoal/30",
                        validationErrors.includes("email")
                          ? "border-red-500 ring-2 ring-red-100"
                          : "border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/15"
                      )}
                    />
                  </div>
                </div>

                {/* Street Address Row with GPS auto-detect button */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-charcoal/80">
                      <span>{dict.checkout?.shipping_address || (isAr ? "اسم الشارع والحي" : "Street Address")} *</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={isDetectingLocation}
                      className="text-xs font-medium text-emerald-800 hover:text-emerald-900 flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      <MapPin className={cn("w-3.5 h-3.5", isDetectingLocation && "animate-spin")} />
                      <span>{isDetectingLocation ? (isAr ? "جاري التحديد..." : "Detecting GPS...") : (isAr ? "تحديد موقعي تلقائياً" : "Use current GPS location")}</span>
                    </button>
                  </div>
                  
                  <input
                    type="text"
                    name="address"
                    autoComplete="street-address"
                    placeholder={dict.checkout?.street_placeholder || (isAr ? "اسم الشارع، الحي أو المنطقة" : "Street name, district or area")}
                    value={shippingData.address}
                    onChange={(e) => updateShippingField("address", e.target.value)}
                    className={cn(
                      "w-full h-12 px-4 rounded-xl border bg-white text-sm outline-none transition-all placeholder:text-charcoal/30",
                      validationErrors.includes("address")
                        ? "border-red-500 ring-2 ring-red-100"
                        : "border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/15"
                    )}
                  />
                </div>

                {/* Building, Floor, Apartment Row (Responsive on same line) */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-[11px] sm:text-xs font-semibold text-charcoal/80 block truncate">
                      <span className="hidden sm:inline">{isAr ? "رقم المبنى / الفيلا" : "Building / Villa"}</span>
                      <span className="sm:hidden">{isAr ? "المبنى" : "Building"}</span>
                      <span className="hidden md:inline text-[10px] text-charcoal/40 font-normal ms-1">({isAr ? "مهم" : "Req"})</span>
                    </label>
                    <input
                      type="text"
                      name="building"
                      placeholder={isAr ? "14 أو فيلا 5" : "14 / Villa 5"}
                      value={shippingData.building}
                      onChange={(e) => updateShippingField("building", e.target.value)}
                      className="w-full h-11 sm:h-12 px-2.5 sm:px-3.5 rounded-xl border border-primary/20 bg-white text-xs sm:text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-charcoal/30"
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-[11px] sm:text-xs font-semibold text-charcoal/80 block truncate">
                      <span>{isAr ? "الدور" : "Floor"}</span>
                      <span className="hidden sm:inline text-[10px] text-charcoal/40 font-normal ms-1">({isAr ? "اختياري" : "Opt"})</span>
                    </label>
                    <input
                      type="text"
                      name="floor"
                      placeholder={isAr ? "الدور 3" : "3rd"}
                      value={shippingData.floor}
                      onChange={(e) => updateShippingField("floor", e.target.value)}
                      className="w-full h-11 sm:h-12 px-2.5 sm:px-3.5 rounded-xl border border-primary/20 bg-white text-xs sm:text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-charcoal/30"
                    />
                  </div>

                  <div className="space-y-1 sm:space-y-1.5">
                    <label className="text-[11px] sm:text-xs font-semibold text-charcoal/80 block truncate">
                      <span className="hidden sm:inline">{isAr ? "رقم الشقة" : "Apartment"}</span>
                      <span className="sm:hidden">{isAr ? "الشقة" : "Apt"}</span>
                      <span className="hidden sm:inline text-[10px] text-charcoal/40 font-normal ms-1">({isAr ? "اختياري" : "Opt"})</span>
                    </label>
                    <input
                      type="text"
                      name="apartment"
                      placeholder={isAr ? "شقة 12" : "Apt 12"}
                      value={shippingData.apartment}
                      onChange={(e) => updateShippingField("apartment", e.target.value)}
                      className="w-full h-11 sm:h-12 px-2.5 sm:px-3.5 rounded-xl border border-primary/20 bg-white text-xs sm:text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-charcoal/30"
                    />
                  </div>
                </div>

                {/* Governorate & Postal Code */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-charcoal/80">
                      <span>{isAr ? "المحافظة" : "Governorate (Region)"} *</span>
                    </label>
                    <GovernorateSelect
                      value={selectedGovernorateId}
                      isAr={isAr}
                      hasError={validationErrors.includes("city")}
                      onChange={(govId) => {
                        setSelectedGovernorateId(govId);
                        const gov = EGYPT_GOVERNORATES.find(g => g.id === govId);
                        if (gov) {
                          const name = isAr ? gov.nameAr : gov.nameEn;
                          updateShippingField("city", name);
                          const matched = findZoneForGovernorate(govId, shippingMethods);
                          if (matched) setSelectedMethod(matched);
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-charcoal/80">
                      <span>{dict.checkout?.postal_code || (isAr ? "الرمز البريدي" : "Postal Code")}</span>
                      <span className="text-charcoal/40 ms-1 font-normal">({dict.checkout?.optional || "Optional"})</span>
                    </label>
                    <input
                      type="text"
                      name="zip"
                      autoComplete="postal-code"
                      placeholder="11511"
                      value={shippingData.zip}
                      onChange={(e) => updateShippingField("zip", e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-primary/20 bg-white text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 placeholder:text-charcoal/30"
                    />
                  </div>
                </div>

                {/* Delivery Notes / Special Instructions */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-charcoal/80 flex items-center justify-between">
                    <span>{isAr ? "ملاحظات أو تعليمات خاصة بالتوصيل" : "Special Delivery Instructions"}</span>
                    <span className="text-charcoal/40 font-normal text-[11px]">({dict.checkout?.optional || (isAr ? "اختياري" : "Optional")})</span>
                  </label>
                  <textarea
                    rows={2}
                    name="deliveryNotes"
                    placeholder={isAr ? "مثال: يرجى الاتصال قبل الوصول بـ 15 دقيقة، أو ترك الشحنة مع الأمن..." : "e.g. Please call 15 minutes before arrival, leave with doorman..."}
                    value={shippingData.deliveryNotes}
                    onChange={(e) => updateShippingField("deliveryNotes", e.target.value)}
                    className="w-full p-3 rounded-xl border border-primary/20 bg-white text-xs sm:text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 placeholder:text-charcoal/30 resize-none"
                  />
                </div>

                {/* Delivery Zone Confirmation Badge */}
                {selectedMethod && (
                  <div className="pt-2">
                    <div className="p-3.5 sm:p-4 rounded-xl bg-cream border border-primary/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-800 flex items-center justify-center shrink-0">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-[#222222]">
                            {translateShippingZone(selectedMethod.name, isAr)}
                          </p>
                          <p className="text-[11px] text-charcoal/60">
                            {isAr ? "توصيل حتى باب المنزل" : "Door-to-door delivery"} • {translateDeliveryDays(selectedMethod.estimatedDays || "1-3 Days", isAr)}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-primary shrink-0">
                        {selectedMethod.price === 0 ? (dict.checkout?.free || "FREE") : `${dict.product?.currency || "EGP"} ${selectedMethod.price}`}
                      </span>
                    </div>
                  </div>
                )}
              </form>
            </section>

            {/* Step 2: Giftisan Signature Gifting Card */}
            <section className="bg-white rounded-2xl lg:rounded-3xl border border-primary/10 shadow-xs p-6 sm:p-8">
              <div 
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer",
                  shippingData.isGift 
                    ? "bg-amber-50/60 border-amber-300 shadow-2xs" 
                    : "bg-white border-primary/10 hover:border-primary/20"
                )}
                onClick={() => setShippingData(prev => ({ ...prev, isGift: !prev.isGift }))}
              >
                <div className="flex items-start gap-3.5">
                  <div className={cn(
                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all mt-0.5 shrink-0",
                    shippingData.isGift 
                      ? "bg-amber-600 border-amber-600 text-white" 
                      : "border-primary/25 bg-white"
                  )}>
                    {shippingData.isGift && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-amber-700" />
                      <h3 className="text-sm font-semibold text-[#222222]">
                        {dict.checkout?.mark_as_gift || (isAr ? "إرسال هذا الطلب كهدية" : "This order is a gift")}
                      </h3>
                    </div>
                    <p className="text-xs text-charcoal/60 leading-relaxed">
                      {dict.checkout?.mark_as_gift_desc || (isAr ? "سيتم إخفاء الفاتورة السعرية وسيقوم الحرفي بتغليف القطع بعناية خاصة كهدية تليق بأحبائك." : "Prices will be hidden on receipt, and artisans will pack items with special gift wrapping.")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Expandable Gift Note Box */}
              <AnimatePresence>
                {shippingData.isGift && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden pt-4 space-y-2"
                  >
                    <label className="text-xs font-semibold text-charcoal/80 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                      <span>{dict.checkout?.gift_message_label || (isAr ? "رسالة الإهداء (تُطبع داخل كارت خاص مع الهدية)" : "Gift Message (Printed on a card inside)")}</span>
                    </label>
                    <textarea
                      rows={3}
                      value={shippingData.giftMessage}
                      onChange={(e) => setShippingData(prev => ({ ...prev, giftMessage: e.target.value }))}
                      placeholder={dict.checkout?.gift_message_placeholder || (isAr ? "اكتب رسالة دافئة من القلب للمستلم..." : "Write a personal note for the recipient...")}
                      className="w-full p-3.5 rounded-xl border border-primary/15 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 bg-white resize-none shadow-2xs placeholder:text-charcoal/30"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Step 3: Payment Transparency Card */}
            <section className="bg-white rounded-2xl lg:rounded-3xl border border-primary/10 shadow-xs p-6 sm:p-8">
              <div className="pb-4 border-b border-primary/10 mb-5">
                <h3 className="text-lg sm:text-xl font-serif text-[#222222] font-semibold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary shrink-0" />
                  <span>{isAr ? "طريقة الدفع" : "Payment Method"}</span>
                </h3>
                <p className="text-xs text-charcoal/60 mt-0.5">
                  {isAr ? "اختر الطريقة الأنسب لك لإتمام الطلب" : "Choose how you would like to complete your order."}
                </p>
              </div>

              <div className="space-y-3">
                {/* Option 1: Online Payment via Paymob (Cards, Wallets, InstaPay) */}
                <div 
                  onClick={() => setPaymentMethod("paymob")}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                    paymentMethod === "paymob"
                      ? "bg-primary/5 border-primary shadow-2xs"
                      : "bg-white border-primary/10 hover:border-primary/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                      paymentMethod === "paymob" ? "border-primary" : "border-charcoal/30"
                    )}>
                      {paymentMethod === "paymob" && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-[#222222]">
                        {isAr ? "بطاقات ائتمان / محافظ إلكترونية / إنستاباي" : "Credit/Debit Card, Wallets & InstaPay"}
                      </p>
                      <p className="text-[11px] text-charcoal/60">
                        {isAr ? "دفع فوري مؤمن بالكامل عبر بوابة Paymob المعتمدة" : "Instant secure processing via Paymob"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-charcoal/50 text-[11px] font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span className="hidden sm:inline">{isAr ? "مشفّر 100%" : "Encrypted"}</span>
                  </div>
                </div>

                {/* Option 2: Cash on Delivery (COD) - SOON */}
                <div 
                  className="p-4 rounded-xl border border-primary/10 bg-cream/40 opacity-70 cursor-not-allowed select-none flex items-center justify-between transition-all"
                  title={isAr ? "الدفع عند الاستلام سيتوفر قريباً" : "Cash on delivery will be available soon"}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full border border-charcoal/30 bg-charcoal/10 flex items-center justify-center shrink-0">
                      <Clock className="w-2.5 h-2.5 text-charcoal/50" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-[#222222]/80 flex items-center gap-2">
                        <span>{isAr ? "الدفع عند الاستلام (COD)" : "Cash on Delivery (COD)"}</span>
                      </p>
                      <p className="text-[11px] text-charcoal/50">
                        {isAr ? "خدمة الدفع عند الاستلام ستتوفر قريباً. يرجى استخدام الدفع الإلكتروني حالياً." : "Cash on delivery will be available soon. Please use secure online payment."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-charcoal/60 bg-white/80 border border-primary/10 px-2.5 py-1 rounded-full shrink-0 shadow-2xs">
                    <Clock className="w-3 h-3 text-charcoal/40" />
                    <span>{isAr ? "قريباً" : "Soon"}</span>
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* Right Column: Desktop Order Summary (Sticky) */}
          <div className="lg:col-span-5 xl:col-span-5">
            <div className="lg:sticky lg:top-24 space-y-6">
              <section className="bg-white rounded-2xl lg:rounded-3xl border border-primary/10 shadow-xs p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-primary/10 mb-5">
                <h3 className="text-lg sm:text-xl font-serif text-[#222222] font-semibold">
                  {dict.checkout?.order_summary || (isAr ? "ملخص الطلب" : "Order Summary")}
                </h3>
                <span className="text-xs text-charcoal/60 font-medium">
                  {cart.length} {cart.length === 1 ? (isAr ? "قطعة" : "item") : (isAr ? "قطع" : "items")}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-4 max-h-[340px] overflow-y-auto pe-2 custom-scrollbar">
                {cart.map((item) => (
                  <div key={item.id + (item.personalization || "")} className="space-y-1">
                    <div className="flex gap-3 items-center">
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-primary/10 bg-cream">
                        <Image src={item.image || item.images[0]} alt={item.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-medium text-[#222222] line-clamp-1">{item.name}</h4>
                        {item.variantName && (
                          <span className="inline-block text-[10px] text-charcoal/60 bg-cream px-2 py-0.5 rounded border border-primary/5 mt-0.5">
                            {item.variantName}
                          </span>
                        )}
                        <p className="text-[11px] text-charcoal/50 mt-0.5">{dict.checkout?.qty || "Qty"}: {item.quantity}</p>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-primary shrink-0">
                        {dict.product?.currency || "EGP"} {item.price * item.quantity}
                      </p>
                    </div>

                    {/* Personalization Note */}
                    {item.personalization && (
                      <div className="ms-16 text-[11px] text-charcoal/70 bg-cream/70 py-1 px-2.5 rounded-lg border border-primary/5 italic">
                        <span className="font-semibold text-primary not-italic me-1">{dict.cart?.bespoke_detail || "Custom"}:</span>
                        &ldquo;{item.personalization}&rdquo;
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Promo Coupon Module */}
              {ENABLE_COUPONS && (
                <div className="pt-5 pb-1 border-t border-primary/10 mt-5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={promoPlaceholder}
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value);
                        if (couponError) setCouponError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                      disabled={appliedCoupon !== null}
                      className="flex-1 h-11 px-3.5 bg-cream/30 border border-primary/15 rounded-xl text-xs sm:text-sm outline-none focus:border-primary focus:bg-white uppercase tracking-wider"
                    />
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupon(null);
                          setCouponCode("");
                        }}
                        className="px-4 h-11 bg-white border border-primary/15 text-charcoal/70 hover:text-red-600 rounded-xl text-xs font-semibold transition-colors"
                      >
                        {promoRemove}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={isValidatingCoupon || !couponCode.trim()}
                        className="px-5 h-11 bg-primary text-white hover:bg-primary-light disabled:opacity-50 rounded-xl text-xs font-semibold shadow-xs transition-all"
                      >
                        {isValidatingCoupon ? "..." : promoApply}
                      </button>
                    )}
                  </div>

                  {couponError && (
                    <p className="text-red-600 text-[11px] font-medium mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{couponError}</span>
                    </p>
                  )}

                  {appliedCoupon && (
                    <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-lg text-xs font-medium mt-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>{isAr ? "تم تطبيق كود" : "Code"} {appliedCoupon.code} (-{dict.product?.currency || "EGP"} {appliedCoupon.appliedDiscount})</span>
                    </div>
                  )}
                </div>
              )}

              {/* Price Breakdown */}
              <div className="pt-5 border-t border-primary/10 space-y-2 text-xs sm:text-sm text-charcoal/75">
                <div className="flex justify-between">
                  <span>{dict.cart?.subtotal || (isAr ? "المجموع الفرعي" : "Subtotal")}</span>
                  <span className="font-medium text-[#222222]">{dict.product?.currency || "EGP"} {totalPrice}.00</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-800 font-medium">
                    <span>{promoDiscountLabel} ({appliedCoupon.code})</span>
                    <span>-{dict.product?.currency || "EGP"} {appliedCoupon.appliedDiscount}.00</span>
                  </div>
                )}

                {selectedMethod && (
                  <div className="flex justify-between">
                    <span>{translateShippingZone(selectedMethod.name, isAr)}</span>
                    <span className="font-medium text-[#222222]">
                      {selectedMethod.price === 0 ? (dict.checkout?.free || "FREE") : `${dict.product?.currency || "EGP"} ${selectedMethod.price}`}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-3 border-t border-primary/10">
                  <span className="text-base sm:text-lg font-serif font-bold text-[#222222]">{dict.checkout?.total || (isAr ? "الإجمالي المستحق" : "Total")}</span>
                  <span className="text-2xl sm:text-3xl font-serif font-bold text-primary">
                    {dict.product?.currency || "EGP"} {finalPrice}.00
                  </span>
                </div>
              </div>

              {/* Primary Place Order CTA */}
              <div className="mt-6 space-y-4">
                <button
                  type="button"
                  onClick={handlePurchase}
                  disabled={isProcessing}
                  className="w-full py-4 bg-primary text-white hover:bg-primary-light font-semibold rounded-full text-base sm:text-lg shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{dict.checkout?.processing || (isAr ? "جاري تجهيز الطلب..." : "Processing Order...")}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>
                        {dict.checkout?.place_order || (isAr ? `إتمام الطلب والدفع • ${finalPrice} ج.م` : `Complete Order & Pay • EGP ${finalPrice}`)}
                      </span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-center text-charcoal/50 leading-relaxed italic">
                  {dict.checkout?.prelaunch_manual_desc || (isAr ? "سيتم توجيهك بأمان لإتمام الدفع الإلكتروني المشفّر عبر Paymob." : "You will be securely routed to complete encrypted payment via Paymob.")}
                </p>
              </div>

              {/* Trust Badges Strip */}
              <div className="mt-6 pt-5 border-t border-primary/5 grid grid-cols-2 gap-3 text-[11px] text-charcoal/60">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>{dict.checkout?.secure_ssl || (isAr ? "اتصال مشفّر SSL" : "256-Bit SSL Encrypted")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{dict.checkout?.sustainable_packaging || (isAr ? "تغليف هدايا فاخر ومستدام" : "Luxury Sustainable Pack")}</span>
                </div>
              </div>
            </section>
            </div>
          </div>

        </div>
      </div>

      {/* Floating Error Toast */}
      {error && (
        <div className="fixed bottom-8 start-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md p-4 bg-red-600 text-white rounded-2xl shadow-xl font-medium text-sm text-center flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 text-start">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setError("")}
            className="text-white/80 hover:text-white text-xs font-bold underline shrink-0"
          >
            {isAr ? "إغلاق" : "Dismiss"}
          </button>
        </div>
      )}
    </main>
  );
}
