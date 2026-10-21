"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  Tag, 
  Trash2, 
  Ticket, 
  Percent, 
  Banknote, 
  Calendar, 
  MousePointer2, 
  Trophy, 
  Heart, 
  Sparkles,
  Copy,
  Check,
  Power,
  Clock,
  AlertCircle,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CalendarDays,
  Share2,
  ExternalLink,
  QrCode,
  Download,
  Printer,
  MessageCircle,
  Store,
  Award,
  Globe,
  Save,
  Link2,
  LayoutGrid,
  Square,
  Lightbulb
} from "lucide-react";
import { FaInstagram, FaFacebook, FaTiktok, FaPinterest } from "react-icons/fa6";
import QRCode from "react-qr-code";
import { createCouponAction, deleteArtisanCoupon, toggleCouponStatusAction } from "@/lib/actions";
import { toast } from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

interface GrowthTabProps {
  dict: any;
  coupons: any[];
  sales: any[];
  lang?: string;
  artisanId?: string;
  artisan?: any;
}

export function GrowthTab({ dict, coupons = [], sales = [], lang = "en", artisanId, artisan }: GrowthTabProps) {
  const router = useRouter();
  const isAr = lang === "ar";
  const currency = dict?.product?.currency || (isAr ? "ج.م" : "EGP");

  const artisanSlug = artisan?.slug || artisanId || "studio";
  const artisanName = artisan?.studioName || artisan?.businessName || artisan?.user?.name || (isAr ? "متجري الحِرفي" : "Artisan Studio");
  const artisanAvatar = artisan?.avatar || artisan?.user?.image || artisan?.image;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://giftisan.com";
  const shopUrl = `${origin}/${lang}/artisans/${artisanSlug}`;
  const bioUrl = `${origin}/${lang}/bio/${artisanSlug}`;

  // Find best active promo code (if any)
  const activePromo = coupons.find(c => c.isActive && (!c.expiresAt || new Date(c.expiresAt) > new Date()));

  const searchParams = useSearchParams();
  const [activeSubTab, setActiveSubTab] = useState<"coupons" | "marketing" | "milestones">(() => {
    const s = searchParams.get("section");
    if (s === "marketing" || s === "milestones" || s === "coupons") return s;
    return "coupons";
  });
  const activeCouponsCount = coupons.filter(c => c.isActive && (!c.expiresAt || new Date(c.expiresAt) > new Date())).length;

  const [copiedLinkType, setCopiedLinkType] = useState<"shop" | "bio" | "caption" | null>(null);
  const [activeUrlTab, setActiveUrlTab] = useState<"shop" | "bio">("shop");
  const [isPackagingModalOpen, setIsPackagingModalOpen] = useState(false);
  const [printLayout, setPrintLayout] = useState<"grid" | "single">("grid");

  const [instagram, setInstagram] = useState(artisan?.instagram || "");
  const [facebook, setFacebook] = useState(artisan?.facebook || "");
  const [tiktok, setTiktok] = useState(artisan?.tiktok || "");
  const [pinterest, setPinterest] = useState(artisan?.pinterest || "");
  const [isSavingSocials, setIsSavingSocials] = useState(false);

  useEffect(() => {
    if (artisan) {
      setInstagram(artisan.instagram || "");
      setFacebook(artisan.facebook || "");
      setTiktok(artisan.tiktok || "");
      setPinterest(artisan.pinterest || "");
    }
  }, [artisan]);

  const handleSaveSocials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSocials(true);
    try {
      const response = await fetch("/api/artisan/socials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instagram: instagram.trim(),
          facebook: facebook.trim(),
          tiktok: tiktok.trim(),
          pinterest: pinterest.trim(),
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(isAr ? "تم حفظ حسابات التواصل الاجتماعي بنجاح" : "Social media accounts updated successfully!");
        router.refresh();
      } else {
        toast.error(data.error || (isAr ? "فشل الحفظ" : "Failed to update"));
      }
    } catch {
      toast.error(isAr ? "حدث خطأ غير متوقع" : "An unexpected error occurred");
    } finally {
      setIsSavingSocials(false);
    }
  };

  const handleCopyLink = async (text: string, type: "shop" | "bio" | "caption") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLinkType(type);
      toast.success(
        type === "shop" 
          ? (isAr ? "تم نسخ رابط المتجر إلى الحافظة" : "Shop link copied to clipboard!") 
          : type === "bio" 
            ? (isAr ? "تم نسخ رابط البايو" : "Bio link copied to clipboard!")
            : (isAr ? "تم نسخ نص البايو" : "Caption copied to clipboard!")
      );
      setTimeout(() => setCopiedLinkType(null), 2500);
    } catch {
      toast.error(isAr ? "فشل النسخ" : "Failed to copy");
    }
  };


  const handleDownloadQR = () => {
    const svg = document.getElementById("packaging-card-qr-code") || document.getElementById("growth-shop-qr-code");
    if (!svg) {
      toast.error("QR code is not available to download yet.");
      return;
    }
    const svgClone = svg.cloneNode(true) as SVGSVGElement;
    svgClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgClone.setAttribute("width", "1200");
    svgClone.setAttribute("height", "1200");
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const svgUrl = URL.createObjectURL(new Blob([svgData], { type: "image/svg+xml;charset=utf-8" }));
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new window.Image();
    
    img.onload = () => {
      canvas.width = 1200;
      canvas.height = 1200;
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 120, 120, 960, 960);
        URL.revokeObjectURL(svgUrl);
        
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `${artisanSlug}-giftisan-qr.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
        toast.success(isAr ? "تم تحميل رمز QR عالي الجودة للطباعة والتغليف" : "High-res QR Code downloaded for packaging & prints!");
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      toast.error("Could not create the image file.");
    };
    img.src = svgUrl;
  };

  const handlePrintPackagingCard = () => {
    const cardEl = document.getElementById("printable-packaging-card");
    if (!cardEl) {
      window.print();
      return;
    }

    try {
      let printFrame = document.getElementById("giftisan-print-frame") as HTMLIFrameElement;
      if (printFrame) {
        printFrame.remove();
      }

      printFrame = document.createElement("iframe");
      printFrame.id = "giftisan-print-frame";
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.style.border = "0";
      printFrame.style.visibility = "hidden";
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
      if (!frameDoc) {
        window.print();
        return;
      }

      const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
        .map(node => node.outerHTML)
        .join("\n");

      const cardHTML = printLayout === "grid"
        ? `<div class="packaging-card-grid">${Array.from({ length: 8 }, () => cardEl.outerHTML).join("")}</div>`
        : cardEl.outerHTML;

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html dir="${isAr ? "rtl" : "ltr"}">
          <head>
            <base href="${window.location.origin}/" />
            <title>${artisanName} - Packaging Card</title>
            ${styles}
            <style>
              @page {
                size: A4 portrait;
                margin: 0;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
                box-sizing: border-box;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #FFFFFF !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                min-height: 100vh !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
              }
              #printable-packaging-card {
                width: 520px !important;
                max-width: 100% !important;
                min-height: 300px !important;
                background-color: #064E3B !important;
                color: #FFFFFF !important;
                border-radius: 24px !important;
                padding: 28px !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                position: relative !important;
                overflow: hidden !important;
                box-shadow: none !important;
              }
              #printable-packaging-card * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
              .packaging-card-grid {
                display: grid !important;
                grid-template-columns: repeat(2, 90mm) !important;
                grid-template-rows: repeat(4, 52mm) !important;
                gap: 6mm !important;
              }
              .packaging-card-grid #printable-packaging-card {
                width: 90mm !important;
                min-height: 52mm !important;
                height: 52mm !important;
                border-radius: 5mm !important;
                padding: 5mm !important;
                box-shadow: none !important;
              }
            </style>
          </head>
          <body>
            ${cardHTML}
          </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch {
          window.print();
        }
      }, 350);
    } catch {
      window.print();
    }
  };

  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [couponToDelete, setCouponToDelete] = useState<{ id: string; code: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const totalSales = sales.length;

  const tiers = [
    { 
      title: dict?.studio?.tier_local_legend || (isAr ? "أسطورة محلية" : "Local Legend"), 
      level: 1,
      desc: isAr 
        ? "أول 5 مبيعات: اعتماد متجرك وظهوره في نتائج البحث وتفعيل رابط البايو المخصص." 
        : "5 Sales: Verified shop listing, search engine indexing & custom bio link.", 
      icon: Trophy, 
      color: "bg-amber-500", 
      threshold: 5,
      active: totalSales >= 5,
      upcoming: totalSales < 5,
      perk: isAr ? "اعتماد وبحث" : "Listing & Search"
    },
    { 
      title: dict?.studio?.tier_regional_star || (isAr ? "نجم إقليمي" : "Regional Star"), 
      level: 2,
      desc: isAr 
        ? "20 طلباً: أولوية الظهور في ترشيحات الصفحة الرئيسية وقوائم الصناع الأكثر طلباً." 
        : "20 Orders: Homepage spotlight rotation & curated gift list recommendations.", 
      icon: MousePointer2, 
      color: "bg-blue-500", 
      threshold: 20,
      active: totalSales >= 20,
      upcoming: totalSales >= 5 && totalSales < 20,
      perk: isAr ? "ترشيحات رئيسية" : "Homepage Spotlight"
    },
    { 
      title: dict?.studio?.tier_global_master || (isAr ? "ماستر عالمي" : "Global Master"), 
      level: 3,
      desc: isAr 
        ? "50 طلباً: أولوية تسويقية كاملة في النشرات البريدية وحملات جفتيسان الإعلانية." 
        : "50 Orders: Top platform marketing priority, newsletter features & social campaigns.", 
      icon: Heart, 
      color: "bg-purple-500", 
      threshold: 50,
      active: totalSales >= 50,
      upcoming: totalSales >= 20 && totalSales < 50,
      perk: isAr ? "حملات تسويقية" : "Newsletter & Ads"
    }
  ];

  const nextTier = tiers.find(t => t.threshold > totalSales);
  const progress = nextTier ? (totalSales / nextTier.threshold) * 100 : 100;

  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    discountValue: "",
    minOrderAmount: "",
    maxUses: "",
    expiresAt: ""
  });
  const [expiryPreset, setExpiryPreset] = useState<"never" | "7d" | "30d" | "custom">("never");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [isExpiryDropdownOpen, setIsExpiryDropdownOpen] = useState(false);
  const expiryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (expiryDropdownRef.current && !expiryDropdownRef.current.contains(event.target as Node)) {
        setIsExpiryDropdownOpen(false);
      }
    }
    if (isExpiryDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExpiryDropdownOpen]);

  const handleSelectPreset = (preset: "never" | "7d" | "30d" | "custom") => {
    setExpiryPreset(preset);
    if (preset === "never") {
      setNewCoupon(prev => ({ ...prev, expiresAt: "" }));
    } else if (preset === "7d") {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      setNewCoupon(prev => ({ ...prev, expiresAt: `${yyyy}-${mm}-${dd}` }));
    } else if (preset === "30d") {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      setNewCoupon(prev => ({ ...prev, expiresAt: `${yyyy}-${mm}-${dd}` }));
    } else if (preset === "custom") {
      if (!newCoupon.expiresAt) {
        const d = new Date();
        d.setDate(d.getDate() + 14);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        setNewCoupon(prev => ({ ...prev, expiresAt: `${yyyy}-${mm}-${dd}` }));
      }
    }
  };

  const currentYear = calendarMonth.getFullYear();
  const currentMonth = calendarMonth.getMonth();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const handlePrevMonth = () => {
    setCalendarMonth(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newCoupon.code.trim().toUpperCase();
    if (!cleanCode) {
      toast.error(isAr ? "يرجى كتابة رمز القسيمة" : "Please enter a coupon code");
      return;
    }

    const numValue = Number(newCoupon.discountValue);
    if (!numValue || numValue <= 0) {
      toast.error(isAr ? "يرجى إدخال قيمة خصم صحيحة" : "Please enter a valid discount value");
      return;
    }

    if (newCoupon.discountType === "PERCENTAGE" && numValue > 100) {
      toast.error(isAr ? "لا يمكن لنسبة الخصم أن تتجاوز 100%" : "Percentage discount cannot exceed 100%");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createCouponAction({
        code: cleanCode,
        discountType: newCoupon.discountType,
        discountValue: numValue,
        minOrderAmount: newCoupon.minOrderAmount ? Number(newCoupon.minOrderAmount) : undefined,
        maxUses: newCoupon.maxUses ? Number(newCoupon.maxUses) : undefined,
        expiresAt: newCoupon.expiresAt ? new Date(newCoupon.expiresAt).toISOString() : null,
        artisanId
      });

      if (res.success) {
        toast.success(dict?.studio?.coupon_created || (isAr ? "تم إنشاء قسيمة الخصم بنجاح!" : "Coupon code created successfully!"));
        setIsCreating(false);
        setExpiryPreset("never");
        setIsExpiryDropdownOpen(false);
        setNewCoupon({
          code: "",
          discountType: "PERCENTAGE",
          discountValue: "",
          minOrderAmount: "",
          maxUses: "",
          expiresAt: ""
        });
        router.refresh();
      } else {
        toast.error(res.error || (isAr ? "فشل إنشاء القسيمة" : "Failed to create coupon"));
      }
    } catch {
      toast.error(isAr ? "حدث خطأ غير متوقع" : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (couponId: string, currentActive: boolean) => {
    setTogglingId(couponId);
    try {
      const res = await toggleCouponStatusAction(couponId, !currentActive);
      if (res.success) {
        toast.success(
          !currentActive
            ? (isAr ? "تم تفعيل القسيمة بنجاح" : "Coupon activated")
            : (isAr ? "تم إيقاف القسيمة مؤقتاً" : "Coupon paused")
        );
        router.refresh();
      } else {
        toast.error(res.error || (isAr ? "فشل تحديث الحالة" : "Failed to update status"));
      }
    } catch {
      toast.error(isAr ? "حدث خطأ أثناء تحديث القسيمة" : "Failed to toggle status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    setDeletingId(id);
    try {
      const res = await deleteArtisanCoupon(id);
      if (res.success) {
        toast.success(dict?.studio?.coupon_deleted || (isAr ? `تم حذف القسيمة "${code}" بنجاح` : `Coupon "${code}" deleted successfully`));
        router.refresh();
      } else {
        toast.error(res.error || (isAr ? "فشل حذف القسيمة" : "Failed to delete coupon"));
      }
    } catch {
      toast.error(isAr ? "حدث خطأ أثناء الحذف" : "Failed to delete coupon");
    } finally {
      setDeletingId(null);
      setCouponToDelete(null);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(isAr ? `تم نسخ الرمز ${code}` : `Copied ${code} to clipboard!`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6 sm:space-y-8 text-charcoal font-sans">
      {/* Studio Marketing & Growth Main Hub */}
      <div className="bg-white rounded-2xl sm:rounded-3xl md:rounded-[3.5rem] p-4 sm:p-6 md:p-10 lg:p-12 border border-primary/5 shadow-2xl shadow-primary/5 overflow-hidden relative">
        <div className="absolute top-0 end-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[120px] -translate-y-1/3 translate-x-1/3 pointer-events-none" />

        <div className="relative z-10 space-y-6 sm:space-y-8">
          {/* Header & Quick Action Toolbar */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 sm:gap-6 pb-6 border-b border-primary/10">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold mb-2.5 sm:mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAr ? "مركز نمو وتسويق المتجر" : "Shop Marketing & Growth Hub"}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-primary mb-2 leading-tight">
                {dict?.studio?.growth_title || (isAr ? "تسويق" : "Shop")}{" "}
                <span className="serif italic font-normal text-accent">
                  {dict?.studio?.growth_title_accent || (isAr ? "وانتشار المتجر" : "Marketing & Growth")}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-charcoal/60 leading-relaxed font-medium">
                {isAr
                  ? "أدوات متكاملة لإطلاق قسائم الخصم الترويجية، إدارة روابط متجرك وحساباتك، وتوليد بطاقات التغليف مع رمز QR."
                  : "Integrated tools to launch promotional discount campaigns, manage shop links and socials, and generate packaging QR inserts."}
              </p>
            </div>

            {/* Quick Share Links Toolbar */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full lg:w-auto shrink-0">
              <button
                type="button"
                onClick={() => handleCopyLink(shopUrl, "shop")}
                className="flex-1 sm:flex-initial h-10 px-3 sm:px-4 rounded-xl bg-cream hover:bg-cream/80 text-primary font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                title={isAr ? "نسخ رابط المتجر" : "Copy Shop Link"}
              >
                {copiedLinkType === "shop" ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{isAr ? "تم النسخ" : "Copied"}</span>
                  </>
                ) : (
                  <>
                    <Store className="w-4 h-4 text-accent shrink-0" />
                    <span className="truncate">{isAr ? "رابط المتجر" : "Shop Link"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCopyLink(bioUrl, "bio")}
                className="flex-1 sm:flex-initial h-10 px-3 sm:px-4 rounded-xl bg-cream hover:bg-cream/80 text-primary font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                title={isAr ? "نسخ رابط اللينكتري" : "Copy Linktree Link"}
              >
                {copiedLinkType === "bio" ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">{isAr ? "تم النسخ" : "Copied"}</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 text-accent shrink-0" />
                    <span className="truncate">{isAr ? "رابط اللينكتري" : "Linktree"}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsPackagingModalOpen(true)}
                className="w-full sm:w-auto h-10 px-3 sm:px-4 rounded-xl bg-white border border-primary/15 hover:border-primary/30 text-primary font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                title={isAr ? "معاينة كارت التغليف" : "Preview Packaging Card"}
              >
                <Printer className="w-4 h-4 text-accent shrink-0" />
                <span className="truncate">{isAr ? "كارت التغليف" : "Packaging Card"}</span>
              </button>
            </div>
          </div>

          {/* Sub-Tabs Segmented Navigation */}
          <div className="flex gap-1.5 sm:gap-2 p-1 sm:p-1.5 bg-cream/50 rounded-xl sm:rounded-2xl border border-primary/10 overflow-x-auto scrollbar-none snap-x touch-pan-x">
            {[
              {
                id: "coupons",
                label: isAr ? "قسائم الخصم والعروض" : "Coupons & Discounts",
                shortLabel: isAr ? "قسائم الخصم" : "Coupons",
                icon: Ticket,
                badge: activeCouponsCount > 0 ? activeCouponsCount : undefined,
              },
              {
                id: "marketing",
                label: isAr ? "روابط المتجر وبطاقات التغليف" : "Shop Links & Packaging",
                shortLabel: isAr ? "الروابط والتغليف" : "Links & QR",
                icon: QrCode,
              },
              {
                id: "milestones",
                label: isAr ? "مستويات الانتشار والترقية" : "Exposure Milestones",
                shortLabel: isAr ? "مستويات الترقية" : "Milestones",
                icon: Trophy,
                badgeText: nextTier ? (isAr ? `المستوى ${nextTier.level - 1}` : `Tier ${nextTier.level - 1}`) : undefined,
              },
            ].map((subTab) => (
              <button
                key={subTab.id}
                type="button"
                onClick={() => setActiveSubTab(subTab.id as any)}
                className={cn(
                  "flex-1 min-w-[105px] sm:min-w-0 py-2 sm:py-3 px-2 sm:px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer relative shrink-0 snap-start",
                  activeSubTab === subTab.id
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-charcoal/70 hover:text-primary hover:bg-white/60"
                )}
              >
                <subTab.icon className={cn("w-4 h-4 shrink-0", activeSubTab === subTab.id ? "text-accent" : "text-primary/40")} />
                <span className="hidden sm:inline truncate">{subTab.label}</span>
                <span className="sm:hidden truncate">{subTab.shortLabel}</span>
                {subTab.badge !== undefined && (
                  <span className={cn(
                    "px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none shrink-0",
                    activeSubTab === subTab.id ? "bg-white text-primary" : "bg-primary/10 text-primary"
                  )}>
                    {subTab.badge}
                  </span>
                )}
                {subTab.badgeText && (
                  <span className={cn(
                    "px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-bold hidden sm:inline-block leading-none shrink-0",
                    activeSubTab === subTab.id ? "bg-accent text-white" : "bg-accent/15 text-accent"
                  )}>
                    {subTab.badgeText}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sub-Tab 2: Marketing, Links & Packaging */}
          {activeSubTab === "marketing" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-5 sm:space-y-6"
            >
              {/* Unified Shop Links Hub */}
              <div className="bg-cream/30 border border-primary/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-primary/10 pb-4">
                  <div>
                    <h4 className="text-base font-bold text-primary flex items-center gap-2">
                      <Store className="w-5 h-5 text-accent" />
                      <span>{isAr ? "روابط المتجر والمشاركة" : "Shop & Sharing Links"}</span>
                    </h4>
                    <p className="text-xs text-charcoal/60 mt-0.5 font-medium">
                      {isAr
                        ? "روابط مباشرة وسريعة للمشاركة على منصات التواصل الاجتماعي وفي محادثات العملاء."
                        : "Ready-to-share links for social bio, customer messaging, and online campaigns."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-1">
                  {/* Link 1: Official Storefront */}
                  <div className="bg-white rounded-2xl p-4 border border-primary/10 hover:border-primary/25 transition shadow-2xs flex flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-primary">
                              {isAr ? "المتجر الرسمي" : "Official Storefront"}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {isAr ? "الكتالوج الكامل" : "Full Catalog"}
                            </span>
                          </div>
                          <p className="text-[11px] text-charcoal/50 line-clamp-1 mt-0.5">
                            {isAr ? "عرض المنتجات والقصة والتقييمات" : "Full showcase, craft stories & collector reviews"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-cream/30 rounded-xl p-1.5 ps-3 border border-primary/10">
                      <span className="font-mono text-xs text-primary/80 truncate flex-1 select-all min-w-0" dir="ltr">
                        {shopUrl.replace(/^https?:\/\//, "")}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(shopUrl, "shop")}
                          className={cn(
                            "h-8 px-3 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer",
                            copiedLinkType === "shop"
                              ? "bg-emerald-600 text-white"
                              : "bg-primary text-white hover:bg-primary-light"
                          )}
                        >
                          {copiedLinkType === "shop" ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-accent" />
                              <span>{isAr ? "تم النسخ" : "Copied"}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{isAr ? "نسخ" : "Copy"}</span>
                            </>
                          )}
                        </button>
                        <a
                          href={shopUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-lg bg-white border border-primary/10 hover:border-primary/30 text-primary/70 hover:text-primary flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer"
                          title={isAr ? "معاينة المتجر" : "Preview Store"}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Link 2: Link-in-Bio */}
                  <div className="bg-white rounded-2xl p-4 border border-primary/10 hover:border-primary/25 transition shadow-2xs flex flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                          <Link2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-primary">
                              {isAr ? "صفحة اللينكتري (Linktree)" : "Linktree Social Page"}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/15 text-accent">
                              Instagram / TikTok
                            </span>
                          </div>
                          <p className="text-[11px] text-charcoal/50 line-clamp-1 mt-0.5">
                            {isAr ? "صفحة روابط سريعة لإنستجرام وتيك توك" : "Fast mobile landing page with all your links & socials"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-cream/30 rounded-xl p-1.5 ps-3 border border-primary/10">
                      <span className="font-mono text-xs text-primary/80 truncate flex-1 select-all min-w-0" dir="ltr">
                        {bioUrl.replace(/^https?:\/\//, "")}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyLink(bioUrl, "bio")}
                          className={cn(
                            "h-8 px-3 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer",
                            copiedLinkType === "bio"
                              ? "bg-emerald-600 text-white"
                              : "bg-accent hover:bg-accent/90 text-white"
                          )}
                        >
                          {copiedLinkType === "bio" ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>{isAr ? "تم النسخ" : "Copied"}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{isAr ? "نسخ" : "Copy"}</span>
                            </>
                          )}
                        </button>
                        <a
                          href={bioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-lg bg-white border border-primary/10 hover:border-primary/30 text-primary/70 hover:text-primary flex items-center justify-center transition-all shadow-2xs active:scale-95 cursor-pointer"
                          title={isAr ? "معاينة اللينكتري" : "Preview Linktree"}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Packaging & QR Hub */}
              <div className="bg-cream/30 border border-primary/10 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-primary/10 pb-4">
                  <div>
                    <h4 className="text-base font-bold text-primary flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-accent shrink-0" />
                      <span>{isAr ? "باركود التغليف والطباعة (QR Code)" : "Packaging & Display QR Code"}</span>
                    </h4>
                    <p className="text-xs text-charcoal/60 mt-0.5 font-medium leading-relaxed">
                      {isAr 
                        ? "اطبع الباركود على بطاقات الشكر داخل الشحنات أو اعرضه في البازارات والمعارض."
                        : "Print on packaging inserts or tabletop displays for instant reorders & followers."}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
                    <button
                      type="button"
                      onClick={handleDownloadQR}
                      className="h-10 sm:h-9 px-3.5 rounded-xl bg-white border border-primary/15 hover:border-primary/30 text-primary font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <Download className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-accent shrink-0" />
                      <span>{isAr ? "تحميل QR (PNG)" : "Download QR (PNG)"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPackagingModalOpen(true)}
                      className="h-10 sm:h-9 px-3.5 rounded-xl bg-primary hover:bg-primary-light text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Printer className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
                      <span>{isAr ? "تصميم وطباعة كارت التغليف" : "Print Packaging Card"}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-5 bg-white rounded-2xl p-4 sm:p-5 border border-primary/10 shadow-2xs">
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 w-full md:w-auto">
                    <div className="p-2.5 bg-white rounded-xl border border-primary/10 shadow-2xs shrink-0">
                      <QRCode
                        id="growth-shop-qr-code"
                        value={activeUrlTab === "shop" ? shopUrl : bioUrl}
                        size={84}
                        bgColor="#FFFFFF"
                        fgColor="#064E3B"
                        level="H"
                      />
                    </div>
                    <div className="space-y-1.5 text-center sm:text-start min-w-0">
                      <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                        <span className="font-bold text-primary text-sm">{artisanName}</span>
                        {/* QR Target Switcher */}
                        <div className="inline-flex p-0.5 bg-cream rounded-lg border border-primary/10 shrink-0">
                          <button
                            type="button"
                            onClick={() => setActiveUrlTab("shop")}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer",
                              activeUrlTab === "shop" ? "bg-primary text-white shadow-2xs" : "text-charcoal/60 hover:text-primary"
                            )}
                          >
                            {isAr ? "المتجر" : "Storefront"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveUrlTab("bio")}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer",
                              activeUrlTab === "bio" ? "bg-primary text-white shadow-2xs" : "text-charcoal/60 hover:text-primary"
                            )}
                          >
                            {isAr ? "لينكتري" : "Linktree"}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-charcoal/60 font-medium">
                        {activeUrlTab === "shop" 
                          ? (isAr ? "الرمز يوجه الزائر لكتالوج المنتجات الكامل" : "Points scanners directly to your shop catalog")
                          : (isAr ? "الرمز يوجه الزائر لصفحة اللينكتري الخاصة بك" : "Points scanners directly to your Linktree page")}
                      </p>
                      <p className="text-[11px] text-accent font-mono font-bold truncate max-w-xs sm:max-w-md" dir="ltr">
                        {activeUrlTab === "shop" ? shopUrl : bioUrl}
                      </p>
                    </div>
                  </div>

                  <div className="text-xs text-charcoal/60 bg-cream/40 rounded-xl p-3 border border-primary/10 max-w-sm w-full md:w-auto shrink-0 flex items-start gap-2.5">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-primary text-[11px]">{isAr ? "نصيحة لزيادة المبيعات:" : "Packaging Tip:"}</p>
                      <p className="text-[11px] leading-relaxed">
                        {isAr 
                          ? "إرفاق كارت الشكر داخل كرتونة التغليف يرفع من معدل تكرار الشراء بنسبة تصل إلى 35%." 
                          : "Placing a thank-you insert inside delivery boxes boosts repeat orders by over 35%."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Media Accounts & Link-in-Bio */}
              <div className="bg-cream/20 hover:bg-cream/30 border border-primary/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 transition-all shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-primary/10 pb-4">
                  <div className="space-y-1">
                    <h4 className="text-sm sm:text-base font-bold text-primary flex items-center gap-2">
                      <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" />
                      <span>{isAr ? "حسابات وسائل التواصل الاجتماعي" : "Social Media Accounts"}</span>
                    </h4>
                    <p className="text-xs text-charcoal/60 font-medium leading-relaxed">
                      {isAr 
                        ? "أدخل معرّفات حساباتك لتظهر تلقائياً كأزرار تواصل ومتابعة سريعة في رأس صفحة البايو ومتجرك." 
                        : "Enter your social handles to display quick follow buttons in your bio page header and storefront."}
                    </p>
                  </div>

                  <a
                    href={bioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 px-4 rounded-xl bg-white border border-primary/15 hover:border-primary/30 text-primary font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95 cursor-pointer w-full sm:w-auto shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{isAr ? "معاينة اللينكتري" : "Preview Linktree"}</span>
                  </a>
                </div>

                <form onSubmit={handleSaveSocials} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Instagram */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-primary/80 flex items-center gap-1.5">
                        <FaInstagram className="w-4 h-4 text-pink-600" />
                        <span>Instagram</span>
                      </label>
                      <input
                        type="text"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder={isAr ? "مثال: craft_studio" : "e.g. craft_studio"}
                        className="w-full bg-white border border-primary/15 rounded-xl px-3.5 py-2.5 text-xs font-medium text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:border-primary transition shadow-2xs"
                      />
                    </div>

                    {/* TikTok */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-primary/80 flex items-center gap-1.5">
                        <FaTiktok className="w-4 h-4 text-slate-800" />
                        <span>TikTok</span>
                      </label>
                      <input
                        type="text"
                        value={tiktok}
                        onChange={(e) => setTiktok(e.target.value)}
                        placeholder={isAr ? "مثال: @craft_studio" : "e.g. @craft_studio"}
                        className="w-full bg-white border border-primary/15 rounded-xl px-3.5 py-2.5 text-xs font-medium text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:border-primary transition shadow-2xs"
                      />
                    </div>

                    {/* Facebook */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-primary/80 flex items-center gap-1.5">
                        <FaFacebook className="w-4 h-4 text-blue-600" />
                        <span>Facebook</span>
                      </label>
                      <input
                        type="text"
                        value={facebook}
                        onChange={(e) => setFacebook(e.target.value)}
                        placeholder={isAr ? "مثال: craftstudio" : "e.g. craftstudio"}
                        className="w-full bg-white border border-primary/15 rounded-xl px-3.5 py-2.5 text-xs font-medium text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:border-primary transition shadow-2xs"
                      />
                    </div>

                    {/* Pinterest */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-primary/80 flex items-center gap-1.5">
                        <FaPinterest className="w-4 h-4 text-red-600" />
                        <span>Pinterest</span>
                      </label>
                      <input
                        type="text"
                        value={pinterest}
                        onChange={(e) => setPinterest(e.target.value)}
                        placeholder={isAr ? "مثال: craftstudio" : "e.g. craftstudio"}
                        className="w-full bg-white border border-primary/15 rounded-xl px-3.5 py-2.5 text-xs font-medium text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:border-primary transition shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isSavingSocials}
                      className="w-full sm:w-auto h-11 px-6 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-sm active:scale-95 cursor-pointer"
                    >
                      {isSavingSocials ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{isSavingSocials ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ حسابات التواصل" : "Save Social Accounts")}</span>
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* Sub-Tab 3: Exposure Milestones */}
          {activeSubTab === "milestones" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              {/* Progress Summary Card */}
              {nextTier && (
                <div className="bg-cream/30 border border-primary/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6 shadow-xs">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent text-[11px] font-bold">
                      <Trophy className="w-3.5 h-3.5" />
                      <span>{isAr ? "تقدم المتجر الحالي" : "Current Milestone Progress"}</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-heading font-bold text-primary">
                      {isAr ? "هدفك التالي:" : "Next Goal:"}{" "}
                      <span className="text-accent">{nextTier.title}</span>
                    </h3>
                    <p className="text-xs text-charcoal/60 leading-relaxed font-medium">
                      {nextTier.desc}
                    </p>
                  </div>

                  <div className="w-full md:w-80 bg-white p-4 sm:p-5 rounded-2xl border border-primary/10 shadow-2xs shrink-0 space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-bold text-primary/70">{isAr ? "إجمالي المبيعات" : "Total Orders"}</span>
                      <span className="text-xl font-heading font-bold text-accent">
                        {totalSales}
                        <span className="text-xs text-primary/40">/{nextTier.threshold}</span>
                      </span>
                    </div>

                    <div className="h-3 bg-cream/70 rounded-full overflow-hidden border border-primary/10 shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-accent shadow-[0_0_15px_rgba(218,123,90,0.4)]"
                      />
                    </div>

                    <p className="text-[10px] font-bold text-center text-primary/60 uppercase tracking-wider">
                      {nextTier.threshold - totalSales} {isAr ? "طلبات متبقية للترقية القادمة" : "orders to unlock next platform perks"}
                    </p>
                  </div>
                </div>
              )}

              {/* Milestone Tier Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                {tiers.map((tier, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] border transition-all relative overflow-hidden group",
                      tier.active ? "bg-white border-primary shadow-xl shadow-primary/10" : 
                      tier.upcoming ? "bg-cream/20 border-accent/20 border-dashed opacity-100" :
                      "bg-cream/20 border-primary/5 grayscale opacity-60"
                    )}
                  >
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-5 shadow-lg", 
                      tier.active ? tier.color : "bg-primary/10 text-primary/40"
                    )}>
                      <tier.icon className="w-7 h-7" />
                    </div>

                    <div className="flex items-center justify-between mb-2">
                      <h4 className={cn(
                        "text-xl font-heading font-bold",
                        tier.active ? "text-primary" : "text-primary/50"
                      )}>{tier.title}</h4>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-cream text-charcoal/70 border border-primary/10">
                        {tier.threshold} {isAr ? "مبيعات" : "sales"}
                      </span>
                    </div>

                    <p className="text-xs text-charcoal/60 font-medium leading-relaxed mb-4">{tier.desc}</p>

                    <div className="pt-3 border-t border-primary/5 flex items-center justify-between text-[11px]">
                      <span className="text-primary/40 font-bold uppercase tracking-wider">{isAr ? "الميزة المفتوحة:" : "Unlocked Perk:"}</span>
                      <span className="font-bold text-accent">{tier.perk}</span>
                    </div>

                    {tier.active && (
                      <div className="absolute top-4 end-4">
                        <div className="px-3 py-1 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1">
                          <Check className="w-3 h-3 text-accent" />
                          <span>{dict?.studio?.active_tier || (isAr ? "المستوى الحالي" : "Active Tier")}</span>
                        </div>
                      </div>
                    )}
                    {tier.upcoming && (
                      <div className="absolute top-4 end-4">
                        <div className="px-3 py-1 bg-accent/10 text-accent text-[9px] font-black uppercase tracking-widest rounded-full border border-accent/20">
                          {dict?.studio?.tier_in_sight || (isAr ? "قريب منك" : "In Sight")}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Sub-Tab 1: Coupons & Discounts */}
          {activeSubTab === "coupons" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 pb-2">
                <div className="space-y-1 sm:space-y-1.5">
                  <h3 className="text-xl md:text-2xl font-heading font-bold text-primary flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-accent shrink-0" />
                    <span>{isAr ? "قسائم الخصم والعروض الحصرية" : "Promotional Coupons & Special Offers"}</span>
                  </h3>
                  <p className="text-xs md:text-sm text-charcoal/60 font-medium leading-relaxed">
                    {isAr 
                      ? "أنشئ كوبونات خصم خاصة بمنتجاتك لمشاركتها في حملات إنستجرام ومكافأة عملائك المخلصين."
                      : "Create custom discount codes applied to your items. Share them on socials to reward loyal buyers."}
                  </p>
                </div>

                {!isCreating && (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full sm:w-auto h-11 sm:h-12 px-5 sm:px-6 bg-primary hover:bg-primary-light text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-primary/10 active:scale-95 shrink-0 text-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-accent" />
                    <span>{isAr ? "إنشاء قسيمة جديدة" : "Create Promo Code"}</span>
                  </button>
                )}
              </div>
        {/* Create Coupon Form */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8 sm:mb-12"
            >
              <div className="p-4 sm:p-6 md:p-10 bg-cream/40 rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] border border-primary/10 relative">
                <div className="flex items-center justify-between mb-6 sm:mb-8 pb-4 border-b border-primary/10">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-accent" />
                    <h3 className="text-base sm:text-lg md:text-xl font-heading font-bold text-primary">
                      {isAr ? "تفاصيل قسيمة الخصم الجديدة" : "New Promo Code Details"}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white hover:bg-red-50 text-charcoal/40 hover:text-red-500 transition-colors flex items-center justify-center border border-primary/5 cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateCoupon} className="space-y-6 sm:space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
                    {/* Code */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ms-3">
                        {isAr ? "رمز القسيمة *" : "Promo Code *"}
                      </label>
                      <div className="relative">
                        <Tag className="absolute start-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/30" />
                        <input
                          required
                          type="text"
                          value={newCoupon.code}
                          onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase().replace(/\s+/g, "") })}
                          placeholder={isAr ? "مثال: SUMMER20" : "e.g. SUMMER20"}
                          className="w-full h-14 ps-14 pe-6 rounded-2xl bg-white border border-primary/10 focus:border-accent outline-none font-mono font-bold text-primary text-sm uppercase placeholder:normal-case tracking-wider"
                        />
                      </div>
                      <p className="text-[11px] text-charcoal/50 ms-3">
                        {isAr ? "الرمز الذي يكتبه المشتري عند إتمام الطلب" : "Code typed by collectors at checkout"}
                      </p>
                    </div>

                    {/* Discount Type */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ms-3">
                        {isAr ? "نوع الخصم *" : "Discount Type *"}
                      </label>
                      <div className="flex bg-white rounded-2xl p-1.5 border border-primary/10 h-14">
                        <button
                          type="button"
                          onClick={() => setNewCoupon({ ...newCoupon, discountType: "PERCENTAGE" })}
                          className={cn(
                            "flex-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                            newCoupon.discountType === "PERCENTAGE" 
                              ? "bg-primary text-white shadow-md shadow-primary/20" 
                              : "text-primary/50 hover:text-primary"
                          )}
                        >
                          <Percent className="w-3.5 h-3.5" />
                          <span>{isAr ? "نسبة مئوية (%)" : "Percentage (%)"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewCoupon({ ...newCoupon, discountType: "FIXED" })}
                          className={cn(
                            "flex-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                            newCoupon.discountType === "FIXED" 
                              ? "bg-primary text-white shadow-md shadow-primary/20" 
                              : "text-primary/50 hover:text-primary"
                          )}
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>{isAr ? `مبلغ ثابت (${currency})` : `Fixed (${currency})`}</span>
                        </button>
                      </div>
                    </div>

                    {/* Discount Value */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ms-3">
                        {newCoupon.discountType === "PERCENTAGE" 
                          ? (isAr ? "قيمة الخصم (%) *" : "Discount Percentage (%) *")
                          : (isAr ? `قيمة الخصم (${currency}) *` : `Discount Amount (${currency}) *`)}
                      </label>
                      <div className="relative">
                        {newCoupon.discountType === "PERCENTAGE" ? (
                          <Percent className="absolute start-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/30" />
                        ) : (
                          <Banknote className="absolute start-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/30" />
                        )}
                        <input
                          required
                          type="number"
                          min="1"
                          max={newCoupon.discountType === "PERCENTAGE" ? "100" : undefined}
                          value={newCoupon.discountValue}
                          onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: e.target.value })}
                          placeholder={newCoupon.discountType === "PERCENTAGE" ? "15" : "50"}
                          className="w-full h-14 ps-14 pe-6 rounded-2xl bg-white border border-primary/10 focus:border-accent outline-none font-bold text-primary text-sm"
                        />
                      </div>
                    </div>

                    {/* Minimum Order */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ms-3">
                        {isAr ? `الحد الأدنى للطلب (${currency})` : `Min. Order Value (${currency})`}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newCoupon.minOrderAmount}
                        onChange={(e) => setNewCoupon({ ...newCoupon, minOrderAmount: e.target.value })}
                        placeholder={isAr ? "0 = بدون حد أدنى" : "0 = No minimum"}
                        className="w-full h-14 px-6 rounded-2xl bg-white border border-primary/10 focus:border-accent outline-none font-bold text-primary text-sm"
                      />
                      <p className="text-[11px] text-charcoal/50 ms-3">
                        {isAr ? "اختياري — لا يُطبق الخصم إلا إذا بلغ سلة المشتري هذا المبلغ" : "Optional — only applies if artisan items subtotal reaches this amount"}
                      </p>
                    </div>

                    {/* Maximum Uses */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ms-3">
                        {isAr ? "أقصى عدد مرات استخدام" : "Max Total Redemptions"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newCoupon.maxUses}
                        onChange={(e) => setNewCoupon({ ...newCoupon, maxUses: e.target.value })}
                        placeholder={isAr ? "0 = غير محدود" : "0 = Unlimited"}
                        className="w-full h-14 px-6 rounded-2xl bg-white border border-primary/10 focus:border-accent outline-none font-bold text-primary text-sm"
                      />
                      <p className="text-[11px] text-charcoal/50 ms-3">
                        {isAr ? "اختياري — يتوقف الكوبون تلقائياً بعد بلوغ هذا العدد" : "Optional — automatically expires after this number of orders"}
                      </p>
                    </div>

                    {/* Expiration Custom Dropdown (Row 2, Column 3) */}
                    <div ref={expiryDropdownRef} className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary/60 ms-3 flex items-center justify-between">
                        <span>{isAr ? "صلاحية وانتهاء القسيمة" : "Coupon Validity & Expiry"}</span>
                        {newCoupon.expiresAt && (
                          <span className="text-[10px] font-bold text-accent normal-case tracking-normal">
                            {new Date(newCoupon.expiresAt).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </span>
                        )}
                      </label>

                      {/* Dropdown Button */}
                      <button
                        type="button"
                        onClick={() => setIsExpiryDropdownOpen(!isExpiryDropdownOpen)}
                        className={cn(
                          "w-full h-14 px-4 rounded-2xl bg-white border text-start cursor-pointer transition-all flex items-center justify-between gap-3 shadow-xs active:scale-[0.99]",
                          isExpiryDropdownOpen
                            ? "border-primary/40 ring-2 ring-primary/10 shadow-sm"
                            : "border-primary/10 hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors border",
                            expiryPreset === "never"
                              ? "bg-cream border-primary/10 text-accent"
                              : "bg-primary/10 border-primary/15 text-primary"
                          )}>
                            {expiryPreset === "never" && <Sparkles className="w-4 h-4 text-accent" />}
                            {expiryPreset === "7d" && <Clock className="w-4 h-4 text-primary" />}
                            {expiryPreset === "30d" && <CalendarDays className="w-4 h-4 text-primary" />}
                            {expiryPreset === "custom" && <Calendar className="w-4 h-4 text-primary" />}
                          </div>

                          <div className="flex flex-col min-w-0">
                            <span className="truncate text-xs font-bold text-primary">
                              {expiryPreset === "never"
                                ? (isAr ? "دائم (بدون تاريخ انتهاء)" : "Never (Always Active)")
                                : expiryPreset === "7d"
                                  ? (isAr ? "أسبوع واحد (٧ أيام)" : "1 Week (7 Days)")
                                  : expiryPreset === "30d"
                                    ? (isAr ? "شهر واحد (٣٠ يوم)" : "1 Month (30 Days)")
                                    : (newCoupon.expiresAt 
                                        ? (isAr 
                                            ? `ينتهي في ${new Date(newCoupon.expiresAt).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" })}` 
                                            : `Expires ${new Date(newCoupon.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`)
                                        : (isAr ? "تحديد تاريخ مخصص بالتقويم..." : "Custom Calendar Date..."))}
                            </span>
                            <span className="text-[10px] text-charcoal/50 font-medium truncate">
                              {expiryPreset === "never"
                                ? (isAr ? "فعال دائماً حتى توقفه" : "No expiration date")
                                : (newCoupon.expiresAt 
                                    ? (isAr 
                                        ? new Date(newCoupon.expiresAt).toLocaleDateString("ar-EG", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
                                        : new Date(newCoupon.expiresAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }))
                                    : (isAr ? "انقر لاختيار موعد" : "Click to select date"))}
                            </span>
                          </div>
                        </div>

                        <ChevronDown className={cn("w-4 h-4 text-primary/40 shrink-0 transition-transform duration-200", isExpiryDropdownOpen && "rotate-180 text-primary")} />
                      </button>

                      {/* Helper text under button */}
                      <p className="text-[11px] text-charcoal/50 ms-3">
                        {expiryPreset === "never" 
                          ? (isAr ? "فعال دائماً حتى توقفه أو تحذفه" : "Active indefinitely until manually paused")
                          : (isAr 
                              ? `ينتهي في: ${newCoupon.expiresAt ? new Date(newCoupon.expiresAt).toLocaleDateString("ar-EG", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "تاريخ محدد"}` 
                              : `Expires on: ${newCoupon.expiresAt ? new Date(newCoupon.expiresAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : "selected date"}`)}
                      </p>

                      {/* Dropdown Menu (Inline expansion: pushes down smoothly, never overlaps or clips) */}
                      <AnimatePresence>
                        {isExpiryDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, y: -4 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -4 }}
                            transition={{ duration: 0.18 }}
                            className="bg-white rounded-2xl border border-primary/15 shadow-sm p-2 space-y-1 overflow-hidden"
                          >
                            {/* Option: Never */}
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectPreset("never");
                                setIsExpiryDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full p-2.5 rounded-xl text-start transition-all flex items-center justify-between gap-3 group cursor-pointer border",
                                expiryPreset === "never"
                                  ? "bg-cream border-primary/20 text-primary shadow-xs"
                                  : "bg-transparent border-transparent hover:bg-cream/50 text-charcoal/80 hover:text-primary"
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                  expiryPreset === "never" 
                                    ? "bg-primary text-white" 
                                    : "bg-primary/5 text-primary/70 group-hover:bg-primary/10 group-hover:text-primary"
                                )}>
                                  <Sparkles className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className={cn("text-xs leading-tight", expiryPreset === "never" ? "font-extrabold text-primary" : "font-bold")}>
                                    {isAr ? "دائم (بدون تاريخ انتهاء)" : "Never (Always Active)"}
                                  </p>
                                  <p className="text-[10px] text-charcoal/50 font-normal leading-tight mt-0.5 truncate">
                                    {isAr ? "فعال دائماً حتى توقفه أو تحذفه" : "Active indefinitely until paused"}
                                  </p>
                                </div>
                              </div>
                              {expiryPreset === "never" && (
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <Check className="w-3.5 h-3.5 text-primary" />
                                </div>
                              )}
                            </button>

                            {/* Option: 1 Week */}
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectPreset("7d");
                                setIsExpiryDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full p-2.5 rounded-xl text-start transition-all flex items-center justify-between gap-3 group cursor-pointer border",
                                expiryPreset === "7d"
                                  ? "bg-cream border-primary/20 text-primary shadow-xs"
                                  : "bg-transparent border-transparent hover:bg-cream/50 text-charcoal/80 hover:text-primary"
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                  expiryPreset === "7d" 
                                    ? "bg-primary text-white" 
                                    : "bg-primary/5 text-primary/70 group-hover:bg-primary/10 group-hover:text-primary"
                                )}>
                                  <Clock className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className={cn("text-xs leading-tight", expiryPreset === "7d" ? "font-extrabold text-primary" : "font-bold")}>
                                    {isAr ? "أسبوع واحد (٧ أيام)" : "1 Week (7 Days)"}
                                  </p>
                                  <p className="text-[10px] text-charcoal/50 font-normal leading-tight mt-0.5 truncate">
                                    {isAr ? "للعروض الأسبوعية الخاطفة" : "Best for weekend flash sales"}
                                  </p>
                                </div>
                              </div>
                              {expiryPreset === "7d" && (
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <Check className="w-3.5 h-3.5 text-primary" />
                                </div>
                              )}
                            </button>

                            {/* Option: 1 Month */}
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectPreset("30d");
                                setIsExpiryDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full p-2.5 rounded-xl text-start transition-all flex items-center justify-between gap-3 group cursor-pointer border",
                                expiryPreset === "30d"
                                  ? "bg-cream border-primary/20 text-primary shadow-xs"
                                  : "bg-transparent border-transparent hover:bg-cream/50 text-charcoal/80 hover:text-primary"
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                  expiryPreset === "30d" 
                                    ? "bg-primary text-white" 
                                    : "bg-primary/5 text-primary/70 group-hover:bg-primary/10 group-hover:text-primary"
                                )}>
                                  <CalendarDays className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className={cn("text-xs leading-tight", expiryPreset === "30d" ? "font-extrabold text-primary" : "font-bold")}>
                                    {isAr ? "شهر واحد (٣٠ يوم)" : "1 Month (30 Days)"}
                                  </p>
                                  <p className="text-[10px] text-charcoal/50 font-normal leading-tight mt-0.5 truncate">
                                    {isAr ? "للحملات الترويجية الشهرية" : "Ideal for monthly creator promos"}
                                  </p>
                                </div>
                              </div>
                              {expiryPreset === "30d" && (
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <Check className="w-3.5 h-3.5 text-primary" />
                                </div>
                              )}
                            </button>

                            {/* Option: Custom Calendar Date */}
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectPreset("custom");
                              }}
                              className={cn(
                                "w-full p-2.5 rounded-xl text-start transition-all flex items-center justify-between gap-3 group cursor-pointer border",
                                expiryPreset === "custom"
                                  ? "bg-cream border-primary/20 text-primary shadow-xs"
                                  : "bg-transparent border-transparent hover:bg-cream/50 text-charcoal/80 hover:text-primary"
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                                  expiryPreset === "custom" 
                                    ? "bg-primary text-white" 
                                    : "bg-primary/5 text-primary/70 group-hover:bg-primary/10 group-hover:text-primary"
                                )}>
                                  <Calendar className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className={cn("text-xs leading-tight", expiryPreset === "custom" ? "font-extrabold text-primary" : "font-bold")}>
                                    {isAr ? "تحديد تاريخ مخصص بالتقويم..." : "Custom Calendar Date..."}
                                  </p>
                                  <p className="text-[10px] text-charcoal/50 font-normal leading-tight mt-0.5 truncate">
                                    {isAr ? "اختر يوماً محدداً لانقضاء الكوبون" : "Pick an exact calendar day"}
                                  </p>
                                </div>
                              </div>
                              {expiryPreset === "custom" && (
                                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                  <Check className="w-3.5 h-3.5 text-primary" />
                                </div>
                              )}
                            </button>

                            {/* Calendar view if custom is chosen */}
                            {expiryPreset === "custom" && (
                              <div className="pt-3 px-1 pb-1 border-t border-primary/10 mt-1 space-y-2">
                                <div className="flex items-center justify-between px-1">
                                  <button
                                    type="button"
                                    onClick={handlePrevMonth}
                                    className="w-7 h-7 rounded-lg bg-cream hover:bg-primary/10 border border-primary/10 flex items-center justify-center text-primary transition-all active:scale-95 cursor-pointer"
                                    aria-label="Previous month"
                                  >
                                    {isAr ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                                  </button>
                                  <span className="font-heading font-bold text-primary text-xs capitalize tracking-wide">
                                    {new Intl.DateTimeFormat(isAr ? "ar-EG" : "en-US", { month: "long", year: "numeric" }).format(calendarMonth)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={handleNextMonth}
                                    className="w-7 h-7 rounded-lg bg-cream hover:bg-primary/10 border border-primary/10 flex items-center justify-center text-primary transition-all active:scale-95 cursor-pointer"
                                    aria-label="Next month"
                                  >
                                    {isAr ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                  </button>
                                </div>

                                <div className="grid grid-cols-7 gap-1 text-center">
                                  {(isAr 
                                    ? ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"]
                                    : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
                                  ).map((dayName) => (
                                    <span key={dayName} className="text-[9px] font-black uppercase text-primary/40 py-0.5">
                                      {dayName}
                                    </span>
                                  ))}

                                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                                    <div key={`empty-${i}`} className="h-7 w-7" />
                                  ))}

                                  {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const dayNum = i + 1;
                                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                                    const dayDate = new Date(currentYear, currentMonth, dayNum);
                                    const isPast = dayDate < todayMidnight;
                                    const isSelected = newCoupon.expiresAt === dateStr;
                                    const isToday = 
                                      todayMidnight.getFullYear() === currentYear &&
                                      todayMidnight.getMonth() === currentMonth &&
                                      todayMidnight.getDate() === dayNum;

                                    return (
                                      <button
                                        key={dayNum}
                                        type="button"
                                        disabled={isPast}
                                        onClick={() => {
                                          setNewCoupon(prev => ({ ...prev, expiresAt: dateStr }));
                                          setIsExpiryDropdownOpen(false);
                                        }}
                                        className={cn(
                                          "h-7 w-7 mx-auto rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer",
                                          isSelected
                                            ? "bg-primary text-white shadow-xs font-black ring-1 ring-primary"
                                            : isPast
                                              ? "opacity-25 cursor-not-allowed text-charcoal/40 line-through decoration-charcoal/30"
                                              : isToday
                                                ? "border border-accent/60 text-accent font-extrabold hover:bg-accent/10"
                                                : "hover:bg-primary/10 hover:text-primary text-charcoal/80"
                                        )}
                                      >
                                        {dayNum}
                                      </button>
                                    );
                                  })}
                                </div>

                                {newCoupon.expiresAt && (
                                  <div className="pt-2 border-t border-primary/5 flex items-center justify-between text-[11px] px-1">
                                    <span className="text-charcoal/50">
                                      {isAr ? "التاريخ المحدد:" : "Chosen date:"}
                                    </span>
                                    <span className="font-bold text-accent">
                                      {new Date(newCoupon.expiresAt).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric"
                                      })}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-primary/10">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto h-14 px-8 bg-white border border-primary/10 text-charcoal/70 font-bold rounded-2xl hover:bg-cream/40 transition-all text-sm"
                    >
                      {isAr ? "إلغاء" : "Cancel"}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto h-14 px-10 bg-primary hover:bg-primary-light text-white font-bold rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50 active:scale-95"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-accent" />
                          <span>{isAr ? "جاري الإنشاء..." : "Creating..."}</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 text-accent" />
                          <span>{isAr ? "حفظ وتفعيل القسيمة" : "Publish Promo Code"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coupon Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {coupons.length === 0 ? (
            <div className="col-span-full py-12 sm:py-16 px-4 sm:px-6 text-center bg-cream/20 rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] border-2 border-dashed border-primary/10">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4 text-accent">
                <Ticket className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-heading font-bold text-primary mb-2">
                {isAr ? "لا توجد قسائم خصم حتى الآن" : "No promo codes active yet"}
              </h3>
              <p className="text-charcoal/60 font-medium max-w-md mx-auto text-xs sm:text-sm leading-relaxed mb-6">
                {isAr 
                  ? "ابدأ بتشجيع المشترين وزيادة مبيعاتك عبر توفير خصم ترحيبي أو عروض موسمية خاصة لمتجرك."
                  : "Boost conversion and turn shop visitors into repeat collectors by offering exclusive promo codes."}
              </p>
              {!isCreating && (
                <button
                  onClick={() => setIsCreating(true)}
                  className="h-11 sm:h-12 px-6 bg-primary hover:bg-primary-light text-white font-bold rounded-2xl transition-all inline-flex items-center gap-2 shadow-lg text-xs sm:text-sm active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-accent" />
                  <span>{isAr ? "إنشاء أول قسيمة خصم" : "Create Your First Promo Code"}</span>
                </button>
              )}
            </div>
          ) : (
            coupons.map((coupon) => {
              const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
              const isMaxedOut = coupon.maxUses && coupon.usedCount >= coupon.maxUses;
              const isToggling = togglingId === coupon.id;
              const isDeleting = deletingId === coupon.id;

              return (
                <div 
                  key={coupon.id} 
                  className={cn(
                    "bg-white p-4 sm:p-6 md:p-7 rounded-2xl sm:rounded-[2rem] border transition-all duration-300 relative group flex flex-col justify-between shadow-md hover:shadow-xl",
                    !coupon.isActive || isExpired || isMaxedOut
                      ? "border-charcoal/10 opacity-75 bg-cream/10"
                      : "border-primary/10 hover:border-accent/40"
                  )}
                >
                  <div>
                    {/* Card Top: Status & Action Badges */}
                    <div className="flex items-center justify-between gap-2 mb-5">
                      <div className="flex items-center gap-2">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            {isAr ? "منتهية" : "Expired"}
                          </span>
                        ) : isMaxedOut ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-600 border border-zinc-200">
                            <AlertCircle className="w-3 h-3" />
                            {isAr ? "اكتملت" : "Maxed Out"}
                          </span>
                        ) : coupon.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            {isAr ? "نشطة" : "Active"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-zinc-100 text-zinc-500 border border-zinc-200">
                            <span className="w-2 h-2 rounded-full bg-zinc-400" />
                            {isAr ? "متوقفة" : "Paused"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Toggle Active Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(coupon.id, coupon.isActive)}
                          disabled={isToggling || !!isExpired}
                          title={coupon.isActive ? (isAr ? "إيقاف مؤقت" : "Pause Coupon") : (isAr ? "تفعيل القسيمة" : "Activate Coupon")}
                          className={cn(
                            "w-9 h-9 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-colors border cursor-pointer",
                            coupon.isActive 
                              ? "bg-cream/40 border-primary/10 text-charcoal/60 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200" 
                              : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100",
                            (isToggling || isExpired) && "opacity-50 pointer-events-none"
                          )}
                        >
                          {isToggling ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Power className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setCouponToDelete({ id: coupon.id, code: coupon.code })}
                          disabled={isDeleting}
                          title={isAr ? "حذف القسيمة" : "Delete Coupon"}
                          className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl bg-cream/40 border border-primary/10 text-charcoal/40 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors flex items-center justify-center active:scale-95 cursor-pointer"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Promo Code Box */}
                    <div className="bg-cream/30 border border-dashed border-primary/20 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-2 sm:gap-3 mb-5 min-w-0">
                      <span className="font-mono font-black text-lg sm:text-xl text-primary tracking-wider select-all truncate min-w-0">
                        {coupon.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(coupon.code)}
                        className="px-2.5 py-1.5 rounded-xl bg-white border border-primary/10 hover:border-accent text-charcoal/70 hover:text-accent font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm shrink-0 cursor-pointer"
                      >
                        {copiedCode === coupon.code ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 text-[11px]">{isAr ? "تم النسخ" : "Copied"}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">{isAr ? "نسخ" : "Copy"}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Discount Value */}
                    <div className="flex items-baseline gap-2 mb-4">
                      <span className="text-3xl font-heading font-extrabold text-accent">
                        {coupon.discountType === "PERCENTAGE" 
                          ? `${coupon.discountValue}%` 
                          : `${currency} ${coupon.discountValue}`}
                      </span>
                      <span className="text-xs font-black uppercase tracking-widest text-primary/40">
                        {isAr ? "خصم" : "OFF"}
                      </span>
                    </div>

                    {/* Redemptions Progress */}
                    <div className="space-y-1.5 mb-4">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-charcoal/60">{isAr ? "الاستخدامات" : "Redemptions"}</span>
                        <span className="text-primary font-mono">
                          {coupon.usedCount} {coupon.maxUses > 0 ? `/ ${coupon.maxUses}` : (isAr ? "(غير محدود)" : "(Unlimited)")}
                        </span>
                      </div>
                      {coupon.maxUses > 0 && (
                        <div className="h-2 bg-cream/60 rounded-full overflow-hidden border border-primary/5">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all",
                              isMaxedOut ? "bg-red-500" : "bg-accent"
                            )}
                            style={{ width: `${Math.min(100, (coupon.usedCount / coupon.maxUses) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="pt-4 border-t border-primary/10 space-y-1.5 text-xs text-charcoal/60">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{isAr ? "الحد الأدنى:" : "Min. Order:"}</span>
                      <span className="font-bold text-primary">
                        {coupon.minOrderAmount && coupon.minOrderAmount > 0 
                          ? `${currency} ${coupon.minOrderAmount}`
                          : (isAr ? "بدون حد أدنى" : "None")}
                      </span>
                    </div>

                    {coupon.expiresAt && (
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{isAr ? "تاريخ الانتهاء:" : "Expires:"}</span>
                        <span className={cn("font-bold", isExpired ? "text-amber-700" : "text-primary")}>
                          {new Date(coupon.expiresAt).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    )}
  </div>
</div>

      {/* Custom Confirmation Modal for Deleting Coupons */}
      <ConfirmationModal
        isOpen={!!couponToDelete}
        onClose={() => setCouponToDelete(null)}
        onConfirm={() => {
          if (couponToDelete) {
            handleDeleteCoupon(couponToDelete.id, couponToDelete.code);
          }
        }}
        title={isAr ? "حذف قسيمة الخصم" : "Delete Promo Code"}
        message={
          isAr
            ? `هل أنت متأكد من رغبتك في حذف القسيمة "${couponToDelete?.code}" نهائياً؟ لن يتمكن العملاء من تطبيق هذا الخصم بعد ذلك.`
            : `Are you sure you want to permanently delete promo code "${couponToDelete?.code}"? Collectors will no longer be able to use it at checkout.`
        }
        confirmText={isAr ? "نعم، حذف القسيمة" : "Yes, Delete Code"}
        cancelText={isAr ? "إلغاء" : "Cancel"}
        isDestructive={true}
      />

      {/* Packaging Thank-You Card Modal */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isPackagingModalOpen && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4 bg-charcoal/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl sm:rounded-[2rem] border border-primary/10 p-4 sm:p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-4 sm:space-y-6 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-primary/10">
                <div className="flex items-center gap-2.5">
                  <Printer className="w-5 h-5 text-accent shrink-0" />
                  <h3 className="text-base sm:text-lg font-heading font-bold text-primary">
                    {isAr ? "بطاقة شكر وتغليف مع طلباتك" : "Thank-You Packaging Card"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPackagingModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-cream hover:bg-cream/80 text-charcoal/60 flex items-center justify-center cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Print Layout Selector */}
              <div className="flex items-center justify-between gap-1.5 p-1 bg-cream/70 rounded-xl border border-primary/10">
                <button
                  type="button"
                  onClick={() => setPrintLayout("grid")}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    printLayout === "grid"
                      ? "bg-primary text-white shadow-xs"
                      : "text-charcoal/70 hover:text-primary"
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>{isAr ? "٨ كروت في ورقة A4" : "8 Cards per A4 Sheet"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintLayout("single")}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    printLayout === "single"
                      ? "bg-primary text-white shadow-xs"
                      : "text-charcoal/70 hover:text-primary"
                  )}
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>{isAr ? "كارت منفرد" : "Single Card"}</span>
                </button>
              </div>

              {/* Print media fallback style block */}
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #printable-packaging-card,
                  #printable-packaging-card * {
                    visibility: visible !important;
                  }
                  #printable-packaging-card {
                    position: fixed !important;
                    left: 50% !important;
                    top: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    margin: 0 !important;
                    width: 520px !important;
                    max-width: 95vw !important;
                    min-height: 290px !important;
                    background-color: #064E3B !important;
                    color: #FFFFFF !important;
                    border-radius: 20px !important;
                    padding: 24px !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                    box-shadow: none !important;
                    z-index: 9999999 !important;
                  }
                }
              `}} />

              {/* Printable Card Preview */}
              <div id="printable-packaging-card" className="bg-[#064E3B] text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative overflow-hidden shadow-xl border border-primary/20 flex flex-col justify-between min-h-[200px] sm:min-h-[220px]">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase text-accent block truncate">
                      {isAr ? "صُنع في مصر بكل حب" : "HANDCRAFTED IN EGYPT"}
                    </span>
                    <h4 className="text-lg sm:text-xl md:text-2xl font-heading font-bold text-white mt-1 truncate">
                      {artisanName}
                    </h4>
                  </div>
                  <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl overflow-hidden border border-white/20 bg-white/10 flex items-center justify-center text-white font-serif font-bold text-base shrink-0 shadow-xs">
                    {artisanAvatar ? (
                      <Image
                        src={artisanAvatar}
                        alt={artisanName}
                        fill
                        className="object-cover"
                        sizes="44px"
                      />
                    ) : (
                      <span>{artisanName.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-end justify-between gap-3 sm:gap-4 mt-4 sm:mt-6">
                  <div className="space-y-1 min-w-0 flex-1 max-w-[220px]">
                    <p className="text-[11px] sm:text-xs text-cream/90 font-medium leading-relaxed">
                      {isAr 
                        ? "شكراً لاقتنائك هذه القطعة الحِرفية المميزة ودعمك للفنانين المستقلين." 
                        : "Thank you for supporting authentic handcrafted art and independent makers."}
                    </p>
                    <p className="text-[10px] text-accent font-mono font-bold pt-1 truncate">
                      giftisan.com/artisans/{artisanSlug}
                    </p>
                  </div>

                  <div className="p-2 sm:p-2.5 bg-white rounded-xl sm:rounded-2xl shadow-md shrink-0">
                    <QRCode
                      id="packaging-card-qr-code"
                      value={shopUrl}
                      size={72}
                      bgColor="#FFFFFF"
                      fgColor="#064E3B"
                      level="H"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPackagingModalOpen(false)}
                  className="w-full sm:w-auto h-11 px-5 rounded-xl bg-cream hover:bg-cream/80 text-charcoal font-bold text-xs transition-colors cursor-pointer flex items-center justify-center"
                >
                  {isAr ? "إغلاق" : "Close"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="w-full sm:w-auto h-11 px-5 rounded-xl bg-white border border-primary/20 hover:border-primary/40 text-primary font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>{isAr ? "تحميل رمز QR" : "Download QR"}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrintPackagingCard}
                  className="w-full sm:w-auto h-11 px-6 rounded-xl bg-primary hover:bg-primary-light text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Printer className="w-4 h-4 shrink-0" />
                  <span>
                    {printLayout === "grid"
                      ? (isAr ? "طباعة ٨ كروت (A4)" : "Print 8 Cards (A4)")
                      : (isAr ? "طباعة كارت منفرد" : "Print Single Card")}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
