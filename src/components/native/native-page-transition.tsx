"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useIsNative } from "@/lib/native";

interface NativePageTransitionProps {
  children: React.ReactNode;
}

export function NativePageTransition({ children }: NativePageTransitionProps) {
  const isNative = useIsNative();
  const pathname = usePathname();
  const [animationClass, setAnimationClass] = useState("");
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (!isNative) return;

    if (prevPathRef.current !== pathname) {
      // Determine if deep screen navigation (subpage push) or bottom tab switch
      const isSubPage = Boolean(
        pathname.includes("/products/") ||
        pathname.includes("/category/") ||
        pathname.includes("/checkout") ||
        pathname.includes("/orders") ||
        pathname.includes("/gifts/")
      );

      // Trigger GPU-accelerated entrance animation
      setAnimationClass(isSubPage ? "native-screen-push" : "native-tab-fade");

      // Reset scroll position on route push like native screen stacks
      window.scrollTo({ top: 0, behavior: "instant" });

      prevPathRef.current = pathname;

      const timer = setTimeout(() => {
        setAnimationClass("");
      }, 260);

      return () => clearTimeout(timer);
    }
  }, [pathname, isNative]);

  if (!isNative) {
    return <>{children}</>;
  }

  return (
    <div
      key={pathname}
      className={`w-full min-h-screen ${animationClass}`}
      style={
        animationClass
          ? {
              transform: "translateZ(0)",
              backfaceVisibility: "hidden",
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
