"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Search, Heart, ShoppingCart, User, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/cart-context";
import { useFavorites } from "@/context/favorites-context";
import { useAuthModal } from "@/context/auth-modal-context";
import { useIsNative, triggerHaptic } from "@/lib/native";

interface NativeBottomNavProps {
  dict?: any;
  lang?: string;
}

export function NativeBottomNav({ dict, lang = "en" }: NativeBottomNavProps) {
  const isNative = useIsNative();
  const pathname = usePathname() || "";
  const router = useRouter();
  const { data: session } = useSession();
  const { setIsCartOpen, totalItems, isCartOpen } = useCart();
  const { totalFavorites, totalFavoriteArtisans } = useFavorites();
  const { openAuthModal } = useAuthModal();

  const isArabic = lang === "ar" || pathname.startsWith("/ar");
  const isArtisan = session?.user?.role === "ARTISAN";
  const allFavoritesCount = totalFavorites + (totalFavoriteArtisans || 0);

  // In Etsy style: hide the bottom tab bar on Product Detail and Checkout screens so the buy/checkout button takes full focus
  const isProductDetail = Boolean(pathname.match(/\/(products|product)\/[^/]+/));
  const isCheckout = pathname.includes("/checkout");

  if (!isNative || isProductDetail || isCheckout) return null;

  const isHomeActive =
    !isCartOpen &&
    (pathname === "/" ||
      pathname === `/${lang}` ||
      pathname === `/${lang}/`);

  const isShopActive =
    !isCartOpen &&
    (pathname.includes("/categories") ||
      pathname.includes("/category") ||
      pathname.includes("/gifts") ||
      pathname.includes("/search") ||
      pathname.includes("/products") ||
      pathname.includes("/artisans"));

  const isFavoritesActive = !isCartOpen && pathname.includes("/favorites");

  const isYouActive =
    !isCartOpen &&
    (isArtisan
      ? pathname.includes("/studio") || pathname.includes("/profile")
      : pathname.includes("/profile"));

  const handleTabClick = (action: () => void) => {
    triggerHaptic("light");
    action();
  };

  // Exact 5-tab Etsy App order: Home -> Shop -> Favorites -> You -> Cart
  const navItems = [
    {
      id: "home",
      label: dict?.common?.home || (isArabic ? "الرئيسية" : "Home"),
      icon: Home,
      isActive: isHomeActive,
      badge: null,
      onClick: () =>
        handleTabClick(() => {
          if (isCartOpen) setIsCartOpen(false);
          router.push(`/${lang}`);
        }),
    },
    {
      id: "shop",
      label: isArabic ? "تسوق" : (dict?.common?.shop || "Shop"),
      icon: Search,
      isActive: isShopActive,
      badge: null,
      onClick: () =>
        handleTabClick(() => {
          if (isCartOpen) setIsCartOpen(false);
          router.push(`/${lang}/categories`);
        }),
    },
    {
      id: "favorites",
      label: dict?.common?.favorites || (isArabic ? "المفضلة" : "Favorites"),
      icon: Heart,
      isActive: isFavoritesActive,
      badge: allFavoritesCount > 0 ? allFavoritesCount : null,
      onClick: () =>
        handleTabClick(() => {
          if (isCartOpen) setIsCartOpen(false);
          router.push(`/${lang}/favorites`);
        }),
    },
    isArtisan
      ? {
          id: "studio",
          label: dict?.common?.pro_studio || (isArabic ? "المتجر" : "Shop"),
          icon: Store,
          isActive: isYouActive,
          badge: null,
          onClick: () =>
            handleTabClick(() => {
              if (isCartOpen) setIsCartOpen(false);
              router.push(`/${lang}/studio`);
            }),
        }
      : {
          id: "you",
          label: dict?.common?.your_account || (isArabic ? "حسابك" : "You"),
          icon: User,
          isActive: isYouActive,
          badge: null,
          onClick: () =>
            handleTabClick(() => {
              if (isCartOpen) setIsCartOpen(false);
              if (session?.user) {
                router.push(`/${lang}/profile`);
              } else {
                openAuthModal("login");
              }
            }),
        },
    {
      id: "cart",
      label: dict?.common?.cart || (isArabic ? "السلة" : "Cart"),
      icon: ShoppingCart,
      isActive: isCartOpen,
      badge: totalItems > 0 ? totalItems : null,
      onClick: () => handleTabClick(() => setIsCartOpen(!isCartOpen)),
    },
  ];

  return (
    <nav
      aria-label="App Navigation"
      className="fixed bottom-3 inset-x-0 z-[95] px-3 pointer-events-none select-none transition-all duration-300 pb-safe"
    >
      {/* Etsy Floating Frosted Capsule Dock - Giftisan Cream & Forest Green Style */}
      <div className="max-w-[410px] mx-auto h-[62px] px-2 bg-[#FDFCF0]/95 backdrop-blur-2xl rounded-full border border-primary/15 shadow-[0_12px_36px_rgba(6,78,59,0.14)] flex items-center justify-around pointer-events-auto ring-1 ring-primary/5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={cn(
                "relative flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 transition-all duration-150 active:scale-90 group",
                item.isActive ? "text-primary" : "text-primary/45 hover:text-primary/75"
              )}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={cn(
                    "w-[21px] h-[21px] transition-transform duration-200",
                    item.isActive ? "scale-105 stroke-[2.4] fill-primary" : "stroke-[1.9]"
                  )}
                />
                {item.badge !== null && (
                  <span className="absolute -top-1.5 -end-2.5 min-w-[17px] h-[17px] px-1 bg-[#D97706] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-[#FDFCF0] shadow-xs animate-in zoom-in-75">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] tracking-tight transition-colors duration-150",
                  item.isActive ? "font-black text-primary" : "font-medium text-primary/55"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
