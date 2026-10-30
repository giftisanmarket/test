import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sendOrderStatusUpdateEmail } from "@/lib/mail";
import { revalidatePath } from "next/cache";
import { safeCompareSecrets } from "@/lib/security";

const BOSTA_DELIVERED_STATUSES = ["Delivered", "DELIVERED", "delivered"];

function isWebhookAuthorized(req: NextRequest): boolean {
  const configuredSecret =
    process.env.BOSTA_WEBHOOK_SECRET || process.env.SHIPPING_WEBHOOK_SECRET;
  if (!configuredSecret) return false;

  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim();
  const customHeader =
    req.headers.get("x-bosta-secret") || req.headers.get("x-webhook-secret") || "";

  return (
    safeCompareSecrets(bearerToken, configuredSecret) ||
    safeCompareSecrets(customHeader, configuredSecret)
  );
}

export async function POST(req: NextRequest) {
  try {
    if (!isWebhookAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized webhook request" }, { status: 401 });
    }

    const data = await req.json();

    const trackingNumber =
      data.trackingNumber || data.data?.trackingNumber || data.data?.trackingId || data._id;
    const businessReference = data.businessReference || data.data?.businessReference;
    const rawStatus =
      data.status ||
      data.state?.value ||
      data.state ||
      data.data?.status ||
      data.data?.state?.value ||
      data.data?.state ||
      data.event;

    if (!trackingNumber && !businessReference) {
      return NextResponse.json(
        { error: "Missing trackingNumber or businessReference in payload" },
        { status: 400 }
      );
    }

    const isDelivered =
      BOSTA_DELIVERED_STATUSES.includes(rawStatus) ||
      (typeof rawStatus === "string" && rawStatus.toLowerCase().includes("deliver"));

    if (isDelivered) {
      const updated = await markItemsAsDelivered(
        trackingNumber ? String(trackingNumber) : undefined,
        businessReference ? String(businessReference) : undefined
      );
      if (updated) {
        return NextResponse.json({
          success: true,
          message: "Order items updated to DELIVERED and escrow countdown initiated.",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Received state '${rawStatus}', no delivery update needed.`,
    });
  } catch (error: any) {
    console.error("[Bosta Webhook Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Admin-only live Bosta tracking sync endpoint
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN" && !isWebhookAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const trackingId =
      searchParams.get("trackingId") || searchParams.get("trackingNumber");
    const orderId = searchParams.get("orderId");

    if (!trackingId) {
      return NextResponse.json(
        { error: "Missing trackingId query parameter for live Bosta verification" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.bosta.co/shipments/track/${encodeURIComponent(trackingId)}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: "Tracking record not found on Bosta's servers",
      });
    }

    const data = await response.json();
    const rawState = data.state?.value || data.state || data.status;
    const isDelivered =
      BOSTA_DELIVERED_STATUSES.includes(rawState) ||
      (typeof rawState === "string" && rawState.toLowerCase().includes("deliver"));

    if (isDelivered) {
      const updated = await markItemsAsDelivered(trackingId, orderId || undefined);
      if (updated) {
        return NextResponse.json({ success: true, status: "DELIVERED", synced: true });
      }
    }

    return NextResponse.json({
      success: true,
      status: rawState || "SHIPPED",
      synced: false,
    });
  } catch (error: any) {
    console.error("[Bosta GET Sync Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function markItemsAsDelivered(trackingNumber?: string, businessReference?: string) {
  let matchingItems = trackingNumber
    ? await prisma.orderItem.findMany({
        where: { trackingNumber },
        include: {
          order: { include: { user: true } },
          product: true,
        },
      })
    : [];

  if (matchingItems.length === 0) {
    const parentOrder = await prisma.order.findFirst({
      where: {
        OR: [
          ...(trackingNumber ? [{ trackingNumber }] : []),
          ...(businessReference ? [{ id: businessReference }] : []),
        ],
      },
    });

    if (parentOrder) {
      matchingItems = await prisma.orderItem.findMany({
        where: { orderId: parentOrder.id },
        include: {
          order: { include: { user: true } },
          product: true,
        },
      });
    }
  }

  if (matchingItems.length === 0) {
    return false;
  }

  const undeliveredItems = matchingItems.filter(
    (item) =>
      item.status !== "DELIVERED" &&
      item.status !== "CANCELLED" &&
      item.status !== "REFUNDED"
  );

  if (undeliveredItems.length === 0) {
    return false;
  }

  const orderId = undeliveredItems[0].orderId;
  const affectedArtisanIds = new Set<string>();

  await prisma.$transaction(async (tx) => {
    for (const item of undeliveredItems) {
      await tx.orderItem.update({
        where: { id: item.id },
        data: { status: "DELIVERED" },
      });
      affectedArtisanIds.add(item.product.artisanId);
    }

    for (const artisanId of affectedArtisanIds) {
      await tx.artisanTransaction.updateMany({
        where: {
          orderId,
          artisanId,
          type: "SALE",
          status: "PENDING",
        },
        data: {
          createdAt: new Date(),
        },
      });
    }

    const allOrderItems = await tx.orderItem.findMany({
      where: { orderId },
      select: { status: true },
    });
    const allDelivered = allOrderItems.every((i) => i.status === "DELIVERED");
    if (allDelivered) {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "DELIVERED" },
      });
    }
  });

  const sampleItem = undeliveredItems[0];
  const recipientEmail = sampleItem.order.user?.email || sampleItem.order.clientEmail;
  const recipientName = sampleItem.order.user?.name || "Customer";

  if (recipientEmail) {
    sendOrderStatusUpdateEmail(
      recipientEmail,
      recipientName,
      orderId,
      "DELIVERED",
      sampleItem.product.name,
      sampleItem.product.slug || undefined,
      trackingNumber || sampleItem.trackingNumber || undefined,
      sampleItem.carrier || "Bosta"
    ).catch((err) =>
      console.error("[Bosta Automation] Failed to send delivery email:", err)
    );
  }

  revalidatePath("/en/profile");
  revalidatePath("/ar/profile");
  revalidatePath("/en/studio");
  revalidatePath("/ar/studio");
  return true;
}
