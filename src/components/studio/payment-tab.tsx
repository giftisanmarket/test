"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Coins, 
  Banknote, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  ArrowDownLeft, 
  ArrowUpRight, 
  AlertCircle, 
  Send, 
  HelpCircle,
  TrendingUp,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Printer,
  X,
  Download,
  RotateCw,
  Search,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { requestPayoutAction, refreshArtisanBalanceAction } from "@/lib/actions";
import { MIN_PAYOUT_AMOUNT } from "@/lib/constants";
import { toast } from "react-hot-toast";

interface PaymentTabProps {
  artisan: any;
  lang: string;
  dict: any;
}

export function PaymentTab({
  artisan,
  lang,
  dict,
}: PaymentTabProps) {
  const router = useRouter();
  
  // Extract balance details
  const balance = artisan.balances?.[0] || { pending: 0.0, withdrawable: 0.0, withdrawn: 0.0 };
  const transactions = artisan.transactions || [];
  const canWithdraw = balance.withdrawable >= MIN_PAYOUT_AMOUNT;

  // Payout request form states
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"INSTAPAY" | "VODAFONE_CASH" | "BANK_TRANSFER">("INSTAPAY");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [address, setAddress] = useState(artisan.payoutAddress || "");
  const [name, setName] = useState(artisan.payoutName || "");
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Transaction history search, filtering, and pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "SALE" | "PAYOUT" | "REFUND_DEBIT">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CLEARED" | "PENDING" | "COMPLETED" | "FAILED">("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx: any) => {
      if (typeFilter !== "ALL" && tx.type !== typeFilter) return false;
      if (statusFilter !== "ALL" && tx.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const desc = (tx.description || "").toLowerCase();
        const id = (tx.id || "").toLowerCase();
        const orderId = (tx.orderId || "").toLowerCase();
        const amountStr = tx.amount?.toString() || "";
        if (!desc.includes(q) && !id.includes(q) && !orderId.includes(q) && !amountStr.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [transactions, typeFilter, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Reset to first page when filtering or searching changes
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, statusFilter, searchQuery]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await refreshArtisanBalanceAction(artisan.id);
      if (res.success) {
        if (res.clearedCount && res.clearedCount > 0) {
          toast.success(
            isRTL 
              ? `تم تسوية ${res.clearedCount} معاملة وتحويلها إلى رصيدك القابل للسحب بنجاح.` 
              : `Cleared ${res.clearedCount} transaction(s) to your withdrawable balance.`
          );
        } else {
          toast.success(isRTL ? "الرصيد محدّث بأحدث البيانات." : "Balances are up to date.");
        }
        router.refresh();
      } else {
        toast.error(res.error || (isRTL ? "تعذر تحديث الرصيد." : "Failed to refresh balance."));
      }
    } catch {
      toast.error(isRTL ? "حدث خطأ أثناء التحديث." : "An error occurred while refreshing.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Bulletproof Isolated Print handler (forces pure vector receipt page printing/PDF saving via sandboxed iframe)
  const handlePrint = () => {
    const printElement = document.getElementById("print-receipt-container");
    if (!printElement) return;

    // Create a temporary hidden iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    // Inject all active application stylesheets and styling rules to keep the gorgeous aesthetics
    const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map(el => el.outerHTML)
      .join("\n");

    const isRtlLayout = lang === "ar";

    doc.write(`
      <html>
        <head>
          <title>Giftisan Transaction Receipt</title>
          ${styles}
          <style>
            body {
              background: white !important;
              color: black !important;
              padding: 40px !important;
              font-family: system-ui, -apple-system, sans-serif;
            }
            #print-receipt-container {
              box-shadow: none !important;
              border: 1px solid rgba(0,0,0,0.1) !important;
              width: 100% !important;
              max-width: 500px !important;
              margin: 0 auto !important;
              padding: 30px !important;
              background: white !important;
              color: black !important;
              border-radius: 16px !important;
            }
            /* Hide print headers/footers when saving as PDF */
            @page {
              size: auto;
              margin: 0mm;
            }
          </style>
        </head>
        <body class="bg-white" dir="${isRtlLayout ? "rtl" : "ltr"}">
          <div id="print-receipt-container">
            ${printElement.innerHTML}
          </div>
          <script>
            window.addEventListener('DOMContentLoaded', () => {
              // Quick delay to ensure fonts and styles render
              setTimeout(() => {
                window.focus();
                window.print();
              }, 350);
            });
          </script>
        </body>
      </html>
    `);
    doc.close();

    // Clean up frame after print dialog is handled
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 4000);
  };

  const isRTL = lang === "ar";

  const handleExportCSV = () => {
    const dataToExport = filteredTransactions.length > 0 ? filteredTransactions : transactions;

    if (dataToExport.length === 0) {
      toast.error(isRTL ? "لا توجد معاملات لتصديرها." : "No transactions available to export.", {
        style: { borderRadius: "20px", background: "#1a1a1a", color: "#fff" }
      });
      return;
    }

    const headers = isRTL 
      ? ["المعرف", "معرف الطلب", "التاريخ", "النوع", "الوصف", "الحالة", "المبلغ (ج.م)"]
      : ["ID", "Order ID", "Date", "Type", "Description", "Status", "Amount (EGP)"];

    const rows = dataToExport.map((tx: any) => [
      tx.id,
      tx.orderId || "",
      new Date(tx.createdAt).toISOString().split('T')[0],
      tx.type,
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      tx.status,
      tx.amount.toFixed(2)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row: any[]) => row.join(","))
    ].join("\n");

    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `giftisan_ledger_${artisan.id}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const isFiltered = filteredTransactions.length !== transactions.length && filteredTransactions.length > 0;
    toast.success(
      isFiltered
        ? (isRTL ? `تم تصدير ${filteredTransactions.length} معاملة بنجاح!` : `Exported ${filteredTransactions.length} transaction(s) successfully!`)
        : (isRTL ? "تم تصدير كامل السجل بنجاح!" : "Full ledger exported successfully!"), 
      {
        style: { borderRadius: "20px", background: "#1a1a1a", color: "#fff" }
      }
    );
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const withdrawAmount = parseFloat(amount);

    if (isNaN(withdrawAmount) || withdrawAmount < MIN_PAYOUT_AMOUNT) {
      toast.error(
        isRTL 
          ? `الحد الأدنى لطلب السحب هو ${MIN_PAYOUT_AMOUNT} ج.م.` 
          : `Minimum withdrawal amount is ${MIN_PAYOUT_AMOUNT} EGP.`, 
        {
          style: { borderRadius: "20px", background: "#1a1a1a", color: "#fff" }
        }
      );
      return;
    }

    if (withdrawAmount > balance.withdrawable) {
      toast.error(isRTL ? "لا يمكنك سحب مبلغ يتخطى رصيدك المتاح للسحب." : "You cannot withdraw more than your withdrawable balance.", {
        style: { borderRadius: "20px", background: "#1a1a1a", color: "#fff" }
      });
      return;
    }

    if (!address.trim() || !name.trim()) {
      toast.error(isRTL ? "الرجاء ملء جميع تفاصيل طلب السحب." : "Please fill out all payout details.", {
        style: { borderRadius: "20px", background: "#1a1a1a", color: "#fff" }
      });
      return;
    }

    setIsSubmitting(true);
    const result = await requestPayoutAction(artisan.id, withdrawAmount, method, address, name);
    setIsSubmitting(false);

    if (result.success) {
      toast.success(isRTL ? `تم إرسال طلب سحب بمبلغ ${withdrawAmount} ج.م بنجاح!` : `Success! Withdrawal request for ${withdrawAmount} EGP has been submitted.`, {
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
        style: { borderRadius: "20px", background: "#1a1a1a", color: "#fff" }
      });
      setShowWithdrawForm(false);
      setAmount("");
      router.refresh();
    } else {
      toast.error(isRTL ? "فشل في إرسال طلب السحب." : (result.error || "Failed to submit withdrawal request."), {
        style: { borderRadius: "20px", background: "#1a1a1a", color: "#fff" }
      });
    }
  };

  return (
    <div className="space-y-12">
      {/* 1. Header and Balance Cards */}
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 border border-primary/5 shadow-2xl shadow-primary/5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 pb-8 border-b border-primary/5">
          <div className="space-y-2 text-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-700 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-full border border-green-500/10">
              <Sparkles className="w-3 h-3 text-green-600" /> {isRTL ? "قسم الأرباح المباشر" : "Live Financial Tab"}
            </div>
            <h2 className="text-2xl md:text-4xl font-heading font-black text-primary">
              {isRTL ? "إدارة الأرباح والمدفوعات" : "Earnings & Payments"}
            </h2>
            <p className="text-xs md:text-sm text-charcoal/40 font-medium">
              {isRTL 
                ? "تتبع مبيعاتك وأرباحك المعلقة والمبالغ القابلة للسحب بكل سهولة." 
                : "Track your sales, pending escrow clearances, and request secure payouts."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 self-stretch md:self-auto">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title={isRTL ? "تحديث الأرصدة وتسوية المبيعات المستحقة تلقائيًا" : "Refresh balances and auto-clear matured sales"}
              className="h-12 px-4 text-xs font-bold text-charcoal/70 hover:text-primary bg-charcoal/5 hover:bg-primary/5 border border-primary/10 rounded-2xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 justify-center w-full sm:w-auto shrink-0"
            >
              <RotateCw className={cn("w-3.5 h-3.5 text-charcoal/50", isRefreshing && "animate-spin text-accent")} />
              <span>{isRefreshing ? (isRTL ? "جاري التحديث..." : "Syncing...") : (isRTL ? "تحديث الأرصدة" : "Refresh Balances")}</span>
            </button>

            <div className="flex flex-col items-center md:items-end gap-1.5 w-full sm:w-auto">
              <motion.button
                whileHover={canWithdraw ? { scale: 1.02 } : undefined}
                whileTap={canWithdraw ? { scale: 0.98 } : undefined}
                disabled={!canWithdraw}
                onClick={() => {
                  if (canWithdraw) {
                    setShowWithdrawForm(true);
                  }
                }}
                className={cn(
                  "px-6 h-12 font-bold rounded-2xl flex items-center gap-2 transition-all text-xs md:text-sm w-full sm:w-auto justify-center",
                  canWithdraw 
                    ? "bg-accent hover:bg-accent-dark text-white shadow-xl shadow-accent/20 cursor-pointer" 
                    : "bg-charcoal/10 text-charcoal/40 border border-primary/5 cursor-not-allowed shadow-none"
                )}
              >
                <Send className="w-3.5 h-3.5 rotate-45" /> {isRTL ? "طلب سحب الأرباح" : "Request Withdrawal"}
              </motion.button>
              {!canWithdraw && (
                <span className="text-[10px] font-medium text-charcoal/40">
                  {balance.withdrawable <= 0
                    ? (isRTL ? `متاح عند وصول الرصيد إلى ${MIN_PAYOUT_AMOUNT} ج.م` : `Available when withdrawable balance reaches ${MIN_PAYOUT_AMOUNT} EGP`)
                    : (isRTL 
                        ? `الحد الأدنى للسحب هو ${MIN_PAYOUT_AMOUNT} ج.م (المتاح حاليًا: ${balance.withdrawable.toFixed(2)} ج.م)` 
                        : `Minimum withdrawal is ${MIN_PAYOUT_AMOUNT} EGP (Available: ${balance.withdrawable.toFixed(2)} EGP)`)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Balance Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card A: Pending Escrow */}
          <div className="bg-amber-50/50 rounded-3xl p-8 border border-amber-100 flex flex-col justify-between text-start relative overflow-hidden group">
            <div className="absolute top-0 end-0 p-6 opacity-10">
              <Clock className="w-16 h-16 text-amber-700" />
            </div>
            <div className="space-y-4">
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-widest rounded-full w-fit">
                {isRTL ? "في الانتظار" : "Pending Escrow"}
              </span>
              <p className="text-3xl md:text-4xl lg:text-5xl font-heading font-black text-amber-900">
                {balance.pending.toFixed(2)} <span className="text-sm font-bold font-sans">EGP</span>
              </p>
            </div>
            <p className="text-[11px] text-amber-800/60 font-medium mt-6 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              {isRTL 
                ? "أرباح مبيعاتك تحت فترة حظر الأمان (7 أيام)" 
                : "Awaiting security holding period (7 days)"}
            </p>
          </div>

          {/* Card B: Withdrawable Balance */}
          <div className="bg-emerald-50/50 rounded-3xl p-8 border border-emerald-100 flex flex-col justify-between text-start relative overflow-hidden group">
            <div className="absolute top-0 end-0 p-6 opacity-10">
              <Coins className="w-16 h-16 text-emerald-700" />
            </div>
            <div className="space-y-4">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-widest rounded-full w-fit">
                {isRTL ? "قابل للسحب" : "Withdrawable"}
              </span>
              <p className="text-3xl md:text-4xl lg:text-5xl font-heading font-black text-emerald-900">
                {balance.withdrawable.toFixed(2)} <span className="text-sm font-bold font-sans">EGP</span>
              </p>
            </div>
            <p className="text-[11px] text-emerald-800/60 font-medium mt-6 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {isRTL 
                ? `الأموال الجاهزة للسحب (الحد الأدنى للسحب ${MIN_PAYOUT_AMOUNT} ج.م)` 
                : `Cleared funds ready for payout (Min. ${MIN_PAYOUT_AMOUNT} EGP)`}
            </p>
          </div>

          {/* Card C: Total Withdrawn */}
          <div className="bg-primary-light/5 rounded-3xl p-8 border border-primary/5 flex flex-col justify-between text-start relative overflow-hidden group">
            <div className="absolute top-0 end-0 p-6 opacity-10">
              <Wallet className="w-16 h-16 text-primary" />
            </div>
            <div className="space-y-4">
              <span className="px-3 py-1 bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest rounded-full w-fit">
                {isRTL ? "تم سحبه" : "Total Paid Out"}
              </span>
              <p className="text-3xl md:text-4xl lg:text-5xl font-heading font-black text-primary">
                {balance.withdrawn.toFixed(2)} <span className="text-sm font-bold font-sans">EGP</span>
              </p>
            </div>
            <p className="text-[11px] text-primary/60 font-medium mt-6 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-primary-light" />
              {isRTL 
                ? "مجموع الأموال التي قمت بسحبها بنجاح حتى الآن" 
                : "Total earnings successfully paid out to date"}
            </p>
          </div>
        </div>


      </div>

      {/* 3. Transaction History */}
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 border border-primary/5 shadow-2xl shadow-primary/5 text-start">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-primary/5">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-heading font-black text-primary flex items-center gap-2">
              {isRTL ? "سجل المعاملات المالية" : "Financial Transaction History"}
            </h3>
            {transactions.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-primary/5 text-primary text-[10px] font-black">
                {transactions.length} {isRTL ? "معاملة" : "total"}
              </span>
            )}
          </div>
          {transactions.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="px-4 h-10 bg-primary/5 hover:bg-primary/10 text-primary hover:text-accent font-bold rounded-xl flex items-center gap-2 transition-all text-xs uppercase tracking-wider cursor-pointer border border-primary/10 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isRTL ? "تصدير السجل (CSV)" : "Export CSV"}</span>
            </button>
          )}
        </div>

        {/* Controls Toolbar: Search & Filters */}
        {transactions.length > 0 && (
          <div className="space-y-4 mb-6">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className={cn("w-4 h-4 text-primary/40 absolute top-1/2 -translate-y-1/2 pointer-events-none", isRTL ? "right-3.5" : "left-3.5")} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isRTL ? "ابحث بالوصف، المعرف أو المبلغ..." : "Search by description, ID, amount..."}
                  className={cn(
                    "w-full h-10 text-xs font-medium rounded-xl border border-primary/10 bg-cream/15 focus:bg-white focus:outline-none focus:border-accent text-primary transition-all",
                    isRTL ? "pr-10 pl-9" : "pl-10 pr-9"
                  )}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 p-1 text-primary/40 hover:text-primary transition-colors cursor-pointer",
                      isRTL ? "left-2.5" : "right-2.5"
                    )}
                    aria-label={isRTL ? "مسح البحث" : "Clear search"}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Select Filter */}
              <div className="flex items-center gap-2">
                <div className="relative shrink-0 w-full sm:w-auto">
                  <select
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-auto h-10 px-3 pr-8 rounded-xl border border-primary/10 bg-cream/15 focus:bg-white focus:outline-none focus:border-accent text-xs font-bold text-primary appearance-none cursor-pointer transition-all"
                  >
                    <option value="ALL">{isRTL ? "جميع الحالات" : "All Statuses"}</option>
                    <option value="CLEARED">{isRTL ? "جاهز للسحب" : "Cleared"}</option>
                    <option value="PENDING">{isRTL ? "في الانتظار" : "Pending"}</option>
                    <option value="COMPLETED">{isRTL ? "تم التحويل" : "Completed"}</option>
                    <option value="FAILED">{isRTL ? "ملغي / مرفوض" : "Cancelled"}</option>
                  </select>
                  <ChevronDown className={cn("w-3.5 h-3.5 text-primary/40 absolute top-1/2 -translate-y-1/2 pointer-events-none", isRTL ? "left-2.5" : "right-2.5")} />
                </div>
              </div>
            </div>

            {/* Type Filter Pills & Info Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              {/* Type Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "ALL", labelEn: "All Types", labelAr: "كل العمليات" },
                  { id: "SALE", labelEn: "Sales", labelAr: "أرباح مبيعات" },
                  { id: "PAYOUT", labelEn: "Payouts", labelAr: "سحب أرباح" },
                  { id: "REFUND_DEBIT", labelEn: "Refunds", labelAr: "مرتجعات" },
                ].map((pill) => {
                  const isActive = typeFilter === pill.id;
                  return (
                    <button
                      key={pill.id}
                      onClick={() => setTypeFilter(pill.id as any)}
                      className={cn(
                        "h-8 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                        isActive
                          ? "bg-primary text-white shadow-sm"
                          : "bg-primary/5 hover:bg-primary/10 text-primary/70"
                      )}
                    >
                      {pill.id === "SALE" && <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-green-300" : "bg-green-500")} />}
                      {pill.id === "PAYOUT" && <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-blue-300" : "bg-blue-500")} />}
                      {pill.id === "REFUND_DEBIT" && <span className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-red-300" : "bg-red-500")} />}
                      <span>{isRTL ? pill.labelAr : pill.labelEn}</span>
                    </button>
                  );
                })}
              </div>

              {/* Status / Reset indication */}
              <div className="flex items-center gap-3 text-xs">
                <span className="text-charcoal/50 font-medium">
                  {isRTL
                    ? `عرض ${paginatedTransactions.length} من أصل ${filteredTransactions.length}`
                    : `Showing ${paginatedTransactions.length} of ${filteredTransactions.length}`}
                  {filteredTransactions.length !== transactions.length && (
                    <span className="text-primary/40 ms-1">
                      ({isRTL ? `من ${transactions.length}` : `from ${transactions.length}`})
                    </span>
                  )}
                </span>

                {(typeFilter !== "ALL" || statusFilter !== "ALL" || searchQuery.trim()) && (
                  <button
                    onClick={() => {
                      setTypeFilter("ALL");
                      setStatusFilter("ALL");
                      setSearchQuery("");
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700 font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{isRTL ? "إعادة تعيين" : "Reset"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {transactions.length === 0 ? (
          <div className="p-12 text-center bg-cream/20 rounded-3xl border border-dashed border-primary/10 text-charcoal/40 font-medium space-y-3">
            <Coins className="w-12 h-12 mx-auto text-primary/10" />
            <p className="text-sm">
              {isRTL 
                ? "لم يتم تسجيل أي معاملات مالية بعد. ستظهر أرباح مبيعاتك هنا بمجرد استلام طلبات جديدة." 
                : "No financial transactions have been logged yet. Your earnings will display here automatically."}
            </p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-10 text-center bg-cream/10 rounded-2xl border border-dashed border-primary/10 text-charcoal/50 space-y-3">
            <Search className="w-8 h-8 mx-auto text-primary/20" />
            <p className="text-sm font-bold text-primary/80">
              {isRTL ? "لا توجد معاملات مطابقة للبحث أو الفلتر المحدد" : "No transactions match your search or filter criteria"}
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="px-4 py-2 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              {isRTL ? "مسح خيارات الفلترة" : "Clear Filters"}
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card Feed View */}
            <div className="space-y-3 block md:hidden">
              {paginatedTransactions.map((tx: any) => {
                const isSale = tx.type === "SALE";
                const isPositive = tx.amount > 0;

                // Dynamic description translator for Arabic localization
                const getTranslatedDescription = (desc: string) => {
                  if (!desc) return "";
                  if (!isRTL) return desc;

                  if (desc.includes("Withdrawal request via")) {
                    const parts = desc.match(/Withdrawal request via ([A-Z_]+)\. Sent to: (.*) \((.*)\)/);
                    if (parts) {
                      const [_, method, address, name] = parts;
                      const methodAr = method === "INSTAPAY" 
                        ? "إنستا باي (InstaPay)" 
                        : method === "VODAFONE_CASH" 
                          ? "فودافون كاش / محفظة الهاتف" 
                          : "تحويل بنكي مباشر (IBAN)";
                      return `طلب سحب أرباح عبر ${methodAr}. مرسل إلى: ${address} (${name})`;
                    }
                    return desc
                      .replace("Withdrawal request via", "طلب سحب عبر")
                      .replace("Sent to:", "مرسل إلى:");
                  }

                  if (desc.includes("Earnings from")) {
                    let arDesc = desc;
                    arDesc = arDesc.replace("Earnings from", "أرباح من");
                    arDesc = arDesc.replace("Qty:", "الكمية:");
                    arDesc = arDesc.replace("Total:", "الإجمالي:");
                    arDesc = arDesc.replace("Commission:", "العمولة:");
                    arDesc = arDesc.replaceAll("EGP", "ج.م");
                    return arDesc;
                  }

                  return desc;
                };

                return (
                  <div 
                    key={tx.id} 
                    className="bg-cream/20 hover:bg-cream/40 rounded-2xl p-4 border border-primary/5 transition-all space-y-3 text-start"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md",
                          isSale 
                            ? "bg-green-100 text-green-800" 
                            : tx.type === "PAYOUT" 
                              ? "bg-blue-100 text-blue-800" 
                              : "bg-red-100 text-red-800"
                        )}>
                          {isRTL 
                            ? (isSale ? "أرباح مبيعات" : tx.type === "PAYOUT" ? "سحب أرباح" : "تعديل رصيد")
                            : tx.type}
                        </span>
                        {tx.orderId && (
                          <span className="font-mono text-[9px] bg-primary/5 text-primary/70 px-1.5 py-0.5 rounded border border-primary/10 inline-flex items-center gap-1">
                            <FileText className="w-2.5 h-2.5" />
                            {isRTL ? "طلب " : "Order "}#{tx.orderId.slice(-6).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-charcoal/50 font-medium">
                        {new Date(tx.createdAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-primary font-bold leading-snug">
                      {getTranslatedDescription(tx.description) || (isRTL ? (isSale ? "أرباح مبيعات" : "طلب سحب أرباح") : (isSale ? "Sale Proceeds" : "Withdrawal Request"))}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-primary/5">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md inline-flex items-center gap-1",
                          tx.status === "COMPLETED" || tx.status === "CLEARED"
                            ? "bg-green-100 text-green-800"
                            : tx.status === "PENDING"
                              ? "bg-amber-100 text-amber-800 animate-pulse"
                              : "bg-red-100 text-red-800"
                        )}>
                          {tx.status === "PENDING" && <Clock className="w-2.5 h-2.5" />}
                          {isRTL 
                            ? (tx.status === "COMPLETED" ? "تم التحويل" : tx.status === "CLEARED" ? "جاهز للسحب" : tx.status === "PENDING" ? "في الانتظار" : (isSale ? "طلب ملغي" : "مرفوض"))
                            : (tx.status === "FAILED" ? (isSale ? "CANCELLED" : "FAILED") : tx.status)}
                        </span>
                        <button
                          onClick={() => setSelectedReceipt(tx)}
                          className="px-2 py-1 bg-primary/5 hover:bg-primary/10 text-primary hover:text-accent rounded-lg transition-all inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider cursor-pointer border border-primary/5 shadow-sm"
                        >
                          <FileText className="w-3 h-3" />
                          <span>{isRTL ? "الإيصال" : "Receipt"}</span>
                        </button>
                      </div>

                      <div className="text-end">
                        <span className={cn(
                          "text-sm font-black",
                          tx.status === "FAILED"
                            ? "text-charcoal/40 line-through"
                            : isPositive
                              ? "text-green-600"
                              : "text-charcoal"
                        )}>
                          {isPositive ? "+" : ""}{tx.amount.toFixed(2)} {isRTL ? "ج.م" : "EGP"}
                        </span>
                        {tx.status === "FAILED" && (
                          <span className="block text-[8px] font-bold text-rose-500 uppercase tracking-widest no-underline">
                            {isRTL ? "(ملغي)" : "(Voided)"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-primary/5">
                    <th className="py-4 px-2 text-xs font-black uppercase tracking-wider text-primary/40 text-start whitespace-nowrap">{isRTL ? "التاريخ" : "Date"}</th>
                    <th className="py-4 px-2 text-xs font-black uppercase tracking-wider text-primary/40 text-start whitespace-nowrap">{isRTL ? "النوع" : "Type"}</th>
                    <th className="py-4 px-2 text-xs font-black uppercase tracking-wider text-primary/40 text-start min-w-[250px]">{isRTL ? "الوصف" : "Description"}</th>
                    <th className="py-4 px-2 text-xs font-black uppercase tracking-wider text-primary/40 text-start whitespace-nowrap">{isRTL ? "الحالة" : "Status"}</th>
                    <th className="py-4 px-2 text-xs font-black uppercase tracking-wider text-primary/40 text-end whitespace-nowrap">{isRTL ? "المبلغ" : "Amount"}</th>
                    <th className="py-4 px-2 text-xs font-black uppercase tracking-wider text-primary/40 text-end whitespace-nowrap">{isRTL ? "الإجراء" : "Action"}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map((tx: any) => {
                    const isSale = tx.type === "SALE";
                    const isPositive = tx.amount > 0;

                    // Dynamic description translator for Arabic localization
                    const getTranslatedDescription = (desc: string) => {
                      if (!desc) return "";
                      if (!isRTL) return desc;

                      // 1. Withdrawal Pattern
                      if (desc.includes("Withdrawal request via")) {
                        const parts = desc.match(/Withdrawal request via ([A-Z_]+)\. Sent to: (.*) \((.*)\)/);
                        if (parts) {
                          const [_, method, address, name] = parts;
                          const methodAr = method === "INSTAPAY" 
                            ? "إنستا باي (InstaPay)" 
                            : method === "VODAFONE_CASH" 
                              ? "فودافون كاش / محفظة الهاتف" 
                              : "تحويل بنكي مباشر (IBAN)";
                          return `طلب سحب أرباح عبر ${methodAr}. مرسل إلى: ${address} (${name})`;
                        }
                        
                        return desc
                          .replace("Withdrawal request via", "طلب سحب عبر")
                          .replace("Sent to:", "مرسل إلى:");
                      }

                      // 2. Earnings Pattern
                      if (desc.includes("Earnings from")) {
                        let arDesc = desc;
                        arDesc = arDesc.replace("Earnings from", "أرباح من");
                        arDesc = arDesc.replace("Qty:", "الكمية:");
                        arDesc = arDesc.replace("Total:", "الإجمالي:");
                        arDesc = arDesc.replace("Commission:", "العمولة:");
                        arDesc = arDesc.replaceAll("EGP", "ج.م");
                        return arDesc;
                      }

                      return desc;
                    };
                    
                    return (
                      <tr key={tx.id} className="border-b border-primary/5 hover:bg-cream/10 transition-colors">
                        <td className="py-5 px-2 text-xs text-charcoal/60 font-medium whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </td>
                        <td className="py-5 px-2 whitespace-nowrap">
                          <span className={cn(
                            "px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md",
                            isSale 
                              ? "bg-green-100 text-green-800" 
                              : tx.type === "PAYOUT" 
                                ? "bg-blue-100 text-blue-800" 
                                : "bg-red-100 text-red-800"
                          )}>
                            {isRTL 
                              ? (isSale ? "أرباح مبيعات" : tx.type === "PAYOUT" ? "سحب أرباح" : "تعديل رصيد")
                              : tx.type}
                          </span>
                        </td>
                        <td className="py-5 px-2 text-xs text-primary font-bold min-w-[250px]">
                          <div className="flex flex-col gap-1 items-start">
                            <span>
                              {getTranslatedDescription(tx.description) || (isRTL ? (isSale ? "أرباح مبيعات" : "طلب سحب أرباح") : (isSale ? "Sale Proceeds" : "Withdrawal Request"))}
                            </span>
                            {tx.orderId && (
                              <span className="font-mono text-[9px] bg-primary/5 text-primary/70 px-1.5 py-0.5 rounded border border-primary/10 inline-flex items-center gap-1">
                                <FileText className="w-2.5 h-2.5" />
                                {isRTL ? "طلب " : "Order "}#{tx.orderId.slice(-6).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-5 px-2 whitespace-nowrap">
                          <span className={cn(
                            "px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md inline-flex items-center gap-1",
                            tx.status === "COMPLETED" || tx.status === "CLEARED"
                              ? "bg-green-100 text-green-800"
                              : tx.status === "PENDING"
                                ? "bg-amber-100 text-amber-800 animate-pulse"
                                : "bg-red-100 text-red-800"
                          )}>
                            {tx.status === "PENDING" && <Clock className="w-2.5 h-2.5" />}
                            {isRTL 
                              ? (tx.status === "COMPLETED" ? "تم التحويل" : tx.status === "CLEARED" ? "جاهز للسحب" : tx.status === "PENDING" ? "في الانتظار" : (isSale ? "طلب ملغي" : "مرفوض"))
                              : (tx.status === "FAILED" ? (isSale ? "CANCELLED" : "FAILED") : tx.status)}
                          </span>
                        </td>
                        <td className={cn(
                          "py-5 px-2 text-sm font-bold text-end whitespace-nowrap",
                          tx.status === "FAILED"
                            ? "text-charcoal/40 line-through"
                            : isPositive
                              ? "text-green-600"
                              : "text-charcoal"
                        )}>
                          <div>
                            <span>{isPositive ? "+" : ""}{tx.amount.toFixed(2)} {isRTL ? "ج.م" : "EGP"}</span>
                            {tx.status === "FAILED" && (
                              <span className="block text-[9px] font-bold text-rose-500 uppercase tracking-widest no-underline">
                                {isRTL ? "(ملغي - 0.00 ج.م)" : "(Voided - 0.00 EGP)"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-5 px-2 text-end whitespace-nowrap">
                          <button
                            onClick={() => setSelectedReceipt(tx)}
                            className="px-2.5 py-1.5 bg-primary/5 hover:bg-primary/10 text-primary hover:text-accent rounded-lg transition-all inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider cursor-pointer border border-primary/5 shadow-sm"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{isRTL ? "الإيصال" : "Receipt"}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t border-primary/5 text-xs text-charcoal/60">
                <div className="font-medium">
                  {isRTL
                    ? `صفحة ${currentPage} من ${totalPages}`
                    : `Page ${currentPage} of ${totalPages}`}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-3 rounded-lg border border-primary/10 bg-white hover:bg-cream/40 disabled:opacity-30 disabled:pointer-events-none font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                    aria-label={isRTL ? "الصفحة السابقة" : "Previous Page"}
                  >
                    <ChevronLeft className={cn("w-3.5 h-3.5", isRTL && "rotate-180")} />
                    <span>{isRTL ? "السابق" : "Previous"}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        return (
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - currentPage) <= 1
                        );
                      })
                      .map((page, idx, arr) => {
                        const prev = arr[idx - 1];
                        const showEllipsis = prev && page - prev > 1;
                        return (
                          <div key={page} className="flex items-center">
                            {showEllipsis && <span className="px-1 text-charcoal/30 font-bold">...</span>}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={cn(
                                "w-8 h-8 rounded-lg font-bold text-xs transition-all cursor-pointer",
                                currentPage === page
                                  ? "bg-primary text-white shadow-sm"
                                  : "hover:bg-cream/60 text-charcoal"
                              )}
                            >
                              {page}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 rounded-lg border border-primary/10 bg-white hover:bg-cream/40 disabled:opacity-30 disabled:pointer-events-none font-bold inline-flex items-center gap-1 transition-all cursor-pointer"
                    aria-label={isRTL ? "الصفحة التالية" : "Next Page"}
                  >
                    <span>{isRTL ? "التالي" : "Next"}</span>
                    <ChevronRight className={cn("w-3.5 h-3.5", isRTL && "rotate-180")} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 4. Educational Guidelines Tab / Prelaunch Info */}
      <div className="p-6 md:p-12 bg-primary text-white rounded-3xl md:rounded-[3rem] shadow-2xl relative overflow-hidden group text-start">
        <div className="relative z-10 space-y-6 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-accent-light text-[9px] font-black uppercase tracking-widest rounded-full border border-white/10">
            <HelpCircle className="w-3.5 h-3.5" /> {isRTL ? "فهم نظام الدفع والعمولات" : "Understanding Our Payout System"}
          </div>
          <h3 className="text-xl md:text-3xl font-heading font-black tracking-tight leading-snug">
            {isRTL ? "كيف يتم احتساب نسبتك ومتى يمكنك سحبها؟" : "How is your share calculated, and when is it ready?"}
          </h3>
          <div className="space-y-4 text-sm text-white/70 font-medium leading-relaxed">
            <p>
              1. <strong>{isRTL ? "مبيعات فورية" : "Immediate Split Tracking"}:</strong> {isRTL 
                ? "عندما يشتري عميل منتجك، يذهب المبلغ لوعاء المنصة المركزي. نقوم فوراً بحساب أرباحك كاملة (استمتع بـ 0% عمولة للمنصة!) وحفظها كرصيد معلّق." 
                : "When a customer completes a checkout, the money goes to the secure central platform pool. We immediately calculate your full earnings (Enjoying 0% platform commission!), and place your earnings in your Pending balance."}
            </p>
            <p>
              2. <strong>{isRTL ? "الأمان والضمان" : "Fulfillment Escrow"}:</strong> {isRTL 
                ? "يتم تجميد الأرباح في رصيدك المعلّق لتسهيل الإلغاءات في حال تعذر شحن الطلب. بمجرد مرور 7 أيام على تسليم الطلب للعميل، ينتقل المبلغ تلقائياً لرصيدك القابل للسحب." 
                : "The funds are held safely as Pending to accommodate cancellations or stock changes. Once 7 days pass after the customer safely receives their unique products, the funds clear automatically into your Withdrawable balance."}
            </p>
            <p>
              3. <strong>{isRTL ? "كيفية طلب سحب الأرباح" : "How to Request Payouts"}:</strong> {isRTL 
                ? "بمجرد انتقال أرباحك إلى الرصيد القابل للسحب (بعد مرور 7 أيام على التسليم)، اضغط على زر \"طلب سحب الأرباح\" بأعلى هذه الصفحة. أدخل المبلغ المطلوبة، واختر طريقة السحب المفضلة (إنستاباي، محفظة كاش، أو تحويل بنكي) وأكد طلبك. نقوم بمراجعة الطلبات وتحويل الأموال خلال 24 ساعة عمل." 
                : "Once your funds clear into your Withdrawable balance (7 days post-delivery), click the 'Request Withdrawal' button at the top of this page. Enter your amount, choose your preferred payout channel (InstaPay, Mobile Wallet, or Bank Transfer), and submit. Admin approvals are verified and transferred within 24 business hours."}
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 end-0 w-96 h-96 bg-white/5 rounded-full blur-[100px] translate-y-1/2 translate-x-1/2" />
      </div>

      {/* 2. Payout Request Modal Dialog */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showWithdrawForm && (
            <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-4 md:p-6">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowWithdrawForm(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
              />

              {/* Modal Body */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-primary/10 flex flex-col z-10 my-auto max-h-[calc(100dvh-2rem)] text-start"
              >
                {/* Header */}
                <div className="p-4 sm:p-6 bg-cream/20 border-b border-primary/10 flex items-center justify-between shrink-0">
                  <div className="space-y-0.5">
                    <h3 className="text-base sm:text-lg font-heading font-black text-primary">
                      {isRTL ? "طلب سحب الأرباح" : "Request Payout"}
                    </h3>
                    <p className="text-[11px] text-charcoal/50 font-medium">
                      {isRTL 
                        ? `الرصيد المتاح للسحب: ${balance.withdrawable.toFixed(2)} ج.م` 
                        : `Available to withdraw: ${balance.withdrawable.toFixed(2)} EGP`}
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowWithdrawForm(false)}
                    aria-label={isRTL ? "إغلاق" : "Close"}
                    className="w-8 h-8 rounded-full hover:bg-primary/10 flex items-center justify-center transition-colors cursor-pointer text-primary/70 hover:text-primary shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form Body */}
                <div className="overflow-y-auto p-4 sm:p-6 flex-1 min-h-0">
                  <form onSubmit={handleRequestPayout} className="space-y-4">
                    {/* Amount */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-wider text-primary/60">
                          {isRTL ? "المبلغ المراد سحبه (EGP)" : "Amount to Withdraw (EGP)"}
                        </label>
                        <span className="text-[10px] font-bold text-accent bg-accent/10 px-2.5 py-0.5 rounded-full">
                          {isRTL ? `الحد الأدنى: ${MIN_PAYOUT_AMOUNT} ج.م` : `Min: ${MIN_PAYOUT_AMOUNT} EGP`}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        required
                        min={MIN_PAYOUT_AMOUNT}
                        max={balance.withdrawable}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder={isRTL ? `الحد الأدنى ${MIN_PAYOUT_AMOUNT} ج.م - الأقصى ${balance.withdrawable.toFixed(2)}` : `Min ${MIN_PAYOUT_AMOUNT} EGP - Max ${balance.withdrawable.toFixed(2)}`}
                        className="w-full h-11 px-4 rounded-xl border border-primary/10 bg-white focus:outline-none focus:border-accent text-sm font-bold text-primary"
                      />
                    </div>

                    {/* Method */}
                    <div className="space-y-1.5 relative">
                      <label className="text-xs font-black uppercase tracking-wider text-primary/60">
                        {isRTL ? "طريقة الدفع المفضلة" : "Preferred Payout Method"}
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="w-full h-11 px-4 rounded-xl border border-primary/10 bg-white focus:outline-none focus:border-accent text-sm font-bold text-primary flex items-center justify-between text-start cursor-pointer hover:border-primary/20 transition-all"
                        >
                          <span>
                            {method === "INSTAPAY"
                              ? (isRTL ? "عنوان إنستا باي (InstaPay)" : "InstaPay Address")
                              : method === "VODAFONE_CASH"
                                ? (isRTL ? "فودافون كاش / محفظة الهاتف" : "Vodafone Cash / Mobile Wallet")
                                : (isRTL ? "تحويل بنكي مباشر (IBAN)" : "Direct Bank Transfer (IBAN)")}
                          </span>
                          <ChevronDown className={cn("w-4 h-4 text-primary/30 transition-transform duration-200", isDropdownOpen && "rotate-180")} />
                        </button>

                        <AnimatePresence>
                          {isDropdownOpen && (
                            <>
                              <div 
                                className="fixed inset-0 z-40 cursor-default" 
                                onClick={() => setIsDropdownOpen(false)}
                              />
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.15 }}
                                className="absolute left-0 right-0 mt-2 bg-white rounded-xl border border-primary/10 shadow-xl z-50 overflow-hidden divide-y divide-primary/5"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMethod("INSTAPAY");
                                    setIsDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full px-4 py-2.5 text-start text-xs font-bold hover:bg-cream/40 transition-colors flex items-center justify-between cursor-pointer",
                                    method === "INSTAPAY" ? "text-accent bg-accent/5" : "text-primary"
                                  )}
                                >
                                  <span>{isRTL ? "عنوان إنستا باي (InstaPay)" : "InstaPay Address"}</span>
                                  {method === "INSTAPAY" && <CheckCircle2 className="w-4 h-4 text-accent" />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setMethod("VODAFONE_CASH");
                                    setIsDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full px-4 py-2.5 text-start text-xs font-bold hover:bg-cream/40 transition-colors flex items-center justify-between cursor-pointer",
                                    method === "VODAFONE_CASH" ? "text-accent bg-accent/5" : "text-primary"
                                  )}
                                >
                                  <span>{isRTL ? "فودافون كاش / محفظة الهاتف" : "Vodafone Cash / Mobile Wallet"}</span>
                                  {method === "VODAFONE_CASH" && <CheckCircle2 className="w-4 h-4 text-accent" />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setMethod("BANK_TRANSFER");
                                    setIsDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full px-4 py-2.5 text-start text-xs font-bold hover:bg-cream/40 transition-colors flex items-center justify-between cursor-pointer",
                                    method === "BANK_TRANSFER" ? "text-accent bg-accent/5" : "text-primary"
                                  )}
                                >
                                  <span>{isRTL ? "تحويل بنكي مباشر (IBAN)" : "Direct Bank Transfer (IBAN)"}</span>
                                  {method === "BANK_TRANSFER" && <CheckCircle2 className="w-4 h-4 text-accent" />}
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-primary/60">
                        {method === "INSTAPAY" 
                          ? (isRTL ? "عنوان إنستا باي (مثال: name@instapay)" : "InstaPay Handle (e.g. name@instapay)") 
                          : method === "VODAFONE_CASH" 
                            ? (isRTL ? "رقم المحفظة الإلكترونية (010xxxxxxx)" : "Mobile Wallet Number (010xxxxxxx)") 
                            : (isRTL ? "رقم الحساب البنكي (IBAN)" : "Bank Account IBAN")}
                      </label>
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={method === "INSTAPAY" ? "yourname@instapay" : method === "VODAFONE_CASH" ? "01012345678" : "EGxxxxxxxxxxxxxxxxxxxxxxx"}
                        className="w-full h-11 px-4 rounded-xl border border-primary/10 bg-white focus:outline-none focus:border-accent text-sm font-bold text-primary"
                      />
                    </div>

                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-primary/60">
                        {isRTL ? "اسم المستفيد بالكامل" : "Beneficiary Full Name"}
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Fatima Mohamed"
                        className="w-full h-11 px-4 rounded-xl border border-primary/10 bg-white focus:outline-none focus:border-accent text-sm font-bold text-primary"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowWithdrawForm(false)}
                        className="flex-1 h-11 bg-charcoal/5 hover:bg-charcoal/10 text-charcoal/70 font-bold rounded-xl transition-colors text-xs uppercase tracking-wider cursor-pointer"
                      >
                        {isRTL ? "إلغاء" : "Cancel"}
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-[2] h-11 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-colors text-xs uppercase tracking-wider cursor-pointer"
                      >
                        {isSubmitting ? (isRTL ? "جاري الإرسال..." : "Submitting...") : (isRTL ? "إرسال طلب السحب" : "Submit Withdrawal Request")}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Receipt PDF Generator Modal */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {selectedReceipt && (
            <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-4 md:p-6">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedReceipt(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
              />

              {/* Modal Body */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 25 } }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-primary/10 flex flex-col z-10 my-auto max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)]"
              >
                {/* Header Actions */}
                <div className="p-3.5 sm:p-4 bg-cream/15 border-b border-primary/10 flex items-center justify-between shrink-0">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-primary/70 truncate">
                    {isRTL ? "معاينة إيصال المعاملة" : "Transaction Receipt Preview"}
                  </span>
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    aria-label={isRTL ? "إغلاق" : "Close"}
                    className="w-8 h-8 rounded-full hover:bg-primary/10 flex items-center justify-center transition-colors cursor-pointer text-primary/70 hover:text-primary shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Printable Receipt Area */}
                <div className="overflow-y-auto p-3 sm:p-5 md:p-6 bg-cream/5 flex-1 min-h-0 flex flex-col items-center">
                  <div 
                    id="print-receipt-container"
                    className="w-full max-w-md bg-white border border-primary/10 shadow-md sm:shadow-lg rounded-2xl p-4 sm:p-6 md:p-7 space-y-4 sm:space-y-5 text-start relative overflow-hidden my-auto"
                    dir={isRTL ? "rtl" : "ltr"}
                  >
                    {/* Decorative Border */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent to-primary" />

                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-primary/5 pb-3 sm:pb-4 gap-2">
                      <div>
                        <h2 className="text-lg sm:text-xl font-heading font-black text-primary leading-none">Giftisan</h2>
                        <p className="text-[9px] sm:text-[10px] text-accent font-bold uppercase tracking-widest mt-1">Handcrafted Mastery</p>
                      </div>
                      <div className="text-end shrink-0">
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                          {isRTL ? "معاملة رسمية" : "Official"}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-0.5">
                      <h3 className="text-sm sm:text-base font-black text-primary">
                        {selectedReceipt.type === "SALE" 
                          ? (isRTL ? "إيصال أرباح مبيعات" : "Sale Proceeds Receipt")
                          : (isRTL ? "إيصال تحويل مستحقات" : "Payout Transfer Receipt")
                        }
                      </h3>
                      <p className="text-[10px] sm:text-xs text-charcoal/40 font-mono break-all">
                        Ref: #{selectedReceipt.id}
                      </p>
                    </div>

                    {/* Grid details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 border-t border-b border-primary/5 py-3 sm:py-4 text-xs font-medium text-charcoal/80">
                      <div>
                        <p className="text-[10px] text-primary/40 font-black uppercase tracking-wider mb-0.5">{isRTL ? "التاريخ والوقت" : "Date & Time"}</p>
                        <p className="font-bold text-primary">
                          {new Date(selectedReceipt.createdAt).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
                            year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-primary/40 font-black uppercase tracking-wider mb-0.5">{isRTL ? "حالة المعاملة" : "Transaction Status"}</p>
                        <p className={cn(
                          "font-bold",
                          (selectedReceipt.status === "COMPLETED" || selectedReceipt.status === "CLEARED")
                            ? "text-green-600"
                            : selectedReceipt.status === "PENDING"
                              ? "text-amber-600"
                              : "text-red-600"
                        )}>
                          {isRTL 
                            ? (selectedReceipt.status === "COMPLETED" ? "تم التحويل" : selectedReceipt.status === "CLEARED" ? "جاهز للسحب" : selectedReceipt.status === "PENDING" ? "في الانتظار" : (selectedReceipt.type === "SALE" ? "طلب ملغي" : "مرفوض"))
                            : (selectedReceipt.status === "FAILED" ? (selectedReceipt.type === "SALE" ? "CANCELLED" : "FAILED") : selectedReceipt.status)
                          }
                        </p>
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <p className="text-[10px] text-primary/40 font-black uppercase tracking-wider mb-0.5">{isRTL ? "الوصف والتفاصيل" : "Description & Details"}</p>
                        <p className="font-bold text-primary leading-relaxed text-xs break-words">
                          {selectedReceipt.description || (selectedReceipt.type === "SALE" ? "Earnings Split" : "Withdrawal request")}
                        </p>
                      </div>
                    </div>

                    {/* Pricing / Total block */}
                    <div className="bg-cream/20 rounded-xl p-3 sm:p-4 flex justify-between items-center gap-3 border border-primary/5">
                      <span className="text-[11px] sm:text-xs font-black text-primary/60 uppercase tracking-wider shrink-0">{isRTL ? "المبلغ الإجمالي" : "Total Amount"}</span>
                      <div className="text-end shrink-0">
                        <span className={cn(
                          "text-lg sm:text-xl font-black",
                          selectedReceipt.status === "FAILED" ? "text-red-600 line-through" : "text-primary"
                        )}>
                          {selectedReceipt.amount > 0 ? "+" : ""}{selectedReceipt.amount.toFixed(2)} {isRTL ? "ج.م" : "EGP"}
                        </span>
                        {selectedReceipt.status === "FAILED" && (
                          <span className="block text-[9px] font-bold text-red-500 uppercase tracking-widest mt-0.5">
                            {isRTL ? "(تم إلغاء الطلب - 0.00 ج.م)" : "(Order Cancelled - 0.00 EGP)"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer message / Verification Code */}
                    <div className="text-center pt-1 sm:pt-2 space-y-1.5 sm:space-y-2">
                      <p className="text-[9px] sm:text-[10px] text-charcoal/40 font-medium italic leading-relaxed">
                        {isRTL 
                          ? "شكراً لكونك جزءاً من دائرة جيفتيزان الحرفية الإبداعية." 
                          : "Thank you for being a vital part of the Giftisan artisan circle."
                        }
                      </p>
                      {/* Fake Barcode representation for beautiful tactile aesthetics */}
                      <div className="pt-1 flex flex-col items-center gap-1 opacity-40">
                        <div className="h-5 sm:h-6 w-28 sm:w-32 bg-[repeating-linear-gradient(90deg,currentColor,currentColor_1px,transparent_1px,transparent_4px,currentColor_4px,currentColor_6px,transparent_6px,transparent_8px)]" />
                        <span className="text-[8px] font-mono tracking-widest break-all">{selectedReceipt.id.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="p-3 sm:p-4 bg-cream/15 border-t border-primary/10 flex gap-2.5 shrink-0">
                  <button
                    onClick={() => setSelectedReceipt(null)}
                    className="flex-1 h-11 sm:h-12 rounded-xl text-xs sm:text-sm font-bold text-primary bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer"
                  >
                    {isRTL ? "إغلاق" : "Close"}
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex-1 h-11 sm:h-12 bg-primary hover:bg-primary-light text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors text-xs sm:text-sm uppercase tracking-wider cursor-pointer active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    <span>{isRTL ? "طباعة / حفظ PDF" : "Print / Save PDF"}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
