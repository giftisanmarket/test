"use client";

import { BespokeImage } from "./bespoke-image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  BarChart3,
  Settings,
  Heart,
  ShoppingBag,
  Star,
  ArrowUpRight,
  MoreVertical,
  Edit2,
  Package,
  Clock,
  CheckCircle,
  CheckCircle2,
  Truck,
  Phone,
  Mail,
  X,
  Trash2,
  MousePointer2,
  Percent,
  Sparkles,
  Info,
  Globe,
  LayoutGrid,
  Share2,
  Lock,
  Coins,
  ShieldCheck,
  TrendingUp,
  Megaphone,
  Eye,
  MessageCircle,
  MessageSquare,
  CreditCard,
  Banknote,
  Wallet,
  User,
  Calendar,
  Printer,
  MapPin,
  Link2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo, useRef } from "react";
import { updateOrderItemStatus, deleteProduct, bulkDeleteProducts, bulkUpdateProductStatus, subscribeToNewsletter, updateOrderItemNotes } from "@/lib/actions";
import { toast } from "react-hot-toast";
import dynamic from "next/dynamic";
const EditProductModal = dynamic(() => import("@/components/edit-product-modal").then(mod => mod.EditProductModal), {
  ssr: false
});
const SalesChart = dynamic(() => import("@/components/sales-chart").then(mod => mod.SalesChart), {
  ssr: false
});
const ConfirmationModal = dynamic(() => import("@/components/ui/confirmation-modal").then(mod => mod.ConfirmationModal), { ssr: false });
import { OverviewTab } from "./studio/overview-tab";
const InventoryTab = dynamic(() => import("./studio/inventory-tab").then(mod => mod.InventoryTab), {
  loading: () => <div className="h-96 rounded-3xl bg-cream/30 animate-pulse border border-primary/5" />
});
const SalesTab = dynamic(() => import("./studio/sales-tab").then(mod => mod.SalesTab), {
  loading: () => <div className="h-96 rounded-3xl bg-cream/30 animate-pulse border border-primary/5" />
});
const GrowthTab = dynamic(() => import("./studio/growth-tab").then(mod => mod.GrowthTab), {
  loading: () => <div className="h-96 rounded-3xl bg-cream/30 animate-pulse border border-primary/5" />
});
const PaymentTab = dynamic(() => import("./studio/payment-tab").then(mod => mod.PaymentTab), {
  loading: () => <div className="h-96 rounded-3xl bg-cream/30 animate-pulse border border-primary/5" />
});
const ReviewsTab = dynamic(() => import("./studio/reviews-tab").then(mod => mod.ReviewsTab), {
  loading: () => <div className="h-96 rounded-3xl bg-cream/30 animate-pulse border border-primary/5" />
});
const SettingsTab = dynamic(() => import("./studio/settings-tab").then(mod => mod.SettingsTab), {
  loading: () => <div className="h-96 rounded-3xl bg-cream/30 animate-pulse border border-primary/5" />
});
import { useIsNative } from "@/lib/native";
import { useNotifications } from "./notification-provider";
import { getEffectiveArtisanCommissionRate } from "@/lib/commission";


interface StudioClientProps {
  artisan: any;
  sales: any[];
  reviews: any[];
  coupons: any[];
  isAdminPreview?: boolean;
  dict: any;
  lang: string;
}

