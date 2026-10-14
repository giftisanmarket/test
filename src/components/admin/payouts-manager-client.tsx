"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  DollarSign, 
  Check, 
  X, 
  Clock, 
  TrendingUp, 
  Smartphone, 
  Building, 
  Send, 
  Search,
  CheckCircle2,
  AlertTriangle,
  Printer,
  FileText,
  Download
} from "lucide-react";
import { approvePayoutAction, rejectPayoutAction, triggerEscrowClearanceAction } from "@/lib/actions";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

interface PayoutsManagerClientProps {
  pendingPayouts: any[];
  pastPayouts: any[];
  dict: any;
  lang: string;
}

export function PayoutsManagerClient({
  pendingPayouts,
  pastPayouts,
  dict,
  lang
}: PayoutsManagerClientProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>("ALL");
  const [confirmPayoutData, setConfirmPayoutData] = useState<{ id: string; amount: number } | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isClearingEscrow, setIsClearingEscrow] = useState(false);

  const handleClearEscrow = async () => {
    setIsClearingEscrow(true);
    const res = await triggerEscrowClearanceAction();
    setIsClearingEscrow(false);

    if (res.success) {
      const msg = lang === "ar" 
        ? `تم تسوية ${res.clearedCount} معاملة بنجاح من حسابات الضمان إلى الرصيد المتاح للسحب.`
        : (res.message || "Escrow clearance completed successfully!");

      toast.success(msg, {
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
        style: { borderRadius: "20px", background: "#1a1a1a", color: "#fff" }
      });
      router.refresh();
    } else {
      toast.error(lang === "ar" ? "فشل في تسوية حسابات الضمان." : (res.error || "Failed to trigger escrow settlement."), {
        style: { borderRadius: "20px", background: "#1a1a1a", color: "#fff" }
      });
    }
  };

  const handlePrint = () => {
    const printElement = document.getElementById("print-receipt-container");
    if (!printElement) return;

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

    const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map(el => el.outerHTML)
      .join("\n");

    const isRtlLayout = lang === "ar";

    doc.write(`
      <html>
        <head>
          <title>Giftisan Administrative Receipt</title>
          ${styles}
          <style>
            @media print {
              body { margin: 0; padding: 20px; background: #fff !important; }
              #print-receipt-container { border: none !important; shadow: none !important; width: 100% !important; max-width: 100% !important; }
            }
          </style>
        </head>
        <body dir="${isRtlLayout ? "rtl" : "ltr"}">
          ${printElement.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 300);
  };

  const handleApprove = async () => {
    if (!confirmPayoutData) return;
    const txId = confirmPayoutData.id;

    setIsProcessing(txId);
    const res = await approvePayoutAction(txId);
    setIsProcessing(null);
    setConfirmPayoutData(null); 

    if (res.success) {
      toast.success(lang === "ar" ? "تم اعتماد طلب السحب بنجاح وتحديث السجلات المالية!" : "Payout request successfully completed and ledger updated!", {
        icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
        style: { borderRadius: "20px", background: "#1a1a1a", color: "#fff" }
      });
      router.refresh();
    } else {
      toast.error(lang === "ar" ? "فشل في اعتماد طلب السحب." : (res.error || "Failed to approve payout."), {
        style: { borderRadius: "20px", background: "#1a1a1a", color: "#fff" }
      });
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      toast.error(lang === "ar" ? "يرجى كتابة سبب الرفض." : "Please provide a rejection reason.", {
        style: { borderRadius: "20px", background: "#1a1a1a", color: "#fff" }
      });
      return;
    }

    setIsProcessing(id);
    const res = await rejectPayoutAction(id, rejectReason);
    setIsProcessing(null);

    if (res.success) {
      toast.success(lang === "ar" ? "تم رفض طلب السحب وإعادة الأرباح للرصيد." : "Payout request rejected. Funds returned to balance.", {
        style: { borderRadius: "20px", background: "#1a1a1a", color: "#fff" }
      });
      setActiveRejectId(null);
      setRejectReason("");
      router.refresh();
    } else {
      toast.error(lang === "ar" ? "فشل في رفض طلب السحب." : (res.error || "Failed to reject payout."), {
        style: { borderRadius: "20px", background: "#1a1a1a", color: "#fff" }
      });
    }
  };

  const isRTL = lang === "ar";

  const handleExportAdminCSV = () => {
    if (pastPayouts.length === 0) {
      toast.error(isRTL ? "لا توجد معاملات لتصديرها." : "No payouts available to export.", {
        style: { borderRadius: "20px", background: "#1a1a1a", color: "#fff" }
      });
      return;
    }

    const headers = isRTL 
      ? ["المعرف", "التاريخ", "المتجر", "البريد الإلكتروني", "الوصف", "الحالة", "المبلغ (ج.م)"]
      : ["ID", "Date", "Shop", "Email", "Description", "Status", "Amount (EGP)"];

    const rows = pastPayouts.map((tx: any) => [
      tx.id,
      new Date(tx.createdAt).toISOString().split('T')[0],
      `"${((tx.artisan?.studioName || tx.artisan?.user?.name || 'Artisan')).replace(/"/g, '""')}"`,
      tx.artisan?.user?.email || "",
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      tx.status,
      Math.abs(tx.amount).toFixed(2)
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
    link.setAttribute("download", `giftisan_admin_payouts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(isRTL ? "تم تصدير سجل المدفوعات بنجاح!" : "Payouts ledger exported successfully!", {
      style: { borderRadius: "20px", background: "#1a1a1a", color: "#fff" }
    });
  };

  const pendingTotalAmount = pendingPayouts.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const pastTotalAmount = pastPayouts
    .filter(tx => tx.status === "COMPLETED")
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  const filteredHistory = pastPayouts.filter(tx => {
    const studio = (tx.artisan?.studioName || tx.artisan?.user?.name || "").toLowerCase();
    const desc = (tx.description || "").toLowerCase();
    const query = historySearch.toLowerCase();
    const matchesSearch = studio.includes(query) || desc.includes(query);

    const matchesChannel = channelFilter === "ALL" || (
      channelFilter === "INSTAPAY" ? desc.includes("INSTAPAY") :
      channelFilter === "VODAFONE_CASH" ? (desc.includes("VODAFONE_CASH") || desc.includes("Mobile Wallet") || desc.includes("محفظة")) :
      (desc.includes("BANK") || desc.includes("IBAN"))
    );

    const matchesStatus = historyStatusFilter === "ALL" || tx.status === historyStatusFilter;

    return matchesSearch && matchesChannel && matchesStatus;
  });

  return (
    <div className="space-y-8 sm:space-y-12 text-start" dir={isRTL ? "rtl" : "ltr"}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-primary/5 pb-6 sm:pb-8">
        <div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-heading font-black text-primary tracking-tighter mb-1.5 sm:mb-2">
            {isRTL ? "طلبات" : "Artisan"}{" "}
            <span className="serif italic text-accent font-normal">
              {isRTL ? "السحب" : "Payouts"}
            </span>
          </h1>
          <p className="text-charcoal/40 font-medium text-xs sm:text-sm md:text-base">
            {isRTL 
              ? "مراجعة واعتماد طلبات السحب يدويًا وتسجيل التحويلات المالية بنجاح." 
              : "Review, coordinate transfer receipts, and manually process outstanding payout requests."}
          </p>
        </div>
        <button
          onClick={handleClearEscrow}
          disabled={isClearingEscrow}
          className="w-full sm:w-auto px-5 sm:px-6 h-11 sm:h-12 bg-primary hover:bg-primary-light text-white font-bold rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 text-xs uppercase tracking-wider shrink-0 cursor-pointer disabled:opacity-50"
        >
          <Clock className={cn("w-4 h-4", isClearingEscrow && "animate-spin")} />
          <span>{isClearingEscrow ? (isRTL ? "جاري التسوية..." : "Settling Escrow...") : (isRTL ? "تسوية حسابات الضمان" : "Run Escrow Settlement")}</span>
        </button>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Outstanding Volume */}
        <div className="bg-amber-50/50 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-amber-100 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700/60">
              {isRTL ? "إجمالي المبالغ المطلوبة" : "Pending Payout Volume"}
            </span>
            <p className="text-3xl font-heading font-bold text-amber-950">
              {pendingTotalAmount.toFixed(2)} <span className="text-sm font-bold">EGP</span>
            </p>
          </div>
          <p className="text-xs text-amber-800/60 font-medium mt-4 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {isRTL 
              ? `${pendingPayouts.length} طلب سحب قيد المراجعة حاليًا` 
              : `${pendingPayouts.length} active requests awaiting transfer`}
          </p>
        </div>

        {/* Paid Volume */}
        <div className="bg-emerald-50/50 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-emerald-100 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700/60">
              {isRTL ? "إجمالي المدفوعات التاريخية" : "Total Paid Out All-Time"}
            </span>
            <p className="text-3xl font-heading font-bold text-emerald-950">
              {pastTotalAmount.toFixed(2)} <span className="text-sm font-bold">EGP</span>
            </p>
          </div>
          <p className="text-xs text-emerald-800/60 font-medium mt-4 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            {isRTL ? "تحويلات ناجحة للعارضين" : "Successful platform payouts executed"}
          </p>
        </div>

        {/* System Fee Card */}
        <div className="bg-primary-light/5 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-primary/5 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">
              {isRTL ? "رسوم عمولة المنصة الثابتة" : "Platform Settings"}
            </span>
            <p className="text-3xl font-heading font-bold text-primary">
              0.00 <span className="text-sm font-bold">%</span>
            </p>
          </div>
          <p className="text-xs text-primary/60 font-medium mt-4 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-accent" />
            {isRTL 
              ? "استمتع بـ 0% عمولة طوال عام 2026" 
              : "Enjoy 0% platform commission for the 2026 period"}
          </p>
        </div>
      </div>

      {/* Pending Payout Requests List */}
      <div className="space-y-6">
        <h2 className="text-xl md:text-2xl font-heading font-bold text-primary flex items-center gap-2">
          {isRTL ? "الطلبات النشطة بانتظار التحويل" : "Active Withdrawal Requests"}
          {pendingPayouts.length > 0 && (
            <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-black rounded-full">
              {pendingPayouts.length}
            </span>
          )}
        </h2>

        {pendingPayouts.length === 0 ? (
          <div className="p-16 text-center bg-cream/20 rounded-[2rem] border border-dashed border-primary/10 text-charcoal/40 font-medium space-y-3">
            <Check className="w-12 h-12 mx-auto text-emerald-500 bg-emerald-100 rounded-full p-2" />
            <p className="text-sm">
              {isRTL 
                ? "رائع! لا توجد أي طلبات سحب معلقة حاليًا." 
                : "Excellent! All artisan withdrawal requests are paid and cleared."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {pendingPayouts.map((tx) => {
              const methodStr = tx.description?.split("via ")?.[1]?.split(".")?.[0] || "INSTAPAY";
              const addressStr = tx.description?.split("Sent to: ")?.[1]?.split(" (")?.[0] || "N/A";
              const nameStr = tx.description?.split(" (")?.[1]?.slice(0, -1) || "N/A";

              const isInsta = methodStr === "INSTAPAY";
              const isVodafone = methodStr === "VODAFONE_CASH";

              return (
                <div 
                  key={tx.id} 
                  className="bg-white rounded-3xl p-6 md:p-8 border border-primary/5 shadow-xl shadow-primary/5 hover:border-primary/10 transition-all flex flex-col justify-between gap-6 relative"
                >
                  <div className="space-y-4">
                    {/* Header info */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="text-base font-bold text-primary">
                          {tx.artisan?.studioName || tx.artisan?.user?.name || "Artisan"}
                        </h3>
                        <p className="text-xs text-charcoal/40 font-semibold">
                          {tx.artisan?.user?.email}
                        </p>
                      </div>
                      <p className="text-2xl font-heading font-black text-accent shrink-0">
                        {Math.abs(tx.amount).toFixed(2)} <span className="text-xs font-bold font-sans">EGP</span>
                      </p>
                    </div>

                    {/* Coordinates details */}
                    <div className="p-4 bg-cream/35 rounded-2xl border border-primary/5 text-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-charcoal/50 font-medium">{isRTL ? "الوسيلة:" : "Payment Channel:"}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1",
                          isInsta 
                            ? "bg-purple-100 text-purple-800" 
                            : isVodafone 
                              ? "bg-red-100 text-red-800" 
                              : "bg-blue-100 text-blue-800"
                        )}>
                          {isInsta ? <Send className="w-2.5 h-2.5" /> : isVodafone ? <Smartphone className="w-2.5 h-2.5" /> : <Building className="w-2.5 h-2.5" />}
                          {methodStr}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-charcoal/50 font-medium">{isRTL ? "العنوان/الرقم:" : "Payout Address:"}</span>
                        <span className="font-mono font-bold text-primary select-all">
                          {addressStr}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-charcoal/50 font-medium">{isRTL ? "الاسم بالكامل:" : "Beneficiary Full Name:"}</span>
                        <span className="font-bold text-primary">
                          {nameStr}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-4 border-t border-primary/5 flex flex-col sm:flex-row gap-3">
                    {activeRejectId === tx.id ? (
                      <div className="w-full space-y-3">
                        <input
                          type="text"
                          required
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Type reason (e.g. Invalid InstaPay ID)"
                          className="w-full h-10 px-3 rounded-xl border border-primary/10 bg-white text-xs font-semibold focus:outline-none focus:border-red-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReject(tx.id)}
                            disabled={isProcessing === tx.id || !rejectReason.trim()}
                            className="flex-1 h-9 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                          >
                            Decline & Refund
                          </button>
                          <button
                            onClick={() => {
                              setActiveRejectId(null);
                              setRejectReason("");
                            }}
                            className="px-3 h-9 bg-charcoal/10 hover:bg-charcoal/20 text-charcoal text-xs font-bold rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setConfirmPayoutData({ id: tx.id, amount: tx.amount })}
                          disabled={isProcessing !== null}
                          className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/10 transition-colors text-xs uppercase tracking-wider cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          {isRTL ? "تم التحويل بنجاح" : "Approve & Mark Paid"}
                        </button>
                        <button
                          onClick={() => setActiveRejectId(tx.id)}
                          disabled={isProcessing !== null}
                          className="px-4 h-12 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors text-xs uppercase tracking-wider"
                        >
                          <X className="w-4 h-4" />
                          {isRTL ? "رفض الطلب" : "Decline"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Payout History Ledger */}
      <div className="bg-white rounded-2xl sm:rounded-[2rem] md:rounded-[3rem] p-4 sm:p-6 md:p-12 border border-primary/5 shadow-2xl shadow-primary/5 text-start space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-lg sm:text-xl md:text-2xl font-heading font-black text-primary">
            {isRTL ? "أرشيف عمليات السحب المنفذة" : "Completed Payouts History"}
          </h2>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Search bar */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/30" />
              <input
                type="text"
                placeholder={isRTL ? "البحث باسم المتجر..." : "Search shop..."}
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full h-10 ps-10 pe-4 rounded-xl border border-primary/10 bg-cream/10 text-xs font-bold focus:outline-none focus:border-accent"
              />
            </div>

            {pastPayouts.length > 0 && (
              <button
                onClick={handleExportAdminCSV}
                className="px-4 h-10 bg-primary/5 hover:bg-primary/10 text-primary hover:text-accent font-bold rounded-xl flex items-center justify-center gap-2 transition-all text-xs uppercase tracking-wider cursor-pointer border border-primary/10 shadow-sm shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isRTL ? "تصدير الأرشيف (CSV)" : "Export CSV"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Channel Filter Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap pt-2 pb-1 border-t border-primary/5">
          <span className="text-[10px] font-black uppercase tracking-wider text-primary/40 me-1 shrink-0">
            {isRTL ? "وسيلة التحويل:" : "Payout Method:"}
          </span>
          {[
            { key: "ALL", label: isRTL ? "الكل" : "All Methods" },
            { key: "INSTAPAY", label: isRTL ? "إنستا باي (InstaPay)" : "InstaPay" },
            { key: "VODAFONE_CASH", label: isRTL ? "محفظة هاتف (Vodafone/Cash)" : "Mobile Wallet" },
            { key: "BANK", label: isRTL ? "تحويل بنكي (IBAN)" : "Bank Transfer" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setChannelFilter(tab.key)}
              className={cn(
                "px-3.5 h-8 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer shrink-0 whitespace-nowrap",
                channelFilter === tab.key
                  ? "bg-primary text-white border-primary shadow-sm"
                  : "bg-white text-primary/40 border-primary/5 hover:border-primary/20"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-12 text-center bg-cream/10 rounded-3xl text-charcoal/40 font-semibold">
            {isRTL ? "لم يتم العثور على أي عمليات سحب مطابقة." : "No matching historical payouts found."}
          </div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="block lg:hidden space-y-3">
              {filteredHistory.map((tx: any) => {
                const isCompleted = tx.status === "COMPLETED";
                return (
                  <div 
                    key={tx.id}
                    className="p-4 sm:p-5 bg-cream/15 rounded-2xl border border-primary/5 shadow-xs space-y-3 hover:border-primary/15 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-bold text-primary text-sm truncate">
                          {tx.artisan?.studioName || tx.artisan?.user?.name || "Artisan"}
                        </h4>
                        <p className="text-[10px] text-charcoal/40 font-semibold truncate">
                          {tx.artisan?.user?.email}
                        </p>
                      </div>
                      <span className={cn(
                        "px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md shrink-0 inline-flex items-center gap-1",
                        isCompleted
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      )}>
                        {tx.status}
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-primary/5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-charcoal/40 font-bold uppercase tracking-wider">
                          {isRTL ? "المبلغ" : "Amount"}
                        </span>
                        <span className={cn(
                          "font-heading font-black text-base",
                          isCompleted ? "text-green-600" : "text-red-500"
                        )}>
                          {Math.abs(tx.amount).toFixed(2)} EGP
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[10px] text-charcoal/40 font-bold uppercase tracking-wider">
                          {isRTL ? "التاريخ" : "Date"}
                        </span>
                        <span className="text-charcoal/60 font-medium">
                          {new Date(tx.createdAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </span>
                      </div>
                      {tx.description && (
                        <div className="pt-2 border-t border-primary/5 text-[11px] text-primary/80 font-medium leading-relaxed">
                          {tx.description}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedReceipt(tx)}
                      className="w-full h-10 bg-primary/5 hover:bg-primary/10 text-primary hover:text-accent font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs uppercase tracking-wider cursor-pointer border border-primary/5 active:scale-95"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{isRTL ? "عرض وتحميل الإيصال الرسمي" : "View & Print Receipt"}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-primary/5">
                    <th className="py-4 text-xs font-black uppercase tracking-wider text-primary/40 text-start">{isRTL ? "التاريخ" : "Date"}</th>
                    <th className="py-4 text-xs font-black uppercase tracking-wider text-primary/40 text-start">{isRTL ? "العارض" : "Artisan"}</th>
                    <th className="py-4 text-xs font-black uppercase tracking-wider text-primary/40 text-start">{isRTL ? "تفاصيل التحويل" : "Details"}</th>
                    <th className="py-4 text-xs font-black uppercase tracking-wider text-primary/40 text-start">{isRTL ? "الحالة" : "Status"}</th>
                    <th className="py-4 text-xs font-black uppercase tracking-wider text-primary/40 text-end">{isRTL ? "المبلغ" : "Amount"}</th>
                    <th className="py-4 text-xs font-black uppercase tracking-wider text-primary/40 text-end">{isRTL ? "الإجراء" : "Action"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((tx: any) => {
                    const isCompleted = tx.status === "COMPLETED";
                    return (
                      <tr key={tx.id} className="border-b border-primary/5 hover:bg-cream/10 transition-colors">
                        <td className="py-5 text-xs text-charcoal/60 font-medium">
                          {new Date(tx.createdAt).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                          })}
                        </td>
                        <td className="py-5">
                          <div className="text-xs font-bold text-primary">
                            {tx.artisan?.studioName || tx.artisan?.user?.name || "Artisan"}
                          </div>
                          <div className="text-[10px] text-charcoal/40 font-semibold mt-0.5">
                            {tx.artisan?.user?.email}
                          </div>
                        </td>
                        <td className="py-5 text-xs text-primary font-bold max-w-xs md:max-w-md">
                          {tx.description}
                        </td>
                        <td className="py-5">
                          <span className={cn(
                            "px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-md inline-flex items-center gap-1",
                            isCompleted
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          )}>
                            {tx.status}
                          </span>
                        </td>
                        <td className={cn(
                          "py-5 text-sm font-bold text-end",
                          isCompleted ? "text-green-600" : "text-red-500"
                        )}>
                          {Math.abs(tx.amount).toFixed(2)} EGP
                        </td>
                        <td className="py-5 text-end">
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
          </>
        )}
      </div>

      {/* Custom Confirmation Modal */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {confirmPayoutData && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              {/* Backdrop Overlay with blur */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setConfirmPayoutData(null)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
              />

              {/* Modal Body */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="bg-white rounded-[2rem] border border-primary/10 max-w-md w-full p-8 md:p-10 shadow-2xl relative z-10 space-y-6 text-center"
              >
                {/* Icon */}
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-2">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>

                {/* Title & Body */}
                <div className="space-y-3">
                  <h3 className="text-xl font-heading font-black text-primary">
                    {isRTL ? "تأكيد عملية التحويل" : "Confirm Payout Transfer"}
                  </h3>
                  <p className="text-xs text-charcoal/60 font-semibold leading-relaxed">
                    {isRTL
                      ? `هل أنت متأكد من قيامك بتحويل مبلغ ${Math.abs(confirmPayoutData.amount).toFixed(2)} جنيه بنجاح وتريد تسجيل المعاملة كمكتملة؟ لا يمكن التراجع عن هذا الإجراء.`
                      : `Are you sure you have transferred ${Math.abs(confirmPayoutData.amount).toFixed(2)} EGP and want to mark this request as COMPLETED? This action will update the artisan's ledger and cannot be undone.`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isProcessing !== null}
                    onClick={handleApprove}
                    className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/15 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    {isProcessing === confirmPayoutData.id ? (
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 stroke-[3]" />
                    )}
                    {isRTL ? "نعم، تم التحويل" : "Yes, Confirm Paid"}
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing !== null}
                    onClick={() => setConfirmPayoutData(null)}
                    className="flex-1 h-12 bg-charcoal/5 hover:bg-charcoal/10 disabled:opacity-50 text-charcoal font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer"
                  >
                    {isRTL ? "إلغاء" : "Cancel"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Admin Receipt PDF Generator Modal */}
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
                    {isRTL ? "معاينة إيصال المعاملة (لوحة الإدارة)" : "Transaction Receipt Preview (Admin Panel)"}
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
                        <p className="text-[9px] sm:text-[10px] text-accent font-bold uppercase tracking-widest mt-1">Platform Administration</p>
                      </div>
                      <div className="text-end shrink-0">
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                          {isRTL ? "معاملة رسمية" : "Official Payout"}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-0.5">
                      <h3 className="text-sm sm:text-base font-black text-primary">
                        {isRTL ? "إيصال تحويل مستحقات العارض" : "Artisan Payout Receipt"}
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
                        <p className="font-bold text-green-600">
                          {isRTL 
                            ? (selectedReceipt.status === "COMPLETED" ? "تم التحويل" : selectedReceipt.status === "CLEARED" ? "جاهز للسحب" : selectedReceipt.status === "PENDING" ? "في الانتظار" : "ملغي/مرفوض")
                            : selectedReceipt.status
                          }
                        </p>
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <p className="text-[10px] text-primary/40 font-black uppercase tracking-wider mb-0.5">{isRTL ? "متجر العارض" : "Artisan Shop"}</p>
                        <p className="font-bold text-primary text-xs break-words">
                          {selectedReceipt.artisan?.studioName || selectedReceipt.artisan?.user?.name || "Artisan"} ({selectedReceipt.artisan?.user?.email})
                        </p>
                      </div>
                      <div className="col-span-1 sm:col-span-2">
                        <p className="text-[10px] text-primary/40 font-black uppercase tracking-wider mb-0.5">{isRTL ? "الوصف والتفاصيل" : "Description & Details"}</p>
                        <p className="font-bold text-primary leading-relaxed text-xs break-words">
                          {selectedReceipt.description}
                        </p>
                      </div>
                    </div>

                    {/* Pricing / Total block */}
                    <div className="bg-cream/20 rounded-xl p-3 sm:p-4 flex justify-between items-center gap-3 border border-primary/5">
                      <span className="text-[11px] sm:text-xs font-black text-primary/60 uppercase tracking-wider shrink-0">{isRTL ? "المبلغ الإجمالي" : "Total Amount"}</span>
                      <span className="text-lg sm:text-xl font-black text-primary shrink-0">
                        {Math.abs(selectedReceipt.amount).toFixed(2)} EGP
                      </span>
                    </div>

                    {/* Footer message / Verification Code */}
                    <div className="text-center pt-1 sm:pt-2 space-y-1.5 sm:space-y-2">
                      <p className="text-[9px] sm:text-[10px] text-charcoal/40 font-medium italic leading-relaxed">
                        {isRTL 
                          ? "هذا الإيصال تم توليده تلقائياً من لوحة تحكم جيفتيزان لإثبات سداد المستحقات." 
                          : "This receipt was automatically generated from the Giftisan Admin suite to verify disbursement."
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
