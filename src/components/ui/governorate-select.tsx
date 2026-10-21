"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, MapPin, Search, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { EGYPT_GOVERNORATES } from "@/lib/egypt-governorates";
import { cn } from "@/lib/utils";

interface GovernorateSelectProps {
  value: string;
  onChange: (govId: string) => void;
  isAr: boolean;
  hasError?: boolean;
  className?: string;
  buttonClassName?: string;
  placeholder?: string;
}

export function GovernorateSelect({
  value,
  onChange,
  isAr,
  hasError,
  className,
  buttonClassName,
  placeholder,
}: GovernorateSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedGov = EGYPT_GOVERNORATES.find((g) => g.id === value);

  // Filter governorates by search query
  const filteredGovs = EGYPT_GOVERNORATES.filter((g) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      g.nameEn.toLowerCase().includes(q) ||
      g.nameAr.includes(q)
    );
  });

  // Check available viewport space when opening to prevent clipping
  const toggleDropdown = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUpward(spaceBelow < 280 && spaceAbove > 280);
    }
    setIsOpen((prev) => !prev);
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative w-full", isOpen ? "z-50" : "z-10", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        className={cn(
          "w-full h-12 px-3.5 bg-white border rounded-xl transition-all flex items-center justify-between text-start cursor-pointer shadow-2xs hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15",
          hasError 
            ? "border-red-500 ring-2 ring-red-100" 
            : "border-primary/20",
          buttonClassName
        )}
      >
        <div className="flex items-center gap-2 min-w-0 me-2">
          <MapPin className="w-4 h-4 text-emerald-800 shrink-0" />
          <span className={cn("text-sm font-medium truncate", selectedGov ? "text-[#222222]" : "text-charcoal/40")}>
            {selectedGov 
              ? (isAr ? selectedGov.nameAr : selectedGov.nameEn)
              : placeholder || (isAr ? "-- اختر المحافظة --" : "-- Select Governorate --")}
          </span>
        </div>

        <ChevronDown className={cn("w-4 h-4 text-charcoal/40 transition-transform duration-200 shrink-0", isOpen && "rotate-180 text-emerald-800")} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: openUpward ? -4 : 4, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUpward ? -4 : 4, scale: 0.99 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute left-0 right-0 bg-white rounded-xl border border-primary/20 shadow-2xl z-50 overflow-hidden p-1.5",
              openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
            )}
          >
            {/* Quick Search Bar */}
            <div className="relative mb-1.5 px-0.5 pt-0.5">
              <Search className={cn("w-3.5 h-3.5 text-charcoal/40 absolute top-1/2 -translate-y-1/2", isAr ? "right-3" : "left-3")} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isAr ? "ابحث عن محافظة..." : "Search governorate..."}
                className={cn(
                  "w-full h-8 border border-primary/10 rounded-lg text-xs font-medium text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-1 focus:ring-emerald-800 focus:bg-white transition-all bg-cream/40",
                  isAr ? "pe-8 ps-3" : "ps-8 pe-3"
                )}
                autoFocus
              />
            </div>

            {/* List Items */}
            <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar pe-1">
              {filteredGovs.length === 0 ? (
                <div className="py-4 text-center text-xs font-medium text-charcoal/40">
                  {isAr ? "لم يتم العثور على نتائج" : "No governorate found"}
                </div>
              ) : (
                filteredGovs.map(gov => {
                  const isSelected = gov.id === value;
                  return (
                    <button
                      key={gov.id}
                      type="button"
                      onClick={() => {
                        onChange(gov.id);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className={cn(
                        "w-full px-3 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-between transition-colors text-start",
                        isSelected 
                          ? "bg-emerald-800 text-white font-semibold shadow-2xs" 
                          : "text-charcoal/80 hover:bg-cream/60 hover:text-[#222222]"
                      )}
                    >
                      <span className="truncate">{isAr ? gov.nameAr : gov.nameEn}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ms-2" />}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
