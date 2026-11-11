import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sendOrderStatusUpdateEmail, sendRefundResolvedEmail } from "@/lib/mail";
import { revalidatePath } from "next/cache";
import { safeCompareSecrets } from "@/lib/security";
import {
  generateHeaderDigest,
  getJtTracking,
  isJtStatusDelivered,
  isJtStatusOutForDelivery,
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

    const statusCandidates = [
      data.scanType,
      data.status,
      data.state,
      data.desc,
      latestDetail.scanType,
      latestDetail.status,
      latestDetail.desc,
    ];
    const isDelivered =
      statusCandidates.some((val) => isJtStatusDelivered(val)) ||
      detailsList.some((d: any) =>
        isJtStatusDelivered(d.scanType || d.status || d.desc)
      );

    const isOutForDelivery =
      !isDelivered &&
      (statusCandidates.some((val) => isJtStatusOutForDelivery(val)) ||
        detailsList.some((d: any) =>
          isJtStatusOutForDelivery(d.scanType || d.status || d.desc)
        ));

    if (isDelivered) {
      const [itemsUpdated, replacementUpdated, returnUpdated] = await Promise.all([
        markItemsAsDelivered(
          trackingNumber ? String(trackingNumber) : undefined,
          businessReference ? String(businessReference) : undefined
        ),
        markReplacementAsDelivered(
          trackingNumber ? String(trackingNumber) : undefined,
          businessReference ? String(businessReference) : undefined
        ),
        markReturnAsDelivered(
          trackingNumber ? String(trackingNumber) : undefined,
          businessReference ? String(businessReference) : undefined
        ),
      ]);
      if (itemsUpdated || replacementUpdated || returnUpdated) {
        return NextResponse.json({
          code: "1",
          msg: "success",
          success: true,
          message: replacementUpdated
            ? "Replacement claim updated to REPLACEMENT_DELIVERED and escrow hold lifted."
            : returnUpdated
              ? "Return parcel marked delivered back to artisan workshop."
              : "Order items updated to DELIVERED and escrow countdown initiated.",
        });
      }
    } else if (isOutForDelivery) {
      await markItemsAsOutForDelivery(
        trackingNumber ? String(trackingNumber) : undefined,
        businessReference ? String(businessReference) : undefined
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
      const [itemsUpdated, replacementUpdated, returnUpdated] = await Promise.all([
        markItemsAsDelivered(trackingId, orderId || undefined),
        markReplacementAsDelivered(trackingId, orderId || undefined),
        markReturnAsDelivered(trackingId, orderId || undefined),
      ]);
      if (itemsUpdated || replacementUpdated || returnUpdated) {
        return NextResponse.json({
          success: true,
          status: replacementUpdated
            ? "REPLACEMENT_DELIVERED"
            : returnUpdated
              ? "RETURN_RECEIVED"
              : "DELIVERED",
          synced: true,
        });
      }
    } else if (
      isJtStatusOutForDelivery(latestScan.scanType) ||
      isJtStatusOutForDelivery(latestScan.status) ||
      isJtStatusOutForDelivery(latestScan.desc) ||
      isJtStatusOutForDelivery(traceData?.status)
    ) {
      const updated = await markItemsAsOutForDelivery(
        trackingId,
        orderId || undefined
      );
      if (updated) {
        return NextResponse.json({
          success: true,
          status: "OUT_FOR_DELIVERY",
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

function revalidateOrderPaths() {
  for (const locale of ["en", "ar"]) {
    revalidatePath(`/${locale}/profile`);
    revalidatePath(`/${locale}/studio`);
    revalidatePath(`/${locale}/track`);
    revalidatePath(`/${locale}/admin/orders`);
    revalidatePath(`/${locale}/admin/refunds`);
  }
}

async function markReplacementAsDelivered(
  trackingNumber?: string,
  businessReference?: string
) {
  const cleanTracking = trackingNumber?.trim();
  const cleanRef = businessReference?.trim();
  if (!cleanTracking && !cleanRef) return false;

  const orConditions: any[] = [];
  if (cleanTracking) orConditions.push({ replacementTrackingNumber: cleanTracking });
  if (cleanRef) orConditions.push({ replacementLogisticId: cleanRef });

  const matchingClaims = await prisma.refundRequest.findMany({
    where: {
      OR: orConditions,
      status: { in: ["REPLACEMENT_SHIPPED", "REPLACEMENT_APPROVED"] },
    },
    include: {
      user: true,
      order: { include: { user: true } },
    },
  });

  if (matchingClaims.length === 0) return false;

  for (const claim of matchingClaims) {
    const transitioned = await prisma.$transaction(async (tx) => {
      const res = await tx.refundRequest.updateMany({
        where: { id: claim.id, status: claim.status },
        data: {
          status: "REPLACEMENT_DELIVERED",
          replacementDeliveredAt: new Date(),
        },
      });
      if (res.count === 0) return false;

      await tx.refundRequestEvent.create({
        data: {
          refundRequestId: claim.id,
          fromStatus: claim.status,
          toStatus: "REPLACEMENT_DELIVERED",
          note: `[Replacement delivered via J&T Express webhook${cleanTracking ? ` (${cleanTracking})` : ""}]`,
        },
      });
      return true;
    });

    if (transitioned) {
      const recipientEmail = claim.user?.email || claim.order?.clientEmail;
      if (recipientEmail) {
        sendRefundResolvedEmail({
          email: recipientEmail,
          customerName: claim.user?.name || claim.order?.user?.name || "Customer",
          orderId: claim.orderId,
          status: "REPLACEMENT_DELIVERED",
          replacementTrackingNumber: cleanTracking || claim.replacementTrackingNumber || undefined,
          replacementCarrier: claim.replacementCarrier || "J&T Express",
          lang: "en",
        }).catch(() => {});
      }
    }
  }

  revalidateOrderPaths();
  return true;
}

async function markReturnAsDelivered(
  trackingNumber?: string,
  businessReference?: string
) {
  const cleanTracking = trackingNumber?.trim();
  const cleanRef = businessReference?.trim();
  if (!cleanTracking && !cleanRef) return false;

  const orConditions: any[] = [];
  if (cleanTracking) orConditions.push({ returnTrackingNumber: cleanTracking });
  if (cleanRef) orConditions.push({ returnLogisticId: cleanRef });

  const matchingClaims = await prisma.refundRequest.findMany({
    where: {
      OR: orConditions,
      returnReceivedAt: null,
    },
  });

  if (matchingClaims.length === 0) return false;

  for (const claim of matchingClaims) {
    await prisma.$transaction(async (tx) => {
      const res = await tx.refundRequest.updateMany({
        where: { id: claim.id, returnReceivedAt: null },
        data: { returnReceivedAt: new Date() },
      });
      if (res.count === 0) return;

      await tx.refundRequestEvent.create({
        data: {
          refundRequestId: claim.id,
          fromStatus: claim.status,
          toStatus: claim.status,
          note: `[Return parcel delivered to artisan via J&T Express webhook${cleanTracking ? ` (${cleanTracking})` : ""}]`,
        },
      });
    });
  }

  revalidateOrderPaths();
  return true;
}

async function findMatchingOrderItems(
  trackingNumber?: string,
  businessReference?: string
) {
  const cleanTracking = trackingNumber?.trim();
  let matchingItems = cleanTracking
    ? await prisma.orderItem.findMany({
        where: { trackingNumber: cleanTracking },
        include: {
          order: { include: { user: true } },
          product: true,
        },
      })
    : [];

  if (matchingItems.length === 0 && businessReference) {
    const reference = String(businessReference).trim();
    let parentOrder = await prisma.order.findUnique({
      where: { id: reference },
      select: { id: true },
    });
    let artisanSuffix: string | undefined;

    if (!parentOrder && reference.includes("-")) {
      const dashIndex = reference.lastIndexOf("-");
      const baseOrderId = reference.slice(0, dashIndex);
      const suffix = reference.slice(dashIndex + 1);
      if (baseOrderId && suffix) {
        parentOrder = await prisma.order.findUnique({
          where: { id: baseOrderId },
          select: { id: true },
        });
        artisanSuffix = suffix;
      }
    }

    if (parentOrder) {
      matchingItems = await prisma.orderItem.findMany({
        where: {
          orderId: parentOrder.id,
          ...(artisanSuffix ? { product: { artisanId: { endsWith: artisanSuffix } } } : {}),
          ...(cleanTracking
            ? { OR: [{ trackingNumber: null }, { trackingNumber: cleanTracking }] }
            : {}),
        },
        include: { order: { include: { user: true } }, product: true },
      });
    }
  }

  if (matchingItems.length === 0 && cleanTracking) {
    const legacyOrder = await prisma.order.findFirst({
      where: { trackingNumber: cleanTracking },
      select: { id: true },
    });
    if (legacyOrder) {
      matchingItems = await prisma.orderItem.findMany({
        where: {
          orderId: legacyOrder.id,
          OR: [{ trackingNumber: null }, { trackingNumber: cleanTracking }],
        },
        include: { order: { include: { user: true } }, product: true },
      });
    }
  }

  return matchingItems;
}

async function markItemsAsDelivered(
  trackingNumber?: string,
  businessReference?: string
) {
  const matchingItems = await findMatchingOrderItems(trackingNumber, businessReference);

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

  const itemsByOrder = new Map<string, typeof undeliveredItems>();
  for (const item of undeliveredItems) {
    const list = itemsByOrder.get(item.orderId) || [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  await prisma.$transaction(async (tx) => {
    for (const [orderId, items] of itemsByOrder.entries()) {
      const affectedArtisanIds = new Set<string>();
      for (const item of items) {
        await tx.orderItem.update({
          where: { id: item.id },
          data: { status: "DELIVERED", deliveredAt: item.deliveredAt || new Date() },
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
      const activeOrderItems = allOrderItems.filter(
        (item) => !["CANCELLED", "REFUNDED"].includes(item.status)
      );
      const allDelivered =
        activeOrderItems.length > 0 &&
        activeOrderItems.every((i) => i.status === "DELIVERED");
      if (allDelivered) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: "DELIVERED" },
        });
      }
    }
  });

  for (const [orderId, items] of itemsByOrder.entries()) {
    const sampleItem = items[0];
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
  }

  revalidateOrderPaths();
  return true;
}

async function markItemsAsOutForDelivery(
  trackingNumber?: string,
  businessReference?: string
) {
  const matchingItems = await findMatchingOrderItems(trackingNumber, businessReference);
  if (matchingItems.length === 0) return false;

  const orderIds = Array.from(new Set(matchingItems.map((item) => item.orderId)));
  for (const item of matchingItems) {
    await prisma.orderItem.updateMany({
      where: { id: item.id, status: { notIn: ["DELIVERED", "CANCELLED", "REFUNDED"] } },
      data: { status: "OUT_FOR_DELIVERY", ...(!item.shippedAt ? { shippedAt: new Date() } : {}) },
    });
  }

  for (const orderId of orderIds) {
    const statuses = await prisma.orderItem.findMany({ where: { orderId }, select: { status: true } });
    const activeStatuses = statuses.filter((item) => !["CANCELLED", "REFUNDED"].includes(item.status));
    if (
      activeStatuses.some((item) => item.status === "OUT_FOR_DELIVERY") &&
      !activeStatuses.every((item) => item.status === "DELIVERED")
    ) {
      await prisma.order.update({ where: { id: orderId }, data: { status: "OUT_FOR_DELIVERY" } });
    }
  }

  revalidateOrderPaths();
  return true;
}

