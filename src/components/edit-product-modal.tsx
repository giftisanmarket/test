"use client";

import { useState, useEffect, memo, useMemo, useCallback } from "react";
import { X, Sparkles, DollarSign, Tag, Type, Image as ImageIcon, CheckCircle2, Save, ChevronDown, Video, Loader2, ShieldCheck, Trash2, Upload, Plus, Check, Star, Clock, ExternalLink, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { updateProduct, updateProductStatus, toggleProductFeatured } from "@/lib/actions";
import { cn, stripEmojis } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { EtsyCategoryPicker } from "@/components/studio/etsy-category-picker";

interface EditProductModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
  readOnly?: boolean;
  dict: any;
  lang?: string;
  onProductModerated?: (productId: string, updates: { status?: string; rejectionReason?: string | null; isFeatured?: boolean }) => void;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_DURATION = 30; // 30 seconds

// --- Memoized Sub-Components for Performance ---

const EssentialsSection = memo(({ name, price, category, description, setTextData, readOnly, dict }: any) => (
  <section className="space-y-4 sm:space-y-6">
    <div className="flex items-center gap-2.5 sm:gap-3 pb-2.5 sm:pb-3 border-b-2 border-primary/5">
      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" />
      <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-primary/40">{dict.edit_product.core_details}</h3>
    </div>

    <div className="space-y-3.5 sm:space-y-4">
      <div className="space-y-1.5 sm:space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest">{dict.new_product.product_title_label}</label>
          <span className={cn("text-[10px] font-mono font-bold", (name || "").length > 90 ? "text-amber-500" : "text-primary/30")}>
            {(name || "").length}/100
          </span>
        </div>
        <input 
          type="text" 
          required
          maxLength={100}
          value={name}
          onChange={(e) => setTextData((prev: any) => ({...prev, name: stripEmojis(e.target.value)}))}
          disabled={readOnly}
          className={cn(
            "w-full py-2.5 sm:py-3 px-4 sm:px-5 bg-white border border-primary/10 rounded-xl focus:outline-none focus:border-accent transition-all font-bold text-primary shadow-sm text-sm",
            readOnly && "bg-cream/20 cursor-default"
          )}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3.5 sm:gap-4 md:gap-6">
        <div className="space-y-1.5 sm:space-y-2">
          <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest">{dict.new_product.price_label}</label>
          <div className="relative flex items-center">
            <input 
              type="number" 
              required
              min="0"
              step="1"
              value={price}
              onChange={(e) => setTextData((prev: any) => ({...prev, price: e.target.value}))}
              disabled={readOnly}
              className={cn(
                "w-full py-2.5 sm:py-3 px-4 sm:px-5 pe-14 bg-white border border-primary/10 rounded-xl focus:outline-none focus:border-accent transition-all font-bold text-primary shadow-sm text-sm",
                readOnly && "bg-cream/20 cursor-default"
              )}
            />
            <div className="absolute end-3 px-2 py-0.5 bg-cream/60 border border-primary/10 rounded-lg text-[10px] font-black text-primary/60 pointer-events-none">
              EGP
            </div>
          </div>
        </div>
        <div className="space-y-1.5 sm:space-y-2">
          <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest">{dict.new_product.category_label}</label>
          <CategoryDropdown 
              value={category} 
              onChange={(val: string) => setTextData((prev: any) => ({...prev, category: val}))} 
              disabled={readOnly}
              dict={dict}
          />
        </div>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest">{dict.new_product.description_label}</label>
          <span className={cn("text-[10px] font-mono font-bold", (description || "").length > 1400 ? "text-amber-500" : "text-primary/30")}>
            {(description || "").length}/1500
          </span>
        </div>
        <textarea 
          required
          maxLength={1500}
          value={description}
          onChange={(e) => setTextData((prev: any) => ({...prev, description: stripEmojis(e.target.value)}))}
          disabled={readOnly}
          className={cn(
            "w-full h-24 sm:h-28 md:h-32 p-3.5 sm:p-4 bg-white border border-primary/10 rounded-xl focus:outline-none focus:border-accent transition-all font-medium text-primary resize-none shadow-sm text-xs sm:text-sm",
            readOnly && "bg-cream/20 cursor-default"
          )}
        />
      </div>
    </div>
  </section>
));

EssentialsSection.displayName = "EssentialsSection";

const MediaSection = memo(({ images, resolutions, isCompressing, onImageChange, readOnly, dict }: any) => {
  const isAr = dict?.common?.home === "الرئيسية" || dict?.new_product?.the_essentials === "الأساسيات";
  const allSlots = images.map((img: string, idx: number) => ({ img, idx }));
  const displayedSlots = readOnly ? allSlots.filter((s: any) => Boolean(s.img)) : allSlots;

  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-2 pb-2.5 sm:pb-3 border-b-2 border-primary/5">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" />
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-primary/40 truncate">{dict.new_product.media_gallery}</h3>
        </div>
        {readOnly && (
          <span className="px-2.5 py-1 bg-primary/5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-primary/60 shrink-0">
            {displayedSlots.length} {isAr ? "وسائط" : (displayedSlots.length === 1 ? "Media" : "Media")}
          </span>
        )}
      </div>
      {!readOnly && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <p className="text-xs text-charcoal/40 italic">{dict.new_product.media_desc}</p>
          <div className="flex items-center gap-2 px-3 py-1 bg-accent/5 border border-accent/10 rounded-full w-fit">
             <Sparkles className="w-3 h-3 text-accent" />
             <span className="text-[9px] font-black uppercase tracking-widest text-accent">{dict.new_product.optimal_size}</span>
          </div>
        </div>
      )}
      
      <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 px-3.5 py-2.5 sm:px-5 sm:py-3 bg-red-50/50 border border-red-100 rounded-xl sm:rounded-2xl">
        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] md:text-xs font-bold text-red-600 uppercase tracking-wide leading-snug">
            {dict.home.upload_rules.no_logos_note}
          </p>
          <p className="text-[9px] md:text-[10px] text-red-400 font-medium leading-snug mt-0.5">
            {dict.home.upload_rules.clean_media_note}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
        {displayedSlots.map(({ img, idx }: { img: string; idx: number }) => (
          <MediaSlot 
            key={idx} 
            idx={idx} 
            img={img} 
            resolution={resolutions[idx]} 
            isCompressing={isCompressing[idx]} 
            onImageChange={onImageChange} 
            readOnly={readOnly} 
            dict={dict} 
          />
        ))}
      </div>
    </section>
  );
});