export function StudioClient({ artisan, sales, reviews, coupons, isAdminPreview = false, dict, lang }: StudioClientProps) {
  const isNative = useIsNative();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openChat } = useNotifications();
  const [showMask, setShowMask] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "inventory" | "sales" | "reviews" | "growth" | "logistics" | "settings">("overview");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "bio-link") {
      setActiveTab("growth");
      setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } else if (tabParam && ["overview", "inventory", "sales", "reviews", "growth", "logistics", "settings"].includes(tabParam)) {
      setActiveTab(tabParam as any);
      setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [searchParams]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isSkipping, setIsSkipping] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [bulkProductsToDelete, setBulkProductsToDelete] = useState<string[] | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [shippingItem, setShippingItem] = useState<any | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");

  // Variant Analytics
  const topVariants = useMemo(() => {
    return (sales || []).reduce((acc: any[], sale: any) => {
      if (!sale.variantId) return acc;
      const existing = acc.find((v: any) => v.id === sale.variantId);
      if (existing) {
        existing.quantity += sale.quantity;
        existing.revenue += sale.quantity * sale.price;
      } else {
        acc.push({
          id: sale.variantId,
          name: sale.variant?.name || dict?.edit_product?.standard_variant || "Standard Variant",
          productName: sale.product?.name || "Product",
          quantity: sale.quantity,
          revenue: sale.quantity * sale.price,
          image: sale.variant?.image || sale.product?.images?.[0]
        });
      }
      return acc;
    }, []).sort((a: any, b: any) => b.quantity - a.quantity).slice(0, 5);
  }, [sales, dict?.edit_product]);

  const handleDelete = async () => {
    if (!productToDelete) return;

    setIsDeleting(productToDelete);
    const res = await deleteProduct(productToDelete);

    if (res.success) {
      toast.success(dict.studio.treasure_removed || "Product removed", {
        icon: <Trash2 className="w-5 h-5 text-red-500" />,
      });
      setProductToDelete(null);
      setIsDeleting(null);
      router.refresh();
    } else {
      toast.error(res.error || dict.studio.delete_failed || "Failed to delete item", {
        icon: <X className="w-5 h-5 text-red-500" />,
      });
      setIsDeleting(null);
      setProductToDelete(null);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isRTL = lang === 'ar';

    if (isRTL) {
      // In RTL, scrollLeft is usually negative or starts at 0 and goes negative
      const isAtEnd = Math.abs(target.scrollLeft) >= target.scrollWidth - target.clientWidth - 10;
      setShowMask(!isAtEnd);
    } else {
      const isAtEnd = target.scrollLeft >= target.scrollWidth - target.clientWidth - 10;
      setShowMask(!isAtEnd);
    }
  };
  const handleBulkDelete = (ids: string[]) => {
    setBulkProductsToDelete(ids);
  };

  const executeBulkDelete = async () => {
    if (!bulkProductsToDelete) return;

    const loadingToast = toast.loading("Removing products...", {
      style: { borderRadius: '20px', background: '#1a1a1a', color: '#fff' }
    });

    const ids = bulkProductsToDelete;
    setBulkProductsToDelete(null);

    const res = await bulkDeleteProducts(ids);

    toast.dismiss(loadingToast);

    if (res.success) {
      toast.success(`${ids.length} Products removed`, {
        icon: <Trash2 className="w-5 h-5 text-red-500" />,
      });
      router.refresh();
    } else {
      toast.error(res.error || "Failed to delete items");
    }
  };

  const handleBulkStatusUpdate = async (ids: string[], status: string) => {
    const loadingToast = toast.loading("Updating status...", {
      style: { borderRadius: '20px', background: '#1a1a1a', color: '#fff' }
    });

    const res = await bulkUpdateProductStatus(ids, status as any);

    toast.dismiss(loadingToast);

    if (res.success) {
      toast.success(`${ids.length} Products updated`, {
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      });
      router.refresh();
    } else {
      toast.error(res.error || "Failed to update items");
    }
  };

  const products = artisan.products || [];
  const totalFavorites = products.reduce((acc: number, p: any) => acc + (p._count?.favoritedBy || 0), 0);
  const totalReviews = products.reduce((acc: number, p: any) => acc + (p._count?.reviews || 0), 0);
  const totalRevenue = sales.reduce((acc, sale) => acc + (sale.price * sale.quantity), 0);
  const totalViews = products.reduce((acc: number, p: any) => acc + (p.views || 0), 0);
  const conversionRate = totalViews > 0
    ? Math.min(100, (sales.length / totalViews) * 100).toFixed(1)
    : "0.0";

  const activities = [
    ...products.map((p: any) => ({
      id: p.id,
      type: 'PRODUCT',
      status: p.status,
      name: p.name,
      reason: p.rejectionReason,
      date: new Date(p.updatedAt),
    })),
    ...sales.map((s: any) => ({
      id: s.id,
      type: 'SALE',
      name: s.product.name,
      customer: s.order.user?.name || s.order.clientEmail || "Guest",
      amount: s.price * s.quantity,
      date: new Date(s.order.createdAt),
    })),
    ...reviews.map((r: any) => ({
      id: r.id,
      type: 'REVIEW',
      name: r.product.name,
      rating: r.rating,
      date: new Date(r.createdAt),
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

  return (
    <>
      <div>
        <main className={cn("no-print max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 py-4 md:py-6", isNative && "pb-32")}>

          <AnimatePresence>
            {productToDelete && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setProductToDelete(null)}
                  className="absolute inset-0 bg-primary/40 backdrop-blur-md"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative bg-white rounded-[3rem] p-8 md:p-12 max-w-lg w-full shadow-2xl border border-primary/5 text-center space-y-8"
                >
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                    <Trash2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-3xl font-heading font-bold text-primary">{dict.studio.remove_treasure}</h3>
                    <p className="text-charcoal/40 text-sm leading-relaxed">
                      {dict.studio.remove_desc}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button
                      onClick={() => setProductToDelete(null)}
                      className="flex-1 py-4 border border-primary/10 text-primary font-bold rounded-2xl hover:bg-primary/5 transition-all"
                    >
                      {dict.studio.keep_it}
                    </button>
                    <button
                      disabled={isDeleting === productToDelete}
                      onClick={handleDelete}
                      className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all shadow-xl shadow-red-500/20 disabled:opacity-50"
                    >
                      {isDeleting === productToDelete ? dict.studio.removing : dict.studio.delete_permanently}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <ConfirmationModal
            isOpen={bulkProductsToDelete !== null}
            onClose={() => setBulkProductsToDelete(null)}
            onConfirm={executeBulkDelete}
            title={dict.studio.remove_treasure || "Remove Products"}
            message={dict.studio.remove_desc}
            confirmText={dict.studio.delete_permanently || "Delete"}
            cancelText={dict.studio.keep_it || "Keep"}
            isDestructive={true}
          />

          <div className="max-w-[1600px] mx-auto pt-4 md:pt-6 pb-16">
            {/* Verification Status Banner */}
            {artisan.status === "PENDING" && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-6 md:p-12 bg-amber-50 border-2 border-amber-200 rounded-[2rem] md:rounded-[2.5rem] flex flex-col lg:flex-row items-stretch gap-8 md:gap-10 shadow-xl shadow-amber-500/5"
              >
                <div className="flex-1 space-y-4 md:space-y-6">
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-amber-500 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                      <Clock className="w-6 h-6 md:w-8 md:h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-heading font-black text-amber-900 mb-1">{dict.studio.under_review_title}</h3>
                      <div className="px-3 py-1 bg-white rounded-full border border-amber-200 text-[10px] font-black uppercase tracking-widest text-amber-600 shadow-sm w-fit">
                        {dict.studio.pending_verification}
                      </div>
                    </div>
                  </div>

                  <p className="text-amber-800/70 leading-relaxed font-bold text-lg">
                    {dict.studio.under_review_desc}
                  </p>

                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 px-8 py-3 bg-amber-600 text-white text-xs font-black uppercase tracking-widest rounded-full hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20 active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {dict.common.support}
                  </Link>
                </div>

                {/* Checklist Section */}
                <div className="lg:w-96 bg-white/60 backdrop-blur-sm rounded-[2rem] p-8 border border-white shadow-inner flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-900/40">
                      {dict.studio.studio_setup_checklist}
                    </h4>
                    <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                  </div>

                  <div className="space-y-4">
                    {[
                      {
                        label: dict.studio.checklist_settings || "Fill required shop details in Settings",
                        done: !!artisan.studioName?.trim() && !!artisan.slug?.trim() && !!artisan.phoneNumber?.trim() && (!!artisan.location?.trim() || !!artisan.pickupCity?.trim()),
                        link: "#settings"
                      },
                      {
                        label: dict.studio.checklist_products.replace('{count}', artisan.products.length.toString()),
                        done: artisan.products.length >= 3,
                        link: "#inventory"
                      },
                      {
                        label: dict.studio.checklist_email,
                        done: !!artisan.user?.emailVerified,
                        link: "/profile/settings"
                      }
                    ].map((item, idx) => (
                      <Link
                        key={idx}
                        href={item.link}
                        onClick={(e) => {
                          if (item.link.startsWith("#")) {
                            e.preventDefault();
                            const targetTab = item.link.substring(1);
                            setActiveTab(targetTab as any);
                            setTimeout(() => {
                              contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }, 100);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl transition-all border",
                          item.done
                            ? "bg-green-50 border-green-100 text-green-700 opacity-60"
                            : "bg-white border-amber-100 text-amber-900 hover:border-amber-300"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center shrink-0 border",
                          item.done
                            ? "bg-green-500 border-green-600 text-white"
                            : "bg-white border-amber-300 text-transparent"
                        )}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold leading-tight">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {artisan.status === "REJECTED" && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 p-6 md:p-8 bg-red-50 border-2 border-red-200 rounded-[2rem] md:rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 md:gap-8 shadow-xl shadow-red-500/5"
              >
                <div className="w-12 h-12 md:w-16 md:h-16 bg-red-500 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-red-500/20">
                  <X className="w-6 h-6 md:w-8 md:h-8 text-white" />
                </div>
                <div className="flex-1 text-center md:text-start">
                  <h3 className="text-xl md:text-2xl font-heading font-black text-red-900 mb-1 md:mb-2">{dict.studio.action_required}</h3>
                  <p className="text-red-700/80 leading-relaxed font-medium text-sm md:text-base">
                    {dict.studio.rejected_desc}
                  </p>
                </div>
                <div className="px-5 py-1.5 md:px-6 md:py-2 bg-white rounded-full border border-red-200 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-red-600 shadow-sm">
                  {dict.studio.action_required}
                </div>
              </motion.div>
            )}



            {/* Compact Studio Header Banner */}
            <div className="relative bg-primary text-white rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 mb-6 shadow-xl shadow-primary/10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent/20 opacity-40 pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-5 md:gap-8">
                <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 text-center sm:text-start w-full md:w-auto">
                  <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[1.75rem] overflow-hidden border-2 border-white/20 shadow-xl shrink-0">
                    <BespokeImage type="artisan" id={artisan.id} src={artisan.avatar} alt={artisan.studioName || artisan.user.name} fill className="object-cover" />
                  </div>
                  <div className="space-y-1.5 md:space-y-2">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="text-accent-light font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
                        {dict.studio.master_studio}
                      </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-heading font-black leading-tight tracking-tight">
                      {artisan.studioName || (lang === "ar" ? `متجر ${artisan.user.name}` : `${artisan.user.name}'s Shop`)}
                    </h1>
                    {artisan.bio && (
                      <p className="text-white/70 text-xs md:text-sm max-w-xl italic font-medium leading-relaxed line-clamp-1">
                        "{artisan.bio}"
                      </p>
                    )}
                  </div>
                </div>

                {isAdminPreview && (
                  <div className="flex flex-wrap gap-3 w-full md:w-auto justify-center sm:justify-end items-center">
                    <div className="h-10 md:h-12 px-5 bg-white/10 backdrop-blur-xl text-white font-bold rounded-xl md:rounded-full border border-white/20 flex items-center gap-2.5 text-xs md:text-sm shadow-lg">
                      <ShieldCheck className="w-4 h-4 text-accent-light" />
                      {dict.studio.auditor_access}
                    </div>
                  </div>
                )}
              </div>
              <div className="absolute top-0 end-0 w-[300px] h-[300px] bg-accent/15 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            </div>

            <div className="relative mb-4">
              <div
                onScroll={handleScroll}
                className={cn(
                  "flex gap-2 md:gap-3 overflow-x-auto pt-3 pb-8 -mb-4 scrollbar-hide whitespace-nowrap relative z-20 transition-all duration-300",
                  showMask ? "mask-fade-right" : ""
                )}
              >
                {(
                  [
                    { id: "overview", label: dict.studio.overview, icon: BarChart3 },
                    { id: "inventory", label: dict.studio.inventory, icon: ShoppingBag },
                    { id: "sales", label: dict.studio.sales, icon: Package, badge: sales.filter((s: any) => s.status === "PENDING" || s.status === "PROCESSING").length },
                    { id: "growth", label: dict.studio.growth, icon: TrendingUp },
                    { id: "logistics", label: dict.studio.logistics, icon: CreditCard },
                    { id: "reviews", label: dict.studio.community, icon: Star },
                    { id: "settings", label: dict.studio.studio_settings, icon: Settings },
                  ] as { id: "overview" | "inventory" | "sales" | "reviews" | "growth" | "logistics" | "settings"; label: string; icon: any; badge?: number }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "px-4 md:px-6 h-10 md:h-11 rounded-full font-bold transition-all flex items-center gap-2 relative group shrink-0 text-xs md:text-sm",
                      activeTab === tab.id ? "text-white" : "text-primary/60 hover:text-primary bg-white/50 backdrop-blur-sm border border-primary/5"
                    )}
                  >

                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTabPill"
                        className="absolute inset-0 bg-primary rounded-full z-0 shadow-lg shadow-primary/30"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-white" : "text-accent")} />
                      {tab.label}
                      {tab.badge ? (
                        <span className={cn(
                          "ms-1 w-5 h-5 flex items-center justify-center rounded-full text-[10px]",
                          activeTab === tab.id ? "bg-white text-primary" : "bg-accent text-white shadow-lg shadow-accent/20"
                        )}>
                          {tab.badge}
                        </span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                ref={contentRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="scroll-mt-32 relative z-10"
              >
                {activeTab === "overview" && (
                  <OverviewTab
                    dict={dict}
                    lang={lang}
                    totalViews={totalViews}
                    totalFavorites={totalFavorites}
                    conversionRate={conversionRate}
                    totalRevenue={totalRevenue}
                    sales={sales}
                    activities={activities}
                    onNavigateToInventory={() => setActiveTab("inventory")}
                  />
                )}

                {activeTab === "inventory" && (
                  <InventoryTab
                    products={products}
                    dict={dict}
                    lang={lang}
                    isAdminPreview={isAdminPreview}
                    isShopApproved={artisan.status === "APPROVED"}
                    setSelectedProductForEdit={setSelectedProductForEdit}
                    setIsEditModalOpen={setIsEditModalOpen}
                    setProductToDelete={setProductToDelete}
                    isDeleting={isDeleting}
                    onBulkDelete={handleBulkDelete}
                    onBulkStatusUpdate={handleBulkStatusUpdate}
                  />
                )}

                {activeTab === "sales" && (
                  <SalesTab
                    sales={sales}
                    dict={dict}
                    lang={lang}
                    isAdminPreview={isAdminPreview}
                    isUpdating={isUpdating}
                    setIsUpdating={setIsUpdating}
                    updateOrderItemStatus={updateOrderItemStatus}
                    setShippingItem={setShippingItem}
                    setSelectedItem={setSelectedItem}
                    router={router}
                    commissionRate={getEffectiveArtisanCommissionRate(artisan)}
                  />
                )}

                {activeTab === "growth" && (
                  <GrowthTab
                    dict={dict}
                    coupons={coupons}
                    sales={sales}
                    lang={lang}
                    artisanId={artisan.id}
                    artisan={artisan}
                  />
                )}

                {activeTab === "logistics" && (
                  <PaymentTab
                    artisan={artisan}
                    lang={lang}
                    dict={dict}
                  />
                )}

                {activeTab === "reviews" && <ReviewsTab reviews={reviews} dict={dict} lang={lang} />}
                {activeTab === "settings" && <SettingsTab artisan={artisan} dict={dict} lang={lang} />}

              </motion.div>
            </AnimatePresence>
          </div>

          {selectedProductForEdit && (
            <div className="no-print">
              <EditProductModal
                product={selectedProductForEdit}
                isOpen={isEditModalOpen}
                onClose={() => {
                  setIsEditModalOpen(false);
                  setSelectedProductForEdit(null);
                }}
                readOnly={isAdminPreview}
                dict={dict}
              />
            </div>
          )}
        </main>

        {/* Order Details Modal */}
        <AnimatePresence>
          {selectedItem && (
            <>
              <div className="no-print fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedItem(null)}
                  className="absolute inset-0 bg-primary/25 backdrop-blur-md"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="relative w-full max-w-full sm:max-w-xl md:max-w-2xl bg-white rounded-2xl sm:rounded-[2.5rem] md:rounded-[3rem] shadow-2xl overflow-hidden no-print max-h-[92vh] flex flex-col"
                >
                  {/* Modal Header */}
                  <div className="p-4 sm:p-6 md:p-8 pb-3 sm:pb-4 border-b border-primary/5 flex items-center justify-between gap-3 shrink-0">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-1 max-w-full truncate">
                        {dict.studio.sale_receipt} #{selectedItem.orderId ? (selectedItem.orderId.length > 10 ? `${selectedItem.orderId.slice(0, 6)}...${selectedItem.orderId.slice(-4)}` : selectedItem.orderId) : ""}
                      </div>
                      <h2 className="text-lg sm:text-2xl md:text-3xl font-heading font-bold text-primary truncate">
                        {dict.studio.order_details_title} <span className="serif italic text-accent font-normal">{dict.studio.order_details_accent}</span>
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-primary/10 flex items-center justify-center text-primary/60 hover:text-primary hover:bg-primary/5 transition-all"
                        title={lang === "ar" ? "طباعة إشعار التجهيز" : "Print Packing Slip"}
                      >
                        <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedItem(null)}
                        className="w-9 h-9 sm:w-11 sm:h-11 rounded-full border border-primary/10 flex items-center justify-center text-primary/60 hover:text-primary hover:bg-primary/5 transition-all"
                      >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Modal Content */}
                  <div className="overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 flex-1">
                    <div className="grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                      {/* Item Information Card */}
                      <div className="p-3.5 sm:p-5 bg-cream/20 rounded-2xl border border-primary/5 space-y-3">
                        <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary/40">{dict.studio.item_info}</h3>
                        
                        <div className="flex gap-3 sm:gap-4 items-start">
                          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-white border border-primary/10 shadow-xs shrink-0">
                            <BespokeImage src={selectedItem.product.images[0]} alt="" fill className="object-cover" />
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-primary text-sm sm:text-base leading-snug line-clamp-2">{selectedItem.product.name}</p>
                            <p className="text-[11px] sm:text-xs text-charcoal/50 font-medium mt-0.5">
                              {dict.studio.qty_label}: {selectedItem.quantity} • {dict.product.currency} {selectedItem.price}
                            </p>
                            {selectedItem.variant && (
                              <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-white rounded-md border border-primary/5 text-[10px] font-bold text-accent">
                                <span>{dict.edit_product.variant_name}:</span>
                                <span>{selectedItem.variant.name}</span>
                              </div>
                            )}
                            <p className="text-base sm:text-lg font-heading font-black text-accent mt-1.5">
                              {dict.product.currency} {(selectedItem.price * selectedItem.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {selectedItem.status === "SHIPPED" && selectedItem.trackingNumber && (
                          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/60 text-blue-900">
                            <p className="text-[8px] font-black uppercase tracking-widest text-blue-500 mb-0.5">{dict.studio.shipment_tracking}</p>
                            <p className="text-xs font-bold flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{selectedItem.carrier}: {selectedItem.trackingNumber}</span>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Buyer Details Card */}
                      <div className="p-3.5 sm:p-5 bg-primary/5 rounded-2xl border border-primary/5 space-y-3">
                        <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary/40">{dict.studio.buyer_details}</h3>
                        
                        <div className="space-y-3">
                          <div>
                            <p className="font-bold text-primary text-sm sm:text-base">{lang === "ar" ? "عميل جيفتيزان" : "Giftisan Customer"}</p>
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/80 rounded-lg border border-primary/10 text-[10px] font-bold text-primary/60 mt-1">
                              <Lock className="w-3 h-3 text-accent shrink-0" />
                              <span>{lang === "ar" ? "بيانات العميل محمية الخصوصية" : "Customer Details Protected"}</span>
                            </div>
                            {selectedItem.order.userId && (
                              <div className="mt-2">
                                <button
                                  type="button"
                                  onClick={() => openChat(selectedItem.order.userId)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-accent/20 bg-accent/10 text-accent text-xs font-bold hover:bg-accent hover:text-white transition-all shadow-xs cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>{lang === "ar" ? "مراسلة العميل عبر المنصة" : "Message Customer on Platform"}</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="pt-2.5 border-t border-primary/10 space-y-2">
                            <div>
                              <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-primary/30 mb-1">{dict.studio.shipping_to}</p>
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 rounded-xl border border-primary/10 text-xs font-bold text-primary">
                                <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                                <span>{lang === "ar" ? `الوجهة: ${selectedItem.order.shippingCity || "القاهرة"}` : `Destination: ${selectedItem.order.shippingCity || "Cairo"}`}</span>
                              </div>
                            </div>
                            <p className="text-[10px] font-medium text-charcoal/40 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5 text-accent shrink-0" />
                              <span>{lang === "ar" ? "التوصيل عبر جيفتيزان (العنوان محمي)" : "Fulfilled by Giftisan Delivery (Address Protected)"}</span>
                            </p>
                          </div>

                          {/* Payment Method Badge */}
                          <div className="pt-2 border-t border-primary/10 space-y-1">
                            <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-primary/30">
                              {lang === "ar" ? "طريقة الدفع" : "Payment Method"}
                            </p>
                            {selectedItem.order.orderNotes?.includes("[COD") ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-lg border border-amber-200/60 text-xs font-bold text-amber-900">
                                <Banknote className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>{lang === "ar" ? "الدفع عند الاستلام (COD)" : "Cash on Delivery (COD)"}</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-200/60 text-xs font-bold text-emerald-900">
                                <CreditCard className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{lang === "ar" ? "بطاقة / محفظة (مدفوع)" : "Paid Online (Cards / Wallets)"}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Gift Message (if any) */}
                    {selectedItem.order.isGift && (
                      <div className="p-3.5 sm:p-5 bg-accent/5 rounded-2xl border border-accent/15">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-accent" />
                          <h3 className="text-[9px] font-black uppercase tracking-widest text-accent">{dict.checkout.mark_as_gift}</h3>
                        </div>
                        {selectedItem.order.giftMessage && (
                          <p className="text-xs sm:text-sm italic text-charcoal/70 leading-relaxed bg-white/60 p-2.5 rounded-xl border border-accent/10">
                            "{selectedItem.order.giftMessage}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Artisan Internal Notes (Private) */}
                    <div className="p-3.5 sm:p-5 bg-primary/5 rounded-2xl border border-primary/5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
                        <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary/40">{dict.studio.internal_notes}</h3>
                      </div>
                      <textarea
                        defaultValue={selectedItem.artisanNotes || ""}
                        onBlur={async (e) => {
                          const newNotes = e.target.value;
                          if (newNotes === (selectedItem.artisanNotes || "")) return;
                          const res = await updateOrderItemNotes(selectedItem.id, newNotes);
                          if (res.success) {
                            toast.success(dict.studio.notes_updated);
                            router.refresh();
                          } else {
                            toast.error(dict.studio.notes_update_failed);
                          }
                        }}
                        placeholder={dict.studio.internal_notes_placeholder}
                        className="w-full bg-white border border-primary/10 rounded-xl p-3 text-xs sm:text-sm font-medium focus:border-accent focus:ring-1 focus:ring-accent outline-none min-h-[70px] sm:min-h-[80px] resize-none transition-all placeholder:text-charcoal/30"
                      />
                    </div>
                  </div>

                  {/* Sticky Bottom Actions Bar */}
                  <div className="p-3.5 sm:p-5 bg-white border-t border-primary/10 flex items-center gap-2 sm:gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedItem(null)}
                      className="px-4 sm:px-6 h-10 sm:h-11 rounded-xl border border-primary/15 text-primary text-xs font-bold hover:bg-primary/5 transition-all"
                    >
                      {dict.product?.close || dict.common?.close || (lang === "ar" ? "إغلاق" : "Close")}
                    </button>

                    {selectedItem.status === "PENDING" && (
                      <button
                        type="button"
                        disabled={isUpdating === selectedItem.id}
                        onClick={async () => {
                          setIsUpdating(selectedItem.id);
                          await updateOrderItemStatus(selectedItem.id, "PROCESSING");
                          setSelectedItem(null);
                          router.refresh();
                          setIsUpdating(null);
                        }}
                        className="flex-1 h-10 sm:h-11 px-4 bg-accent text-white text-xs font-bold rounded-xl hover:bg-accent-light transition-all shadow-md shadow-accent/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isUpdating === selectedItem.id ? (
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                        ) : (
                          <Truck className="w-4 h-4 shrink-0" />
                        )}
                        <span>{lang === "ar" ? "تحديد كجاهز للشحن" : "Mark as Ready to Ship"}</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Printable Area (Hidden by default, sibling to no-print modal) */}
              <div className="hidden print:flex print:flex-col print-isolated bg-white font-sans overflow-hidden text-primary p-10 min-h-[24cm]">
                <div className="flex justify-between items-start mb-12 border-b-4 border-primary pb-8">
                  <div>
                    <h1 className="text-5xl font-heading font-black text-primary tracking-tighter mb-2">Giftisan</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
                      {lang === "ar" ? "صُنع بالأيدي، وُصل بالقلب" : "Crafted by Hands, Delivered with Heart"}
                    </p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-bold text-primary mb-1 uppercase tracking-tight">{dict.admin.packing_slip || "PACKING SLIP"}</h2>
                    <p className="font-mono text-sm font-bold text-charcoal/40 break-all">#{selectedItem.orderId}</p>
                    <p className="text-xs font-bold text-primary mt-2">{new Date(selectedItem.order.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-12">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-4 border-b border-primary/5 pb-2">{dict.admin?.artisan_studio || (lang === "ar" ? "متجر الحرفي" : "Artisan Shop")}</h3>
                    <div className="space-y-1">
                      <p className="text-lg font-black text-primary">{artisan.studioName || artisan.user.name}</p>
                      <p className="text-sm font-bold text-charcoal/60">{artisan.location}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-primary/40 mb-4 border-b border-primary/5 pb-2">{dict.admin.ship_to || "Ship To"}</h3>
                    <div className="space-y-1">
                      <p className="text-lg font-black text-primary">{lang === "ar" ? "عميل جيفتيزان" : "Giftisan Customer"}</p>
                      <p className="text-sm font-bold text-primary flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span>{lang === "ar" ? `الوجهة: ${selectedItem.order.shippingCity || "القاهرة"}` : `Destination: ${selectedItem.order.shippingCity || "Cairo"}`}</span>
                      </p>
                      <p className="text-xs font-medium text-charcoal/40 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary/40 shrink-0" />
                        <span>{lang === "ar" ? "تتم التغطية بواسطة خدمة توصيل جيفتيزان" : "Fulfilled & Shipped by Giftisan Delivery"}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-12">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-primary/10">
                        <th className="py-4 text-start text-[10px] font-black uppercase tracking-widest text-primary/40">Item Description</th>
                        <th className={cn("py-4 text-[10px] font-black uppercase tracking-widest text-primary/40", selectedItem.order.isGift ? "text-end" : "text-center")}>Qty</th>
                        {!selectedItem.order.isGift && (
                          <>
                            <th className="py-4 text-end text-[10px] font-black uppercase tracking-widest text-primary/40">Price</th>
                            <th className="py-4 text-end text-[10px] font-black uppercase tracking-widest text-primary/40">Total</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      <tr>
                        <td className="py-6 pe-8">
                          <p className="font-bold text-primary text-sm">{selectedItem.product.name}</p>
                          {selectedItem.variant && (
                            <p className="text-[10px] font-bold text-accent mt-0.5">Option: {selectedItem.variant.name}</p>
                          )}
                          {selectedItem.personalization && (
                            <div className="mt-2 p-3 bg-cream/30 rounded-xl border border-primary/5">
                              <p className="text-[8px] font-black uppercase tracking-widest text-accent mb-1">Personalization</p>
                              <p className="text-xs italic text-primary/70">"{selectedItem.personalization}"</p>
                            </div>
                          )}
                        </td>
                        <td className={cn("py-6 font-bold text-primary text-lg", selectedItem.order.isGift ? "text-end" : "text-center")}>{selectedItem.quantity}</td>
                        {!selectedItem.order.isGift && (
                          <>
                            <td className="py-6 text-end text-primary text-sm">{dict.product.currency} {selectedItem.price}</td>
                            <td className="py-6 text-end font-bold text-primary text-lg">{dict.product.currency} {(selectedItem.price * selectedItem.quantity).toFixed(2)}</td>
                          </>
                        )}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {selectedItem.order.isGift && (
                  <div className="mb-12">
                    <div className="p-6 bg-accent/5 rounded-2xl border-2 border-dashed border-accent/20 relative overflow-hidden">
                      <Sparkles className="absolute top-4 right-4 w-8 h-8 text-accent/10" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent mb-2">Gift Message</p>
                      <p className="text-xl font-heading font-bold text-primary italic leading-relaxed">
                        "{selectedItem.order.giftMessage || "No message provided."}"
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-auto text-center py-12 border-t border-primary/5">
                  <p className="font-heading font-bold text-primary text-xl mb-1">
                    {lang === "ar" ? "شكراً لدعمكم الحرفيين المستقلين!" : "Thank you for supporting independent artisans!"}
                  </p>
                  <p className="text-accent text-[10px] font-black uppercase tracking-widest">www.giftisan.com</p>
                </div>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

