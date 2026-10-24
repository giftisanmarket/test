"use client";

import { Printer } from "lucide-react";

interface PrintButtonProps {
  label: string;
}

export function PrintButton({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`inline-flex items-center justify-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full sm:rounded-xl bg-white border border-primary/10 text-primary text-xs sm:text-sm font-bold shadow-xs hover:bg-primary/5 hover:border-primary/20 active:scale-95 transition-all cursor-pointer print:hidden shrink-0 whitespace-nowrap ${className}`}
    >
      <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent shrink-0" />
      <span>{label}</span>
    </button>
  );
}