MediaSection.displayName = "MediaSection";

const MediaSlot = memo(({ idx, img, resolution, isCompressing, onImageChange, readOnly, dict }: any) => {
  const isCover = idx === 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(dict.home.upload_rules.format_error);
      return;
    }

    if (file.type.startsWith('image/') && file.size > MAX_IMAGE_SIZE) {
      toast.error(dict.home.upload_rules.image_size_error);
      return;
    }
    if (file.type.startsWith('video/') && file.size > MAX_VIDEO_SIZE) {
      toast.error(dict.home.upload_rules.video_size_error);
      return;
    }

    onImageChange(idx, file, true); // true for "starting compression"
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "relative aspect-square rounded-2xl overflow-hidden transition-all duration-300 group border",
          isCover && img
            ? "border-2 border-accent shadow-md shadow-accent/10"
            : img
            ? "border-primary/10 bg-white shadow-sm hover:shadow-md"
            : "border-dashed border-primary/20 bg-cream/30 hover:border-accent/40 hover:bg-accent/5"
        )}
      >
        {img ? (
          img.includes('video') || img.match(/\.(mp4|webm|ogg|mov)/i) ? (
            <video 
              src={img} 
              className="w-full h-full object-cover rounded-2xl" 
              muted={!readOnly}
              controls={readOnly}
              loop 
              onMouseOver={e => !readOnly && e.currentTarget.play()}
              onMouseOut={e => !readOnly && e.currentTarget.pause()}
            />
          ) : (
            <>
              <Image src={img} alt="Preview" fill sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 180px" className="object-cover rounded-2xl" />
              {readOnly && (
                <a
                  href={img}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open full image"
                  className="absolute top-2 end-2 z-30 p-1.5 bg-black/60 hover:bg-accent text-white rounded-lg backdrop-blur-md transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </>
          )
        ) : (
          <label className="w-full h-full flex flex-col items-center justify-center p-3 cursor-pointer group/upload rounded-2xl">
            <input 
              type="file" 
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
              className="hidden"
              disabled={readOnly}
              onChange={handleFileChange}
            />
            <div className="w-9 h-9 rounded-xl bg-primary/5 group-hover/upload:bg-accent/10 transition-all flex items-center justify-center mb-1">
              <ImageIcon className="w-4 h-4 text-primary/30 group-hover/upload:text-accent" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider text-primary/40 group-hover/upload:text-accent text-center">
              {isCover ? dict.new_product.main_cover : `Angle ${idx + 1}`}
            </span>
          </label>
        )}

        {resolution && (
          <div className="absolute top-2 start-2 z-20 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded-md text-[8px] font-mono font-bold text-white uppercase pointer-events-none">
            {resolution}
          </div>
        )}

        {/* ALWAYS-VISIBLE DELETE BUTTON ON SMALL SCREENS / HOVER ON DESKTOP */}
        {img && !readOnly && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onImageChange(idx, null);
            }}
            className="absolute top-2 end-2 z-40 p-1.5 sm:p-2 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-lg border border-white/20 transition-all active:scale-90 cursor-pointer flex items-center justify-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
            title={dict.new_product.remove}
            aria-label={dict.new_product.remove || "Delete"}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* BOTTOM GRADIENT OVERLAY & CONTROLS */}
        {img && !readOnly && (
          <div className="absolute inset-0 z-30 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-200 flex flex-col justify-end p-2 sm:p-2.5 gap-1.5 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-1.5 w-full">
              <label className="w-full py-1.5 px-2 bg-white hover:bg-cream text-primary font-extrabold text-[10px] sm:text-xs rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95 border border-white/40">
                <Upload className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="font-bold">{dict.new_product.change}</span>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>
        )}

        {isCompressing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50 rounded-2xl">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        )}
      </div>
      <div className="flex justify-between items-center px-1">
        <span className="text-[9px] font-black uppercase tracking-widest text-primary/30">
          {isCover ? dict.new_product.main_cover : `Angle ${idx + 1}`}
        </span>
      </div>
    </div>
  );
});

MediaSlot.displayName = "MediaSlot";

