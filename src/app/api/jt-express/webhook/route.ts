import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sendOrderStatusUpdateEmail } from "@/lib/mail";
import { revalidatePath } from "next/cache";
import { safeCompareSecrets } from "@/lib/security";
import {
  generateHeaderDigest,
  getJtTracking,
  isJtStatusDelivered,
} from "@/lib/jt-express";

function isWebhookAuthorized(req: NextRequest, rawBizContent?: string): boolean {
  // 1. Check J&T Express standard signature header (`digest` = base64(md5(bizContent + privateKey)))
  const jtPrivateKey =
    process.env.JT_PRIVATE_KEY || process.env.JTEXPRESS_PRIVATE_KEY;
  const headerDigest = req.headers.get("digest") || "";
  if (jtPrivateKey && headerDigest && rawBizContent) {
    const expectedDigest = generateHeaderDigest(rawBizContent, jtPrivateKey);
    if (safeCompareSecrets(headerDigest, expectedDigest)) {
      return true;
    }
  }

  // 2. Fallback to custom webhook secret headers
  const configuredSecret =
    process.env.JT_WEBHOOK_SECRET || process.env.SHIPPING_WEBHOOK_SECRET;
  if (!configuredSecret) return false;

  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim();
  const customHeader =
    req.headers.get("x-jt-secret") || req.headers.get("x-webhook-secret") || "";

  return (
    safeCompareSecrets(bearerToken, configuredSecret) ||
    safeCompareSecrets(customHeader, configuredSecret)
  );
}

