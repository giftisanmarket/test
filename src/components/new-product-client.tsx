"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, memo, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { EtsyCategoryPicker } from "@/components/studio/etsy-category-picker";
import {
  ArrowLeft,
  Upload,
  Sparkles,
  DollarSign,
  Tag,
  Type,
  Image as ImageIcon,
  CheckCircle2,
  ChevronDown,
  Video,
  Loader2,
  ShieldCheck,
  X,
  Trash2,
  Star,
  Plus,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createProduct, updateProduct } from "@/lib/actions";
import { uploadMediaToCloudinary } from "@/lib/client-upload";
import { cn, stripEmojis } from "@/lib/utils";
import { toast } from "react-hot-toast";

interface ProductVariantData {
  id?: string;
  name: string;
  price: number | string;
  stock: number | string;
  sku?: string | null;
  image?: string | null;
  options?: any;
}

interface ProductInitialData {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  canPersonalize: boolean;
  personalizationPrompt?: string | null;
  requiresClientImage: boolean;
  clientImagePrompt?: string | null;
  stock: number;
  variants: ProductVariantData[];
}

interface NewProductClientProps {
  artisanId: string;
  dict: any;
  lang?: string;
  /** When provided, the form operates in edit mode */
  initialData?: ProductInitialData;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_DURATION = 30; // 30 seconds

const VariantRow = memo(({ v, i, variants, setVariants, dict }: any) => (
  <tr className="hover:bg-cream/20 transition-colors group">
    <td className="px-6 py-4">
      <div className="relative w-12 h-12 bg-cream rounded-xl overflow-hidden border border-primary/5 flex items-center justify-center group/img">
        {v.image ? (
          <img src={v.image} className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-5 h-5 text-primary/20" />
        )}
        <input 
          type="file" 
          accept="image/*"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onloadend = () => {
                const img = new (window as any).Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  let width = img.width;
                  let height = img.height;
                  const MAX_RES = 1080;
                  if (width > height) { if (width > MAX_RES) { height *= MAX_RES / width; width = MAX_RES; } }
                  else { if (height > MAX_RES) { width *= MAX_RES / height; height = MAX_RES; } }
                  canvas.width = width; canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  if (ctx) { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, width, height); }
                  
                  const previewUrl = canvas.toDataURL('image/webp', 0.8);
                  setVariants((prev: any[]) => {
                    const next = [...prev];
                    if (next[i]) next[i] = { ...next[i], image: previewUrl };
                    return next;
                  });

                  canvas.toBlob(async (blob) => {
                    const cloudUrl = await uploadMediaToCloudinary(blob || file, previewUrl);
                    if (cloudUrl) {
                      setVariants((prev: any[]) => {
                        const next = [...prev];
                        if (next[i]) next[i] = { ...next[i], image: cloudUrl };
                        return next;
                      });
                    }
                  }, 'image/webp', 0.8);
                };
                img.src = reader.result as string;
              };
              reader.readAsDataURL(file);
            }
          }}
        />
      </div>
    </td>
    <td className="px-6 py-4 font-bold text-primary">{v.name}</td>
    <td className="px-6 py-4">
      <input 
        type="number" 
        value={v.price}
        onChange={(e) => {
          const newVariants = [...variants];
          newVariants[i] = { ...newVariants[i], price: e.target.value };
          setVariants(newVariants);
        }}
        className="w-24 h-10 bg-white border border-primary/20 rounded-xl px-3 focus:outline-none focus:border-accent font-bold"
      />
    </td>
    <td className="px-6 py-4">
      <div className="space-y-1">
        <input 
          type="number" 
          min="1"
          value={v.stock}
          onChange={(e) => {
            const newVariants = [...variants];
            newVariants[i] = { ...newVariants[i], stock: e.target.value };
            setVariants(newVariants);
          }}
          className={cn(
            "w-20 h-10 bg-white border rounded-xl px-3 focus:outline-none font-bold",
            parseInt(v.stock) <= 0 ? "border-orange-300 focus:border-orange-500" : "border-primary/20 focus:border-accent"
          )}
        />
        {parseInt(v.stock) <= 0 && (
          <p className="text-[8px] font-black uppercase text-orange-500 tracking-tighter">{dict.edit_product.low_stock}!</p>
        )}
      </div>
    </td>


    <td className="px-6 py-4 text-end">
      <button 
        type="button"
        onClick={() => setVariants(variants.filter((_: any, idx: number) => idx !== i))}
        className="text-red-400 hover:text-red-500 transition-colors lg:opacity-0 lg:group-hover:opacity-100 opacity-100"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </td>
  </tr>
));

VariantRow.displayName = "VariantRow";

