export const RETURN_WINDOW_DAYS = 14;
export const RETURN_WINDOW_MS = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
export const NON_DELIVERY_WAIT_DAYS = 5;
export const NON_DELIVERY_WAIT_MS = NON_DELIVERY_WAIT_DAYS * 24 * 60 * 60 * 1000;

export const OPEN_REFUND_CLAIM_STATUSES = [
  "PENDING",
  "INVESTIGATING",
  "WAITING_CUSTOMER",
  "WAITING_COURIER",
  "RETURN_REQUESTED",
  "REFUND_APPROVED",
  "REFUND_PROCESSING",
  "APPROVED",
  "REPLACEMENT_APPROVED",
  "REPLACEMENT_SHIPPED",
] as const;

export const CUSTOMER_UPDATABLE_CLAIM_STATUSES = [
  "PENDING",
  "INVESTIGATING",
  "WAITING_CUSTOMER",
  "WAITING_COURIER",
  "RETURN_REQUESTED",
] as const;

export const BLOCKING_REFUND_CLAIM_STATUSES = [
  ...OPEN_REFUND_CLAIM_STATUSES,
  "REPLACEMENT_DELIVERED",
  "REPLACEMENT_ISSUED",
  "REFUNDED",
] as const;

export function isOpenRefundClaimStatus(status?: string | null): boolean {
  if (!status) return false;
  return (OPEN_REFUND_CLAIM_STATUSES as readonly string[]).includes(status.toUpperCase());
}

export function isReplacementPreparingStatus(status?: string | null): boolean {
  return (status || "").toUpperCase() === "REPLACEMENT_APPROVED";
}

export function isReplacementShippedStatus(status?: string | null): boolean {
  const normalized = (status || "").toUpperCase();
  return normalized === "REPLACEMENT_SHIPPED" || normalized === "REPLACEMENT_ISSUED";
}

export function isReplacementCompletedStatus(status?: string | null): boolean {
  return (status || "").toUpperCase() === "REPLACEMENT_DELIVERED";
}

export function isReplacementStatus(status?: string | null): boolean {
  const normalized = (status || "").toUpperCase();
  return [
    "REPLACEMENT_APPROVED",
    "REPLACEMENT_SHIPPED",
    "REPLACEMENT_DELIVERED",
    "REPLACEMENT_ISSUED",
  ].includes(normalized);
}

export function getRefundStatusLabel(status?: string | null, isAr: boolean = false): string {
  const normalized = (status || "PENDING").toUpperCase();
  const labels: Record<string, [string, string]> = {
    PENDING: ["قيد المراجعة", "Pending Review"],
    INVESTIGATING: ["جارٍ التحقيق", "Investigating"],
    WAITING_CUSTOMER: ["بانتظار ردك", "Waiting for Customer"],
    WAITING_COURIER: ["بانتظار شركة الشحن", "Waiting for Courier"],
    RETURN_REQUESTED: ["مطلوب إرجاع المنتج", "Return Requested"],
    REFUND_APPROVED: ["تم اعتماد الاسترداد", "Refund Approved"],
    APPROVED: ["تم اعتماد الاسترداد", "Refund Approved"],
    REFUND_PROCESSING: ["جارٍ تنفيذ الاسترداد", "Refund Processing"],
    REFUNDED: ["تم تنفيذ الاسترداد", "Refunded"],
    REPLACEMENT_APPROVED: ["جاري تجهيز البديل", "Preparing Replacement"],
    REPLACEMENT_SHIPPED: ["تم شحن البديل", "Replacement Dispatched"],
    REPLACEMENT_DELIVERED: ["تم تسليم البديل", "Replacement Delivered"],
    REPLACEMENT_ISSUED: ["قطعة بديلة", "Replacement Issued"],
    REJECTED: ["مرفوض", "Declined"],
  };
  return labels[normalized]?.[isAr ? 0 : 1] || normalized.replaceAll("_", " ");
}

export type RefundReasonCode =
  | "DAMAGED_IN_TRANSIT"
  | "DEFECTIVE_OR_WRONG_ITEM"
  | "NOT_AS_DESCRIBED"
  | "ORDER_NOT_RECEIVED"
  | "OTHER";

