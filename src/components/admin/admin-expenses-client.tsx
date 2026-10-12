"use client";

import { useState } from "react";
import {
  ReceiptText,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  CreditCard,
  User,
  DollarSign,
  TrendingUp,
  FileText,
  X,
  UploadCloud,
  CheckCircle2,
  ExternalLink,
  Download,
  Printer,
  PieChart,
  Tag,
  Truck,
  Box,
  Laptop,
  Briefcase,
  Layers,
  ChevronDown,
  Check,
  Landmark,
  Banknote,
  Smartphone
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  createPlatformExpenseAction,
  updatePlatformExpenseAction,
  deletePlatformExpenseAction,
  getPlatformExpensesAction
} from "@/lib/actions";
import { toast } from "react-hot-toast";
import { useParams } from "next/navigation";

interface AdminExpensesClientProps {
  initialExpenses: any[];
  initialAnalytics: {
    totalSpent: number;
    thisMonthSpent: number;
    lastMonthSpent: number;
    totalCount: number;
    categoryTotals: Record<string, number>;
    categoryCounts: Record<string, number>;
  };
  dict: any;
}

type ExpenseCategoryType =
  | "MARKETING"
  | "PACKAGING_SUPPLIES"
  | "LOGISTICS_SHIPPING"
  | "SOFTWARE_SERVICES"
  | "EQUIPMENT_TOOLS"
  | "OFFICE_OPERATIONS"
  | "SALARIES_CONTRACTORS"
  | "OTHER";