const DetailsSection = memo(({ stock, canPersonalize, personalizationPrompt, personalizationRequired, requiresClientImage, clientImagePrompt, clientImageRequired, setTextData, readOnly, dict }: any) => (
  <section className="space-y-4 sm:space-y-6 pb-2 sm:pb-4">
    <div className="flex items-center gap-2.5 sm:gap-3 pb-2.5 sm:pb-3 border-b-2 border-primary/5">
      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-accent shrink-0" />
      <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-primary/40">{dict.new_product.special_details}</h3>
    </div>

    <div className="grid md:grid-cols-2 gap-3.5 sm:gap-5 md:gap-8">
      <div className="space-y-3 sm:space-y-4">
        <div className="space-y-1.5 sm:space-y-2">
          <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest">{dict.new_product.initial_stock_label}</label>
          <input 
            type="number" 
            value={stock}
            onChange={(e) => setTextData((prev: any) => ({...prev, stock: e.target.value}))}
            disabled={readOnly}
            className={cn(
              "w-full py-2.5 sm:py-3 px-4 sm:px-5 bg-white border border-primary/10 rounded-xl focus:outline-none focus:border-accent transition-all font-bold text-primary shadow-sm text-sm",
              readOnly && "bg-cream/20 cursor-default"
            )}
          />
        </div>

        <div className="flex items-center gap-3 p-3.5 sm:p-4 bg-cream/10 rounded-xl border border-primary/5">
          <input 
            type="checkbox" 
            id="edit-personalize"
            disabled={readOnly}
            checked={canPersonalize}
            onChange={(e) => !readOnly && setTextData((prev: any) => ({...prev, canPersonalize: e.target.checked}))}
            className="w-4 h-4 rounded text-accent focus:ring-accent"
          />
          <label htmlFor="edit-personalize" className="text-xs font-bold text-primary cursor-pointer">
            {dict.new_product.allow_personalization}
          </label>
        </div>

        {canPersonalize && (
          <div className="space-y-2 pt-2">
            <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest">{dict.new_product.personalization_prompt_label}</label>
            <textarea 
              value={personalizationPrompt}
              onChange={(e) => !readOnly && setTextData((prev: any) => ({...prev, personalizationPrompt: e.target.value}))}
              disabled={readOnly}
              placeholder={dict.new_product.personalization_prompt_placeholder}
              className={cn(
                "w-full h-20 p-4 bg-white border border-primary/10 rounded-xl focus:outline-none focus:border-accent font-medium text-xs text-primary resize-none shadow-sm",
                readOnly && "bg-cream/20 cursor-default"
              )}
            />
            <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={personalizationRequired}
                disabled={readOnly}
                onChange={(e) => !readOnly && setTextData((prev: any) => ({ ...prev, personalizationRequired: e.target.checked }))}
                className="w-3.5 h-3.5 rounded text-accent focus:ring-accent"
              />
              <span className="text-[11px] font-bold text-primary/70">{dict.new_product?.personalization_is_required || "Required for purchase"}</span>
            </label>
          </div>
        )}
      </div>

      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center gap-3 p-3.5 sm:p-4 bg-cream/10 rounded-xl border border-primary/5">
          <input 
            type="checkbox" 
            id="edit-require-client-image"
            disabled={readOnly}
            checked={requiresClientImage}
            onChange={(e) => !readOnly && setTextData((prev: any) => ({...prev, requiresClientImage: e.target.checked}))}
            className="w-4 h-4 rounded text-accent focus:ring-accent"
          />
          <label htmlFor="edit-require-client-image" className="text-xs font-bold text-primary cursor-pointer">
            {dict.new_product.require_client_image || "Require Customer Image Upload"}
          </label>
        </div>

        {requiresClientImage && (
          <div className="space-y-2 pt-2">
            <label className="text-[10px] font-black text-primary/40 uppercase tracking-widest">{dict.new_product.client_image_prompt_label || "Image Upload Instructions"}</label>
            <textarea 
              value={clientImagePrompt}
              onChange={(e) => !readOnly && setTextData((prev: any) => ({...prev, clientImagePrompt: e.target.value}))}
              disabled={readOnly}
              placeholder={dict.new_product.client_image_prompt_placeholder || "What photo should the buyer upload?"}
              className={cn(
                "w-full h-20 p-4 bg-white border border-primary/10 rounded-xl focus:outline-none focus:border-accent font-medium text-xs text-primary resize-none shadow-sm",
                readOnly && "bg-cream/20 cursor-default"
              )}
            />
            <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={clientImageRequired}
                disabled={readOnly}
                onChange={(e) => !readOnly && setTextData((prev: any) => ({ ...prev, clientImageRequired: e.target.checked }))}
                className="w-3.5 h-3.5 rounded text-accent focus:ring-accent"
              />
              <span className="text-[11px] font-bold text-primary/70">{dict.new_product?.client_image_is_required || "Required for purchase"}</span>
            </label>
          </div>
        )}
      </div>
    </div>
  </section>
));

DetailsSection.displayName = "DetailsSection";

const VariantRow = memo(({ v, i, variants, setVariants, readOnly, dict }: any) => (
  <tr className="hover:bg-cream/20 transition-colors group">
    <td className="px-4 py-3">
      <div className="relative w-10 h-10 bg-cream rounded-lg overflow-hidden border border-primary/5 flex items-center justify-center group/img">
        {v.image ? (
          <img src={v.image} className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-4 h-4 text-primary/20" />
        )}
        {!readOnly && (
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
                    
                    const newVariants = [...variants];
                    newVariants[i] = { ...newVariants[i], image: canvas.toDataURL('image/webp', 0.75) };
                    setVariants(newVariants);
                  };
                  img.src = reader.result as string;
                };
                reader.readAsDataURL(file);
              }
            }}
          />
        )}
      </div>
    </td>
    <td className="px-4 py-3 font-bold text-primary">{v.name}</td>
    <td className="px-4 py-3">
      <input 
        type="number" 
        value={v.price}
        disabled={readOnly}
        onChange={(e) => {
          if (readOnly) return;
          const newVariants = [...variants];
          newVariants[i] = { ...newVariants[i], price: e.target.value };
          setVariants(newVariants);
        }}
        className={cn(
          "w-24 h-10 bg-white border border-primary/20 rounded-xl px-3 focus:outline-none focus:border-accent font-bold",
          readOnly && "bg-cream/20 cursor-default"
        )}
      />
    </td>
    <td className="px-4 py-3">
      <div className="space-y-1">
        <input 
          type="number" 
          min="1"
          value={v.stock}
          disabled={readOnly}
          onChange={(e) => {
            if (readOnly) return;
            const newVariants = [...variants];
            newVariants[i] = { ...newVariants[i], stock: e.target.value };
            setVariants(newVariants);
          }}
          className={cn(
            "w-20 h-10 bg-white border rounded-xl px-3 focus:outline-none font-bold",
            parseInt(v.stock) <= 0 ? "border-orange-300 focus:border-orange-500" : "border-primary/20 focus:border-accent",
            readOnly && "bg-cream/20 cursor-default"
          )}
        />
        {parseInt(v.stock) <= 0 && (
          <p className="text-[8px] font-black uppercase text-orange-500 tracking-tighter">{dict.edit_product.low_stock}!</p>
        )}
      </div>
    </td>


    {!readOnly && (
      <td className="px-4 py-3 text-end">
        <button 
          type="button"
          onClick={() => setVariants(variants.filter((_: any, idx: number) => idx !== i))}
          className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg active:scale-95"
          title="Delete variant"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </td>
    )}
  </tr>
));

VariantRow.displayName = "VariantRow";

