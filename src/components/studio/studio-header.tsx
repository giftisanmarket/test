"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { performSignOut } from "@/lib/native";
import { useState, useRef, useEffect, useMemo } from "react";
import { 
  LayoutDashboard, 
  Plus, 
  Settings, 
  ExternalLink, 
  Store, 
  User, 
  Globe, 
  Menu, 
  X, 
  ChevronDown, 
  CheckCircle2, 
  Clock, 
  LogOut, 
  Sparkles,
  HelpCircle,
  MessageSquare
} from "lucide-react";
import { useNotifications } from "@/components/notification-provider";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

interface StudioHeaderProps {
  lang: string;
  dict: any;
  artisan?: {
    id: string;
    studioName?: string | null;
    slug?: string | null;
    avatar?: string | null;
    status?: string | null;
  } | null;
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  };
}

export function StudioHeader({ lang, dict, artisan, user }: StudioHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { unreadCount, openChat, isChatOpen } = useNotifications();

  const profileRef = useRef<HTMLDivElement>(null);
  const isAr = lang === "ar";

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false);
  }, [pathname]);

  // Language switch handler (and Alt + L shortcut)
  const switchLanguage = () => {
    const nextLang = lang === "en" ? "ar" : "en";
    document.cookie = `NEXT_LOCALE=${nextLang}; path=/; max-age=31536000`;
    const nextPath = pathname.replace(/^\/(en|ar)/, `/${nextLang}`);

    toast.success(
      nextLang === "ar" ? "جاري التحويل إلى اللغة العربية..." : "Switching to English...",
      { id: "lang-switch-toast", duration: 1500 }
    );
    router.push(nextPath);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "l" || e.key === "L" || e.key === "ل")) {
        e.preventDefault();
        switchLanguage();
      }
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
        setIsProfileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pathname, lang]);

  // Handle avatar click: on mobile (< 768px), open full drawer; on desktop, toggle dropdown
  const handleAvatarClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsMobileMenuOpen((prev) => !prev);
      setIsProfileOpen(false);
    } else {
      setIsProfileOpen((prev) => !prev);
      setIsMobileMenuOpen(false);
    }
  };

  // Navigation items
  const navItems = useMemo(() => [
    {
      label: dict?.studio?.overview || (isAr ? "لوحة التحكم" : "Dashboard"),
      href: `/${lang}/studio`,
      icon: LayoutDashboard,
      isActive: pathname === `/${lang}/studio` && !searchParams?.get("tab"),
    },
    {
      label: dict?.studio?.add_treasure || (isAr ? "إضافة قطعة" : "Add Product"),
      href: `/${lang}/studio/new-product`,
      icon: Plus,
      isActive: pathname === `/${lang}/studio/new-product`,
    },
    {
      label: dict?.common?.messages || (isAr ? "المحادثات" : "Messages"),
      onClick: () => {
        setIsMobileMenuOpen(false);
        openChat();
      },
      icon: MessageSquare,
      badge: unreadCount > 0 ? unreadCount : null,
      isActive: isChatOpen,
    },
    {
      label: dict?.studio?.studio_settings || (isAr ? "الإعدادات" : "Settings"),
      href: `/${lang}/studio?tab=settings`,
      icon: Settings,
      isActive: pathname === `/${lang}/studio` && searchParams?.get("tab") === "settings",
    },
  ], [lang, pathname, dict, isAr, searchParams, unreadCount, isChatOpen, openChat]);

  const studioDisplayName = artisan?.studioName || user.name || (isAr ? "متجر الحرفي" : "Artisan Shop");
  const avatarImage = artisan?.avatar || user.image;
  const isVerified = artisan?.status === "APPROVED";
  const publicShopUrl = isVerified && artisan?.slug ? `/${lang}/artisans/${artisan.slug}` : null;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-xl border-b border-primary/10 shadow-xs pt-safe">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 lg:px-12 h-16 md:h-20 flex items-center justify-between gap-3 md:gap-6">
        
        {/* Brand Logo + Shop Subtitle (Stacked layout matching Admin branding) */}
        <Link 
          href={`/${lang}/studio`} 
          className="flex items-center gap-2 md:gap-3 shrink-0 group focus:outline-none"
          title={dict?.studio?.dashboard || (isAr ? "لوحة تحكم المتجر" : "Shop Dashboard")}
        >
          <div className="relative w-8 h-8 md:w-10 md:h-10 overflow-hidden shadow-sm rounded-xl border border-primary/10 shrink-0 group-hover:scale-105 transition-transform duration-300">
            <Image
              src="/icon.png"
              alt="Giftisan Logo"
              fill
              className="object-cover"
              sizes="40px"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-lg sm:text-xl md:text-2xl font-heading font-black text-primary tracking-tighter leading-none">
                Giftisan
              </span>
              {isVerified && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-green-50 text-green-700 border border-green-200 inline-flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" />
                  <span className="hidden xs:inline">{isAr ? "موثق" : "Verified"}</span>
                </span>
              )}
            </div>
            <span className="text-[10px] md:text-[11px] text-accent font-black uppercase tracking-widest leading-none mt-1">
              {isAr ? "المتجر" : "Shop"}
            </span>
          </div>
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
          
          {/* Primary CTA: Add Product (hidden if already on new-product page) */}
          {!pathname?.includes("/studio/new-product") && (
            <Link
              href={`/${lang}/studio/new-product`}
              className="w-8 h-8 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full text-xs font-bold text-white bg-accent hover:bg-accent-light transition-all shadow-sm shadow-accent/20 active:scale-95 flex items-center justify-center gap-1.5 shrink-0 group"
              title={dict?.studio?.add_treasure || (isAr ? "إضافة قطعة" : "Add Product")}
            >
              <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 transition-transform group-hover:rotate-90 duration-300" />
              <span className="hidden sm:inline">{dict?.studio?.add_treasure || (isAr ? "إضافة قطعة" : "Add Product")}</span>
            </Link>
          )}

          {/* Messages Drawer Trigger (Accessible on both Mobile & Desktop) */}
          <button
            type="button"
            onClick={() => openChat()}
            className={cn(
              "flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-3.5 sm:py-1.5 md:px-4 md:py-2 rounded-full text-xs font-bold transition-all shadow-xs relative cursor-pointer",
              isChatOpen
                ? "bg-primary text-white border-primary shadow-sm"
                : "text-primary hover:bg-primary/5 border border-primary/15"
            )}
            title={dict?.common?.messages || (isAr ? "المحادثات" : "Messages")}
          >
            <MessageSquare className={cn("w-4 h-4 sm:w-3.5 sm:h-3.5", isChatOpen ? "text-accent-light" : "text-accent")} />
            <span className="hidden sm:inline ms-1.5">{dict?.common?.messages || (isAr ? "المحادثات" : "Messages")}</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -end-1 sm:static sm:ms-1.5 w-4 h-4 bg-accent text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                {unreadCount}
              </span>
            )}
          </button>

          {/* View Live Shop (Artisan Storefront Preview - Desktop / Tablet) */}
          {publicShopUrl && (
            <Link
              href={publicShopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 md:px-4 md:py-2 rounded-full text-xs font-bold text-primary hover:bg-primary/5 border border-primary/15 transition-all shadow-xs group"
              title={isAr ? "فتح صفحة متجرك للجمهور" : "Preview your public shop on Giftisan"}
            >
              <ExternalLink className="w-3.5 h-3.5 text-accent transition-colors" />
              <span>{isAr ? "معاينة المتجر" : "View Live Shop"}</span>
            </Link>
          )}

          {/* Language Switcher (Desktop / Tablet) */}
          <button
            type="button"
            onClick={switchLanguage}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-full text-xs font-bold text-charcoal/70 hover:text-primary hover:bg-primary/5 transition-all border border-transparent hover:border-primary/10"
            title={isAr ? "التبديل إلى الإنجليزية (Alt + L)" : "Switch to Arabic (Alt + L)"}
          >
            <Globe className="w-3.5 h-3.5 text-accent" />
            <span className="uppercase text-[11px] font-black">{isAr ? "EN" : "العربية"}</span>
          </button>

          {/* Artisan Profile Menu */}
          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={handleAvatarClick}
              className={cn(
                "flex items-center gap-1.5 p-1 rounded-full transition-all focus:outline-none cursor-pointer",
                (isProfileOpen || isMobileMenuOpen)
                  ? "ring-2 ring-accent bg-accent/5"
                  : "hover:ring-2 hover:ring-primary/10"
              )}
              aria-expanded={isProfileOpen || isMobileMenuOpen}
              aria-label={studioDisplayName}
            >
              <div className="relative w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden border border-primary/10 bg-cream flex items-center justify-center shadow-xs">
                {avatarImage ? (
                  <Image
                    src={avatarImage}
                    alt={studioDisplayName}
                    fill
                    className="object-cover"
                    sizes="36px"
                  />
                ) : (
                  <User className="w-4 h-4 text-primary/60" />
                )}
              </div>
              <ChevronDown className={cn("w-3.5 h-3.5 text-charcoal/40 transition-transform hidden sm:block", isProfileOpen && "rotate-180 text-accent")} />
            </button>

            {/* Profile Dropdown (Desktop & Tablet) */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="hidden md:block absolute end-0 top-full mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-primary/10 py-3 z-50 overflow-hidden"
                >
                  {/* Studio Header Info */}
                  <div className="px-5 py-3 border-b border-primary/5 bg-cream/20">
                    <p className="text-xs font-black text-primary truncate">
                      {studioDisplayName}
                    </p>
                    <p className="text-[11px] text-charcoal/50 truncate font-sans">
                      {user.email}
                    </p>
                    <div className="mt-2.5 flex items-center gap-1.5">
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          {isAr ? "متجر موثق" : "Verified Shop"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          {isAr ? "قيد المراجعة" : "Under Review"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mode Switch: Marketplace / Buyer Mode */}
                  <div className="p-2 border-b border-primary/5">
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-primary/40">
                      {isAr ? "وضع التبديل" : "Switch Mode"}
                    </div>
                    <Link
                      href={`/${lang}`}
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-2xl hover:bg-accent/5 text-primary font-bold text-xs transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                          <Store className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight">{isAr ? "العودة للسوق" : "Browse Marketplace"}</p>
                          <p className="text-[10px] text-charcoal/40 font-normal">{isAr ? "التسوق واستكشاف المنتجات" : "Shop handcrafted gifts"}</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cream text-charcoal/60 border border-primary/5">
                        {isAr ? "مشتري" : "Buyer"}
                      </span>
                    </Link>
                  </div>

                  {/* Shop Quick Shortcuts */}
                  <div className="p-2 border-b border-primary/5 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        openChat();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-2xl hover:bg-accent/5 text-charcoal/80 font-bold text-xs transition-colors cursor-pointer text-start"
                    >
                      <div className="flex items-center gap-2.5">
                        <MessageSquare className="w-3.5 h-3.5 text-accent" />
                        <span>{dict?.common?.messages || (isAr ? "محادثات المتجر" : "Studio Messages")}</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="w-4 h-4 bg-accent text-white text-[9px] font-black rounded-full flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                    <Link
                      href={`/${lang}/studio/new-product`}
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-2xl hover:bg-accent/5 text-charcoal/80 font-bold text-xs transition-colors group"
                    >
                      <Plus className="w-3.5 h-3.5 text-accent group-hover:rotate-90 transition-transform duration-300" />
                      <span>{dict?.studio?.add_treasure || (isAr ? "إضافة منتج جديد" : "Add New Product")}</span>
                    </Link>
                    <Link
                      href={`/${lang}/studio?tab=settings`}
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-2xl hover:bg-primary/5 text-charcoal/80 font-bold text-xs transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-accent" />
                      <span>{dict?.studio?.studio_settings || (isAr ? "إعدادات المتجر" : "Shop Settings")}</span>
                    </Link>
                    {publicShopUrl && (
                      <Link
                        href={publicShopUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-2xl hover:bg-primary/5 text-charcoal/80 font-bold text-xs transition-colors group"
                      >
                        <div className="flex items-center gap-2.5">
                          <ExternalLink className="w-3.5 h-3.5 text-accent" />
                          <span>{isAr ? "معاينة المتجر المباشر" : "View Live Shop"}</span>
                        </div>
                      </Link>
                    )}

                    <Link
                      href={`/${lang}/contact`}
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-2xl hover:bg-primary/5 text-charcoal/80 font-bold text-xs transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-accent" />
                      <span>{dict?.common?.support || (isAr ? "المساعدة والدعم" : "Help & Support")}</span>
                    </Link>
                  </div>

                  {/* Sign Out */}
                  <div className="p-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        performSignOut(lang);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl hover:bg-red-50 text-red-600 font-bold text-xs transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>{dict?.common?.sign_out || dict?.common?.logout || (isAr ? "تسجيل الخروج" : "Sign Out")}</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Consolidated Single Sheet for Mobile) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden border-t border-primary/10 bg-white/98 backdrop-blur-2xl overflow-hidden px-4 py-5 shadow-2xl"
          >
            <div className="space-y-4">
              {/* Studio Info Card */}
              <div className="p-3.5 bg-cream/40 rounded-2xl border border-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border border-primary/10 bg-cream">
                    {avatarImage ? (
                      <Image src={avatarImage} alt={studioDisplayName} fill className="object-cover" />
                    ) : (
                      <User className="w-5 h-5 m-2.5 text-primary/60" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-primary leading-tight">{studioDisplayName}</h4>
                    <p className="text-[11px] text-charcoal/50">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isVerified ? (
                    <span className="text-[10px] font-black uppercase text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                      {isAr ? "موثق" : "Verified"}
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      {isAr ? "مراجعة" : "Review"}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-charcoal/50 hover:text-primary hover:bg-primary/5 transition-colors"
                    aria-label={isAr ? "إغلاق" : "Close"}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  if (item.onClick) {
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={item.onClick}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold text-sm transition-all text-start cursor-pointer",
                          item.isActive
                            ? "bg-primary text-white shadow-md shadow-primary/20"
                            : "text-charcoal/80 hover:bg-primary/5 hover:text-primary"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn("w-4 h-4", item.isActive ? "text-accent-light" : "text-accent")} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="w-5 h-5 bg-accent text-white text-[10px] font-black rounded-full flex items-center justify-center">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  }
                  return (
                    <Link
                      key={item.href}
                      href={item.href!}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all",
                        item.isActive
                          ? "bg-primary text-white shadow-md shadow-primary/20"
                          : "text-charcoal/80 hover:bg-primary/5 hover:text-primary"
                      )}
                    >
                      <Icon className={cn("w-4 h-4", item.isActive ? "text-accent-light" : "text-accent")} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}



                {/* Support */}
                <Link
                  href={`/${lang}/contact`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-charcoal/80 hover:bg-primary/5 hover:text-primary transition-all"
                >
                  <HelpCircle className="w-4 h-4 text-accent" />
                  <span>{dict?.common?.support || (isAr ? "المساعدة والدعم" : "Help & Support")}</span>
                </Link>
              </div>

              {/* View Live Shop Button */}
              {publicShopUrl && (
                <Link
                  href={publicShopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-accent text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-accent-light transition-all shadow-lg shadow-accent/20"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{isAr ? "معاينة المتجر المباشر" : "View Live Shop"}</span>
                </Link>
              )}

              {/* Language Switcher in Mobile Drawer */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-cream/60 border border-primary/5">
                <span className="text-xs font-bold text-primary flex items-center gap-2">
                  <Globe className="w-4 h-4 text-accent" />
                  {isAr ? "لغة التطبيق" : "Language"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    switchLanguage();
                  }}
                  className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-white text-primary border border-primary/10 shadow-xs hover:bg-accent hover:text-white transition-colors"
                >
                  {isAr ? "English" : "العربية"}
                </button>
              </div>

              {/* Mode Switch & Logout */}
              <div className="pt-2 border-t border-primary/5 space-y-2">
                <Link
                  href={`/${lang}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl bg-cream/50 hover:bg-cream text-primary font-bold text-xs transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-accent" />
                    {isAr ? "العودة للسوق للتسوق" : "Browse Marketplace"}
                  </span>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-white text-primary/60 border border-primary/5">
                    {isAr ? "مشتري" : "Buyer"}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    performSignOut(lang);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-red-600 bg-red-50/50 hover:bg-red-50 font-bold text-xs transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{dict?.common?.sign_out || dict?.common?.logout || (isAr ? "تسجيل الخروج" : "Sign Out")}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
