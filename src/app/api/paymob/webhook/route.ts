import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PAYMOB_HMAC, verifyPaymobWebhookHmac } from "@/lib/paymob";
import { sendOrderNotification, sendBuyerOrderReceiptEmail } from "@/lib/mail";
import {
  convertAbandonedCheckoutAndRecordLedger,
  recordArtisanOrderLedgerInTx,
} from "@/lib/services/order-service";

export async function POST(req: NextRequest) {
  try {
    // Fail CLOSED if PAYMOB_HMAC is not configured
    if (!PAYMOB_HMAC) {
      console.error("[Paymob Webhook] PAYMOB_HMAC environment variable is not configured.");
      return NextResponse.json(
        { error: "Payment webhook verification is not configured" },
        { status: 500 }
      );
    }

    const hmacReceived = req.nextUrl.searchParams.get("hmac");
    if (!hmacReceived) {
      console.error("[Paymob Webhook] Missing HMAC signature");
      return NextResponse.json({ error: "Unauthorized: Missing HMAC" }, { status: 401 });
    }

    const data = await req.json();
    const obj = data?.obj;
    if (!obj || !obj.order || !obj.order.merchant_order_id) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (!verifyPaymobWebhookHmac(obj, hmacReceived)) {
      console.error("[Paymob Webhook] Invalid HMAC signature");
      return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
    }

    const currency = String(obj.currency || "EGP").toUpperCase();
    if (currency !== "EGP") {
      console.error(`[Paymob Webhook] Unexpected currency: ${currency}`);
      return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
    }

    const paidAmountCents = Number(obj.amount_cents);
    if (!Number.isFinite(paidAmountCents) || paidAmountCents < 0) {
      return NextResponse.json({ error: "Invalid amount_cents" }, { status: 400 });
    }

    const rawReference = String(obj.order.merchant_order_id);
    const isSuccess =
      obj.success === true &&
      obj.pending === false &&
      obj.is_voided !== true &&
      obj.is_refunded !== true;
    const isAbandonedCheckoutRef = rawReference.startsWith("AC-");

    if (isSuccess) {
      if (isAbandonedCheckoutRef) {
        const abandonedCheckoutId = rawReference
          .replace(/^AC-/, "")
          .split("-")
          .slice(0, -1)
          .join("-");

        let order: any = null;
        let newlyCreated = false;

        try {
          const conversion = await convertAbandonedCheckoutAndRecordLedger(
            abandonedCheckoutId,
            { expectedAmountCents: paidAmountCents }
          );
          order = conversion.order;
          newlyCreated = conversion.newlyCreated;
        } catch (err: any) {
          console.error(
            `[Paymob Webhook] Failed to convert AbandonedCheckout ${abandonedCheckoutId}:`,
            err?.message
          );
          await prisma.abandonedCheckout.updateMany({
            where: { id: abandonedCheckoutId, status: { not: "CONVERTED" } },
            data: {
              status: "FAILED_PAYMENT",
              adminNotes: `PAID BUT CONVERSION FAILED (${err?.message || "check stock/amount"})`,
            },
          });
          return NextResponse.json({
            success: true,
            warning: "Order creation failed after payment; flagged for admin review.",
          });
        }

        if (!order || !newlyCreated) {
          return NextResponse.json({ success: true });
        }

        // Send buyer receipt email only once on initial creation
        try {
          const buyerEmail = order.clientEmail || order.user?.email;
          const buyerName = order.user?.name || "Customer";
          if (buyerEmail) {
            const receiptItems = order.items.map((i: any) => ({
              name: i.product.name,
              quantity: i.quantity,
              price: i.price,
            }));
            sendBuyerOrderReceiptEmail(
              buyerEmail,
              buyerName,
              order.id,
              order.totalAmount,
              receiptItems,
              order.shippingCity || undefined
            ).catch((err) =>
              console.error(`Failed to send buyer receipt email to ${buyerEmail}:`, err)
            );
          }
        } catch (err) {
          console.error("Failed to send buyer receipt email:", err);
        }

        // Send artisan notifications once on initial creation
        try {
          const artisanEarnings = new Map<
            string,
            { name: string; email: string; total: number }
          >();
          order.items.forEach((item: any) => {
            const artisan = item.product?.artisan;
            if (artisan?.user?.email) {
              const current = artisanEarnings.get(artisan.user.email) || {
                name: artisan.user.name || artisan.studioName || "Artisan",
                email: artisan.user.email,
                total: 0,
              };
              current.total += item.price * item.quantity;
              artisanEarnings.set(artisan.user.email, current);
            }
          });

          artisanEarnings.forEach((entry) => {
            sendOrderNotification(entry.email, entry.name, order.id, entry.total).catch(
              (err) =>
                console.error(`Failed to send order notification to ${entry.email}:`, err)
            );
          });
        } catch (err) {
          console.error("Failed to send artisan notification emails:", err);
        }
      } else {
        // Legacy flow: order already exists with PENDING status
        const orderId = rawReference.includes("-") ? rawReference.split("-")[0] : rawReference;

        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            user: true,
            items: {
              include: {
                product: {
                  include: {
                    artisan: { include: { user: true } },
                  },
                },
              },
            },
          },
        });

        if (order && order.status === "PENDING") {
          const expectedCents = Math.round(order.totalAmount * 100);
          if (Math.abs(paidAmountCents - expectedCents) > 5) {
            console.error(
              `[Paymob Webhook] Amount mismatch on order ${orderId}: paid ${paidAmountCents}, expected ${expectedCents}`
            );
            return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
          }

          const didTransition = await prisma.$transaction(async (tx) => {
            const claimed = await tx.order.updateMany({
              where: { id: orderId, status: "PENDING" },
              data: { status: "PROCESSING" },
            });
            if (claimed.count !== 1) return false;

            await recordArtisanOrderLedgerInTx(tx, {
              orderId: order.id,
              couponId: order.couponId,
              discountApplied: order.discountApplied,
              items: order.items.map((i: any) => ({
                productId: i.productId || i.product?.id,
                name: i.product?.name,
                price: i.price,
                quantity: i.quantity,
              })),
            });
            return true;
          });

          if (didTransition) {
            try {
              const buyerEmail = order.clientEmail || order.user?.email;
              const buyerName = order.user?.name || "Customer";
              if (buyerEmail) {
                const receiptItems = order.items.map((i) => ({
                  name: i.product.name,
                  quantity: i.quantity,
                  price: i.price,
                }));
                sendBuyerOrderReceiptEmail(
                  buyerEmail,
                  buyerName,
                  order.id,
                  order.totalAmount,
                  receiptItems,
                  order.shippingCity || undefined
                ).catch((err) =>
                  console.error(`Failed to send buyer receipt email to ${buyerEmail}:`, err)
                );
              }
            } catch (err) {
              console.error("Failed to send buyer receipt email:", err);
            }

            try {
              const artisanEarnings = new Map<
                string,
                { name: string; email: string; total: number }
              >();
              order.items.forEach((item) => {
                const artisan = item.product.artisan;
                if (artisan.user.email) {
                  const current = artisanEarnings.get(artisan.user.email) || {
                    name: artisan.user.name || artisan.studioName || "Artisan",
                    email: artisan.user.email,
                    total: 0,
                  };
                  current.total += item.price * item.quantity;
                  artisanEarnings.set(artisan.user.email, current);
                }
              });

              artisanEarnings.forEach((entry) => {
                sendOrderNotification(entry.email, entry.name, order.id, entry.total).catch(
                  (err) =>
                    console.error(`Failed to send order notification to ${entry.email}:`, err)
                );
              });
            } catch (err) {
              console.error("Failed to process order notification emails inside webhook:", err);
            }
          }
        }
      }
    } else {
      // Payment failed or cancelled
      if (isAbandonedCheckoutRef) {
        const abandonedCheckoutId = rawReference
          .replace(/^AC-/, "")
          .split("-")
          .slice(0, -1)
          .join("-");
        await prisma.abandonedCheckout.updateMany({
          where: { id: abandonedCheckoutId, status: "ABANDONED" },
          data: { status: "FAILED_PAYMENT" },
        });
      } else {
        const orderId = rawReference.includes("-") ? rawReference.split("-")[0] : rawReference;
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        });

        if (order && order.status === "PENDING") {
          await prisma.$transaction(async (tx) => {
            const claimed = await tx.order.updateMany({
              where: { id: orderId, status: "PENDING" },
              data: { status: "FAILED" },
            });
            if (claimed.count !== 1) return;

            for (const item of order.items) {
              if (item.variantId) {
                await tx.productVariant.update({
                  where: { id: item.variantId },
                  data: { stock: { increment: item.quantity } },
                });
              } else {
                await tx.product.update({
                  where: { id: item.productId },
                  data: { stock: { increment: item.quantity } },
                });
              }
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Paymob webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
