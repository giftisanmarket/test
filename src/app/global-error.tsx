"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import "./[lang]/globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-cream flex flex-col items-center justify-center text-center p-4 font-heading antialiased text-charcoal">
        <div className="max-w-md mx-auto space-y-6">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto border border-primary/10 shadow-xl text-accent">
            <AlertTriangle className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black text-primary">
              Application Error
            </h1>
            <p className="text-sm text-charcoal/70">
              A critical error occurred while loading Giftisan. We are working to restore service.
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-charcoal/40">
                Digest: {error.digest}
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-primary text-white font-bold text-sm shadow-md hover:bg-primary-light active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reload Giftisan</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

