"use client";

import { useState, useMemo } from "react";
import {
  Truck,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Clock,
  MapPin,
  DollarSign,
  Loader2,
  CheckCircle2,
  Power
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createShippingMethod,
  updateShippingMethod,
  deleteShippingMethod,
  toggleShippingMethod
} from "@/lib/actions";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

interface ShippingMethod {
  id: string;
  name: string;
  price: number;
  estimatedDays: string | null;
  isActive: boolean;
}

interface AdminShippingClientProps {
  initialMethods: any[];
  dict: any;
  lang?: string;
}

export function AdminShippingClient({ initialMethods, dict, lang }: AdminShippingClientProps) {
  const isAr = lang === "ar" || dict?.common?.lang === "ar";
  const [methods, setMethods] = useState<ShippingMethod[]>(initialMethods);
  const [isAdding, setIsAdding] = useState(false);
  const [editingMethod, setEditingMethod] = useState<ShippingMethod | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    estimatedDays: ""
  });

  const stats = useMemo(() => {
    const total = methods.length;
    const active = methods.filter((m) => m.isActive).length;
    const avgRate =
      total > 0
        ? Math.round(methods.reduce((acc, m) => acc + (Number(m.price) || 0), 0) / total)
        : 0;
    return { total, active, avgRate };
  }, [methods]);

  const handleToggle = async (id: string, currentStatus: boolean) => {
    const res = await toggleShippingMethod(id, !currentStatus);
    if (res.success) {
      setMethods((prev) => prev.map((m) => (m.id === id ? { ...m, isActive: !currentStatus } : m)));
      toast.success(dict.admin?.status_updated || (isAr ? "تم تحديث الحالة" : "Status updated"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isAr ? "هل أنت متأكد من حذف منطقة الشحن هذه؟" : "Are you sure you want to delete this shipping zone?")) return;
    const res = await deleteShippingMethod(id);
    if (res.success) {
      setMethods((prev) => prev.filter((m) => m.id !== id));
      toast.success(dict.admin?.zone_removed || (isAr ? "تم حذف المنطقة" : "Shipping zone removed"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const payload = {
      name: formData.name,
      price: parseFloat(formData.price),
      estimatedDays: formData.estimatedDays
    };

    let res;
    if (editingMethod) {
      res = await updateShippingMethod(editingMethod.id, payload);
    } else {
      res = await createShippingMethod(payload);
    }

    setIsLoading(false);

    if (res.success) {
      if (editingMethod) {
        setMethods((prev) => prev.map((m) => (m.id === editingMethod.id ? { ...m, ...payload } : m)));
        toast.success(isAr ? "تم تحديث منطقة الشحن" : "Shipping zone updated");
      } else {
        setMethods((prev) => [...prev, res.method]);
        toast.success(isAr ? "تمت إضافة منطقة شحن جديدة" : "New shipping zone added");
      }
      resetForm();
    } else {
      toast.error(res.error || (isAr ? "حدث خطأ ما" : "Something went wrong"));
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingMethod(null);
    setFormData({ name: "", price: "", estimatedDays: "" });
  };

  const startEdit = (method: ShippingMethod) => {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      price: method.price.toString(),
      estimatedDays: method.estimatedDays || ""
    });
    setIsAdding(true);
  };

  const titleParts = (dict.admin?.shipping_management || "Shipping Management").split(" ");
  const firstWord = titleParts[0];
  const restWords = titleParts.slice(1).join(" ") || "Zones";

  return (
    <div className="space-y-8 md:space-y-10" dir={isAr ? "rtl" : "ltr"}>
      {/* Full-Width Responsive Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-5 border-b border-primary/5 pb-6 sm:pb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-black text-primary tracking-tighter mb-2">
            {firstWord}{" "}
            <span className="serif italic text-accent font-normal">{restWords}</span>
          </h1>
          <p className="text-charcoal/45 text-xs sm:text-sm md:text-base font-medium leading-relaxed max-w-xl">
            {dict.admin?.shipping_desc || "Manage your delivery regions and flat-rate costs. Changes here affect checkout instantly."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
          {/* Quick Summary Counters */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="bg-white px-4 py-2.5 rounded-2xl border border-primary/5 shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-widest text-primary/40">
                {isAr ? "إجمالي المناطق" : "Total Zones"}
              </p>
              <p className="text-lg sm:text-xl font-black text-primary leading-tight">{stats.total}</p>
            </div>
            <div className="bg-white px-4 py-2.5 rounded-2xl border border-primary/5 shadow-sm">
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-700/60">
                {isAr ? "مفعلة" : "Active"}
              </p>
              <p className="text-lg sm:text-xl font-black text-emerald-600 leading-tight">{stats.active}</p>
            </div>
            {stats.total > 0 && (
              <div className="hidden sm:block bg-white px-4 py-2.5 rounded-2xl border border-primary/5 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-widest text-primary/40">
                  {isAr ? "متوسط السعر" : "Avg. Rate"}
                </p>
                <p className="text-lg sm:text-xl font-black text-accent leading-tight">
                  {stats.avgRate} {dict.product?.currency || "EGP"}
                </p>
              </div>
            )}
          </div>

          {!isAdding && (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-full sm:w-auto px-6 h-12 bg-primary hover:bg-primary-light text-white font-bold rounded-2xl flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-xl shadow-primary/15 shrink-0 cursor-pointer text-xs uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              <span>{dict.admin?.add_zone || (isAr ? "إضافة منطقة جديدة" : "Add New Zone")}</span>
            </button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isAdding ? (
          <motion.div
            key="shipping-form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 border border-primary/5 shadow-2xl shadow-primary/5 space-y-6"
          >
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-heading font-black text-primary">
                    {editingMethod
                      ? (isAr ? "تعديل منطقة الشحن" : "Edit Shipping Zone")
                      : (dict.admin?.add_zone || (isAr ? "إضافة منطقة شحن جديدة" : "Add New Shipping Zone"))}
                  </h2>
                  <p className="text-xs text-charcoal/45 font-medium">
                    {isAr
                      ? "حدد اسم المحافظة أو النطاق الجغرافي وتكلفة التوصيل ومدة الشحن المتوقعة."
                      : "Set the region name, flat-rate delivery fee, and estimated transit window."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="w-9 h-9 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary/60 hover:text-primary flex items-center justify-center transition-colors cursor-pointer shrink-0"
                aria-label={dict.common?.cancel || "Cancel"}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-primary/45 ms-1">
                    {dict.admin?.zone_name || (isAr ? "اسم المنطقة" : "Zone Name")}
                  </label>
                  <div className="relative group">
                    <MapPin className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/25 group-focus-within:text-accent transition-colors pointer-events-none" />
                    <input
                      required
                      type="text"
                      placeholder={isAr ? "مثال: القاهرة والجيزة والإسكندرية" : "e.g. Cairo, Giza and Alexandria"}
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full h-12 sm:h-13 ps-11 pe-4 bg-cream/30 border border-primary/10 rounded-xl sm:rounded-2xl focus:outline-none focus:border-accent focus:bg-white transition-all font-bold text-primary text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-primary/45 ms-1">
                    {dict.admin?.cost_egp || (isAr ? "تكلفة الشحن (ج.م)" : "Cost (EGP)")}
                  </label>
                  <div className="relative group">
                    <DollarSign className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/25 group-focus-within:text-accent transition-colors pointer-events-none" />
                    <input
                      required
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={formData.price}
                      onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                      className="w-full h-12 sm:h-13 ps-11 pe-4 bg-cream/30 border border-primary/10 rounded-xl sm:rounded-2xl focus:outline-none focus:border-accent focus:bg-white transition-all font-bold text-primary text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-primary/45 ms-1">
                    {dict.admin?.est_delivery || (isAr ? "مدة التوصيل المتوقعة" : "Est. Delivery")}
                  </label>
                  <div className="relative group">
                    <Clock className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/25 group-focus-within:text-accent transition-colors pointer-events-none" />
                    <input
                      type="text"
                      placeholder={isAr ? "مثال: 2-3 أيام عمل" : "e.g. 2-3 business days"}
                      value={formData.estimatedDays}
                      onChange={(e) => setFormData((prev) => ({ ...prev, estimatedDays: e.target.value }))}
                      className="w-full h-12 sm:h-13 ps-11 pe-4 bg-cream/30 border border-primary/10 rounded-xl sm:rounded-2xl focus:outline-none focus:border-accent focus:bg-white transition-all font-bold text-primary text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-primary/5">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 h-11 sm:h-12 border border-primary/10 text-primary font-bold rounded-xl sm:rounded-2xl hover:bg-primary/5 transition-all cursor-pointer text-xs uppercase tracking-wider"
                >
                  {dict.common?.cancel || (isAr ? "إلغاء" : "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-8 h-11 sm:h-12 bg-primary text-white font-bold rounded-xl sm:rounded-2xl hover:bg-primary-light transition-all shadow-lg shadow-primary/15 flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider disabled:opacity-60"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>
                    {editingMethod
                      ? (dict.common?.save || (isAr ? "حفظ التعديلات" : "Save Changes"))
                      : (dict.admin?.create_zone || (isAr ? "إنشاء المنطقة" : "Create Zone"))}
                  </span>
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="shipping-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5"
          >
            {methods.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl sm:rounded-[2.5rem] p-8 sm:p-16 text-center border border-dashed border-primary/10">
                <Truck className="w-12 h-12 text-primary/15 mx-auto mb-4" />
                <h3 className="text-lg sm:text-xl font-heading font-bold text-primary mb-2">
                  {dict.admin?.no_zones_title || (isAr ? "لم تتم إضافة مناطق شحن بعد" : "No zones defined yet")}
                </h3>
                <p className="text-charcoal/45 text-xs sm:text-sm max-w-sm mx-auto mb-6 sm:mb-8">
                  {dict.admin?.no_zones_desc || (isAr ? "ابدأ بإضافة أول منطقة شحن لتفعيل إتمام الطلبات." : "Start by adding your first shipping region to enable checkout.")}
                </p>
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="px-6 sm:px-8 h-11 sm:h-12 bg-primary text-white hover:bg-primary-light font-bold rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider"
                >
                  {dict.admin?.add_first_zone || dict.admin?.add_zone || (isAr ? "إضافة أول منطقة" : "Add Your First Zone")}
                </button>
              </div>
            ) : (
              methods.map((method, idx) => (
                <motion.div
                  key={method.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.25) }}
                  className={cn(
                    "group bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border transition-all duration-200 flex flex-col justify-between gap-4 sm:gap-5 relative overflow-hidden",
                    method.isActive
                      ? "border-primary/5 shadow-lg shadow-primary/5 hover:shadow-2xl hover:shadow-primary/10 hover:border-accent/25"
                      : "opacity-65 border-primary/5 bg-white/80"
                  )}
                >
                  {/* Top Bar: Icon + Status Badge + Quick Actions */}
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <div
                          className={cn(
                            "w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-xl flex items-center justify-center transition-colors shrink-0",
                            method.isActive ? "bg-accent/10 text-accent" : "bg-primary/5 text-primary/30"
                          )}
                        >
                          <Truck className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                        </div>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider border shrink-0",
                            method.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                              : "bg-primary/5 text-primary/45 border-primary/10"
                          )}
                        >
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              method.isActive ? "bg-emerald-500" : "bg-primary/30"
                            )}
                          />
                          <span>
                            {method.isActive
                              ? (dict.admin?.active || (isAr ? "مفعلة" : "Active"))
                              : (dict.admin?.inactive || (isAr ? "متوقفة" : "Inactive"))}
                          </span>
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggle(method.id, method.isActive)}
                          className={cn(
                            "w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center transition-all border cursor-pointer active:scale-95",
                            method.isActive
                              ? "bg-emerald-50 border-emerald-200/80 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                              : "bg-primary/5 border-primary/10 text-primary/45 hover:bg-primary hover:text-white"
                          )}
                          title={
                            method.isActive
                              ? (isAr ? "إيقاف المنطقة" : "Disable Zone")
                              : (isAr ? "تفعيل المنطقة" : "Enable Zone")
                          }
                        >
                          {method.isActive ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Power className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEdit(method)}
                          className="w-7.5 h-7.5 sm:w-8 sm:h-8 bg-primary/5 border border-primary/10 text-primary rounded-lg sm:rounded-xl flex items-center justify-center hover:bg-primary hover:text-white transition-all cursor-pointer active:scale-95"
                          title={isAr ? "تعديل المنطقة" : "Edit Zone"}
                        >
                          <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(method.id)}
                          className="w-7.5 h-7.5 sm:w-8 sm:h-8 bg-red-50 border border-red-100 text-red-600 rounded-lg sm:rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all cursor-pointer active:scale-95"
                          title={isAr ? "حذف المنطقة" : "Delete Zone"}
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Full-Width Zone Title (Never squeezed by buttons) */}
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-primary/35 mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-accent/70 shrink-0" />
                        <span>{isAr ? "نطاق التوصيل" : "Delivery Region"}</span>
                      </p>
                      <h3 className="text-base sm:text-lg lg:text-xl font-heading font-black text-primary leading-snug break-words">
                        {method.name}
                      </h3>
                    </div>
                  </div>

                  {/* Structured 2-Column Rate & Transit Footer */}
                  <div className="grid grid-cols-[auto_1fr] items-center gap-2.5 p-3 rounded-xl sm:rounded-2xl bg-cream/50 border border-primary/5">
                    <div className="min-w-0 shrink-0 pe-2.5 border-e border-primary/10">
                      <p className="text-[9px] font-black uppercase tracking-wider text-primary/40 mb-0.5 flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-accent shrink-0" />
                        <span>{isAr ? "رسوم الشحن" : "Flat Rate"}</span>
                      </p>
                      <p className="text-sm sm:text-base font-black text-accent leading-tight whitespace-nowrap">
                        {method.price === 0
                          ? (dict.checkout?.free || (isAr ? "مجاني" : "Free"))
                          : `${method.price} ${dict.product?.currency || "EGP"}`}
                      </p>
                    </div>

                    <div className="min-w-0 ps-1">
                      <p className="text-[9px] font-black uppercase tracking-wider text-primary/40 mb-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary/45 shrink-0" />
                        <span className="truncate">{isAr ? "مدة التوصيل" : "Transit Window"}</span>
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-primary leading-tight truncate" title={method.estimatedDays || undefined}>
                        {method.estimatedDays || (isAr ? "غير محدد" : "Standard")}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