/**
 * J&T Express Status Feedback Webhook (`orderserve/statusFeedback`)
 * Accepts `application/x-www-form-urlencoded` (`bizContent=<json>`) or JSON body.
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let rawBizContent: string | undefined;
    let data: any = {};

    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      rawBizContent = params.get("bizContent") || undefined;
      if (rawBizContent) {
        data = JSON.parse(rawBizContent);
      }
    } else {
      const bodyJson = await req.json().catch(() => ({}));
      if (typeof bodyJson.bizContent === "string") {
        rawBizContent = bodyJson.bizContent;
        data = JSON.parse(bodyJson.bizContent);
      } else if (bodyJson.bizContent && typeof bodyJson.bizContent === "object") {
        rawBizContent = JSON.stringify(bodyJson.bizContent);
        data = bodyJson.bizContent;
      } else {
        rawBizContent = JSON.stringify(bodyJson);
        data = bodyJson;
      }
    }

    if (!isWebhookAuthorized(req, rawBizContent)) {
      return NextResponse.json(
        { code: "0", msg: "Unauthorized webhook request", error: "Unauthorized webhook request" },
        { status: 401 }
      );
    }

    // J&T statusFeedback can send a single scan object or a details array inside bizContent
    const detailsList = Array.isArray(data.details) ? data.details : [];
    const latestDetail = detailsList[0] || {};

    const trackingNumber =
      data.billCode ||
      latestDetail.billCode ||
      data.trackingNumber ||
      data.data?.billCode ||
      data.data?.trackingNumber;
    const businessReference =
      data.txlogisticId ||
      latestDetail.txlogisticId ||
      data.businessReference ||
      data.data?.txlogisticId;
    const rawStatus =
      data.scanType ||
      latestDetail.scanType ||
      data.status ||
      data.state ||
      data.desc ||
      latestDetail.desc;

    if (!trackingNumber && !businessReference) {
      return NextResponse.json(
        {
          code: "0",
          msg: "Missing billCode or txlogisticId in payload",
          error: "Missing billCode or txlogisticId in payload",
        },
        { status: 400 }
      );
    }

    const isDelivered =
      isJtStatusDelivered(rawStatus) ||
      detailsList.some((d: any) =>
        isJtStatusDelivered(d.scanType || d.status || d.desc)
      );

    const s = String(rawStatus || "").toLowerCase();
    const isOutForDelivery =
      s.includes("dispatch") ||
      s.includes("out for delivery") ||
      s.includes("خرج للتوصيل") ||
      s.includes("派件") ||
      detailsList.some((d: any) => {
        const ds = String(d.scanType || d.status || d.desc || "").toLowerCase();
        return (
          ds.includes("dispatch") ||
          ds.includes("out for delivery") ||
          ds.includes("خرج للتوصيل") ||
          ds.includes("派件")
        );
      });

    if (isDelivered) {
      const baseOrderId = businessReference
        ? String(businessReference).split("-")[0]
        : undefined;
      const updated = await markItemsAsDelivered(
        trackingNumber ? String(trackingNumber) : undefined,
        baseOrderId
      );
      if (updated) {
        return NextResponse.json({
          code: "1",
          msg: "success",
          success: true,
          message:
            "Order items updated to DELIVERED and escrow countdown initiated.",
        });
      }
    } else if (isOutForDelivery) {
      const baseOrderId = businessReference
        ? String(businessReference).split("-")[0]
        : undefined;
      await markItemsAsOutForDelivery(
        trackingNumber ? String(trackingNumber) : undefined,
        baseOrderId
      );
      return NextResponse.json({
        code: "1",
        msg: "success",
        success: true,
        message: "Order updated to OUT_FOR_DELIVERY",
      });
    }

    return NextResponse.json({
      code: "1",
      msg: "success",
      success: true,
      message: `Received state '${rawStatus}', no delivery update needed.`,
    });
  } catch (error: any) {
    console.error("[J&T Express Webhook Error]:", error);
    return NextResponse.json(
      { code: "0", msg: "Internal Server Error", error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Admin-only live J&T Express tracking sync endpoint (`orderserve/expressquery`)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN" && !isWebhookAuthorized(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const trackingId =
      searchParams.get("billCode") ||
      searchParams.get("trackingId") ||
      searchParams.get("trackingNumber");
    const orderId = searchParams.get("orderId");

    if (!trackingId) {
      return NextResponse.json(
        {
          error:
            "Missing billCode / trackingId query parameter for live J&T Express verification",
        },
        { status: 400 }
      );
    }

    const traceResponse = await getJtTracking(trackingId);
    const traceData = Array.isArray(traceResponse.data)
      ? traceResponse.data[0]
      : traceResponse.data;
    const details = Array.isArray(traceData?.details) ? traceData.details : [];
    const latestScan = details[0] || {};
    const rawState =
      latestScan.scanType ||
      latestScan.status ||
      latestScan.desc ||
      traceData?.status;

    const isDelivered =
      isJtStatusDelivered(rawState) ||
      details.some((d: any) =>
        isJtStatusDelivered(d.scanType || d.status || d.desc)
      );

    if (isDelivered) {
      const updated = await markItemsAsDelivered(
        trackingId,
        orderId || undefined
      );
      if (updated) {
        return NextResponse.json({
          success: true,
          status: "DELIVERED",
          synced: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      status: rawState || "SHIPPED",
      details,
      synced: false,
    });
  } catch (error: any) {
    console.error("[J&T Express GET Sync Error]:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

async function markItemsAsDelivered(
  trackingNumber?: string,
  businessReference?: string
) {
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
  const recipientEmail =
    sampleItem.order.user?.email || sampleItem.order.clientEmail;
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
      sampleItem.carrier || "J&T Express"
    ).catch((err) =>
      console.error("[J&T Express Automation] Failed to send delivery email:", err)
    );
  }

  revalidatePath("/en/profile");
  revalidatePath("/ar/profile");
  revalidatePath("/en/studio");
  revalidatePath("/ar/studio");
  return true;
}

async function markItemsAsOutForDelivery(
  trackingNumber?: string,
  businessReference?: string
) {
  const parentOrder = await prisma.order.findFirst({
    where: {
      OR: [
        ...(trackingNumber ? [{ trackingNumber: { contains: trackingNumber } }] : []),
        ...(businessReference ? [{ id: businessReference }] : []),
      ],
    },
  });

  if (!parentOrder || parentOrder.status === "DELIVERED") {
    return false;
  }

  await prisma.order.update({
    where: { id: parentOrder.id },
    data: { status: "OUT_FOR_DELIVERY" },
  });

  await prisma.orderItem.updateMany({
    where: {
      orderId: parentOrder.id,
      status: { notIn: ["DELIVERED", "CANCELLED", "REFUNDED"] },
    },
    data: { status: "OUT_FOR_DELIVERY" },
  });

  revalidatePath("/profile");
  revalidatePath("/track");
  revalidatePath("/admin/orders");
  return true;
}

