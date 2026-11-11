"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Info,
  Package,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Truck,
  User,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  cancelClaimJtShipmentAction,
  dispatchReplacementShipmentAction,
  dispatchReturnPickupAction,
  getJtWaybillAction,
  resolveRefundRequestAction,
  syncReplacementTrackingAction,
  syncReturnTrackingAction,
} from "@/lib/actions";
import { getEffectiveArtisanCommissionRate } from "@/lib/commission";
import {
  type RefundCostBearer,
  getOrderRemainingRefundableAmount,
  getRefundStatusLabel,
  isOpenRefundClaimStatus,
  isReplacementPreparingStatus,
  isReplacementShippedStatus,
  requiresAdminNoteForAction,
  roundRefundCurrency,
  shouldDefaultDeductReplacementStock,
  shouldDefaultRestockOnRefund,
} from "@/lib/refund-policy";
import { toast } from "react-hot-toast";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface AdminRefundsClientProps {
  initialClaims: any[];
  dict: any;
}

type ConfirmableAction = "MARK_REFUNDED" | "REJECT" | "REPLACEMENT" | "MARK_REPLACEMENT_DELIVERED";
type ResolveAction =
  | "INVESTIGATING"
  | "WAITING_CUSTOMER"
  | "WAITING_COURIER"
  | "RETURN_REQUESTED"
  | "APPROVE"
  | "START_REFUND"
  | "MARK_REFUNDED"
  | "REJECT"
  | "REPLACEMENT"
  | "DISPATCH_REPLACEMENT"
  | "MARK_REPLACEMENT_DELIVERED";

const REFUND_METHOD_PRESETS = [
  "Paymob Card",
  "InstaPay",
  "Vodafone Cash",
  "Bank Transfer",
] as const;

