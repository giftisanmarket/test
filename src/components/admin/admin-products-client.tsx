"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { BespokeImage } from "@/components/bespoke-image";
import Link from "next/link";
import { 
  Search, 
  X, 
  ShoppingBag, 
  Star, 
  Tag, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowUpDown,
  ChevronDown,
  Check,
  Filter,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductModerationActions } from "@/components/admin/product-moderation-actions";
import { useFilterPersistence } from "@/lib/use-filter-persistence";
import dynamic from "next/dynamic";

const EditProductModal = dynamic(
  () => import("@/components/edit-product-modal").then((mod) => mod.EditProductModal),
  { ssr: false }
);

interface AdminProductsClientProps {
  initialProducts: any[];
  dict: any;
  lang: string;
}

export function AdminProductsClient({ initialProducts, dict, lang }: AdminProductsClientProps) {
  const isAr = lang === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [stockFilter, setStockFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("NEWEST");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [products, setProducts] = useState(initialProducts);
  const [selectedProductForReview, setSelectedProductForReview] = useState<any | null>(null);

  useEffect(() => {
    setProducts(initialProducts);
  }, [initialProducts]);

  const handleProductDeleted = (deletedId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== deletedId));
    setSelectedProductForReview((prev: any) => (prev?.id === deletedId ? null : prev));
  };

  const handleProductModerated = (
    productId: string,
    updates: { status?: string; rejectionReason?: string | null; isFeatured?: boolean }
  ) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...updates } : p))
    );
    setSelectedProductForReview((prev: any) =>
      prev && prev.id === productId ? { ...prev, ...updates } : prev
    );
  };

  // Persist admin products filtering state across navigations
  useFilterPersistence({
    key: "giftisan_filters_admin_products",
    values: {
      searchQuery,
      statusFilter,
      stockFilter,
      categoryFilter,
      sortBy,
    },
    setters: {
      searchQuery: setSearchQuery,
      statusFilter: setStatusFilter,
      stockFilter: setStockFilter,
      categoryFilter: setCategoryFilter,
      sortBy: setSortBy,
    },
    defaultValues: {
      searchQuery: "",
      statusFilter: "ALL",
      stockFilter: "ALL",
      categoryFilter: "ALL",
      sortBy: "NEWEST",
    },
    paramMapping: {
      searchQuery: "q",
      statusFilter: "status",
      stockFilter: "stock",
      categoryFilter: "category",
      sortBy: "sort",
    },
  });

  // Extract unique categories for filtering (alphabetical)
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  // Product counts by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  // Filtered categories within the dropdown search
  const filteredCategoryList = useMemo(() => {
    if (!categorySearchQuery.trim()) return categories;
    const q = categorySearchQuery.toLowerCase().trim();
    return categories.filter(c => c.toLowerCase().includes(q));
  }, [categories, categorySearchQuery]);

  // KPI Metrics
  const stats = useMemo(() => {
    const total = products.length;
    const pending = products.filter(p => p.status === "PENDING").length;
    const approved = products.filter(p => p.status === "APPROVED").length;
    const lowStock = products.filter(p => p.stock <= 5).length;
    return { total, pending, approved, lowStock };
  }, [products]);

  const sortOptions = [
    { key: "NEWEST", label: isAr ? "الأحدث إضافتاً" : "Newest Products" },
    { key: "OLDEST", label: isAr ? "الأقدم إضافتاً" : "Oldest Products" },
    { key: "PRICE_HIGH", label: isAr ? "السعر (الأعلى للأقل)" : "Price: High to Low" },
    { key: "PRICE_LOW", label: isAr ? "السعر (الأقل للأعلى)" : "Price: Low to High" },
    { key: "STOCK_LOW", label: isAr ? "المخزون (الأقل للمزيد)" : "Stock: Lowest First" },
    { key: "FEATURED", label: isAr ? "المميزة أولاً" : "Featured First" },
  ];

  const activeSortOption = sortOptions.find(o => o.key === sortBy) || sortOptions[0];

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = product.name?.toLowerCase().includes(query);
        const matchesArtisan = product.artisan?.user?.name?.toLowerCase().includes(query) || product.artisan?.studioName?.toLowerCase().includes(query);
        const matchesCategory = product.category?.toLowerCase().includes(query);
        if (!matchesName && !matchesArtisan && !matchesCategory) return false;
      }

      // 2. Status Filter
      if (statusFilter !== "ALL") {
        if (product.status !== statusFilter) return false;
      }

      // 3. Stock Level Filter
      if (stockFilter !== "ALL") {
        if (stockFilter === "OUT_OF_STOCK" && product.stock > 0) return false;
        if (stockFilter === "LOW_STOCK" && (product.stock === 0 || product.stock > 5)) return false;
        if (stockFilter === "IN_STOCK" && product.stock === 0) return false;
      }

      // 4. Category Filter
      if (categoryFilter !== "ALL") {
        if (product.category !== categoryFilter) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "NEWEST") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "OLDEST") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "PRICE_HIGH") return b.price - a.price;
      if (sortBy === "PRICE_LOW") return a.price - b.price;
      if (sortBy === "STOCK_LOW") return a.stock - b.stock;
      if (sortBy === "FEATURED") return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      return 0;
    });
  }, [products, searchQuery, statusFilter, stockFilter, categoryFilter, sortBy]);

  return (
    <div className="space-y-8 md:space-y-12" dir={isAr ? "rtl" : "ltr"}>
      {selectedProductForReview && (
        <EditProductModal
          key={selectedProductForReview.id}
          product={selectedProductForReview}
          isOpen={Boolean(selectedProductForReview)}
          onClose={() => setSelectedProductForReview(null)}
          readOnly={true}
          dict={dict}
          lang={lang}
          onProductModerated={handleProductModerated}
        />
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-primary/5 pb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-heading font-black text-primary tracking-tighter mb-2">
            {dict.admin?.global_products_title || "Global"} <span className="serif italic text-accent font-normal">{dict.admin?.products_accent || "Products"}</span>
          </h1>
          <p className="text-charcoal/40 text-sm font-medium leading-relaxed max-w-md">
            {dict.admin?.monitor_products_desc || "Moderate artisan products, set featured items, inspect stock levels, and enforce marketplace quality standards."}
          </p>
        </div>

        <div className="bg-white px-5 py-3 rounded-2xl border border-primary/5 shadow-sm shrink-0 w-full md:w-auto">
          <p className="text-[9px] md:text-[10px] font-black text-primary/40 uppercase tracking-widest mb-1">
            {dict.admin?.total_treasures || (isAr ? "إجمالي المنتجات" : "Total Products")}
          </p>
          <p className="text-xl md:text-2xl font-black text-primary leading-none">{stats.total}</p>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-5 rounded-2xl md:rounded-3xl border border-primary/5 shadow-lg shadow-primary/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-primary/40 mb-0.5">
              {isAr ? "إجمالي المنتجات" : "Total Listings"}
            </p>
            <p className="text-2xl font-black text-primary leading-none">{stats.total}</p>
          </div>
        </div>

        <div className={cn(
          "p-5 rounded-2xl md:rounded-3xl border shadow-lg flex items-center gap-4 transition-all",
          stats.pending > 0 
            ? "bg-amber-500/10 border-amber-500/30 text-amber-900 shadow-amber-500/5 animate-pulse" 
            : "bg-white border-primary/5 text-primary shadow-primary/5"
        )}>
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
            stats.pending > 0 ? "bg-amber-500 text-white" : "bg-primary/5 text-primary/40"
          )}>
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider opacity-60 mb-0.5">
              {isAr ? "بانتظار المراجعة" : "Pending Review"}
            </p>
            <p className="text-2xl font-black leading-none">{stats.pending}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl md:rounded-3xl border border-primary/5 shadow-lg shadow-primary/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-primary/40 mb-0.5">
              {isAr ? "معتمدة ونشطة" : "Approved & Active"}
            </p>
            <p className="text-2xl font-black text-green-600 leading-none">{stats.approved}</p>
          </div>
        </div>

        <div className={cn(
          "p-5 rounded-2xl md:rounded-3xl border shadow-lg flex items-center gap-4 transition-all",
          stats.lowStock > 0 
            ? "bg-red-50 border-red-200 text-red-900 shadow-red-500/5" 
            : "bg-white border-primary/5 text-primary shadow-primary/5"
        )}>
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
            stats.lowStock > 0 ? "bg-red-500 text-white" : "bg-primary/5 text-primary/40"
          )}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider opacity-60 mb-0.5">
              {isAr ? "مخزون منخفض / نفذ" : "Low / Out of Stock"}
            </p>
            <p className="text-2xl font-black leading-none">{stats.lowStock}</p>
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Category, Sorting & Filters */}
      <div className="bg-white p-4 sm:p-5 md:p-6 rounded-3xl border border-primary/5 shadow-xl shadow-primary/5 space-y-4">
        {/* Top Controls: Search + Category & Sort Selectors */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute start-4 top-1/2 -translate-y-1/2 text-primary/30" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? "ابحث باسم المنتج، اسم الحرفي، الاستوديو، أو القسم..." : "Search by product name, artisan, studio, or category..."}
              className="w-full h-11 sm:h-12 ps-11 pe-10 bg-cream/30 border border-primary/5 rounded-2xl text-xs font-bold text-primary placeholder:text-primary/30 focus:outline-none focus:border-accent focus:bg-white transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 p-1 text-primary/30 hover:text-primary transition-colors"
                title={isAr ? "مسح البحث" : "Clear search"}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Dropdown Selectors Group */}
          <div className="grid grid-cols-2 lg:flex items-center gap-2.5 shrink-0">
            {/* Category Dropdown Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryOpen(!isCategoryOpen);
                  setIsSortOpen(false);
                }}
                className={cn(
                  "w-full lg:w-auto h-11 sm:h-12 px-3 sm:px-4 rounded-2xl flex items-center justify-between gap-2 font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer select-none border",
                  categoryFilter !== "ALL"
                    ? "bg-primary text-white border-primary shadow-md"
                    : "bg-white border-primary/10 hover:border-accent text-primary"
                )}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Tag className={cn("w-3.5 h-3.5 shrink-0", categoryFilter !== "ALL" ? "text-accent-light" : "text-accent")} />
                  <span className="truncate max-w-[85px] sm:max-w-[130px]">
                    {categoryFilter === "ALL" 
                      ? (isAr ? "جميع الأقسام" : "All Categories") 
                      : categoryFilter}
                  </span>
                  {categoryFilter === "ALL" ? (
                    <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-full text-[9px] bg-primary/5 text-primary/50 font-black">
                      {categories.length}
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-white/20 text-white font-black">
                      {categoryCounts[categoryFilter] || 0}
                    </span>
                  )}
                </div>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200 shrink-0 opacity-60", isCategoryOpen && "rotate-180")} />
              </button>

              {/* Category Dropdown Popover */}
              {isCategoryOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsCategoryOpen(false)} />
                  <div className="absolute top-full start-0 lg:end-auto mt-2 w-64 max-w-[calc(100vw-32px)] bg-white rounded-2xl border border-primary/10 shadow-2xl z-40 overflow-hidden p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Search inside categories (if multiple categories) */}
                    {categories.length > 5 && (
                      <div className="relative mb-2 pb-2 border-b border-primary/5">
                        <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-primary/30" />
                        <input
                          type="text"
                          value={categorySearchQuery}
                          onChange={(e) => setCategorySearchQuery(e.target.value)}
                          placeholder={isAr ? "بحث في الأقسام..." : "Search categories..."}
                          className="w-full h-8 ps-8 pe-6 bg-cream/40 rounded-xl text-[11px] font-bold text-primary placeholder:text-primary/30 focus:outline-none focus:bg-white border border-primary/5"
                          autoFocus
                        />
                        {categorySearchQuery && (
                          <button
                            onClick={() => setCategorySearchQuery("")}
                            className="absolute end-2 top-1/2 -translate-y-1/2 text-primary/30 hover:text-primary"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}

                    <div className="max-h-60 overflow-y-auto no-scrollbar space-y-1">
                      {/* All Categories Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryFilter("ALL");
                          setIsCategoryOpen(false);
                          setCategorySearchQuery("");
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-start cursor-pointer",
                          categoryFilter === "ALL"
                            ? "bg-primary text-white shadow font-black"
                            : "text-charcoal/70 hover:bg-primary/5 hover:text-primary"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span>{isAr ? "جميع الأقسام" : "All Categories"}</span>
                          <span className={cn(
                            "text-[10px] font-black px-1.5 py-0.5 rounded-full",
                            categoryFilter === "ALL" ? "bg-white/20 text-white" : "bg-primary/5 text-primary/50"
                          )}>
                            {products.length}
                          </span>
                        </div>
                        {categoryFilter === "ALL" && <Check className="w-3.5 h-3.5 text-accent-light shrink-0" />}
                      </button>

                      {/* Filtered Category Items */}
                      {filteredCategoryList.length === 0 ? (
                        <div className="p-3 text-center text-[11px] font-medium text-charcoal/40">
                          {isAr ? "لا توجد نتائج" : "No categories found"}
                        </div>
                      ) : (
                        filteredCategoryList.map((cat) => {
                          const isSelected = categoryFilter === cat;
                          const count = categoryCounts[cat] || 0;
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setCategoryFilter(cat);
                                setIsCategoryOpen(false);
                                setCategorySearchQuery("");
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-start cursor-pointer",
                                isSelected
                                  ? "bg-primary text-white shadow font-black"
                                  : "text-charcoal/70 hover:bg-primary/5 hover:text-primary"
                              )}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="truncate">{cat}</span>
                                <span className={cn(
                                  "text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0",
                                  isSelected ? "bg-white/20 text-white" : "bg-primary/5 text-primary/50"
                                  )}>
                                  {count}
                                </span>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-accent-light shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Custom Sort Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsSortOpen(!isSortOpen);
                  setIsCategoryOpen(false);
                }}
                className="w-full lg:w-auto h-11 sm:h-12 px-3 sm:px-4 bg-white border border-primary/10 hover:border-accent text-primary rounded-2xl flex items-center justify-between gap-2 font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer select-none"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <ArrowUpDown className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="truncate max-w-[85px] sm:max-w-[130px]">{activeSortOption.label}</span>
                </div>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200 shrink-0 opacity-60", isSortOpen && "rotate-180")} />
              </button>

              {isSortOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute top-full end-0 mt-2 w-56 max-w-[calc(100vw-32px)] bg-white rounded-2xl border border-primary/10 shadow-2xl z-40 overflow-hidden py-1.5 px-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                    {sortOptions.map((option) => {
                      const isSelected = sortBy === option.key;
                      return (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => {
                            setSortBy(option.key);
                            setIsSortOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-start",
                            isSelected
                              ? "bg-primary text-white shadow-md font-black"
                              : "text-charcoal/70 hover:bg-primary/5 hover:text-primary"
                          )}
                        >
                          <span>{option.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-accent-light shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filter Pills Bar: Status & Stock with responsive horizontal touch scroll */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-primary/5">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-primary/40 me-1 shrink-0">
              {isAr ? "الحالة:" : "Status:"}
            </span>
            {[
              { key: "ALL", label: isAr ? "الكل" : "All", count: stats.total },
              { key: "PENDING", label: isAr ? "المراجعة" : "Pending", count: stats.pending },
              { key: "APPROVED", label: isAr ? "معتمد" : "Approved", count: stats.approved },
              { key: "REJECTED", label: isAr ? "مرفوض" : "Rejected", count: products.filter(p => p.status === "REJECTED").length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={cn(
                  "px-3 h-8 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer",
                  statusFilter === tab.key
                    ? "bg-primary text-white border-primary shadow-md"
                    : "bg-white text-primary/50 border-primary/5 hover:border-primary/20"
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.2 rounded-full",
                    statusFilter === tab.key ? "bg-white/20 text-white" : "bg-primary/5 text-primary/40"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Stock Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-primary/40 me-1 shrink-0">
              {isAr ? "المخزون:" : "Stock:"}
            </span>
            {[
              { key: "ALL", label: isAr ? "الكل" : "All Stock" },
              { key: "IN_STOCK", label: isAr ? "متوفر" : "In Stock" },
              { key: "LOW_STOCK", label: isAr ? "منخفض (≤5)" : "Low Stock (≤5)", count: stats.lowStock },
              { key: "OUT_OF_STOCK", label: isAr ? "نفذ" : "Out of Stock" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStockFilter(tab.key)}
                className={cn(
                  "px-3 h-8 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer",
                  stockFilter === tab.key
                    ? "bg-accent text-white border-accent shadow-md"
                    : "bg-white text-primary/50 border-primary/5 hover:border-primary/20"
                )}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.2 rounded-full",
                    stockFilter === tab.key ? "bg-white/20 text-white" : "bg-red-50 text-red-600 font-bold"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Active Filters Badges (Displayed only when active) */}
        {(categoryFilter !== "ALL" || statusFilter !== "ALL" || stockFilter !== "ALL" || searchQuery.trim()) && (
          <div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-primary/5 text-xs animate-in fade-in duration-150">
            <span className="text-[10px] font-black uppercase tracking-wider text-primary/40 me-1 shrink-0">
              {isAr ? "التصفية النشطة:" : "Active:"}
            </span>

            {categoryFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent font-bold text-[11px]">
                <Tag className="w-3 h-3 shrink-0" />
                <span>{categoryFilter}</span>
                <button
                  onClick={() => setCategoryFilter("ALL")}
                  className="hover:bg-accent/20 rounded-full p-0.5 transition-colors cursor-pointer"
                  title={isAr ? "إزالة القسم" : "Remove category"}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {statusFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-[11px]">
                <span>
                  {statusFilter === "PENDING" ? (isAr ? "بانتظار المراجعة" : "Pending") :
                   statusFilter === "APPROVED" ? (isAr ? "معتمد" : "Approved") :
                   (isAr ? "مرفوض" : "Rejected")}
                </span>
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors cursor-pointer"
                  title={isAr ? "إزالة الحالة" : "Remove status"}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {stockFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 font-bold text-[11px]">
                <span>
                  {stockFilter === "IN_STOCK" ? (isAr ? "متوفر" : "In Stock") :
                   stockFilter === "LOW_STOCK" ? (isAr ? "منخفض (≤5)" : "Low Stock") :
                   (isAr ? "نفذ المخزون" : "Out of Stock")}
                </span>
                <button
                  onClick={() => setStockFilter("ALL")}
                  className="hover:bg-amber-500/20 rounded-full p-0.5 transition-colors cursor-pointer"
                  title={isAr ? "إزالة المخزون" : "Remove stock filter"}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-charcoal/5 border border-charcoal/10 text-charcoal font-bold text-[11px]">
                <Search className="w-3 h-3 text-charcoal/40 shrink-0" />
                <span className="max-w-[120px] truncate">"{searchQuery}"</span>
                <button
                  onClick={() => setSearchQuery("")}
                  className="hover:bg-charcoal/10 rounded-full p-0.5 transition-colors cursor-pointer"
                  title={isAr ? "إزالة البحث" : "Remove search"}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
                setStockFilter("ALL");
                setCategoryFilter("ALL");
              }}
              className="ms-auto text-[10px] font-black uppercase tracking-wider text-red-500 hover:text-red-700 transition-colors py-1 px-2 hover:bg-red-50 rounded-lg cursor-pointer"
            >
              {isAr ? "إعادة الضبط" : "Reset All"}
            </button>
          </div>
        )}
      </div>

      {/* Main Content: Adaptive Mobile Cards (<lg) & Desktop Table (>=lg) */}
      <div className="space-y-4">
        {/* Mobile View: High-Performance Product Cards */}
        <div className="block lg:hidden space-y-3.5">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center text-charcoal/40 font-medium border border-primary/5 shadow-sm">
              <Search className="w-10 h-10 mx-auto text-primary/20 mb-3" />
              <p className="text-sm font-bold text-primary mb-3">
                {isAr ? "لم يتم العثور على أي منتجات تطابق تصفيتك." : "No products matched your search or filters."}
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setStockFilter("ALL");
                  setCategoryFilter("ALL");
                }}
                className="px-4 py-2 bg-primary/5 hover:bg-primary/10 text-primary font-bold rounded-xl text-xs uppercase tracking-wider"
              >
                {isAr ? "إعادة ضبط التصفية" : "Reset Filters"}
              </button>
            </div>
          ) : (
            filteredProducts.map((p: any) => (
              <div 
                key={p.id} 
                className="bg-white rounded-2xl p-4 border border-primary/5 shadow-md shadow-primary/5 space-y-3.5"
              >
                {/* Header: Product Info & Image */}
                <div className="flex items-start gap-3.5">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedProductForReview(p)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSelectedProductForReview(p);
                    }}
                    className="relative w-16 h-16 rounded-xl overflow-hidden border border-primary/5 shadow-sm shrink-0 bg-cream cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <BespokeImage src={p.images[0]} alt={p.name} fill className="object-cover" />
                    {p.isFeatured && (
                      <div className="absolute top-1 start-1 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shadow">
                        <Star className="w-3 h-3 fill-white" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedProductForReview(p)}
                        className="font-bold text-primary hover:text-accent transition-colors text-sm line-clamp-1 text-start cursor-pointer"
                      >
                        {p.name}
                      </button>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border shrink-0",
                        p.status === "APPROVED" ? "bg-green-50 text-green-600 border-green-200" :
                        p.status === "REJECTED" ? "bg-red-50 text-red-600 border-red-200" :
                        "bg-amber-50 text-amber-600 border-amber-200"
                      )}>
                        {p.status === "APPROVED" ? (dict.admin?.approved || "Approved") : 
                         p.status === "REJECTED" ? (dict.admin?.rejected || "Rejected") : 
                         (dict.admin?.pending || "Pending")}
                      </span>
                    </div>

                    <p className="text-xs font-black text-accent mt-0.5">
                      {dict.product?.currency || "EGP"} {p.price}
                    </p>

                    <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-charcoal/60">
                      <div className="flex items-center gap-1.5">
                        <div className="relative w-4 h-4 rounded-full overflow-hidden border border-primary/10 shrink-0">
                          <Image src={p.artisan.avatar} alt="" fill className="object-cover" />
                        </div>
                        <span className="truncate max-w-[120px] font-medium">
                          {p.artisan.studioName || p.artisan.user?.name || "Artisan"}
                        </span>
                      </div>

                      <span>•</span>

                      <div className="flex items-center gap-1 font-bold">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          p.stock > 10 ? "bg-green-500" : p.stock > 0 ? "bg-yellow-500" : "bg-red-500"
                        )} />
                        <span className={p.stock === 0 ? "text-red-500" : ""}>
                          {p.stock} {dict.admin?.units || "units"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Moderation Actions Strip */}
                <div className="pt-2 border-t border-primary/5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-primary/40 uppercase tracking-wider truncate max-w-[130px]">
                    {p.category}
                  </span>

                  <ProductModerationActions 
                    productId={p.id} 
                    productName={p.name}
                    initialStatus={p.status} 
                    isFeatured={p.isFeatured}
                    slug={p.slug}
                    dict={dict}
                    onDeleted={handleProductDeleted}
                    rejectionReason={p.rejectionReason}
                    onReview={() => setSelectedProductForReview(p)}
                    onModerated={handleProductModerated}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Full Table (Screens >= lg) */}
        <div className="hidden lg:block bg-white rounded-[1.5rem] md:rounded-[3rem] border border-primary/5 shadow-2xl shadow-primary/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-start min-w-[1000px] lg:min-w-full">
              <thead>
                <tr className="bg-primary/5 border-b border-primary/5">
                  <th className="px-6 md:px-8 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-primary/40 uppercase tracking-widest text-start">
                    {dict.admin?.product || (isAr ? "المنتج والمنتج" : "Product")}
                  </th>
                  <th className="px-6 md:px-8 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-primary/40 uppercase tracking-widest text-start">
                    {dict.admin?.artisan || (isAr ? "الحرفي والاستوديو" : "Artisan")}
                  </th>
                  <th className="px-6 md:px-8 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-primary/40 uppercase tracking-widest text-start">
                    {dict.admin?.status || (isAr ? "الحالة" : "Status")}
                  </th>
                  <th className="px-6 md:px-8 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-primary/40 uppercase tracking-widest text-start">
                    {dict.admin?.category || (isAr ? "القسم" : "Category")}
                  </th>
                  <th className="px-6 md:px-8 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-primary/40 uppercase tracking-widest text-start">
                    {dict.admin?.inventory || (isAr ? "المخزون" : "Inventory")}
                  </th>
                  <th className="px-6 md:px-8 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-primary/40 uppercase tracking-widest text-end">
                    {dict.admin?.actions || (isAr ? "الإجراءات" : "Actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-charcoal/40 font-medium">
                      <div className="max-w-xs mx-auto space-y-3">
                        <Search className="w-10 h-10 mx-auto text-primary/20" />
                        <p className="text-sm font-bold text-primary">
                          {isAr ? "لم يتم العثور على أي منتجات تطابق تصفيتك." : "No products matched your active search and filter criteria."}
                        </p>
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setStatusFilter("ALL");
                            setStockFilter("ALL");
                            setCategoryFilter("ALL");
                          }}
                          className="px-4 py-2 bg-primary/5 hover:bg-primary/10 text-primary font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                        >
                          {isAr ? "إعادة ضبط التصفية" : "Reset Filters"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p: any) => (
                    <tr key={p.id} className="hover:bg-cream/30 transition-colors group">
                      <td className="px-6 md:px-8 py-4 md:py-6">
                        <div className="flex items-center gap-4">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedProductForReview(p)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") setSelectedProductForReview(p);
                            }}
                            className="relative w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden border border-primary/5 shadow-sm shrink-0 bg-cream cursor-pointer"
                          >
                            <BespokeImage src={p.images[0]} alt={p.name} fill className="object-cover" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedProductForReview(p)}
                                className="font-bold text-primary group-hover:text-accent transition-colors truncate max-w-[200px] xl:max-w-[320px] 2xl:max-w-[440px] text-sm md:text-base text-start cursor-pointer"
                              >
                                {p.name}
                              </button>
                              {p.isFeatured && <Star className="w-3 h-3 text-accent fill-accent shrink-0" />}
                            </div>
                            <p className="text-[10px] md:text-xs text-accent font-bold">
                              {dict.product?.currency || "EGP"} {p.price}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 md:px-8 py-4 md:py-6">
                        <div className="flex items-center gap-3">
                          <div className="relative w-7 h-7 md:w-8 md:h-8 rounded-full overflow-hidden border border-primary/5 shrink-0 bg-cream">
                            <Image src={p.artisan.avatar} alt={p.artisan.user?.name || "Artisan"} fill className="object-cover" />
                          </div>
                          <span className="text-xs md:text-sm font-bold text-primary truncate max-w-[140px] xl:max-w-[220px] 2xl:max-w-[280px] whitespace-nowrap">
                            {p.artisan.studioName || p.artisan.user?.name || "Artisan"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 md:px-8 py-4 md:py-6">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border",
                          p.status === "APPROVED" ? "bg-green-50 text-green-600 border-green-100" :
                          p.status === "REJECTED" ? "bg-red-50 text-red-600 border-red-100" :
                          "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          {p.status === "APPROVED" ? (dict.admin?.approved || "Approved") : 
                           p.status === "REJECTED" ? (dict.admin?.rejected || "Rejected") : 
                           (dict.admin?.pending || "Pending")}
                        </span>
                      </td>

                      <td className="px-6 md:px-8 py-4 md:py-6">
                        <div className="flex items-center gap-2">
                          <Tag className="w-3 h-3 text-primary/20" />
                          <span className="text-[10px] md:text-xs font-bold text-primary/60">{p.category}</span>
                        </div>
                      </td>

                      <td className="px-6 md:px-8 py-4 md:py-6">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            p.stock > 10 ? "bg-green-500" : p.stock > 0 ? "bg-yellow-500" : "bg-red-500"
                          )} />
                          <span className={cn(
                            "text-[10px] md:text-xs font-black uppercase tracking-widest",
                            p.stock > 0 ? "text-primary/60" : "text-red-500 font-bold"
                          )}>
                            {p.stock} {dict.admin?.units || "Units"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 md:px-8 py-4 md:py-6 text-end">
                        <ProductModerationActions 
                          productId={p.id} 
                          productName={p.name}
                          initialStatus={p.status} 
                          isFeatured={p.isFeatured}
                          slug={p.slug}
                          dict={dict}
                          onDeleted={handleProductDeleted}
                    rejectionReason={p.rejectionReason}
                    onReview={() => setSelectedProductForReview(p)}
                    onModerated={handleProductModerated}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
