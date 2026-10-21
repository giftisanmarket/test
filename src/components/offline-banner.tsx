"use client";

import { useState, useEffect, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi, RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface OfflineBannerProps {
  lang?: string;
}

export function OfflineBanner({ lang = "en" }: OfflineBannerProps) {
  const [isOffline, setIsOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isAr = lang === "ar";

  useEffect(() => {
    // Check initial online status
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
    }

    const handleOffline = () => {
      setIsOffline(true);
      setJustReconnected(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);

      // Auto-refresh current route to fetch latest dynamic data once connection returns
      startTransition(() => {
        router.refresh();
      });

      // Hide the "reconnected" confirmation pill after 3.5s
      const timer = setTimeout(() => {
        setJustReconnected(false);
      }, 3500);

      return () => clearTimeout(timer);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [router]);

  const handleManualRetry = () => {
    startTransition(() => {
      if (typeof window !== "undefined") {
        if (navigator.onLine) {
          setIsOffline(false);
          setJustReconnected(true);
          router.refresh();
        } else {
          // If still offline, trigger page reload
          window.location.reload();
        }
      }
    });
  };

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          key="offline-banner"
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.96 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="fixed top-3 sm:top-4 inset-x-0 mx-auto w-fit max-w-[92vw] z-[120] pointer-events-auto"
        >
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-charcoal/95 backdrop-blur-md text-white border border-white/10 shadow-2xl text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>

            <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />

            <span className="leading-none">
              {isAr
                ? "لا يوجد اتصال بالإنترنت • وضع التصفح دون اتصال"
                : "No connection • Offline mode"}
            </span>

            <button
              type="button"
              onClick={handleManualRetry}
              disabled={isPending}
              className="ms-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-[11px] font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3 h-3 ${isPending ? "animate-spin" : ""}`} />
              <span>{isAr ? "إعادة المحاولة" : "Retry"}</span>
            </button>
          </div>
        </motion.div>
      )}

      {!isOffline && justReconnected && (
        <motion.div
          key="online-banner"
          initial={{ opacity: 0, y: -24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.96 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="fixed top-3 sm:top-4 inset-x-0 mx-auto w-fit max-w-[92vw] z-[120] pointer-events-auto"
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-800/95 backdrop-blur-md text-white border border-emerald-400/20 shadow-2xl text-xs font-medium">
            <Wifi className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span className="leading-none">
              {isAr
                ? "تم استعادة الاتصال بالإنترنت"
                : "Back online • Connection restored"}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