export function AdminExpensesClient({
  initialExpenses,
  initialAnalytics,
  dict
}: AdminExpensesClientProps) {
  const params = useParams();
  const lang = (params?.lang as string) || "en";
  const isAr = lang === "ar";

  const [expenses, setExpenses] = useState<any[]>(initialExpenses);
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [timeframeFilter, setTimeframeFilter] = useState<"ALL" | "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR">("ALL");

  // Custom Dropdowns State
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [isFormCategoryOpen, setIsFormCategoryOpen] = useState(false);
  const [isFormPaymentOpen, setIsFormPaymentOpen] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields state
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<ExpenseCategoryType>("OTHER");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [formPaidBy, setFormPaidBy] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState("CARD");
  const [formReceiptImage, setFormReceiptImage] = useState<string>("");
  const [formNotes, setFormNotes] = useState("");

  const categoryLabels: Record<ExpenseCategoryType, { en: string; ar: string; icon: any; color: string; bg: string }> = {
    MARKETING: {
      en: "Marketing & Ads",
      ar: "التسويق والإعلانات",
      icon: TrendingUp,
      color: "text-purple-700",
      bg: "bg-purple-50 border-purple-200"
    },
    PACKAGING_SUPPLIES: {
      en: "Packaging & Boxes",
      ar: "التغليف والعلب",
      icon: Box,
      color: "text-amber-700",
      bg: "bg-amber-50 border-amber-200"
    },
    LOGISTICS_SHIPPING: {
      en: "Shipping & Couriers",
      ar: "الشحن واللوجستيات",
      icon: Truck,
      color: "text-blue-700",
      bg: "bg-blue-50 border-blue-200"
    },
    SOFTWARE_SERVICES: {
      en: "Software & Hosting",
      ar: "البرمجيات والاستضافة",
      icon: Laptop,
      color: "text-cyan-700",
      bg: "bg-cyan-50 border-cyan-200"
    },
    EQUIPMENT_TOOLS: {
      en: "Equipment & Tools",
      ar: "المعدات والأدوات",
      icon: Layers,
      color: "text-emerald-700",
      bg: "bg-emerald-50 border-emerald-200"
    },
    OFFICE_OPERATIONS: {
      en: "Office & Utilities",
      ar: "المكتب والتشغيل",
      icon: Briefcase,
      color: "text-stone-700",
      bg: "bg-stone-100 border-stone-300"
    },
    SALARIES_CONTRACTORS: {
      en: "Salaries & Services",
      ar: "الرواتب والخدمات",
      icon: User,
      color: "text-indigo-700",
      bg: "bg-indigo-50 border-indigo-200"
    },
    OTHER: {
      en: "Miscellaneous",
      ar: "مصاريف أخرى",
      icon: Tag,
      color: "text-slate-700",
      bg: "bg-slate-100 border-slate-200"
    }
  };

  const paymentMethodLabels: Record<string, { en: string; ar: string; icon: any }> = {
    CARD: { en: "Bank Card / Credit Card", ar: "بطاقة بنكية / ائتمان", icon: CreditCard },
    WALLET: { en: "E-Wallet / InstaPay", ar: "محفظة إلكترونية (فودافون كاش / إنستاباي)", icon: Smartphone },
    BANK_TRANSFER: { en: "Bank Transfer", ar: "تحويل بنكي", icon: Landmark },
    CASH: { en: "Cash", ar: "نقدي (كاش)", icon: Banknote },
    OTHER: { en: "Other", ar: "أخرى", icon: Tag }
  };

  // Filter expenses based on search, category, timeframe
  const filteredExpenses = expenses.filter((exp) => {
    if (categoryFilter !== "ALL" && exp.category !== categoryFilter) return false;

    if (timeframeFilter !== "ALL") {
      const expDate = new Date(exp.date);
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      const startOfThisYear = new Date(now.getFullYear(), 0, 1);

      if (timeframeFilter === "THIS_MONTH" && expDate < startOfThisMonth) return false;
      if (timeframeFilter === "LAST_MONTH" && (expDate < startOfLastMonth || expDate > endOfLastMonth)) return false;
      if (timeframeFilter === "THIS_YEAR" && expDate < startOfThisYear) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = exp.title?.toLowerCase().includes(q);
      const matchPaidBy = exp.paidBy?.toLowerCase().includes(q);
      const matchNotes = exp.notes?.toLowerCase().includes(q);
      const matchCategory = exp.category?.toLowerCase().includes(q);
      return matchTitle || matchPaidBy || matchNotes || matchCategory;
    }

    return true;
  });

  const resetForm = () => {
    setFormTitle("");
    setFormCategory("OTHER");
    setFormAmount("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormPaidBy("");
    setFormPaymentMethod("CARD");
    setFormReceiptImage("");
    setFormNotes("");
    setEditingExpense(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (exp: any) => {
    setEditingExpense(exp);
    setFormTitle(exp.title || "");
    setFormCategory(exp.category || "OTHER");
    setFormAmount(String(exp.amount || ""));
    setFormDate(new Date(exp.date).toISOString().split("T")[0]);
    setFormPaidBy(exp.paidBy || "");
    setFormPaymentMethod(exp.paymentMethod || "CARD");
    setFormReceiptImage(exp.receiptUrl || "");
    setFormNotes(exp.notes || "");
    setIsAddModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(isAr ? "حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)" : "File is too large (max 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormReceiptImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      toast.error(isAr ? "يرجى كتابة اسم أو وصف المصروف" : "Please enter expense description");
      return;
    }

    const parsedAmount = parseFloat(formAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error(isAr ? "يرجى كتابة مبلغ صحيح" : "Please enter a valid amount");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingExpense) {
        // Update existing expense
        const res = await updatePlatformExpenseAction({
          id: editingExpense.id,
          title: formTitle,
          category: formCategory,
          amount: parsedAmount,
          currency: "EGP",
          date: formDate,
          paidBy: formPaidBy,
          paymentMethod: formPaymentMethod,
          receiptImage: formReceiptImage,
          notes: formNotes,
          lang: isAr ? "ar" : "en"
        });

        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success(isAr ? "تم تحديث المصروف بنجاح" : "Expense updated successfully");
          setIsAddModalOpen(false);
          refreshData();
        }
      } else {
        // Create new expense
        const res = await createPlatformExpenseAction({
          title: formTitle,
          category: formCategory,
          amount: parsedAmount,
          currency: "EGP",
          date: formDate,
          paidBy: formPaidBy,
          paymentMethod: formPaymentMethod,
          receiptImage: formReceiptImage,
          notes: formNotes,
          lang: isAr ? "ar" : "en"
        });

        if (res.error) {
          toast.error(res.error);
        } else {
          toast.success(isAr ? "تم تسجيل المصروف بنجاح" : "Expense recorded successfully");
          setIsAddModalOpen(false);
          refreshData();
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deletingId) return;
    setIsSubmitting(true);

    try {
      const res = await deletePlatformExpenseAction(deletingId, isAr ? "ar" : "en");
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(isAr ? "تم حذف المصروف بنجاح" : "Expense deleted successfully");
        setDeletingId(null);
        refreshData();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const refreshData = async () => {
    const res = await getPlatformExpensesAction();
    if (res.expenses) {
      setExpenses(res.expenses);
    }
    if (res.analytics) {
      setAnalytics(res.analytics);
    }
  };

  const exportCSV = () => {
    if (filteredExpenses.length === 0) {
      toast.error(isAr ? "لا توجد بيانات للتصدير" : "No expenses to export");
      return;
    }

    const headers = ["ID", "Title", "Category", "Amount (EGP)", "Date", "Paid By", "Payment Method", "Notes"];
    const rows = filteredExpenses.map((exp) => [
      exp.id,
      `"${(exp.title || "").replace(/"/g, '""')}"`,
      categoryLabels[exp.category as ExpenseCategoryType]?.en || exp.category,
      exp.amount,
      new Date(exp.date).toISOString().split("T")[0],
      `"${(exp.paidBy || "").replace(/"/g, '""')}"`,
      exp.paymentMethod || "N/A",
      `"${(exp.notes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `giftisan_expenses_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Find top spending category
  let topCategoryKey = "OTHER";
  let topCategoryAmount = 0;
  if (analytics.categoryTotals) {
    for (const [cat, amt] of Object.entries(analytics.categoryTotals)) {
      if (amt > topCategoryAmount) {
        topCategoryAmount = amt;
        topCategoryKey = cat;
      }
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-black text-primary flex items-center gap-2.5 sm:gap-3 leading-tight">
            <ReceiptText className="w-7 h-7 sm:w-8 sm:h-8 text-accent shrink-0" />
            <span>{isAr ? "مصاريف المنصة والتكاليف" : "Platform Expenses & Purchases"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-charcoal/50 mt-1 max-w-xl">
            {isAr
              ? "سجل وتتبع جميع المشتريات التشغيلية، التغليف، الإعلانات، الاستضافة، وتكاليف الفريق."
              : "Track and manage all operational spendings, packaging, marketing ads, hosting, and team expenses."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={exportCSV}
            className="flex-1 sm:flex-initial justify-center px-3.5 sm:px-4 py-2 sm:py-2.5 bg-white hover:bg-cream border border-primary/10 rounded-xl text-xs font-bold text-primary flex items-center gap-1.5 sm:gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent" />
            <span>{isAr ? "تصدير CSV" : "Export CSV"}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 sm:flex-initial justify-center px-3.5 sm:px-4 py-2 sm:py-2.5 bg-white hover:bg-cream border border-primary/10 rounded-xl text-xs font-bold text-primary flex items-center gap-1.5 sm:gap-2 transition-all shadow-sm cursor-pointer no-print"
          >
            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary/60" />
            <span>{isAr ? "طباعة" : "Print Report"}</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="w-full sm:w-auto justify-center px-4 sm:px-5 py-2.5 bg-primary hover:bg-brand text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? "تسجيل مصروف جديد" : "Log New Expense"}</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Total Spent */}
        <div className="p-3.5 sm:p-5 md:p-6 bg-white rounded-2xl sm:rounded-3xl border border-primary/5 shadow-sm space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-charcoal/40 truncate">
              {isAr ? "إجمالي المصاريف" : "Total Platform Spend"}
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl md:text-3xl font-black text-primary font-heading truncate">
            EGP {analytics.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] sm:text-xs text-charcoal/50 font-medium block truncate">
            {analytics.totalCount} {isAr ? "عملية مسجلة" : "recorded entries"}
          </span>
        </div>

        {/* Card 2: This Month */}
        <div className="p-3.5 sm:p-5 md:p-6 bg-white rounded-2xl sm:rounded-3xl border border-primary/5 shadow-sm space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-charcoal/40 truncate">
              {isAr ? "مصاريف هذا الشهر" : "This Month"}
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl md:text-3xl font-black text-emerald-700 font-heading truncate">
            EGP {analytics.thisMonthSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] sm:text-xs text-charcoal/50 font-medium block truncate">
            {isAr ? "الشهر الحالي" : "Current month"}
          </span>
        </div>

        {/* Card 3: Last Month */}
        <div className="p-3.5 sm:p-5 md:p-6 bg-white rounded-2xl sm:rounded-3xl border border-primary/5 shadow-sm space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-charcoal/40 truncate">
              {isAr ? "مصاريف الشهر الماضي" : "Last Month"}
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-2xl md:text-3xl font-black text-primary font-heading truncate">
            EGP {analytics.lastMonthSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] sm:text-xs text-charcoal/50 font-medium block truncate">
            {isAr ? "الشهر المنصرم" : "Previous month"}
          </span>
        </div>

        {/* Card 4: Top Category */}
        <div className="p-3.5 sm:p-5 md:p-6 bg-white rounded-2xl sm:rounded-3xl border border-primary/5 shadow-sm space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-charcoal/40 truncate">
              {isAr ? "أعلى بند إنفاق" : "Top Category"}
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <PieChart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <p className="text-base sm:text-lg md:text-xl font-bold text-primary truncate">
            {categoryLabels[topCategoryKey as ExpenseCategoryType]?.[isAr ? "ar" : "en"] || topCategoryKey}
          </p>
          <span className="text-[11px] sm:text-xs text-purple-700 font-bold block truncate">
            EGP {topCategoryAmount.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Category Breakdown Progress Bars */}
      <div className="p-4 sm:p-6 bg-white rounded-2xl sm:rounded-3xl border border-primary/5 shadow-sm space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-primary">
              {isAr ? "توزيع المصاريف حسب الأقسام" : "Category Spending Breakdown"}
            </h3>
            {categoryFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setCategoryFilter("ALL")}
                className="text-[10px] text-accent font-bold hover:underline cursor-pointer"
              >
                ({isAr ? "إلغاء الفلتر" : "Clear filter"})
              </button>
            )}
          </div>
          <span className="text-[10px] sm:text-xs text-charcoal/40 font-medium">
            {Object.keys(analytics.categoryTotals || {}).length} {isAr ? "أقسام مفعلة" : "active categories"}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 pt-1 sm:pt-2">
          {(Object.keys(categoryLabels) as ExpenseCategoryType[]).map((catKey) => {
            const catInfo = categoryLabels[catKey];
            const amount = analytics.categoryTotals?.[catKey] || 0;
            const count = analytics.categoryCounts?.[catKey] || 0;
            const percentage = analytics.totalSpent > 0 ? (amount / analytics.totalSpent) * 100 : 0;
            const Icon = catInfo.icon;

            return (
              <div
                key={catKey}
                onClick={() => setCategoryFilter(categoryFilter === catKey ? "ALL" : catKey)}
                className={cn(
                  "p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md",
                  catInfo.bg,
                  categoryFilter === catKey ? "ring-2 ring-primary shadow-sm" : ""
                )}
              >
                <div>
                  {/* Row 1: Icon on left, bill count badge on right */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white/80 border border-black/5 flex items-center justify-center shrink-0 shadow-sm">
                      <Icon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", catInfo.color)} />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold text-charcoal/60 px-1.5 sm:px-2 py-0.5 rounded-md bg-white/80 border border-black/5 shrink-0">
                      {count} {isAr ? "فاتورة" : "bills"}
                    </span>
                  </div>

                  {/* Row 2: Title with full available width - no collision with badge or icon */}
                  <p className="text-xs font-bold text-primary truncate leading-snug mb-2" title={catInfo[isAr ? "ar" : "en"]}>
                    {catInfo[isAr ? "ar" : "en"]}
                  </p>
                </div>

                <div>
                  {/* Row 3: Amount and percentage */}
                  <div className="flex items-baseline justify-between gap-1">
                    <p className="text-xs sm:text-sm font-black text-primary truncate">
                      EGP {amount.toLocaleString()}
                    </p>
                    <span className="text-[9px] sm:text-[10px] font-mono font-bold text-charcoal/50 shrink-0">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>

                  {/* Row 4: Progress bar */}
                  <div className="w-full h-1 sm:h-1.5 bg-black/5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-primary/5 shadow-sm flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full md:w-auto">
          {/* Timeframe filter pills */}
          {[
            { id: "ALL", label: isAr ? "كل الفترات" : "All Time" },
            { id: "THIS_MONTH", label: isAr ? "هذا الشهر" : "This Month" },
            { id: "LAST_MONTH", label: isAr ? "الشهر الماضي" : "Last Month" },
            { id: "THIS_YEAR", label: isAr ? "هذا العام" : "This Year" }
          ].map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeframeFilter(tf.id as any)}
              className={cn(
                "px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer",
                timeframeFilter === tf.id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-cream/40 text-charcoal/60 hover:bg-cream hover:text-primary"
              )}
            >
              {tf.label}
            </button>
          ))}

          <span className="h-4 w-px bg-primary/10 mx-0.5 hidden sm:block" />

          {/* Custom Category Dropdown Filter */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCategoryFilterOpen(!isCategoryFilterOpen)}
              className={cn(
                "h-8 sm:h-9 px-3 sm:px-3.5 bg-cream/40 border border-primary/10 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold text-primary hover:border-primary/30 flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer shadow-sm",
                categoryFilter !== "ALL" && "bg-primary text-white border-primary"
              )}
            >
              <Filter className="w-3.5 h-3.5 opacity-70 shrink-0" />
              <span className="truncate max-w-[120px] sm:max-w-none">
                {categoryFilter === "ALL"
                  ? (isAr ? "جميع الأقسام" : "All Categories")
                  : categoryLabels[categoryFilter as ExpenseCategoryType]?.[isAr ? "ar" : "en"] || categoryFilter}
              </span>
              <ChevronDown className={cn("w-3.5 h-3.5 opacity-60 transition-transform duration-200 shrink-0", isCategoryFilterOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isCategoryFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsCategoryFilterOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute start-0 top-full mt-1.5 w-60 max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl border border-primary/10 shadow-2xl p-1.5 z-50 space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar text-start"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryFilter("ALL");
                        setIsCategoryFilterOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        categoryFilter === "ALL" ? "bg-primary text-white shadow-sm" : "text-primary/80 hover:bg-cream"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 opacity-60" />
                        <span>{isAr ? "جميع الأقسام" : "All Categories"}</span>
                      </span>
                      {categoryFilter === "ALL" && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>

                    {(Object.keys(categoryLabels) as ExpenseCategoryType[]).map((catKey) => {
                      const info = categoryLabels[catKey];
                      const Icon = info.icon;
                      const isSelected = categoryFilter === catKey;

                      return (
                        <button
                          key={catKey}
                          type="button"
                          onClick={() => {
                            setCategoryFilter(catKey);
                            setIsCategoryFilterOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                            isSelected ? "bg-primary text-white shadow-sm" : "text-primary/80 hover:bg-cream"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <Icon className={cn("w-3.5 h-3.5", isSelected ? "text-white" : info.color)} />
                            <span>{info[isAr ? "ar" : "en"]}</span>
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-charcoal/40 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? "بحث بالوصف، المصدر، الملاحظات..." : "Search title, paid by, notes..."}
            className="w-full h-10 ps-9 pe-4 bg-cream/30 border border-primary/10 rounded-xl text-xs font-medium focus:ring-2 focus:ring-accent/30 focus:outline-none"
          />
        </div>
      </div>

      {/* Expenses Table */}
      {filteredExpenses.length === 0 ? (
        <div className="p-16 bg-white rounded-[2.5rem] border border-primary/5 text-center shadow-sm">
          <FileText className="w-12 h-12 text-primary/30 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-primary mb-1">
            {isAr ? "لا توجد مصاريف مسجلة في هذا التصنيف" : "No expenses found for this criteria"}
          </h3>
          <p className="text-xs text-charcoal/40 mb-4">
            {isAr ? "اضغط على زر (تسجيل مصروف جديد) لإضافة فاتورة أو بند إنفاق." : "Click (Log New Expense) to add a purchase or operating bill."}
          </p>
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 bg-primary hover:bg-brand text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer"
          >
            {isAr ? "تسجيل مصروف جديد" : "Log New Expense"}
          </button>
        </div>
      ) : (
        <>
          {/* Mobile View: Adaptive Expense Cards (<lg) */}
          <div className="block lg:hidden space-y-3.5">
            {filteredExpenses.map((exp) => {
              const catInfo = categoryLabels[exp.category as ExpenseCategoryType] || categoryLabels.OTHER;
              const Icon = catInfo.icon;

              return (
                <div 
                  key={exp.id} 
                  className="bg-white rounded-2xl p-4 border border-primary/5 shadow-md shadow-primary/5 space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[9px] font-bold border mb-1.5",
                        catInfo.bg,
                        catInfo.color
                      )}>
                        <Icon className="w-3 h-3" />
                        <span>{catInfo[isAr ? "ar" : "en"]}</span>
                      </span>
                      <h4 className="font-bold text-primary text-sm line-clamp-1">{exp.title}</h4>
                      {exp.notes && (
                        <p className="text-[11px] text-charcoal/50 line-clamp-2 mt-0.5">{exp.notes}</p>
                      )}
                    </div>

                    <div className="text-end shrink-0">
                      <p className="font-black text-primary text-base">
                        EGP {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-charcoal/40 font-medium mt-0.5">
                        {new Date(exp.date).toLocaleDateString(isAr ? "ar-EG" : "en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  {/* Details strip: Paid by & Receipt */}
                  <div className="bg-cream/40 p-2.5 rounded-xl border border-primary/5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-accent opacity-70" />
                      <div>
                        <span className="font-bold text-primary block leading-none">{exp.paidBy || "-"}</span>
                        <span className="text-[9px] uppercase tracking-wider text-charcoal/40 font-semibold">{exp.paymentMethod || "CARD"}</span>
                      </div>
                    </div>

                    {exp.receiptUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(exp.receiptUrl)}
                        className="flex items-center gap-1.5 px-2 py-1 bg-white border border-primary/10 rounded-lg text-[10px] font-bold text-primary hover:bg-cream transition-all shadow-sm"
                      >
                        <FileText className="w-3 h-3 text-accent" />
                        <span>{isAr ? "الإيصال" : "Receipt"}</span>
                      </button>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="pt-2 border-t border-primary/5 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(exp)}
                      className="px-3 py-1.5 bg-primary/5 hover:bg-primary/10 text-primary font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{isAr ? "تعديل" : "Edit"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingId(exp.id)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isAr ? "حذف" : "Delete"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop View: Full Table (>=lg) */}
          <div className="hidden lg:block bg-white rounded-[2rem] border border-primary/5 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-cream/40 border-b border-primary/5 text-[10px] font-black uppercase tracking-wider text-charcoal/60">
                <tr>
                  <th className="p-4 text-start">{isAr ? "بند المصروف" : "Expense & Details"}</th>
                  <th className="p-4 text-start">{isAr ? "القسم" : "Category"}</th>
                  <th className="p-4 text-start">{isAr ? "التاريخ" : "Date"}</th>
                  <th className="p-4 text-start">{isAr ? "القيمة" : "Amount"}</th>
                  <th className="p-4 text-start">{isAr ? "دُفع بواسطة" : "Paid By"}</th>
                  <th className="p-4 text-center">{isAr ? "الإيصال" : "Receipt"}</th>
                  <th className="p-4 text-end">{isAr ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/5">
                {filteredExpenses.map((exp) => {
                  const catInfo = categoryLabels[exp.category as ExpenseCategoryType] || categoryLabels.OTHER;
                  const Icon = catInfo.icon;

                  return (
                    <tr key={exp.id} className="hover:bg-cream/20 transition-colors">
                      {/* Title & Notes */}
                      <td className="p-4">
                        <div className="min-w-0 max-w-xs">
                          <p className="font-bold text-primary text-sm line-clamp-1">{exp.title}</p>
                          {exp.notes && (
                            <p className="text-[11px] text-charcoal/50 line-clamp-1 mt-0.5">{exp.notes}</p>
                          )}
                        </div>
                      </td>

                      {/* Category Badge */}
                      <td className="p-4 whitespace-nowrap">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border",
                          catInfo.bg,
                          catInfo.color
                        )}>
                          <Icon className="w-3 h-3" />
                          <span>{catInfo[isAr ? "ar" : "en"]}</span>
                        </span>
                      </td>

                      {/* Date */}
                      <td className="p-4 whitespace-nowrap text-charcoal/60 font-medium">
                        {new Date(exp.date).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })}
                      </td>

                      {/* Amount */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="font-black text-primary text-sm">
                          EGP {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* Paid By & Method */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="text-[11px]">
                          <span className="font-bold text-primary block">{exp.paidBy || "-"}</span>
                          <span className="text-charcoal/40 text-[9px] uppercase tracking-wider">
                            {exp.paymentMethod || "CARD"}
                          </span>
                        </div>
                      </td>

                      {/* Receipt Preview */}
                      <td className="p-4 text-center whitespace-nowrap">
                        {exp.receiptUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(exp.receiptUrl)}
                            className="w-9 h-9 rounded-lg overflow-hidden border border-primary/10 hover:opacity-80 transition-opacity inline-block cursor-pointer shadow-sm"
                          >
                            <img src={exp.receiptUrl} alt="Receipt" className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-charcoal/30 font-medium">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-end whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(exp)}
                            className="p-2 text-primary/60 hover:text-primary hover:bg-cream rounded-lg transition-colors cursor-pointer"
                            title={isAr ? "تعديل" : "Edit"}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingId(exp.id)}
                            className="p-2 text-rose-600/70 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={isAr ? "حذف" : "Delete"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer Count */}
          <div className="p-4 bg-cream/30 border-t border-primary/5 flex items-center justify-between text-xs text-charcoal/50">
            <span>
              {isAr ? "عرض" : "Showing"} <strong>{filteredExpenses.length}</strong> {isAr ? "من إجمالي" : "of"} <strong>{expenses.length}</strong> {isAr ? "مصروف" : "expenses"}
            </span>
            <span className="font-bold text-primary">
              {isAr ? "مجموع الصفحة:" : "Filtered Total:"} EGP {filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString()}
            </span>
          </div>
        </div>
        </>
      )}

      {/* Add / Edit Expense Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md overflow-y-auto p-2 sm:p-4 md:p-6 flex justify-center items-center min-h-screen"
            onClick={() => !isSubmitting && setIsAddModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-xl bg-white rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 md:p-8 shadow-2xl border border-primary/5 my-auto space-y-4 sm:space-y-6 shrink-0 max-h-[92dvh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-accent">
                    {isAr ? "إدارة التكاليف التشغيلية" : "Platform Financial Operations"}
                  </span>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-heading font-black text-primary mt-0.5 leading-snug">
                    {editingExpense
                      ? (isAr ? "تعديل بيانات المصروف" : "Edit Expense Entry")
                      : (isAr ? "تسجيل مصروف أو مشترى جديد" : "Log New Platform Expense")}
                  </h3>
                </div>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-cream hover:bg-primary/5 flex items-center justify-center text-charcoal/60 hover:text-primary transition-all cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveExpense} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-primary/70 mb-1">
                    {isAr ? "اسم أو وصف المصروف *" : "Expense Description *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder={isAr ? "مثال: كراتين وتغليف 500 قطعة، إعلانات فيسبوك، شحن..." : "e.g. 500 packaging boxes, Meta ads campaign, Vercel server..."}
                    className="w-full h-11 px-4 bg-cream/30 border border-primary/10 rounded-xl text-xs md:text-sm font-medium text-primary focus:ring-2 focus:ring-accent/30 focus:outline-none"
                  />
                </div>

                {/* Category & Amount Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Custom Category Dropdown */}
                  <div className="relative">
                    <label className="block text-[11px] font-black uppercase tracking-wider text-primary/70 mb-1">
                      {isAr ? "القسم / نوع النفقة *" : "Expense Category *"}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsFormCategoryOpen(!isFormCategoryOpen);
                        setIsFormPaymentOpen(false);
                      }}
                      className="w-full h-11 px-3.5 bg-cream/30 border border-primary/10 rounded-xl text-xs md:text-sm font-bold text-primary flex items-center justify-between hover:border-accent transition-all shadow-sm cursor-pointer"
                    >
                      <span className="flex items-center gap-2 truncate">
                        {(() => {
                          const info = categoryLabels[formCategory] || categoryLabels.OTHER;
                          const Icon = info.icon;
                          return (
                            <>
                              <Icon className={cn("w-4 h-4 shrink-0", info.color)} />
                              <span className="truncate">{info[isAr ? "ar" : "en"]}</span>
                            </>
                          );
                        })()}
                      </span>
                      <ChevronDown className={cn("w-4 h-4 text-primary/40 transition-transform duration-200 shrink-0", isFormCategoryOpen && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {isFormCategoryOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsFormCategoryOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-primary/10 shadow-2xl p-1.5 z-50 max-h-56 overflow-y-auto space-y-0.5"
                          >
                            {(Object.keys(categoryLabels) as ExpenseCategoryType[]).map((catKey) => {
                              const info = categoryLabels[catKey];
                              const Icon = info.icon;
                              const isSelected = formCategory === catKey;

                              return (
                                <button
                                  key={catKey}
                                  type="button"
                                  onClick={() => {
                                    setFormCategory(catKey);
                                    setIsFormCategoryOpen(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-start",
                                    isSelected ? "bg-primary text-white shadow-sm" : "text-primary/80 hover:bg-cream"
                                  )}
                                >
                                  <span className="flex items-center gap-2.5">
                                    <Icon className={cn("w-4 h-4", isSelected ? "text-white" : info.color)} />
                                    <span>{info[isAr ? "ar" : "en"]}</span>
                                  </span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                </button>
                              );
                            })}
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-primary/70 mb-1">
                      {isAr ? "المبلغ (جنيه مصري) *" : "Amount (EGP) *"}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-11 px-4 bg-cream/30 border border-primary/10 rounded-xl text-xs md:text-sm font-bold text-primary focus:ring-2 focus:ring-accent/30 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Date & Paid By Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-primary/70 mb-1">
                      {isAr ? "تاريخ الدفع *" : "Payment Date *"}
                    </label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full h-11 px-4 bg-cream/30 border border-primary/10 rounded-xl text-xs font-medium text-primary focus:ring-2 focus:ring-accent/30 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-primary/70 mb-1">
                      {isAr ? "دُفع بواسطة / المصدر" : "Paid By / Source"}
                    </label>
                    <input
                      type="text"
                      value={formPaidBy}
                      onChange={(e) => setFormPaidBy(e.target.value)}
                      placeholder={isAr ? "مثال: محمد، كارت الشركة، فودافون كاش..." : "e.g. Mohamed, Company Card, Vodafone Cash..."}
                      className="w-full h-11 px-4 bg-cream/30 border border-primary/10 rounded-xl text-xs font-medium text-primary focus:ring-2 focus:ring-accent/30 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Custom Payment Method Dropdown */}
                <div className="relative">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-primary/70 mb-1">
                    {isAr ? "وسيلة الدفع" : "Payment Method"}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormPaymentOpen(!isFormPaymentOpen);
                      setIsFormCategoryOpen(false);
                    }}
                    className="w-full h-11 px-3.5 bg-cream/30 border border-primary/10 rounded-xl text-xs md:text-sm font-bold text-primary flex items-center justify-between hover:border-accent transition-all shadow-sm cursor-pointer"
                  >
                    <span className="flex items-center gap-2 truncate">
                      {(() => {
                        const info = paymentMethodLabels[formPaymentMethod] || paymentMethodLabels.OTHER;
                        const Icon = info.icon;
                        return (
                          <>
                            <Icon className="w-4 h-4 text-accent shrink-0" />
                            <span className="truncate">{info[isAr ? "ar" : "en"]}</span>
                          </>
                        );
                      })()}
                    </span>
                    <ChevronDown className={cn("w-4 h-4 text-primary/40 transition-transform duration-200 shrink-0", isFormPaymentOpen && "rotate-180")} />
                  </button>

                  <AnimatePresence>
                    {isFormPaymentOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsFormPaymentOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.96 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl border border-primary/10 shadow-2xl p-1.5 z-50 space-y-0.5 overflow-hidden"
                        >
                          {Object.entries(paymentMethodLabels).map(([methodKey, info]) => {
                            const Icon = info.icon;
                            const isSelected = formPaymentMethod === methodKey;

                            return (
                              <button
                                key={methodKey}
                                type="button"
                                onClick={() => {
                                  setFormPaymentMethod(methodKey);
                                  setIsFormPaymentOpen(false);
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-start",
                                  isSelected ? "bg-primary text-white shadow-sm" : "text-primary/80 hover:bg-cream"
                                )}
                              >
                                <span className="flex items-center gap-2.5">
                                  <Icon className={cn("w-4 h-4", isSelected ? "text-white" : "text-accent")} />
                                  <span>{info[isAr ? "ar" : "en"]}</span>
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                              </button>
                            );
                          })}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Receipt Image Upload */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-primary/70 mb-1">
                    {isAr ? "صورة الفاتورة أو الإيصال (اختياري)" : "Receipt / Invoice Photo (Optional)"}
                  </label>
                  
                  {formReceiptImage ? (
                    <div className="flex items-center gap-3 p-3 bg-cream/30 rounded-xl border border-primary/10">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-primary/10 shrink-0">
                        <img src={formReceiptImage} alt="Receipt preview" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs text-primary/70 font-medium truncate flex-1">
                        {isAr ? "تم إرفاق صورة الإيصال" : "Receipt image attached"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFormReceiptImage("")}
                        className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-bold cursor-pointer"
                      >
                        {isAr ? "إزالة" : "Remove"}
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-4 bg-cream/20 border-2 border-dashed border-primary/10 rounded-xl hover:border-accent/40 transition-colors cursor-pointer">
                      <UploadCloud className="w-6 h-6 text-primary/40 mb-1" />
                      <span className="text-xs font-bold text-primary">
                        {isAr ? "اضغط لرفع صورة الفاتورة" : "Click to upload receipt photo"}
                      </span>
                      <span className="text-[10px] text-charcoal/40 mt-0.5">PNG, JPG, WEBP (Max 5MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-primary/70 mb-1">
                    {isAr ? "ملاحظات إضافية" : "Additional Notes"}
                  </label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder={isAr ? "أي تفاصيل تخص المورد، رقم الفاتورة، الغرض..." : "Vendor details, invoice number, or operational purpose..."}
                    className="w-full p-3 bg-cream/30 border border-primary/10 rounded-xl text-xs md:text-sm font-medium text-primary focus:ring-2 focus:ring-accent/30 focus:outline-none"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-primary/5">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-5 py-2.5 bg-cream hover:bg-primary/5 text-primary font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    {isAr ? "إلغاء" : "Cancel"}
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-primary hover:bg-brand text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmitting ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ المصروف" : "Save Expense")}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => !isSubmitting && setDeletingId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-primary/5 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-primary">
                  {isAr ? "تأكيد حذف المصروف" : "Delete Expense Record"}
                </h4>
                <p className="text-xs text-charcoal/50 mt-1">
                  {isAr ? "هل أنت متأكد من حذف هذا المصروف؟ لن تتمكن من استرجاعه لاحقاً." : "Are you sure you want to permanently delete this expense?"}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-2.5 bg-cream hover:bg-primary/5 text-primary font-bold rounded-xl text-xs cursor-pointer"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDeleteExpense}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? (isAr ? "جاري الحذف..." : "Deleting...") : (isAr ? "نعم، حذف" : "Yes, Delete")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Lightbox Image Preview */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          >
            <div className="relative max-w-4xl max-h-[85vh]">
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 end-4 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <img src={previewImage} alt="Receipt Full" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
