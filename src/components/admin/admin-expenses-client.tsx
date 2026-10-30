"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  Smartphone,
  Clock,
  ShieldCheck,
  ArrowUpRight,
  ArrowDown,
  Send,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  createPlatformExpenseAction,
  updatePlatformExpenseAction,
  deletePlatformExpenseAction,
  getPlatformExpensesAction,
  markExpenseAsFundedAction
} from "@/lib/actions";
import { toast } from "react-hot-toast";
import { useParams } from "next/navigation";

interface AdminExpensesClientProps {
  initialExpenses: any[];
  initialAnalytics: {
    totalSpent: number;
    totalFunded?: number;
    pendingFunding?: number;
    hazemFunded?: number;
    hazemPending?: number;
    nourFunded?: number;
    nourPending?: number;
    mohamedDirect?: number;
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
  
  // Investor & Partner Filters
  const [fundingStatusFilter, setFundingStatusFilter] = useState<"ALL" | "PENDING_TRANSFER" | "FUNDED">("ALL");
  const [partnerFilter, setPartnerFilter] = useState<"ALL" | "HAZEM" | "NOUR" | "MOHAMED">("ALL");

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
  const [mounted, setMounted] = useState(false);

  // Mohamed's Quick Funding Modal
  const [fundingModalExpense, setFundingModalExpense] = useState<any | null>(null);
  const [fundingMethod, setFundingMethod] = useState<string>("INSTAPAY");
  const [fundingProofImage, setFundingProofImage] = useState<string>("");
  const [fundingNotes, setFundingNotes] = useState<string>("");

  const expensesSectionRef = useRef<HTMLDivElement>(null);

  const scrollToExpenses = () => {
    setTimeout(() => {
      if (expensesSectionRef.current) {
        expensesSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        const el = document.getElementById("expenses-section");
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 60);
  };

  const handleViewPendingTransfers = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFundingStatusFilter("PENDING_TRANSFER");
    setCategoryFilter("ALL");
    setPartnerFilter("ALL");
    setTimeframeFilter("ALL");
    setSearchQuery("");
    scrollToExpenses();
  };

  const handleViewFundedTransfers = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFundingStatusFilter("FUNDED");
    setCategoryFilter("ALL");
    setPartnerFilter("ALL");
    setTimeframeFilter("ALL");
    setSearchQuery("");
    scrollToExpenses();
  };

  const handleViewAllExpenses = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFundingStatusFilter("ALL");
    setCategoryFilter("ALL");
    setPartnerFilter("ALL");
    setTimeframeFilter("ALL");
    setSearchQuery("");
    scrollToExpenses();
  };

  const handleViewPartnerExpenses = (partner: "HAZEM" | "NOUR" | "MOHAMED", e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPartnerFilter(partner);
    setFundingStatusFilter("ALL");
    setCategoryFilter("ALL");
    setTimeframeFilter("ALL");
    setSearchQuery("");
    scrollToExpenses();
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll on mobile when any modal is open
  useEffect(() => {
    if (isAddModalOpen || deletingId || previewImage || fundingModalExpense) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isAddModalOpen, deletingId, previewImage, fundingModalExpense]);

  // Form fields state
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<ExpenseCategoryType>("OTHER");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [formRequestedBy, setFormRequestedBy] = useState<"HAZEM" | "NOUR" | "MOHAMED">("HAZEM");
  const [formFundingStatus, setFormFundingStatus] = useState<"PENDING_TRANSFER" | "FUNDED">("PENDING_TRANSFER");
  const [formPaidBy, setFormPaidBy] = useState("");
  const [formPaymentMethod, setFormPaymentMethod] = useState("WALLET");
  const [formTransferMethod, setFormTransferMethod] = useState("INSTAPAY");
  const [formReceiptImage, setFormReceiptImage] = useState<string>("");
  const [formTransferProofImage, setFormTransferProofImage] = useState<string>("");
  const [formNotes, setFormNotes] = useState("");

  const partnerLabels: Record<string, { en: string; ar: string; color: string; bg: string }> = {
    HAZEM: {
      en: "Hazem",
      ar: "حازم",
      color: "text-indigo-700",
      bg: "bg-indigo-50 border-indigo-200"
    },
    NOUR: {
      en: "Nour",
      ar: "نور",
      color: "text-cyan-700",
      bg: "bg-cyan-50 border-cyan-200"
    },
    MOHAMED: {
      en: "Mohamed",
      ar: "محمد",
      color: "text-emerald-700",
      bg: "bg-emerald-50 border-emerald-200"
    }
  };

  const fundingStatusLabels: Record<string, { en: string; ar: string; color: string; bg: string; dot: string }> = {
    PENDING_TRANSFER: {
      en: "Awaiting Mohamed's Transfer",
      ar: "في انتظار تحويل محمد",
      color: "text-amber-800",
      bg: "bg-amber-50 border-amber-300",
      dot: "bg-amber-500"
    },
    FUNDED: {
      en: "Funded by Mohamed",
      ar: "تم التحويل والتمويل",
      color: "text-emerald-800",
      bg: "bg-emerald-50 border-emerald-300",
      dot: "bg-emerald-500"
    },
    REJECTED: {
      en: "On Hold",
      ar: "معلق / قيد المراجعة",
      color: "text-rose-800",
      bg: "bg-rose-50 border-rose-300",
      dot: "bg-rose-500"
    }
  };

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
    WALLET: { en: "InstaPay / E-Wallet", ar: "إنستاباي / محفظة إلكترونية", icon: Smartphone },
    BANK_TRANSFER: { en: "Bank Transfer", ar: "تحويل بنكي", icon: Landmark },
    CARD: { en: "Bank Card / Credit Card", ar: "بطاقة بنكية / ائتمان", icon: CreditCard },
    CASH: { en: "Cash", ar: "نقدي (كاش)", icon: Banknote },
    OTHER: { en: "Other", ar: "أخرى", icon: Tag }
  };

