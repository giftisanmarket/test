"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useIsNative, triggerHaptic } from "@/lib/native";
import { Loader2 } from "lucide-react";

interface NativePullToRefreshProps {
  children: React.ReactNode;
}

export function NativePullToRefresh({ children }: NativePullToRefreshProps) {
  const isNative = useIsNative();
  const router = useRouter();
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const hasTriggeredHapticRef = useRef(false);

  const THRESHOLD = 65;
  const MAX_PULL = 90;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isNative) return;
    if (window.scrollY <= 2 && !isRefreshing) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
      hasTriggeredHapticRef.current = false;
    }
  }, [isNative, isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPullingRef.current || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0 && window.scrollY <= 2) {
      // Damped pull distance
      const damped = Math.min(diff * 0.42, MAX_PULL);
      setPullY(damped);

      // Trigger tactile tick when threshold is crossed
      if (damped >= THRESHOLD && !hasTriggeredHapticRef.current) {
        triggerHaptic("light");
        hasTriggeredHapticRef.current = true;
      }
    } else {
      setPullY(0);
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(() => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullY >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullY(50);
      triggerHaptic("medium");

      // Execute smooth refresh
      router.refresh();

      setTimeout(() => {
        setIsRefreshing(false);
        setPullY(0);
      }, 900);
    } else {
      setPullY(0);
    }
  }, [pullY, isRefreshing, router]);

  useEffect(() => {
    if (!isNative) return;
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isNative, handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (!isNative) {
    return <>{children}</>;
  }

  return (
    <div className="relative w-full">
      {/* Pull Indicator Pill */}
      <div
        style={{
          transform: `translate3d(-50%, ${pullY - 45}px, 0)`,
          opacity: pullY > 10 || isRefreshing ? 1 : 0,
        }}
        className="fixed top-14 start-1/2 z-50 pointer-events-none transition-opacity duration-150 flex items-center justify-center"
      >
        <div className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-md border border-primary/15 shadow-lg shadow-primary/10 flex items-center justify-center text-primary">
          <Loader2
            className={`w-5 h-5 ${isRefreshing ? "animate-spin text-accent" : ""}`}
            style={{
              transform: isRefreshing ? undefined : `rotate(${pullY * 4}deg)`,
            }}
          />
        </div>
      </div>

      {/* Main Content with subtle resistance transform */}
      <div
        style={{
          transform: pullY > 0 ? `translate3d(0, ${pullY * 0.4}px, 0)` : undefined,
          transition: isPullingRef.current ? "none" : "transform 0.25s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
