"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { createBostaDelivery, getBostaAWB } from "@/lib/bosta";
import { matchEgyptGovernorate } from "@/lib/egypt-governorates";
import { sendOrderStatusUpdateEmail } from "@/lib/mail";

/**
 * Creates Bosta shipments for an order, grouping items by artisan
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
                artisan: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return { error: "Order not found" };
    }

    if (!order.shippingAddress) {
      return { error: "Shipping address is missing for this order" };
    }

    if (!order.clientPhone && !order.user?.email) {
      return { error: "Customer phone number is required for Bosta shipping" };
    }

    // Determine clean customer drop-off city name
    const matchedCustomerGov = matchEgyptGovernorate({}, order.shippingCity || order.shippingAddress);
    const dropOffCityName = matchedCustomerGov?.nameEn || order.shippingCity || "Cairo";

    const customerName = order.user?.name || "Giftisan Customer";
    const nameParts = customerName.trim().split(" ");
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Group items by artisan to create tailored Bosta shipments per artisan pickup location
    const artisanGroups = new Map<string, { artisan: any; items: typeof order.items }>();
    for (const item of order.items) {
      const artId = item.product.artisanId || "platform";
      if (!artisanGroups.has(artId)) {
        artisanGroups.set(artId, { artisan: item.product.artisan, items: [] });
      }
      artisanGroups.get(artId)!.items.push(item);
    }

    const createdTrackings: string[] = [];

    // Process shipment creation for each artisan
    for (const [artisanId, group] of artisanGroups.entries()) {
      const artisan = group.artisan;
      const groupItemsSummary = group.items.map(i => `${i.quantity}x ${i.product.name}`).join(", ");
      const groupTotalCount = group.items.reduce((sum, item) => sum + item.quantity, 0);

      // Determine clean pickup address from artisan profile (if configured)
      let pickupPayload: any = undefined;
      if (artisan?.pickupAddress) {
        const matchedArtisanGov = matchEgyptGovernorate({}, artisan.pickupCity || artisan.pickupAddress);
        pickupPayload = {
          firstLine: `${artisan.pickupAddress}${artisan.pickupBuilding ? `, Building: ${artisan.pickupBuilding}` : ""}${artisan.pickupDistrict ? `, District: ${artisan.pickupDistrict}` : ""}`,
          city: matchedArtisanGov?.nameEn || artisan.pickupCity || "Cairo",
          district: artisan.pickupDistrict || undefined,
        };
      }

      // Call Bosta API for this artisan's parcel
      const bostaResult = await createBostaDelivery({
        type: 10, // Standard delivery
        cod: 0, // Online prepaid
        businessReference: `${order.id}${artisanGroups.size > 1 ? `-${artisanId.slice(-4)}` : ""}`,
        receiver: {
          firstName,
          lastName,
          phone: order.clientPhone || "01000000000",
          email: order.clientEmail || order.user?.email || undefined
        },
        dropOffAddress: {
          firstLine: order.shippingAddress,
          city: dropOffCityName,
        },
        pickupAddress: pickupPayload,
        notes: [
          (() => {
            const cleanNotes = (order.orderNotes || "")
              .replace(/\[(COD - Cash on Delivery|Paymob Online)\]/gi, "")
              .replace(/\[Gift Note:[^\]]*\]/gi, "")
              .trim();
            return cleanNotes ? `Customer Instructions: ${cleanNotes}` : "";
          })(),
          order.isGift ? `Gift Message: ${order.giftMessage}` : "",
          artisan?.pickupNotes ? `Pickup note: ${artisan.pickupNotes}` : ""
        ].filter(Boolean).join(" | "),
        itemsCount: groupTotalCount,
        description: groupItemsSummary.slice(0, 100) || "Handmade Giftisan Products"
      });

      const trackingNumber = String(bostaResult.trackingNumber);
      if (trackingNumber) {
        createdTrackings.push(trackingNumber);

        // Update items belonging to this artisan
        const itemIds = group.items.map(i => i.id);
        await prisma.orderItem.updateMany({
          where: { id: { in: itemIds } },
          data: {
            status: "SHIPPED",
            carrier: "Bosta",
            trackingNumber: trackingNumber
          }
        });
      }
    }

    if (createdTrackings.length === 0) {
      return { error: "Failed to generate tracking numbers with Bosta." };
    }

    const primaryTracking = createdTrackings.join(", ");

    // Update parent order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "SHIPPED",
        carrier: "Bosta",
        trackingNumber: primaryTracking
      }
    });

    // Send customer shipping email notification
    const recipientEmail = order.user?.email || order.clientEmail;
    if (recipientEmail) {
      sendOrderStatusUpdateEmail(
        recipientEmail,
        customerName,
        order.id,
        "SHIPPED",
        order.items[0]?.product?.name || "Your gift package",
        order.items[0]?.product?.slug || undefined,
        primaryTracking,
        "Bosta"
      ).catch(err => console.error("[Bosta Shipping Action] Email notification error:", err));
    }

    revalidatePath("/admin", "layout");
    revalidatePath("/admin/orders");
    revalidatePath("/studio");
    revalidatePath("/profile");

    return { 
      success: true, 
      trackingNumber: primaryTracking,
      trackings: createdTrackings
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
