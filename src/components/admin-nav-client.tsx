"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import { 
  Users, 
  ShoppingBag, 
  Package, 
  LayoutDashboard, 
  Mail, 
  Send, 
  ArrowLeft, 
  Tag, 
  DollarSign, 
  Truck, 
  RotateCcw, 
  ReceiptText, 
  UserRound,
  MessageSquare,
  Menu,
  X,
  Search,
  Sparkles,
  Store,
  ChevronRight,
  ExternalLink,
  Layers,
  Globe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  category: "core" | "commerce" | "community" | "finance";
  badge?: string;
}

const getNavItems = (dict: any): NavItem[] => {
  const isAr = dict.profile?.delivered === "تم التوصيل" || dict.profile?.delivered === "تم الاستلام";
  return [
    { label: dict.admin.overview || (isAr ? "نظرة عامة" : "Overview"), href: "/admin", icon: LayoutDashboard, category: "core" },
    
    // Commerce
    { label: dict.admin.site_orders || (isAr ? "طلبات المتجر" : "Orders"), href: "/admin/orders", icon: Package, category: "commerce" },
    { label: dict.admin.global_products || (isAr ? "المنتجات العالمية" : "Products"), href: "/admin/products", icon: ShoppingBag, category: "commerce" },
    { label: dict.admin.shipping_management || (isAr ? "إدارة الشحن" : "Shipping"), href: "/admin/shipping", icon: Truck, category: "commerce" },
    { label: isAr ? "الاسترجاع والنزاعات" : "Refunds & Claims", href: "/admin/refunds", icon: RotateCcw, category: "commerce" },
    
    // Community & Growth
    { label: dict.admin.artisans_users || (isAr ? "الحرفيين والأعضاء" : "Artisans & Users"), href: "/admin/users", icon: Users, category: "community" },
    { label: isAr ? "محادثات المنصة" : "Conversations", href: "/admin/messages", icon: MessageSquare, category: "community" },
    { label: isAr ? "العملاء المحتملون" : "Abandoned Leads", href: "/admin/leads", icon: UserRound, category: "community" },
    { label: dict.admin.subscribers || (isAr ? "القائمة البريدية" : "Subscribers"), href: "/admin/subscribers", icon: Mail, category: "community" },
    { label: dict.admin.outreach || (isAr ? "مرسل البريد" : "Mail Sender"), href: "/admin/mail-sender", icon: Send, category: "community" },
    
    // Finance
    { label: isAr ? "مصاريف المنصة" : "Platform Expenses", href: "/admin/expenses", icon: ReceiptText, category: "finance" },
    { label: dict.admin.payouts_requests || (isAr ? "إدارة المدفوعات" : "Payout Requests"), href: "/admin/payouts", icon: DollarSign, category: "finance" },
    { label: dict.admin.coupons || (isAr ? "كوبونات الخصم" : "Coupons"), href: "/admin/coupons", icon: Tag, category: "finance" },
  ];
};