export type RefundRejectionCode =
  | "UNPAID"
  | "CANCELLED"
  | "FAILED"
  | "REFUNDED"
  | "NOT_SHIPPED"
  | "IN_TRANSIT"
  | "ALREADY_CLAIMED"
  | "WINDOW_EXPIRED"
  | "INVALID_ITEM";

export interface RefundOrderLike {
  id: string;
  status?: string | null;
  deliveredAt?: Date | string | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
  items?: RefundOrderItemLike[];
  refundRequests?: Array<{
    id?: string;
    orderItemId?: string | null;
    status?: string | null;
  }>;
}

export interface RefundOrderItemLike {
  id: string;
  status?: string | null;
  shippedAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  personalization?: string | null;
  customImage?: string | null;
  refundRequests?: Array<{
    id?: string;
    orderItemId?: string | null;
    status?: string | null;
  }>;
}

function toTimestamp(value?: Date | string | null): number {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

/**
 * Resolves the timestamp used to count the 14-day post-delivery dispute window.
 * Prefers the persisted delivery timestamp (derived from escrow release baseline)
 * so unrelated later edits to Order.updatedAt do not reset the return window.
 */
export function getDeliveryReferenceTimestamp(order: RefundOrderLike, item?: RefundOrderItemLike | null): number {
  return (
    toTimestamp(item?.deliveredAt) ||
    toTimestamp(order.deliveredAt) ||
    toTimestamp(order.updatedAt) ||
    toTimestamp(order.createdAt)
  );
}

/**
 * Resolves the effective fulfillment stage for an item/order, accounting for the
 * convention where items in a paid PROCESSING order retain PENDING item status until packed.
 */
export function getEffectiveFulfillmentStage(
  orderStatus?: string | null,
  itemStatus?: string | null
): string {
  const ord = (orderStatus || "PENDING").toUpperCase();
  const itm = (itemStatus || "").toUpperCase();

  if (itm === "CANCELLED" || ord === "CANCELLED") return "CANCELLED";
  if (itm === "REFUNDED" || ord === "REFUNDED") return "REFUNDED";
  if (ord === "FAILED") return "FAILED";
  if (ord === "PENDING") return "PENDING";
  if (itm === "DELIVERED" || ord === "DELIVERED") return "DELIVERED";
  if (itm === "OUT_FOR_DELIVERY" || ord === "OUT_FOR_DELIVERY") return "OUT_FOR_DELIVERY";
  if (itm === "SHIPPED" || ord === "SHIPPED") return "SHIPPED";
  return "PROCESSING";
}

export function isRefundWindowExpired(
  order: RefundOrderLike,
  item?: RefundOrderItemLike | null,
  nowMs: number = Date.now()
): boolean {
  const stage = getEffectiveFulfillmentStage(order.status, item?.status);
  if (stage !== "DELIVERED") return false;
  const refTime = getDeliveryReferenceTimestamp(order, item);
  if (!refTime) return false;
  return nowMs - refTime > RETURN_WINDOW_MS;
}

export function requiresPhotoProof(reason: RefundReasonCode): boolean {
  return reason === "DAMAGED_IN_TRANSIT" || reason === "DEFECTIVE_OR_WRONG_ITEM";
}

export type RefundCostBearer = "ARTISAN" | "PLATFORM";

export function roundRefundCurrency(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Determines whether a refunded item should default to restocking inventory.
 * Damaged, defective, and custom-personalized items default to false to prevent
 * putting unsellable goods back into live catalog stock.
 */
export function shouldDefaultRestockOnRefund({
  reason,
  item,
}: {
  reason?: string | null;
  item?: RefundOrderItemLike | null;
}): boolean {
  if (reason === "DAMAGED_IN_TRANSIT" || reason === "DEFECTIVE_OR_WRONG_ITEM") {
    return false;
  }
  if (item?.personalization?.trim() || item?.customImage?.trim()) {
    return false;
  }
  return true;
}

/**
 * Determines whether approving a replacement should default to deducting ready stock.
 * Personalized/custom items default to false because artisans craft replacements to order.
 */
export function shouldDefaultDeductReplacementStock({
  item,
  availableStock,
}: {
  item?: (RefundOrderItemLike & { quantity?: number | null }) | null;
  availableStock?: number | null;
}): boolean {
  if (item?.personalization?.trim() || item?.customImage?.trim()) {
    return false;
  }
  const qty = Math.max(1, Number(item?.quantity || 1));
  return Number(availableStock || 0) >= qty;
}

export function requiresAdminNoteForAction(action: string): boolean {
  return action === "REJECT" || action === "WAITING_CUSTOMER" || action === "RETURN_REQUESTED";
}

export function getOrderRemainingRefundableAmount(
  order: {
    totalAmount?: number | null;
    refundRequests?: Array<{ id?: string; status?: string | null; refundAmount?: number | null }>;
  },
  excludeClaimId?: string
): number {
  const totalPaid = Number(order?.totalAmount || 0);
  const priorRefunded = (order?.refundRequests || []).reduce((sum, req) => {
    if (req.id && excludeClaimId && req.id === excludeClaimId) return sum;
    if ((req.status || "").toUpperCase() !== "REFUNDED") return sum;
    return sum + Math.max(0, Number(req.refundAmount || 0));
  }, 0);
  return Math.max(0, roundRefundCurrency(totalPaid - priorRefunded));
}

/**
 * Returns the list of dispute reasons permitted at the item's current fulfillment stage.
 */
export function getAllowedRefundReasons({
  order,
  item,
  nowMs = Date.now(),
}: {
  order: RefundOrderLike;
  item?: RefundOrderItemLike | null;
  nowMs?: number;
}): RefundReasonCode[] {
  const stage = getEffectiveFulfillmentStage(order.status, item?.status);

  if (["PENDING", "CANCELLED", "FAILED", "REFUNDED", "PROCESSING"].includes(stage)) {
    return [];
  }

  if (stage === "SHIPPED" || stage === "OUT_FOR_DELIVERY") {
    const dispatchRef = toTimestamp(item?.shippedAt) || toTimestamp(order.updatedAt) || toTimestamp(order.createdAt);
    const waitElapsed = dispatchRef > 0 && nowMs - dispatchRef >= NON_DELIVERY_WAIT_MS;
    return waitElapsed ? ["ORDER_NOT_RECEIVED", "OTHER"] : [];
  }

  if (stage === "DELIVERED") {
    if (isRefundWindowExpired(order, item, nowMs)) {
      return [];
    }
    const isPersonalized = Boolean(item?.personalization?.trim() || item?.customImage?.trim());
    const base: RefundReasonCode[] = [
      "DAMAGED_IN_TRANSIT",
      "DEFECTIVE_OR_WRONG_ITEM",
      "NOT_AS_DESCRIBED",
      "ORDER_NOT_RECEIVED",
    ];
    return isPersonalized ? base : [...base, "OTHER"];
  }

  return [];
}

/**
 * Checks whether a buyer is currently permitted to submit a claim for an order/item.
 */
export function evaluateRefundEligibility({
  order,
  item,
  lang = "en",
  nowMs = Date.now(),
}: {
  order: RefundOrderLike;
  item?: RefundOrderItemLike | null;
  lang?: string;
  nowMs?: number;
}): {
  eligible: boolean;
  rejectionCode?: RefundRejectionCode;
  eligibleStage?: "DELIVERED" | "TRANSIT_DELAYED";
  message?: string;
  existingClaim?: any;
  latestClaim?: any;
  allowedReasons: RefundReasonCode[];
} {
  const isAr = lang === "ar";
  const stage = getEffectiveFulfillmentStage(order.status, item?.status);
  const targetItemId = item?.id;
  const orderLevelClaims = order.refundRequests || [];
  const itemLevelClaims = item?.refundRequests || [];
  const matchingOrderClaims = orderLevelClaims.filter((claim) =>
    targetItemId ? claim.orderItemId === targetItemId || !claim.orderItemId : true
  );
  const blockingStatuses = new Set<string>(BLOCKING_REFUND_CLAIM_STATUSES);
  const isBlockingClaim = (claim: { status?: string | null }) =>
    blockingStatuses.has((claim.status || "").toUpperCase());
  const existingClaim =
    itemLevelClaims.find(isBlockingClaim) ||
    matchingOrderClaims.find(isBlockingClaim);
  const latestClaim = existingClaim || itemLevelClaims[0] || matchingOrderClaims[0];

  if (stage === "PENDING") {
    return {
      eligible: false,
      rejectionCode: "UNPAID",
      latestClaim,
      message: isAr
        ? "هذا الطلب بانتظار الدفع، يمكنك إلغاؤه مباشرة دون الحاجة لطلب استرجاع."
        : "This order is awaiting payment. You can cancel it directly without submitting a claim.",
      allowedReasons: [],
    };
  }

  if (stage === "FAILED") {
    return {
      eligible: false,
      rejectionCode: "FAILED",
      latestClaim,
      message: isAr
        ? "فشلت عملية الدفع لهذا الطلب ولا توجد مبالغ محصّلة للاسترجاع."
        : "Payment failed for this order, so no refund claim applies.",
      allowedReasons: [],
    };
  }

  if (stage === "CANCELLED") {
    return {
      eligible: false,
      rejectionCode: "CANCELLED",
      latestClaim,
      message: isAr ? "هذا الطلب ملغي بالفعل." : "This order has already been cancelled.",
      allowedReasons: [],
    };
  }

  if (stage === "REFUNDED") {
    return {
      eligible: false,
      rejectionCode: "REFUNDED",
      existingClaim,
      latestClaim,
      message: isAr
        ? "تم استرجاع قيمة هذا المنتج أو الطلب بالفعل."
        : "This item or order has already been refunded.",
      allowedReasons: [],
    };
  }

  if (stage === "PROCESSING") {
    return {
      eligible: false,
      rejectionCode: "NOT_SHIPPED",
      latestClaim,
      message: isAr
        ? "طلبك قيد التجهيز حالياً؛ تتاح بلاغات التوصيل بعد الشحن أو طلبات الاسترجاع بعد الاستلام."
        : "Your order is still being prepared for shipping. Delivery issues open after dispatch delays and refunds after delivery.",
      allowedReasons: [],
    };
  }

  if (existingClaim) {
    return {
      eligible: false,
      rejectionCode: "ALREADY_CLAIMED",
      existingClaim,
      latestClaim,
      message: isAr
        ? "يوجد طلب استرجاع مسجل بالفعل لهذا المنتج ولا يمكن تقديم طلب آخر."
        : "A refund or issue claim has already been submitted for this item.",
      allowedReasons: [],
    };
  }

  if (isRefundWindowExpired(order, item, nowMs)) {
    return {
      eligible: false,
      rejectionCode: "WINDOW_EXPIRED",
      latestClaim,
      message: isAr
        ? "تجاوز هذا الطلب مهلة الاسترجاع المسموحة (14 يوماً من تاريخ الاستلام)."
        : "This order has exceeded the 14-day dispute and return window from delivery date.",
      allowedReasons: [],
    };
  }

  const allowedReasons = getAllowedRefundReasons({ order, item, nowMs });
  if ((stage === "SHIPPED" || stage === "OUT_FOR_DELIVERY") && allowedReasons.length === 0) {
    return {
      eligible: false,
      rejectionCode: "IN_TRANSIT",
      latestClaim,
      message: isAr
        ? `الشحنة في الطريق إليك حالياً. يتاح الإبلاغ عن تأخر التوصيل بعد مرور ${NON_DELIVERY_WAIT_DAYS} أيام على الشحن.`
        : `Your shipment is currently in transit. Delivery delay reports open after ${NON_DELIVERY_WAIT_DAYS} days in transit.`,
      allowedReasons: [],
    };
  }

  return {
    eligible: allowedReasons.length > 0,
    eligibleStage: stage === "DELIVERED" ? "DELIVERED" : "TRANSIT_DELAYED",
    latestClaim,
    allowedReasons,
  };
}

