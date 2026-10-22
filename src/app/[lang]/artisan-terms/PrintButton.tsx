"use client";

import { Printer } from "lucide-react";

interface PrintButtonProps {
  label: string;
}

export function PrintButton({ label }: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-primary/10 text-primary text-xs sm:text-sm font-bold shadow-xs hover:bg-primary/5 hover:border-primary/20 active:scale-95 transition-all cursor-pointer print:hidden"
    >
      <Printer className="w-4 h-4 text-accent" />
      <span>{label}</span>
    </button>
  );
}
