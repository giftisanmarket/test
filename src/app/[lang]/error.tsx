"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { usePathname } from "next/navigation";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const isAr = pathname?.startsWith("/ar");

  useEffect(() => {
    console.error("Storefront runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16 relative overflow-hidden bg-cream">
      {/* Decorative ambient background */}
      <div className="absolute top-1/3 left-1/2 w-96 h-96 bg-accent/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="relative z-10 max-w-lg mx-auto space-y-6">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto border border-primary/10 shadow-xl shadow-primary/5 text-accent">
          <AlertTriangle className="w-10 h-10 stroke-[1.75]" />
        </div>

        <div className="space-y-2.5">
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-primary tracking-tight">
            {isAr ? "حدث خطأ غير متوقع" : "Something went wrong"}
          </h1>
          <p className="text-sm sm:text-base text-charcoal/70 leading-relaxed max-w-md mx-auto">
            {isAr
              ? "نعتذر عن هذا الخطأ المؤقت. نعمل باستمرار لتقديم أفضل تجربة لتسوق الحرف اليدوية."
              : "We ran into an unexpected issue while rendering this artisanal piece. Please try again or return to the gallery."}
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-charcoal/40 pt-1">
              Ref: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto min-w-[160px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-light active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isAr ? "إعادة المحاولة" : "Try Again"}</span>
          </button>
          <Link
            href={isAr ? "/ar" : "/en"}
            className="w-full sm:w-auto min-w-[160px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-primary border border-primary/15 font-bold text-sm shadow-xs hover:bg-cream active:scale-95 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>{isAr ? "الرئيسية" : "Home"}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

