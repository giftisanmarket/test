"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Compass, Heart, ShoppingBag, User } from "lucide-react";
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
  const { setIsCartOpen, totalItems } = useCart();
  const { totalFavorites, totalFavoriteArtisans } = useFavorites();
  const { openAuthModal } = useAuthModal();

  const isArabic = lang === "ar" || pathname.startsWith("/ar");
  const allFavoritesCount = totalFavorites + (totalFavoriteArtisans || 0);

  if (!isNative) return null;

  const isHomeActive =
    pathname === "/" ||
    pathname === `/${lang}` ||
    pathname === `/${lang}/`;

  const isExploreActive =
    pathname.includes("/categories") ||
    pathname.includes("/category") ||
    pathname.includes("/gifts") ||
    pathname.includes("/products") ||
    pathname.includes("/search");

  const isFavoritesActive = pathname.includes("/favorites");

  const isYouActive =
    pathname.includes("/profile") ||
    pathname.includes("/studio");

  const handleTabClick = (action: () => void) => {
    triggerHaptic("light");
    action();
  };

  const navItems = [
    {
      id: "home",
      label: dict?.common?.home || (isArabic ? "الرئيسية" : "Home"),
      icon: Home,
      isActive: isHomeActive,
      badge: null,
      onClick: () => handleTabClick(() => router.push(`/${lang}`)),
    },
    {
      id: "explore",
      label: dict?.common?.categories || (isArabic ? "استكشف" : "Explore"),
      icon: Compass,
      isActive: isExploreActive,
      badge: null,
      onClick: () => handleTabClick(() => router.push(`/${lang}/categories`)),
    },
    {
      id: "favorites",
      label: dict?.common?.favorites || (isArabic ? "المفضلة" : "Favorites"),
      icon: Heart,
      isActive: isFavoritesActive,
      badge: allFavoritesCount > 0 ? allFavoritesCount : null,
      onClick: () => handleTabClick(() => router.push(`/${lang}/favorites`)),
    },
    {
      id: "cart",
      label: dict?.common?.cart || (isArabic ? "السلة" : "Cart"),
      icon: ShoppingBag,
      isActive: false,
      badge: totalItems > 0 ? totalItems : null,
      onClick: () => handleTabClick(() => setIsCartOpen(true)),
    },
    {
      id: "you",
      label: isArabic ? "حسابك" : "You",
      icon: User,
      isActive: isYouActive,
      badge: null,
      onClick: () =>
        handleTabClick(() => {
          if (session?.user) {
            router.push(`/${lang}/profile`);
          } else {
            openAuthModal("login");
          }
        }),
    },
  ];

  return (
    <nav
      aria-label="App Navigation"
      className="fixed bottom-0 start-0 end-0 z-[95] bg-[#FDFCF0]/95 backdrop-blur-xl border-t border-primary/10 shadow-[0_-8px_30px_rgba(6,78,59,0.06)] pb-safe select-none transition-transform"
    >
      <div className="max-w-md mx-auto px-2 h-16 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={cn(
                "relative flex-1 py-1.5 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90 group",
                item.isActive ? "text-primary" : "text-primary/45 hover:text-primary/75"
              )}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    item.isActive ? "scale-110 stroke-[2.4]" : "stroke-[1.8]"
                  )}
                />
                {item.badge !== null && (
                  <span className="absolute -top-1.5 -end-2.5 min-w-[16px] h-[16px] px-1 bg-accent text-white text-[9px] font-black rounded-full flex items-center justify-center border border-cream shadow-xs animate-in zoom-in-75">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] tracking-tight font-medium transition-colors",
                  item.isActive ? "font-bold text-primary" : "text-primary/60"
                )}
              >
                {item.label}
              </span>
              {item.isActive && (
                <span className="w-1 h-1 rounded-full bg-accent mt-0.5 animate-in zoom-in-50" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
