"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Truck,
  User,
  Calendar,
  Sparkles,
  Mail,
  Search,
  Download,
  FileSpreadsheet,
  Check,
  CheckCircle2,
  X,
  Clock,
  Coins
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BespokeImage } from "@/components/bespoke-image";
import { useState, useMemo } from "react";

interface SalesTabProps {
  sales: any[];
  dict: any;
  isAdminPreview: boolean;
  isUpdating: string | null;
  setIsUpdating: (id: string | null) => void;
  updateOrderItemStatus: (id: string, status: string, trackingInfo?: any) => Promise<any>;
  setShippingItem: (item: any) => void;
  setSelectedItem: (item: any) => void;
  router: any;
  lang: string;
  commissionRate: number;
}

export function SalesTab({
  sales,
  dict,
  isAdminPreview,
  isUpdating,
  setIsUpdating,
  updateOrderItemStatus,
  setShippingItem,
  setSelectedItem,
  router,
  lang,
  commissionRate
}: SalesTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Use the lang prop directly — avoids brittle string-comparison heuristics
  const isArabic = lang === 'ar';

  const getBulkOrdersLabel = (count: number) => {
    if (isArabic) {
      if (count === 1) return "طلب واحد";
      if (count === 2) return "طلبان";
      if (count >= 3 && count <= 10) return `${count} طلبات`;
      return `${count} طلباً`;
    }
    return `${count} ${count === 1 ? "Order" : "Orders"}`;
  };

  const filteredSales = useMemo(() => {
    let result = sales;
    
    if (statusFilter !== "ALL") {
      result = result.filter(item => item.status === statusFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.order.user?.name?.toLowerCase().includes(query) ||
        item.order.user?.email?.toLowerCase().includes(query) ||
        item.order.clientEmail?.toLowerCase().includes(query) ||
        item.product.name.toLowerCase().includes(query) ||
        item.orderId.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [sales, statusFilter, searchQuery]);

  const exportToCSV = () => {
    if (sales.length === 0) return;

    // Best practice headers for artisan sales & workshop fulfillment
    const headers = [
      "Order Ref",
      "Date",
      "Product Name",
      "Variant",
      "Quantity",
      "Unit Price (EGP)",
      "Total Amount (EGP)",
      "Status",
      "Destination City",
      "Personalization / Custom Note",
      "Gift Message"
    ];

    const escapeCSV = (value: any) => {
      if (value === null || value === undefined) return '""';
      const str = String(value).replace(/"/g, '""');
      return `"${str}"`;
    };

    // Map sales to rows
    const rows = sales.map(item => {
      const totalAmount = (item.price || 0) * (item.quantity || 1);
      const orderRef = `#${(item.order?.id || item.orderId || "").slice(-6).toUpperCase()}`;
      const formattedDate = item.order?.createdAt 
        ? new Date(item.order.createdAt).toISOString().split('T')[0]
        : "";

      return [
        escapeCSV(orderRef),
        escapeCSV(formattedDate),
        escapeCSV(item.product?.name || "Handcrafted Piece"),
        escapeCSV(item.variant?.name || "Standard"),
        escapeCSV(item.quantity || 1),
        escapeCSV(Number(item.price || 0).toFixed(2)),
        escapeCSV(totalAmount.toFixed(2)),
        escapeCSV(item.status || "PENDING"),
        escapeCSV(item.order?.shippingCity || "Cairo"),
        escapeCSV(item.personalization || "None"),
        escapeCSV(item.order?.giftMessage || "None")
      ];
    });

    // UTF-8 BOM (\uFEFF) ensures Arabic and special characters render cleanly in Excel
    const csvContent = "\uFEFF" + [
      headers.map(h => `"${h}"`).join(","),
      ...rows.map(row => row.join(","))
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `giftisan_sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadImage = async (url: string) => {
    try {
      if (url.startsWith("data:")) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `client_custom_image_${Date.now()}.jpg`;
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

  return (
    <div className="bg-white rounded-[1.75rem] sm:rounded-[2.5rem] lg:rounded-[3rem] p-3.5 sm:p-6 md:p-8 lg:p-10 xl:p-12 border border-primary/5 shadow-xl sm:shadow-2xl shadow-primary/5 text-charcoal">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 lg:mb-10 gap-4 sm:gap-6 md:gap-8">
        <div className="space-y-1 sm:space-y-2 text-start w-full sm:w-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-heading font-bold text-primary leading-tight">
            {dict.studio.sales_fulfillment} <span className="serif italic font-normal text-accent">{dict.studio.sales_fulfillment_accent}</span>
          </h2>
          <p className="text-xs sm:text-sm text-charcoal/50 font-medium">{dict.studio.track_orders_desc}</p>
        </div>

        {sales.length > 0 && (
          <button
            onClick={exportToCSV}
            className="w-full sm:w-auto h-10 sm:h-12 md:h-14 px-4 sm:px-6 md:px-8 bg-primary text-white font-bold rounded-xl md:rounded-full hover:bg-primary-light transition-all flex items-center justify-center gap-2.5 shadow-md active:scale-95 duration-200 shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-accent-light shrink-0" />
            <div className="text-start">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white/40 leading-none mb-0.5 sm:mb-1">{dict.studio.export_sales}</p>
              <p className="text-xs sm:text-sm leading-none">{dict.studio.download_csv}</p>
            </div>
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-40 ms-auto sm:ms-2 shrink-0" />
          </button>
        )}
      </div>

      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        {sales.length > 0 && (
          <div className="flex flex-col xl:flex-row-reverse xl:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="relative group w-full xl:w-80 2xl:w-96 shrink-0">
              <div className="absolute inset-y-0 start-0 ps-4 sm:ps-5 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-primary/20 group-focus-within:text-accent transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={dict.studio.search_orders}
                className="w-full h-11 sm:h-12 ps-11 sm:ps-12 pe-11 sm:pe-12 bg-cream/30 border border-primary/5 rounded-xl sm:rounded-2xl focus:outline-none focus:border-accent focus:bg-white transition-all text-xs sm:text-sm font-bold text-primary placeholder:text-primary/30 shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 end-0 pe-4 sm:pe-5 flex items-center text-primary/20 hover:text-primary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Horizontally scrollable status pills on mobile, wrap on desktop */}
            <div className="flex overflow-x-auto no-scrollbar py-1 gap-1.5 sm:gap-2 -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap">
              {(["ALL", "PENDING", "PROCESSING", "SHIPPED", "DELIVERED"] as const).map((status) => {
                const count = status === "ALL" ? sales.length : sales.filter(s => s.status === status).length;
                const label =
                  status === "ALL" ? dict.studio.all_orders :
                  status === "PENDING" ? dict.studio.status_pending :
                  status === "PROCESSING" ? dict.studio.status_ready :
                  status === "SHIPPED" ? dict.studio.status_shipped :
                  dict.studio.status_delivered;
                const isActive = statusFilter === status;
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "px-3.5 sm:px-5 h-9 sm:h-10 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest transition-all border flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap",
                      isActive
                        ? "bg-primary text-white border-primary shadow-md sm:shadow-lg shadow-primary/20"
                        : "bg-white text-primary/40 border-primary/5 hover:border-primary/20"
                    )}
                  >
                    {label}
                    <span className={cn(
                      "text-[8px] sm:text-[9px] font-black rounded-full px-1.5 py-0.5 min-w-[16px] sm:min-w-[18px] text-center leading-none",
                      isActive ? "bg-white/20 text-white" : "bg-primary/8 text-primary/40"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {filteredSales.length === 0 ? (
          <div className="py-12 sm:py-20 md:py-32 text-center space-y-4 sm:space-y-6 md:space-y-8 bg-cream/20 rounded-2xl sm:rounded-[2rem] md:rounded-[3rem] border-2 border-dashed border-primary/5 p-6">
            <div className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-primary/5">
              <Search className="w-8 h-8 sm:w-10 sm:h-10 md:w-16 md:h-16 text-primary/10" />
            </div>
            <div className="space-y-1 sm:space-y-2">
              <h3 className="text-xl sm:text-2xl md:text-4xl font-heading font-bold text-primary">
                {searchQuery ? dict.studio.no_search_results : dict.studio.no_sales_title}
              </h3>
              <p className="text-charcoal/40 max-w-xs md:max-w-md mx-auto text-xs sm:text-sm md:text-base">
                {searchQuery ? dict.studio.no_search_results_desc : dict.studio.no_sales_desc}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
          {filteredSales.map((item: any) => {
            return (
              <div 
                key={item.id} 
                onClick={() => setSelectedItem(item)}
                className={cn(
                  "group relative bg-white rounded-2xl md:rounded-[2.5rem] border border-primary/5 shadow-sm sm:shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10 transition-all overflow-hidden cursor-pointer active:scale-[0.99]",
                  item.status === "PENDING"    ? "border-s-4 border-s-amber-400" :
                  item.status === "PROCESSING" ? "border-s-4 border-s-teal-500"  :
                  item.status === "SHIPPED"    ? "border-s-4 border-s-blue-400"  :
                                                 "border-s-4 border-s-green-500"
                )}
              >
                <div className="p-3.5 sm:p-6 md:p-7 lg:p-8 flex flex-col justify-between h-full gap-3.5 sm:gap-5">
                  {/* Mobile Top Header: Status Pill + Date/Gift indicator */}
                  <div className="flex md:hidden items-center justify-between gap-2 border-b border-primary/5 pb-2.5">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shadow-xs shrink-0",
                      item.status === "PENDING"    ? "bg-amber-500 text-white border-amber-400"  :
                      item.status === "PROCESSING" ? "bg-teal-500 text-white border-teal-400"   :
                      item.status === "SHIPPED"    ? "bg-blue-500 text-white border-blue-400"   :
                                                     "bg-green-500 text-white border-green-400"
                    )}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />
                      {item.status === "PENDING"    ? dict.studio.status_pending :
                       item.status === "PROCESSING" ? dict.studio.status_ready :
                       item.status === "SHIPPED"    ? dict.studio.status_shipped :
                       dict.studio.status_delivered}
                    </span>

                    <div className="flex items-center gap-2 text-charcoal/50 text-[11px] font-medium shrink-0">
                      {item.order.isGift && (
                        <span className="bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 shrink-0" />
                          <span>{dict.checkout.mark_as_gift}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 opacity-40 shrink-0" />
                        <span>
                          {new Date(item.order.createdAt).toLocaleDateString(
                            lang === 'ar' ? 'ar-EG' : 'en-GB',
                            { day: 'numeric', month: 'short' }
                          )}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Main Content Layout: Compact Row on all viewports */}
                  <div className="flex flex-row items-start gap-3 sm:gap-6 md:gap-8">
                    {/* Thumbnail */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-xl sm:rounded-2xl md:rounded-3xl overflow-hidden shrink-0 border border-primary/10 md:border-2 md:border-white shadow-xs md:shadow-lg bg-cream/20">
                      <BespokeImage type="product" id={item.product.id} src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
                    </div>

                    {/* Details Column */}
                    <div className="flex-1 min-w-0 space-y-2 sm:space-y-3 md:space-y-4 text-start">
                      <div className="flex flex-col gap-1.5 justify-start min-w-0">
                        {/* Desktop Status Badge (Eyebrow above title) */}
                        <div className="hidden md:flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-wider border shadow-xs shrink-0",
                            item.status === "PENDING"    ? "bg-amber-500  text-white border-amber-400"  :
                            item.status === "PROCESSING" ? "bg-teal-500   text-white border-teal-400"   :
                            item.status === "SHIPPED"    ? "bg-blue-500   text-white border-blue-400"   :
                                                           "bg-green-500  text-white border-green-400"
                          )}>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />
                            {item.status === "PENDING"    ? dict.studio.status_pending :
                             item.status === "PROCESSING" ? dict.studio.status_ready :
                             item.status === "SHIPPED"    ? dict.studio.status_shipped :
                             dict.studio.status_delivered}
                          </span>
                        </div>

                        <h4 className="text-sm sm:text-base md:text-lg lg:text-xl font-heading font-bold text-primary line-clamp-2 leading-snug break-words" dir="auto">
                          {item.product.name}
                        </h4>
                      </div>

                      {/* Buyer Details & Metadata */}
                      <div className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-3 gap-y-1 text-xs text-charcoal/60">
                        <p className="flex items-center gap-1 font-semibold text-primary/80">
                          <User className="w-3 h-3 opacity-40 shrink-0" />
                          <span>{lang === "ar" ? "عميل جيفتيزان" : "Giftisan Customer"}</span>
                        </p>
                        <span className="opacity-30">•</span>
                        <p className="font-medium text-charcoal/50">
                          {dict.admin?.qty || "Qty"}: {item.quantity}
                        </p>
                        {/* Desktop date */}
                        <span className="hidden md:inline opacity-30">•</span>
                        <p className="hidden md:flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 opacity-40 shrink-0" />
                          {new Date(item.order.createdAt).toLocaleDateString(
                            lang === 'ar' ? 'ar-EG' : 'en-GB',
                            { day: 'numeric', month: 'short', year: 'numeric' }
                          )}
                        </p>
                        {item.order.isGift && (
                          <div className="hidden md:flex bg-accent/10 border border-accent/20 px-3 py-1 rounded-full items-center gap-2">
                            <Sparkles className="w-3 h-3 text-accent shrink-0" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-accent">{dict.checkout.mark_as_gift}</span>
                          </div>
                        )}
                      </div>

                      {/* Variants & Customizations */}
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-start">
                        {item.variant && (
                          <div className="bg-white/90 border border-primary/5 px-2.5 py-1 rounded-lg text-start shadow-xs inline-flex items-center gap-1.5">
                            <span className="text-[8px] font-black text-primary/40 uppercase tracking-wider">{dict.edit_product.variant_name}:</span>
                            <span className="text-xs font-bold text-accent">{item.variant.name}</span>
                          </div>
                        )}

                        {item.personalization && (
                          <div className="bg-accent/5 border border-accent/10 px-2.5 py-1 rounded-xl text-start shadow-xs max-w-full">
                            <span className="text-[8px] font-black text-accent/50 uppercase tracking-wider block mb-0.5">{dict.studio.bespoke_request}</span>
                            <p className="text-xs italic text-primary leading-tight line-clamp-2">"{item.personalization}"</p>
                          </div>
                        )}

                        {item.customImage && (
                          <div className="bg-accent/5 border border-accent/10 p-1.5 sm:p-2 rounded-xl flex items-center gap-2 shadow-xs max-w-full">
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingImage(item.customImage);
                              }}
                              className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden border border-primary/10 bg-white shrink-0 group/img hover:opacity-90 shadow-xs cursor-pointer"
                            >
                              <img src={item.customImage} alt="Client upload" className="w-full h-full object-cover" />
                            </button>
                            <div className="text-start min-w-0">
                              <p className="text-[8px] font-black text-accent/60 uppercase tracking-wider mb-0.5 truncate max-w-[120px] sm:max-w-none">
                                {dict.product.custom_image_attached || "Client Uploaded Image"}
                              </p>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setViewingImage(item.customImage);
                                }}
                                className="text-[9px] sm:text-[10px] font-bold text-accent hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                {dict.common.view_image || "View Image"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Mobile Inline Price & Net Earnings */}
                      <div className="flex md:hidden flex-wrap items-center gap-2 pt-0.5">
                        <span className="text-base font-heading font-black text-primary">
                          {dict.product.currency} {item.price * item.quantity}
                        </span>
                        <div className="inline-flex items-center gap-1.5 bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/5">
                          <Coins className="w-3 h-3 text-accent shrink-0" />
                          <span className="text-[10px] font-black text-primary/70 uppercase">
                            {dict.studio.your_net_label} <span className="text-accent font-bold ms-1">{dict.product.currency} {(item.price * item.quantity * (1 - commissionRate)).toFixed(2)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Right Column (Total & Net Earnings) */}
                    <div className="hidden md:flex flex-col items-end gap-2.5 shrink-0 pt-0 text-end">
                      <div>
                        <p className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] mb-0.5">{dict.common.total_amount}</p>
                        <p className="text-xl lg:text-2xl font-heading font-bold text-primary">{dict.product.currency} {item.price * item.quantity}</p>
                      </div>
                      
                      <div className="flex items-center justify-center gap-1.5 bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/5 max-w-full">
                        <Coins className="w-3.5 h-3.5 text-accent shrink-0" />
                        <p className="text-[11px] sm:text-xs font-black text-primary/70 uppercase tracking-wider whitespace-nowrap">
                          {dict.studio.your_net_label} <span className="text-accent font-bold ms-1">{dict.product.currency} {(item.price * item.quantity * (1 - commissionRate)).toFixed(2)}</span>
                        </p>
                      </div>

                      {item.order.discountApplied > 0 && (
                        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border border-emerald-100">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                          <span>{item.order.coupon?.code || "PROMO"}: -{dict.product.currency} {item.order.discountApplied}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="pt-2.5 sm:pt-4 md:pt-6 border-t border-primary/5 flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                      }}
                      className="flex-1 md:flex-initial h-9 sm:h-10 md:h-12 px-3.5 sm:px-5 md:px-7 bg-primary text-white text-[10px] sm:text-xs font-black uppercase tracking-wider md:tracking-widest rounded-xl md:rounded-2xl hover:bg-primary-light transition-all active:scale-95 flex items-center justify-center gap-1.5 md:gap-2 shadow-xs sm:shadow-lg shadow-primary/20 shrink-0"
                    >
                      {dict.studio.full_details}
                    </button>

                    {item.status === "PENDING" && (
                      <button
                        disabled={isUpdating === item.id}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setIsUpdating(item.id);
                          await updateOrderItemStatus(item.id, "PROCESSING");
                          router.refresh();
                          setIsUpdating(null);
                        }}
                        className="flex-1 md:flex-initial h-9 sm:h-10 md:h-12 px-3.5 sm:px-5 md:px-6 bg-accent text-white text-[10px] sm:text-xs font-black uppercase tracking-wider md:tracking-widest rounded-xl md:rounded-2xl hover:bg-accent-light transition-all shadow-xs sm:shadow-lg shadow-accent/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 md:gap-2 shrink-0"
                        title={lang === "ar" ? "تحديد كجاهز للشحن" : "Mark as Ready to Ship"}
                      >
                        {isUpdating === item.id ? (
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                        ) : (
                          <Truck className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                        )}
                        <span>
                          {lang === "ar" ? "جاهز للشحن" : "Mark Ready"}
                        </span>
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
              className="relative max-w-4xl w-full flex flex-col items-center gap-4 pointer-events-none"
            >
              <div 
                className="relative max-h-[75vh] flex items-center justify-center overflow-hidden rounded-2xl cursor-default pointer-events-auto group"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setViewingImage(null)}
                  className="absolute top-4 end-4 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 backdrop-blur-md text-white flex items-center justify-center transition-all shadow-lg active:scale-90 cursor-pointer"
                  title={dict.product?.close || dict.common?.close || (isArabic ? "إغلاق" : "Close")}
                >
                  <X className="w-5 h-5" />
                </button>
                <img
                  src={viewingImage}
                  alt="Client design preview"
                  className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
                />
              </div>

              <div 
                className="flex items-center gap-3 mt-2 pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => handleDownloadImage(viewingImage)}
                  className="px-6 py-3 bg-accent text-white font-bold text-xs uppercase tracking-widest rounded-full hover:bg-accent-light transition-all flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  {dict.product?.download_high_res || dict.common?.download || (isArabic ? "تنزيل الصورة" : "Download Image")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
