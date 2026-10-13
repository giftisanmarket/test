"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname, useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";

export function FoundingBanner({ dict }: { dict: any }) {
  const { data: session } = useSession();
  const [isVisible, setIsVisible] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const lang = (params?.lang as string) || "en";

  useEffect(() => {
    const isDismissed = localStorage.getItem("giftisan-founding-banner-dismissed");
    if (isDismissed) setIsVisible(false);
  }, []);

  // Hide banner if user is already an artisan or on the become-artisan page
  if (session?.user?.role === "ARTISAN" || pathname.includes("/become-artisan")) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    localStorage.setItem("giftisan-founding-banner-dismissed", "true");
  };

  const isArabic = lang === "ar";

  const messageDesktop = isArabic
    ? "هل أنت صانع أو حرفي مصري؟ انضم لجيفتيزان بعمولة 0% خلال 2026"
    : "Are you an Egyptian artisan? Join Giftisan with 0% platform fees in 2026";

  const messageMobile = isArabic
    ? "صانع أو حرفي مصري؟ انضم بعمولة 0% في 2026"
    : "Egyptian artisan? 0% fees in 2026";

  const ctaText = isArabic ? "قدّم متجرك" : "Apply Now";

  const handleNavigate = () => {
    router.push(`/${lang}/become-artisan`);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.aside
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          aria-label={isArabic ? "إعلان الانضمام للحرفيين" : "Artisan recruitment announcement"}
          className="relative z-[61] overflow-hidden bg-[#064E3B] text-white/90 border-b border-white/10"
        >
          <div className="max-w-[1600px] 2xl:max-w-[1720px] 3xl:max-w-[1840px] mx-auto px-3 sm:px-4 md:px-8 2xl:px-12 3xl:px-16 pe-9 sm:pe-10 md:pe-12 2xl:pe-16 py-2 sm:py-1.5 flex items-center justify-center text-center text-xs 2xl:text-sm">
            <div
              onClick={handleNavigate}
              className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 cursor-pointer group"
            >
              <span className="font-medium text-white/90 group-hover:text-white transition-colors">
                <span className="hidden sm:inline">{messageDesktop}</span>
                <span className="sm:hidden">{messageMobile}</span>
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-[#FBBF24] group-hover:text-[#FDE68A] group-hover:underline underline-offset-2 transition-colors shrink-0 whitespace-nowrap">
                <span>{ctaText}</span>
                <ArrowRight className="w-3 h-3 rtl:rotate-180 shrink-0" />
              </span>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="absolute end-2 sm:end-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-white/10 active:bg-white/20 rounded-full transition-colors z-10 flex items-center justify-center cursor-pointer text-white/70 hover:text-white"
              aria-label={isArabic ? "إغلاق الإعلان" : "Dismiss announcement"}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
