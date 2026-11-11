"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  createJtOrder,
  cancelJtOrder,
  queryJtOrders,
  getJtTracking,
  getJtWaybill,
  isJtConfigured,
  normalizeJtTraceResponse,
} from "@/lib/jt-express";
import { matchEgyptGovernorate } from "@/lib/egypt-governorates";
import { sendOrderStatusUpdateEmail, sendRefundResolvedEmail } from "@/lib/mail";

function roundCurrency(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function revalidateShippingOrderPaths() {
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/refunds");
  revalidatePath("/studio");
  revalidatePath("/profile");
  for (const locale of ["en", "ar"]) {
    revalidatePath(`/${locale}/admin/orders`);
    revalidatePath(`/${locale}/admin/refunds`);
    revalidatePath(`/${locale}/studio`);
    revalidatePath(`/${locale}/profile`);
    revalidatePath(`/${locale}/track`);
  }
}

function buildJtCustomerPayload(order: {
  shippingAddress?: string | null;
  shippingCity?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  orderNotes?: string | null;
  user?: { name?: string | null; email?: string | null } | null;
}) {
  const matchedCustomerGov = matchEgyptGovernorate(
    {},
    order.shippingCity || order.shippingAddress || ""
  );
  const dropOffCityName =
    matchedCustomerGov?.nameEn || order.shippingCity || "Cairo";

  const noteCustomerMatch = order.orderNotes?.match(/\[Customer:\s*([^\]]+)\]/i);
  const extractedGuestName = noteCustomerMatch?.[1]?.trim();
  const emailLocalName = order.clientEmail ? order.clientEmail.split("@")[0] : "";
  const customerName =
    order.user?.name?.trim() ||
    extractedGuestName ||
    emailLocalName ||
    "Giftisan Customer";
  const nameParts = customerName.trim().split(/\s+/);
  const firstName = nameParts[0] || "Customer";
  const lastName = nameParts.slice(1).join(" ") || "";

  const cleanDeliveryInstructions = (order.orderNotes || "")
    .replace(/\[(COD - Cash on Delivery|Paymob Online)\]/gi, "")
    .replace(/\[Gift Note:[^\]]*\]/gi, "")
    .replace(/\[Customer:[^\]]*\]/gi, "")
    .trim();

  return {
    customerName,
    firstName,
    lastName,
    dropOffCityName,
    cleanDeliveryInstructions,
  };
}

function buildJtArtisanOrigin(artisan: any) {
  if (!artisan) {
    return { pickupPayload: undefined, senderPayload: undefined };
  }

  const rawPickupStreet =
    artisan.pickupAddress ||
    [artisan.pickupDistrict, artisan.pickupCity].filter(Boolean).join(", ") ||
    artisan.location ||
    process.env.JT_SENDER_ADDRESS ||
    "Cairo, Egypt";

  const matchedArtisanGov = matchEgyptGovernorate(
    {},
    artisan.pickupCity || artisan.pickupDistrict || artisan.location || rawPickupStreet
  );
  const artCity =
    matchedArtisanGov?.nameEn || artisan.pickupCity || process.env.JT_SENDER_CITY || "Cairo";
  const artDistrict =
    artisan.pickupDistrict || artisan.location?.split(/[,،]/)[0]?.trim() || artCity;

  const fullStreet = [
    rawPickupStreet,
    artisan.pickupBuilding ? `Building/Floor: ${artisan.pickupBuilding}` : "",
    artisan.pickupDistrict && !rawPickupStreet.includes(artisan.pickupDistrict)
      ? `District: ${artisan.pickupDistrict}`
      : "",
  ]
    .filter(Boolean)
    .join(", ");

  return {
    pickupPayload: {
      firstLine: fullStreet,
      prov: artCity,
      city: artCity,
      area: artDistrict || artCity,
      district: artDistrict || undefined,
    },
    senderPayload: {
      firstName: artisan.studioName || artisan.user?.name || process.env.JT_SENDER_NAME || "Giftisan Artisan",
      phone:
        artisan.phoneNumber ||
        artisan.user?.phone ||
        process.env.JT_SENDER_PHONE ||
        "01000000000",
      email: artisan.user?.email || undefined,
    },
  };
}

/**
 * Creates J&T Express shipments for an order, grouping shippable items by artisan.
 * Handles accurate COD parcel collection and preserves gift message privacy.
 */