export function AdminNavClient({ 
  children,
  dict
}: { 
  children: React.ReactNode,
  dict: any
}) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = getNavItems(dict);
  const normalizedPath = pathname.replace(/^\/(en|ar)/, "") || "/";
  const isAr = pathname.startsWith("/ar");

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerSearch, setDrawerSearch] = useState("");

  // Close drawer on navigation
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen]);

  // Global Keyboard Shortcut for switching languages (Alt + L)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "l" || e.key === "L" || e.key === "ل")) {
        e.preventDefault();
        const nextLang = pathname.startsWith("/en") ? "ar" : "en";
        document.cookie = `NEXT_LOCALE=${nextLang}; path=/; max-age=31536000`;
        const nextPath = pathname.replace(/^\/(en|ar)/, `/${nextLang}`);
        
        toast.success(
          nextLang === "ar" 
            ? "جاري التحويل إلى اللغة العربية..." 
            : "Switching to English...",
          { id: "lang-switch-toast", duration: 1500 }
        );
        
        router.push(nextPath);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pathname, router]);

  // Current active item for mobile top header title
  const currentActiveItem = useMemo(() => {
    if (normalizedPath === "/admin") {
      return navItems.find(i => i.href === "/admin");
    }
    return navItems.find(i => i.href !== "/admin" && normalizedPath.startsWith(i.href));
  }, [normalizedPath, navItems]);

  // Primary bottom navigation items (Top 4 destinations + More button)
  const bottomBarMainItems = useMemo(() => [
    { href: "/admin", label: isAr ? "الرئيسية" : "Overview", icon: LayoutDashboard },
    { href: "/admin/orders", label: isAr ? "الطلبات" : "Orders", icon: Package },
    { href: "/admin/products", label: isAr ? "المنتجات" : "Products", icon: ShoppingBag },
    { href: "/admin/users", label: isAr ? "الأعضاء" : "Users", icon: Users },
  ], [isAr]);

  const isCurrentInBottomBar = bottomBarMainItems.some(i => 
    i.href === "/admin" ? normalizedPath === "/admin" : normalizedPath.startsWith(i.href)
  );

  const categories = [
    { key: "core", label: isAr ? "لوحة التحكم" : "Control Center" },
    { key: "commerce", label: isAr ? "التجارة والطلبات" : "Commerce & Fulfillment" },
    { key: "community", label: isAr ? "المجتمع والنمو" : "Community & Growth" },
    { key: "finance", label: isAr ? "المالية والحملات" : "Finance & Marketing" },
  ];

  const filteredNavItems = useMemo(() => {
    if (!drawerSearch.trim()) return navItems;
    const q = drawerSearch.toLowerCase().trim();
    return navItems.filter(item => 
      item.label.toLowerCase().includes(q) || item.href.toLowerCase().includes(q)
    );
  }, [drawerSearch, navItems]);

  const toggleLanguage = () => {
    const nextLang = pathname.startsWith("/en") ? "ar" : "en";
    document.cookie = `NEXT_LOCALE=${nextLang}; path=/; max-age=31536000`;
    const nextPath = pathname.replace(/^\/(en|ar)/, `/${nextLang}`);
    router.push(nextPath);
  };

  return (
    <>
      {/* =========================================================================
          MOBILE TOP APP BAR (Modern, touch-friendly, glassmorphic header)
         ========================================================================= */}
      <header className="lg:hidden fixed top-0 start-0 end-0 h-[calc(4rem+env(safe-area-inset-top,0px))] pt-safe bg-primary/95 text-white flex items-center justify-between px-3.5 sm:px-5 z-40 border-b border-white/10 backdrop-blur-xl shadow-lg no-print">
        {/* Left: Drawer Toggle & Brand/Current Page */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open Admin Menu"
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-white flex items-center justify-center transition-all border border-white/10 shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/admin" className="flex items-center gap-2 min-w-0 group">
            <div className="relative w-7 h-7 overflow-hidden rounded-lg border border-white/20 shrink-0 shadow">
              <Image src="/icon.png" alt="Giftisan" fill className="object-cover" />
            </div>
            <div className="min-w-0 flex flex-col">
              <span className="font-heading font-black tracking-tight text-sm leading-none flex items-center gap-1.5 truncate">
                Giftisan
                <span className="text-[9px] text-accent font-black uppercase tracking-widest bg-white/10 px-1.5 py-0.2 rounded">
                  Admin
                </span>
              </span>
              {currentActiveItem && (
                <span className="text-[10px] text-white/60 font-semibold truncate mt-0.5">
                  {currentActiveItem.label}
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* Right: Language Switcher & Exit */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-black uppercase text-accent hover:text-white transition-all active:scale-95 border border-white/10"
            title={isAr ? "Switch to English (Alt+L)" : "التحويل للعربية (Alt+L)"}
          >
            <Globe className="w-3.5 h-3.5 opacity-70" />
            <span>{isAr ? "EN" : "عربي"}</span>
          </button>

          <Link 
            href="/" 
            className="flex items-center gap-1 h-8 px-2.5 bg-accent/20 hover:bg-accent text-accent hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border border-accent/30 active:scale-95"
            title={dict.admin?.marketplace || "Marketplace"}
          >
            <Store className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{dict.admin?.exit || (isAr ? "المتجر" : "Exit")}</span>
          </Link>
        </div>
      </header>

      {/* =========================================================================
          MOBILE SLIDE-OUT DRAWER (Full navigation access across all 12 modules)
         ========================================================================= */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsDrawerOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 no-print"
            />

            {/* Sliding Drawer Container */}
            <motion.aside
              initial={{ x: isAr ? "100%" : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: isAr ? "100%" : "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="lg:hidden fixed top-0 bottom-0 start-0 w-[84%] max-w-sm bg-primary text-white z-50 flex flex-col shadow-2xl border-e border-white/10 pt-safe no-print"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 overflow-hidden rounded-xl border border-white/20 shadow-md">
                    <Image src="/icon.png" alt="Giftisan" fill className="object-cover" />
                  </div>
                  <div>
                    <h2 className="font-heading font-black text-lg tracking-tight leading-none">Giftisan</h2>
                    <span className="text-[10px] text-accent font-black uppercase tracking-widest block mt-0.5">
                      {dict.common?.admin || "Admin Suite"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-colors active:scale-90"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Quick Search */}
              <div className="p-4 border-b border-white/5">
                <div className="relative">
                  <Search className="w-4 h-4 absolute start-3.5 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={drawerSearch}
                    onChange={(e) => setDrawerSearch(e.target.value)}
                    placeholder={isAr ? "ابحث عن قسم أو صفحة..." : "Quick filter sections..."}
                    className="w-full h-10 ps-10 pe-8 bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white placeholder:text-white/40 focus:outline-none focus:border-accent focus:bg-white/15 transition-all"
                  />
                  {drawerSearch && (
                    <button
                      onClick={() => setDrawerSearch("")}
                      className="absolute end-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Navigation Items (Categorized & Scrollable) */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
                {drawerSearch.trim() ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 px-2 mb-2">
                      {isAr ? "نتائج البحث" : "Search Results"} ({filteredNavItems.length})
                    </p>
                    {filteredNavItems.length === 0 ? (
                      <p className="text-xs text-white/50 text-center py-6">
                        {isAr ? "لا توجد نتائج مطابقة" : "No sections found"}
                      </p>
                    ) : (
                      filteredNavItems.map((item) => {
                        const isActive = normalizedPath === item.href || (item.href !== "/admin" && normalizedPath.startsWith(item.href));
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsDrawerOpen(false)}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-xl font-bold text-xs transition-all active:scale-98",
                              isActive
                                ? "bg-white text-primary shadow-md"
                                : "text-white/70 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <item.icon className="w-4 h-4 shrink-0" />
                              <span>{item.label}</span>
                            </div>
                            <ChevronRight className={cn("w-3.5 h-3.5 opacity-50", isAr && "rotate-180")} />
                          </Link>
                        );
                      })
                    )}
                  </div>
                ) : (
                  categories.map((cat) => {
                    const catItems = navItems.filter((i) => i.category === cat.key);
                    return (
                      <div key={cat.key} className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-white/40 px-3 py-1">
                          {cat.label}
                        </p>
                        <div className="space-y-1">
                          {catItems.map((item) => {
                            const isActive = normalizedPath === item.href || (item.href !== "/admin" && normalizedPath.startsWith(item.href));
                            return (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsDrawerOpen(false)}
                                className={cn(
                                  "flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all active:scale-98 group",
                                  isActive
                                    ? "bg-white text-primary shadow-md font-black"
                                    : "text-white/70 hover:bg-white/10 hover:text-white"
                                )}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-white/50 group-hover:text-white")} />
                                  <span className="truncate">{item.label}</span>
                                </div>
                                {isActive ? (
                                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                                ) : (
                                  <ChevronRight className={cn("w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity", isAr && "rotate-180")} />
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-white/10 space-y-2 bg-black/10">
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white transition-all active:scale-98"
                >
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-4 h-4 text-accent" />
                    <span>{isAr ? "Switch to English" : "التحويل إلى العربية"}</span>
                  </div>
                  <span className="text-[10px] font-black uppercase bg-white/15 px-2 py-0.5 rounded text-accent">
                    {isAr ? "EN" : "عربي"}
                  </span>
                </button>

                <Link
                  href="/"
                  onClick={() => setIsDrawerOpen(false)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white/80 hover:text-white transition-all active:scale-98"
                >
                  <div className="flex items-center gap-2.5">
                    <Store className="w-4 h-4 text-white/60" />
                    <span>{dict.admin?.marketplace || (isAr ? "العودة للمتجر الرئيسي" : "Back to Marketplace")}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* =========================================================================
          DESKTOP SIDEBAR (Permanent w-80 sidebar for screens >= lg)
         ========================================================================= */}
      <aside className="fixed start-0 top-0 bottom-0 w-80 bg-primary text-white p-6 hidden lg:flex flex-col z-50 shadow-2xl overflow-y-auto no-print">
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="relative w-10 h-10 overflow-hidden rounded-xl border border-white/20 shadow-xl shrink-0">
            <Image
              src="/icon.png"
              alt="Giftisan Logo"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <span className="text-2xl font-heading font-black tracking-tight block leading-none">Giftisan</span>
            <span className="text-[10px] text-accent font-black uppercase tracking-widest block mt-1">
              {dict.common?.admin || "Admin Suite"}
            </span>
          </div>
        </div>

        {/* Categorized Desktop Navigation */}
        <nav className="flex-1 space-y-6 mb-4">
          {categories.map((cat) => {
            const catItems = navItems.filter((i) => i.category === cat.key);
            return (
              <div key={cat.key} className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 px-4 py-1">
                  {cat.label}
                </p>
                <div className="space-y-1">
                  {catItems.map((item) => {
                    const isActive = normalizedPath === item.href || (item.href !== "/admin" && normalizedPath.startsWith(item.href));
                    return (
                      <Link 
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center justify-between py-2.5 px-4 rounded-xl transition-all font-bold text-sm group active:scale-98",
                          isActive 
                            ? "bg-white text-primary shadow-lg shadow-white/5 font-black" 
                            : "hover:bg-white/10 text-white/70 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <item.icon className={cn("w-4 h-4 shrink-0 transition-transform", isActive ? "scale-110 opacity-100 text-primary" : "opacity-60 group-hover:opacity-100 group-hover:scale-110")} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="pt-4 border-t border-white/10 space-y-2">
          <button 
            type="button"
            onClick={toggleLanguage}
            className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl hover:bg-white/10 transition-all font-bold text-white/70 hover:text-white active:scale-95 text-start cursor-pointer"
            title="Switch Language (Alt+L)"
          >
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-accent" />
              <span className="text-xs">{isAr ? "Switch to English" : "التحويل للعربية"}</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/15 px-2 py-0.5 rounded text-accent">
              {isAr ? "EN" : "عربي"}
            </span>
          </button>

          <Link 
            href="/" 
            className="flex items-center gap-3 py-2.5 px-4 rounded-xl hover:bg-white/10 transition-all font-bold group text-white/70 hover:text-white active:scale-95 text-start text-xs"
          >
            <ArrowLeft className={cn("w-4 h-4 group-hover:-translate-x-1 transition-transform", isAr && "rotate-180 group-hover:translate-x-1")} />
            <span>{dict.admin?.marketplace || (isAr ? "المتجر الرئيسي" : "Main Marketplace")}</span>
          </Link>
        </div>
      </aside>

      {/* =========================================================================
          MOBILE BOTTOM NAV (5 high-frequency thumb targets)
         ========================================================================= */}
      <nav className="lg:hidden fixed bottom-0 start-0 end-0 bg-primary/95 text-white z-40 border-t border-white/10 backdrop-blur-xl shadow-[0_-10px_30px_rgba(0,0,0,0.3)] pb-[max(0.5rem,env(safe-area-inset-bottom))] px-2 no-print">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {bottomBarMainItems.map((item) => {
            const isActive = item.href === "/admin" 
              ? normalizedPath === "/admin" 
              : normalizedPath.startsWith(item.href);
            return (
              <Link 
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl transition-all active:scale-90",
                  isActive ? "text-accent font-black" : "text-white/60 hover:text-white"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                  isActive ? "bg-accent/20 scale-105" : ""
                )}>
                  <item.icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold tracking-tight leading-none truncate max-w-[64px]">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* "More" / Menu Button: Opens Drawer */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-xl transition-all active:scale-90",
              !isCurrentInBottomBar ? "text-accent font-black" : "text-white/60 hover:text-white"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center relative transition-all",
              !isCurrentInBottomBar ? "bg-accent/20 scale-105" : ""
            )}>
              <Layers className="w-4 h-4" />
              {!isCurrentInBottomBar && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent absolute top-1 end-1" />
              )}
            </div>
            <span className="text-[10px] font-bold tracking-tight leading-none truncate max-w-[64px]">
              {!isCurrentInBottomBar && currentActiveItem ? currentActiveItem.label.split(' ')[0] : (isAr ? "المزيد" : "More")}
            </span>
          </button>
        </div>
      </nav>

      {/* =========================================================================
          MAIN CONTENT AREA (Responsive margins and padding for phones & desktops)
         ========================================================================= */}
      <main className="flex-1 lg:ms-80 pt-[calc(5rem+env(safe-area-inset-top,0px))] lg:pt-0 min-w-0 pb-28 lg:pb-12 overflow-x-hidden">
        <div className="p-4 sm:p-6 md:p-8 lg:p-12 min-w-0 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </>
  );
}


