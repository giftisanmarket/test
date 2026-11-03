"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  Plus, 
  Lock, 
  ShoppingBag, 
  Eye, 
  Edit2, 
  Trash2, 
  ArrowUpRight, 
  Sparkles, 
  Info, 
  Star, 
  Check, 
  CheckCircle2, 
  X, 
  Search,
  AlertTriangle,
  Package,
  Layers,
  RefreshCw,
  Minus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BespokeImage } from "@/components/bespoke-image";
import { updateProductStockAction } from "@/lib/actions";
import { toast } from "react-hot-toast";

interface InventoryTabProps {
  products: any[];
  dict: any;
  isAdminPreview: boolean;
  isShopApproved?: boolean;
  setSelectedProductForEdit: (product: any) => void;
  setIsEditModalOpen: (isOpen: boolean) => void;
  setProductToDelete: (productId: string) => void;
  isDeleting: string | null;
  onBulkDelete?: (ids: string[]) => void;
  onBulkStatusUpdate?: (ids: string[], status: string) => void;
  lang?: string;
}

export function InventoryTab({
  products,
  dict,
  isAdminPreview,
  isShopApproved = true,
  setSelectedProductForEdit,
  setIsEditModalOpen,
  setProductToDelete,
  isDeleting,
  onBulkDelete,
  onBulkStatusUpdate,
  lang = "en"
}: InventoryTabProps) {
  const isAr = lang === "ar";
  const [productList, setProductList] = useState<any[]>(products);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "APPROVED" | "OUT_OF_STOCK" | "PENDING" | "REJECTED">("ALL");
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);

  // Sync state whenever products prop updates (e.g. after moderation or refresh)
  useEffect(() => {
    setProductList(products);
  }, [products]);

  // Stock counters
  const totalCount = productList.length;
  const approvedCount = productList.filter(p => p.status === "APPROVED" && (p.stock || 0) > 0).length;
  const outOfStockCount = productList.filter(p => (p.stock || 0) <= 0).length;
  const pendingCount = productList.filter(p => p.status === "PENDING").length;
  const needsAttentionCount = productList.filter(p => p.status === "REJECTED").length;

  const filteredProducts = productList.filter(p => {
    // 1. Text Search
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Status Filter
    if (statusFilter === "APPROVED") return p.status === "APPROVED" && (p.stock || 0) > 0;
    if (statusFilter === "OUT_OF_STOCK") return (p.stock || 0) <= 0;
    if (statusFilter === "PENDING") return p.status === "PENDING";
    if (statusFilter === "REJECTED") return p.status === "REJECTED";

    return true;
  });

  const handleQuickStockChange = async (productId: string, delta: number, currentStock: number) => {
    if (isAdminPreview) return;
    const newStock = Math.max(0, currentStock + delta);
    if (newStock === currentStock) return;

    setUpdatingStockId(productId);
    
    // Optimistic Update
    setProductList(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p));

    try {
      const res = await updateProductStockAction(productId, newStock, isAr ? "ar" : "en");
      if (res.error) {
        // Rollback
        setProductList(prev => prev.map(p => p.id === productId ? { ...p, stock: currentStock } : p));
        toast.error(res.error);
      } else {
        toast.success(
          isAr 
            ? `تم تحديث المخزون: ${newStock} قطعة`
            : `Stock updated to ${newStock} ${newStock === 1 ? 'piece' : 'pieces'}`,
          {
            style: { borderRadius: "16px", background: "#1a1a1a", color: "#fff", fontSize: "13px" }
          }
        );
      }
    } catch (err: any) {
      setProductList(prev => prev.map(p => p.id === productId ? { ...p, stock: currentStock } : p));
      toast.error(err.message || "Failed to update stock");
    } finally {
      setUpdatingStockId(null);
    }
  };

  return (
    <div id="inventory" className="relative">
      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] lg:rounded-[3rem] p-5 md:p-8 lg:p-10 xl:p-12 border border-primary/5 shadow-2xl shadow-primary/5 mb-24">
        
        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-10 gap-6 md:gap-10">
          <div className="space-y-2 text-center md:text-start w-full md:w-auto">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-primary leading-tight">
              {dict.studio.studio_inventory} <span className="serif italic font-normal text-accent">{dict.studio.studio_inventory_accent}</span>
            </h2>
            <p className="text-sm md:text-base text-charcoal/40 font-medium">{dict.studio.manage_inventory_desc}</p>
          </div>
          
          {!isAdminPreview ? (
            <Link
              href={`/${lang}/studio/new-product`}
              className="w-full md:w-auto h-13 md:h-15 px-6 md:px-10 bg-accent text-white font-bold rounded-xl md:rounded-full hover:bg-accent-light transition-all flex items-center justify-center gap-3 shadow-xl shadow-accent/20 active:scale-95 duration-200 text-sm md:text-base"
            >
              <Plus className="w-5 h-5" /> {dict.studio.add_treasure}
            </Link>
          ) : (
            <div className="w-full md:w-auto h-13 md:h-15 px-6 md:px-8 bg-primary text-white font-bold rounded-xl md:rounded-full flex items-center justify-center gap-3 shadow-xl opacity-80 text-sm md:text-base">
              <Lock className="w-4 h-4 md:w-5 md:h-5" /> {dict.studio.management_locked}
            </div>
          )}
        </div>

        {/* Notice for unapproved shops */}
        {!isShopApproved && (
          <div className="mb-6 p-4 md:p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 text-xs md:text-sm font-bold shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              {isAr
                ? "تنبيه: متجرك قيد المراجعة حالياً. حتى لو تمت الموافقة على منتجاتك، فلن تظهر للعملاء في الموقع أو في نتائج البحث حتى تتم الموافقة على المتجر من قبل الإدارة."
                : "Notice: Your shop is currently under review. Even though products may be approved, they will not be visible to clients on the website or indexed by search engines until your shop is approved by admin."}
            </span>
          </div>
        )}

        {/* Filter Pills */}
        {/* Toolbar: Filter Pills & Search Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0 no-scrollbar min-w-0">
          {[
            { id: "ALL", label: isAr ? "جميع القطع" : "All Pieces", count: totalCount, color: "text-primary" },
            { id: "APPROVED", label: isAr ? "متاح بالمتجر" : "Available in Store", count: approvedCount, color: "text-green-600" },
            { id: "OUT_OF_STOCK", label: isAr ? "نفد المخزون" : "Out of Stock", count: outOfStockCount, color: "text-red-600", alert: outOfStockCount > 0 },
            { id: "PENDING", label: isAr ? "قيد المراجعة" : "Under Review", count: pendingCount, color: "text-sky-600", pendingAlert: isAdminPreview && pendingCount > 0 },
            ...(needsAttentionCount > 0 ? [{ id: "REJECTED", label: isAr ? "يتطلب تعديل" : "Needs Revision", count: needsAttentionCount, color: "text-red-500", alert: true }] : [])
          ].map((tab: any) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={cn(
                "px-4 py-2.5 rounded-xl md:rounded-2xl text-xs md:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 border active:scale-95 shrink-0",
                statusFilter === tab.id
                  ? "bg-primary text-white border-primary shadow-lg shadow-primary/10"
                  : tab.pendingAlert
                    ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                    : "bg-cream/40 text-charcoal/70 border-primary/5 hover:bg-cream hover:text-primary"
              )}
            >
              <span>{tab.label}</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black",
                statusFilter === tab.id
                  ? "bg-white/20 text-white"
                  : tab.pendingAlert
                    ? "bg-amber-500 text-white font-black"
                    : tab.alert
                      ? "bg-red-50 text-red-600 font-black"
                      : "bg-primary/5 text-primary/60"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        {productList.length > 0 && (
          <div className="relative group w-full xl:w-80 2xl:w-96 shrink-0">
            <div className="absolute inset-y-0 start-0 ps-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-primary/20 group-focus-within:text-accent transition-colors" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={dict.studio.search_treasures}
              className="w-full h-12 md:h-13 ps-12 pe-10 bg-cream/30 border border-primary/5 rounded-2xl focus:outline-none focus:border-accent focus:bg-white transition-all text-sm font-bold text-primary placeholder:text-primary/30 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 end-0 pe-4 flex items-center text-primary/20 hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Products Grid */}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-5 lg:gap-6">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-20 md:py-28 text-center space-y-6 bg-cream/20 rounded-[2rem] md:rounded-[3rem] border-2 border-dashed border-primary/5">
              <div className="w-20 h-20 md:w-28 md:h-28 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-xl shadow-primary/5">
                <Package className="w-8 h-8 md:w-12 md:h-12 text-primary/20" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl md:text-3xl font-heading font-bold text-primary">
                  {searchQuery ? dict.studio.no_search_results : (isAr ? "لا توجد منتجات في هذا التصنيف" : "No items found in this filter")}
                </h3>
                <p className="text-charcoal/40 max-w-xs md:max-w-md mx-auto text-xs md:text-sm">
                  {searchQuery ? dict.studio.no_search_results_desc : (isAr ? "جرّب اختيار تصنيف آخر أو إضافة قطعة جديدة." : "Try picking a different tab or adding a new handcrafted item.")}
                </p>
              </div>
            </div>
          ) : (
            filteredProducts.map((p: any) => {
              const currentStock = p.stock || 0;
              const isOutOfStock = currentStock <= 0;
              const isUpdatingThis = updatingStockId === p.id;

              return (
                <div 
                  key={p.id}
                  className={cn(
                    "group relative bg-white rounded-[2rem] md:rounded-[2.5rem] border border-primary/5 hover:shadow-2xl hover:shadow-primary/10 transition-all text-charcoal flex flex-col h-full overflow-hidden",
                    p.status === "APPROVED" ? "border-l-[4px] border-l-green-500" :
                    p.status === "REJECTED" ? "border-l-[4px] border-l-red-400"  :
                    p.status === "DRAFT"    ? "border-l-[4px] border-l-slate-300" :
                                             "border-l-[4px] border-l-amber-400"
                  )}
                >
                  {/* Image Cover & Status Tag */}
                  <div className="relative aspect-square overflow-hidden shrink-0">
                    <BespokeImage 
                      type="product" 
                      id={p.id} 
                      src={p.images?.[0] || "/placeholder.jpg"} 
                      alt={p.name} 
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-700" 
                    />

                    {/* Status Badge */}
                    <div className="absolute top-4 start-4 z-10 flex flex-col gap-2">
                      <span className={cn(
                        "px-3 py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-xl border w-fit",
                        p.status === "APPROVED" ? "bg-green-500/90 text-white border-white/20" :
                        p.status === "REJECTED" ? "bg-red-500/90 text-white border-white/20" :
                                                  "bg-amber-500/90 text-white border-white/20"
                      )}>
                        {p.status === "APPROVED" ? dict.admin.treasure_approved :
                          p.status === "REJECTED" ? dict.admin.treasure_rejected :
                          p.status === "DRAFT" ? dict.admin.treasure_draft :
                                                dict.admin.treasure_pending}
                      </span>

                      {p.isFeatured && (
                        <span className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-accent/90 text-white backdrop-blur-md shadow-lg border border-white/20 flex items-center gap-1 w-fit">
                          <Star className="w-2.5 h-2.5 fill-white" />
                          {isAr ? "مميز بالرئيسية" : "Featured"}
                        </span>
                      )}

                      {/* Only Show Badge if strictly Out of Stock (0 pieces) */}
                      {isOutOfStock && (
                        <span className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-red-600/90 text-white backdrop-blur-md shadow-lg border border-white/20 flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {isAr ? "نفد المخزون" : "Out of Stock"}
                        </span>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className={cn(
                      "absolute bottom-3 end-3 flex items-center gap-1.5 z-20 transition-all duration-300",
                      isAdminPreview && p.status === "PENDING"
                        ? "opacity-100 translate-y-0"
                        : "xl:opacity-0 xl:translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"
                    )}>
                      {!isAdminPreview ? (
                        <Link
                          href={`/${lang}/studio/products/${p.id}/edit`}
                          title={isAr ? "تعديل المنتج" : "Edit Product"}
                          className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/95 backdrop-blur-md text-primary flex items-center justify-center shadow-lg hover:bg-accent hover:text-white transition-all active:scale-90 border border-primary/10 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProductForEdit(p);
                            setIsEditModalOpen(true);
                          }}
                          title={isAr ? "مراجعة المنتج واتخاذ قرار" : "Review & Moderate Product"}
                          className={cn(
                            "h-8 sm:h-9 md:h-10 px-3 sm:px-3.5 rounded-full backdrop-blur-md text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all active:scale-95 border cursor-pointer",
                            p.status === "PENDING"
                              ? "bg-amber-500 text-white border-white/30 hover:bg-amber-600"
                              : "bg-white/95 text-primary border-primary/10 hover:bg-accent hover:text-white"
                          )}
                        >
                          <Eye className="w-3.5 h-3.5 shrink-0" />
                          <span>{isAr ? "مراجعة" : "Review"}</span>
                        </button>
                      )}

                      {!isAdminPreview && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProductToDelete(p.id);
                          }}
                          disabled={isDeleting === p.id}
                          title={isAr ? "حذف المنتج" : "Delete Product"}
                          className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white/95 backdrop-blur-md text-red-500 flex items-center justify-center shadow-lg hover:bg-red-500 hover:text-white transition-all active:scale-90 disabled:opacity-50 border border-primary/10 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      )}
                      <Link
                        href={`/${lang}/products/${p.slug || p.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title={isAr ? "عرض في المتجر" : "View in Store"}
                        className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-white/95 backdrop-blur-md text-primary flex items-center justify-center shadow-lg hover:bg-primary hover:text-white transition-all active:scale-90 border border-primary/10 cursor-pointer"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Link>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 md:p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <h3 className="text-base md:text-xl font-heading font-bold text-primary truncate leading-tight group-hover:text-accent transition-colors">
                          {p.name}
                        </h3>
                      </div>

                      {/* Stock Quantity Controls */}
                      <div className="mt-3 p-3 bg-cream/40 rounded-2xl border border-primary/5 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-primary/40">
                            {isAr ? "المتوفر في ورشتك" : "In Stock"}
                          </p>
                          <p className={cn(
                            "text-sm font-bold",
                            isOutOfStock ? "text-red-500" : "text-primary"
                          )}>
                            {currentStock} {isAr ? "قطع" : (currentStock === 1 ? "unit" : "units")}
                          </p>
                        </div>

                        {!isAdminPreview && (
                          <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-primary/5">
                            <button
                              type="button"
                              onClick={() => handleQuickStockChange(p.id, -1, currentStock)}
                              disabled={currentStock <= 0 || isUpdatingThis}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-primary/70 hover:bg-primary/5 hover:text-primary active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-all"
                              title={isAr ? "إنقاص 1" : "Decrease 1"}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-black text-primary">
                              {isUpdatingThis ? <RefreshCw className="w-3 h-3 animate-spin mx-auto text-accent" /> : currentStock}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuickStockChange(p.id, 1, currentStock)}
                              disabled={isUpdatingThis}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-primary/70 hover:bg-primary/5 hover:text-primary active:scale-90 disabled:opacity-30 disabled:pointer-events-none transition-all"
                              title={isAr ? "زيادة 1" : "Increase 1"}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Rejection Note if applicable */}
                      {p.status === "REJECTED" && p.rejectionReason && (
                        <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
                          <div className="flex items-center gap-1.5 mb-1 text-red-500">
                            <Info className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest">{dict.edit_product.feedback_title}</span>
                          </div>
                          <p className="text-[11px] text-red-700 italic leading-relaxed">
                            "{p.rejectionReason}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Price & Rating Footer */}
                    <div className="mt-5 pt-4 border-t border-primary/5 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-black text-primary/20 uppercase tracking-[0.2em]">{dict.common.price}</p>
                        <p className="text-lg md:text-xl font-heading font-bold text-accent">{dict.product.currency} {p.price}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <p className="text-[9px] font-black text-primary/20 uppercase tracking-[0.2em]">{dict.studio.reviews}</p>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span>{p._count?.reviews || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
