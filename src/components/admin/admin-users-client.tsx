"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Search, 
  X, 
  Store, 
  Calendar, 
  ShoppingBag, 
  Users,
  User, 
  UserCheck, 
  Clock, 
  ArrowUpDown,
  ChevronDown,
  Check,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { VerifyArtisanButton } from "@/components/admin/verify-artisan-button";
import { DeleteUserButton } from "@/components/admin/delete-user-button";
import { RoleManager } from "@/components/admin/role-manager";
import ExportArtisansButton from "@/components/admin/export-artisans-button";
import { CommissionManager } from "@/components/admin/commission-manager";

interface AdminUsersClientProps {
  initialUsers: any[];
  dict: any;
  lang: string;
}

export function AdminUsersClient({ initialUsers, dict, lang }: AdminUsersClientProps) {
  const isAr = lang === "ar";
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [studioStatusFilter, setStudioStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("NEWEST");
  const [isSortOpen, setIsSortOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const filterParam = params.get("filter") || params.get("status");
    if (filterParam && ["PENDING", "APPROVED", "REJECTED", "NO_STUDIO"].includes(filterParam.toUpperCase())) {
      setStudioStatusFilter(filterParam.toUpperCase());
    }
    const roleParam = params.get("role");
    if (roleParam && ["ALL", "ARTISAN", "CLIENT", "ADMIN"].includes(roleParam.toUpperCase())) {
      setRoleFilter(roleParam.toUpperCase());
    }
  }, []);

  const hasActiveFilters = roleFilter !== "ALL" || studioStatusFilter !== "ALL" || searchQuery.trim().length > 0;

  const resetAllFilters = () => {
    setSearchQuery("");
    setRoleFilter("ALL");
    setStudioStatusFilter("ALL");
  };

  const sortOptions = [
    { key: "NEWEST", label: isAr ? "الأحدث انضماماً" : "Newest Members" },
    { key: "OLDEST", label: isAr ? "الأقدم انضماماً" : "Oldest Members" },
    { key: "NAME_ASC", label: isAr ? "الاسم (أ - ي)" : "Name (A-Z)" },
    { key: "NAME_DESC", label: isAr ? "الاسم (ي - أ)" : "Name (Z-A)" },
    { key: "ORDERS_DESC", label: isAr ? "الأكثر طلباً" : "Most Orders" },
    { key: "COMMISSION_DESC", label: isAr ? "أعلى نسبة عمولة" : "Highest Commission" },
  ];

  const activeSortOption = sortOptions.find(o => o.key === sortBy) || sortOptions[0];

  // Summary Metrics
  const stats = useMemo(() => {
    const total = initialUsers.length;
    const artisans = initialUsers.filter(u => u.role === "ARTISAN" || u.artisanProfile).length;
    const clients = initialUsers.filter(u => u.role === "CLIENT" || u.role === "USER" || (!u.artisanProfile && u.role !== "ADMIN")).length;
    const admins = initialUsers.filter(u => u.role === "ADMIN").length;
    const pendingApprovals = initialUsers.filter(u => u.artisanProfile?.status === "PENDING").length;
    const approvedShops = initialUsers.filter(u => u.artisanProfile?.status === "APPROVED").length;
    const rejectedShops = initialUsers.filter(u => u.artisanProfile?.status === "REJECTED").length;
    return { total, artisans, clients, admins, pendingApprovals, approvedShops, rejectedShops };
  }, [initialUsers]);

  // Filtered and Sorted Users
  const filteredUsers = useMemo(() => {
    return initialUsers.filter((user) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = user.name?.toLowerCase().includes(query);
        const matchesEmail = user.email?.toLowerCase().includes(query);
        const matchesStudio = user.artisanProfile?.studioName?.toLowerCase().includes(query);
        const matchesPhone = user.artisanProfile?.phoneNumber?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesStudio && !matchesPhone) {
          return false;
        }
      }

      // 2. Role Filter
      if (roleFilter !== "ALL") {
        if (roleFilter === "ARTISAN" && user.role !== "ARTISAN" && !user.artisanProfile) return false;
        if (
          roleFilter === "CLIENT" &&
          user.role !== "CLIENT" &&
          user.role !== "USER" &&
          (Boolean(user.artisanProfile) || user.role === "ADMIN")
        ) {
          return false;
        }
        if (roleFilter === "ADMIN" && user.role !== "ADMIN") return false;
      }

      // 3. Studio Approval Status Filter
      if (studioStatusFilter !== "ALL") {
        if (studioStatusFilter === "NO_STUDIO" && user.artisanProfile) return false;
        if (studioStatusFilter !== "NO_STUDIO") {
          if (!user.artisanProfile || user.artisanProfile.status !== studioStatusFilter) return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "NEWEST") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === "OLDEST") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === "NAME_ASC") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sortBy === "NAME_DESC") {
        return (b.name || "").localeCompare(a.name || "");
      }
      if (sortBy === "ORDERS_DESC") {
        return (b.orders?.length || 0) - (a.orders?.length || 0);
      }
      if (sortBy === "COMMISSION_DESC") {
        return (b.artisanProfile?.commissionRate || 0) - (a.artisanProfile?.commissionRate || 0);
      }
      return 0;
    });
  }, [initialUsers, searchQuery, roleFilter, studioStatusFilter, sortBy]);

  return (
    <div className="space-y-6 sm:space-y-8 md:space-y-12" dir={isAr ? "rtl" : "ltr"}>
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 border-b border-primary/5 pb-6 sm:pb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-heading font-black text-primary tracking-tighter mb-2">
            {dict.admin?.artisans_title || "Artisans"} & <span className="serif italic text-accent font-normal">{dict.admin?.users_accent || "Users"}</span>
          </h1>
          <p className="text-charcoal/40 text-sm font-medium leading-relaxed max-w-md">
            {dict.admin?.manage_members_desc || "Manage permissions, approve artisan shops, set commission rates, and audit platform activity."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <ExportArtisansButton users={initialUsers} dict={dict} />
        </div>
      </div>

      {/* Summary KPI Cards (Tap to Quick-Filter) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <button
          type="button"
          onClick={resetAllFilters}
          className={cn(
            "bg-white p-4 sm:p-5 rounded-2xl md:rounded-3xl border shadow-lg shadow-primary/5 flex items-center gap-3 sm:gap-4 text-start transition-all cursor-pointer active:scale-[0.98]",
            roleFilter === "ALL" && studioStatusFilter === "ALL"
              ? "border-primary/25 ring-2 ring-primary/10"
              : "border-primary/5 hover:border-primary/20"
          )}
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider text-primary/40 mb-0.5 truncate">
              {dict.admin?.total_members || (isAr ? "إجمالي الأعضاء" : "Total Members")}
            </p>
            <p className="text-xl sm:text-2xl font-black text-primary leading-none">{stats.total}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setRoleFilter(roleFilter === "ARTISAN" ? "ALL" : "ARTISAN");
            setStudioStatusFilter("ALL");
          }}
          className={cn(
            "bg-white p-4 sm:p-5 rounded-2xl md:rounded-3xl border shadow-lg shadow-primary/5 flex items-center gap-3 sm:gap-4 text-start transition-all cursor-pointer active:scale-[0.98]",
            roleFilter === "ARTISAN" && studioStatusFilter === "ALL"
              ? "border-accent/40 ring-2 ring-accent/15"
              : "border-primary/5 hover:border-accent/30"
          )}
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
            <Store className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider text-primary/40 mb-0.5 truncate">
              {isAr ? "الحرفيين" : "Artisans"}
            </p>
            <p className="text-xl sm:text-2xl font-black text-accent leading-none">{stats.artisans}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setRoleFilter(roleFilter === "CLIENT" ? "ALL" : "CLIENT");
            setStudioStatusFilter("ALL");
          }}
          className={cn(
            "bg-white p-4 sm:p-5 rounded-2xl md:rounded-3xl border shadow-lg shadow-primary/5 flex items-center gap-3 sm:gap-4 text-start transition-all cursor-pointer active:scale-[0.98]",
            roleFilter === "CLIENT"
              ? "border-blue-500/40 ring-2 ring-blue-500/15"
              : "border-primary/5 hover:border-blue-500/25"
          )}
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <UserCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider text-primary/40 mb-0.5 truncate">
              {isAr ? "العملاء" : "Clients"}
            </p>
            <p className="text-xl sm:text-2xl font-black text-blue-600 leading-none">{stats.clients}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setRoleFilter("ALL");
            setStudioStatusFilter(studioStatusFilter === "PENDING" ? "ALL" : "PENDING");
          }}
          className={cn(
            "p-4 sm:p-5 rounded-2xl md:rounded-3xl border shadow-lg flex items-center gap-3 sm:gap-4 text-start transition-all cursor-pointer active:scale-[0.98]",
            studioStatusFilter === "PENDING"
              ? "bg-amber-500/15 border-amber-500 text-amber-900 ring-2 ring-amber-500/20 shadow-amber-500/10"
              : stats.pendingApprovals > 0 
                ? "bg-amber-500/10 border-amber-500/30 text-amber-900 shadow-amber-500/5" 
                : "bg-white border-primary/5 text-primary shadow-primary/5"
          )}
        >
          <div className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0",
            stats.pendingApprovals > 0 ? "bg-amber-500 text-white" : "bg-primary/5 text-primary/40"
          )}>
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider opacity-60 mb-0.5 leading-tight">
              {isAr ? "بانتظار الموافقة" : "Pending Approval"}
            </p>
            <p className="text-xl sm:text-2xl font-black leading-none">{stats.pendingApprovals}</p>
          </div>
        </button>
      </div>

      {/* Control Bar: Search & Filters & Sorting */}
      <div className="bg-white p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl border border-primary/5 shadow-xl shadow-primary/5 space-y-3.5 sm:space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute start-4 top-1/2 -translate-y-1/2 text-primary/30 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? "ابحث باسم المستخدم، البريد، المتجر، أو الهاتف..." : "Search by name, email, shop name, or phone..."}
              className="w-full h-11 sm:h-12 ps-11 pe-10 bg-cream/30 border border-primary/5 rounded-xl sm:rounded-2xl text-xs font-bold text-primary placeholder:text-primary/30 focus:outline-none focus:border-accent focus:bg-white transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute end-3 top-1/2 -translate-y-1/2 p-1 text-primary/30 hover:text-primary transition-colors cursor-pointer"
                aria-label={isAr ? "مسح البحث" : "Clear search"}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Dropdown & Quick Reset */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex-1 sm:flex-initial">
              <button
                type="button"
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="w-full sm:w-auto h-11 sm:h-12 px-4 sm:px-5 bg-white border border-primary/10 hover:border-accent text-primary rounded-xl sm:rounded-2xl flex items-center justify-between gap-3 font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer select-none"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ArrowUpDown className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="truncate">{activeSortOption.label}</span>
                </div>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200 text-primary/40 shrink-0", isSortOpen && "rotate-180")} />
              </button>

              {isSortOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-30" 
                    onClick={() => setIsSortOpen(false)}
                  />
                  <div className="absolute top-full start-0 sm:start-auto sm:end-0 mt-2 w-full sm:w-56 bg-white rounded-2xl border border-primary/10 shadow-2xl z-40 overflow-hidden py-1.5 px-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
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

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="h-11 sm:h-12 px-3.5 bg-primary/5 hover:bg-primary/10 text-primary rounded-xl sm:rounded-2xl flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer border border-primary/10 active:scale-95"
                title={isAr ? "إعادة ضبط التصفية" : "Reset Filters"}
              >
                <RotateCcw className="w-3.5 h-3.5 text-accent shrink-0" />
                <span>{isAr ? "إعادة ضبط" : "Reset"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Responsive Role & Shop Status Filters */}
        <div className="flex flex-col 2xl:flex-row 2xl:items-center 2xl:justify-between gap-3 sm:gap-3.5 pt-3 border-t border-primary/5">
          {/* Role Filter: 4-Col Segmented Control on Mobile (<sm), Pill Row on Tablet/Desktop (sm+) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="flex items-center justify-between sm:justify-start px-0.5 sm:px-0 shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary/45 sm:me-1 flex items-center gap-1.5">
                <Users className="w-3 h-3 text-primary/35 sm:hidden" />
                <span>{isAr ? "الرتبة" : "Role"}<span className="hidden sm:inline">:</span></span>
              </span>
              {roleFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setRoleFilter("ALL")}
                  className="sm:hidden text-[9px] font-black uppercase tracking-wider text-accent hover:underline cursor-pointer"
                >
                  {isAr ? "عرض الكل" : "All"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 sm:flex sm:items-center gap-1 sm:gap-1.5 p-1 sm:p-0 bg-cream/60 sm:bg-transparent rounded-xl sm:rounded-none border border-primary/5 sm:border-0 overflow-x-auto no-scrollbar">
              {[
                { key: "ALL", mobileLabel: isAr ? "الكل" : "All", desktopLabel: isAr ? "الكل" : "All Roles", count: stats.total },
                { key: "ARTISAN", mobileLabel: isAr ? "حرفيين" : "Artisans", desktopLabel: isAr ? "حرفيين" : "Artisans", count: stats.artisans },
                { key: "CLIENT", mobileLabel: isAr ? "عملاء" : "Clients", desktopLabel: isAr ? "عملاء" : "Clients", count: stats.clients },
                { key: "ADMIN", mobileLabel: isAr ? "مدراء" : "Admins", desktopLabel: isAr ? "مدراء" : "Admins", count: stats.admins },
              ].map((tab) => {
                const isActive = roleFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setRoleFilter(tab.key)}
                    className={cn(
                      "h-8 min-w-0 sm:min-w-fit px-1 min-[375px]:px-1.5 sm:px-3.5 rounded-lg sm:rounded-full text-[9.5px] min-[380px]:text-[10px] font-black uppercase tracking-tight sm:tracking-wider transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer select-none sm:border active:scale-[0.98]",
                      isActive
                        ? "bg-primary text-white shadow-sm sm:shadow-md sm:border-primary"
                        : "bg-transparent sm:bg-white text-primary/55 sm:text-primary/45 sm:border-primary/5 hover:text-primary sm:hover:border-primary/20"
                    )}
                  >
                    <span className="sm:hidden truncate">{tab.mobileLabel}</span>
                    <span className="hidden sm:inline">{tab.desktopLabel}</span>
                    <span className={cn(
                      "hidden sm:inline-flex items-center justify-center text-[9px] px-1.5 py-0.5 rounded-full leading-none",
                      isActive ? "bg-white/20 text-white" : "bg-primary/5 text-primary/40"
                    )}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shop Status Filter: 4-Col Segmented Control on Mobile (<sm), Pill Row on Tablet/Desktop (sm+) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="flex items-center justify-between sm:justify-start px-0.5 sm:px-0 shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-primary/45 sm:me-1 flex items-center gap-1.5">
                <Store className="w-3 h-3 text-accent/70 sm:hidden" />
                <span>
                  {dict.admin?.studio_status || (isAr ? "حالة المتجر" : "Shop Status")}
                  <span className="hidden sm:inline">:</span>
                </span>
              </span>
              {studioStatusFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setStudioStatusFilter("ALL")}
                  className="sm:hidden text-[9px] font-black uppercase tracking-wider text-accent hover:underline cursor-pointer"
                >
                  {isAr ? "عرض الكل" : "All"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 sm:flex sm:items-center gap-1 sm:gap-1.5 p-1 sm:p-0 bg-cream/60 sm:bg-transparent rounded-xl sm:rounded-none border border-primary/5 sm:border-0 overflow-x-auto no-scrollbar">
              {[
                { key: "ALL", mobileLabel: isAr ? "الكل" : "All", desktopLabel: isAr ? "الكل" : "All", count: undefined, highlightPending: false },
                { key: "PENDING", mobileLabel: isAr ? "معلق" : "Pending", desktopLabel: isAr ? "بانتظار الموافقة" : "Pending Approval", count: stats.pendingApprovals, highlightPending: stats.pendingApprovals > 0 },
                { key: "APPROVED", mobileLabel: isAr ? "معتمد" : "Approved", desktopLabel: isAr ? "معتمد" : "Approved", count: stats.approvedShops, highlightPending: false },
                { key: "REJECTED", mobileLabel: isAr ? "مرفوض" : "Rejected", desktopLabel: isAr ? "مرفوض" : "Rejected", count: stats.rejectedShops, highlightPending: false },
              ].map((tab) => {
                const isActive = studioStatusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStudioStatusFilter(tab.key)}
                    className={cn(
                      "h-8 min-w-0 sm:min-w-fit px-1 min-[375px]:px-1.5 sm:px-3.5 rounded-lg sm:rounded-full text-[9.5px] min-[380px]:text-[10px] font-black uppercase tracking-tight sm:tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 cursor-pointer select-none sm:border active:scale-[0.98]",
                      isActive
                        ? "bg-accent text-white shadow-sm sm:shadow-md sm:border-accent"
                        : tab.highlightPending
                          ? "bg-amber-500/12 sm:bg-amber-50 text-amber-800 sm:border-amber-500/25 hover:bg-amber-500/20"
                          : "bg-transparent sm:bg-white text-primary/55 sm:text-primary/45 sm:border-primary/5 hover:text-primary sm:hover:border-primary/20"
                    )}
                  >
                    <span className="sm:hidden truncate">{tab.mobileLabel}</span>
                    <span className="hidden sm:inline">{tab.desktopLabel}</span>
                    {tab.key === "PENDING" && stats.pendingApprovals > 0 && (
                      <>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full min-[375px]:hidden sm:hidden shrink-0",
                          isActive ? "bg-white" : "bg-amber-500"
                        )} />
                        <span className={cn(
                          "hidden min-[375px]:inline-flex sm:hidden items-center justify-center min-w-[15px] h-[15px] px-1 rounded-full text-[8.5px] font-black leading-none shrink-0",
                          isActive ? "bg-white/25 text-white" : "bg-amber-500 text-white"
                        )}>
                          {stats.pendingApprovals}
                        </span>
                      </>
                    )}
                    {tab.count !== undefined && (
                      <span className={cn(
                        "hidden sm:inline-flex items-center justify-center text-[9px] px-1.5 py-0.5 rounded-full leading-none",
                        isActive
                          ? "bg-white/20 text-white"
                          : tab.highlightPending
                            ? "bg-amber-500 text-white"
                            : "bg-primary/5 text-primary/40"
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile View: High-Performance User Cards (<lg) */}
      <div className="block lg:hidden space-y-3.5">
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center text-charcoal/40 font-medium border border-primary/5 shadow-sm">
            <Search className="w-10 h-10 mx-auto text-primary/20 mb-3" />
            <p className="text-sm font-bold text-primary mb-3">
              {isAr ? "لم يتم العثور على أي مستخدمين يطابقون تصفيتك." : "No users matched your search or filters."}
            </p>
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-4 py-2 bg-primary/5 hover:bg-primary/10 text-primary font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer"
            >
              {isAr ? "إعادة ضبط التصفية" : "Reset Filters"}
            </button>
          </div>
        ) : (
          filteredUsers.map((user: any) => (
            <div 
              key={user.id} 
              className="bg-white rounded-2xl p-4 sm:p-5 border border-primary/5 shadow-md shadow-primary/5 space-y-4"
            >
              {/* Header: Avatar, Name, Email, Role Selector */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-primary/5 shadow-sm bg-cream shrink-0">
                    <Image 
                      src={user.artisanProfile?.avatar || user.image || `https://api.dicebear.com/10.x/gaze/svg?seed=${user.name}`} 
                      alt={user.name} 
                      fill 
                      className="object-cover" 
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-primary text-sm line-clamp-1">{user.name}</p>
                    <p className="text-[11px] text-charcoal/40 truncate">{user.email}</p>
                    {user.artisanProfile?.phoneNumber && (
                      <a 
                        href={`tel:${user.artisanProfile.phoneNumber}`}
                        className="text-[11px] font-bold text-accent mt-0.5 inline-flex items-center gap-1 hover:underline"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        {user.artisanProfile.phoneNumber}
                      </a>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  <RoleManager userId={user.id} currentRole={user.role} dict={dict} />
                </div>
              </div>

              {/* Artisan Studio Section (If Artisan) */}
              {user.artisanProfile && (
                <div className="p-3.5 bg-cream/40 rounded-xl border border-primary/5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <Store className="w-3.5 h-3.5 text-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-primary text-xs truncate">
                          {user.artisanProfile.studioName || `${user.name}'s Shop`}
                        </p>
                        <p className="text-[10px] text-charcoal/40 truncate">
                          {user.artisanProfile.location || dict.admin?.global_studio || "Global Shop"}
                        </p>
                      </div>
                    </div>

                    <Link 
                      href={`/${lang}/studio?artisanUserId=${user.id}`}
                      className="h-7 px-2.5 bg-primary text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center hover:bg-primary-light transition-all active:scale-95 shrink-0"
                    >
                      {dict.admin?.preview_studio || "Preview"}
                    </Link>
                  </div>

                  {/* Commission Row */}
                  <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-primary/5">
                    <span className="text-[10px] font-black text-primary/40 uppercase">Commission:</span>
                    <CommissionManager 
                      artisanId={user.artisanProfile.id} 
                      currentRate={user.artisanProfile.commissionRate || 0} 
                      dict={dict} 
                    />
                  </div>

                  {/* Studio Approval & Verification Controls (Full width, responsive) */}
                  <div className="pt-2.5 border-t border-primary/5">
                    <VerifyArtisanButton 
                      artisanId={user.artisanProfile.id} 
                      currentStatus={user.artisanProfile.isVerified} 
                      status={user.artisanProfile.status}
                      dict={dict}
                    />
                  </div>
                </div>
              )}

              {/* Footer: Date, Orders, Delete Button */}
              <div className="pt-2 border-t border-primary/5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 text-charcoal/50 text-[11px] font-semibold">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 opacity-60" />
                    <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1 font-bold text-primary">
                    <ShoppingBag className="w-3 h-3 text-accent" />
                    <span>{user.orders?.length || 0} {isAr ? "طلب" : "orders"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-nowrap">
                  <Link
                    href={`/${lang}/profile?userId=${user.id}`}
                    className="h-8 px-2.5 sm:px-3 rounded-xl bg-primary/5 hover:bg-primary hover:text-white text-primary text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 border border-primary/10 shadow-2xs whitespace-nowrap shrink-0"
                    title={isAr ? "معاينة الملف الشخصي ومسار الطلبات" : "View Client Profile & Orders"}
                  >
                    <User className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span className="whitespace-nowrap">{isAr ? "معاينة العميل" : "Client View"}</span>
                  </Link>
                  <DeleteUserButton userId={user.id} userName={user.name} dict={dict} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Main Users Table (Desktop >= lg) */}
      <div className="hidden lg:block bg-white rounded-[1.5rem] md:rounded-[3rem] border border-primary/5 shadow-2xl shadow-primary/5 overflow-hidden">
        <div className="overflow-x-auto min-h-[280px]">
          <table className="w-full text-start min-w-[960px] lg:min-w-full">
            <thead>
              <tr className="bg-primary/5 border-b border-primary/5">
                <th className="px-5 md:px-7 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-primary/40 uppercase tracking-widest text-start min-w-[220px]">
                  {dict.admin?.user_profile || (isAr ? "المستخدم" : "User Profile")}
                </th>
                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-primary/40 uppercase tracking-widest text-start min-w-[120px]">
                  {dict.admin?.role || (isAr ? "الرتبة" : "Role")}
                </th>
                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-primary/40 uppercase tracking-widest text-start min-w-[220px]">
                  {dict.admin?.studio_status || (isAr ? "حالة الاستوديو" : "Studio Status")}
                </th>
                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-primary/40 uppercase tracking-widest text-start min-w-[100px]">
                  {isAr ? "العمولة" : "Commission"}
                </th>
                <th className="px-4 md:px-6 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-primary/40 uppercase tracking-widest text-start min-w-[120px]">
                  {dict.admin?.activity || (isAr ? "النشاط" : "Activity")}
                </th>
                <th className="px-5 md:px-7 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-primary/40 uppercase tracking-widest text-end min-w-[160px] whitespace-nowrap">
                  {dict.admin?.actions || (isAr ? "الإجراءات" : "Actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-charcoal/40 font-medium">
                    <div className="max-w-xs mx-auto space-y-3">
                      <Search className="w-10 h-10 mx-auto text-primary/20" />
                      <p className="text-sm font-bold text-primary">
                        {isAr ? "لم يتم العثور على أي مستخدمين يطابقون تصفيتك." : "No users matched your active search and filter criteria."}
                      </p>
                      <button
                        type="button"
                        onClick={resetAllFilters}
                        className="px-4 py-2 bg-primary/5 hover:bg-primary/10 text-primary font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                      >
                        {isAr ? "إعادة ضبط التصفية" : "Reset Filters"}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user: any) => (
                  <tr key={user.id} className="hover:bg-cream/30 transition-colors group">
                    <td className="px-6 md:px-8 py-4 md:py-6">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="relative w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-primary/5 shadow-sm bg-cream shrink-0">
                          <Image 
                            src={user.artisanProfile?.avatar || user.image || `https://api.dicebear.com/10.x/gaze/svg?seed=${user.name}`} 
                            alt={user.name} 
                            fill 
                            className="object-cover" 
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-primary text-sm md:text-base line-clamp-1">{user.name}</p>
                          <p className="text-[10px] md:text-xs text-charcoal/40 truncate max-w-[180px] xl:max-w-[260px] 2xl:max-w-[340px]">{user.email}</p>
                          {user.artisanProfile?.phoneNumber && (
                            <p className="text-[10px] md:text-xs font-bold text-accent mt-1 flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                              {user.artisanProfile.phoneNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 md:px-8 py-4 md:py-6">
                      <RoleManager userId={user.id} currentRole={user.role} dict={dict} />
                    </td>

                    <td className="px-6 md:px-8 py-4 md:py-6">
                      {user.artisanProfile ? (
                        <div className="flex items-center gap-3 md:gap-4 group/studio">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-accent/5 flex items-center justify-center shrink-0">
                            <Store className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                          </div>
                          <div className="flex flex-col gap-3 min-w-0">
                            <div className="space-y-1">
                              <p className="font-bold text-primary text-sm truncate">
                                {user.artisanProfile.studioName || `${user.name}'s Shop`}
                              </p>
                              <p className="text-[10px] text-charcoal/40 italic">
                                {user.artisanProfile.location || dict.admin?.global_studio || "Global Shop"}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2">
                               <Link 
                                 href={`/${lang}/studio?artisanUserId=${user.id}`}
                                 className="h-8 md:h-9 px-4 bg-primary text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary-light transition-all active:scale-95 shadow-sm"
                               >
                                 {dict.admin?.preview_studio || "Preview Shop"}
                               </Link>
                               <VerifyArtisanButton 
                                 artisanId={user.artisanProfile.id} 
                                 currentStatus={user.artisanProfile.isVerified} 
                                 status={user.artisanProfile.status}
                                 dict={dict}
                               />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[9px] md:text-[10px] font-bold text-primary/20 uppercase tracking-widest">
                          {dict.admin?.not_applicable || "N/A"}
                        </span>
                      )}
                    </td>

                    <td className="px-6 md:px-8 py-4 md:py-6">
                      {user.artisanProfile ? (
                        <CommissionManager 
                          artisanId={user.artisanProfile.id} 
                          currentRate={user.artisanProfile.commissionRate || 0} 
                          dict={dict} 
                        />
                      ) : (
                        <span className="text-[9px] md:text-[10px] font-bold text-primary/20 uppercase tracking-widest">
                          {dict.admin?.not_applicable || "N/A"}
                        </span>
                      )}
                    </td>

                    <td className="px-6 md:px-8 py-4 md:py-6 text-[10px] md:text-xs">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 font-bold text-charcoal/40">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-charcoal/40">
                          <ShoppingBag className="w-3 h-3" />
                          <span>{dict.admin?.orders_count ? dict.admin.orders_count.replace('{count}', (user.orders?.length || 0).toString()) : `${user.orders?.length || 0} Orders`}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 md:px-7 py-4 md:py-6 text-end whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 shrink-0 flex-nowrap">
                        <Link
                          href={`/${lang}/profile?userId=${user.id}`}
                          className="h-8 md:h-9 px-3 bg-primary/5 hover:bg-primary hover:text-white text-primary rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-primary/10 shadow-2xs group/btn whitespace-nowrap shrink-0"
                          title={isAr ? "معاينة حساب العميل ومسار طلباته" : "View Client Perspective & Orders"}
                        >
                          <User className="w-3.5 h-3.5 text-accent group-hover/btn:text-white transition-colors shrink-0" />
                          <span className="whitespace-nowrap">{isAr ? "معاينة العميل" : "Client View"}</span>
                        </Link>
                        <DeleteUserButton userId={user.id} userName={user.name} dict={dict} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