export async function shipOrderWithJtExpress(orderId: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "Unauthorized: Admin privileges required" };
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: {
          include: {
            product: {
              include: {
                artisan: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return { error: "Order not found" };
    }

    if (order.status === "DELIVERED") {
      return {
        error: `Order is already ${order.status.toLowerCase()}${
          order.trackingNumber ? ` (Tracking: ${order.trackingNumber})` : ""
        }.`,
      };
    }

    if (
      order.status === "PENDING" ||
      order.status === "FAILED" ||
      order.status === "CANCELLED" ||
      order.status === "REFUNDED"
    ) {
      return {
        error: `Cannot create a J&T Express shipment for an order in ${order.status} status.`,
      };
    }

    if (!order.shippingAddress) {
      return { error: "Shipping address is missing for this order" };
    }

    const phoneDigits = (order.clientPhone || "").replace(/[^0-9]/g, "");
    if (phoneDigits.length < 8) {
      return {
        error: "A valid customer phone number is required for J&T Express shipping",
      };
    }

    const shippableItems = order.items.filter(
      (i) => i.status !== "CANCELLED" && i.status !== "REFUNDED"
    );
    if (shippableItems.length === 0) {
      return { error: "No active shippable items remain in this order" };
    }
    if (shippableItems.every((item) => Boolean(item.trackingNumber))) {
      return { error: "All active items in this order already have tracking numbers." };
    }

    const {
      customerName,
      firstName,
      lastName,
      dropOffCityName,
      cleanDeliveryInstructions,
    } = buildJtCustomerPayload(order);

    // Group active items by artisan to create tailored J&T Express shipments per artisan pickup location
    const artisanGroups = new Map<
      string,
      { artisan: any; items: typeof shippableItems }
    >();
    for (const item of shippableItems) {
      const artId = item.product.artisanId || "platform";
      if (!artisanGroups.has(artId)) {
        artisanGroups.set(artId, { artisan: item.product.artisan, items: [] });
      }
      artisanGroups.get(artId)!.items.push(item);
    }
    if (Array.from(artisanGroups.values()).some(({ items }) => items.some((item) => item.trackingNumber) && items.some((item) => !item.trackingNumber))) {
      return { error: "This order has a partially tracked artisan parcel. Reconcile its existing J&T shipment before retrying." };
    }

    // Determine whether J&T Express must collect Cash on Delivery across the order's parcel(s)
    const isCodOrder = Boolean(order.orderNotes && /\[COD\b/i.test(order.orderNotes));
    const totalOrderCod = isCodOrder ? Math.max(0, roundCurrency(order.totalAmount)) : 0;
    const totalMerchandiseGross = shippableItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const merchandiseNetTarget = Math.max(
      0,
      roundCurrency(totalOrderCod - (order.shippingCost || 0))
    );

    const groupEntries = Array.from(artisanGroups.entries());
    let remainingCod = totalOrderCod;
    const createdTrackings: string[] = shippableItems.map((item) => item.trackingNumber).filter((tracking): tracking is string => Boolean(tracking));
    const newlyBookedTrackings: string[] = [];
    const newlyShippedItems: typeof shippableItems = [];
    const createdParcels: { trackingNumber: string; itemIds: string[]; status: string }[] = [];

    for (let idx = 0; idx < groupEntries.length; idx++) {
      const [artisanId, group] = groupEntries[idx];
      const artisan = group.artisan;
      const groupItemsSummary = group.items
        .map((i) => `${i.quantity}x ${i.product.name}`)
        .join(", ");
      const groupTotalCount = group.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      // Calculate exact COD amount for this parcel (0 for online Paymob orders)
      let parcelCod = 0;
      if (isCodOrder && remainingCod > 0) {
        if (idx === groupEntries.length - 1) {
          parcelCod = roundCurrency(remainingCod);
        } else {
          const groupGross = group.items.reduce(
            (s, i) => s + i.price * i.quantity,
            0
          );
          const groupMerchShare =
            totalMerchandiseGross > 0
              ? (groupGross / totalMerchandiseGross) * merchandiseNetTarget
              : 0;
          const shippingShare = idx === 0 ? order.shippingCost || 0 : 0;
          parcelCod = Math.min(
            remainingCod,
            Math.max(0, roundCurrency(groupMerchShare + shippingShare))
          );
          remainingCod = roundCurrency(remainingCod - parcelCod);
        }
      }

      if (group.items.every((item) => Boolean(item.trackingNumber))) {
        const existingStatus = group.items.every((item) => item.status === "DELIVERED")
          ? "DELIVERED"
          : group.items.some((item) => item.status === "OUT_FOR_DELIVERY")
            ? "OUT_FOR_DELIVERY"
            : "SHIPPED";
        createdParcels.push({
          trackingNumber: group.items[0].trackingNumber!,
          itemIds: group.items.map((item) => item.id),
          status: existingStatus,
        });
        continue;
      }

      const { pickupPayload, senderPayload } = buildJtArtisanOrigin(artisan);

      const jtResult = await createJtOrder({
        txlogisticId: `${order.id}${
          groupEntries.length > 1 ? `-${artisanId.slice(-4)}` : ""
        }`,
        cod: parcelCod,
        receiver: {
          firstName,
          lastName,
          phone: order.clientPhone!,
          email: order.clientEmail || order.user?.email || undefined,
        },
        dropOffAddress: {
          firstLine: order.shippingAddress,
          prov: dropOffCityName,
          city: dropOffCityName,
          area: dropOffCityName,
        },
        sender: senderPayload,
        pickupAddress: pickupPayload,
        notes: [
          cleanDeliveryInstructions
            ? `Customer Instructions: ${cleanDeliveryInstructions}`
            : "",
          order.isGift ? "Gift Parcel: Do not disclose pricing on exterior" : "",
          artisan?.pickupNotes ? `Pickup note: ${artisan.pickupNotes}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
        itemsCount: groupTotalCount,
        description:
          groupItemsSummary.slice(0, 100) || "Handmade Giftisan Products",
        items: group.items.map((i) => ({
          itemName: i.product.name,
          number: i.quantity,
          itemValue: order.isGift ? 0 : roundCurrency(i.price * i.quantity),
          priceCurrency: "EGP",
          desc: i.product.name,
        })),
      });

      const trackingNumber = String(jtResult.trackingNumber || "");
      if (trackingNumber) {
        createdTrackings.push(trackingNumber);
        newlyBookedTrackings.push(trackingNumber);
        newlyShippedItems.push(...group.items);

        const itemIds = group.items.map((i) => i.id);
        createdParcels.push({ trackingNumber, itemIds, status: "SHIPPED" });
        await prisma.orderItem.updateMany({
          where: { id: { in: itemIds } },
          data: {
            status: "SHIPPED",
            shippedAt: new Date(),
            carrier: "J&T Express",
            trackingNumber,
          },
        });
      }
    }

    if (createdTrackings.length === 0) {
      return { error: "Failed to generate tracking numbers with J&T Express." };
    }

    const primaryTracking = Array.from(new Set(createdTrackings)).join(", ");
    const hasOutForDelivery =
      order.status === "OUT_FOR_DELIVERY" ||
      shippableItems.some(
        (item) =>
          !newlyShippedItems.some((shipped) => shipped.id === item.id) &&
          item.status === "OUT_FOR_DELIVERY"
      );
    const nextOrderStatus = hasOutForDelivery ? "OUT_FOR_DELIVERY" : "SHIPPED";

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: nextOrderStatus,
        carrier: "J&T Express",
        trackingNumber: primaryTracking,
      },
    });

    const recipientEmail = order.user?.email || order.clientEmail;
    const emailItem = newlyShippedItems[0] || shippableItems[0];
    const emailTracking = newlyBookedTrackings.join(", ") || primaryTracking;
    if (recipientEmail && newlyShippedItems.length > 0) {
      sendOrderStatusUpdateEmail(
        recipientEmail,
        customerName,
        order.id,
        "SHIPPED",
        emailItem?.product?.name || "Your gift package",
        emailItem?.product?.slug || undefined,
        emailTracking,
        "J&T Express"
      ).catch((err) =>
        console.error("[J&T Express Shipping Action] Email notification error:", err)
      );
    }

    revalidateShippingOrderPaths();

    return {
      success: true,
      orderStatus: nextOrderStatus,
      trackingNumber: primaryTracking,
      trackings: Array.from(new Set(createdTrackings)),
      parcels: createdParcels,
    };
  } catch (error: any) {
    console.error("[shipOrderWithJtExpress Error]:", error);
    return { error: error.message || "Failed to create shipment on J&T Express" };
  }
}

/**
 * Gets the Airway Bill (AWB) / Waybill Information for an order from J&T Express
 */
export async function getJtWaybillAction(billCode: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { error: "Unauthorized" };
    }

    if (session.user.role !== "ADMIN") {
      if (session.user.role === "ARTISAN") {
        const artisan = await prisma.artisanProfile.findUnique({
          where: { userId: session.user.id },
          select: { id: true },
        });
        if (!artisan) return { error: "Unauthorized" };

        const [ownsOrderItem, ownsClaimParcel] = await Promise.all([
          prisma.orderItem.findFirst({
            where: { trackingNumber: billCode, product: { artisanId: artisan.id } },
            select: { id: true },
          }),
          prisma.refundRequest.findFirst({
            where: {
              OR: [{ replacementTrackingNumber: billCode }, { returnTrackingNumber: billCode }],
              AND: [
                {
                  OR: [
                    { orderItem: { product: { artisanId: artisan.id } } },
                    { order: { items: { some: { product: { artisanId: artisan.id } } } } },
                  ],
                },
              ],
            },
            select: { id: true },
          }),
        ]);

        if (!ownsOrderItem && !ownsClaimParcel) {
          return { error: "Unauthorized" };
        }
      } else {
        const ownsBuyerReturn = await prisma.refundRequest.findFirst({
          where: {
            OR: [{ replacementTrackingNumber: billCode }, { returnTrackingNumber: billCode }],
            AND: [{ OR: [{ userId: session.user.id }, { order: { userId: session.user.id } }] }],
          },
          select: { id: true },
        });
        if (!ownsBuyerReturn) {
          return { error: "Unauthorized" };
        }
      }
    }

    const awbData = await getJtWaybill(billCode);
    return { success: true, data: awbData };
  } catch (error: any) {
    console.error("[getJtWaybillAction Error]:", error);
    return { error: error.message || "Failed to fetch J&T Express Waybill" };
  }
}

/**
 * Cancels an order on J&T Express (`orderserve/cancel`) and reverts order status
 */
export async function cancelJtOrderAction(
  orderIdOrTxLogisticId: string,
  reason: string = "Cancelled by Admin"
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "Unauthorized: Admin privileges required" };
    }

    // Find order in DB either by id or trackingNumber
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderIdOrTxLogisticId },
          { trackingNumber: { contains: orderIdOrTxLogisticId } },
        ],
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) return { error: "Order not found" };
    const hasBlockedItem = order.items.some(
      (item) => !["CANCELLED", "REFUNDED"].includes(item.status) && ["DELIVERED", "OUT_FOR_DELIVERY"].includes(item.status)
    );
    if (["DELIVERED", "OUT_FOR_DELIVERY"].includes(order.status) || hasBlockedItem) {
      const blockedStatus = order.status === "DELIVERED" || order.status === "OUT_FOR_DELIVERY"
        ? order.status
        : "OUT_FOR_DELIVERY";
      return { error: `A J&T shipment cannot be cancelled while the order is ${blockedStatus.toLowerCase().replace(/_/g, " ")}.` };
    }

    const activeArtisanGroups = new Set(
      order.items.filter((item) => item.status !== "CANCELLED" && item.status !== "REFUNDED")
        .map((item) => item.product?.artisanId || "platform")
    ).size;
    const parcelGroups = new Map<string, { artisanId: string; billCode?: string; itemIds: string[] }>();
    for (const item of order.items.filter((candidate) => candidate.trackingNumber)) {
      const artisanId = item.product?.artisanId || "platform";
      const existing = parcelGroups.get(artisanId);
      if (existing) {
        existing.itemIds.push(item.id);
        if (!existing.billCode && item.trackingNumber) existing.billCode = item.trackingNumber;
      } else {
        parcelGroups.set(artisanId, { artisanId, billCode: item.trackingNumber || undefined, itemIds: [item.id] });
      }
    }
    if (parcelGroups.size === 0 && order.trackingNumber) {
      const legacyCodes = order.trackingNumber.split(",").map((code) => code.trim()).filter(Boolean);
      for (const [idx, code] of legacyCodes.entries()) {
        parcelGroups.set(`legacy-${idx}`, { artisanId: "platform", billCode: code, itemIds: [] });
      }
    }
    if (parcelGroups.size === 0) return { error: "No tracked J&T parcels were found for this order" };

    const hasMultipleParcels = activeArtisanGroups > 1 || parcelGroups.size > 1 || (order.trackingNumber || "").includes(",");

    // Cancel only parcels that were actually booked.
    const results: any[] = [];
    const parcels = Array.from(parcelGroups.values());
    const cancelledParcels: Array<{ artisanId: string; billCode?: string; itemIds: string[] }> = [];
    for (const parcel of parcels) {
      const isLegacy = parcel.artisanId === "platform" && parcel.itemIds.length === 0 && (order.trackingNumber || "").includes(",");
      const txId = !isLegacy && hasMultipleParcels ? `${order.id}-${parcel.artisanId.slice(-4)}` : order.id;
      try {
        const res = await cancelJtOrder(txId, reason, 1, parcel.billCode);
        results.push({ txId, result: res });
        cancelledParcels.push(parcel);
      } catch (err: any) {
        console.error(`[cancelJtOrder] failed for ${txId}:`, err.message);
        if (cancelledParcels.length > 0) {
          const cancelledItemIds = cancelledParcels.flatMap((entry) => entry.itemIds);
          if (cancelledItemIds.length > 0) {
            await prisma.orderItem.updateMany({
              where: { id: { in: cancelledItemIds }, status: { notIn: ["CANCELLED", "REFUNDED", "PENDING"] } },
              data: { status: "PROCESSING", trackingNumber: null, carrier: null },
            });
            await prisma.orderItem.updateMany({
              where: { id: { in: cancelledItemIds }, trackingNumber: { not: null } },
              data: { trackingNumber: null, carrier: null },
            });
          }
          const remainingCodes = Array.from(new Set(
            parcels
              .filter((entry) => !cancelledParcels.includes(entry))
              .map((entry) => entry.billCode)
              .filter((code): code is string => Boolean(code))
          ));
          const remainingTracking = remainingCodes.length > 0 ? remainingCodes.join(", ") : null;
          await prisma.order.update({
            where: { id: order.id },
            data: {
              trackingNumber: remainingTracking,
              ...(remainingTracking ? {} : { status: "PROCESSING", carrier: null }),
            },
          });
          revalidateShippingOrderPaths();
          return {
            error: `Cancelled ${cancelledParcels.length} parcel(s), but J&T cancellation failed for parcel ${parcel.billCode || txId}: ${err.message || "Unknown courier error"}. Remaining parcel tracking was preserved.`,
          };
        }
        return { error: `J&T cancellation failed for parcel ${parcel.billCode || txId}: ${err.message || "Unknown courier error"}. Local tracking was kept; check J&T before retrying.` };
      }
    }

    await prisma.order.update({ where: { id: order.id }, data: { status: "PROCESSING", trackingNumber: null, carrier: null } });
    await prisma.orderItem.updateMany({
      where: { orderId: order.id, status: { notIn: ["CANCELLED", "REFUNDED", "PENDING"] } },
      data: { status: "PROCESSING", trackingNumber: null, carrier: null },
    });
    await prisma.orderItem.updateMany({
      where: { orderId: order.id, trackingNumber: { not: null } },
      data: { trackingNumber: null, carrier: null },
    });
    revalidateShippingOrderPaths();

    return {
      success: true,
      message: "J&T Express shipment cancelled successfully",
      data: results,
    };
  } catch (error: any) {
    console.error("[cancelJtOrderAction Error]:", error);
    return { error: error.message || "Failed to cancel J&T Express shipment" };
  }
}

/**
 * Queries order details on J&T Express (`orderserve/query`)
 */
export async function queryJtOrdersAction(serialNumbers: string | string[]) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    const res = await queryJtOrders(serialNumbers);
    return { success: true, data: res };
  } catch (error: any) {
    console.error("[queryJtOrdersAction Error]:", error);
    return { error: error.message || "Failed to query J&T Express orders" };
  }
}

/**
 * Queries live tracking trajectory on J&T Express (`orderserve/expressquery`)
 */
export async function getJtTrackingAction(billCodes: string | string[]) {
  try {
    const res = await getJtTracking(billCodes);
    return { success: true, data: res };
  } catch (error: any) {
    console.error("[getJtTrackingAction Error]:", error);
    return { error: error.message || "Failed to fetch J&T Express tracking" };
  }
}

/**
 * Syncs order status live from J&T Express tracking API
 */
export async function syncJtOrderStatusAction(orderId: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "Unauthorized: Admin privileges required" };
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, items: { include: { product: true } } },
    });

    if (!order) {
      return { error: "Order not found" };
    }

    if (!order.trackingNumber && !order.items.some((item) => item.trackingNumber)) {
      return { error: "No tracking number on this order to sync" };
    }

    const itemTrackingNumbers = order.items.map((item) => item.trackingNumber).filter((code): code is string => Boolean(code));
    const trackingNumbers = Array.from(new Set(itemTrackingNumbers.length
      ? itemTrackingNumbers
      : (order.trackingNumber || "").split(",").map((code) => code.trim()).filter(Boolean)));
    const scans: any[] = [];
    let anyItemUpdated = false;
    for (const trackingNumber of trackingNumbers) {
      const traceRes = await getJtTracking(trackingNumber);
      const normalized = normalizeJtTraceResponse(trackingNumber, traceRes);
      const scanType = normalized.latestScanType;
      const scanDesc = normalized.latestDesc;
      const delivered = normalized.delivered;
      const outForDelivery = normalized.outForDelivery;

      const hasParcelItemMapping = order.items.some((item) => item.trackingNumber === trackingNumber);
      const matchingItems = hasParcelItemMapping
        ? order.items.filter((item) => item.trackingNumber === trackingNumber)
        : trackingNumbers.length === 1
          ? order.items
          : [];
      const activeMatching = matchingItems.filter((item) => !["CANCELLED", "REFUNDED"].includes(item.status));
      const alreadyDelivered = activeMatching.length > 0 && activeMatching.every((item) => item.status === "DELIVERED");
      const alreadyOutForDelivery = !alreadyDelivered && activeMatching.some((item) => item.status === "OUT_FOR_DELIVERY");
      const parcelStatus = (delivered || alreadyDelivered)
        ? "DELIVERED"
        : (outForDelivery || alreadyOutForDelivery)
          ? "OUT_FOR_DELIVERY"
          : "SHIPPED";

      scans.push({
        trackingNumber,
        latestTime: normalized.latestTime,
        events: normalized.events,
        scanType,
        scanDesc,
        delivered,
        outForDelivery,
        parcelStatus,
      });

      if (delivered) {
        const newlyDelivered = order.items.filter((item) =>
          (hasParcelItemMapping ? item.trackingNumber === trackingNumber : trackingNumbers.length === 1) &&
          !["DELIVERED", "CANCELLED", "REFUNDED"].includes(item.status)
        );
        const updateRes = await prisma.orderItem.updateMany({
          where: { orderId: order.id, ...(hasParcelItemMapping ? { trackingNumber } : {}), status: { notIn: ["DELIVERED", "CANCELLED", "REFUNDED"] } },
          data: { status: "DELIVERED", deliveredAt: new Date() },
        });
        if (updateRes.count > 0) anyItemUpdated = true;
        for (const artisanId of new Set(newlyDelivered.map((item) => item.product.artisanId))) {
          await prisma.artisanTransaction.updateMany({
            where: { orderId: order.id, artisanId, type: "SALE", status: "PENDING" },
            data: { createdAt: new Date() },
          });
        }
        const deliveredItem = newlyDelivered[0];
        const recipientEmail = order.user?.email || order.clientEmail;
        if (deliveredItem && recipientEmail) {
          sendOrderStatusUpdateEmail(recipientEmail, order.user?.name || "Valued Customer", order.id, "DELIVERED",
            deliveredItem.product.name || "Your order", deliveredItem.product.slug || undefined, trackingNumber,
            order.carrier || "J&T Express").catch(() => {});
        }
      } else if (outForDelivery && (hasParcelItemMapping || trackingNumbers.length === 1)) {
        const updateRes = await prisma.orderItem.updateMany({
          where: { orderId: order.id, ...(hasParcelItemMapping ? { trackingNumber } : {}), status: { notIn: ["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REFUNDED"] } },
          data: { status: "OUT_FOR_DELIVERY" },
        });
        if (updateRes.count > 0) anyItemUpdated = true;
      }
    }

    const freshItems = await prisma.orderItem.findMany({ where: { orderId: order.id }, select: { status: true } });
    const activeItems = freshItems.filter((item) => !["CANCELLED", "REFUNDED"].includes(item.status));
    const updatedStatus = activeItems.length > 0 && activeItems.every((item) => item.status === "DELIVERED")
      ? "DELIVERED"
      : activeItems.some((item) => item.status === "OUT_FOR_DELIVERY") ? "OUT_FOR_DELIVERY" : order.status;
    if (updatedStatus !== order.status) {
      await prisma.order.update({ where: { id: order.id }, data: { status: updatedStatus } });
    }
    if (updatedStatus !== order.status || anyItemUpdated) {
      revalidateShippingOrderPaths();
    }
    const latestScan = scans.find((scan) => scan.outForDelivery || scan.delivered) || scans[0];

    return {
      success: true,
      currentStatus: updatedStatus,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      latestScan: {
        scanType: latestScan?.scanType || "In Transit",
        desc: latestScan?.scanDesc || "Tracking active with J&T Express",
        time: latestScan?.latestTime || "",
      },
      parcels: scans.map((scan) => ({
        trackingNumber: scan.trackingNumber,
        status: scan.parcelStatus,
        tracesCount: scan.events.length,
        events: scan.events,
      })),
    };
  } catch (error: any) {
    console.error("[syncJtOrderStatusAction Error]:", error);
    return { error: error.message || "Failed to sync status from J&T Express" };
  }
}

/**
 * Books a free (COD = 0) replacement shipment via J&T Express or records manual tracking
 * for an approved replacement claim (`REPLACEMENT_APPROVED` -> `REPLACEMENT_SHIPPED`).
 * Preserves original OrderItem tracking history by storing replacement tracking on RefundRequest.
 */
export async function dispatchReplacementShipmentAction({
  claimId,
  mode = "JT_EXPRESS",
  trackingNumber,
  carrier = "J&T Express",
  note,
  lang = "en",
}: {
  claimId: string;
  mode?: "JT_EXPRESS" | "MANUAL";
  trackingNumber?: string;
  carrier?: string;
  note?: string;
  lang?: "ar" | "en";
}) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const isAdmin = session.user.role === "ADMIN";
    const isArtisan = session.user.role === "ARTISAN";
    if (!isAdmin && !isArtisan) {
      return { error: "Unauthorized" };
    }

    if (!isAdmin && mode === "MANUAL") {
      return { error: "Artisans must dispatch replacements through J&T Express pickup." };
    }

    const claim = await prisma.refundRequest.findUnique({
      where: { id: claimId },
      include: {
        user: true,
        orderItem: {
          include: {
            product: {
              include: {
                artisan: {
                  include: { user: true },
                },
              },
            },
          },
        },
        order: {
          include: {
            user: true,
            items: {
              include: {
                product: {
                  include: {
                    artisan: {
                      include: { user: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!claim || !claim.order) {
      return { error: "Replacement claim or order not found" };
    }

    if (claim.status !== "REPLACEMENT_APPROVED") {
      return { error: "This claim is not currently awaiting replacement dispatch." };
    }

    const targetItems = claim.orderItem
      ? [claim.orderItem]
      : claim.order.items.filter((i) => !["CANCELLED", "REFUNDED"].includes(i.status));
    if (targetItems.length === 0) {
      return { error: "No active items found to dispatch for this replacement." };
    }

    if (isArtisan && !isAdmin) {
      const artisanProfile = await prisma.artisanProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (
        !artisanProfile ||
        !targetItems.every((item) => item.product?.artisanId === artisanProfile.id)
      ) {
        return { error: "Unauthorized to dispatch replacement for another shop." };
      }
    }

    const primaryArtisan = targetItems[0]?.product?.artisan;
    const uniqueArtisanIds = new Set(targetItems.map((i) => i.product?.artisanId).filter(Boolean));
    if (mode === "JT_EXPRESS" && uniqueArtisanIds.size > 1) {
      return { error: "Multi-artisan order replacements require per-item claims or manual dispatch." };
    }

    let resolvedTracking = trackingNumber?.trim() || "";
    let resolvedCarrier = carrier?.trim() || "J&T Express";
    let logisticId = `${claim.order.id}-REP-${claim.id.slice(-5)}`;

    if (mode === "JT_EXPRESS") {
      if (!isJtConfigured()) {
        return {
          error:
            lang === "ar"
              ? "إعدادات J&T Express غير مفعلة حالياً على الخادم."
              : "J&T Express API credentials are not configured.",
        };
      }

      if (!claim.order.shippingAddress) {
        return { error: "Shipping address is missing on the original order." };
      }
      const phoneDigits = (claim.order.clientPhone || "").replace(/[^0-9]/g, "");
      if (phoneDigits.length < 8) {
        return { error: "Customer phone number is required for J&T Express replacement booking." };
      }

      const {
        firstName,
        lastName,
        dropOffCityName,
        cleanDeliveryInstructions,
      } = buildJtCustomerPayload(claim.order);
      const { pickupPayload, senderPayload } = buildJtArtisanOrigin(primaryArtisan);

      const summary = targetItems
        .map((i) => `${i.quantity}x ${i.product.name}`)
        .join(", ");
      const itemCount = targetItems.reduce((sum, i) => sum + i.quantity, 0);

      const jtResult = await createJtOrder({
        txlogisticId: logisticId,
        cod: 0, // Replacement parcels are ALWAYS prepaid (EGP 0 collection)
        payType: "PP_PM",
        receiver: {
          firstName,
          lastName,
          phone: claim.order.clientPhone!,
          email: claim.order.clientEmail || claim.order.user?.email || undefined,
        },
        dropOffAddress: {
          firstLine: claim.order.shippingAddress,
          prov: dropOffCityName,
          city: dropOffCityName,
          area: dropOffCityName,
        },
        sender: senderPayload,
        pickupAddress: pickupPayload,
        notes: [
          `REPLACEMENT Claim #${claim.id.slice(-6)}`,
          cleanDeliveryInstructions ? `Customer: ${cleanDeliveryInstructions}` : "",
          claim.order.isGift ? "Gift Parcel: Do not disclose pricing on exterior" : "",
          primaryArtisan?.pickupNotes ? `Pickup: ${primaryArtisan.pickupNotes}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
        itemsCount: itemCount,
        description: `Replacement: ${summary}`.slice(0, 100),
        items: targetItems.map((i) => ({
          itemName: `Replacement: ${i.product.name}`,
          number: i.quantity,
          itemValue: 0,
          priceCurrency: "EGP",
          desc: i.product.name,
        })),
      });

      resolvedTracking = String(jtResult.trackingNumber || "");
      if (!resolvedTracking) {
        return { error: "J&T Express did not return a replacement tracking number." };
      }
      logisticId = String(jtResult.deliveryId || logisticId);
      resolvedCarrier = "J&T Express";
    } else {
      if (!resolvedTracking || !resolvedCarrier) {
        return {
          error:
            lang === "ar"
              ? "يرجى إدخال اسم شركة الشحن ورقم التتبع للبديل."
              : "Please enter the replacement carrier and tracking number.",
        };
      }
    }

    const cleanNote = note?.trim() || "";
    const dispatchMeta = `[Dispatched via ${resolvedCarrier} | Tracking: ${resolvedTracking} | COD: EGP 0]`;
    const eventNote = [cleanNote, dispatchMeta].filter(Boolean).join(" ");

    const updatedClaim = await prisma.$transaction(async (tx) => {
      const transitioned = await tx.refundRequest.updateMany({
        where: { id: claim.id, status: "REPLACEMENT_APPROVED" },
        data: {
          status: "REPLACEMENT_SHIPPED",
          replacementTrackingNumber: resolvedTracking,
          replacementCarrier: resolvedCarrier,
          replacementLogisticId: mode === "JT_EXPRESS" ? logisticId : null,
          replacementShippedAt: new Date(),
        },
      });
      if (transitioned.count === 0) {
        throw new Error("Replacement claim was already dispatched or modified.");
      }

      await tx.refundRequestEvent.create({
        data: {
          refundRequestId: claim.id,
          actorUserId: session.user.id,
          fromStatus: claim.status,
          toStatus: "REPLACEMENT_SHIPPED",
          note: eventNote,
        },
      });

      return tx.refundRequest.findUnique({
        where: { id: claim.id },
        include: { events: { orderBy: { createdAt: "asc" } } },
      });
    });

    const customerEmail = claim.user?.email || claim.order.clientEmail;
    const customerName = claim.user?.name || "Valued Client";
    if (customerEmail) {
      await sendRefundResolvedEmail({
        email: customerEmail,
        customerName,
        orderId: claim.orderId,
        status: "REPLACEMENT_SHIPPED",
        adminNote: cleanNote || claim.adminNote || undefined,
        replacementTrackingNumber: resolvedTracking,
        replacementCarrier: resolvedCarrier,
        lang,
      }).catch((err) => console.error("[Replacement Dispatch Email Error]:", err));
    }

    revalidateShippingOrderPaths();
    return {
      success: true,
      claim: updatedClaim,
      trackingNumber: resolvedTracking,
      carrier: resolvedCarrier,
    };
  } catch (error: any) {
    console.error("[dispatchReplacementShipmentAction Error]:", error);
    return { error: error.message || "Failed to dispatch replacement shipment" };
  }
}

/**
 * Queries J&T Express live tracking for a shipped replacement and auto-closes it as
 * `REPLACEMENT_DELIVERED` once delivery is confirmed (unblocking artisan escrow).
 */
export async function syncReplacementTrackingAction(claimId: string, lang: "ar" | "en" = "en") {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const claim = await prisma.refundRequest.findUnique({
      where: { id: claimId },
      include: {
        user: true,
        orderItem: { include: { product: true } },
        order: { include: { user: true, items: { include: { product: true } } } },
      },
    });

    if (!claim) {
      return { error: "Replacement claim not found" };
    }

    const isAdmin = session.user.role === "ADMIN";
    const isBuyer = claim.userId === session.user.id || claim.order?.userId === session.user.id;
    let isOwningArtisan = false;
    if (!isAdmin && !isBuyer && session.user.role === "ARTISAN") {
      const artisan = await prisma.artisanProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (artisan) {
        isOwningArtisan = Boolean(
          claim.orderItem?.product?.artisanId === artisan.id ||
          claim.order?.items?.some((i) => i.product?.artisanId === artisan.id)
        );
      }
    }

    if (!isAdmin && !isBuyer && !isOwningArtisan) {
      return { error: "Unauthorized" };
    }

    if (!claim.replacementTrackingNumber) {
      return { error: "No replacement tracking number has been assigned yet." };
    }

    const traceRes = await getJtTracking(claim.replacementTrackingNumber);
    const normalized = normalizeJtTraceResponse(claim.replacementTrackingNumber, traceRes);

    let updatedClaim: any = claim;
    if (normalized.delivered && claim.status === "REPLACEMENT_SHIPPED") {
      updatedClaim = await prisma.$transaction(async (tx) => {
        const transitioned = await tx.refundRequest.updateMany({
          where: { id: claim.id, status: "REPLACEMENT_SHIPPED" },
          data: {
            status: "REPLACEMENT_DELIVERED",
            replacementDeliveredAt: new Date(),
          },
        });
        if (transitioned.count > 0) {
          await tx.refundRequestEvent.create({
            data: {
              refundRequestId: claim.id,
              actorUserId: session.user.id,
              fromStatus: "REPLACEMENT_SHIPPED",
              toStatus: "REPLACEMENT_DELIVERED",
              note: `[Confirmed delivered via J&T Express tracking ${claim.replacementTrackingNumber}]`,
            },
          });
        }
        return tx.refundRequest.findUnique({
          where: { id: claim.id },
          include: { events: { orderBy: { createdAt: "asc" } } },
        });
      });

      const customerEmail = claim.user?.email || claim.order?.clientEmail;
      if (customerEmail) {
        await sendRefundResolvedEmail({
          email: customerEmail,
          customerName: claim.user?.name || "Valued Client",
          orderId: claim.orderId,
          status: "REPLACEMENT_DELIVERED",
          replacementTrackingNumber: claim.replacementTrackingNumber,
          replacementCarrier: claim.replacementCarrier || "J&T Express",
          lang,
        }).catch(() => {});
      }

      revalidateShippingOrderPaths();
    }

    return {
      success: true,
      claim: updatedClaim,
      delivered: normalized.delivered,
      outForDelivery: normalized.outForDelivery,
      latestScan: {
        scanType: normalized.latestScanType || "In Transit",
        desc: normalized.latestDesc || "Replacement tracking active",
        time: normalized.latestTime || "",
      },
      events: normalized.events,
    };
  } catch (error: any) {
    console.error("[syncReplacementTrackingAction Error]:", error);
    return { error: error.message || "Failed to sync replacement tracking" };
  }
}

/**
 * Books a free (COD = 0) reverse return pickup from the customer back to the artisan workshop
 * via J&T Express (`RETURN_REQUESTED` with reverse AWB) or records a manual return tracking ID.
 */
export async function dispatchReturnPickupAction({
  claimId,
  mode = "JT_EXPRESS",
  trackingNumber,
  carrier = "J&T Express",
  note,
  lang = "en",
}: {
  claimId: string;
  mode?: "JT_EXPRESS" | "MANUAL";
  trackingNumber?: string;
  carrier?: string;
  note?: string;
  lang?: "ar" | "en";
}) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "Unauthorized: Admin privileges required" };
    }

    const claim = await prisma.refundRequest.findUnique({
      where: { id: claimId },
      include: {
        user: true,
        events: {
          where: { note: { startsWith: "[Cancelled return pickup" } },
          select: { id: true },
        },
        orderItem: {
          include: {
            product: {
              include: {
                artisan: {
                  include: { user: true },
                },
              },
            },
          },
        },
        order: {
          include: {
            user: true,
            items: {
              include: {
                product: {
                  include: {
                    artisan: {
                      include: { user: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!claim || !claim.order) {
      return { error: "Claim or order not found" };
    }

    const returnableStatuses = [
      "PENDING",
      "INVESTIGATING",
      "WAITING_CUSTOMER",
      "WAITING_COURIER",
      "RETURN_REQUESTED",
      "REFUND_APPROVED",
      "APPROVED",
      "REFUND_PROCESSING",
    ];
    if (!returnableStatuses.includes(claim.status)) {
      return {
        error:
          "A return pickup can only be booked on active refund/claim cases before final completion or rejection.",
      };
    }
    if (claim.returnTrackingNumber) {
      return { error: `A return shipment (${claim.returnTrackingNumber}) is already active on this claim.` };
    }

    const targetItems = claim.orderItem
      ? [claim.orderItem]
      : claim.order.items.filter((i) => !["CANCELLED", "REFUNDED"].includes(i.status));
    if (targetItems.length === 0) {
      return { error: "No active items found to book a return pickup for." };
    }

    const primaryArtisan = targetItems[0]?.product?.artisan;
    const uniqueArtisanIds = new Set(targetItems.map((i) => i.product?.artisanId).filter(Boolean));
    if (mode === "JT_EXPRESS" && uniqueArtisanIds.size > 1) {
      return { error: "Multi-artisan order returns require per-item claims or manual return tracking." };
    }

    const cancelledReturnCount = claim.events?.length || 0;
    let resolvedTracking = trackingNumber?.trim() || "";
    let resolvedCarrier = carrier?.trim() || "J&T Express";
    let logisticId =
      cancelledReturnCount > 0
        ? `${claim.order.id}-RET-${claim.id.slice(-5)}-R${cancelledReturnCount + 1}`
        : `${claim.order.id}-RET-${claim.id.slice(-5)}`;

    if (mode === "JT_EXPRESS") {
      if (!isJtConfigured()) {
        return {
          error:
            lang === "ar"
              ? "إعدادات J&T Express غير مفعلة حالياً على الخادم."
              : "J&T Express API credentials are not configured.",
        };
      }

      if (!claim.order.shippingAddress) {
        return { error: "Customer pickup address is missing on this order." };
      }
      const phoneDigits = (claim.order.clientPhone || "").replace(/[^0-9]/g, "");
      if (phoneDigits.length < 8) {
        return { error: "Customer phone number is required for J&T Express return pickup." };
      }

      const {
        firstName,
        lastName,
        dropOffCityName,
        cleanDeliveryInstructions,
      } = buildJtCustomerPayload(claim.order);
      // Reverse direction: Customer (pickup) -> Artisan Workshop (return receiver).
      const { pickupPayload: artisanAddress, senderPayload: artisanParty } =
        buildJtArtisanOrigin(primaryArtisan);

      const summary = targetItems.map((i) => `${i.quantity}x ${i.product.name}`).join(", ");
      const itemCount = targetItems.reduce((sum, i) => sum + i.quantity, 0);

      const preferredReturnExpressType = process.env.JT_RETURN_EXPRESS_TYPE || "DR";
      const baseReverseOrder = {
        txlogisticId: logisticId,
        cod: 0, // Return pickups never collect money from the workshop or customer
        payType: "PP_PM",
        sender: {
          firstName,
          lastName,
          phone: claim.order.clientPhone!,
          email: claim.order.clientEmail || claim.order.user?.email || undefined,
        },
        pickupAddress: {
          firstLine: claim.order.shippingAddress,
          prov: dropOffCityName,
          city: dropOffCityName,
          area: dropOffCityName,
        },
        receiver: {
          firstName: artisanParty?.firstName || "Giftisan Artisan",
          phone: artisanParty?.phone || process.env.JT_SENDER_PHONE || "01000000000",
          email: artisanParty?.email,
        },
        dropOffAddress: artisanAddress || {
          firstLine: process.env.JT_SENDER_ADDRESS || "Cairo, Egypt",
          prov: process.env.JT_SENDER_PROV || "Cairo",
          city: process.env.JT_SENDER_CITY || "Cairo",
          area: process.env.JT_SENDER_AREA || "Cairo",
        },
        notes: [
          `RETURN PICKUP Claim #${claim.id.slice(-6)}`,
          cleanDeliveryInstructions ? `Customer: ${cleanDeliveryInstructions}` : "",
          primaryArtisan?.pickupNotes ? `Workshop: ${primaryArtisan.pickupNotes}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
        itemsCount: itemCount,
        description: `Return: ${summary}`.slice(0, 100),
        exdrDescription: `Return Pickup (Claim #${claim.id.slice(-6)}): ${summary}`.slice(0, 500),
        items: targetItems.map((i) => ({
          itemName: `Return: ${i.product.name}`,
          number: i.quantity,
          itemValue: 0,
          priceCurrency: "EGP",
          desc: i.product.name,
        })),
      };

      const isDuplicateJtError = (message: string) => {
        const lower = message.toLowerCase();
        return (
          lower.includes("duplicate") ||
          lower.includes("already exists") ||
          lower.includes("repeat") ||
          message.includes("订单重复") ||
          message.includes("无需重复")
        );
      };

      const shouldFallbackToEz = (message: string) => {
        const msg = message.toLowerCase();
        return (
          preferredReturnExpressType !== "EZ" &&
          !isDuplicateJtError(message) &&
          (msg.includes("expresstype") ||
            msg.includes("express") ||
            msg.includes("product") ||
            msg.includes("parameter") ||
            msg.includes("exdr") ||
            msg.includes("dr order") ||
            msg.includes("ex order") ||
            msg.includes("support") ||
            msg.includes("not open") ||
            msg.includes("permission"))
        );
      };

      let jtResult;
      try {
        jtResult = await createJtOrder({
          ...baseReverseOrder,
          expressType: preferredReturnExpressType,
        });
      } catch (err: any) {
        const message = err?.message || "";
        // Recover active waybill if addOrder previously succeeded before DB write completed
        if (isDuplicateJtError(message)) {
          const existingQuery = await queryJtOrders(logisticId, 1);
          const existingList = Array.isArray(existingQuery?.data)
            ? existingQuery.data
            : existingQuery?.data
              ? [existingQuery.data]
              : [];
          const existingOrder = existingList.find(
            (o: any) => Number(o?.orderStatus) !== 104
          );
          const existingBillCode = String(
            existingOrder?.billCode || existingOrder?.waybillNo || ""
          );
          if (!existingBillCode) throw err;
          jtResult = {
            deliveryId: String(existingOrder?.txlogisticId || logisticId),
            trackingNumber: existingBillCode,
          };
        } else if (shouldFallbackToEz(message)) {
          // Many J&T Egypt merchant contracts only activate "EZ" standard pickup rather than "DR"
          jtResult = await createJtOrder({
            ...baseReverseOrder,
            exdrDescription: undefined,
            expressType: "EZ",
          });
        } else {
          throw err;
        }
      }

      resolvedTracking = String(jtResult.trackingNumber || "");
      if (!resolvedTracking) {
        return { error: "J&T Express did not return a return tracking number." };
      }
      logisticId = String(jtResult.deliveryId || logisticId);
      resolvedCarrier = "J&T Express";
    } else if (!resolvedTracking || !resolvedCarrier) {
      return {
        error:
          lang === "ar"
            ? "يرجى إدخال شركة الشحن ورقم تتبع المرتجع."
            : "Please enter the return courier and tracking number.",
      };
    }

    const cleanNote = note?.trim() || "";
    const meta = `[Return Pickup via ${resolvedCarrier} | Tracking: ${resolvedTracking} | COD: EGP 0]`;
    const eventNote = [cleanNote, meta].filter(Boolean).join(" ");

    const payoutStageStatuses = ["REFUND_APPROVED", "APPROVED", "REFUND_PROCESSING"];
    const nextStatus = payoutStageStatuses.includes(claim.status)
      ? claim.status
      : "RETURN_REQUESTED";

    const updatedClaim = await prisma.$transaction(async (tx) => {
      const res = await tx.refundRequest.updateMany({
        where: { id: claim.id, status: claim.status, returnTrackingNumber: null },
        data: {
          status: nextStatus as any,
          returnTrackingNumber: resolvedTracking,
          returnCarrier: resolvedCarrier,
          returnLogisticId: mode === "JT_EXPRESS" ? logisticId : null,
          returnShippedAt: new Date(),
          ...(cleanNote ? { adminNote: cleanNote } : {}),
        },
      });
      if (res.count === 0) {
        throw new Error("Return pickup was already booked or claim status changed.");
      }

      await tx.refundRequestEvent.create({
        data: {
          refundRequestId: claim.id,
          actorUserId: session.user.id,
          fromStatus: claim.status,
          toStatus: nextStatus,
          note: eventNote,
        },
      });

      return tx.refundRequest.findUnique({
        where: { id: claim.id },
        include: { events: { orderBy: { createdAt: "asc" } } },
      });
    });

    const customerEmail = claim.user?.email || claim.order.clientEmail;
    const customerName = claim.user?.name || "Valued Client";
    if (customerEmail) {
      await sendRefundResolvedEmail({
        email: customerEmail,
        customerName,
        orderId: claim.orderId,
        status: nextStatus as any,
        adminNote: cleanNote || claim.adminNote || undefined,
        returnTrackingNumber: resolvedTracking,
        returnCarrier: resolvedCarrier,
        lang,
      }).catch((err) => console.error("[Return Pickup Email Error]:", err));
    }

    revalidateShippingOrderPaths();
    return {
      success: true,
      claim: updatedClaim,
      trackingNumber: resolvedTracking,
      carrier: resolvedCarrier,
    };
  } catch (error: any) {
    console.error("[dispatchReturnPickupAction Error]:", error);
    return { error: error.message || "Failed to book return pickup" };
  }
}

/**
 * Syncs live J&T Express tracking for a return pickup parcel (`Buyer -> Artisan`) and marks
 * `returnReceivedAt` once J&T confirms delivery to the artisan workshop.
 */
export async function syncReturnTrackingAction(claimId: string, lang: "ar" | "en" = "en") {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const claim = await prisma.refundRequest.findUnique({
      where: { id: claimId },
      include: {
        orderItem: { include: { product: true } },
        order: { include: { items: { include: { product: true } } } },
      },
    });
    if (!claim) {
      return { error: "Claim not found" };
    }

    const isAdmin = session.user.role === "ADMIN";
    const isBuyer = claim.userId === session.user.id || claim.order?.userId === session.user.id;
    let isOwningArtisan = false;
    if (!isAdmin && !isBuyer && session.user.role === "ARTISAN") {
      const artisan = await prisma.artisanProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (artisan) {
        isOwningArtisan = Boolean(
          claim.orderItem?.product?.artisanId === artisan.id ||
          claim.order?.items?.some((i) => i.product?.artisanId === artisan.id)
        );
      }
    }
    if (!isAdmin && !isBuyer && !isOwningArtisan) {
      return { error: "Unauthorized" };
    }

    if (!claim.returnTrackingNumber) {
      return { error: "No return tracking number has been booked yet." };
    }

    const traceRes = await getJtTracking(claim.returnTrackingNumber);
    const normalized = normalizeJtTraceResponse(claim.returnTrackingNumber, traceRes);

    let updatedClaim: any = claim;
    if (normalized.delivered && !claim.returnReceivedAt) {
      updatedClaim = await prisma.$transaction(async (tx) => {
        const res = await tx.refundRequest.updateMany({
          where: { id: claim.id, returnReceivedAt: null },
          data: { returnReceivedAt: new Date() },
        });
        if (res.count > 0) {
          await tx.refundRequestEvent.create({
            data: {
              refundRequestId: claim.id,
              actorUserId: session.user.id,
              fromStatus: claim.status,
              toStatus: claim.status,
              note: `[Return parcel delivered to artisan via J&T Express (${claim.returnTrackingNumber})]`,
            },
          });
        }
        return tx.refundRequest.findUnique({
          where: { id: claim.id },
          include: { events: { orderBy: { createdAt: "asc" } } },
        });
      });
      revalidateShippingOrderPaths();
    }

    return {
      success: true,
      claim: updatedClaim,
      delivered: normalized.delivered,
      outForDelivery: normalized.outForDelivery,
      latestScan: {
        scanType: normalized.latestScanType || (lang === "ar" ? "في الطريق" : "In Transit"),
        desc:
          normalized.latestDesc ||
          (lang === "ar" ? "شحنة الإرجاع مسجلة لدى شركة الشحن" : "Return pickup registered with courier"),
        time: normalized.latestTime || "",
      },
      events: normalized.events,
    };
  } catch (error: any) {
    console.error("[syncReturnTrackingAction Error]:", error);
    return { error: error.message || "Failed to sync return tracking" };
  }
}

/**
 * Cancels an unpicked replacement or return J&T Express booking and clears its claim tracking fields.
 */
export async function cancelClaimJtShipmentAction({
  claimId,
  kind,
  reason = "Cancelled by Admin",
}: {
  claimId: string;
  kind: "REPLACEMENT" | "RETURN";
  reason?: string;
}) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "Unauthorized: Admin privileges required" };
    }

    const claim = await prisma.refundRequest.findUnique({
      where: { id: claimId },
    });
    if (!claim) {
      return { error: "Claim not found" };
    }

    const billCode =
      kind === "REPLACEMENT" ? claim.replacementTrackingNumber : claim.returnTrackingNumber;
    if (!billCode) {
      return { error: `No ${kind.toLowerCase()} J&T tracking number found on this claim.` };
    }
    if (kind === "REPLACEMENT" && claim.status === "REPLACEMENT_DELIVERED") {
      return { error: "Cannot cancel a replacement shipment that has already been delivered." };
    }
    if (kind === "RETURN" && claim.returnReceivedAt) {
      return { error: "Cannot cancel a return pickup that has already been delivered." };
    }

    const carrier = kind === "REPLACEMENT" ? claim.replacementCarrier : claim.returnCarrier;
    const isJt = !carrier || /j&t|jt/i.test(carrier);
    const txId =
      (kind === "REPLACEMENT" ? claim.replacementLogisticId : claim.returnLogisticId) ||
      `${claim.orderId}-${kind === "REPLACEMENT" ? "REP" : "RET"}-${claim.id.slice(-5)}`;

    if (isJt) {
      await cancelJtOrder(txId, reason, 1, billCode);
    }

    const updatedClaim = await prisma.$transaction(async (tx) => {
      const nextStatus =
        kind === "REPLACEMENT" && claim.status === "REPLACEMENT_SHIPPED"
          ? "REPLACEMENT_APPROVED"
          : claim.status;

      await tx.refundRequest.update({
        where: { id: claim.id },
        data:
          kind === "REPLACEMENT"
            ? {
                status: nextStatus,
                replacementTrackingNumber: null,
                replacementCarrier: null,
                replacementLogisticId: null,
                replacementShippedAt: null,
              }
            : {
                returnTrackingNumber: null,
                returnCarrier: null,
                returnLogisticId: null,
                returnShippedAt: null,
              },
      });

      await tx.refundRequestEvent.create({
        data: {
          refundRequestId: claim.id,
          actorUserId: session.user.id,
          fromStatus: claim.status,
          toStatus: nextStatus,
          note: `[Cancelled ${kind === "REPLACEMENT" ? "replacement" : "return pickup"} shipment ${billCode}]`,
        },
      });

      return tx.refundRequest.findUnique({
        where: { id: claim.id },
        include: { events: { orderBy: { createdAt: "asc" } } },
      });
    });

    revalidateShippingOrderPaths();
    return { success: true, claim: updatedClaim };
  } catch (error: any) {
    console.error("[cancelClaimJtShipmentAction Error]:", error);
    return { error: error.message || "Failed to cancel claim shipment" };
  }
}
