import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { sendOrderStatusUpdateEmail } from "@/lib/mail";
import { safeCompareSecrets } from "@/lib/security";

/**
 * SECURE SHIPPING & LOGISTICS WEBHOOK ENDPOINT
 * Path: POST /api/shipping/webhook
 */
export async function POST(req: Request) {
  try {
    const configuredSecret =
      process.env.SHIPPING_WEBHOOK_SECRET || process.env.BOSTA_WEBHOOK_SECRET;
    if (!configuredSecret) {
      return NextResponse.json(
        { error: "Shipping webhook secret is not configured" },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : authHeader.trim();
    const webhookHeader = req.headers.get("x-webhook-secret") || "";

    if (
      !safeCompareSecrets(bearerToken, configuredSecret) &&
      !safeCompareSecrets(webhookHeader, configuredSecret)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const { event, trackingNumber, orderId, itemId, status, carrier } = body;

    console.log(
      `[Shipping Webhook] Event: "${event || "update"}" | Tracking: "${trackingNumber || "N/A"}" | Status: "${status}"`
    );

    const isDelivered =
      status?.toUpperCase() === "DELIVERED" ||
      event === "order.delivered" ||
      event === "shipment.delivered";

    if (!isDelivered) {
      return NextResponse.json({
        success: true,
        message: "Status update logged. No financial escrow trigger necessary.",
      });
    }

    let targetItems: any[] = [];

    if (trackingNumber) {
      targetItems = await prisma.orderItem.findMany({
        where: { trackingNumber: String(trackingNumber) },
        include: { product: true, order: { include: { user: true } } },
      });
    } else if (itemId) {
      const singleItem = await prisma.orderItem.findUnique({
        where: { id: String(itemId) },
        include: { product: true, order: { include: { user: true } } },
      });
      if (singleItem) targetItems = [singleItem];
    } else if (orderId) {
      targetItems = await prisma.orderItem.findMany({
        where: { orderId: String(orderId) },
        include: { product: true, order: { include: { user: true } } },
      });
    }

    if (targetItems.length === 0) {
      return NextResponse.json(
        {
          error: "Resource not found",
          details: "Could not map trackingNumber, itemId, or orderId to any database record.",
        },
        { status: 404 }
      );
    }

    const updatedItemIds: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const item of targetItems) {
        if (
          item.status === "DELIVERED" ||
          item.status === "CANCELLED" ||
          item.status === "REFUNDED"
        ) {
          continue;
        }

        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            status: "DELIVERED",
            carrier: carrier || item.carrier || "Carrier Link",
          },
        });

        updatedItemIds.push(item.id);

        await tx.artisanTransaction.updateMany({
          where: {
            orderId: item.orderId,
            artisanId: item.product.artisanId,
            type: "SALE",
            status: "PENDING",
          },
          data: {
            createdAt: new Date(),
          },
        });

        const buyerEmail = item.order?.user?.email || item.order?.clientEmail;
        if (buyerEmail) {
          sendOrderStatusUpdateEmail(
            buyerEmail,
            item.order?.user?.name || "Customer",
            item.orderId,
            "DELIVERED",
            item.product.name,
            item.product.slug || undefined,
            trackingNumber || item.trackingNumber || "Hand Delivered",
            carrier || item.carrier || "Private Runner"
          ).catch((err) =>
            console.error(
              `[Shipping Webhook] Failed to send delivery email for item ${item.id}:`,
              err
            )
          );
        }
      }

      const uniqueOrderIds = Array.from(new Set(targetItems.map((i) => i.orderId)));
      for (const oid of uniqueOrderIds) {
        const parentOrder = await tx.order.findUnique({
          where: { id: oid },
          include: { items: true },
        });

        if (parentOrder && parentOrder.status !== "DELIVERED") {
          const allDelivered = parentOrder.items.every(
            (i) => i.status === "DELIVERED" || updatedItemIds.includes(i.id)
          );
          if (allDelivered) {
            await tx.order.update({
              where: { id: parentOrder.id },
              data: { status: "DELIVERED" },
            });
          }
        }
      }
    });

    revalidatePath("/en/studio");
    revalidatePath("/ar/studio");
    revalidatePath("/en/profile");
    revalidatePath("/ar/profile");
    revalidatePath("/en/admin/orders");
    revalidatePath("/ar/admin/orders");

    return NextResponse.json({
      success: true,
      message: "Delivery status verified and escrow clocks initiated successfully.",
      updatedItemsCount: updatedItemIds.length,
      itemIds: updatedItemIds,
    });
  } catch (err: any) {
    console.error("[Shipping Webhook] Processing error:", err);
    return NextResponse.json(
      {
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
