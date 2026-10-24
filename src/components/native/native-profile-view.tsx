"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  Package,
  Settings,
  LogOut,
  ChevronRight,
  MapPin,
  Calendar,
  CreditCard,
  Truck,
  MessageCircle,
  MessageSquare,
  X,
  Download,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Clock,
  Store,
  ShieldCheck,
  HelpCircle,
  User as UserIcon,
  ChevronDown,
  Check,
  ShoppingBag,
  ExternalLink,
  ArrowRight,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { triggerHaptic, performSignOut } from "@/lib/native";
import { BespokeImage } from "@/components/bespoke-image";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import toast from "react-hot-toast";

interface NativeProfileViewProps {
  user: any;
  orders: any[];
  dict: any;
  lang?: string;
  onRetryPayment?: (orderId: string) => Promise<void>;
  onCancelOrder?: (orderId: string) => Promise<void>;
  onOpenRefundModal?: (order: any, item?: any) => void;
  retryingOrderId?: string | null;
  cancellingOrderId?: string | null;
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

export function NativeProfileView({
  user,
  orders = [],
  dict,
  lang = "en",
  onRetryPayment,
  onCancelOrder,
  onOpenRefundModal,
  retryingOrderId = null,
  cancellingOrderId = null,
}: NativeProfileViewProps) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const isArabic = lang === "ar" || pathname.startsWith("/ar");
  const currency = dict?.product?.currency || (isArabic ? "ج.م" : "EGP");

