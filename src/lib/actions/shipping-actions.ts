"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createBostaDelivery, getBostaAWB } from "@/lib/bosta";
import { matchEgyptGovernorate } from "@/lib/egypt-governorates";
import { sendOrderStatusUpdateEmail } from "@/lib/mail";

function roundCurrency(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Creates Bosta shipments for an order, grouping shippable items by artisan.
 * Handles accurate COD parcel collection and preserves gift message privacy.
 */
export async function shipOrderWithBosta(orderId: string) {
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
      return { error: `Cannot create a Bosta shipment for an order in ${order.status} status.` };
    }

    if (!order.shippingAddress) {
      return { error: "Shipping address is missing for this order" };
    }

    const phoneDigits = (order.clientPhone || "").replace(/[^0-9]/g, "");
    if (phoneDigits.length < 8) {
      return { error: "A valid customer phone number is required for Bosta shipping" };
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
    const dropOffCityName = matchedCustomerGov?.nameEn || order.shippingCity || "Cairo";

    // Extract buyer/recipient name cleanly for both registered and guest orders
    const noteCustomerMatch = order.orderNotes?.match(/\[Customer:\s*([^\]]+)\]/i);
    const extractedGuestName = noteCustomerMatch?.[1]?.trim();
    const emailLocalName = order.clientEmail ? order.clientEmail.split("@")[0] : "";
    const customerName =
      order.user?.name?.trim() || extractedGuestName || emailLocalName || "Giftisan Customer";
    const nameParts = customerName.trim().split(/\s+/);
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Group active items by artisan to create tailored Bosta shipments per artisan pickup location
    const artisanGroups = new Map<string, { artisan: any; items: typeof shippableItems }>();
    for (const item of shippableItems) {
      const artId = item.product.artisanId || "platform";
      if (!artisanGroups.has(artId)) {
        artisanGroups.set(artId, { artisan: item.product.artisan, items: [] });
      }
      artisanGroups.get(artId)!.items.push(item);
    }

    // Determine whether Bosta must collect Cash on Delivery across the order's parcel(s)
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
      const groupTotalCount = group.items.reduce((sum, item) => sum + item.quantity, 0);

      // Calculate exact COD amount for this parcel (0 for online Paymob orders)
      let parcelCod = 0;
      if (isCodOrder && remainingCod > 0) {
        if (idx === groupEntries.length - 1) {
          parcelCod = roundCurrency(remainingCod);
        } else {
          const groupGross = group.items.reduce((s, i) => s + i.price * i.quantity, 0);
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

      // Determine clean pickup address from artisan profile (if configured)
      let pickupPayload: any = undefined;
      if (artisan?.pickupAddress) {
        const matchedArtisanGov = matchEgyptGovernorate(
          {},
          artisan.pickupCity || artisan.pickupAddress
        );
        pickupPayload = {
          firstLine: `${artisan.pickupAddress}${
            artisan.pickupBuilding ? `, Building: ${artisan.pickupBuilding}` : ""
          }${artisan.pickupDistrict ? `, District: ${artisan.pickupDistrict}` : ""}`,
          city: matchedArtisanGov?.nameEn || artisan.pickupCity || "Cairo",
          district: artisan.pickupDistrict || undefined,
        };
      }

      // Never print private gift messages on outer courier waybills
      const cleanDeliveryInstructions = (order.orderNotes || "")
        .replace(/\[(COD - Cash on Delivery|Paymob Online)\]/gi, "")
        .replace(/\[Gift Note:[^\]]*\]/gi, "")
        .replace(/\[Customer:[^\]]*\]/gi, "")
        .trim();

      const bostaResult = await createBostaDelivery({
        type: 10, // Standard delivery
        cod: parcelCod,
        businessReference: `${order.id}${groupEntries.length > 1 ? `-${artisanId.slice(-4)}` : ""}`,
        receiver: {
          firstName,
          lastName,
          phone: order.clientPhone!,
          email: order.clientEmail || order.user?.email || undefined,
        },
        dropOffAddress: {
          firstLine: order.shippingAddress,
          city: dropOffCityName,
        },
        pickupAddress: pickupPayload,
        notes: [
          cleanDeliveryInstructions ? `Customer Instructions: ${cleanDeliveryInstructions}` : "",
          order.isGift ? "Gift Parcel: Do not disclose pricing on exterior" : "",
          artisan?.pickupNotes ? `Pickup note: ${artisan.pickupNotes}` : "",
        ]
          .filter(Boolean)
          .join(" | "),
        itemsCount: groupTotalCount,
        description: groupItemsSummary.slice(0, 100) || "Handmade Giftisan Products",
      });

      const trackingNumber = String(bostaResult.trackingNumber || "");
      if (trackingNumber) {
        createdTrackings.push(trackingNumber);

        const itemIds = group.items.map((i) => i.id);
        await prisma.orderItem.updateMany({
          where: { id: { in: itemIds } },
          data: {
            status: "SHIPPED",
            carrier: "Bosta",
            trackingNumber,
          },
        });
      }
    }

    if (createdTrackings.length === 0) {
      return { error: "Failed to generate tracking numbers with Bosta." };
    }

    const primaryTracking = createdTrackings.join(", ");

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "SHIPPED",
        carrier: "Bosta",
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
        "Bosta"
      ).catch((err) => console.error("[Bosta Shipping Action] Email notification error:", err));
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
    console.error("[shipOrderWithBosta Error]:", error);
    return { error: error.message || "Failed to create shipment on Bosta" };
  }
}

/**
 * Gets the Airway Bill (AWB) for an order from Bosta
 */
export async function getBostaAWBAction(deliveryIdOrTracking: string) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { error: "Unauthorized" };
    }

    const awbData = await getBostaAWB(deliveryIdOrTracking);
    return { success: true, data: awbData };
  } catch (error: any) {
    console.error("[getBostaAWBAction Error]:", error);
    return { error: error.message || "Failed to fetch Bosta AWB" };
  }
}