const VariantCard = memo(({ v, i, variants, setVariants, readOnly, dict }: any) => {
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
                {!readOnly && <span className="text-[7px] font-bold uppercase mt-0.5 opacity-70">+ Photo</span>}
              </div>
            )}
            {!readOnly && (
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
                        
                        const newVariants = [...variants];
                        newVariants[i] = { ...newVariants[i], image: canvas.toDataURL('image/webp', 0.75) };
                        setVariants(newVariants);
                      };
                      img.src = reader.result as string;
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-sm sm:text-base text-primary truncate" title={v.name}>{v.name}</p>
            <span className="text-[10px] font-semibold text-primary/40 uppercase tracking-wider block">
              {dict.edit_product?.variant || (isAr ? "تشكيلة" : "Variant")} #{i + 1}
            </span>
          </div>
        </div>

        {!readOnly && (
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
        )}
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
            disabled={readOnly}
            onChange={(e) => {
              if (readOnly) return;
              const newVariants = [...variants];
              newVariants[i] = { ...newVariants[i], price: e.target.value };
              setVariants(newVariants);
            }}
            className={cn(
              "w-full h-10 bg-cream/40 border border-primary/15 rounded-xl px-3 font-bold text-sm text-primary placeholder:text-primary/30 focus:bg-white focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none transition-all shadow-xs",
              readOnly && "bg-cream/20 cursor-default"
            )}
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
            disabled={readOnly}
            onChange={(e) => {
              if (readOnly) return;
              const newVariants = [...variants];
              newVariants[i] = { ...newVariants[i], stock: e.target.value };
              setVariants(newVariants);
            }}
            className={cn(
              "w-full h-10 bg-cream/40 border rounded-xl px-3 font-bold text-sm text-primary placeholder:text-primary/30 focus:bg-white focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none transition-all shadow-xs",
              parseInt(v.stock) <= 0 ? "border-orange-300 focus:border-orange-500" : "border-primary/15",
              readOnly && "bg-cream/20 cursor-default"
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

const VariationsSection = memo(({ options, setOptions, variants, setVariants, basePrice, readOnly, dict }: any) => {
  const isAr = dict?.common?.home === "الرئيسية" || dict?.new_product?.the_essentials === "الأساسيات";
  const [newOptionName, setNewOptionName] = useState("");
  const [showBulkStockModal, setShowBulkStockModal] = useState(false);
  const [bulkStockVal, setBulkStockVal] = useState("5");
  
  const addOption = () => {
    if (!newOptionName) return;
    setOptions([...options, { name: newOptionName, values: [] }]);
    setNewOptionName("");
  };

  const addValue = (optIdx: number, val: string) => {
    const newOptions = [...options];
    if (!newOptions[optIdx].values.includes(val)) {
      newOptions[optIdx].values.push(val);
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
        options: combo,
      };
    });
    setVariants(newVariants);
  };

  return (
    <section className="space-y-6 sm:space-y-8">
      <div className="flex items-center gap-3 pb-3 border-b-2 border-primary/5">
        <Tag className="w-5 h-5 text-accent shrink-0" />
        <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-primary/40">{dict.edit_product.variations}</h3>
      </div>

      <div className="space-y-5 sm:space-y-6">
        {readOnly && options.length === 0 && variants.length === 0 && (
          <div className="p-4 bg-cream/30 rounded-2xl border border-primary/5 text-xs font-bold text-primary/50">
            {isAr ? "قطعة قياسية بدون تشكيلات أو خيارات إضافية" : "Standard single listing (no variations configured)"}
          </div>
        )}

        {!readOnly && (
          <div className="space-y-1.5">
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-4">
              <input 
                type="text" 
                placeholder={dict.edit_product.option_name_placeholder}
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
                <span>{dict.edit_product.add_option}</span>
              </button>
            </div>
            <p className="text-[10px] font-bold text-accent/60 uppercase tracking-widest px-2">
              {dict.edit_product.enter_to_add}
            </p>
          </div>
        )}

        <div className="space-y-3 sm:space-y-4">
          {options.map((opt: any, optIdx: number) => (
            <div key={optIdx} className="p-3.5 sm:p-5 bg-cream/30 rounded-2xl border border-primary/5 space-y-3">
              <div className="flex justify-between items-center gap-2">
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-primary flex items-center gap-1.5 min-w-0">
                  <Tag className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="truncate">{opt.name}</span>
                </h4>
                {!readOnly && (
                  <button 
                    type="button" 
                    onClick={() => setOptions(options.filter((_: any, i: number) => i !== optIdx))}
                    className="px-2.5 sm:px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1 active:scale-95 shadow-xs shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{dict.edit_product?.delete_option || dict.common?.remove || "Delete"}</span>
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {opt.values.map((val: string, valIdx: number) => (
                    <span key={valIdx} className="px-3 py-1 bg-white border border-primary/10 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs max-w-[160px] truncate animate-in zoom-in-50">
                      <span className="truncate">{val}</span>
                      {!readOnly && (
                        <button type="button" onClick={() => removeValue(optIdx, valIdx)} className="text-red-400 hover:text-red-500 transition-colors shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {!readOnly && <OptionValueInput optIdx={optIdx} onAddValue={addValue} dict={dict} />}
                </div>
                {!readOnly && (
                  <p className="text-[9px] sm:text-[10px] font-bold text-accent/50 uppercase tracking-wider px-1">
                    {dict.edit_product.enter_to_add}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {!readOnly && options.length > 0 && (
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
                  <span className="truncate">{dict.edit_product?.set_bulk_stock || "Set Bulk Stock"}</span>
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
                    <th className="px-4 py-3 text-start w-12"></th>
                    <th className="px-4 py-3 text-start">{dict.edit_product.variant_name}</th>
                    <th className="px-4 py-3 text-start">{dict.new_product.price_label}</th>
                    <th className="px-4 py-3 text-start">{dict.new_product.initial_stock_label}</th>
                    {!readOnly && <th className="px-4 py-3 text-end"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {variants.map((v: any, i: number) => (
                    <VariantRow key={i} v={v} i={i} variants={variants} setVariants={setVariants} readOnly={readOnly} dict={dict} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 sm:space-y-4">
              {variants.map((v: any, i: number) => (
                <VariantCard key={i} v={v} i={i} variants={variants} setVariants={setVariants} readOnly={readOnly} dict={dict} />
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
                        {dict.edit_product?.set_bulk_stock || "Set Bulk Stock"}
                      </h3>
                      <p className="text-xs text-primary/50 font-medium">
                        {dict.edit_product?.bulk_stock_desc || "Enter stock quantity for all variants"}
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
                      {dict.new_product?.initial_stock_label || "Quantity"}
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
                                : `Set stock to ${bulkStockVal} for all variants`
                            );
                            setShowBulkStockModal(false);
                          }
                        }
                      }}
                      placeholder={dict.edit_product?.bulk_stock_placeholder || "e.g. 5"}
                      className="w-full h-12 px-4 bg-cream/30 border border-primary/10 rounded-2xl font-bold text-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowBulkStockModal(false)}
                      className="flex-1 py-3.5 px-4 bg-cream hover:bg-cream/70 text-primary font-bold rounded-2xl transition-all text-sm"
                    >
                      {dict.common?.cancel || "Cancel"}
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
                              : `Set stock to ${bulkStockVal} for all variants`
                          );
                          setShowBulkStockModal(false);
                        }
                      }}
                      className="flex-1 py-3.5 px-4 bg-accent hover:bg-accent/90 text-white font-bold rounded-2xl transition-all shadow-md shadow-accent/20 active:scale-95 text-sm"
                    >
                      {dict.edit_product?.apply_stock || dict.common?.apply || "Apply Stock"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
});

VariationsSection.displayName = "VariationsSection";

export function EditProductModal({ product, isOpen, onClose, readOnly = false, dict, lang, onProductModerated }: EditProductModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState<Record<number, boolean>>({});
  const [currentStatus, setCurrentStatus] = useState<string>(product.status || "PENDING");
  const [currentRejectionReason, setCurrentRejectionReason] = useState<string>(product.rejectionReason || "");
  const [isFeatured, setIsFeatured] = useState<boolean>(Boolean(product.isFeatured));
  const [isModerating, setIsModerating] = useState<boolean>(false);
  const [showRejectBox, setShowRejectBox] = useState<boolean>(false);
  const [rejectReasonInput, setRejectReasonInput] = useState<string>(product.rejectionReason || "");
  
  const [textData, setTextData] = useState({
    name: product.name,
    description: product.description,
    price: product.price.toString(),
    category: product.category,
    canPersonalize: product.canPersonalize || false,
    personalizationPrompt: product.personalizationPrompt || "",
    personalizationRequired: product.personalizationRequired || false,
    requiresClientImage: product.requiresClientImage || false,
    clientImagePrompt: product.clientImagePrompt || "",
    clientImageRequired: product.clientImageRequired || false,
    badge: "",
    stock: (product.stock || 0).toString()
  });

  // Extract unique options from variants for the editor
  const initialOptions = useMemo(() => {
    return product.variants?.reduce((acc: any[], v: any) => {
      if (v.options) {
        const vOptions = typeof v.options === 'string' ? JSON.parse(v.options) : v.options;
        Object.entries(vOptions).forEach(([name, value]) => {
          const existing = acc.find(o => o.name === name);
          if (existing) {
            if (!existing.values.includes(value)) existing.values.push(value as string);
          } else {
            acc.push({ name, values: [value as string] });
          }
        });
      }
      return acc;
    }, []) || [];
  }, [product.variants]);

  const [options, setOptions] = useState<any[]>(initialOptions);
  const [variants, setVariants] = useState<any[]>(product.variants || []);

  const [images, setImages] = useState<string[]>(
    product.images.length >= 10 ? [...product.images] : [...product.images, ...Array(10 - product.images.length).fill("")]
  );

  const [resolutions, setResolutions] = useState<Record<number, string>>({});
  const isRTL = typeof document !== 'undefined' && (document.dir === 'rtl' || document.documentElement.dir === 'rtl');
  const isAr = lang === "ar" || isRTL || dict?.common?.home === "الرئيسية";
  const resolvedLang = lang || (isAr ? "ar" : "en");

  useEffect(() => {
    setCurrentStatus(product.status || "PENDING");
    setCurrentRejectionReason(product.rejectionReason || "");
    setIsFeatured(Boolean(product.isFeatured));
    setRejectReasonInput(product.rejectionReason || "");
    setShowRejectBox(false);
  }, [product.id, product.status, product.rejectionReason, product.isFeatured]);

  const handleModerateStatus = async (newStatus: "APPROVED" | "PENDING" | "REJECTED", reason?: string) => {
    const cleanedReason = reason?.trim() || "";
    if (newStatus === "REJECTED" && !cleanedReason) {
      toast.error(isAr ? "يرجى كتابة سبب الرفض لمساعدة الحرفي على تعديل المنتج" : "Please provide feedback so the artisan knows what to fix", {
        style: { borderRadius: "20px", background: "#1a2c2c", color: "#fff" }
      });
      return;
    }

    setIsModerating(true);
    try {
      const res = await updateProductStatus(product.id, newStatus, newStatus === "REJECTED" ? cleanedReason : undefined);
      if (res.success) {
        const nextReason = newStatus === "REJECTED" ? cleanedReason : null;
        setCurrentStatus(newStatus);
        setCurrentRejectionReason(nextReason || "");
        setShowRejectBox(false);
        onProductModerated?.(product.id, { status: newStatus, rejectionReason: nextReason });

        const statusMsg =
          newStatus === "APPROVED"
            ? (isAr ? "تمت الموافقة على المنتج ونشره" : "Product approved and published")
            : newStatus === "REJECTED"
              ? (isAr ? "تم رفض المنتج وإرسال الملاحظات للحرفي" : "Product rejected and feedback sent")
              : (isAr ? "تم إرجاع المنتج لقائمة المراجعة" : "Product moved back to pending review");

        toast.success(statusMsg, {
          style: { borderRadius: "20px", background: "#1a2c2c", color: "#fff" }
        });
        router.refresh();

        if (newStatus === "APPROVED" || newStatus === "REJECTED") {
          onClose();
        }
      } else {
        toast.error(res.error || (isAr ? "فشل تحديث حالة المنتج" : "Failed to update product status"), {
          style: { borderRadius: "20px", background: "#1a2c2c", color: "#fff" }
        });
      }
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "حدث خطأ في الاتصال" : "Connection error occurred"), {
        style: { borderRadius: "20px", background: "#1a2c2c", color: "#fff" }
      });
    } finally {
      setIsModerating(false);
    }
  };

  const handleToggleFeatured = async () => {
    setIsModerating(true);
    const nextFeatured = !isFeatured;
    try {
      const res = await toggleProductFeatured(product.id, nextFeatured);
      if (res.success) {
        setIsFeatured(nextFeatured);
        onProductModerated?.(product.id, { isFeatured: nextFeatured });
        toast.success(
          nextFeatured
            ? (isAr ? "تمت إضافته للمميزة في الرئيسية" : "Featured on Home")
            : (isAr ? "تمت إزالته من الرئيسية" : "Removed from Home"),
          { style: { borderRadius: "20px", background: "#1a2c2c", color: "#fff" } }
        );
        router.refresh();
      } else {
        toast.error(res.error || (isAr ? "فشل التحديث" : "Update failed"), {
          style: { borderRadius: "20px", background: "#1a2c2c", color: "#fff" }
        });
      }
    } catch (err: any) {
      toast.error(err?.message || (isAr ? "حدث خطأ في الاتصال" : "Connection error occurred"), {
        style: { borderRadius: "20px", background: "#1a2c2c", color: "#fff" }
      });
    } finally {
      setIsModerating(false);
    }
  };

  useEffect(() => {
    images.forEach((img, idx) => {
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
  }, [images, resolutions]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleImageChange = useCallback(async (index: number, file: File | null) => {
    if (!file) {
      const newImages = [...images];
      newImages[index] = "";
      setImages(newImages);
      setResolutions(prev => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      return;
    }

    setIsCompressing(prev => ({ ...prev, [index]: true }));
    
    if (file.type.startsWith('video/')) {
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoElement.src);
        if (videoElement.duration > MAX_VIDEO_DURATION) {
          toast.error(dict.home.upload_rules.video_duration_error);
          setIsCompressing(prev => ({ ...prev, [index]: false }));
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          const newImages = [...images];
          newImages[index] = reader.result as string;
          setImages(newImages);
          setResolutions(prev => ({ ...prev, [index]: `${videoElement.videoWidth}×${videoElement.videoHeight}` }));
          setIsCompressing(prev => ({ ...prev, [index]: false }));
        };
        reader.readAsDataURL(file);
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
          const MAX_RES = 1280;
          if (width > height) { if (width > MAX_RES) { height *= MAX_RES / width; width = MAX_RES; } }
          else { if (height > MAX_RES) { width *= MAX_RES / height; height = MAX_RES; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, 0, 0, width, height); }
          
          const newImages = [...images];
          const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          newImages[index] = canvas.toDataURL(outType, 0.85);
          setImages(newImages);
          setResolutions(prev => ({ ...prev, [index]: `${width}×${height}` }));
          setIsCompressing(prev => ({ ...prev, [index]: false }));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }, [images, dict.home.upload_rules.video_duration_error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!textData.name || !textData.price || !images[0]) {
      toast.error(dict.new_product.validation_error);
      setIsLoading(false);
      return;
    }

    if (textData.canPersonalize && !textData.personalizationPrompt?.trim()) {
      toast.error(dict.new_product.personalization_prompt_required || "Please fill in the Personalization Instructions.");
      setIsLoading(false);
      return;
    }

    if (textData.requiresClientImage && !textData.clientImagePrompt?.trim()) {
      toast.error(dict.new_product.client_image_prompt_required || "Please fill in the Customer Image Upload instructions.");
      setIsLoading(false);
      return;
    }

    const form = new FormData();
    form.append("name", textData.name);
    form.append("description", textData.description || "");
    form.append("price", String(textData.price).trim());
    form.append("category", textData.category);
    form.append("canPersonalize", textData.canPersonalize ? "true" : "false");
    form.append("personalizationPrompt", textData.personalizationPrompt || "");
    form.append("personalizationRequired", textData.personalizationRequired ? "true" : "false");
    form.append("requiresClientImage", textData.requiresClientImage ? "true" : "false");
    form.append("clientImagePrompt", textData.clientImagePrompt || "");
    form.append("clientImageRequired", textData.clientImageRequired ? "true" : "false");
    form.append("badge", "");
    form.append("stock", String(textData.stock).trim());
    
    images.forEach((img, i) => {
      if (img) form.append(`image-${i}`, img);
    });

    form.append("variants", JSON.stringify(variants));

    try {
      const res = await updateProduct(product.id, form);

      if (res.success) {
        toast.success(dict.edit_product.update_success || "Product updated successfully");
        router.refresh();
        onClose();
      } else {
        toast.error(res.error || dict.edit_product.update_failed || "Failed to update product.");
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error(dict.common?.error || "A connection error occurred. Please check your signal.");
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-primary/40 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 20 }}
            className="relative w-full max-w-3xl md:max-w-4xl max-h-[92dvh] sm:max-h-[86vh] bg-cream rounded-t-[1.75rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            {/* Mobile Sheet Handle */}
            <div className="sm:hidden flex justify-center pt-2.5 pb-0.5 bg-white shrink-0">
              <div className="w-10 h-1 rounded-full bg-primary/15" />
            </div>

            {/* Header */}
            <div className="px-4 py-2.5 sm:px-6 sm:py-4 md:px-8 md:py-5 border-b border-primary/5 flex justify-between items-center gap-2 sm:gap-4 bg-white shrink-0">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
                  <h2 className={cn("text-base sm:text-xl md:text-2xl font-heading font-bold text-primary leading-tight", isAr && "font-black")}>
                    {readOnly ? (
                      <>
                        {isAr ? "مراجعة" : "Review"}{" "}
                        <span className="serif italic font-normal text-accent">
                          {isAr ? "المنتج" : "Product"}
                        </span>
                      </>
                    ) : (
                      <>
                        {dict.edit_product.edit_treasure}{" "}
                        <span className="serif italic font-normal text-accent">
                          {dict.edit_product.treasure_accent || "Product"}
                        </span>
                      </>
                    )}
                  </h2>

                  {readOnly && (
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                      <span className={cn(
                        "px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest border",
                        currentStatus === "APPROVED" ? "bg-green-50 text-green-700 border-green-200" :
                        currentStatus === "REJECTED" ? "bg-red-50 text-red-700 border-red-200" :
                        currentStatus === "DRAFT"    ? "bg-slate-100 text-slate-600 border-slate-200" :
                                                       "bg-amber-50 text-amber-700 border-amber-200"
                      )}>
                        {currentStatus === "APPROVED" ? (dict.admin?.treasure_approved || (isAr ? "مقبول" : "Approved")) :
                         currentStatus === "REJECTED" ? (dict.admin?.treasure_rejected || (isAr ? "مرفوض" : "Rejected")) :
                         currentStatus === "DRAFT"    ? (dict.admin?.treasure_draft || (isAr ? "مسودة" : "Draft")) :
                                                        (dict.admin?.treasure_pending || (isAr ? "قيد المراجعة" : "Pending"))}
                      </span>

                      {isFeatured && (
                        <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest bg-accent/10 text-accent border border-accent/20 flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-accent" />
                          <span className="hidden xs:inline sm:inline">{isAr ? "مميز" : "Featured"}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <p className="hidden sm:block text-charcoal/40 text-[10px] md:text-xs mt-0.5 truncate">
                  {readOnly
                    ? (isAr ? "افحص التفاصيل والوسائط والتشكيلات لاتخاذ قرار الاعتماد أو الرفض" : "Inspect product details, media, and settings to approve or reject this listing")
                    : dict.edit_product.refine_details}
                </p>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {readOnly && (
                  <Link
                    href={`/${resolvedLang}/products/${product.slug || product.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={isAr ? "عرض صفحة المنتج بالمتجر" : "Open Storefront Page"}
                    className="w-8 h-8 sm:w-auto sm:h-9 sm:px-3 rounded-full bg-cream/60 hover:bg-primary hover:text-white text-primary text-xs font-bold border border-primary/10 transition-all flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{isAr ? "عرض بالمتجر" : "Store Page"}</span>
                  </Link>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-primary/5 rounded-full transition-colors"
                  aria-label={isAr ? "إغلاق" : "Close"}
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10 space-y-5 sm:space-y-6 md:space-y-8 custom-scrollbar">
              {currentStatus === "REJECTED" && currentRejectionReason && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 sm:p-5 md:p-6 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm border border-red-100">
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-heading font-bold text-red-900 mb-0.5 sm:mb-1">{dict.edit_product.feedback_title}</h3>
                    <p className="text-red-700/80 text-xs italic font-medium leading-relaxed break-words">"{currentRejectionReason}"</p>
                    {!readOnly && (
                      <p className="text-red-900/40 text-[10px] font-black uppercase tracking-widest mt-2.5 sm:mt-3 flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3" /> {dict.edit_product.feedback_desc}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8 md:space-y-10">
                <EssentialsSection 
                  name={textData.name}
                  price={textData.price}
                  category={textData.category}
                  description={textData.description}
                  setTextData={setTextData} 
                  readOnly={readOnly} 
                  dict={dict} 
                />

                <MediaSection 
                  images={images} 
                  resolutions={resolutions} 
                  isCompressing={isCompressing} 
                  onImageChange={handleImageChange} 
                  readOnly={readOnly} 
                  dict={dict} 
                />

                <VariationsSection 
                  options={options}
                  setOptions={setOptions}
                  variants={variants}
                  setVariants={setVariants}
                  basePrice={textData.price}
                  readOnly={readOnly}
                  dict={dict}
                />

                <DetailsSection 
                  stock={textData.stock}
                  canPersonalize={textData.canPersonalize}
                  personalizationPrompt={textData.personalizationPrompt}
                  personalizationRequired={textData.personalizationRequired}
                  requiresClientImage={textData.requiresClientImage}
                  clientImagePrompt={textData.clientImagePrompt}
                  clientImageRequired={textData.clientImageRequired}
                  setTextData={setTextData} 
                  readOnly={readOnly} 
                  dict={dict} 
                />
              </form>
            </div>

            {/* Inline Admin Rejection Reason Drawer */}
            <AnimatePresence>
              {readOnly && showRejectBox && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-red-50/95 border-t border-red-200 px-4 py-3 sm:px-6 sm:py-4 md:px-8 shrink-0 overflow-hidden"
                >
                  <div className="space-y-2.5 sm:space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-red-900 flex items-center gap-1.5 min-w-0">
                        <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 shrink-0" />
                        <span className="truncate">{isAr ? "سبب الرفض وملاحظات التعديل" : "Rejection Feedback for Artisan"}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowRejectBox(false)}
                        className="text-xs font-bold text-red-700/70 hover:text-red-900 transition-colors shrink-0"
                      >
                        {dict.common?.cancel || (isAr ? "إلغاء" : "Cancel")}
                      </button>
                    </div>
                    <textarea
                      value={rejectReasonInput}
                      onChange={(e) => setRejectReasonInput(stripEmojis(e.target.value))}
                      placeholder={isAr ? "مثال: يرجى رفع صور بدون علامة مائية أو توضيح الخامة..." : "e.g., Please upload clean photos without watermarks or clarify dimensions..."}
                      className="w-full h-16 sm:h-20 p-3 sm:p-3.5 bg-white rounded-xl border border-red-200 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 resize-none text-xs md:text-sm font-medium text-primary"
                      autoFocus
                    />
                    <div className="grid grid-cols-2 sm:flex sm:justify-end gap-2 sm:gap-2.5">
                      <button
                        type="button"
                        onClick={() => setShowRejectBox(false)}
                        className="px-4 h-9 rounded-full border border-red-200 bg-white text-red-800 font-bold text-xs hover:bg-red-100/50 transition-all"
                      >
                        {dict.common?.cancel || (isAr ? "إلغاء" : "Cancel")}
                      </button>
                      <button
                        type="button"
                        disabled={isModerating}
                        onClick={() => handleModerateStatus("REJECTED", rejectReasonInput)}
                        className="px-4 sm:px-5 h-9 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {isModerating ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
                        <span className="truncate">{isAr ? "تأكيد الرفض" : "Confirm Reject"}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            {readOnly ? (
              <div className="px-3.5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4 md:px-8 md:py-5 bg-white/95 backdrop-blur-xl border-t border-primary/5 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
                {/* Secondary Admin Controls (Icon-only on mobile, labeled pills on >= sm) */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={isModerating}
                    onClick={handleToggleFeatured}
                    aria-label={isFeatured ? (isAr ? "مميز بالرئيسية" : "Featured") : (isAr ? "تمييز بالرئيسية" : "Feature")}
                    className={cn(
                      "w-10 h-10 sm:w-auto sm:px-4 rounded-full text-xs font-bold border transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50",
                      isFeatured
                        ? "bg-accent/10 text-accent border-accent/30 hover:bg-accent/15"
                        : "bg-cream/50 text-primary/70 border-primary/10 hover:bg-cream hover:text-primary"
                    )}
                    title={isAr ? "عرض أو إخفاء المنتج في الصفحة الرئيسية" : "Toggle Featured on Home"}
                  >
                    <Star className={cn("w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0", isFeatured && "fill-accent text-accent")} />
                    <span className="hidden sm:inline">{isFeatured ? (isAr ? "مميز بالرئيسية" : "Featured") : (isAr ? "تمييز بالرئيسية" : "Feature")}</span>
                  </button>

                  {currentStatus !== "PENDING" && (
                    <button
                      type="button"
                      disabled={isModerating}
                      onClick={() => handleModerateStatus("PENDING")}
                      aria-label={dict.admin?.pending || (isAr ? "قيد المراجعة" : "Set Pending")}
                      className="w-10 h-10 sm:w-auto sm:px-4 rounded-full text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                      title={isAr ? "إرجاع المنتج لحالة قيد المراجعة" : "Move back to Pending Review"}
                    >
                      <Clock className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
                      <span className="hidden sm:inline">{dict.admin?.pending || (isAr ? "قيد المراجعة" : "Set Pending")}</span>
                    </button>
                  )}
                </div>

                {/* Primary Admin Decisions (Balanced 2-column stretch on mobile, right-aligned pills on >= sm) */}
                <div className="flex-1 sm:flex-initial grid grid-cols-2 sm:flex items-center justify-end gap-2 sm:gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={onClose}
                    className="hidden sm:inline-flex items-center justify-center px-4 h-10 text-primary/70 font-bold hover:bg-primary/5 hover:text-primary rounded-full transition-all text-xs md:text-sm"
                  >
                    {isAr ? "إغلاق" : "Close"}
                  </button>

                  <button
                    type="button"
                    disabled={isModerating}
                    onClick={() => setShowRejectBox(prev => !prev)}
                    className={cn(
                      "w-full sm:w-auto px-3 sm:px-5 h-10 rounded-full font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 border disabled:opacity-50 min-w-0",
                      showRejectBox || currentStatus === "REJECTED"
                        ? "bg-red-600 text-white border-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20"
                        : "bg-red-50 text-red-600 border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600"
                    )}
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span className="truncate sm:hidden">
                      {currentStatus === "REJECTED"
                        ? (isAr ? "مرفوض" : "Rejected")
                        : (dict.admin?.reject || (isAr ? "رفض" : "Reject"))}
                    </span>
                    <span className="hidden sm:inline whitespace-nowrap">
                      {currentStatus === "REJECTED"
                        ? (isAr ? "تعديل سبب الرفض" : "Edit Rejection")
                        : (dict.admin?.reject || (isAr ? "رفض" : "Reject"))}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isModerating || currentStatus === "APPROVED"}
                    onClick={() => handleModerateStatus("APPROVED")}
                    className={cn(
                      "w-full sm:w-auto px-3 sm:px-6 h-10 rounded-full font-bold text-xs md:text-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-60 min-w-0",
                      currentStatus === "APPROVED"
                        ? "bg-green-100 text-green-700 border border-green-200 cursor-default"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/20"
                    )}
                  >
                    {isModerating && !showRejectBox ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    )}
                    <span className="truncate sm:hidden">
                      {currentStatus === "APPROVED"
                        ? (dict.admin?.approved || (isAr ? "مقبول" : "Approved"))
                        : (dict.admin?.approve || (isAr ? "قبول" : "Approve"))}
                    </span>
                    <span className="hidden sm:inline whitespace-nowrap">
                      {currentStatus === "APPROVED"
                        ? (dict.admin?.approved || (isAr ? "معتمد بالفعل" : "Approved"))
                        : (dict.admin?.approve || (isAr ? "قبول واعتماد" : "Approve"))}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4 md:px-8 md:py-5 bg-white/90 backdrop-blur-xl border-t border-primary/5 grid grid-cols-2 sm:flex sm:flex-row justify-end gap-2.5 sm:gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-4 sm:px-6 h-10 sm:h-11 text-primary font-bold bg-cream/60 sm:bg-transparent hover:bg-primary/5 rounded-full transition-all text-xs md:text-sm"
                >
                  {dict.common.cancel}
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className={cn(
                    "px-5 sm:px-8 h-10 sm:h-11 font-bold rounded-full transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 text-xs md:text-sm",
                    product.status === "REJECTED" 
                      ? "bg-accent text-white hover:bg-accent-light shadow-accent/20" 
                      : "bg-primary text-white hover:bg-primary-light shadow-primary/20"
                  )}
                >
                  <span className="truncate">
                    {isLoading 
                      ? dict.edit_product.saving_changes 
                      : (product.status === "REJECTED" ? dict.edit_product.resolve_and_resubmit : dict.profile.save_changes)}
                  </span>
                  <Save className="w-4 h-4 shrink-0" />
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const CategoryDropdown = memo(({ value, onChange, disabled = false, dict }: { value: string, onChange: (val: string) => void, disabled?: boolean, dict: any }) => {
  return (
    <EtsyCategoryPicker
      value={value}
      onChange={onChange}
      disabled={disabled}
      dict={dict}
    />
  );
});

CategoryDropdown.displayName = "CategoryDropdown";