const VariantCard = memo(({ v, i, variants, setVariants, dict }: any) => {
  const isAr = dict?.common?.home === "الرئيسية" || dict?.new_product?.the_essentials === "الأساسيات";

  return (
    <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-primary/10 shadow-xs space-y-3.5 sm:space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 bg-cream rounded-xl overflow-hidden border border-primary/10 flex items-center justify-center shrink-0 group/img">
            {v.image ? (
              <img src={v.image} className="w-full h-full object-cover" alt={v.name} />
            ) : (
              <div className="flex flex-col items-center justify-center text-primary/30 group-hover/img:text-accent transition-colors">
                <ImageIcon className="w-5 h-5" />
                <span className="text-[7px] font-bold uppercase mt-0.5 opacity-70">+ Photo</span>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              title={dict.edit_product?.upload_image || "Upload variant image"}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const img = new (window as any).Image();
                    img.onload = () => {
                      const canvas = document.createElement('canvas');
                      let width = img.width;
                      let height = img.height;
                      const MAX_RES = 1080;
                      if (width > height) { if (width > MAX_RES) { height *= MAX_RES / width; width = MAX_RES; } }
                      else { if (height > MAX_RES) { width *= MAX_RES / height; height = MAX_RES; } }
                      canvas.width = width; canvas.height = height;
                      const ctx = canvas.getContext('2d');
                      if (ctx) { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, width, height); }
                      
                      const previewUrl = canvas.toDataURL('image/webp', 0.8);
                      setVariants((prev: any[]) => {
                        const next = [...prev];
                        if (next[i]) next[i] = { ...next[i], image: previewUrl };
                        return next;
                      });

                      canvas.toBlob(async (blob) => {
                        const cloudUrl = await uploadMediaToCloudinary(blob || file, previewUrl);
                        if (cloudUrl) {
                          setVariants((prev: any[]) => {
                            const next = [...prev];
                            if (next[i]) next[i] = { ...next[i], image: cloudUrl };
                            return next;
                          });
                        }
                      }, 'image/webp', 0.8);
                    };
                    img.src = reader.result as string;
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm sm:text-base text-primary truncate" title={v.name}>{v.name}</p>
            <span className="text-[10px] font-semibold text-primary/40 uppercase tracking-wider block">
              {dict.edit_product?.variant || (isAr ? "تشكيلة" : "Variant")} #{i + 1}
            </span>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => {
            setVariants(variants.filter((_: any, idx: number) => idx !== i));
            toast.success(dict.edit_product?.removed_option || (isAr ? "تم حذف التشكيلة" : "Variant removed"));
          }}
          className="p-2 sm:px-2.5 sm:py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95 shrink-0"
          title={dict.common?.remove || (isAr ? "حذف التشكيلة" : "Delete Variant")}
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">{dict.common?.remove || (isAr ? "حذف" : "Delete")}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-primary/60 flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-accent shrink-0" />
            <span className="truncate">{dict.new_product.price_label}</span>
          </label>
          <input 
            type="number" 
            step="any"
            min="0"
            placeholder="0.00"
            value={v.price ?? ""}
            onChange={(e) => {
              const newVariants = [...variants];
              newVariants[i] = { ...newVariants[i], price: e.target.value };
              setVariants(newVariants);
            }}
            className="w-full h-10 bg-cream/40 border border-primary/15 rounded-xl px-3 font-bold text-sm text-primary placeholder:text-primary/30 focus:bg-white focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none transition-all shadow-xs"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-primary/60 flex items-center gap-1">
            <Tag className="w-3 h-3 text-accent shrink-0" />
            <span className="truncate">{dict.new_product.initial_stock_label}</span>
          </label>
          <input 
            type="number" 
            min="0"
            placeholder="1"
            value={v.stock ?? ""}
            onChange={(e) => {
              const newVariants = [...variants];
              newVariants[i] = { ...newVariants[i], stock: e.target.value };
              setVariants(newVariants);
            }}
            className={cn(
              "w-full h-10 bg-cream/40 border rounded-xl px-3 font-bold text-sm text-primary placeholder:text-primary/30 focus:bg-white focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none transition-all shadow-xs",
              parseInt(v.stock) <= 0 ? "border-orange-300 focus:border-orange-500" : "border-primary/15"
            )}
          />
          {parseInt(v.stock) <= 0 && (
            <p className="text-[9px] font-bold text-orange-500 tracking-tight">
              {dict.edit_product?.low_stock || (isAr ? "مخزون منخفض!" : "Low stock!")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

VariantCard.displayName = "VariantCard";

const OptionValueInput = memo(({ optIdx, onAddValue, dict }: { optIdx: number; onAddValue: (optIdx: number, val: string) => void; dict: any }) => {
  const [val, setVal] = useState("");

  const handleCommit = useCallback(() => {
    const trimmed = val.trim().replace(/,/g, "");
    if (trimmed) {
      onAddValue(optIdx, trimmed);
      setVal("");
    }
  }, [optIdx, onAddValue, val]);

  return (
    <div className="flex items-center gap-1.5 bg-white border border-primary/20 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10 rounded-full px-3 py-1 shadow-xs transition-all">
      <input
        type="text"
        value={val}
        placeholder={dict.edit_product?.add_value || "Add value..."}
        onChange={(e) => {
          const text = e.target.value;
          if (text.includes(",")) {
            const parts = text.split(",");
            parts.forEach((p) => {
              const cleaned = p.trim();
              if (cleaned) onAddValue(optIdx, cleaned);
            });
            setVal("");
          } else {
            setVal(text);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.keyCode === 13 || e.which === 13) {
            e.preventDefault();
            e.stopPropagation();
            handleCommit();
          }
        }}
        onBlur={() => {
          handleCommit();
        }}
        className="bg-transparent border-none focus:outline-none text-xs font-bold w-24 sm:w-28 text-primary placeholder:text-primary/40 min-w-0"
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleCommit();
        }}
        className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95",
          val.trim() ? "bg-accent text-white hover:bg-accent/90 cursor-pointer shadow-xs" : "bg-primary/10 text-primary/30 cursor-default"
        )}
        title={dict.edit_product?.add_value || "Add value"}
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
});

OptionValueInput.displayName = "OptionValueInput";

const VariationsSection = memo(({ dict, options, setOptions, variants, setVariants, basePrice }: any) => {
  const isAr = dict?.common?.home === "الرئيسية" || dict?.new_product?.the_essentials === "الأساسيات";
  const [hasVariations, setHasVariations] = useState(options.length > 0 || variants.length > 0);
  const [newOptionName, setNewOptionName] = useState("");
  const [showBulkStockModal, setShowBulkStockModal] = useState(false);
  const [bulkStockVal, setBulkStockVal] = useState("5");

  const addOption = () => {
    if (newOptionName.trim()) {
      setOptions([...options, { name: newOptionName.trim(), values: [] }]);
      setNewOptionName("");
    }
  };

  const addValue = (optIdx: number, val: string) => {
    if (!val.trim()) return;
    const newOptions = [...options];
    if (!newOptions[optIdx].values.includes(val.trim())) {
      newOptions[optIdx].values.push(val.trim());
      setOptions(newOptions);
    }
  };

  const removeValue = (optIdx: number, valIdx: number) => {
    const newOptions = [...options];
    newOptions[optIdx].values.splice(valIdx, 1);
    setOptions(newOptions);
  };

  const generateVariants = () => {
    const combos = options.reduce((acc: any[], opt: any) => {
      if (opt.values.length === 0) return acc;
      const nextCombos: any[] = [];
      opt.values.forEach((val: string) => {
        if (acc.length === 0) {
          nextCombos.push({ [opt.name]: val });
        } else {
          acc.forEach((combo: any) => {
            nextCombos.push({ ...combo, [opt.name]: val });
          });
        }
      });
      return nextCombos;
    }, [] as any[]);

    const newVariants = combos.map((combo: any) => {
      const name = Object.values(combo).join(" / ");
      return {
        name,
        price: basePrice,
        stock: "1",
        sku: "",
        options: combo
      };
    });
    setVariants(newVariants);
  };

  return (
    <section className="bg-white rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-7 md:p-10 shadow-2xl shadow-primary/5 border border-primary/5 transition-all">
      <div 
        onClick={() => {
          const next = !hasVariations;
          setHasVariations(next);
          if (!next) {
            setOptions([]);
            setVariants([]);
          }
        }}
        className="flex items-center justify-between gap-3 cursor-pointer select-none group"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent shrink-0 group-hover:scale-105 transition-transform">
            <Tag className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h2 className="text-lg sm:text-xl md:text-2xl font-heading font-bold text-primary">
                {dict.edit_product?.variations || (isAr ? "خيارات المنتج" : "Product Variations")}
              </h2>
              {hasVariations && variants.length > 0 && (
                <span className="text-[10px] font-black uppercase tracking-wider text-accent bg-accent/10 px-2.5 py-0.5 rounded-full shrink-0">
                  {variants.length} {isAr ? "خيارات" : (dict.edit_product?.variants || "Variants")}
                </span>
              )}
            </div>
            <p className="text-xs text-charcoal/50 mt-0.5 line-clamp-2 sm:line-clamp-none">
              {dict.edit_product?.has_variations_desc || (isAr ? "هل تتوفر هذه القطعة بخيارات متعددة مثل المقاس، اللون، أو الخامة؟" : "Does this piece come in multiple options (like size, color, or material)?")}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className={cn(
          "w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out shrink-0",
          hasVariations ? "bg-accent" : "bg-primary/10 group-hover:bg-primary/20"
        )}>
          <div className={cn(
            "w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out",
            hasVariations ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0"
          )} />
        </div>
      </div>

      <AnimatePresence>
        {hasVariations && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden pt-5 sm:pt-6 mt-5 sm:mt-6 border-t border-primary/5 space-y-5 sm:space-y-6"
          >
            <div className="space-y-5 sm:space-y-6">
              {/* Quick Option Preset Chips */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/40 block">
                  {dict.edit_product?.quick_presets || (isAr ? "خيارات سريعة:" : "Quick Presets:")}
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap no-scrollbar -mx-1 px-1">
                  {[
                    { id: "color", label: dict.edit_product?.preset_color || (isAr ? "اللون" : "Color") },
                    { id: "size", label: dict.edit_product?.preset_size || (isAr ? "المقاس" : "Size") },
                    { id: "material", label: dict.edit_product?.preset_material || (isAr ? "الخامة" : "Material") },
                    { id: "finish", label: dict.edit_product?.preset_finish || (isAr ? "التشطيب" : "Finish") },
                    { id: "style", label: dict.edit_product?.preset_style || (isAr ? "النمط" : "Style") },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        if (!options.some((o: any) => o.name.toLowerCase() === preset.label.toLowerCase())) {
                          setOptions([...options, { name: preset.label, values: [] }]);
                          toast.success(`${dict.edit_product?.added_option || (isAr ? "تمت إضافة الخيار" : "Added option")}: ${preset.label}`);
                        }
                      }}
                      className="px-3 py-1.5 bg-primary/5 hover:bg-accent/10 hover:text-accent border border-primary/10 rounded-full text-xs font-bold text-primary transition-all active:scale-95 flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3 h-3 text-accent" />
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4">
                  <input 
                    type="text" 
                    placeholder={dict.edit_product?.option_name_placeholder || (isAr ? "مثال: اللون، المقاس" : "e.g. Color, Size")}
                    value={newOptionName}
                    onChange={(e) => setNewOptionName(e.target.value)}
                    className="flex-1 py-3 sm:py-3.5 px-4 sm:px-6 bg-white border border-primary/20 rounded-xl sm:rounded-2xl focus:outline-none focus:border-accent font-bold text-sm sm:text-base shadow-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
                        e.preventDefault();
                        e.stopPropagation();
                        addOption();
                      }
                    }}
                  />
                  <button 
                    type="button" 
                    onClick={addOption}
                    className="h-12 sm:h-auto py-3 px-6 sm:px-8 bg-primary text-white font-bold rounded-xl sm:rounded-2xl hover:bg-primary-light transition-all shadow-md active:scale-95 whitespace-nowrap flex items-center justify-center gap-2 text-sm sm:text-base shrink-0"
                  >
                    <Plus className="w-4 h-4 text-accent" />
                    <span>{dict.edit_product?.add_option || (isAr ? "إضافة خيار" : "Add Option")}</span>
                  </button>
                </div>
                <p className="text-[10px] font-bold text-accent/60 uppercase tracking-widest px-2">
                  {dict.edit_product?.enter_to_add || (isAr ? "اضغط Enter للإضافة" : "PRESS ENTER TO ADD")}
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {options.map((opt: any, optIdx: number) => (
                  <div key={optIdx} className="p-3.5 sm:p-5 bg-cream/30 rounded-2xl border border-primary/5 space-y-3">
                    <div className="flex justify-between items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-primary flex items-center gap-1.5 min-w-0">
                        <Tag className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="truncate">{opt.name}</span>
                      </h4>
                      <button 
                        type="button" 
                        onClick={() => {
                          setOptions(options.filter((_: any, i: number) => i !== optIdx));
                          toast.success(`${dict.edit_product?.removed_option || "Removed option"}: ${opt.name}`);
                        }}
                        className="px-2.5 sm:px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95 shadow-xs shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{dict.edit_product?.delete_option || dict.common?.remove || (isAr ? "حذف الخيار" : "Delete Option")}</span>
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        {opt.values.map((val: string, valIdx: number) => (
                          <span key={valIdx} className="px-3 py-1 bg-white border border-primary/10 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs max-w-[160px] truncate animate-in zoom-in-50">
                            <span className="truncate">{val}</span>
                            <button type="button" onClick={() => removeValue(optIdx, valIdx)} className="text-red-400 hover:text-red-500 transition-colors shrink-0">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <OptionValueInput optIdx={optIdx} onAddValue={addValue} dict={dict} />
                      </div>
                      <p className="text-[9px] sm:text-[10px] font-bold text-accent/50 uppercase tracking-wider px-1">
                        {dict.edit_product.enter_to_add}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {options.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4">
                  <button 
                    type="button"
                    onClick={generateVariants}
                    className="w-full sm:flex-1 py-3.5 sm:py-4 px-4 border-2 border-dashed border-accent/20 hover:border-accent text-accent font-black uppercase tracking-widest rounded-xl sm:rounded-2xl hover:bg-accent/5 transition-all active:scale-[0.99] text-[11px] sm:text-xs md:text-sm flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>{dict.edit_product.generate_variants}</span>
                  </button>
                  {variants.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full sm:w-auto sm:flex sm:flex-wrap">
                      <button 
                        type="button"
                        onClick={() => {
                          if (!basePrice || String(basePrice).trim() === "" || Number(basePrice) <= 0) {
                            toast.error(dict.edit_product?.enter_base_price_first || "Please enter a Base Price first!");
                            return;
                          }
                          const newVariants = variants.map((v: any) => ({ ...v, price: String(basePrice) }));
                          setVariants(newVariants);
                          toast.success(dict.edit_product.prices_synced);
                        }}
                        className="w-full sm:w-auto px-3 sm:px-6 py-3 sm:py-4 bg-cream text-primary border border-primary/10 font-bold rounded-xl sm:rounded-2xl hover:bg-cream/60 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm active:scale-95"
                      >
                        <DollarSign className="w-4 h-4 text-accent shrink-0" />
                        <span className="truncate">{dict.edit_product.apply_base_price}</span>
                      </button>

                      <button 
                        type="button"
                        onClick={() => setShowBulkStockModal(true)}
                        className="w-full sm:w-auto px-3 sm:px-6 py-3 sm:py-4 bg-primary/5 text-primary border border-primary/10 font-bold rounded-xl sm:rounded-2xl hover:bg-primary/10 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm active:scale-95"
                      >
                        <Tag className="w-4 h-4 text-accent shrink-0" />
                        <span className="truncate">{dict.edit_product?.set_bulk_stock || (isAr ? "تحديد المخزون للكل" : "Set Bulk Stock")}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {variants.length > 0 && (
                <div className="space-y-4">
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto rounded-[2rem] border border-primary/10 shadow-inner">
                    <table className="w-full text-start text-xs">
                      <thead className="bg-primary/5 text-primary/40 font-black uppercase tracking-tighter">
                        <tr>
                          <th className="px-6 py-4 text-start w-12"></th>
                          <th className="px-6 py-4 text-start">{dict.edit_product.variant_name}</th>
                          <th className="px-6 py-4 text-start">{dict.new_product.price_label}</th>
                          <th className="px-6 py-4 text-start">{dict.new_product.initial_stock_label}</th>
                          <th className="px-4 py-4 text-end"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-primary/5">
                        {variants.map((v: any, i: number) => (
                          <VariantRow key={i} v={v} i={i} variants={variants} setVariants={setVariants} dict={dict} />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-3 sm:space-y-4">
                    {variants.map((v: any, i: number) => (
                      <VariantCard key={i} v={v} i={i} variants={variants} setVariants={setVariants} dict={dict} />
                    ))}
                  </div>
                </div>
              )}

              {/* Bulk Stock Modal */}
              <AnimatePresence>
                {showBulkStockModal && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 15 }}
                      className="w-full max-w-md bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl border border-primary/10 space-y-5 sm:space-y-6"
                    >
                      <div className="flex items-center justify-between pb-4 border-b border-primary/5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
                            <Tag className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-heading font-bold text-lg text-primary">
                              {dict.edit_product?.set_bulk_stock || (isAr ? "تحديد المخزون للكل" : "Set Bulk Stock")}
                            </h3>
                            <p className="text-xs text-primary/50 font-medium">
                              {dict.edit_product?.bulk_stock_desc || (isAr ? "أدخل الكمية المتاحة لجميع الخيارات" : "Enter stock quantity for all variants")}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowBulkStockModal(false)}
                          className="p-2 rounded-xl text-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-5 sm:space-y-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-primary/60 uppercase tracking-wider">
                            {dict.new_product?.initial_stock_label || (isAr ? "الكمية" : "Quantity")}
                          </label>
                          <input
                            type="number"
                            min="0"
                            autoFocus
                            value={bulkStockVal}
                            onChange={(e) => setBulkStockVal(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (bulkStockVal !== "" && !isNaN(Number(bulkStockVal))) {
                                  const newVariants = variants.map((v: any) => ({ ...v, stock: bulkStockVal }));
                                  setVariants(newVariants);
                                  toast.success(
                                    dict.edit_product?.stock_set_success
                                      ? dict.edit_product.stock_set_success.replace("{count}", bulkStockVal)
                                      : (isAr ? `تم تحديد المخزون إلى ${bulkStockVal} لجميع الخيارات` : `Set stock to ${bulkStockVal} for all variants`)
                                  );
                                  setShowBulkStockModal(false);
                                }
                              }
                            }}
                            placeholder={dict.edit_product?.bulk_stock_placeholder || (isAr ? "مثال: 5" : "e.g. 5")}
                            className="w-full h-12 px-4 bg-cream/30 border border-primary/10 rounded-2xl font-bold text-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                          />
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowBulkStockModal(false)}
                            className="flex-1 py-3.5 px-4 bg-cream hover:bg-cream/70 text-primary font-bold rounded-2xl transition-all text-sm"
                          >
                            {dict.common?.cancel || (isAr ? "إلغاء" : "Cancel")}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (bulkStockVal !== "" && !isNaN(Number(bulkStockVal))) {
                                const newVariants = variants.map((v: any) => ({ ...v, stock: bulkStockVal }));
                                setVariants(newVariants);
                                toast.success(
                                  dict.edit_product?.stock_set_success
                                    ? dict.edit_product.stock_set_success.replace("{count}", bulkStockVal)
                                    : (isAr ? `تم تحديد المخزون إلى ${bulkStockVal} لجميع الخيارات` : `Set stock to ${bulkStockVal} for all variants`)
                                );
                                setShowBulkStockModal(false);
                              }
                            }}
                            className="flex-1 py-3.5 px-4 bg-accent hover:bg-accent/90 text-white font-bold rounded-2xl transition-all shadow-md shadow-accent/20 active:scale-95 text-sm"
                          >
                            {dict.edit_product?.apply_stock || dict.common?.apply || (isAr ? "تطبيق الكمية" : "Apply Stock")}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
});

VariationsSection.displayName = "VariationsSection";

export function NewProductClient({ artisanId, dict, lang: propLang, initialData }: NewProductClientProps) {
  const router = useRouter();
  const params = useParams();
  const lang = propLang || (params?.lang as string) || "en";
  const isAr = lang === "ar" || dict?.common?.home === "الرئيسية" || dict?.new_product?.the_essentials === "الأساسيات";
  const isEditMode = Boolean(initialData);
  const [isLoading, setIsLoading] = useState(false);

  // Pad images array to always have 10 slots
  const padImages = (imgs: string[]) => {
    const padded = [...imgs];
    while (padded.length < 10) padded.push("");
    return padded;
  };

  const [formData, setFormData] = useState({
    name: initialData?.name ?? "",
    description: initialData?.description ?? "",
    price: initialData ? String(initialData.price) : "",
    category: initialData?.category ?? "ceramics",
    images: initialData ? padImages(initialData.images) : ["", "", "", "", "", "", "", "", "", ""],
    canPersonalize: initialData?.canPersonalize ?? false,
    personalizationPrompt: initialData?.personalizationPrompt ?? "",
    requiresClientImage: initialData?.requiresClientImage ?? false,
    clientImagePrompt: initialData?.clientImagePrompt ?? "",
    badge: "",
    stock: initialData ? String(initialData.stock) : "1"
  });

  const [options, setOptions] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>(
    initialData?.variants
      ? initialData.variants.map((v) => ({
          name: v.name,
          price: String(v.price),
          stock: String(v.stock),
          sku: v.sku ?? "",
          image: v.image ?? "",
          options: v.options ?? {}
        }))
      : []
  );
  const [isCompressing, setIsCompressing] = useState<Record<number, boolean>>({});
  const [resolutions, setResolutions] = useState<Record<number, string>>({});

  // Ensure page scrolls to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  // Detect resolutions for existing media
  useEffect(() => {
    formData.images.forEach((img, idx) => {
      if (img && !resolutions[idx]) {
        if (img.includes('video') || img.match(/\.(mp4|webm|ogg|mov)/i)) {
          const video = document.createElement('video');
          video.src = img;
          video.onloadedmetadata = () => {
            setResolutions(prev => ({ ...prev, [idx]: `${video.videoWidth}×${video.videoHeight}` }));
          };
        } else {
          const i = new (window as any).Image();
          i.onload = () => {
            setResolutions(prev => ({ ...prev, [idx]: `${i.width}×${i.height}` }));
          };
          i.src = img;
        }
      }
    });
  }, [formData.images, resolutions]);



  const handleImageChange = useCallback((index: number, value: string) => {
    // Functional update: batch uploads finish asynchronously, so always merge into the latest state
    setFormData((prev: any) => {
      const newImages = [...prev.images];
      newImages[index] = value;
      return { ...prev, images: newImages };
    });
    if (!value) {
      setResolutions(prev => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setFormData((prev: any) => {
      const nextImages = prev.images.filter((_: string, i: number) => i !== index);
      while (nextImages.length < 10) nextImages.push("");
      return { ...prev, images: nextImages };
    });

    setResolutions(prev => {
      const next: Record<number, string> = {};
      const keys = Object.keys(prev).map(Number).sort((a, b) => a - b);
      let newIdx = 0;
      keys.forEach((k) => {
        if (k !== index && prev[k]) {
          next[newIdx] = prev[k];
          newIdx++;
        }
      });
      return next;
    });
  }, []);

  // Media Gallery Best Practice Helpers
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleSetAsCover = useCallback((idx: number) => {
    if (idx === 0 || !formData.images[idx]) return;
    setFormData((prev: any) => {
      const newImages = [...prev.images];
      const temp = newImages[0];
      newImages[0] = newImages[idx];
      newImages[idx] = temp;
      return { ...prev, images: newImages };
    });

    setResolutions(prev => {
      const next = { ...prev };
      const tempRes = next[0];
      next[0] = next[idx];
      next[idx] = tempRes;
      return next;
    });

    toast.success(dict.new_product?.set_as_cover_success || "Set as main cover photo!");
  }, [formData.images, dict]);

  const processSingleFile = useCallback((file: File, idx: number) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(dict.home?.upload_rules?.format_error || "Invalid file format");
      return;
    }

    if (file.type.startsWith('image/') && file.size > MAX_IMAGE_SIZE) {
      toast.error(dict.home?.upload_rules?.image_size_error || "Image size exceeds limit");
      return;
    }
    if (file.type.startsWith('video/') && file.size > MAX_VIDEO_SIZE) {
      toast.error(dict.home?.upload_rules?.video_size_error || "Video size exceeds limit");
      return;
    }

    setIsCompressing(prev => ({ ...prev, [idx]: true }));

    if (file.type.startsWith('video/')) {
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoElement.src);
        if (videoElement.duration > MAX_VIDEO_DURATION) {
          toast.error(dict.home?.upload_rules?.video_duration_error || "Video duration exceeds limit");
          setIsCompressing(prev => ({ ...prev, [idx]: false }));
          return;
        }

        const objectUrl = URL.createObjectURL(file);
        handleImageChange(idx, objectUrl);
        setResolutions(prev => ({ ...prev, [idx]: `${videoElement.videoWidth}×${videoElement.videoHeight}` }));

        uploadMediaToCloudinary(file).then(cloudUrl => {
          if (cloudUrl) {
            handleImageChange(idx, cloudUrl);
          } else {
            toast.error(isAr ? "فشل رفع الفيديو، يرجى المحاولة مجدداً" : "Failed to upload video, please try again");
            handleRemoveImage(idx);
          }
          setIsCompressing(prev => ({ ...prev, [idx]: false }));
        }).catch(err => {
          console.error("Video upload error:", err);
          toast.error(isAr ? "فشل رفع الفيديو" : "Failed to upload video");
          handleRemoveImage(idx);
          setIsCompressing(prev => ({ ...prev, [idx]: false }));
        });
      };
      videoElement.src = URL.createObjectURL(file);
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new (window as any).Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_RES = 1600;
          if (width > height) { if (width > MAX_RES) { height *= MAX_RES / width; width = MAX_RES; } }
          else { if (height > MAX_RES) { width *= MAX_RES / height; height = MAX_RES; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, width, height); }
          const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const localDataUrl = canvas.toDataURL(outType, 0.85);

          handleImageChange(idx, localDataUrl);
          setResolutions(prev => ({ ...prev, [idx]: `${Math.round(width)}×${Math.round(height)}` }));

          canvas.toBlob(async (blob) => {
            try {
              const uploadTarget = blob || file;
              const cloudUrl = await uploadMediaToCloudinary(uploadTarget, localDataUrl);
              if (cloudUrl) {
                handleImageChange(idx, cloudUrl);
              } else {
                toast.error(isAr ? "فشل رفع الصورة، يرجى المحاولة مجدداً" : "Failed to upload image, please try again");
                handleRemoveImage(idx);
              }
            } catch (uploadErr) {
              console.error("Image upload error:", uploadErr);
              toast.error(isAr ? "حدث خطأ أثناء رفع الصورة" : "Error uploading image");
              handleRemoveImage(idx);
            } finally {
              setIsCompressing(prev => ({ ...prev, [idx]: false }));
            }
          }, outType, 0.85);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }, [dict, handleImageChange, handleRemoveImage, isAr]);

  const handleBatchFilesUpload = useCallback((files: FileList | File[], targetStartIdx?: number) => {
    const fileArray = Array.from(files);
    if (!fileArray.length) return;

    let emptyIndices = formData.images
      .map((img: string, idx: number) => (img ? -1 : idx))
      .filter((idx: number) => idx !== -1);

    if (targetStartIdx !== undefined && !formData.images[targetStartIdx]) {
      emptyIndices = [targetStartIdx, ...emptyIndices.filter((i: number) => i !== targetStartIdx)];
    }

    fileArray.forEach((file, i) => {
      if (i < emptyIndices.length) {
        processSingleFile(file, emptyIndices[i]);
      }
    });
  }, [formData.images, processSingleFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleBatchFilesUpload(e.dataTransfer.files);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (Object.values(isCompressing).some(Boolean)) {
      toast.error(
        isAr
          ? "يرجى الانتظار حتى يكتمل رفع الصور والفيديو..."
          : "Please wait while media finishes uploading..."
      );
      return;
    }

    const hasPendingBlob = formData.images.some((img: string) => img && img.startsWith("blob:"));
    if (hasPendingBlob) {
      toast.error(
        isAr
          ? "يرجى الانتظار حتى يكتمل رفع الوسائط..."
          : "Media is still uploading, please wait a few seconds..."
      );
      return;
    }

    setIsLoading(true);

    if (!formData.name || !formData.price || !formData.images[0]) {
      toast.error(dict.new_product.validation_error);
      setIsLoading(false);
      return;
    }

    if (formData.canPersonalize && !formData.personalizationPrompt.trim()) {
      toast.error(dict.new_product.personalization_prompt_required || "Please fill in the Personalization Instructions.");
      setIsLoading(false);
      return;
    }

    if (formData.requiresClientImage && !formData.clientImagePrompt.trim()) {
      toast.error(dict.new_product.client_image_prompt_required || "Please fill in the Customer Image Upload instructions.");
      setIsLoading(false);
      return;
    }

    const form = new FormData();
    form.append("name", formData.name);
    form.append("description", formData.description);
    form.append("price", formData.price.trim());
    form.append("category", formData.category);
    form.append("canPersonalize", formData.canPersonalize.toString());
    form.append("personalizationPrompt", formData.personalizationPrompt);
    form.append("requiresClientImage", formData.requiresClientImage.toString());
    form.append("clientImagePrompt", formData.clientImagePrompt);
    form.append("badge", "");
    form.append("stock", formData.stock.trim());

    formData.images.forEach((img, i) => {
      if (img) form.append(`image-${i}`, img);
    });

    form.append("variants", JSON.stringify(variants));

    try {
      let res: { success?: boolean; error?: string };

      if (isEditMode && initialData) {
        res = await updateProduct(initialData.id, form);
      } else {
        res = await createProduct(artisanId, form);
      }

      if (res.success) {
        if (isEditMode) {
          toast.success(isAr ? "تم حفظ التغييرات بنجاح! سيُعاد مراجعة منتجك." : "Changes saved! Your product will be re-reviewed before going live.");
        } else {
          toast.success(dict.new_product?.success_message || (isAr ? "تم إرسال منتجك بنجاح! سيتم مراجعته والموافقة عليه قريباً." : "Your product has been submitted for review and will be published once approved!"));
        }
        window.location.href = `/${lang}/studio`;
      } else {
        toast.error(res.error || (isAr ? "فشلت العملية. يرجى المحاولة مجدداً." : "Operation failed. Please try again."));
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error(dict.common?.error || (isAr ? "حدث خطأ في الاتصال. يرجى التحقق من الشبكة." : "A connection error occurred. Please check your signal."));
      setIsLoading(false);
    }
  };

  return (
    <main className="w-full max-w-[1600px] xl:max-w-[1760px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 sm:py-8 md:py-10 text-start">
        <Link
          href={`/${lang}/studio`}
          className="inline-flex items-center gap-2 text-primary/40 hover:text-primary text-sm font-bold uppercase tracking-widest mb-6 md:mb-8 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180 group-hover:-translate-x-1 rtl:group-hover:translate-x-1 transition-transform" />
          <span>{dict.studio_profile?.back_to_studio || (isAr ? "العودة للمتجر" : "Back to Shop")}</span>
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start mb-8 md:mb-12 gap-4 md:gap-6 text-start">
          <div className="text-start">
            {isEditMode ? (
              <>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-primary leading-tight text-start">
                  {isAr ? "تعديل " : "Edit "}
                  <span className="serif italic font-normal text-accent">{isAr ? "المنتج" : "Product"}</span>
                </h1>
                <p className="text-charcoal/40 mt-1.5 text-sm md:text-base text-start">
                  {isAr ? "قم بتحديث تفاصيل منتجك — سيُعاد إرساله للمراجعة بعد الحفظ." : "Update your product details — it will be re-submitted for review after saving."}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-primary leading-tight text-start">
                  {dict.new_product.list_new_treasure}{" "}
                  <span className="serif italic font-normal text-accent">{dict.new_product.treasure_accent}</span>
                </h1>
                <p className="text-charcoal/40 mt-1.5 text-sm md:text-base text-start">{dict.new_product.share_craftsmanship}</p>
              </>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8 xl:gap-10 items-start">
          <section className="xl:col-span-7 min-w-0 bg-white rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 lg:p-10 shadow-2xl shadow-primary/5 border border-primary/5 space-y-6 sm:space-y-8 text-start">
            <div className="flex items-center gap-3 pb-6 border-b border-primary/5">
              <Sparkles className="w-6 h-6 text-accent" />
              <h2 className="text-2xl font-heading font-bold text-primary">{dict.new_product.the_essentials}</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-primary/40 uppercase tracking-widest flex items-center gap-2">
                    <Type className="w-3 h-3" /> {dict.new_product.product_title_label}
                  </label>
                  <span className={cn("text-[10px] font-mono font-bold", formData.name.length > 90 ? "text-amber-500" : "text-primary/30")}>
                    {formData.name.length}/100
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: stripEmojis(e.target.value) })}
                  placeholder={dict.new_product.product_title_placeholder}
                  className="w-full py-3.5 sm:py-4 px-4 sm:px-6 bg-white border border-primary/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-primary/50 text-primary font-bold shadow-sm text-start"
                />
              </div>

              {/* Category Picker */}
              <div className="space-y-2">
                <label className="text-xs font-black text-primary/40 uppercase tracking-widest flex items-center gap-2">
                  <Tag className="w-3 h-3" /> {dict.new_product.category_label}
                </label>
                <EtsyCategoryPicker
                  value={formData.category}
                  onChange={(cat) => setFormData({ ...formData, category: cat })}
                  dict={dict}
                />
              </div>

              {/* Pricing & Initial Stock (Twin Inventory Fields) */}
              <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-black text-primary/40 uppercase tracking-widest flex items-center gap-2">
                    <DollarSign className="w-3 h-3" /> {dict.new_product.price_label}
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder={dict.new_product.price_placeholder}
                      className="w-full py-3.5 sm:py-4 px-4 sm:px-6 pe-16 bg-white border border-primary/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-primary/50 text-primary font-bold shadow-sm text-start"
                    />
                    <div className="absolute end-4 px-3 py-1 bg-cream/60 border border-primary/10 rounded-xl text-xs font-black text-primary/60 pointer-events-none">
                      {isAr ? "ج.م" : "EGP"}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-primary/40 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3" /> {dict.new_product.initial_stock_label} *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder={dict.new_product.initial_stock_placeholder || "1"}
                    className="w-full py-3.5 sm:py-4 px-4 sm:px-6 bg-white border border-primary/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-primary/50 text-primary font-bold shadow-sm text-start"
                  />
                  <p className="text-[10px] text-charcoal/40 font-medium">
                    {variants.length > 0
                      ? (dict.new_product?.variant_managed_stock_hint || (isAr ? "الكمية الافتراضية (مُدارة بواسطة الخيارات بالأسفل)" : "Default quantity (managed by variants below)"))
                      : (dict.new_product?.available_units_hint || (isAr ? "عدد القطع الجاهزة للشحن فوراً" : "Available units ready to ship"))}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] md:text-xs font-black text-primary/40 uppercase tracking-widest flex items-center gap-2">
                    {dict.new_product.description_label}
                  </label>
                  <span className={cn("text-[10px] font-mono font-bold", formData.description.length > 1400 ? "text-amber-500" : "text-primary/30")}>
                    {formData.description.length}/1500
                  </span>
                </div>
                <textarea
                  required
                  maxLength={1500}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: stripEmojis(e.target.value) })}
                  placeholder={dict.new_product.description_placeholder}
                  className="w-full h-32 md:h-40 p-4 sm:p-5 md:p-6 bg-white border border-primary/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-primary/50 text-primary font-medium resize-none shadow-sm text-sm md:text-base text-start"
                />
              </div>
            </div>
          </section>

          <section
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "xl:col-span-5 xl:col-start-8 xl:row-start-1 xl:row-span-3 xl:sticky xl:top-24 min-w-0 bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 lg:p-10 shadow-2xl shadow-primary/5 border transition-all duration-300 space-y-6 relative overflow-hidden",
              isDraggingOver ? "border-accent ring-4 ring-accent/10 bg-accent/5" : "border-primary/5"
            )}
          >
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 md:pb-6 border-b border-primary/5">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-3 bg-accent/10 rounded-2xl text-accent shrink-0 mt-0.5 sm:mt-0">
                  <ImageIcon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl md:text-2xl font-heading font-bold text-primary">
                      {dict.new_product.media_gallery}
                    </h2>
                    <span className="text-xs font-bold text-primary/40 font-mono">
                      ({formData.images.filter(Boolean).length}/10)
                    </span>
                  </div>
                  <p className="text-xs text-charcoal/50 italic">{dict.new_product.media_desc}</p>
                  <div className="pt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-accent">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>{dict.new_product.optimal_size}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {/* Batch Upload Button */}
                <label className="cursor-pointer px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-light transition-all flex items-center gap-2 shadow-md active:scale-95">
                  <Upload className="w-4 h-4" />
                  <span>{dict.new_product?.add_media || "Add Media"}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleBatchFilesUpload(e.target.files);
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Upload Rules Warning Banner */}
            <div className="flex items-center gap-3 px-5 py-3.5 bg-amber-50/60 border border-amber-200/60 rounded-2xl">
              <div className="w-8 h-8 bg-amber-100/80 rounded-xl flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-amber-900 flex items-center gap-2">
                  {dict.home?.upload_rules?.no_logos_note || "NO LOGOS OR WATERMARKS ALLOWED"}
                </p>
                <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                  {dict.home?.upload_rules?.clean_media_note || "High quality photos without text, borders or shop logos."}
                </p>
              </div>
            </div>

            {/* Drag & Drop Visual Indicator overlay when dragging files */}
            {isDraggingOver && (
              <div className="absolute inset-0 z-50 bg-accent/10 backdrop-blur-md border-2 border-dashed border-accent rounded-[2rem] flex flex-col items-center justify-center text-accent animate-in fade-in zoom-in-95">
                <Upload className="w-12 h-12 animate-bounce mb-3" />
                <p className="text-base font-black uppercase tracking-widest">{dict.new_product?.drop_files_here || "Drop your files here to upload"}</p>
                <p className="text-xs font-bold text-accent/70 mt-1">{dict.new_product?.supports_formats || "Supports JPG, PNG, WEBP, MP4 (Max 10)"}</p>
              </div>
            )}

            {/* Media Gallery 10-Slot Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5 md:gap-4">
              {formData.images.map((img, idx) => {
                const isCover = idx === 0;
                const isFilled = Boolean(img);

                return (
                  <div key={idx} className="flex flex-col gap-2">
                    <div
                      className={cn(
                        "relative aspect-square rounded-2xl overflow-hidden transition-all duration-300 group border",
                        isCover && isFilled
                          ? "border-2 border-accent shadow-lg shadow-accent/10"
                          : isFilled
                          ? "border-primary/10 bg-white shadow-sm hover:shadow-md"
                          : isCover
                          ? "border-2 border-dashed border-accent/40 bg-accent/5 hover:border-accent hover:bg-accent/10"
                          : "border-dashed border-primary/20 bg-cream/30 hover:border-accent/40 hover:bg-accent/5"
                      )}
                    >
                      {/* FILLED CARD CONTENT */}
                      {isFilled ? (
                        <>
                          {img.includes("video") || img.match(/\.(mp4|webm|ogg|mov)/i) ? (
                            <div className="relative w-full h-full rounded-2xl overflow-hidden">
                              <video
                                src={img}
                                className="w-full h-full object-cover"
                                muted
                                loop
                                onMouseOver={(e) => e.currentTarget.play()}
                                onMouseOut={(e) => e.currentTarget.pause()}
                              />
                              <div className="absolute bottom-2 end-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded-md text-[8px] font-black text-white uppercase flex items-center gap-1">
                                <Video className="w-2.5 h-2.5" /> {dict.new_product?.video_label || (isAr ? "فيديو" : "Video")}
                              </div>
                            </div>
                          ) : (
                            <Image src={img} alt={`Media ${idx + 1}`} fill className="object-cover rounded-2xl transition-transform duration-500 group-hover:scale-105" />
                          )}

                          {/* COVER BADGE */}
                          {isCover && (
                            <div className="absolute top-2 start-2 z-20 px-2 py-0.5 bg-gradient-to-r from-accent to-amber-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider shadow-md flex items-center gap-1 pointer-events-none">
                              <Star className="w-2.5 h-2.5 fill-white" />
                              <span>{dict.new_product.main_cover}</span>
                            </div>
                          )}

                          {/* RESOLUTION BADGE */}
                          {resolutions[idx] && (
                            <div className="absolute bottom-2 start-2 z-20 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded-md text-[8px] font-mono font-bold text-white/90 pointer-events-none">
                              {resolutions[idx]}
                            </div>
                          )}

                          {/* ALWAYS-VISIBLE DELETE BUTTON ON SMALL SCREENS / HOVER ON DESKTOP */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(idx);
                            }}
                            className="absolute top-2 end-2 z-40 p-1.5 sm:p-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg border border-white/20 transition-all active:scale-90 cursor-pointer flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                            title={dict.new_product.remove}
                            aria-label={dict.new_product.remove || "Delete"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* BOTTOM GRADIENT OVERLAY & CONTROLS */}
                          <div className="absolute inset-0 z-30 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-200 flex flex-col justify-end p-2 sm:p-2.5 gap-1.5 rounded-2xl overflow-hidden">
                            {!isCover && (
                              <button
                                type="button"
                                onClick={() => handleSetAsCover(idx)}
                                className="w-full py-1 px-2 bg-amber-500/90 hover:bg-amber-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95 border border-amber-300/30"
                              >
                                <Star className="w-2.5 h-2.5 fill-white" />
                                <span>{dict.new_product?.set_as_cover || (isAr ? "تعيين كغلاف" : "Set Cover")}</span>
                              </button>
                            )}

                            <div className="flex items-center gap-1.5 w-full">
                              {/* Change File Button */}
                              <label className="w-full py-1.5 px-2 bg-white hover:bg-cream text-primary font-extrabold text-[10px] sm:text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95 border border-white/40">
                                <Upload className="w-3.5 h-3.5 text-accent shrink-0" />
                                <span className="font-bold">{dict.new_product?.change || (isAr ? "تغيير" : "Change")}</span>
                                <input
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) processSingleFile(file, idx);
                                  }}
                                />
                              </label>
                            </div>
                          </div>

                          {/* Compression Spinner */}
                          {isCompressing[idx] && (
                            <div className="absolute inset-0 bg-white/85 backdrop-blur-sm z-40 flex flex-col items-center justify-center rounded-2xl gap-1.5">
                              <Loader2 className="w-6 h-6 text-accent animate-spin" />
                              <span className="text-[9px] font-bold text-primary/70 uppercase tracking-tight">
                                {isAr ? "جاري الرفع..." : "Uploading..."}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        /* EMPTY SLOT CONTENT */
                        <label className="w-full h-full flex flex-col items-center justify-center p-3 cursor-pointer group/upload rounded-2xl text-center">
                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files.length > 0) {
                                handleBatchFilesUpload(e.target.files, idx);
                              }
                              e.target.value = "";
                            }}
                          />
                          <div className={cn(
                            "w-10 h-10 rounded-2xl transition-all flex items-center justify-center mb-2 group-hover/upload:scale-110",
                            isCover ? "bg-accent/15 text-accent" : "bg-primary/5 text-primary/30 group-hover/upload:text-accent group-hover/upload:bg-accent/10"
                          )}>
                            {isCover ? (
                              <Star className="w-5 h-5 fill-accent/30 text-accent" />
                            ) : (
                              <Plus className="w-5 h-5" />
                            )}
                          </div>
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-wider text-center",
                            isCover ? "text-accent" : "text-primary/40 group-hover/upload:text-accent"
                          )}>
                            {idx === 0
                              ? `${dict.new_product.main_cover} *`
                              : idx === 1
                              ? (dict.new_product?.angle ? dict.new_product.angle.replace("{count}", "2") : (isAr ? "زاوية 2" : "Angle 2"))
                              : idx === 2
                              ? (dict.new_product?.detail_scale || (isAr ? "تفاصيل / أبعاد" : "Detail / Scale"))
                              : idx === 3
                              ? (isAr ? "أثناء الاستخدام" : "In Use")
                              : idx === 4
                              ? (isAr ? "التغليف" : "Packaging")
                              : (dict.new_product?.angle ? dict.new_product.angle.replace("{count}", String(idx + 1)) : (isAr ? `زاوية ${idx + 1}` : `Angle ${idx + 1}`))}
                          </span>
                          {isCover && (
                            <span className="text-[8px] font-bold text-accent/70 uppercase tracking-tight mt-0.5">
                              {dict.new_product?.required || (isAr ? "مطلوب" : "Required")}
                            </span>
                          )}
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="xl:col-span-7 min-w-0">
          <VariationsSection 
            options={options}
            setOptions={setOptions}
            variants={variants}
            setVariants={setVariants}
            basePrice={formData.price}
            dict={dict}
          />

          </div>

          <section className="xl:col-span-7 min-w-0 bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 lg:p-10 shadow-2xl shadow-primary/5 border border-primary/5 space-y-6 md:space-y-8">
            <div className="flex items-center gap-3 pb-5 md:pb-6 border-b border-primary/5">
              <CheckCircle2 className="w-5 md:w-6 h-5 md:h-6 text-accent" />
              <h2 className="text-xl md:text-2xl font-heading font-bold text-primary">{dict.new_product.special_details}</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6 md:gap-8 items-start">
              {/* Interactive Personalization Toggle Card */}
              <div
                className={cn(
                  "p-5 sm:p-6 rounded-2xl md:rounded-[2rem] border transition-all space-y-4",
                  formData.canPersonalize
                    ? "bg-accent/5 border-accent/40 shadow-md ring-2 ring-accent/10"
                    : "bg-cream/20 border-primary/5 hover:border-primary/20"
                )}
              >
                <div
                  onClick={() => setFormData((prev: any) => ({ ...prev, canPersonalize: !prev.canPersonalize }))}
                  className="flex items-start gap-4 cursor-pointer select-none"
                >
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      id="personalize"
                      checked={formData.canPersonalize}
                      onChange={() => {}}
                      className="w-5 h-5 rounded border-primary/20 text-accent focus:ring-accent cursor-pointer pointer-events-none"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-primary text-sm md:text-base flex items-center justify-between">
                      <span>{dict.new_product.allow_personalization}</span>
                      {formData.canPersonalize && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-accent bg-accent/10 px-2.5 py-0.5 rounded-full">
                          {dict.new_product?.active_status || (isAr ? "مُفعّل" : "Active")}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] md:text-xs text-charcoal/50 mt-1">{dict.new_product.personalization_desc}</p>
                  </div>
                </div>

                <AnimatePresence>
                  {formData.canPersonalize && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="pt-3 border-t border-accent/15 space-y-2 overflow-hidden"
                    >
                      <label className="text-[10px] md:text-xs font-black text-primary/40 uppercase tracking-widest block">
                        {dict.new_product.personalization_prompt_label}
                      </label>
                      <textarea
                        value={formData.personalizationPrompt}
                        onChange={(e) => setFormData({ ...formData, personalizationPrompt: e.target.value })}
                        placeholder={dict.new_product.personalization_prompt_placeholder}
                        className="w-full h-24 p-4 bg-white border border-accent/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-primary/30 text-primary font-medium resize-none text-sm text-start"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Interactive Client Image Toggle Card */}
              <div
                className={cn(
                  "p-5 sm:p-6 rounded-2xl md:rounded-[2rem] border transition-all space-y-4",
                  formData.requiresClientImage
                    ? "bg-accent/5 border-accent/40 shadow-md ring-2 ring-accent/10"
                    : "bg-cream/20 border-primary/5 hover:border-primary/20"
                )}
              >
                <div
                  onClick={() => setFormData((prev: any) => ({ ...prev, requiresClientImage: !prev.requiresClientImage }))}
                  className="flex items-start gap-4 cursor-pointer select-none"
                >
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      id="requireClientImage"
                      checked={formData.requiresClientImage}
                      onChange={() => {}}
                      className="w-5 h-5 rounded border-primary/20 text-accent focus:ring-accent cursor-pointer pointer-events-none"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-primary text-sm md:text-base flex items-center justify-between">
                      <span>{dict.new_product.require_client_image || (isAr ? "يتطلب رفع صورة من العميل" : "Require Customer Image Upload")}</span>
                      {formData.requiresClientImage && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-accent bg-accent/10 px-2.5 py-0.5 rounded-full">
                          {dict.new_product?.active_status || (isAr ? "مُفعّل" : "Active")}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] md:text-xs text-charcoal/50 mt-1">
                      {dict.new_product.client_image_desc || (isAr ? "إلزام المشتري برفع صورة قبل الشراء." : "Require buyers to upload an image/photo before purchasing.")}
                    </p>
                  </div>
                </div>

                <AnimatePresence>
                  {formData.requiresClientImage && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="pt-3 border-t border-accent/15 space-y-2 overflow-hidden"
                    >
                      <label className="text-[10px] md:text-xs font-black text-primary/40 uppercase tracking-widest block">
                        {dict.new_product.client_image_prompt_label || (isAr ? "تعليمات رفع الصورة" : "Image Upload Instructions")}
                      </label>
                      <textarea
                        value={formData.clientImagePrompt}
                        onChange={(e) => setFormData({ ...formData, clientImagePrompt: e.target.value })}
                        placeholder={dict.new_product.client_image_prompt_placeholder || (isAr ? "ما هي الصورة المطلوبة من المشتري؟ (مثال: ارفع صورة شخصية واضحة للطباعة)" : "What photo should the buyer upload?")}
                        className="w-full h-24 p-4 bg-white border border-accent/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-primary/30 text-primary font-medium resize-none text-sm text-start"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>

          {/* Form Bottom Spacing & Publishing Note */}
          </div>

          {/* Form Bottom Spacing & Publishing Note */}
          <div className="pt-4 pb-24 text-center">
            <p className="text-xs text-charcoal/40 font-medium max-w-md xl:max-w-2xl mx-auto">
              {isEditMode
                ? (isAr
                    ? "بعد حفظ التعديلات، سيُعاد إرسال منتجك للمراجعة من فريق جيفتيزان قبل أن يظهر مجدداً في المتجر."
                    : "After saving changes, your product will be re-submitted for Giftisan team review before going live again.")
                : (dict.new_product?.publish_note || (isAr ? "ستخضع قطعتك لمراجعة سريعة من فريق جيفتيزان لضمان الجودة، وبمجرد الموافقة عليها ستظهر فوراً في متجرك وتصبح متاحة للشراء عبر المنصة." : "Your piece will undergo a quick review by the Giftisan curation team. Once approved, it will immediately appear in your shop and become discoverable across the marketplace."))
              }
            </p>
          </div>
        </form>

        {/* Floating Sticky Action Bar */}
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-primary/10 py-3 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 shadow-2xl transition-all">
          <div className="w-full max-w-[1600px] xl:max-w-[1760px] mx-auto flex items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0 hidden sm:block text-start">
              <p className="text-xs font-bold text-primary truncate max-w-xs">
                {formData.name || dict.new_product?.untitled_product || (isAr ? "قطعة جديدة بدون عنوان" : "Untitled Product")}
              </p>
              <p className="text-[10px] font-medium text-primary/40 font-mono">
                {formData.price ? `${formData.price} ${isAr ? "ج.م" : "EGP"}` : (dict.new_product?.set_price || (isAr ? "حدد السعر" : "Set Price"))} • {formData.images.filter(Boolean).length}/10 {dict.new_product?.photos_count || (isAr ? "صور" : "Photos")}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto sm:ms-auto justify-end">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                className="px-4 py-2.5 text-xs font-bold text-primary/60 hover:text-primary transition-colors hidden md:block"
              >
                {dict.new_product?.scroll_to_top || (isAr ? "للأعلى ↑" : "Top ↑")}
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || Object.values(isCompressing).some(Boolean)}
                className="w-full sm:w-auto py-3 px-6 sm:px-8 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary-light transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading || Object.values(isCompressing).some(Boolean) ? (
                  <Loader2 className="w-4 h-4 animate-spin text-accent" />
                ) : (
                  <Sparkles className="w-4 h-4 text-accent" />
                )}
                <span>
                  {Object.values(isCompressing).some(Boolean)
                    ? (isAr ? "جاري رفع الوسائط..." : "Uploading media...")
                    : isEditMode
                    ? (isAr ? "حفظ التغييرات" : "Save Changes")
                    : dict.new_product.list_product_btn}
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }
