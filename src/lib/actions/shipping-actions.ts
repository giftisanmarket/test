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
  isJtStatusDelivered,
} from "@/lib/jt-express";
import { matchEgyptGovernorate } from "@/lib/egypt-governorates";
import { sendOrderStatusUpdateEmail } from "@/lib/mail";

function roundCurrency(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
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
                artisan: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return { error: "Order not found" };
    }

    if (order.status === "SHIPPED" || order.status === "DELIVERED") {
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

    // Determine clean customer drop-off city name
    const matchedCustomerGov = matchEgyptGovernorate(
      {},
      order.shippingCity || order.shippingAddress
    );
    const dropOffCityName =
      matchedCustomerGov?.nameEn || order.shippingCity || "Cairo";

    // Extract buyer/recipient name cleanly for both registered and guest orders
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
    const createdTrackings: string[] = [];

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

      // Determine clean pickup address & sender from artisan profile (if configured)
      let pickupPayload: any = undefined;
      let senderPayload: any = undefined;
      if (artisan?.pickupAddress) {
        const matchedArtisanGov = matchEgyptGovernorate(
          {},
          artisan.pickupCity || artisan.pickupAddress
        );
        const artCity =
          matchedArtisanGov?.nameEn || artisan.pickupCity || "Cairo";
        pickupPayload = {
          firstLine: `${artisan.pickupAddress}${
            artisan.pickupBuilding ? `, Building: ${artisan.pickupBuilding}` : ""
          }${artisan.pickupDistrict ? `, District: ${artisan.pickupDistrict}` : ""}`,
          prov: artCity,
          city: artCity,
          area: artisan.pickupDistrict || artCity,
          district: artisan.pickupDistrict || undefined,
        };
        senderPayload = {
          firstName: artisan.studioName || artisan.name || "Giftisan Artisan",
          phone: artisan.phone || process.env.JT_SENDER_PHONE || "01000000000",
          email: artisan.email || undefined,
        };
      }

      // Never print private gift messages on outer courier waybills
      const cleanDeliveryInstructions = (order.orderNotes || "")
        .replace(/\[(COD - Cash on Delivery|Paymob Online)\]/gi, "")
        .replace(/\[Gift Note:[^\]]*\]/gi, "")
        .replace(/\[Customer:[^\]]*\]/gi, "")
        .trim();

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

        const itemIds = group.items.map((i) => i.id);
        await prisma.orderItem.updateMany({
          where: { id: { in: itemIds } },
          data: {
            status: "SHIPPED",
            carrier: "J&T Express",
            trackingNumber,
          },
        });
      }
    }

    if (createdTrackings.length === 0) {
      return { error: "Failed to generate tracking numbers with J&T Express." };
    }

    const primaryTracking = createdTrackings.join(", ");

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "SHIPPED",
        carrier: "J&T Express",
        trackingNumber: primaryTracking,
      },
    });

    const recipientEmail = order.user?.email || order.clientEmail;
    if (recipientEmail) {
      sendOrderStatusUpdateEmail(
        recipientEmail,
        customerName,
        order.id,
        "SHIPPED",
        shippableItems[0]?.product?.name || "Your gift package",
        shippableItems[0]?.product?.slug || undefined,
        primaryTracking,
        "J&T Express"
      ).catch((err) =>
        console.error("[J&T Express Shipping Action] Email notification error:", err)
      );
    }

    revalidatePath("/admin", "layout");
    revalidatePath("/admin/orders");
    revalidatePath("/studio");
    revalidatePath("/profile");

    return {
      success: true,
      trackingNumber: primaryTracking,
      trackings: createdTrackings,
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
    if (session?.user?.role !== "ADMIN") {
      return { error: "Unauthorized" };
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

    const txlogisticIds = new Set<string>();
    txlogisticIds.add(orderIdOrTxLogisticId);

    if (order) {
      txlogisticIds.add(order.id);
      const artisanIds = new Set(
        order.items.map((i) => i.product?.artisanId || "platform")
      );
      if (artisanIds.size > 1) {
        for (const artId of artisanIds) {
          txlogisticIds.add(`${order.id}-${artId.slice(-4)}`);
        }
      }
    }

    // Call J&T API cancellation for all associated txlogisticIds
    const results: any[] = [];
    const billCode = order?.trackingNumber
      ? String(order.trackingNumber).split(",")[0].trim()
      : undefined;
    for (const txId of txlogisticIds) {
      try {
        const res = await cancelJtOrder(txId, reason, 1, billCode);
        results.push(res);
      } catch (err: any) {
        console.warn(`[cancelJtOrder] warning for ${txId}:`, err.message);
      }
    }

    // Revert local order state if order was found in DB
    if (order) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PROCESSING",
          trackingNumber: null,
          carrier: null,
        },
      });

      await prisma.orderItem.updateMany({
        where: { orderId: order.id },
        data: {
          status: "PROCESSING",
          trackingNumber: null,
          carrier: null,
        },
      });

      revalidatePath("/admin", "layout");
      revalidatePath("/admin/orders");
      revalidatePath("/studio");
      revalidatePath("/profile");
    }

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

    if (!order.trackingNumber) {
      return { error: "No tracking number on this order to sync" };
    }

    const firstTracking = order.trackingNumber.split(",")[0].trim();
    const traceRes = await getJtTracking(firstTracking);

    // Parse scan traces
    let rawTraces: any[] = [];
    if (Array.isArray(traceRes?.data)) {
      rawTraces = traceRes.data[0]?.details || traceRes.data;
    } else if (Array.isArray(traceRes?.data?.details)) {
      rawTraces = traceRes.data.details;
    } else if (Array.isArray(traceRes?.details)) {
      rawTraces = traceRes.details;
    }

    const latestScan = rawTraces[0] || null;
    const scanType = latestScan?.scanType || latestScan?.status || "";
    const scanDesc =
      latestScan?.desc ||
      latestScan?.scandesc ||
      latestScan?.scanTypeName ||
      "";
    const scanTime = latestScan?.scanTime || latestScan?.time || "";

    const isDelivered =
      isJtStatusDelivered(scanType) || isJtStatusDelivered(scanDesc);

    let updatedStatus = order.status;
    if (isDelivered && order.status !== "DELIVERED") {
      updatedStatus = "DELIVERED";
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "DELIVERED" },
      });
      await prisma.orderItem.updateMany({
        where: { orderId: order.id },
        data: { status: "DELIVERED" },
      });

      const recipientEmail = order.user?.email || order.clientEmail;
      if (recipientEmail) {
        sendOrderStatusUpdateEmail(
          recipientEmail,
          order.user?.name || "Valued Customer",
          order.id,
          "DELIVERED",
          order.items[0]?.product?.name || "Your order",
          order.items[0]?.product?.slug || undefined,
          order.trackingNumber,
          order.carrier || "J&T Express"
        ).catch(() => {});
      }

      revalidatePath("/admin", "layout");
      revalidatePath("/admin/orders");
      revalidatePath("/studio");
      revalidatePath("/profile");
    }

    return {
      success: true,
      currentStatus: updatedStatus,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      latestScan: {
        scanType: scanType || "In Transit",
        desc: scanDesc || "Tracking active with J&T Express",
        time: scanTime,
      },
      tracesCount: rawTraces.length,
      raw: traceRes,
    };
  } catch (error: any) {
    console.error("[syncJtOrderStatusAction Error]:", error);
    return { error: error.message || "Failed to sync status from J&T Express" };
  }
}