export function AdminRefundsClient({ initialClaims, dict: _dict }: AdminRefundsClientProps) {
  const params = useParams();
  const router = useRouter();
  const lang = (params?.lang as string) || "en";
  const isAr = lang === "ar";

  const [claims, setClaims] = useState<any[]>(initialClaims);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [refundMethod, setRefundMethod] = useState("");
  const [refundReference, setRefundReference] = useState("");
  const [editableRefundAmount, setEditableRefundAmount] = useState("");
  const [restockItems, setRestockItems] = useState(false);
  const [costBearer, setCostBearer] = useState<RefundCostBearer>("ARTISAN");
  const [deductReplacementStock, setDeductReplacementStock] = useState(false);
  const [replacementShippingFee, setReplacementShippingFee] = useState("0");
  const [replacementCarrier, setReplacementCarrier] = useState("J&T Express");
  const [replacementTrackingNumber, setReplacementTrackingNumber] = useState("");
  const [replacementLiveScan, setReplacementLiveScan] = useState<{
    scanType: string;
    desc: string;
    time: string;
    delivered?: boolean;
  } | null>(null);
  const [isDispatchingReplacement, setIsDispatchingReplacement] = useState(false);
  const [isSyncingReplacement, setIsSyncingReplacement] = useState(false);
  const [returnCarrier, setReturnCarrier] = useState("J&T Express");
  const [returnTrackingNumber, setReturnTrackingNumber] = useState("");
  const [returnLiveScan, setReturnLiveScan] = useState<{
    scanType: string;
    desc: string;
    time: string;
    delivered?: boolean;
  } | null>(null);
  const [isDispatchingReturn, setIsDispatchingReturn] = useState(false);
  const [isSyncingReturn, setIsSyncingReturn] = useState(false);
  const [isCancellingClaimShipment, setIsCancellingClaimShipment] = useState(false);
  const [pendingConfirmAction, setPendingConfirmAction] = useState<ConfirmableAction | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const filteredClaims = claims.filter((claim) => {
    if (filterStatus === "REFUND_APPROVED") {
      if (!["REFUND_APPROVED", "APPROVED"].includes(claim.status)) return false;
    } else if (filterStatus !== "ALL" && claim.status !== filterStatus) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const orderId = claim.orderId.toLowerCase();
      const userName = (claim.user?.name || "").toLowerCase();
      const userEmail = (claim.user?.email || "").toLowerCase();
      const id = claim.id.toLowerCase();
      return (
        orderId.includes(q) ||
        userName.includes(q) ||
        userEmail.includes(q) ||
        id.includes(q)
      );
    }
    return true;
  });

  const openClaimModal = (claim: any) => {
    const targetItem =
      claim.orderItem ||
      (claim.orderItemId
        ? claim.order?.items?.find((i: any) => i.id === claim.orderItemId)
        : null);
    const defaultAmount =
      claim.refundAmount ??
      getOrderRemainingRefundableAmount(claim.order || {}, claim.id);
    const availableStock = targetItem?.variant
      ? Number(targetItem.variant.stock || 0)
      : Number(targetItem?.product?.stock || 0);

    setSelectedClaim(claim);
    setAdminNote(claim.adminNote || "");
    setRefundMethod(claim.refundMethod || "");
    setRefundReference(claim.refundReference || "");
    setEditableRefundAmount(String(roundRefundCurrency(Number(defaultAmount || 0))));
    setRestockItems(
      shouldDefaultRestockOnRefund({ reason: claim.reason, item: targetItem })
    );
    setCostBearer(claim.costBearer === "PLATFORM" ? "PLATFORM" : "ARTISAN");
    setDeductReplacementStock(
      Boolean(
        claim.replacementStockDeducted ??
          shouldDefaultDeductReplacementStock({
            item: targetItem,
            availableStock,
          })
      )
    );
    setReplacementShippingFee("0");
    setReplacementCarrier(claim.replacementCarrier || "J&T Express");
    setReplacementTrackingNumber(claim.replacementTrackingNumber || "");
    setReplacementLiveScan(null);
    setReturnCarrier(claim.returnCarrier || "J&T Express");
    setReturnTrackingNumber(claim.returnTrackingNumber || "");
    setReturnLiveScan(null);
    setPendingConfirmAction(null);
  };

  const financialPreview = useMemo(() => {
    if (!selectedClaim) return null;

    const order = selectedClaim.order || {};
    const targetItem =
      selectedClaim.orderItem ||
      (selectedClaim.orderItemId
        ? order.items?.find((i: any) => i.id === selectedClaim.orderItemId)
        : null);
    const maxRefundable = getOrderRemainingRefundableAmount(order, selectedClaim.id);
    const suggestedAmount = roundRefundCurrency(
      Number(selectedClaim.refundAmount ?? maxRefundable)
    );
    const parsedInput = roundRefundCurrency(Number(editableRefundAmount));
    const effectiveAmount =
      Number.isFinite(parsedInput) && parsedInput > 0
        ? Math.min(parsedInput, maxRefundable)
        : 0;

    const saleTxs: any[] = (order.transactions || []).filter(
      (t: any) => t.type === "SALE" && ["PENDING", "CLEARED"].includes(t.status)
    );
    const targetArtisanId = targetItem?.product?.artisanId;
    const relevantSaleTxs = targetArtisanId
      ? saleTxs.filter((t) => t.artisanId === targetArtisanId)
      : saleTxs;

    const hasPendingSale = relevantSaleTxs.some((t) => t.status === "PENDING");
    const hasClearedSale = relevantSaleTxs.some((t) => t.status === "CLEARED");

    let estimatedArtisanDebit = 0;
    if (costBearer === "ARTISAN" && effectiveAmount > 0) {
      if (targetItem?.product?.artisan) {
        const artisan = targetItem.product.artisan;
        const itemTotal = roundRefundCurrency(targetItem.price * targetItem.quantity);
        let netItemTotal = itemTotal;
        if (order.coupon?.artisanId === artisan.id && (order.discountApplied || 0) > 0) {
          const artisanSponsoredTotal = (order.items || [])
            .filter((i: any) => i.product?.artisanId === artisan.id)
            .reduce((sum: number, i: any) => sum + i.price * i.quantity, 0);
          if (artisanSponsoredTotal > 0) {
            const itemDiscountShare = roundRefundCurrency(
              (itemTotal / artisanSponsoredTotal) * (order.discountApplied || 0)
            );
            netItemTotal = Math.max(0, roundRefundCurrency(itemTotal - itemDiscountShare));
          }
        }
        const commission = getEffectiveArtisanCommissionRate(artisan);
        const fullShare = Math.max(0, roundRefundCurrency(netItemTotal * (1 - commission)));
        const partialRatio = netItemTotal > 0 ? Math.min(1, effectiveAmount / netItemTotal) : 1;
        estimatedArtisanDebit = roundRefundCurrency(fullShare * partialRatio);
      } else if (!selectedClaim.orderItemId) {
        const totalSaleAmount = relevantSaleTxs.reduce(
          (sum, t) => sum + Math.abs(Number(t.amount || 0)),
          0
        );
        const maxMerchandise = Math.max(
          0,
          roundRefundCurrency(Number(order.totalAmount || 0) - Number(order.shippingCost || 0))
        );
        const ratio =
          maxMerchandise > 0 && effectiveAmount < maxMerchandise
            ? Math.min(1, effectiveAmount / maxMerchandise)
            : 1;
        estimatedArtisanDebit = roundRefundCurrency(totalSaleAmount * ratio);
      }
    }

    const restockQty = selectedClaim.orderItemId
      ? targetItem?.quantity || 1
      : (order.items || [])
          .filter((i: any) => !["CANCELLED", "REFUNDED"].includes(i.status))
          .reduce((sum: number, i: any) => sum + Number(i.quantity || 0), 0);

    return {
      orderTotal: Number(order.totalAmount || 0),
      shippingCost: Number(order.shippingCost || 0),
      discountApplied: Number(order.discountApplied || 0),
      maxRefundable,
      suggestedAmount,
      effectiveAmount,
      isAmountValid: Number.isFinite(parsedInput) && parsedInput > 0 && parsedInput <= maxRefundable + 0.01,
      hasPendingSale,
      hasClearedSale,
      estimatedArtisanDebit,
      restockQty,
      isPersonalized: Boolean(
        targetItem?.personalization?.trim() || targetItem?.customImage?.trim()
      ),
    };
  }, [selectedClaim, editableRefundAmount, costBearer]);

  const executeResolve = async (action: ResolveAction) => {
    if (!selectedClaim) return;

    if (requiresAdminNoteForAction(action) && !adminNote.trim()) {
      toast.error(
        isAr
          ? "يرجى كتابة توضيح أو تعليمات في ملاحظة الإدارة قبل تنفيذ هذا الإجراء."
          : "Please enter a clear explanation or instructions in Admin Note first."
      );
      return;
    }

    const isMonetaryAction =
      action === "APPROVE" || action === "START_REFUND" || action === "MARK_REFUNDED";
    let numericRefundAmount: number | undefined;
    if (isMonetaryAction) {
      const parsed = roundRefundCurrency(Number(editableRefundAmount));
      const maxRefundable = financialPreview?.maxRefundable ?? Number(selectedClaim.order?.totalAmount || 0);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        toast.error(isAr ? "يجب أن يكون مبلغ الاسترداد أكبر من صفر." : "Refund amount must be greater than zero.");
        return;
      }
      if (parsed > maxRefundable + 0.01) {
        toast.error(
          isAr
            ? `الحد الأقصى المتاح للاسترداد هو ${maxRefundable.toLocaleString()} ج.م`
            : `Maximum refundable amount is EGP ${maxRefundable.toLocaleString()}`
        );
        return;
      }
      numericRefundAmount = Math.min(parsed, maxRefundable);
    }

    setIsResolving(true);
    try {
      const parsedShippingFee = roundRefundCurrency(Number(replacementShippingFee || 0));
      const res = await resolveRefundRequestAction({
        requestId: selectedClaim.id,
        action,
        adminNote,
        refundMethod,
        refundReference,
        refundAmount: numericRefundAmount,
        restockItems,
        costBearer,
        deductReplacementStock: action === "REPLACEMENT" ? deductReplacementStock : undefined,
        replacementShippingFee:
          action === "REPLACEMENT" && Number.isFinite(parsedShippingFee) && parsedShippingFee > 0
            ? parsedShippingFee
            : 0,
        replacementCarrier: action === "DISPATCH_REPLACEMENT" ? replacementCarrier : undefined,
        replacementTrackingNumber: action === "DISPATCH_REPLACEMENT" ? replacementTrackingNumber : undefined,
        lang: isAr ? "ar" : "en",
      });

      if (res.error) {
        toast.error(res.error);
      } else if (res.claim) {
        toast.success(
          action === "APPROVE"
            ? isAr
              ? "تم اعتماد الاسترداد؛ لم يتم تحويل المبلغ بعد"
              : "Refund approved; payment has not been sent yet"
            : action === "START_REFUND"
              ? isAr
                ? "تم تسجيل بدء الاسترداد"
                : "Refund processing recorded"
              : action === "MARK_REFUNDED"
                ? isAr
                  ? "تم تأكيد الاسترداد وتحديث الطلب"
                  : "Refund confirmed and order updated"
                : action === "REPLACEMENT"
                  ? isAr
                    ? "تم اعتماد البديل وإخطار الحرفي لتجهيزه"
                    : "Replacement approved; artisan notified to prepare piece"
                  : action === "DISPATCH_REPLACEMENT"
                    ? isAr
                      ? "تم تسجيل شحن القطعة البديلة"
                      : "Replacement shipment recorded"
                    : action === "MARK_REPLACEMENT_DELIVERED"
                      ? isAr
                        ? "تم تأكيد تسليم البديل وإغلاق المطالبة"
                        : "Replacement confirmed delivered and claim closed"
                      : action === "INVESTIGATING"
                        ? isAr
                          ? "بدأ التحقيق في الحالة"
                          : "Case marked as investigating"
                        : action === "WAITING_CUSTOMER"
                          ? isAr
                            ? "الحالة بانتظار العميل"
                            : "Case is waiting for the customer"
                          : action === "WAITING_COURIER"
                            ? isAr
                              ? "الحالة بانتظار شركة الشحن"
                              : "Case is waiting for the courier"
                            : action === "RETURN_REQUESTED"
                              ? isAr
                                ? "تم طلب إرجاع المنتج"
                                : "Return requested"
                              : isAr
                                ? "تم رفض الطلب بنجاح"
                                : "Claim rejected"
        );

        const mergedClaim = { ...selectedClaim, ...res.claim };
        setClaims((prev) =>
          prev.map((c) => (c.id === selectedClaim.id ? { ...c, ...res.claim } : c))
        );
        setPendingConfirmAction(null);
        if (action === "MARK_REFUNDED" || action === "REJECT" || action === "MARK_REPLACEMENT_DELIVERED") {
          setSelectedClaim(null);
        } else {
          setSelectedClaim(mergedClaim);
          setRefundMethod(mergedClaim.refundMethod || refundMethod);
          setRefundReference(mergedClaim.refundReference || refundReference);
          if (mergedClaim.refundAmount !== undefined && mergedClaim.refundAmount !== null) {
            setEditableRefundAmount(String(mergedClaim.refundAmount));
          }
          if (mergedClaim.replacementCarrier) {
            setReplacementCarrier(mergedClaim.replacementCarrier);
          }
          if (mergedClaim.replacementTrackingNumber) {
            setReplacementTrackingNumber(mergedClaim.replacementTrackingNumber);
          }
        }
        setAdminNote("");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve claim");
    } finally {
      setIsResolving(false);
    }
  };

  const handleDispatchReplacement = async (mode: "JT_EXPRESS" | "MANUAL") => {
    if (!selectedClaim) return;
    setIsDispatchingReplacement(true);
    try {
      const res = await dispatchReplacementShipmentAction({
        claimId: selectedClaim.id,
        mode,
        trackingNumber: mode === "MANUAL" ? replacementTrackingNumber : undefined,
        carrier: mode === "MANUAL" ? replacementCarrier : "J&T Express",
        note: adminNote,
        lang: isAr ? "ar" : "en",
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      if (res.claim) {
        const mergedClaim = { ...selectedClaim, ...res.claim };
        setClaims((prev) =>
          prev.map((c) => (c.id === selectedClaim.id ? { ...c, ...res.claim } : c))
        );
        setSelectedClaim(mergedClaim);
        setReplacementTrackingNumber(mergedClaim.replacementTrackingNumber || "");
        setReplacementCarrier(mergedClaim.replacementCarrier || "J&T Express");
        setAdminNote("");
        toast.success(
          isAr
            ? `تم إنشاء شحنة البديل بنجاح (${mergedClaim.replacementTrackingNumber})`
            : `Replacement dispatched (${mergedClaim.replacementTrackingNumber})`
        );
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to dispatch replacement");
    } finally {
      setIsDispatchingReplacement(false);
    }
  };

  const handleSyncReplacementTracking = async () => {
    if (!selectedClaim) return;
    setIsSyncingReplacement(true);
    try {
      const res = await syncReplacementTrackingAction(selectedClaim.id, isAr ? "ar" : "en");
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.latestScan) {
        setReplacementLiveScan({
          ...res.latestScan,
          delivered: res.delivered,
        });
      }
      if (res.claim && res.claim.status !== selectedClaim.status) {
        const mergedClaim = { ...selectedClaim, ...res.claim };
        setClaims((prev) =>
          prev.map((c) => (c.id === selectedClaim.id ? { ...c, ...res.claim } : c))
        );
        setSelectedClaim(mergedClaim);
        toast.success(
          isAr
            ? "أكدت شركة الشحن تسليم القطعة البديلة!"
            : "J&T Express confirmed replacement delivery!"
        );
        router.refresh();
      } else {
        toast.success(isAr ? "تم تحديث تتبع الشحنة البديلة" : "Replacement tracking refreshed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sync tracking");
    } finally {
      setIsSyncingReplacement(false);
    }
  };

  const handlePrintReplacementWaybill = async (billCode: string) => {
    try {
      const res = await getJtWaybillAction(billCode);
      if (res.error || !res.data) {
        toast.error(res.error || (isAr ? "تعذر تحميل بوليصة J&T" : "Could not fetch J&T waybill"));
        return;
      }
      const payload = res.data?.data;
      const pdfUrl = typeof payload === "string" ? payload : payload?.url || payload?.pdfUrl;
      if (pdfUrl && /^https?:\/\//i.test(pdfUrl)) {
        window.open(pdfUrl, "_blank", "noopener,noreferrer");
        return;
      }
      toast.success(
        isAr
          ? `تم استلام بيانات البوليصة لرقم ${billCode}`
          : `Waybill metadata fetched for ${billCode}`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to load waybill");
    }
  };

  const handleDispatchReturnPickup = async (mode: "JT_EXPRESS" | "MANUAL") => {
    if (!selectedClaim) return;
    setIsDispatchingReturn(true);
    try {
      const res = await dispatchReturnPickupAction({
        claimId: selectedClaim.id,
        mode,
        trackingNumber: mode === "MANUAL" ? returnTrackingNumber : undefined,
        carrier: mode === "MANUAL" ? returnCarrier : "J&T Express",
        note: adminNote,
        lang: isAr ? "ar" : "en",
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.claim) {
        const mergedClaim = { ...selectedClaim, ...res.claim };
        setClaims((prev) =>
          prev.map((c) => (c.id === selectedClaim.id ? { ...c, ...res.claim } : c))
        );
        setSelectedClaim(mergedClaim);
        setReturnTrackingNumber(mergedClaim.returnTrackingNumber || "");
        setReturnCarrier(mergedClaim.returnCarrier || "J&T Express");
        setAdminNote("");
        toast.success(
          isAr
            ? `تم حجز مندوب استلام المرتجع (${mergedClaim.returnTrackingNumber})`
            : `Return pickup booked (${mergedClaim.returnTrackingNumber})`
        );
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to book return pickup");
    } finally {
      setIsDispatchingReturn(false);
    }
  };

  const handleSyncReturnTracking = async () => {
    if (!selectedClaim) return;
    setIsSyncingReturn(true);
    try {
      const res = await syncReturnTrackingAction(selectedClaim.id, isAr ? "ar" : "en");
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.latestScan) {
        setReturnLiveScan({
          ...res.latestScan,
          delivered: res.delivered,
        });
      }
      if (res.claim) {
        const mergedClaim = { ...selectedClaim, ...res.claim };
        setClaims((prev) =>
          prev.map((c) => (c.id === selectedClaim.id ? { ...c, ...res.claim } : c))
        );
        setSelectedClaim(mergedClaim);
      }
      toast.success(
        res.delivered
          ? isAr
            ? "أكدت J&T استلام الحرفي للشحنة المرتجعة!"
            : "J&T Express confirmed return parcel reached the artisan!"
          : isAr
            ? "تم تحديث تتبع شحنة الإرجاع"
            : "Return tracking refreshed"
      );
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to sync return tracking");
    } finally {
      setIsSyncingReturn(false);
    }
  };

  const handleCancelClaimShipment = async (kind: "REPLACEMENT" | "RETURN") => {
    if (!selectedClaim) return;
    setIsCancellingClaimShipment(true);
    try {
      const res = await cancelClaimJtShipmentAction({
        claimId: selectedClaim.id,
        kind,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.claim) {
        const mergedClaim = { ...selectedClaim, ...res.claim };
        setClaims((prev) =>
          prev.map((c) => (c.id === selectedClaim.id ? { ...c, ...res.claim } : c))
        );
        setSelectedClaim(mergedClaim);
        if (kind === "REPLACEMENT") {
          setReplacementTrackingNumber("");
          setReplacementLiveScan(null);
        } else {
          setReturnTrackingNumber("");
          setReturnLiveScan(null);
        }
        toast.success(
          isAr
            ? "تم إلغاء الشحنة في J&T Express"
            : `${kind === "REPLACEMENT" ? "Replacement" : "Return pickup"} shipment cancelled`
        );
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel shipment");
    } finally {
      setIsCancellingClaimShipment(false);
    }
  };

  const requestConfirmOrExecute = (action: ConfirmableAction) => {
    if (requiresAdminNoteForAction(action) && !adminNote.trim()) {
      toast.error(
        isAr
          ? "يرجى كتابة سبب الرفض للعميل في ملاحظة الإدارة قبل المتابعة."
          : "Please explain the decline reason in Admin Note before proceeding."
      );
      return;
    }
    if (action === "MARK_REFUNDED" && !financialPreview?.isAmountValid) {
      toast.error(
        isAr
          ? "يرجى إدخال مبلغ استرداد صحيح ضمن الحد المتاح للطلب."
          : "Please enter a valid refund amount within the order's remaining refundable total."
      );
      return;
    }
    setPendingConfirmAction(action);
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case "DAMAGED_IN_TRANSIT":
        return isAr ? "تلف أثناء الشحن" : "Damaged in Transit";
      case "DEFECTIVE_OR_WRONG_ITEM":
        return isAr ? "معيب أو منتج خاطئ" : "Defective or Wrong Item";
      case "NOT_AS_DESCRIBED":
        return isAr ? "مختلف عن الوصف" : "Not as Described";
      case "ORDER_NOT_RECEIVED":
        return isAr ? "لم يتم الاستلام" : "Order Not Received";
      default:
        return isAr ? "سبب آخر" : "Other";
    }
  };

  const getStatusLabel = (status: string) => getRefundStatusLabel(status, isAr);

  const isTriageStatus = (status: string) =>
    ["PENDING", "INVESTIGATING", "WAITING_CUSTOMER", "WAITING_COURIER", "RETURN_REQUESTED"].includes(
      status
    );
  const isPayoutStageStatus = (status: string) =>
    ["REFUND_APPROVED", "REFUND_PROCESSING", "APPROVED"].includes(status);
  const isReplacementWorkflowStatus = (status: string) =>
    isReplacementPreparingStatus(status) || status === "REPLACEMENT_SHIPPED";

  const renderReturnPickupCard = () => {
    if (!selectedClaim) return null;
    const isApprovedPayout = isPayoutStageStatus(selectedClaim.status);
    return (
      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-black text-indigo-950">
            <Truck className="w-4 h-4 text-indigo-700" />
            <span>
              {isAr
                ? "شحنة إرجاع J&T (استلام من العميل وتسليم للحرفي)"
                : "Reverse Return Pickup (Buyer to Artisan)"}
            </span>
          </div>
          {selectedClaim.returnReceivedAt && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-[10px] font-bold text-emerald-800">
              {isAr ? "تم استلام المرتجع" : "Return Received by Artisan"}
            </span>
          )}
        </div>

        {!selectedClaim.returnTrackingNumber ? (
          <div className="space-y-3">
            <p className="text-indigo-900/75 leading-relaxed">
              {isApprovedPayout
                ? isAr
                  ? "احجز مندوب J&T Express لاستلام القطعة من العميل وإعادتها لورشة الحرفي مجاناً (بدون تحصيل مالي - COD 0) قبل تأكيد تنفيذ التحويل المالي."
                  : "Book a J&T Express reverse pickup to collect the item from the buyer and deliver it back to the artisan workshop (COD = EGP 0) before finalizing the refund payout."
                : isAr
                  ? "احجز مندوب J&T لاستلام القطعة من المشتري وإعادتها لورشة الحرفي مجاناً (بدون تحصيل مالي - COD 0)، ثم اعتمد الاسترداد بعد الاستلام."
                  : "Book a J&T Express reverse pickup from the buyer back to the artisan workshop (COD = EGP 0), then approve the refund once received."}
            </p>

            <button
              type="button"
              disabled={isDispatchingReturn || isResolving}
              onClick={() => handleDispatchReturnPickup("JT_EXPRESS")}
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>
                {isDispatchingReturn
                  ? isAr
                    ? "جاري حجز مندوب الإرجاع J&T..."
                    : "Booking J&T Return Pickup..."
                  : isAr
                    ? "حجز مندوب J&T لاستلام المرتجع (COD 0)"
                    : "Book J&T Return Pickup (COD = EGP 0)"}
              </span>
            </button>

            <div className="pt-2 border-t border-indigo-200/70 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-indigo-900/60">
                {isAr ? "أو تسجيل رقم تتبع إرجاع يدوي" : "Or Record Manual Return Tracking"}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={returnCarrier}
                  onChange={(e) => setReturnCarrier(e.target.value)}
                  placeholder={isAr ? "شركة الشحن" : "Carrier (e.g. Aramex)"}
                  className="p-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-medium text-primary"
                />
                <input
                  type="text"
                  value={returnTrackingNumber}
                  onChange={(e) => setReturnTrackingNumber(e.target.value)}
                  placeholder={isAr ? "رقم تتبع المرتجع" : "Return Tracking #"}
                  className="p-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-primary"
                />
                <button
                  type="button"
                  disabled={
                    isDispatchingReturn ||
                    isResolving ||
                    !returnTrackingNumber.trim()
                  }
                  onClick={() => handleDispatchReturnPickup("MANUAL")}
                  className="h-10 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isAr ? "حفظ تتبع الإرجاع" : "Save Return Tracking"}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-white border border-indigo-200/80 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-primary/40 block">
                  {selectedClaim.returnCarrier || "J&T Express"} ·{" "}
                  {isAr ? "مرتجع للورشة (COD 0)" : "Return Pickup · COD EGP 0"}
                </span>
                <span className="font-mono font-black text-sm text-primary">
                  {selectedClaim.returnTrackingNumber}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/${lang}/track/${encodeURIComponent(selectedClaim.returnTrackingNumber)}`}
                  target="_blank"
                  className="px-3 py-1.5 rounded-lg bg-cream border border-primary/10 text-primary text-[11px] font-bold inline-flex items-center gap-1 hover:bg-cream/80"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{isAr ? "تتبع" : "Track"}</span>
                </Link>

                {(!selectedClaim.returnCarrier ||
                  selectedClaim.returnCarrier.toLowerCase().includes("j&t")) && (
                  <>
                    <button
                      type="button"
                      disabled={isSyncingReturn}
                      onClick={handleSyncReturnTracking}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw
                        className={cn("w-3.5 h-3.5", isSyncingReturn && "animate-spin")}
                      />
                      <span>{isAr ? "تحديث" : "Sync J&T"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handlePrintReplacementWaybill(selectedClaim.returnTrackingNumber)
                      }
                      className="px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-indigo-800 text-[11px] font-bold inline-flex items-center gap-1 hover:bg-indigo-50 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{isAr ? "البوليصة" : "Waybill"}</span>
                    </button>
                  </>
                )}

                {!selectedClaim.returnReceivedAt && (
                  <button
                    type="button"
                    disabled={isCancellingClaimShipment}
                    onClick={() => handleCancelClaimShipment("RETURN")}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold inline-flex items-center gap-1 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{isAr ? "إلغاء J&T" : "Cancel Pickup"}</span>
                  </button>
                )}
              </div>
            </div>

            {returnLiveScan && (
              <div className="p-2.5 rounded-xl bg-white/90 border border-indigo-200 text-[11px] text-indigo-950">
                <span className="font-bold">{returnLiveScan.scanType}:</span>{" "}
                <span>{returnLiveScan.desc}</span>{" "}
                {returnLiveScan.time && (
                  <span className="text-indigo-700/70">({returnLiveScan.time})</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-heading font-black text-primary flex items-center gap-2.5 sm:gap-3">
            <RotateCcw className="w-6 h-6 sm:w-8 sm:h-8 text-accent shrink-0" />
            <span>{isAr ? "طلبات الاسترجاع والنزاعات" : "Refunds & Claims Management"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-charcoal/50 mt-1">
            {isAr
              ? "مراجعة شكاوى المشترين، تقييم الأدلة والصور، والبت في طلبات الاسترداد."
              : "Review buyer claims, inspect photographic evidence, and mediate refunds."}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="px-3.5 sm:px-4 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-2xl text-xs font-bold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span>
              {claims.filter((c) => isOpenRefundClaimStatus(c.status)).length}{" "}
              {isAr ? "حالات مفتوحة" : "Open Cases"}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 sm:p-4 bg-white rounded-2xl border border-primary/5 shadow-sm flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap pb-1 w-full md:w-auto">
          {[
            "ALL",
            "PENDING",
            "INVESTIGATING",
            "WAITING_CUSTOMER",
            "WAITING_COURIER",
            "RETURN_REQUESTED",
            // Exchange / replacement filters commented out for now — refunds only
            // "REPLACEMENT_APPROVED",
            // "REPLACEMENT_SHIPPED",
            // "REPLACEMENT_DELIVERED",
            "REFUND_APPROVED",
            "REFUND_PROCESSING",
            "REFUNDED",
            "REJECTED",
          ].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={cn(
                "px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap",
                filterStatus === st
                  ? "bg-primary text-white shadow-sm"
                  : "bg-cream/40 text-charcoal/60 hover:bg-cream hover:text-primary"
              )}
            >
              {st === "ALL" ? (isAr ? "الكل" : "All Claims") : getStatusLabel(st)}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-charcoal/40 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? "بحث بالطلب، العميل..." : "Search by order, user..."}
            className="w-full h-10 ps-9 pe-4 bg-cream/30 border border-primary/10 rounded-xl text-xs font-medium focus:ring-2 focus:ring-accent/30 focus:outline-none"
          />
        </div>
      </div>

      {/* Claims List */}
      {filteredClaims.length === 0 ? (
        <div className="p-8 sm:p-16 bg-white rounded-2xl sm:rounded-[2.5rem] border border-primary/5 text-center shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
          <h3 className="text-base sm:text-lg font-bold text-primary mb-1">
            {isAr ? "لا توجد طلبات استرجاع في هذا التصنيف" : "No refund claims found"}
          </h3>
          <p className="text-xs text-charcoal/40">
            {isAr ? "جميع الأمور مستقرة ومحسومة." : "All transactions and claims are currently clear."}
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filteredClaims.map((claim) => {
            const product = claim.orderItem?.product || claim.order?.items?.[0]?.product;
            const artisan = product?.artisan;

            return (
              <div
                key={claim.id}
                className="p-4 sm:p-6 bg-white rounded-2xl sm:rounded-[2rem] border border-primary/5 shadow-sm hover:shadow-md transition-shadow flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6"
              >
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                  {product?.images?.[0] ? (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden bg-cream shrink-0 border border-primary/5">
                      <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-cream flex items-center justify-center text-primary/30 shrink-0">
                      <Package className="w-6 h-6" />
                    </div>
                  )}

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                          isTriageStatus(claim.status)
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : isReplacementPreparingStatus(claim.status)
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : isReplacementShippedStatus(claim.status)
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : isPayoutStageStatus(claim.status) ||
                                    claim.status === "REFUNDED" ||
                                    claim.status === "REPLACEMENT_DELIVERED" ||
                                    claim.status === "REPLACEMENT_ISSUED"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border-rose-200"
                        )}
                      >
                        {getStatusLabel(claim.status)}
                      </span>

                      <span className="text-[10px] font-bold text-accent bg-accent/5 px-2 py-0.5 rounded-md">
                        {getReasonLabel(claim.reason)}
                      </span>

                      <span className="text-[10px] text-charcoal/40 font-mono">
                        #{claim.id}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-primary truncate">
                      {product?.name || (isAr ? "طلب كامل" : "Full Order")}
                    </h4>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-charcoal/60">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-primary/40" />
                        {claim.user?.name || "Client"} ({claim.user?.email || claim.order?.clientEmail})
                      </span>
                      {artisan && (
                        <span>
                          • {isAr ? "الحرفي" : "Artisan"}:{" "}
                          <strong>{artisan.studioName || artisan.name}</strong>
                        </span>
                      )}
                      <span>
                        • EGP {(claim.refundAmount || claim.order?.totalAmount || 0).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-primary/80 italic line-clamp-2 bg-cream/30 p-2.5 rounded-xl border border-primary/5 mt-2">
                      &ldquo;{claim.details}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Evidence thumbnails & Action CTA */}
                <div className="flex flex-wrap lg:flex-col items-end gap-3 shrink-0 w-full lg:w-auto border-t lg:border-t-0 border-primary/5 pt-4 lg:pt-0">
                  {claim.images && claim.images.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      {claim.images.map((img: string, i: number) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPreviewImage(img)}
                          className="w-10 h-10 rounded-lg overflow-hidden border border-primary/10 hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          <img src={img} alt="Evidence" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => openClaimModal(claim)}
                    className="px-5 py-2.5 bg-primary hover:bg-brand text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    {isAr ? "مراجعة واتخاذ قرار" : "Review & Decide"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review & Resolution Modal */}
      <AnimatePresence>
        {selectedClaim && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-md overflow-y-auto p-4 sm:p-6 md:p-8 flex justify-center items-start min-h-screen"
            onClick={() => setSelectedClaim(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-[2rem] p-5 sm:p-6 md:p-8 shadow-2xl border border-primary/5 my-auto space-y-5 shrink-0 max-h-[92vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setSelectedClaim(null)}
                className="absolute top-5 end-5 sm:top-6 sm:end-6 w-9 h-9 rounded-full bg-cream hover:bg-primary/5 flex items-center justify-center text-charcoal/60 hover:text-primary transition-all cursor-pointer z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-accent">
                    {isAr ? "إدارة النزاعات والمطالبات" : "Dispute Resolution Center"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border bg-cream/60 text-primary border-primary/15">
                    {getStatusLabel(selectedClaim.status)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary/5 text-primary/70">
                    {isAr ? "تفضيل العميل" : "Requested"}:{" "}
                    {selectedClaim.preferredAction === "REPLACEMENT"
                      ? isAr
                        ? "قطعة بديلة"
                        : "Replacement"
                      : isAr
                        ? "استرداد مالي"
                        : "Refund"}
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl font-heading font-black text-primary mt-1 break-all">
                  Ticket #{selectedClaim.id}
                </h3>
              </div>

              {/* Claim & Financial Overview Box */}
              <div className="p-4 bg-cream/30 rounded-2xl border border-primary/5 space-y-3 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-charcoal/50">{isAr ? "العميل" : "Buyer"}: </span>
                    <span className="font-bold text-primary">
                      {selectedClaim.user?.name || "Client"} (
                      {selectedClaim.user?.email || selectedClaim.order?.clientEmail})
                    </span>
                  </div>
                  <div>
                    <span className="text-charcoal/50">{isAr ? "رقم الطلب" : "Order Ref"}: </span>
                    <Link
                      href={`/${lang}/admin/orders`}
                      className="font-mono font-bold text-primary hover:text-accent underline inline-flex items-center gap-1"
                    >
                      <span>#{selectedClaim.orderId}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <div>
                    <span className="text-charcoal/50">{isAr ? "السبب" : "Reason"}: </span>
                    <span className="font-bold text-accent">
                      {getReasonLabel(selectedClaim.reason)}
                    </span>
                  </div>
                  <div>
                    <span className="text-charcoal/50">{isAr ? "المبلغ المقترح" : "Claimed Amount"}: </span>
                    <span className="font-bold text-emerald-700">
                      EGP {(selectedClaim.refundAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-charcoal/50">{isAr ? "نوع المطالبة" : "Target"}: </span>
                    <span className="font-bold text-primary">
                      {selectedClaim.orderItemId
                        ? `${selectedClaim.orderItem?.product?.name || (isAr ? "قطعة محددة" : "Specific Item")} (×${selectedClaim.orderItem?.quantity || 1})`
                        : isAr
                          ? "الطلب بالكامل"
                          : "Full Order"}
                    </span>
                  </div>
                  <div>
                    <span className="text-charcoal/50">{isAr ? "الحرفي" : "Artisan"}: </span>
                    <span className="font-bold text-primary">
                      {selectedClaim.orderItem?.product?.artisan?.studioName ||
                        selectedClaim.order?.items?.[0]?.product?.artisan?.studioName ||
                        (isAr ? "متعدد / المنصة" : "Multiple / Platform")}
                    </span>
                  </div>
                </div>

                {/* Order Financial & Escrow Strip */}
                {financialPreview && (
                  <div className="pt-2.5 border-t border-primary/10 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex flex-wrap items-center gap-3 text-charcoal/70">
                      <span>
                        {isAr ? "إجمالي الطلب" : "Order Paid"}:{" "}
                        <strong className="text-primary">
                          EGP {financialPreview.orderTotal.toLocaleString()}
                        </strong>
                      </span>
                      {financialPreview.shippingCost > 0 && (
                        <span>
                          {isAr ? "الشحن" : "Shipping"}:{" "}
                          <strong>EGP {financialPreview.shippingCost.toLocaleString()}</strong>
                        </span>
                      )}
                      {financialPreview.discountApplied > 0 && (
                        <span>
                          {isAr ? "الخصم" : "Discount"}:{" "}
                          <strong>-EGP {financialPreview.discountApplied.toLocaleString()}</strong>
                        </span>
                      )}
                    </div>

                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                        financialPreview.hasPendingSale
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : financialPreview.hasClearedSale
                            ? "bg-rose-50 text-rose-800 border-rose-200"
                            : "bg-slate-50 text-slate-600 border-slate-200"
                      )}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      {financialPreview.hasPendingSale
                        ? isAr
                          ? "الرصيد محجوز بالضمان (Escrow)"
                          : "In Escrow (Pending)"
                        : financialPreview.hasClearedSale
                          ? isAr
                            ? "تم تحرير الرصيد (خصم من القابل للسحب)"
                            : "Already Cleared (Debits Withdrawable)"
                          : isAr
                            ? "لا توجد حركة بيع نشطة"
                            : "No Active Sale Ledger"}
                    </span>
                  </div>
                )}

                <div className="p-2.5 bg-blue-50/70 border border-blue-200/60 rounded-xl text-[11px] text-blue-900 leading-relaxed font-medium flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    {isAr
                      ? "الموافقة تعتمد مبلغ الاسترداد فقط. نفّذ التحويل عبر مزود الدفع أو يدوياً، ثم سجّل المرجع وأكّد التنفيذ لتحديث الطلب والمخزون ورصيد الحرفي."
                      : "Approval records the decision only. Execute the payout externally (Paymob, bank, or wallet), record the method and reference, then confirm to finalize the order, stock, and artisan ledger."}
                  </span>
                </div>
              </div>

              {/* Customer Explanation */}
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-primary/60 mb-1.5">
                  {isAr ? "بيان المشكلة من العميل" : "Customer Description"}
                </p>
                <div className="p-4 bg-cream/20 rounded-2xl text-xs md:text-sm text-primary/90 leading-relaxed font-medium">
                  {selectedClaim.details}
                </div>
              </div>

              {/* Attached Evidence Photos */}
              {selectedClaim.images && selectedClaim.images.length > 0 && (
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-primary/60 mb-2">
                    {isAr ? "أدلة الصور المرفقة" : "Photo Evidence"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedClaim.images.map((img: string, i: number) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPreviewImage(img)}
                        className="relative w-20 h-20 rounded-xl overflow-hidden border border-primary/10 hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <img src={img} alt="Evidence" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Case History Timeline */}
              {selectedClaim.events?.length > 0 && (
                <div className="p-3.5 bg-cream/30 rounded-xl border border-primary/5">
                  <p className="text-[10px] font-black uppercase tracking-wider text-primary/50 mb-2">
                    {isAr ? "سجل الحالة" : "Case History"}
                  </p>
                  <ol className="space-y-2 border-s-2 border-primary/10 ps-3 max-h-40 overflow-y-auto">
                    {selectedClaim.events.map((event: any) => (
                      <li key={event.id} className="text-[11px] text-primary/75">
                        <span className="font-bold">{getStatusLabel(event.toStatus)}</span>
                        <span className="ms-2 text-primary/40">
                          {new Date(event.createdAt).toLocaleString(isAr ? "ar-EG" : "en-US")}
                        </span>
                        {event.note && <p className="mt-0.5 text-primary/70">{event.note}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Terminal Read-Only Summary */}
              {!isTriageStatus(selectedClaim.status) &&
                !isPayoutStageStatus(selectedClaim.status) &&
                !isReplacementWorkflowStatus(selectedClaim.status) && (
                <div className="p-4 rounded-2xl bg-cream/40 border border-primary/10 space-y-2 text-xs">
                  <p className="text-[11px] font-black uppercase tracking-wider text-primary/60">
                    {isAr ? "ملخص القرار النهائي" : "Final Resolution Summary"}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-charcoal/50">{isAr ? "الحالة" : "Outcome"}: </span>
                      <strong className="text-primary">{getStatusLabel(selectedClaim.status)}</strong>
                    </div>
                    {selectedClaim.refundAmount !== null && selectedClaim.refundAmount !== undefined && (
                      <div>
                        <span className="text-charcoal/50">{isAr ? "المبلغ" : "Amount"}: </span>
                        <strong className="text-emerald-700">
                          EGP {Number(selectedClaim.refundAmount).toLocaleString()}
                        </strong>
                      </div>
                    )}
                    {selectedClaim.refundMethod && (
                      <div>
                        <span className="text-charcoal/50">{isAr ? "الوسيلة" : "Method"}: </span>
                        <strong className="text-primary">{selectedClaim.refundMethod}</strong>
                      </div>
                    )}
                    {selectedClaim.refundReference && (
                      <div>
                        <span className="text-charcoal/50">{isAr ? "المرجع" : "Reference"}: </span>
                        <strong className="font-mono text-primary">{selectedClaim.refundReference}</strong>
                      </div>
                    )}
                    {selectedClaim.refundProcessedAt && (
                      <div className="sm:col-span-2">
                        <span className="text-charcoal/50">{isAr ? "تاريخ التنفيذ" : "Processed At"}: </span>
                        <strong className="text-primary">
                          {new Date(selectedClaim.refundProcessedAt).toLocaleString(
                            isAr ? "ar-EG" : "en-US"
                          )}
                        </strong>
                      </div>
                    )}
                  </div>
                  {(selectedClaim.status === "REPLACEMENT_DELIVERED" ||
                    selectedClaim.status === "REPLACEMENT_ISSUED") && (
                    <div className="pt-1 border-t border-primary/5 space-y-1 text-primary/70">
                      {selectedClaim.costBearer && (
                        <p>
                          <span className="font-bold">
                            {isAr ? "تحمل التكلفة:" : "Cost Bearer:"}
                          </span>{" "}
                          {selectedClaim.costBearer === "PLATFORM"
                            ? isAr
                              ? "المنصة"
                              : "Platform"
                            : isAr
                              ? "الحرفي"
                              : "Artisan"}
                          {selectedClaim.replacementStockDeducted
                            ? isAr
                              ? " · تم خصم قطعة من المخزون"
                              : " · Stock deducted"
                            : ""}
                        </p>
                      )}
                      {selectedClaim.replacementTrackingNumber && (
                        <p className="flex flex-wrap items-center gap-2">
                          <span>
                            <span className="font-bold">
                              {isAr ? "تتبع البديل:" : "Replacement Tracking:"}
                            </span>{" "}
                            <span className="font-mono font-bold text-primary">
                              {selectedClaim.replacementTrackingNumber}
                            </span>{" "}
                            ({selectedClaim.replacementCarrier || "J&T Express"})
                          </span>
                          <Link
                            href={`/${lang}/track/${encodeURIComponent(selectedClaim.replacementTrackingNumber)}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-accent font-bold hover:underline"
                          >
                            <span>{isAr ? "تتبع" : "Track"}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </p>
                      )}
                      {selectedClaim.replacementDeliveredAt && (
                        <p>
                          <span className="font-bold">
                            {isAr ? "تاريخ تسليم البديل:" : "Replacement Delivered:"}
                          </span>{" "}
                          {new Date(selectedClaim.replacementDeliveredAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                  {selectedClaim.returnTrackingNumber && (
                    <div className="pt-1 border-t border-primary/5 space-y-1 text-primary/70">
                      <p className="flex flex-wrap items-center gap-2">
                        <span>
                          <span className="font-bold">
                            {isAr ? "تتبع المرتجع (من العميل للحرفي):" : "Return Pickup Tracking:"}
                          </span>{" "}
                          <span className="font-mono font-bold text-primary">
                            {selectedClaim.returnTrackingNumber}
                          </span>{" "}
                          ({selectedClaim.returnCarrier || "J&T Express"})
                        </span>
                        <Link
                          href={`/${lang}/track/${encodeURIComponent(selectedClaim.returnTrackingNumber)}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-accent font-bold hover:underline"
                        >
                          <span>{isAr ? "تتبع" : "Track"}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </p>
                      {selectedClaim.returnReceivedAt && (
                        <p className="text-emerald-700 font-semibold">
                          {isAr ? "وصلت الشحنة المرتجعة للورشة:" : "Return Delivered to Artisan:"}{" "}
                          {new Date(selectedClaim.returnReceivedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                  {selectedClaim.adminNote && (
                    <p className="text-primary/80 pt-1 border-t border-primary/5">
                      {selectedClaim.adminNote}
                    </p>
                  )}
                </div>
              )}

              {/* Active Workflow Controls (Triage, Payout Execution, or Replacement Fulfillment) */}
              {(isTriageStatus(selectedClaim.status) ||
                isPayoutStageStatus(selectedClaim.status) ||
                isReplacementWorkflowStatus(selectedClaim.status)) && (
                <>
                  {/* Admin Note */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="block text-[11px] font-black uppercase tracking-wider text-primary/60">
                        {isAr ? "ملاحظة الإدارة ورسالة القرار للعميل" : "Admin Note & Email Explanation"}
                      </label>
                      <span className="text-[10px] font-medium text-charcoal/50">
                        {isAr
                          ? "إلزامي عند الرفض أو طلب معلومات/إرجاع"
                          : "Required for Decline, Wait for Customer, or Return"}
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder={
                        isAr
                          ? "اكتب سبب القرار أو تعليمات الإرجاع أو المعلومات المطلوبة من العميل..."
                          : "Explain decision reason, return instructions, or what info is needed from the customer..."
                      }
                      className="w-full p-3.5 bg-cream/30 border border-primary/10 rounded-xl text-xs md:text-sm font-medium text-primary focus:ring-2 focus:ring-accent/30 focus:outline-none placeholder:text-primary/30"
                    />
                  </div>

                  {/* Stage 1: Triage */}
                  {isTriageStatus(selectedClaim.status) && (
                    <div className="space-y-4 pt-3 border-t border-primary/5">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-primary/50 mb-2">
                          {isAr ? "1. متابعة وتحديث حالة الفحص" : "1. Case Investigation & Follow-Up"}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <button
                            type="button"
                            disabled={isResolving}
                            onClick={() => executeResolve("INVESTIGATING")}
                            className="h-10 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-xl text-[11px] disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            {isAr ? "بدء التحقيق" : "Investigating"}
                          </button>
                          <button
                            type="button"
                            disabled={isResolving}
                            onClick={() => executeResolve("WAITING_CUSTOMER")}
                            className="h-10 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-xl text-[11px] disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            {isAr ? "طلب رد العميل" : "Wait Customer"}
                          </button>
                          <button
                            type="button"
                            disabled={isResolving}
                            onClick={() => executeResolve("WAITING_COURIER")}
                            className="h-10 px-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold rounded-xl text-[11px] disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            {isAr ? "متابعة الشحن" : "Wait Courier"}
                          </button>
                          <button
                            type="button"
                            disabled={isResolving}
                            onClick={() => executeResolve("RETURN_REQUESTED")}
                            className="h-10 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold rounded-xl text-[11px] disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            {isAr ? "طلب إرجاع" : "Request Return"}
                          </button>
                        </div>
                      </div>

                      {/* Reverse Return Pickup Panel (Buyer -> Artisan) */}
                      {(selectedClaim.status === "RETURN_REQUESTED" ||
                        Boolean(selectedClaim.returnTrackingNumber)) &&
                        renderReturnPickupCard()}

                      <div className="p-4 rounded-2xl bg-cream/25 border border-primary/10 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                          <label className="text-[11px] font-bold text-primary/70 flex-1">
                            {isAr ? "مبلغ الاسترداد المعتمد (ج.م)" : "Refund Amount to Approve (EGP)"}
                            <div className="mt-1 flex items-center gap-2">
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                max={financialPreview?.maxRefundable || undefined}
                                value={editableRefundAmount}
                                onChange={(e) => setEditableRefundAmount(e.target.value)}
                                className="w-full p-2.5 bg-white border border-primary/10 rounded-xl text-xs font-bold text-primary"
                              />
                              {financialPreview && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditableRefundAmount(String(financialPreview.maxRefundable))
                                  }
                                  className="px-2.5 py-2 rounded-xl bg-white border border-primary/10 text-[10px] font-bold text-primary/70 hover:text-primary shrink-0 cursor-pointer"
                                >
                                  {isAr ? "الحد الأقصى" : "Max"}:{" "}
                                  {financialPreview.maxRefundable.toLocaleString()}
                                </button>
                              )}
                            </div>
                          </label>
                        </div>

                        <p className="text-[10px] font-black uppercase tracking-wider text-primary/50">
                          {isAr ? "2. القرار الأساسي للمطالبة" : "2. Resolution Decision"}
                        </p>

                        {/* Exchange / replacement workflow commented out for now — refunds only
                        <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/70 space-y-2.5 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-primary/80 flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-blue-600" />
                              {isAr ? "إعدادات الاستبدال (عند اختيار بديل)" : "Replacement Settings (if issuing replacement)"}
                            </span>
                            <div className="inline-flex rounded-lg bg-white border border-primary/10 p-0.5 text-[10px] font-bold">
                              <button
                                type="button"
                                onClick={() => setCostBearer("ARTISAN")}
                                className={cn(
                                  "px-2.5 py-1 rounded-md transition-colors cursor-pointer",
                                  costBearer === "ARTISAN"
                                    ? "bg-primary text-white"
                                    : "text-primary/60 hover:text-primary"
                                )}
                              >
                                {isAr ? "مسؤولية الحرفي" : "Artisan Cost"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setCostBearer("PLATFORM")}
                                className={cn(
                                  "px-2.5 py-1 rounded-md transition-colors cursor-pointer",
                                  costBearer === "PLATFORM"
                                    ? "bg-blue-600 text-white"
                                    : "text-primary/60 hover:text-primary"
                                )}
                              >
                                {isAr ? "تحمّل المنصة" : "Platform Cost"}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <label className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-primary/10 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={deductReplacementStock}
                                onChange={(e) => setDeductReplacementStock(e.target.checked)}
                                className="mt-0.5 accent-primary"
                              />
                              <span className="text-[11px] leading-snug text-primary/80">
                                <span className="font-bold block">
                                  {isAr ? "خصم قطعة بديلة من المخزون" : "Deduct Replacement Stock"}
                                </span>
                                <span className="text-primary/50 text-[10px]">
                                  {financialPreview?.isPersonalized
                                    ? isAr
                                      ? "القطعة مخصصة: يفضل عدم الخصم التلقائي"
                                      : "Custom item: keep unchecked to craft fresh"
                                    : isAr
                                      ? "يخصم المخزون عند الموافقة ويرده عند الإلغاء"
                                      : "Reserve stock now (restored if reverted)"}
                                </span>
                              </span>
                            </label>

                            {costBearer === "ARTISAN" && (
                              <label className="p-2.5 rounded-xl bg-white border border-primary/10 text-[11px]">
                                <span className="font-bold text-primary/80 block mb-1">
                                  {isAr
                                    ? "رسوم شحن بديل على الحرفي (ج.م)"
                                    : "Optional Artisan Shipping Debit (EGP)"}
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={replacementShippingFee}
                                  onChange={(e) => setReplacementShippingFee(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-cream/30 border border-primary/10 rounded-lg text-xs font-bold text-primary"
                                />
                              </label>
                            )}
                          </div>
                        </div>
                        */}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            disabled={isResolving || !financialPreview?.isAmountValid}
                            onClick={() => executeResolve("APPROVE")}
                            className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{isAr ? "اعتماد الاسترداد" : "Approve Refund"}</span>
                          </button>

                          {/* Exchange / replacement decision button commented out for now
                          <button
                            type="button"
                            disabled={isResolving}
                            onClick={() => requestConfirmOrExecute("REPLACEMENT")}
                            className="h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Truck className="w-4 h-4" />
                            <span>{isAr ? "اعتماد الاستبدال" : "Approve Replacement"}</span>
                          </button>
                          */}

                          <button
                            type="button"
                            disabled={isResolving}
                            onClick={() => requestConfirmOrExecute("REJECT")}
                            className="h-11 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                            <span>{isAr ? "رفض الطلب" : "Decline Claim"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stage 2: Approved / Processing -> Return Pickup + External Payout Execution */}
                  {isPayoutStageStatus(selectedClaim.status) && (
                    <div className="space-y-4 pt-3 border-t border-primary/5">
                      {renderReturnPickupCard()}

                      <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-200/70 space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-emerald-700" />
                            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900">
                              {isAr ? "تنفيذ وتسجيل التحويل المالي" : "External Refund Execution"}
                            </h4>
                          </div>
                        </div>

                        {/* Quick-fill Refund Method Presets */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-primary/60 block">
                            {isAr ? "اختيار سريع لوسيلة التحويل" : "Quick Method Presets"}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {REFUND_METHOD_PRESETS.map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setRefundMethod(preset)}
                                className={cn(
                                  "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer",
                                  refundMethod === preset
                                    ? "bg-primary text-white border-primary"
                                    : "bg-white text-primary/70 border-primary/10 hover:border-primary/30"
                                )}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <label className="text-[11px] font-bold text-primary/70">
                            {isAr ? "وسيلة الاسترداد *" : "Refund Method *"}
                            <input
                              value={refundMethod}
                              onChange={(e) => setRefundMethod(e.target.value)}
                              placeholder={isAr ? "مثال: Paymob / InstaPay" : "e.g. Paymob Card"}
                              className="mt-1 w-full p-2.5 bg-white border border-primary/10 rounded-xl text-xs"
                            />
                          </label>
                          <label className="text-[11px] font-bold text-primary/70">
                            {isAr ? "رقم مرجع التحويل *" : "Refund Reference *"}
                            <input
                              value={refundReference}
                              onChange={(e) => setRefundReference(e.target.value)}
                              placeholder={isAr ? "رقم العملية" : "Provider Tx ID"}
                              className="mt-1 w-full p-2.5 bg-white border border-primary/10 rounded-xl text-xs font-mono"
                            />
                          </label>
                          <label className="text-[11px] font-bold text-primary/70">
                            {isAr ? "المبلغ (ج.م) *" : "Refund Amount (EGP) *"}
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              max={financialPreview?.maxRefundable || undefined}
                              value={editableRefundAmount}
                              onChange={(e) => setEditableRefundAmount(e.target.value)}
                              className="mt-1 w-full p-2.5 bg-white border border-primary/10 rounded-xl text-xs font-bold"
                            />
                          </label>
                        </div>

                        {/* Cost Bearer & Restock Controls */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <div className="p-3 bg-white rounded-xl border border-primary/10 space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-primary/60 block">
                              {isAr ? "المتحمل لتكلفة الاسترداد" : "Cost Bearer"}
                            </span>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => setCostBearer("ARTISAN")}
                                className={cn(
                                  "py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer",
                                  costBearer === "ARTISAN"
                                    ? "bg-primary text-white border-primary"
                                    : "bg-cream/30 text-primary/70 border-primary/10"
                                )}
                              >
                                {isAr ? "رصيد الحرفي" : "Artisan Ledger"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setCostBearer("PLATFORM")}
                                className={cn(
                                  "py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer",
                                  costBearer === "PLATFORM"
                                    ? "bg-primary text-white border-primary"
                                    : "bg-cream/30 text-primary/70 border-primary/10"
                                )}
                              >
                                {isAr ? "المنصة تتحملها" : "Platform Absorbs"}
                              </button>
                            </div>
                          </div>

                          <label className="p-3 bg-white rounded-xl border border-primary/10 flex items-start gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={restockItems}
                              onChange={(e) => setRestockItems(e.target.checked)}
                              className="mt-0.5 rounded border-primary/30 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-bold text-primary block">
                                {isAr ? "إعادة المنتج للمخزون" : "Restock returned item(s)"}
                              </span>
                              <span className="text-[10px] text-charcoal/55 leading-snug block">
                                {financialPreview?.isPersonalized
                                  ? isAr
                                    ? "مغلق افتراضياً لأن القطعة مخصصة بالطلب."
                                    : "Unchecked by default for custom/personalized items."
                                  : ["DAMAGED_IN_TRANSIT", "DEFECTIVE_OR_WRONG_ITEM"].includes(
                                        selectedClaim.reason
                                      )
                                    ? isAr
                                      ? "مغلق افتراضياً لأن السبب تلف أو عيب."
                                      : "Unchecked by default for damaged/defective claims."
                                    : isAr
                                      ? "فعّل هذا الخيار فقط إذا عادت القطعة صالحة للبيع."
                                      : "Enable only if the item returned in resellable condition."}
                              </span>
                            </div>
                          </label>
                        </div>

                        {/* Live Financial Impact Preview */}
                        {financialPreview && (
                          <div className="p-3 rounded-xl bg-white border border-emerald-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                            <div>
                              <span className="text-charcoal/50 block">
                                {isAr ? "يُرد للعميل" : "Refund to Buyer"}
                              </span>
                              <strong className="text-emerald-700 text-xs">
                                EGP {financialPreview.effectiveAmount.toLocaleString()}
                              </strong>
                            </div>
                            <div>
                              <span className="text-charcoal/50 block">
                                {isAr ? "خصم من الحرفي" : "Artisan Debit"}
                              </span>
                              <strong
                                className={cn(
                                  "text-xs",
                                  costBearer === "PLATFORM" ? "text-slate-600" : "text-rose-700"
                                )}
                              >
                                {costBearer === "PLATFORM"
                                  ? isAr
                                    ? "0 ج.م (تتحمله المنصة)"
                                    : "EGP 0 (Platform absorbs)"
                                  : `EGP ${financialPreview.estimatedArtisanDebit.toLocaleString()}`}
                              </strong>
                            </div>
                            <div>
                              <span className="text-charcoal/50 block">
                                {isAr ? "تأثير المخزون" : "Inventory Impact"}
                              </span>
                              <strong className="text-primary text-xs">
                                {restockItems
                                  ? isAr
                                    ? `إرجاع (+${financialPreview.restockQty})`
                                    : `Restock (+${financialPreview.restockQty})`
                                  : isAr
                                    ? "بدون إعادة للمخزون"
                                    : "No restock (Write-off)"}
                              </strong>
                            </div>
                          </div>
                        )}
                      </div>

                      {selectedClaim.returnTrackingNumber && !selectedClaim.returnReceivedAt && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            {isAr
                              ? `شحنة المرتجع (${selectedClaim.returnTrackingNumber}) لا تزال في الطريق إلى ورشة الحرفي. يُنصح بالانتظار حتى تأكيد الاستلام قبل إغلاق التحويل النهائي.`
                              : `Return parcel (${selectedClaim.returnTrackingNumber}) is still in transit back to the artisan workshop. You can sync tracking above or proceed when received.`}
                          </span>
                        </div>
                      )}

                      {/* Execution Buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {["REFUND_APPROVED", "APPROVED"].includes(selectedClaim.status) && (
                          <>
                            <button
                              type="button"
                              disabled={
                                isResolving ||
                                !refundMethod.trim() ||
                                !refundReference.trim() ||
                                !financialPreview?.isAmountValid
                              }
                              onClick={() => executeResolve("START_REFUND")}
                              className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer sm:col-span-2 flex items-center justify-center gap-2"
                            >
                              <CreditCard className="w-4 h-4" />
                              <span>
                                {isAr ? "تسجيل بدء التحويل" : "Record Refund Processing"}
                              </span>
                            </button>
                            <button
                              type="button"
                              disabled={isResolving}
                              onClick={() => executeResolve("INVESTIGATING")}
                              className="h-10 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer"
                            >
                              {isAr ? "إعادة للتحقيق" : "Return to Investigation"}
                            </button>
                            <button
                              type="button"
                              disabled={isResolving}
                              onClick={() => requestConfirmOrExecute("REJECT")}
                              className="h-10 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer"
                            >
                              {isAr ? "رفض الطلب" : "Decline Claim"}
                            </button>
                          </>
                        )}

                        {["REFUND_PROCESSING", "APPROVED"].includes(selectedClaim.status) && (
                          <button
                            type="button"
                            disabled={
                              isResolving ||
                              !refundMethod.trim() ||
                              !refundReference.trim() ||
                              !financialPreview?.isAmountValid
                            }
                            onClick={() => requestConfirmOrExecute("MARK_REFUNDED")}
                            className="h-12 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer sm:col-span-2 flex items-center justify-center gap-2 shadow-md"
                          >
                            <Check className="w-4 h-4" />
                            <span>
                              {isAr ? "تأكيد تنفيذ الاسترداد" : "Confirm Refund Processed"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stage 2 (Replacement Preparing): Dispatch via J&T COD=0 or Manual, or Fallback */}
                  {isReplacementPreparingStatus(selectedClaim.status) && (
                    <div className="space-y-4 pt-3 border-t border-primary/5">
                      <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-3 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-black text-sky-900">
                            <Package className="w-4 h-4 text-sky-700" />
                            <span>
                              {isAr
                                ? "المرحلة الثانية: تجهيز وشحن القطعة البديلة"
                                : "Stage 2: Replacement Preparation & Dispatch"}
                            </span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-white border border-sky-200 text-[10px] font-bold text-sky-800">
                            {selectedClaim.costBearer === "PLATFORM"
                              ? isAr
                                ? "التكلفة: المنصة"
                                : "Bearer: Platform"
                              : isAr
                                ? "التكلفة: الحرفي"
                                : "Bearer: Artisan"}
                            {selectedClaim.replacementStockDeducted
                              ? isAr
                                ? " · مخزون محجوز"
                                : " · Stock reserved"
                              : ""}
                          </span>
                        </div>

                        <p className="text-sky-900/75 leading-relaxed">
                          {isAr
                            ? "الحرفي يتجهز لإرسال القطعة البديلة (بضمان معلق لحين التسليم). يمكنك حجز بوليصة J&T Express مجاناً (دفع عند الاستلام 0 ج.م) أو تسجيل رقم تتبع خارجي."
                            : "The artisan has been notified to prepare the replacement while escrow stays held. Book a free J&T Express pickup (COD = EGP 0) or record a manual courier tracking number."}
                        </p>

                        <button
                          type="button"
                          disabled={isDispatchingReplacement || isResolving}
                          onClick={() => handleDispatchReplacement("JT_EXPRESS")}
                          className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                          <Truck className="w-4 h-4" />
                          <span>
                            {isDispatchingReplacement
                              ? isAr
                                ? "جاري حجز بوليصة J&T..."
                                : "Booking J&T Replacement..."
                              : isAr
                                ? "إنشاء شحنة J&T للبديل (بدون تحصيل مالي - COD 0)"
                                : "Book J&T Replacement Shipment (COD = EGP 0)"}
                          </span>
                        </button>

                        <div className="pt-2 border-t border-sky-200/70 space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-wider text-sky-900/60">
                            {isAr ? "أو تسجيل شحنة يدوية" : "Or Record Manual Courier Dispatch"}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={replacementCarrier}
                              onChange={(e) => setReplacementCarrier(e.target.value)}
                              placeholder={isAr ? "شركة الشحن" : "Carrier (e.g. Aramex)"}
                              className="p-2.5 bg-white border border-sky-200 rounded-xl text-xs font-medium text-primary"
                            />
                            <input
                              type="text"
                              value={replacementTrackingNumber}
                              onChange={(e) => setReplacementTrackingNumber(e.target.value)}
                              placeholder={isAr ? "رقم التتبع" : "Tracking Number"}
                              className="p-2.5 bg-white border border-sky-200 rounded-xl text-xs font-mono font-bold text-primary"
                            />
                            <button
                              type="button"
                              disabled={
                                isDispatchingReplacement ||
                                isResolving ||
                                !replacementTrackingNumber.trim()
                              }
                              onClick={() => handleDispatchReplacement("MANUAL")}
                              className="h-10 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isAr ? "حفظ وإرسال الشحن" : "Mark Dispatched"}</span>
                            </button>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-sky-200/70 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-sky-900/60">
                            {isAr
                              ? "بدائل في حال تعذر توفير القطعة:"
                              : "Fallback if replacement cannot be fulfilled:"}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={isResolving || !financialPreview?.isAmountValid}
                              onClick={() => executeResolve("APPROVE")}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold disabled:opacity-50 cursor-pointer"
                            >
                              {isAr ? "تحويل لاسترداد مالي" : "Switch to Refund"}
                            </button>
                            <button
                              type="button"
                              disabled={isResolving}
                              onClick={() => executeResolve("INVESTIGATING")}
                              className="px-3 py-1.5 rounded-lg bg-white border border-primary/15 text-primary/70 hover:text-primary text-[11px] font-bold disabled:opacity-50 cursor-pointer"
                            >
                              {isAr ? "إرجاع للتحقيق" : "Back to Review"}
                            </button>
                            <button
                              type="button"
                              disabled={isResolving}
                              onClick={() => requestConfirmOrExecute("REJECT")}
                              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold disabled:opacity-50 cursor-pointer"
                            >
                              {isAr ? "رفض المطالبة" : "Decline"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stage 3 (Replacement Shipped): Live J&T Tracking, Waybill, & Confirm Delivery */}
                  {selectedClaim.status === "REPLACEMENT_SHIPPED" && (
                    <div className="space-y-4 pt-3 border-t border-primary/5">
                      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-black text-blue-900">
                            <Truck className="w-4 h-4 text-blue-700" />
                            <span>
                              {isAr
                                ? "المرحلة الثالثة: الشحنة البديلة في الطريق"
                                : "Stage 3: Replacement In Transit"}
                            </span>
                          </div>
                          {selectedClaim.replacementShippedAt && (
                            <span className="text-[10px] font-bold text-blue-800/70">
                              {isAr ? "شُحنت:" : "Shipped:"}{" "}
                              {new Date(selectedClaim.replacementShippedAt).toLocaleString()}
                            </span>
                          )}
                        </div>

                        {selectedClaim.replacementTrackingNumber && (
                          <div className="p-3 rounded-xl bg-white border border-blue-200/80 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-primary/40 block">
                                {selectedClaim.replacementCarrier || "J&T Express"} ·{" "}
                                {isAr ? "دفع عند الاستلام 0 ج.م" : "COD EGP 0"}
                              </span>
                              <span className="font-mono font-black text-sm text-primary">
                                {selectedClaim.replacementTrackingNumber}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/${lang}/track/${encodeURIComponent(selectedClaim.replacementTrackingNumber)}`}
                                target="_blank"
                                className="px-3 py-1.5 rounded-lg bg-cream border border-primary/10 text-primary text-[11px] font-bold inline-flex items-center gap-1 hover:bg-cream/80"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>{isAr ? "صفحة التتبع" : "Track Page"}</span>
                              </Link>

                              {(!selectedClaim.replacementCarrier ||
                                selectedClaim.replacementCarrier.toLowerCase().includes("j&t")) && (
                                <>
                                  <button
                                    type="button"
                                    disabled={isSyncingReplacement}
                                    onClick={handleSyncReplacementTracking}
                                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold inline-flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                  >
                                    <RefreshCw
                                      className={cn("w-3.5 h-3.5", isSyncingReplacement && "animate-spin")}
                                    />
                                    <span>{isAr ? "تحديث التتبع" : "Sync J&T"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handlePrintReplacementWaybill(selectedClaim.replacementTrackingNumber)
                                    }
                                    className="px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-800 text-[11px] font-bold inline-flex items-center gap-1 hover:bg-blue-50 cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>{isAr ? "البوليصة" : "Waybill"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isCancellingClaimShipment}
                                    onClick={() => handleCancelClaimShipment("REPLACEMENT")}
                                    className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold inline-flex items-center gap-1 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>{isAr ? "إلغاء J&T" : "Cancel J&T"}</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {replacementLiveScan && (
                          <div className="p-2.5 rounded-xl bg-white/90 border border-blue-200 text-[11px] text-blue-950">
                            <span className="font-bold">{replacementLiveScan.scanType}:</span>{" "}
                            <span>{replacementLiveScan.desc}</span>{" "}
                            {replacementLiveScan.time && (
                              <span className="text-blue-700/70">({replacementLiveScan.time})</span>
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={isResolving}
                          onClick={() => requestConfirmOrExecute("MARK_REPLACEMENT_DELIVERED")}
                          className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {isAr
                              ? "تأكيد تسليم القطعة البديلة وإغلاق النزاع"
                              : "Confirm Replacement Delivered & Close Claim"}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline Confirmation Banner for Irreversible Terminal Actions */}
                  {pendingConfirmAction && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                        <div className="space-y-1 text-xs text-amber-950">
                          <p className="font-black">
                            {pendingConfirmAction === "MARK_REFUNDED"
                              ? isAr
                                ? "تأكيد إغلاق المطالبة وتنفيذ قيود الاسترداد"
                                : "Confirm Final Refund & Ledger Settlement"
                              : pendingConfirmAction === "REPLACEMENT"
                                ? isAr
                                  ? "تأكيد اعتماد إرسال قطعة بديلة"
                                  : "Confirm Approving Replacement"
                                : pendingConfirmAction === "MARK_REPLACEMENT_DELIVERED"
                                  ? isAr
                                    ? "تأكيد استلام العميل للقطعة البديلة"
                                    : "Confirm Replacement Delivered"
                                  : isAr
                                    ? "تأكيد رفض المطالبة وإخطار العميل"
                                    : "Confirm Declining Claim"}
                          </p>
                          <p className="text-amber-900/80 leading-relaxed">
                            {pendingConfirmAction === "MARK_REFUNDED" && financialPreview
                              ? isAr
                                ? `سيتم تأكيد رد EGP ${financialPreview.effectiveAmount.toLocaleString()} عبر ${refundMethod || selectedClaim.refundMethod} (مرجع: ${refundReference || selectedClaim.refundReference})، ${
                                    costBearer === "PLATFORM"
                                      ? "مع تحمل المنصة للتكلفة دون خصم من الحرفي"
                                      : `وخصم EGP ${financialPreview.estimatedArtisanDebit.toLocaleString()} من رصيد الحرفي`
                                  }، ${restockItems ? "وإعادة الكمية للمخزون" : "دون إعادة للمخزون"}.`
                                : `This will finalize EGP ${financialPreview.effectiveAmount.toLocaleString()} via ${refundMethod || selectedClaim.refundMethod} (Ref: ${refundReference || selectedClaim.refundReference}), ${
                                    costBearer === "PLATFORM"
                                      ? "absorb the cost on the platform (no artisan debit)"
                                      : `debit EGP ${financialPreview.estimatedArtisanDebit.toLocaleString()} from the artisan ledger`
                                  }, and ${restockItems ? "restock returned inventory" : "leave stock unchanged"}.`
                              : pendingConfirmAction === "REPLACEMENT"
                                ? isAr
                                  ? `سيتم فتح مرحلة تجهيز البديل (${costBearer === "PLATFORM" ? "على حساب المنصة" : "على مسؤولية الحرفي"}) مع إبقاء مستحقات البيع معلقة وإخطار المشتري والحرفي${deductReplacementStock ? "، وحجز قطعة من المخزون" : ""}.`
                                  : `This opens replacement preparation (${costBearer === "PLATFORM" ? "platform cost" : "artisan responsibility"}), keeps order escrow held until delivery, emails both buyer and artisan${deductReplacementStock ? ", and deducts 1 replacement unit from inventory" : ""}.`
                                : pendingConfirmAction === "MARK_REPLACEMENT_DELIVERED"
                                  ? isAr
                                    ? "سيتم إغلاق المطالبة نهائياً بحالة تم تسليم البديل ورفع تعليق الضمان عن الطلب."
                                    : "This marks the replacement delivered, lifts the claim escrow hold, and notifies the buyer."
                                  : isAr
                                    ? "سيتم رفض المطالبة وإرسال السبب الموضح في ملاحظة الإدارة للعميل."
                                    : "This will decline the claim and email your explanation to the buyer."}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={isResolving}
                          onClick={() => setPendingConfirmAction(null)}
                          className="px-4 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100/60 cursor-pointer"
                        >
                          {isAr ? "تراجع" : "Cancel"}
                        </button>
                        <button
                          type="button"
                          disabled={isResolving}
                          onClick={() => executeResolve(pendingConfirmAction)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer disabled:opacity-50",
                            pendingConfirmAction === "REJECT"
                              ? "bg-rose-600 hover:bg-rose-700"
                              : pendingConfirmAction === "REPLACEMENT"
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "bg-emerald-700 hover:bg-emerald-800"
                          )}
                        >
                          {isResolving
                            ? isAr
                              ? "جاري التنفيذ..."
                              : "Processing..."
                            : isAr
                              ? "نعم، تأكيد"
                              : "Yes, Confirm"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox Image Preview */}
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
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 end-4 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={previewImage}
                alt="Evidence Full"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