  const [activeTab, setActiveTab] = useState<"purchases" | "account">("purchases");
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Switch language
  const handleToggleLang = () => {
    triggerHaptic("light");
    const targetLang = isArabic ? "en" : "ar";
    const newPath = pathname.replace(/^\/(en|ar)/, `/${targetLang}`);
    router.push(newPath || `/${targetLang}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return {
          label: isArabic ? "تم التسليم" : "Delivered",
          className: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
          icon: CheckCircle2,
        };
      case "SHIPPED":
        return {
          label: isArabic ? "تم الشحن" : "Shipped",
          className: "bg-blue-50 text-blue-700 border-blue-200/60",
          icon: Truck,
        };
      case "PROCESSING":
        return {
          label: isArabic ? "قيد التنفيذ" : "Processing",
          className: "bg-amber-50 text-amber-700 border-amber-200/60",
          icon: Clock,
        };
      case "PENDING":
        return {
          label: isArabic ? "في انتظار الدفع" : "Payment Pending",
          className: "bg-orange-50 text-orange-700 border-orange-200/60",
          icon: AlertCircle,
        };
      case "CANCELLED":
        return {
          label: isArabic ? "ملغي" : "Cancelled",
          className: "bg-red-50 text-red-600 border-red-200/60",
          icon: X,
        };
      default:
        return {
          label: status,
          className: "bg-gray-50 text-gray-700 border-gray-200/60",
          icon: Package,
        };
    }
  };

  return (
    <div className="min-h-screen bg-cream text-charcoal select-none pb-32">
      {/* 1. Sticky Native Header */}
      <header className="sticky top-0 z-40 bg-cream/95 backdrop-blur-md px-3.5 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-2 border-b border-primary/5 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-xl sm:text-2xl font-bold text-primary tracking-tight">
              {isArabic ? "حسابك" : "You"}
            </h1>
            {user.role === "ARTISAN" && (
              <span className="px-2 py-0.5 rounded-full bg-accent/15 border border-accent/25 text-accent text-[10px] font-black uppercase tracking-wider">
                {isArabic ? "حرفي" : "Artisan"}
              </span>
            )}
            {user.role === "ADMIN" && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-wider">
                Admin
              </span>
            )}
          </div>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={handleToggleLang}
            aria-label="Switch language"
            className="h-9 px-3 rounded-full bg-white border border-primary/10 text-primary text-xs font-black shadow-2xs shrink-0 flex items-center justify-center active:scale-95 transition-transform"
          >
            {isArabic ? "EN" : "عربي"}
          </button>
        </div>

        {/* 2. Etsy Native Segmented Tabs */}
        <div className="flex items-center bg-white/80 p-1 rounded-full border border-primary/10 shadow-2xs">
          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("purchases");
            }}
            className={cn(
              "flex-1 py-1.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95",
              activeTab === "purchases"
                ? "bg-primary text-white shadow-xs"
                : "text-primary/60 hover:text-primary"
            )}
          >
            <Package className="w-3.5 h-3.5" />
            <span>{isArabic ? "مشترياتك" : "Purchases"}</span>
            <span
              className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                activeTab === "purchases"
                  ? "bg-white/20 text-white"
                  : "bg-primary/10 text-primary"
              )}
            >
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic("light");
              setActiveTab("account");
            }}
            className={cn(
              "flex-1 py-1.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95",
              activeTab === "account"
                ? "bg-primary text-white shadow-xs"
                : "text-primary/60 hover:text-primary"
            )}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>{isArabic ? "الإعدادات" : "Account"}</span>
          </button>
        </div>
      </header>

      {/* 3. Main Content Area */}
      <main className="px-3.5 pt-3">
        {/* User Mini Profile Card */}
        <div className="bg-white rounded-2xl p-3.5 border border-primary/10 shadow-2xs mb-3.5 flex items-center gap-3.5">
          <div className="relative w-14 h-14 rounded-full overflow-hidden bg-cream border-2 border-primary/10 shadow-xs shrink-0">
            <BespokeImage
              src={user.image || `https://api.dicebear.com/10.x/gaze/svg?seed=${user.name}`}
              alt={user.name || "User"}
              fill
              className="object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-sm sm:text-base font-bold text-primary truncate">
              {user.name}
            </h2>
            <p className="text-xs text-charcoal/50 truncate font-medium">
              {user.email}
            </p>
            {user.role === "ARTISAN" && (
              <Link
                href={`/${lang}/studio`}
                onClick={() => triggerHaptic("light")}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-accent mt-0.5 active:opacity-75"
              >
                <Store className="w-3 h-3" />
                <span>{dict.profile?.studio || (isArabic ? "إدارة الورشة والمتجر" : "Shop Manager")}</span>
                <ChevronRight className="w-3 h-3 rtl:rotate-180" />
              </Link>
            )}
          </div>
        </div>

        {/* ================= TAB 1: PURCHASES ================= */}
        {activeTab === "purchases" && (
          <div>
            {orders.length === 0 ? (
              /* Empty Orders State */
              <div className="pt-8 text-center bg-white rounded-2xl p-6 border border-primary/10 shadow-2xs">
                <div className="w-14 h-14 rounded-full bg-cream border border-primary/10 flex items-center justify-center mx-auto mb-3 text-primary/30">
                  <Package className="w-7 h-7 stroke-[1.6]" />
                </div>
                <h3 className="font-serif text-base font-bold text-primary">
                  {dict.profile?.no_treasures_yet || (isArabic ? "لا توجد طلبات بعد" : "No orders yet")}
                </h3>
                <p className="text-xs text-charcoal/50 max-w-[260px] mx-auto mt-1 mb-5">
                  {dict.profile?.ready_find_first ||
                    (isArabic
                      ? "ابدأ رحلتك باقتناء قطع يدوية صنعت بشغف من حرفيي مصر المبدعين"
                      : "Start your journey by finding unique handcrafted pieces created by Egyptian artisans")}
                </p>

                <Link
                  href={`/${lang}/categories`}
                  onClick={() => triggerHaptic("light")}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-white text-xs font-bold shadow-xs active:scale-95 transition-transform"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{dict.profile?.explore_gallery || (isArabic ? "تصفح المنتجات" : "Explore Products")}</span>
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </Link>
              </div>
            ) : (
              /* Orders List */
              <div className="space-y-3">
                {orders.map((order) => {
                  const badge = getStatusBadge(order.status);
                  const StatusIcon = badge.icon;
                  const trackingUrl = getTrackingUrl(order.carrier, order.trackingNumber);
                  const dateStr = new Date(order.createdAt).toLocaleDateString(
                    isArabic ? "ar-EG" : "en-US",
                    { month: "short", day: "numeric", year: "numeric" }
                  );

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl p-3 border border-primary/10 shadow-2xs"
                    >
                      {/* Order Header: Reference & Status */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-primary/5">
                        <div className="min-w-0">
                          <p className="text-[10px] text-charcoal/45 uppercase font-bold tracking-wider">
                            {dateStr}
                          </p>
                          <p className="font-mono text-xs font-bold text-primary truncate">
                            #{order.id.slice(-8).toUpperCase()}
                          </p>
                        </div>

                        <div
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border",
                            badge.className
                          )}
                        >
                          <StatusIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </div>
                      </div>

                      {/* Items Preview */}
                      <div className="py-2.5 space-y-2">
                        {order.items?.map((item: any) => {
                          const itemImg = item.product?.images?.[0] || "/placeholder.jpg";
                          const itemName = item.product?.name || item.name || (isArabic ? "قطعة يدوية" : "Handmade item");
                          const itemSlug = item.product?.slug || item.product?.id;

                          return (
                            <div
                              key={item.id}
                              className="flex items-center gap-2.5"
                            >
                              <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-cream shrink-0 border border-primary/5">
                                <Image
                                  src={itemImg}
                                  alt={itemName}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <Link
                                  href={itemSlug ? `/${lang}/products/${itemSlug}` : "#"}
                                  onClick={() => triggerHaptic("light")}
                                  className="text-xs font-bold text-primary truncate block hover:text-accent"
                                >
                                  {itemName}
                                </Link>
                                <p className="text-[10px] text-charcoal/50">
                                  {item.quantity} × {Number(item.price).toLocaleString()} {currency}
                                </p>
                                {item.personalization && (
                                  <p className="text-[10px] text-accent/90 italic truncate">
                                    "{item.personalization}"
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Order Total & Actions */}
                      <div className="pt-2 border-t border-primary/5 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-charcoal/40 block font-medium">
                            {isArabic ? "الإجمالي" : "Total"}
                          </span>
                          <span className="text-xs font-black text-primary">
                            {Number(order.totalAmount).toLocaleString()} {currency}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Pending payment actions */}
                          {(order.status === "PENDING" || order.status === "FAILED") && (
                            <>
                              <button
                                type="button"
                                onClick={() => setOrderToCancel(order.id)}
                                disabled={cancellingOrderId !== null || retryingOrderId !== null}
                                className="h-7 px-2.5 rounded-full border border-red-200 text-red-600 bg-red-50 text-[10px] font-bold active:scale-95 transition-transform"
                              >
                                {isArabic ? "إلغاء" : "Cancel"}
                              </button>

                              {onRetryPayment && (
                                <button
                                  type="button"
                                  onClick={() => onRetryPayment(order.id)}
                                  disabled={retryingOrderId !== null}
                                  className="h-7 px-3 rounded-full bg-accent text-white text-[10px] font-bold shadow-2xs flex items-center gap-1 active:scale-95 transition-transform"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>{isArabic ? "ادفع الآن" : "Pay Now"}</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* Tracking button */}
                          {order.status === "SHIPPED" && trackingUrl && (
                            <a
                              href={trackingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-7 px-3 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-2xs flex items-center gap-1 active:scale-95 transition-transform"
                            >
                              <Truck className="w-3 h-3" />
                              <span>{isArabic ? "تتبع الشحنة" : "Track"}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}

                          {/* Help / Dispute button */}
                          {order.status !== "PENDING" && order.status !== "CANCELLED" && onOpenRefundModal && (
                            <button
                              type="button"
                              onClick={() => onOpenRefundModal(order)}
                              className="h-7 px-2.5 rounded-full bg-cream text-primary/70 text-[10px] font-bold border border-primary/10 flex items-center gap-1 active:scale-95 transition-transform"
                            >
                              <HelpCircle className="w-3 h-3" />
                              <span>{isArabic ? "مساعدة" : "Help"}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: ACCOUNT & SETTINGS ================= */}
        {activeTab === "account" && (
          <div className="space-y-3">
            {/* Group 1: Account Controls */}
            <div className="bg-white rounded-2xl border border-primary/10 shadow-2xs overflow-hidden divide-y divide-primary/5">
              <Link
                href={`/${lang}/profile/settings`}
                onClick={() => triggerHaptic("light")}
                className="p-3.5 flex items-center justify-between active:bg-cream/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-primary">
                      {dict.profile?.settings || (isArabic ? "إعدادات الحساب وكلمة المرور" : "Account Settings")}
                    </h4>
                    <p className="text-[10px] text-charcoal/50">
                      {isArabic ? "تعديل البيانات الشخصية والأمان" : "Personal info & security"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-primary/40 rtl:rotate-180" />
              </Link>

              <Link
                href={`/${lang}/profile/messages`}
                onClick={() => triggerHaptic("light")}
                className="p-3.5 flex items-center justify-between active:bg-cream/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center text-accent">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-primary">
                      {isArabic ? "الرسائل والمحادثات" : "Messages & Inquiries"}
                    </h4>
                    <p className="text-[10px] text-charcoal/50">
                      {isArabic ? "محادثاتك المباشرة مع الحرفيين والمشترين" : "Direct dialogues with artisans & buyers"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-primary/40 rtl:rotate-180" />
              </Link>

              {user.role === "ARTISAN" && (
                <Link
                  href={`/${lang}/studio`}
                  onClick={() => triggerHaptic("light")}
                  className="p-3.5 flex items-center justify-between active:bg-cream/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center text-accent">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-accent">
                        {dict.profile?.studio || (isArabic ? "لوحة تحكم الورشة" : "Artisan Studio Manager")}
                      </h4>
                      <p className="text-[10px] text-charcoal/50">
                        {isArabic ? "إدارة المنتجات، المبيعات والطلبات" : "Manage inventory, orders & sales"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-accent/60 rtl:rotate-180" />
                </Link>
              )}
              {user.role !== "ARTISAN" && user.role !== "ADMIN" && (
                <Link
                  href={`/${lang}/become-artisan`}
                  onClick={() => triggerHaptic("light")}
                  className="p-3.5 flex items-center justify-between active:bg-cream/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center text-accent">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-primary">
                        {dict.common?.become_artisan || (isArabic ? "انضم كحرفي وافتح متجرك" : "Sell on Giftisan")}
                      </h4>
                      <p className="text-[10px] text-charcoal/50">
                        {isArabic ? "اعرض إبداعاتك اليدوية لآلاف الزوار" : "Open your studio & reach buyers"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-primary/40 rtl:rotate-180" />
                </Link>
              )}

              {user.role === "ADMIN" && (
                <Link
                  href={`/${lang}/admin`}
                  onClick={() => triggerHaptic("light")}
                  className="p-3.5 flex items-center justify-between active:bg-cream/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-primary">
                        {dict.profile?.admin || (isArabic ? "لوحة الإدارة والتحكم" : "Admin Control Suite")}
                      </h4>
                      <p className="text-[10px] text-charcoal/50">
                        {isArabic ? "الطلبات، الحرفيين، المنتجات والمالية" : "Orders, artisans, products & finance"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-primary/40 rtl:rotate-180" />
                </Link>
              )}
            </div>

            {/* Group 2: Support & Policies */}
            <div className="bg-white rounded-2xl border border-primary/10 shadow-2xs overflow-hidden divide-y divide-primary/5">
              <Link
                href={`/${lang}/contact`}
                onClick={() => triggerHaptic("light")}
                className="p-3.5 flex items-center justify-between active:bg-cream/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-primary">
                      {dict.common?.support || (isArabic ? "مركز المساعدة والدعم" : "Help & Support")}
                    </h4>
                    <p className="text-[10px] text-charcoal/50">
                      {isArabic ? "الأسئلة الشائعة وتواصل مع فريقنا" : "FAQs and customer care"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-primary/40 rtl:rotate-180" />
              </Link>

              <Link
                href={`/${lang}/privacy`}
                onClick={() => triggerHaptic("light")}
                className="p-3.5 flex items-center justify-between active:bg-cream/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-primary">
                      {isArabic ? "سياسة الخصوصية" : "Privacy Policy"}
                    </h4>
                    <p className="text-[10px] text-charcoal/50">
                      {isArabic ? "كيف نحمي بياناتك ومعلوماتك" : "How we protect your data"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-primary/40 rtl:rotate-180" />
              </Link>

              <Link
                href={`/${lang}/terms`}
                onClick={() => triggerHaptic("light")}
                className="p-3.5 flex items-center justify-between active:bg-cream/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-primary">
                      {isArabic ? "الشروط والأحكام" : "Terms & Conditions"}
                    </h4>
                    <p className="text-[10px] text-charcoal/50">
                      {isArabic ? "حقوقك وضمانات الاستخدام والشراء" : "Marketplace guidelines & rights"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-primary/40 rtl:rotate-180" />
              </Link>
            </div>

            {/* Group 3: Safe In-App Sign Out */}
            <div className="bg-white rounded-2xl border border-primary/10 shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("medium");
                  setShowSignOutConfirm(true);
                }}
                className="w-full p-3.5 flex items-center justify-between text-start text-red-600 active:bg-red-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">
                      {dict.profile?.sign_out || (isArabic ? "تسجيل الخروج" : "Sign Out")}
                    </h4>
                    <p className="text-[10px] text-charcoal/40">
                      {isArabic ? "الخروج بأمان من هذا الجهاز" : "Safely log out of your session"}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-red-300 rtl:rotate-180" />
              </button>
            </div>

            {/* App Version Info */}
            <div className="text-center pt-2">
              <p className="text-[10px] text-charcoal/30 font-medium">
                Giftisan Mobile • Version 1.0.0
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Modal for Order Cancellation */}
      {orderToCancel && (
        <ConfirmationModal
          isOpen={Boolean(orderToCancel)}
          onClose={() => setOrderToCancel(null)}
          onConfirm={async () => {
            if (onCancelOrder && orderToCancel) {
              await onCancelOrder(orderToCancel);
            }
            setOrderToCancel(null);
          }}
          title={isArabic ? "إلغاء الطلب" : "Cancel Order"}
          message={
            isArabic
              ? "هل أنت متأكد من رغبتك في إلغاء هذا الطلب المعلق؟"
              : "Are you sure you want to cancel this pending order?"
          }
          confirmText={isArabic ? "نعم، قم بالإلغاء" : "Yes, Cancel"}
          cancelText={isArabic ? "تراجع" : "Keep Order"}
          isDestructive={true}
        />
      )}

      {/* Confirmation Modal for Sign Out */}
      {showSignOutConfirm && (
        <ConfirmationModal
          isOpen={showSignOutConfirm}
          onClose={() => setShowSignOutConfirm(false)}
          onConfirm={() => {
            setShowSignOutConfirm(false);
            performSignOut(lang);
          }}
          title={isArabic ? "تسجيل الخروج" : "Sign Out"}
          message={
            isArabic
              ? "هل ترغب حقاً في تسجيل الخروج من حسابك؟"
              : "Are you sure you want to log out of your Giftisan account?"
          }
          confirmText={isArabic ? "تسجيل الخروج" : "Sign Out"}
          cancelText={isArabic ? "إلغاء" : "Stay"}
          isDestructive={true}
        />
      )}
    </div>
  );
}