  // Filter expenses based on search, category, timeframe, funding status, partner
  const filteredExpenses = expenses.filter((exp) => {
    if (categoryFilter !== "ALL" && exp.category !== categoryFilter) return false;
    
    const expStatus = exp.fundingStatus || "PENDING_TRANSFER";
    if (fundingStatusFilter !== "ALL" && expStatus !== fundingStatusFilter) return false;

    const expPartner = exp.requestedBy || "HAZEM";
    if (partnerFilter !== "ALL" && expPartner !== partnerFilter) return false;

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
      const matchFundedBy = exp.fundedBy?.toLowerCase().includes(q);
      const matchRequester = exp.requestedBy?.toLowerCase().includes(q);
      return matchTitle || matchPaidBy || matchNotes || matchCategory || matchFundedBy || matchRequester;
    }

    return true;
  });

  const resetForm = () => {
    setFormTitle("");
    setFormCategory("OTHER");
    setFormAmount("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormRequestedBy("HAZEM");
    setFormFundingStatus("PENDING_TRANSFER");
    setFormPaidBy("");
    setFormPaymentMethod("WALLET");
    setFormTransferMethod("INSTAPAY");
    setFormReceiptImage("");
    setFormTransferProofImage("");
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
    setFormRequestedBy(exp.requestedBy || "HAZEM");
    setFormFundingStatus(exp.fundingStatus || "PENDING_TRANSFER");
    setFormPaidBy(exp.paidBy || "");
    setFormPaymentMethod(exp.paymentMethod || "WALLET");
    setFormTransferMethod(exp.transferMethod || "INSTAPAY");
    setFormReceiptImage(exp.receiptUrl || "");
    setFormTransferProofImage(exp.transferProofUrl || "");
    setFormNotes(exp.notes || "");
    setIsAddModalOpen(true);
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(isAr ? "حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)" : "File is too large (max 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setter(reader.result as string);
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
        const res = await updatePlatformExpenseAction({
          id: editingExpense.id,
          title: formTitle,
          category: formCategory,
          amount: parsedAmount,
          currency: "EGP",
          date: formDate,
          requestedBy: formRequestedBy,
          fundingStatus: formFundingStatus,
          fundedBy: formFundingStatus === "FUNDED" ? "Mohamed" : undefined,
          transferMethod: formTransferMethod,
          transferProofImage: formTransferProofImage,
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
        const res = await createPlatformExpenseAction({
          title: formTitle,
          category: formCategory,
          amount: parsedAmount,
          currency: "EGP",
          date: formDate,
          requestedBy: formRequestedBy,
          fundingStatus: formFundingStatus,
          fundedBy: formFundingStatus === "FUNDED" ? "Mohamed" : undefined,
          transferMethod: formTransferMethod,
          transferProofImage: formTransferProofImage,
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

  const handleMohamedConfirmTransfer = async () => {
    if (!fundingModalExpense) return;
    setIsSubmitting(true);

    try {
      const res = await markExpenseAsFundedAction({
        id: fundingModalExpense.id,
        transferMethod: fundingMethod,
        transferProofImage: fundingProofImage,
        notes: fundingNotes || fundingModalExpense.notes,
        lang: isAr ? "ar" : "en"
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(
          isAr
            ? `تم تأكيد تحويل المبلغ (${fundingModalExpense.amount} ج.م) بنجاح بواسطة محمد.`
            : `Transfer of EGP ${fundingModalExpense.amount} confirmed by Mohamed.`
        );
        setFundingModalExpense(null);
        setFundingProofImage("");
        setFundingNotes("");
        refreshData();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to record transfer confirmation");
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

    const headers = [
      "ID",
      "Title",
      "Category",
      "Amount (EGP)",
      "Requested By",
      "Funding Status",
      "Funded By",
      "Transfer Method",
      "Date",
      "Paid By",
      "Notes"
    ];

    const rows = filteredExpenses.map((exp) => [
      exp.id,
      `"${(exp.title || "").replace(/"/g, '""')}"`,
      categoryLabels[exp.category as ExpenseCategoryType]?.en || exp.category,
      exp.amount,
      exp.requestedBy || "HAZEM",
      exp.fundingStatus || "PENDING_TRANSFER",
      exp.fundedBy || "Mohamed",
      exp.transferMethod || "N/A",
      new Date(exp.date).toISOString().split("T")[0],
      `"${(exp.paidBy || "").replace(/"/g, '""')}"`,
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

  const pendingTransferCount = expenses.filter((e) => (e.fundingStatus || "PENDING_TRANSFER") === "PENDING_TRANSFER").length;
  const fundedCount = expenses.filter((e) => e.fundingStatus === "FUNDED").length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-black text-primary flex items-center gap-2.5 sm:gap-3 leading-tight">
            <ReceiptText className="w-7 h-7 sm:w-8 sm:h-8 text-accent shrink-0" />
            <span>{isAr ? "مصاريف وتحويلات المنصة" : "Platform Expenses & Transfers"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-charcoal/60 mt-1 max-w-2xl">
            {isAr
              ? "سجل مصاريف وتحويلات الشركاء (محمد، حازم، نور) مع إثباتات التحويل وفواتير النفقات."
              : "Manage expenses and transfer records for Mohamed, Hazem, and Nour."}
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-2 w-full xl:w-auto shrink-0">
          <button
            type="button"
            onClick={exportCSV}
            className="flex-1 sm:flex-initial justify-center px-3.5 sm:px-4 py-2 sm:py-2.5 bg-white hover:bg-cream border border-primary/10 rounded-xl text-xs font-bold text-primary flex items-center gap-1.5 sm:gap-2 transition-all shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-accent shrink-0" />
            <span>{isAr ? "تصدير CSV" : "Export CSV"}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 sm:flex-initial justify-center px-3.5 sm:px-4 py-2 sm:py-2.5 bg-white hover:bg-cream border border-primary/10 rounded-xl text-xs font-bold text-primary flex items-center gap-1.5 sm:gap-2 transition-all shadow-sm cursor-pointer no-print whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary/60 shrink-0" />
            <span>{isAr ? "طباعة التقرير" : "Print Report"}</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="w-full sm:w-auto justify-center px-4 sm:px-5 py-2.5 bg-primary hover:bg-brand text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>{isAr ? "تسجيل مصروف / طلب تمويل" : "Log Expense / Request"}</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Overview Cards (Swipeable Carousel on mobile, 2 cols on tablet/laptop, 4 cols on wide screens) */}
      <div className="space-y-1.5">
        <div className="flex sm:grid sm:grid-cols-2 2xl:grid-cols-4 gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible">
          {/* Card 1: Total Funded by Mohamed */}
          <div 
            onClick={handleViewFundedTransfers}
            className="w-[84vw] max-w-[340px] shrink-0 snap-center sm:w-auto p-4 sm:p-5 bg-white rounded-2xl sm:rounded-3xl border border-emerald-200/80 shadow-sm space-y-2.5 relative overflow-hidden flex flex-col justify-between cursor-pointer group hover:shadow-md hover:border-emerald-300 transition-all active:scale-[0.99]"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 leading-tight">
                    {isAr ? "إجمالي ما حوله محمد" : "Transferred by Mohamed"}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 shrink-0 whitespace-nowrap">
                  {isAr ? "مكتمل" : "Confirmed"}
                </span>
              </div>
              <p className="text-xl sm:text-2xl 2xl:text-3xl font-black text-emerald-700 font-heading tracking-tight break-words">
                EGP {(analytics.totalFunded || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-[11px] text-charcoal/60 font-medium flex items-center justify-between pt-2 border-t border-emerald-100">
              <span>{isAr ? "عمليات مكتملة التحويل:" : "Completed transfers:"}</span>
              <button
                type="button"
                onClick={handleViewFundedTransfers}
                className="text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <span>{fundedCount}</span>
                <span className="text-[9px] text-emerald-700 font-semibold">{isAr ? "عرض" : "View"}</span>
                <ArrowDown className="w-2.5 h-2.5 text-emerald-700 group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 2: Pending Transfers from Mohamed */}
          <div 
            onClick={handleViewPendingTransfers}
            className={cn(
              "w-[84vw] max-w-[340px] shrink-0 snap-center sm:w-auto p-4 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-sm space-y-2.5 relative overflow-hidden transition-all flex flex-col justify-between cursor-pointer group hover:shadow-md active:scale-[0.99]",
              (analytics.pendingFunding || 0) > 0
                ? "bg-amber-50/70 border-amber-300 hover:border-amber-400"
                : "bg-white border-primary/5 hover:border-primary/20"
            )}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 leading-tight">
                    {isAr ? "بانتظار تحويل محمد" : "Awaiting Mohamed's Transfer"}
                  </span>
                </div>
                {(analytics.pendingFunding || 0) > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-200 text-amber-900 animate-pulse shrink-0 whitespace-nowrap">
                    {pendingTransferCount} {isAr ? "مطلوبة" : "Pending"}
                  </span>
                )}
              </div>
              <p className="text-xl sm:text-2xl 2xl:text-3xl font-black text-amber-800 font-heading tracking-tight break-words">
                EGP {(analytics.pendingFunding || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-[11px] text-charcoal/60 font-medium flex items-center justify-between pt-2 border-t border-amber-200/60">
              <span>{isAr ? "مطلوب تحويلها للشركاء" : "Awaiting bank/wallet transfer"}</span>
              <button
                type="button"
                onClick={handleViewPendingTransfers}
                className="text-[10px] font-black text-amber-900 bg-amber-200/90 hover:bg-amber-300 px-2.5 py-1 rounded-lg transition-all cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-1 shadow-xs active:scale-95"
              >
                <span>{isAr ? "عرض القائمة" : "View List"}</span>
                <ArrowDown className="w-3 h-3 text-amber-900 group-hover:translate-y-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 3: Partner Expenses */}
          <div className="w-[84vw] max-w-[340px] shrink-0 snap-center sm:w-auto p-4 sm:p-5 bg-white rounded-2xl sm:rounded-3xl border border-primary/5 shadow-sm space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <User className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-charcoal/70 leading-tight">
                    {isAr ? "مصاريف الشركاء" : "Partner Expenses"}
                  </span>
                </div>
                <span className="text-[10px] text-charcoal/40 font-bold shrink-0">
                  {isAr ? "حازم / نور / محمد" : "Hazem • Nour"}
                </span>
              </div>

              <div className="space-y-1.5">
                {/* Hazem */}
                <div 
                  onClick={(e) => handleViewPartnerExpenses("HAZEM", e)}
                  className="flex flex-wrap items-center justify-between gap-1 text-xs py-1 px-1.5 -mx-1.5 rounded-lg hover:bg-indigo-50/60 cursor-pointer transition-colors group"
                  title={isAr ? "عرض مصاريف حازم" : "Filter by Hazem"}
                >
                  <span className="font-bold text-indigo-900 flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block shrink-0" />
                    <span>{isAr ? "حازم:" : "Hazem:"}</span>
                  </span>
                  <div className="flex items-center gap-1 font-black text-primary text-xs">
                    <span>EGP {((analytics.hazemFunded || 0) + (analytics.hazemPending || 0)).toLocaleString()}</span>
                    {(analytics.hazemPending || 0) > 0 && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold whitespace-nowrap">
                        +{(analytics.hazemPending || 0).toLocaleString()} {isAr ? "معلق" : "pend."}
                      </span>
                    )}
                    <ArrowDown className="w-2.5 h-2.5 text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Nour */}
                <div 
                  onClick={(e) => handleViewPartnerExpenses("NOUR", e)}
                  className="flex flex-wrap items-center justify-between gap-1 text-xs py-1 px-1.5 -mx-1.5 rounded-lg hover:bg-cyan-50/60 cursor-pointer transition-colors group"
                  title={isAr ? "عرض مصاريف نور" : "Filter by Nour"}
                >
                  <span className="font-bold text-cyan-900 flex items-center gap-1.5 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-cyan-600 inline-block shrink-0" />
                    <span>{isAr ? "نور:" : "Nour:"}</span>
                  </span>
                  <div className="flex items-center gap-1 font-black text-primary text-xs">
                    <span>EGP {((analytics.nourFunded || 0) + (analytics.nourPending || 0)).toLocaleString()}</span>
                    {(analytics.nourPending || 0) > 0 && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold whitespace-nowrap">
                        +{(analytics.nourPending || 0).toLocaleString()} {isAr ? "معلق" : "pend."}
                      </span>
                    )}
                    <ArrowDown className="w-2.5 h-2.5 text-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-charcoal/50 font-medium pt-2 border-t border-primary/5 flex items-center justify-between">
              <span>{isAr ? "المصاريف التشغيلية والتجهيز" : "Operations & Supplies split"}</span>
            </div>
          </div>

          {/* Card 4: Total Platform Purchases & Burn */}
          <div 
            onClick={handleViewAllExpenses}
            className="w-[84vw] max-w-[340px] shrink-0 snap-center sm:w-auto p-4 sm:p-5 bg-white rounded-2xl sm:rounded-3xl border border-primary/5 shadow-sm space-y-2 flex flex-col justify-between cursor-pointer group hover:shadow-md hover:border-primary/20 transition-all active:scale-[0.99]"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <TrendingUp className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-charcoal/70 leading-tight">
                    {isAr ? "إجمالي مصاريف المنصة" : "Total Platform Burn"}
                  </span>
                </div>
                <span className="text-[10px] text-charcoal/50 font-bold px-2 py-0.5 rounded-full bg-cream shrink-0 whitespace-nowrap">
                  {analytics.totalCount} {isAr ? "بند" : "entries"}
                </span>
              </div>
              <p className="text-xl sm:text-2xl 2xl:text-3xl font-black text-primary font-heading tracking-tight break-words">
                EGP {analytics.totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-[11px] text-charcoal/50 font-medium flex items-center justify-between pt-2 border-t border-primary/5">
              <span>{isAr ? "هذا الشهر:" : "This Month:"}</span>
              <span className="font-bold text-primary">EGP {analytics.thisMonthSpent.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Mobile Swipe Hint */}
        <div className="flex sm:hidden items-center justify-between px-1 text-[10px] text-charcoal/40 font-bold">
          <span>{isAr ? "اسحب لمشاهدة باقي الإحصائيات ⟷" : "Swipe cards for all metrics ⟷"}</span>
        </div>
      </div>

      {/* Main Workflow Tabs & Filters Strip */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-primary/5 shadow-sm p-3.5 sm:p-5 space-y-3.5 sm:space-y-4">
        {/* Status Tabs (Mobile Smooth Pill Scroller) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-primary/5 pb-3">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 -mx-1 px-1 flex-nowrap">
            <button
              type="button"
              onClick={() => setFundingStatusFilter("ALL")}
              className={cn(
                "px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0",
                fundingStatusFilter === "ALL"
                  ? "bg-primary text-white shadow-sm"
                  : "bg-cream/50 text-charcoal/70 hover:bg-cream"
              )}
            >
              <span>{isAr ? "جميع المصاريف" : "All Expenses"}</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                fundingStatusFilter === "ALL" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
              )}>
                {expenses.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFundingStatusFilter("PENDING_TRANSFER")}
              className={cn(
                "px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0",
                fundingStatusFilter === "PENDING_TRANSFER"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
              )}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? "بانتظار تحويل محمد" : "Awaiting Transfer"}</span>
              {pendingTransferCount > 0 && (
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                  fundingStatusFilter === "PENDING_TRANSFER" ? "bg-white text-amber-800" : "bg-amber-600 text-white"
                )}>
                  {pendingTransferCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFundingStatusFilter("FUNDED")}
              className={cn(
                "px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0",
                fundingStatusFilter === "FUNDED"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100"
              )}
            >
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? "تم التحويل" : "Funded & Transferred"}</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px]",
                fundingStatusFilter === "FUNDED" ? "bg-white/20 text-white" : "bg-emerald-200 text-emerald-900"
              )}>
                {fundedCount}
              </span>
            </button>
          </div>

          {/* Timeframe Dropdown */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="text-[10px] font-bold text-charcoal/50 uppercase">
              {isAr ? "الفترة:" : "Period:"}
            </span>
            <select
              value={timeframeFilter}
              onChange={(e) => setTimeframeFilter(e.target.value as any)}
              className="h-8 px-2.5 bg-cream/30 border border-primary/10 rounded-lg text-xs font-bold text-primary focus:outline-none cursor-pointer"
            >
              <option value="ALL">{isAr ? "كل الأوقات" : "All Time"}</option>
              <option value="THIS_MONTH">{isAr ? "هذا الشهر" : "This Month"}</option>
              <option value="LAST_MONTH">{isAr ? "الشهر الماضي" : "Last Month"}</option>
              <option value="THIS_YEAR">{isAr ? "هذه السنة" : "This Year"}</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Strip: Partner Filter + Category + Search */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
          {/* Partner Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[10px] font-bold text-charcoal/50 uppercase whitespace-nowrap me-1">
              {isAr ? "صاحب النفقة:" : "Partner:"}
            </span>

            <button
              type="button"
              onClick={() => setPartnerFilter("ALL")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap",
                partnerFilter === "ALL"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-cream/40 text-charcoal/60 hover:bg-cream"
              )}
            >
              {isAr ? "الكل" : "All"}
            </button>

            <button
              type="button"
              onClick={() => setPartnerFilter("HAZEM")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1",
                partnerFilter === "HAZEM"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100"
              )}
            >
              <User className="w-3 h-3 shrink-0" />
              <span>{isAr ? "حازم" : "Hazem"}</span>
            </button>

            <button
              type="button"
              onClick={() => setPartnerFilter("NOUR")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1",
                partnerFilter === "NOUR"
                  ? "bg-cyan-700 text-white shadow-sm"
                  : "bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100"
              )}
            >
              <User className="w-3 h-3 shrink-0" />
              <span>{isAr ? "نور" : "Nour"}</span>
            </button>

            <button
              type="button"
              onClick={() => setPartnerFilter("MOHAMED")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1",
                partnerFilter === "MOHAMED"
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
              )}
            >
              <ShieldCheck className="w-3 h-3 shrink-0" />
              <span>{isAr ? "محمد" : "Mohamed"}</span>
            </button>
          </div>

          {/* Search + Category Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
            {/* Category Dropdown */}
            <div className="relative flex-1 sm:w-56">
              <button
                type="button"
                onClick={() => setIsCategoryFilterOpen(!isCategoryFilterOpen)}
                className="w-full h-9 px-3 bg-cream/40 hover:bg-cream border border-primary/10 rounded-xl text-xs font-bold text-primary flex items-center justify-between transition-all cursor-pointer shadow-xs"
              >
                <span className="truncate">
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
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute start-0 end-0 top-full mt-1.5 bg-white rounded-2xl border border-primary/10 shadow-2xl p-1.5 z-50 space-y-0.5 max-h-72 overflow-y-auto custom-scrollbar text-start"
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

            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-charcoal/40 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? "بحث بالوصف، الاسم، الملاحظات..." : "Search title, notes..."}
                className="w-full h-9 ps-8 pe-3 bg-cream/30 border border-primary/10 rounded-xl text-xs font-medium focus:ring-2 focus:ring-accent/30 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Expenses Table & Cards Section */}
      <div id="expenses-section" ref={expensesSectionRef} className="scroll-mt-6">
      {filteredExpenses.length === 0 ? (
        <div className="p-16 bg-white rounded-[2.5rem] border border-primary/5 text-center shadow-sm">
          <FileText className="w-12 h-12 text-primary/30 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-primary mb-1">
            {isAr ? "لا توجد مصاريف مطابقة لهذا التصنيف" : "No expenses match this criteria"}
          </h3>
          <p className="text-xs text-charcoal/40 mb-4">
            {isAr ? "اضغط على زر (تسجيل مصروف جديد) لإضافة فاتورة أو بند تمويل." : "Click (Log Expense / Request) to record a new purchase or funding request."}
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
          <div className="block lg:hidden space-y-3.5 pb-10">
            {filteredExpenses.map((exp) => {
              const catInfo = categoryLabels[exp.category as ExpenseCategoryType] || categoryLabels.OTHER;
              const Icon = catInfo.icon;
              const statusKey = exp.fundingStatus || "PENDING_TRANSFER";
              const statusInfo = fundingStatusLabels[statusKey] || fundingStatusLabels.PENDING_TRANSFER;
              const partnerKey = exp.requestedBy || "HAZEM";
              const partnerInfo = partnerLabels[partnerKey] || partnerLabels.HAZEM;
              const isPending = statusKey === "PENDING_TRANSFER";

              return (
                <div 
                  key={exp.id} 
                  className={cn(
                    "bg-white rounded-2xl p-4 border shadow-sm space-y-3.5",
                    isPending ? "border-amber-300 bg-amber-50/20" : "border-primary/5"
                  )}
                >
                  {/* Top Line: Category & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold border shrink-0",
                        catInfo.bg,
                        catInfo.color
                      )}>
                        <Icon className="w-3 h-3 shrink-0" />
                        <span>{catInfo[isAr ? "ar" : "en"]}</span>
                      </span>

                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold border shrink-0",
                        statusInfo.bg,
                        statusInfo.color
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusInfo.dot)} />
                        <span>
                          {statusKey === "PENDING_TRANSFER"
                            ? (isAr ? "بانتظار التحويل" : "Awaiting Transfer")
                            : statusKey === "FUNDED"
                            ? (isAr ? "تم التحويل" : "Funded")
                            : statusInfo[isAr ? "ar" : "en"]}
                        </span>
                      </span>
                    </div>

                    <div className="text-end shrink-0">
                      <p className="font-black text-primary text-base leading-tight">
                        EGP {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-charcoal/40 font-medium mt-0.5">
                        {new Date(exp.date).toLocaleDateString(isAr ? "ar-EG" : "en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>

                  {/* Title & Notes */}
                  <div>
                    <h4 className="font-bold text-primary text-sm line-clamp-1">{exp.title}</h4>
                    {exp.notes && (
                      <p className="text-[11px] text-charcoal/50 line-clamp-2 mt-0.5">{exp.notes}</p>
                    )}
                  </div>

                  {/* Partner Strip & Receipts */}
                  <div className="bg-cream/40 p-2.5 rounded-xl border border-primary/5 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-bold border",
                        partnerInfo.bg,
                        partnerInfo.color
                      )}>
                        {partnerInfo[isAr ? "ar" : "en"]}
                      </span>
                      {exp.paidBy && (
                        <span className="text-[10px] text-charcoal/50 truncate max-w-[100px]">
                          {exp.paidBy}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {exp.receiptUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(exp.receiptUrl)}
                          className="flex items-center gap-1 px-2 py-0.5 bg-white border border-primary/10 rounded-lg text-[10px] font-bold text-primary hover:bg-cream transition-all shadow-sm"
                        >
                          <FileText className="w-3 h-3 text-accent" />
                          <span>{isAr ? "الفاتورة" : "Bill"}</span>
                        </button>
                      )}

                      {exp.transferProofUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(exp.transferProofUrl)}
                          className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 transition-all shadow-sm"
                        >
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>{isAr ? "تحويل محمد" : "Transfer"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-primary/5 flex items-center justify-between gap-2">
                    {/* Mohamed Transfer Trigger button */}
                    {isPending ? (
                      <button
                        type="button"
                        onClick={() => {
                          setFundingModalExpense(exp);
                          setFundingMethod(exp.transferMethod || "INSTAPAY");
                          setFundingNotes("");
                          setFundingProofImage("");
                        }}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{isAr ? "تأكيد التحويل (محمد)" : "Mark Funded"}</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <span>{isAr ? "تم التحويل" : "Funded"}</span>
                      </span>
                    )}

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(exp)}
                        className="px-2.5 py-1.5 bg-primary/5 hover:bg-primary/10 text-primary font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>{isAr ? "تعديل" : "Edit"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeletingId(exp.id)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop View: Full Table (>=lg) */}
          <div className="hidden lg:block bg-white rounded-[2rem] border border-primary/5 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-xs min-w-[840px]">
                <thead className="bg-cream/40 border-b border-primary/5 text-[10px] font-black uppercase tracking-wider text-charcoal/60">
                  <tr>
                    <th className="p-4 text-start">{isAr ? "بند المصروف" : "Expense & Purpose"}</th>
                    <th className="p-4 text-start">{isAr ? "القسم" : "Category"}</th>
                    <th className="p-4 text-start">{isAr ? "صاحب المصروف" : "Partner"}</th>
                    <th className="p-4 text-start">{isAr ? "حالة التحويل بواسطة محمد" : "Transfer Status (Mohamed)"}</th>
                    <th className="p-4 text-start">{isAr ? "المبلغ" : "Amount"}</th>
                    <th className="p-4 text-start">{isAr ? "التاريخ" : "Date"}</th>
                    <th className="p-4 text-center">{isAr ? "الإثباتات" : "Receipts"}</th>
                    <th className="p-4 text-end">{isAr ? "إجراءات" : "Actions"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {filteredExpenses.map((exp) => {
                    const catInfo = categoryLabels[exp.category as ExpenseCategoryType] || categoryLabels.OTHER;
                    const Icon = catInfo.icon;
                    const statusKey = exp.fundingStatus || "PENDING_TRANSFER";
                    const statusInfo = fundingStatusLabels[statusKey] || fundingStatusLabels.PENDING_TRANSFER;
                    const partnerKey = exp.requestedBy || "HAZEM";
                    const partnerInfo = partnerLabels[partnerKey] || partnerLabels.HAZEM;
                    const isPending = statusKey === "PENDING_TRANSFER";

                    return (
                      <tr 
                        key={exp.id} 
                        className={cn(
                          "transition-colors",
                          isPending ? "bg-amber-50/15 hover:bg-amber-50/30" : "hover:bg-cream/20"
                        )}
                      >
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

                        {/* Partner Attribution */}
                        <td className="p-4 whitespace-nowrap">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border",
                            partnerInfo.bg,
                            partnerInfo.color
                          )}>
                            <User className="w-3 h-3" />
                            <span>{partnerInfo[isAr ? "ar" : "en"]}</span>
                          </span>
                          {exp.paidBy && (
                            <span className="block text-[10px] text-charcoal/40 font-medium mt-0.5 truncate max-w-[120px]">
                              {exp.paidBy}
                            </span>
                          )}
                        </td>

                        {/* Investor Funding Status */}
                        <td className="p-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border",
                              statusInfo.bg,
                              statusInfo.color
                            )}>
                              <span className={cn("w-2 h-2 rounded-full", statusInfo.dot)} />
                              <span>{statusInfo[isAr ? "ar" : "en"]}</span>
                            </span>

                            {isPending ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setFundingModalExpense(exp);
                                  setFundingMethod(exp.transferMethod || "INSTAPAY");
                                  setFundingNotes("");
                                  setFundingProofImage("");
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                              >
                                <span>{isAr ? "تأكيد التحويل الآن" : "Confirm Transfer"}</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <p className="text-[10px] text-charcoal/50 font-medium">
                                {exp.fundedAt ? (
                                  new Date(exp.fundedAt).toLocaleDateString(isAr ? "ar-EG" : "en-US", {
                                    month: "short",
                                    day: "numeric"
                                  })
                                ) : "Mohamed"}
                                {exp.transferMethod && ` (${exp.transferMethod})`}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="p-4 whitespace-nowrap">
                          <span className="font-black text-primary text-sm">
                            EGP {exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

                        {/* Proofs & Receipts */}
                        <td className="p-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {exp.receiptUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage(exp.receiptUrl)}
                                title={isAr ? "عرض فاتورة المورد" : "View Invoice"}
                                className="w-7 h-7 rounded-lg bg-cream hover:bg-cream/80 border border-primary/10 flex items-center justify-center text-primary transition-all cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-accent" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-charcoal/30">-</span>
                            )}

                            {exp.transferProofUrl && (
                              <button
                                type="button"
                                onClick={() => setPreviewImage(exp.transferProofUrl)}
                                title={isAr ? "عرض إيصال تحويل محمد" : "View Transfer Proof"}
                                className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 transition-all cursor-pointer"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-4 whitespace-nowrap text-end">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFundingModalExpense(exp);
                                  setFundingMethod(exp.transferMethod || "INSTAPAY");
                                  setFundingNotes("");
                                  setFundingProofImage("");
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-sm active:scale-95"
                              >
                                <ShieldCheck className="w-3 h-3" />
                                <span>{isAr ? "تحويل" : "Fund"}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => openEditModal(exp)}
                              className="w-7 h-7 rounded-lg bg-primary/5 hover:bg-primary/10 text-primary flex items-center justify-center transition-colors cursor-pointer"
                              title={isAr ? "تعديل" : "Edit"}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingId(exp.id)}
                              className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                              title={isAr ? "حذف" : "Delete"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      </div>

      {/* Portaled Modals */}
      {mounted && createPortal(
        <>
          {/* Mohamed's Quick "Mark as Transferred" Modal */}
          <AnimatePresence>
            {fundingModalExpense && (
              <div className="fixed inset-0 z-[99999] overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => !isSubmitting && setFundingModalExpense(null)}
                  className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
                />

                <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pointer-events-none">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 350 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl max-w-md w-full max-h-[90dvh] sm:max-h-[85dvh] flex flex-col shadow-2xl border border-primary/5 overflow-hidden relative z-10 pointer-events-auto"
                  >
                    {/* Header */}
                    <div className="p-4 sm:p-5 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-emerald-950 text-sm sm:text-base">
                            {isAr ? "تأكيد التحويل (محمد)" : "Confirm Transfer by Mohamed"}
                          </h3>
                          <p className="text-[11px] text-emerald-800/70 font-medium">
                            {isAr ? "تسجيل تحويل المبلغ للشريك أو المورد" : "Record transfer confirmation"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFundingModalExpense(null)}
                        className="w-7 h-7 rounded-lg hover:bg-emerald-100 text-emerald-800 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                      {/* Summary of expense */}
                      <div className="p-3 bg-cream/40 rounded-2xl border border-primary/5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-charcoal/50 uppercase">
                            {isAr ? "المصروف المطلوب:" : "Expense Title:"}
                          </span>
                          <span className="text-xs font-bold text-primary">
                            {partnerLabels[fundingModalExpense.requestedBy || "HAZEM"]?.[isAr ? "ar" : "en"]}
                          </span>
                        </div>
                        <p className="font-black text-primary text-sm">{fundingModalExpense.title}</p>
                        <div className="flex items-center justify-between pt-1 border-t border-primary/5">
                          <span className="text-xs text-charcoal/60 font-medium">{isAr ? "قيمة التحويل:" : "Amount to send:"}</span>
                          <span className="text-base font-black text-emerald-700">
                            EGP {fundingModalExpense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Payment Channel Selector */}
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-primary/70 mb-1">
                          {isAr ? "طريقة التحويل التي استخدمتها *" : "Transfer Method Used *"}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { key: "INSTAPAY", label: "InstaPay", arLabel: "إنستاباي", icon: Smartphone },
                            { key: "VODAFONE_CASH", label: "Vodafone Cash", arLabel: "فودافون كاش", icon: Smartphone },
                            { key: "BANK_TRANSFER", label: "Bank Transfer", arLabel: "تحويل بنكي", icon: Landmark },
                            { key: "CASH", label: "Cash Handover", arLabel: "نقدي باليد", icon: Banknote },
                          ].map((item) => {
                            const ItemIcon = item.icon;
                            const isSelected = fundingMethod === item.key;
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => setFundingMethod(item.key)}
                                className={cn(
                                  "p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer text-start",
                                  isSelected
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                    : "bg-cream/20 text-primary border-primary/10 hover:bg-cream"
                                )}
                              >
                                <ItemIcon className={cn("w-4 h-4 shrink-0", isSelected ? "text-white" : "text-emerald-700")} />
                                <span className="truncate">{isAr ? item.arLabel : item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Transfer Proof Upload */}
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-primary/70 mb-1">
                          {isAr ? "صورة إيصال التحويل / سكرين شوت إنستاباي (اختياري)" : "Transfer Receipt Screenshot (Optional)"}
                        </label>
                        {fundingProofImage ? (
                          <div className="flex items-center gap-3 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-emerald-200 shrink-0">
                              <img src={fundingProofImage} alt="Transfer Proof" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-xs text-emerald-900 font-bold truncate flex-1">
                              {isAr ? "تم إرفاق إيصال التحويل" : "Transfer screenshot attached"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setFundingProofImage("")}
                              className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-bold cursor-pointer"
                            >
                              {isAr ? "إزالة" : "Remove"}
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center p-3.5 bg-cream/20 border-2 border-dashed border-primary/10 rounded-xl hover:border-emerald-500/50 transition-colors cursor-pointer">
                            <UploadCloud className="w-5 h-5 text-emerald-600 mb-0.5" />
                            <span className="text-xs font-bold text-primary">
                              {isAr ? "اضغط لرفع سكرين شوت التحويل" : "Upload transfer screenshot"}
                            </span>
                            <span className="text-[10px] text-charcoal/40">PNG, JPG (Max 5MB)</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(e, setFundingProofImage)}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-primary/70 mb-1">
                          {isAr ? "ملاحظة التحويل (محمد)" : "Notes / Transaction Reference"}
                        </label>
                        <input
                          type="text"
                          value={fundingNotes}
                          onChange={(e) => setFundingNotes(e.target.value)}
                          placeholder={isAr ? "مثال: تم التحويل لحساب حازم على إنستاباي" : "e.g. Sent via InstaPay to Hazem"}
                          className="w-full h-10 px-3 bg-cream/30 border border-primary/10 rounded-xl text-xs font-medium text-primary focus:ring-2 focus:ring-emerald-500/30 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-3.5 sm:p-4 bg-cream/30 border-t border-primary/5 flex items-center justify-end gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setFundingModalExpense(null)}
                        className="px-4 py-2 bg-white border border-primary/10 rounded-xl text-xs font-bold text-primary hover:bg-cream transition-all cursor-pointer"
                      >
                        {isAr ? "إلغاء" : "Cancel"}
                      </button>

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleMohamedConfirmTransfer}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>{isSubmitting ? (isAr ? "جاري التأكيد..." : "Confirming...") : (isAr ? "تأكيد التحويل الآن" : "Confirm Transfer")}</span>
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* Add / Edit Expense Modal */}
          <AnimatePresence>
            {isAddModalOpen && (
              <div className="fixed inset-0 z-[99999] overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => !isSubmitting && setIsAddModalOpen(false)}
                  className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
                />

                <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 pointer-events-none">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 350 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl max-w-lg w-full max-h-[92dvh] flex flex-col shadow-2xl border border-primary/5 relative z-10 pointer-events-auto overflow-hidden"
                  >
                    {/* Modal Header */}
                    <div className="p-4 sm:p-5 border-b border-primary/5 flex items-center justify-between shrink-0 bg-cream/30">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/5 text-primary flex items-center justify-center shrink-0">
                          <Plus className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <h3 className="font-bold text-primary text-sm sm:text-base">
                            {editingExpense
                              ? (isAr ? "تعديل بيانات المصروف" : "Edit Expense Record")
                              : (isAr ? "تسجيل مصروف / طلب تمويل جديد" : "Log New Expense / Funding Request")}
                          </h3>
                          <p className="text-[11px] text-charcoal/50">
                            {isAr ? "حدد صاحب المصروف وحالة تحويل محمد" : "Assign partner and transfer status"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddModalOpen(false)}
                        className="w-8 h-8 rounded-xl hover:bg-cream text-charcoal/40 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Scrollable Form Body */}
                    <form onSubmit={handleSaveExpense} className="flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-between">
                      <div className="p-4 sm:p-6 space-y-4 text-start">
                        {/* Partner Requester Selector */}
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-wider text-primary/70 mb-1.5">
                            {isAr ? "صاحب المصروف / من قام بالصرف؟ *" : "Paid / Incurred By *"}
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { key: "HAZEM", label: "Hazem", arLabel: "حازم" },
                              { key: "NOUR", label: "Nour", arLabel: "نور" },
                              { key: "MOHAMED", label: "Mohamed", arLabel: "محمد" },
                            ].map((p) => {
                              const isSelected = formRequestedBy === p.key;
                              return (
                                <button
                                  key={p.key}
                                  type="button"
                                  onClick={() => setFormRequestedBy(p.key as any)}
                                  className={cn(
                                    "p-2.5 rounded-xl border text-center transition-all cursor-pointer",
                                    isSelected
                                      ? "bg-primary text-white border-primary shadow-sm"
                                      : "bg-cream/20 text-primary border-primary/10 hover:bg-cream"
                                  )}
                                >
                                  <span className="block font-bold text-xs">{isAr ? p.arLabel : p.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Funding Status Toggle */}
                        <div className="p-3 bg-cream/40 rounded-2xl border border-primary/5 space-y-2">
                          <label className="block text-[11px] font-black uppercase tracking-wider text-primary/70">
                            {isAr ? "موقف التحويل بواسطة محمد *" : "Mohamed's Transfer Status *"}
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setFormFundingStatus("PENDING_TRANSFER")}
                              className={cn(
                                "p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                                formFundingStatus === "PENDING_TRANSFER"
                                  ? "bg-amber-600 text-white shadow-sm"
                                  : "bg-white text-amber-900 border border-amber-200 hover:bg-amber-50"
                              )}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>{isAr ? "في انتظار تحويل محمد" : "Awaiting Transfer"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setFormFundingStatus("FUNDED")}
                              className={cn(
                                "p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                                formFundingStatus === "FUNDED"
                                  ? "bg-emerald-600 text-white shadow-sm"
                                  : "bg-white text-emerald-900 border border-emerald-200 hover:bg-emerald-50"
                              )}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{isAr ? "تم التحويل والتمويل" : "Already Funded"}</span>
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-wider text-primary/70 mb-1">
                            {isAr ? "اسم أو وصف المصروف *" : "Expense Title / Purpose *"}
                          </label>
                          <input
                            type="text"
                            required
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            placeholder={isAr ? "مثال: طباعة 1000 علبة شحن، إعلانات ميتا أسبوع 1..." : "e.g. 1000 Custom Shipping Boxes, Meta Ads Week 1..."}
                            className="w-full h-11 px-4 bg-cream/30 border border-primary/10 rounded-xl text-xs md:text-sm font-medium text-primary focus:ring-2 focus:ring-accent/30 focus:outline-none"
                          />
                        </div>

                        {/* Category & Amount Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Custom Category Dropdown */}
                          <div className="relative">
                            <label className="block text-[11px] font-black uppercase tracking-wider text-primary/70 mb-1">
                              {isAr ? "القسم / بند الإنفاق *" : "Category *"}
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

                          {/* Amount */}
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
                              {isAr ? "تاريخ المصروف *" : "Date *"}
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
                              {isAr ? "المستلم / المورد" : "Recipient / Vendor / Method"}
                            </label>
                            <input
                              type="text"
                              value={formPaidBy}
                              onChange={(e) => setFormPaidBy(e.target.value)}
                              placeholder={isAr ? "مثال: شركة الشحن، مطبعة النور، فيسبوك..." : "e.g. Bosta, Printing Press, Facebook..."}
                              className="w-full h-11 px-4 bg-cream/30 border border-primary/10 rounded-xl text-xs font-medium text-primary focus:ring-2 focus:ring-accent/30 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Receipt Image Upload */}
                        <div>
                          <label className="block text-[11px] font-black uppercase tracking-wider text-primary/70 mb-1">
                            {isAr ? "صورة الفاتورة أو الإيصال (اختياري)" : "Invoice / Bill Photo (Optional)"}
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
                                {isAr ? "اضغط لرفع صورة الفاتورة" : "Click to upload invoice"}
                              </span>
                              <span className="text-[10px] text-charcoal/40 mt-0.5">PNG, JPG, WEBP (Max 5MB)</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, setFormReceiptImage)}
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
                            placeholder={isAr ? "أي تفاصيل تخص رقم الحساب، بنك المستلم، تفاصيل الشحنة..." : "Vendor account info, transfer destination, or operational purpose..."}
                            className="w-full p-3 bg-cream/30 border border-primary/10 rounded-xl text-xs md:text-sm font-medium text-primary focus:ring-2 focus:ring-accent/30 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Sticky Submit Buttons Action Bar */}
                      <div className="p-3 sm:p-5 border-t border-primary/5 bg-cream/30 shrink-0 flex items-center justify-end gap-2.5 sm:gap-3">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => setIsAddModalOpen(false)}
                          className="px-4 sm:px-5 py-2.5 bg-white border border-primary/10 hover:bg-cream text-primary font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95"
                        >
                          {isAr ? "إلغاء" : "Cancel"}
                        </button>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-5 sm:px-6 py-2.5 bg-primary hover:bg-brand text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isSubmitting ? (isAr ? "جاري الحفظ..." : "Saving...") : (isAr ? "حفظ المصروف" : "Save Expense")}</span>
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* Delete Confirmation Modal */}
          <AnimatePresence>
            {deletingId && (
              <div className="fixed inset-0 z-[99999] overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => !isSubmitting && setDeletingId(null)}
                  className="fixed inset-0 bg-black/75 backdrop-blur-md cursor-pointer"
                />
                <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 350 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-primary/5 text-center relative z-10 pointer-events-auto"
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
                        className="flex-1 py-2.5 bg-cream hover:bg-primary/5 text-primary font-bold rounded-xl text-xs cursor-pointer active:scale-95 transition-all"
                      >
                        {isAr ? "إلغاء" : "Cancel"}
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleDeleteExpense}
                        className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md disabled:opacity-50 active:scale-95 transition-all"
                      >
                        {isSubmitting ? (isAr ? "جاري الحذف..." : "Deleting...") : (isAr ? "نعم، حذف" : "Yes, Delete")}
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}
          </AnimatePresence>

          {/* Receipt Lightbox Image Preview */}
          <AnimatePresence>
            {previewImage && (
              <div className="fixed inset-0 z-[99999] overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setPreviewImage(null)}
                  className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
                />
                <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
                  <div className="relative max-w-4xl max-h-[85dvh] flex flex-col items-center justify-center pointer-events-auto">
                    <button
                      onClick={() => setPreviewImage(null)}
                      className="absolute top-2 end-2 sm:top-4 sm:end-4 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all cursor-pointer z-10"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <img src={previewImage} alt="Receipt Full" className="max-w-full max-h-[80dvh] object-contain rounded-2xl shadow-2xl" />
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  );
}
