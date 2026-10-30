import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { sendOrderStatusUpdateEmail } from "@/lib/mail";
import { revalidatePath } from "next/cache";
import { escapeHtml, verifyDeliveryVerifyToken } from "@/lib/security";

async function isVerifyAuthorized(targetId: string, sig: string | null): Promise<boolean> {
  if (verifyDeliveryVerifyToken(targetId, sig)) {
    return true;
  }
  const session = await auth();
  return session?.user?.role === "ADMIN";
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");
    const orderId = searchParams.get("orderId");
    const sig = searchParams.get("sig");

    const targetId = orderId || itemId;
    if (!targetId) {
      return new NextResponse(
        renderHtmlError("Invalid Link", "Missing item or order identifier."),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    if (!(await isVerifyAuthorized(targetId, sig))) {
      return new NextResponse(
        renderHtmlError(
          "Unauthorized Scan",
          "This verification link is missing a valid packing-slip signature."
        ),
        { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    let orderItem;
    if (itemId) {
      orderItem = await prisma.orderItem.findUnique({
        where: { id: itemId },
        include: {
          order: { include: { user: true, items: { select: { id: true } } } },
          product: { select: { id: true, name: true, slug: true, artisanId: true } },
        },
      });
    } else if (orderId) {
      orderItem = await prisma.orderItem.findFirst({
        where: { orderId },
        include: {
          order: { include: { user: true, items: { select: { id: true } } } },
          product: { select: { id: true, name: true, slug: true, artisanId: true } },
        },
      });
    }

    if (!orderItem) {
      return new NextResponse(
        renderHtmlError(
          "Package Not Found",
          "The requested package item could not be found in our system."
        ),
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    if (
      orderItem.order.status === "DELIVERED" ||
      (itemId && orderItem.status === "DELIVERED")
    ) {
      return new NextResponse(renderHtmlSuccess(orderItem), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (
      orderItem.order.status === "CANCELLED" ||
      orderItem.order.status === "REFUNDED" ||
      orderItem.order.status === "PENDING" ||
      orderItem.order.status === "FAILED"
    ) {
      return new NextResponse(
        renderHtmlError(
          "Not Eligible for Delivery",
          `This order is currently marked ${orderItem.order.status} and cannot be confirmed.`
        ),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    if (orderItem.carrier?.toLowerCase() === "bosta" && orderItem.trackingNumber) {
      try {
        const bostaRes = await fetch(
          `https://api.bosta.co/shipments/track/${encodeURIComponent(orderItem.trackingNumber)}`,
          { signal: AbortSignal.timeout(6000) }
        );
        if (bostaRes.ok) {
          const bostaData = await bostaRes.json();
          const rawState = bostaData.state?.value || bostaData.state || bostaData.status;
          if (["Delivered", "DELIVERED", "delivered"].includes(rawState)) {
            if (itemId) {
              await markAsDelivered(orderItem.id);
            } else if (orderId) {
              await markOrderAsDelivered(orderItem.orderId);
            }
            return new NextResponse(renderHtmlSuccess(orderItem), {
              headers: { "Content-Type": "text/html; charset=utf-8" },
            });
          }
        }
      } catch {
        // Fallback to manual courier confirmation prompt
      }
    }

    return new NextResponse(renderHtmlConfirmationPrompt(orderItem, !!orderId, sig || ""), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error: any) {
    console.error("[Universal Verify GET Error]:", error);
    return new NextResponse(
      renderHtmlError("System Error", "Unable to verify package right now."),
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const itemId = typeof data?.itemId === "string" ? data.itemId : null;
    const orderId = typeof data?.orderId === "string" ? data.orderId : null;
    const sig = typeof data?.sig === "string" ? data.sig : null;

    const targetId = orderId || itemId;
    if (!targetId) {
      return NextResponse.json({ error: "Missing itemId or orderId" }, { status: 400 });
    }

    if (!(await isVerifyAuthorized(targetId, sig))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let success = false;
    if (itemId) {
      success = await markAsDelivered(itemId);
    } else if (orderId) {
      success = await markOrderAsDelivered(orderId);
    }

    if (success) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Failed to update package status" }, { status: 400 });
  } catch (error: any) {
    console.error("[Universal Verify POST Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function markAsDelivered(itemId: string) {
  const orderItem = await prisma.orderItem.findUnique({
    where: { id: itemId },
    include: {
      order: { include: { user: true } },
      product: true,
    },
  });

  if (
    !orderItem ||
    orderItem.status === "DELIVERED" ||
    orderItem.status === "CANCELLED" ||
    orderItem.status === "REFUNDED" ||
    orderItem.order.status === "PENDING" ||
    orderItem.order.status === "FAILED" ||
    orderItem.order.status === "CANCELLED" ||
    orderItem.order.status === "REFUNDED"
  ) {
    return false;
  }

  const orderId = orderItem.orderId;

  const updatedItem = await prisma.orderItem.update({
    where: { id: itemId },
    data: { status: "DELIVERED" },
    include: {
      order: { include: { user: true } },
      product: true,
    },
  });

  const allOrderItems = await prisma.orderItem.findMany({
    where: { orderId },
  });

  const allDelivered = allOrderItems.every((item) => item.status === "DELIVERED");

  if (allDelivered && updatedItem.order.status !== "DELIVERED") {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "DELIVERED" },
    });
  }

  await prisma.artisanTransaction.updateMany({
    where: {
      orderId,
      artisanId: orderItem.product.artisanId,
      type: "SALE",
      status: "PENDING",
    },
    data: { createdAt: new Date() },
  });

  const recipientEmail = updatedItem.order.user?.email || updatedItem.order.clientEmail;
  const recipientName = updatedItem.order.user?.name || "Customer";

  if (recipientEmail) {
    sendOrderStatusUpdateEmail(
      recipientEmail,
      recipientName,
      updatedItem.order.id,
      "DELIVERED",
      updatedItem.product.name,
      updatedItem.product.slug || undefined,
      updatedItem.trackingNumber || "Hand Delivered",
      updatedItem.carrier || "Private Runner"
    ).catch((err) => console.error("[Universal Verify] Failed to send email:", err));
  }

  revalidatePath("/en/profile");
  revalidatePath("/ar/profile");
  revalidatePath("/en/studio");
  revalidatePath("/ar/studio");
  return true;
}

async function markOrderAsDelivered(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
      user: true,
    },
  });

  if (
    !order ||
    order.status === "DELIVERED" ||
    order.status === "PENDING" ||
    order.status === "FAILED" ||
    order.status === "CANCELLED" ||
    order.status === "REFUNDED"
  ) {
    return false;
  }

  await prisma.orderItem.updateMany({
    where: {
      orderId,
      status: { notIn: ["CANCELLED", "REFUNDED"] },
    },
    data: { status: "DELIVERED" },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "DELIVERED" },
  });

  const uniqueArtisanIds = Array.from(
    new Set(order.items.map((i) => i.product.artisanId))
  );
  for (const artisanId of uniqueArtisanIds) {
    await prisma.artisanTransaction.updateMany({
      where: {
        orderId,
        artisanId,
        type: "SALE",
        status: "PENDING",
      },
      data: { createdAt: new Date() },
    });
  }

  const recipientEmail = order.user?.email || order.clientEmail;
  const recipientName = order.user?.name || "Customer";
  const firstItem = order.items[0];

  if (recipientEmail && firstItem) {
    sendOrderStatusUpdateEmail(
      recipientEmail,
      recipientName,
      order.id,
      "DELIVERED",
      firstItem.product.name,
      firstItem.product.slug || undefined,
      firstItem.trackingNumber || "Hand Delivered",
      firstItem.carrier || "Private Runner"
    ).catch((err) => console.error("[Universal Verify] Failed to send email:", err));
  }

  revalidatePath("/en/profile");
  revalidatePath("/ar/profile");
  revalidatePath("/en/studio");
  revalidatePath("/ar/studio");
  return true;
}

function renderHtmlConfirmationPrompt(item: any, isOrderId: boolean, sig: string) {
  const targetId = isOrderId ? item.orderId : item.id;
  const idKey = isOrderId ? "orderId" : "itemId";
  const safeProductName = escapeHtml(item.product?.name || "Order Item");
  const extraCount =
    item.order?.items && item.order.items.length > 1
      ? ` and ${Number(item.order.items.length) - 1} other item(s)`
      : "";
  const safeOrderId = escapeHtml(item.orderId);
  const safeRecipient = escapeHtml(item.order?.user?.name || "Valued Customer");
  const safeCity = escapeHtml(item.order?.shippingCity || "Egypt");
  const payloadJson = JSON.stringify({ [idKey]: String(targetId), sig: String(sig) })
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Giftisan - Delivery Verification</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #FAF8F5; color: #123524; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .card { max-width: 420px; width: 100%; background: #fff; border-radius: 28px; box-shadow: 0 20px 40px rgba(18,53,36,0.08); padding: 32px; border: 1px solid rgba(18,53,36,0.1); text-align: center; }
    .logo { width: 56px; height: 56px; background: rgba(18,53,36,0.06); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-weight: 900; font-size: 24px; }
    .sub { font-size: 11px; font-weight: 700; color: #E38E49; text-transform: uppercase; letter-spacing: 0.14em; margin-top: 6px; }
    .box { margin: 24px 0; padding: 20px; background: #FAF8F5; border-radius: 18px; border: 1px solid rgba(18,53,36,0.06); text-align: left; }
    .label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: rgba(18,53,36,0.45); letter-spacing: 0.12em; }
    .val { font-size: 15px; font-weight: 700; margin-top: 4px; }
    .muted { font-size: 12px; color: rgba(18,53,36,0.65); margin-top: 4px; word-break: break-all; }
    hr { border: none; border-top: 1px solid rgba(18,53,36,0.08); margin: 14px 0; }
    button { width: 100%; padding: 16px 20px; background: #123524; color: #fff; border: none; border-radius: 16px; font-weight: 700; font-size: 15px; cursor: pointer; }
    button:disabled { opacity: 0.55; cursor: not-allowed; }
    .foot { font-size: 11px; color: rgba(18,53,36,0.45); margin-top: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">G</div>
    <h1 style="font-size:22px;font-weight:800;">Delivery Verification</h1>
    <p class="sub">Official Packing Slip Scan</p>
    <div class="box">
      <div>
        <div class="label">Order Package</div>
        <div class="val">${safeProductName}${escapeHtml(extraCount)}</div>
        <div class="muted">Order #${safeOrderId}</div>
      </div>
      <hr />
      <div>
        <div class="label">Recipient</div>
        <div class="val">${safeRecipient}</div>
        <div class="muted">Destination: ${safeCity}</div>
      </div>
    </div>
    <button id="confirmBtn" type="button">Confirm Doorstep Delivery</button>
    <p class="foot">Tapping confirm marks this package as officially delivered and alerts the customer.</p>
  </div>
  <script>
    (function() {
      var payload = ${payloadJson};
      var btn = document.getElementById('confirmBtn');
      btn.addEventListener('click', async function() {
        btn.disabled = true;
        btn.textContent = 'Confirming...';
        try {
          var res = await fetch('/api/shipping/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            window.location.reload();
          } else {
            alert('Failed to update package status. Please try again.');
            btn.disabled = false;
            btn.textContent = 'Confirm Doorstep Delivery';
          }
        } catch (e) {
          alert('Connection error. Please try again.');
          btn.disabled = false;
          btn.textContent = 'Confirm Doorstep Delivery';
        }
      });
    })();
  </script>
</body>
</html>`;
}

function renderHtmlSuccess(item: any) {
  const safeProductName = escapeHtml(item.product?.name || "Order Item");
  const safeOrderId = escapeHtml(item.orderId);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Giftisan - Package Delivered</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #FAF8F5; color: #123524; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; margin: 0; }
    .card { max-width: 420px; width: 100%; background: #fff; border-radius: 28px; box-shadow: 0 20px 40px rgba(18,53,36,0.08); padding: 32px; border: 1px solid rgba(18,53,36,0.1); text-align: center; }
    .box { margin: 24px 0; padding: 18px; background: #FAF8F5; border-radius: 16px; text-align: left; }
  </style>
</head>
<body>
  <div class="card">
    <h1 style="font-size:22px;font-weight:800;">Delivery Confirmed</h1>
    <p style="font-size:11px;font-weight:700;color:#E38E49;text-transform:uppercase;letter-spacing:0.14em;margin-top:6px;">Package successfully verified</p>
    <div class="box">
      <div style="font-size:14px;font-weight:700;">${safeProductName}</div>
      <div style="font-size:12px;opacity:0.65;margin-top:4px;word-break:break-all;">Order #${safeOrderId} - Delivered</div>
    </div>
    <p style="font-size:12px;font-weight:700;">Thank you for confirming this delivery.</p>
  </div>
</body>
</html>`;
}

function renderHtmlError(title: string, message: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Giftisan - Verification Notice</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #FAF8F5; color: #123524; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; margin: 0; }
    .card { max-width: 420px; width: 100%; background: #fff; border-radius: 28px; box-shadow: 0 20px 40px rgba(18,53,36,0.08); padding: 32px; border: 1px solid rgba(18,53,36,0.1); text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h1 style="font-size:22px;font-weight:800;">${escapeHtml(title)}</h1>
    <p style="font-size:14px;opacity:0.7;margin-top:12px;line-height:1.5;">${escapeHtml(message)}</p>
  </div>
</body>
</html>`;
}
