import { getDictionary, hasLocale } from "../../dictionaries";
import { notFound } from "next/navigation";
import { SuccessClient } from "@/components/success-client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { verifyPaymobRedirectHmac } from "@/lib/paymob";
import { convertAbandonedCheckoutAndRecordLedger } from "@/lib/services/order-service";
import { signOrderAccessToken, verifyOrderAccessToken } from "@/lib/security";
import { sanitizePublicProduct } from "@/lib/public-selects";
import { sendBuyerOrderReceiptEmail, sendOrderNotification } from "@/lib/mail";

interface SuccessPageProps {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SuccessPage({ params, searchParams }: SuccessPageProps) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang as any);
  const search = await searchParams;
  const session = await auth();

  const successParam = typeof search.success === "string" ? search.success : undefined;
  const pendingParam = typeof search.pending === "string" ? search.pending : undefined;
  const tokenParam = typeof search.token === "string" ? search.token : undefined;
  const errorMessage = typeof search.data_message === "string" ? search.data_message : undefined;

  const hasPaymobParams = typeof search.hmac === "string" || successParam !== undefined;
  const hasValidPaymobHmac = verifyPaymobRedirectHmac(search);
  const isVoidedOrError =
    search.is_voided === "true" ||
    search.is_refunded === "true" ||
    search.error_occured === "true";

  const isFailed =
    successParam === "false" ||
    (hasPaymobParams && (!hasValidPaymobHmac || isVoidedOrError));

  const isVerifiedPaymobSuccess =
    hasValidPaymobHmac &&
    successParam === "true" &&
    pendingParam !== "true" &&
    !isVoidedOrError &&
    (!search.currency || String(search.currency).toUpperCase() === "EGP");

  let orderId = typeof search.orderId === "string" ? search.orderId : undefined;
  const rawRefParam = search.merchant_order_id || search.special_reference;
  const rawRef = typeof rawRefParam === "string" ? rawRefParam : undefined;
  let verifiedViaPaymobRef = false;

  // Resolve orderId via Paymob's merchant_order_id ONLY when verified or already converted by webhook
  if (!orderId && rawRef) {
    if (rawRef.startsWith("AC-")) {
      const abandonedCheckoutId = rawRef.replace(/^AC-/, "").split("-").slice(0, -1).join("-");
      if (abandonedCheckoutId) {
        try {
          const ac = await prisma.abandonedCheckout.findUnique({
            where: { id: abandonedCheckoutId },
            select: { id: true, orderId: true, status: true },
          });

          if (ac?.orderId) {
            orderId = ac.orderId;
            if (isVerifiedPaymobSuccess) verifiedViaPaymobRef = true;
          } else if (isVerifiedPaymobSuccess) {
            const amountCentsRaw = Number(search.amount_cents);
            const expectedAmountCents = Number.isFinite(amountCentsRaw) && amountCentsRaw > 0
              ? amountCentsRaw
              : undefined;

            const { order: convertedOrder, newlyCreated } =
              await convertAbandonedCheckoutAndRecordLedger(abandonedCheckoutId, {
                expectedAmountCents,
              });

            if (convertedOrder?.id) {
              orderId = convertedOrder.id;
              verifiedViaPaymobRef = true;

              if (newlyCreated) {
                const buyerEmail = convertedOrder.clientEmail || convertedOrder.user?.email;
                const buyerName =
                  convertedOrder.user?.name ||
                  convertedOrder.orderNotes?.match(/\[Customer:\s*([^\]]+)\]/i)?.[1]?.trim() ||
                  "Customer";

                if (buyerEmail) {
                  sendBuyerOrderReceiptEmail(
                    buyerEmail,
                    buyerName,
                    convertedOrder.id,
                    convertedOrder.totalAmount,
                    convertedOrder.items.map((i: any) => ({
                      name: i.product?.name || "Item",
                      quantity: i.quantity,
                      price: i.price,
                    })),
                    convertedOrder.shippingCity || undefined
                  ).catch((err) =>
                    console.error("Failed to send buyer receipt email from success page:", err)
                  );
                }

                const artisanEarnings = new Map<string, { name: string; email: string; total: number }>();
                convertedOrder.items.forEach((item: any) => {
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
                  sendOrderNotification(entry.email, entry.name, convertedOrder.id, entry.total).catch(
                    (err) => console.error("Failed to send artisan notification from success page:", err)
                  );
                });
              }
            }
          }
        } catch (err) {
          console.error("Failed to resolve abandoned checkout in success page:", err);
        }
      }
    } else if (isVerifiedPaymobSuccess) {
      orderId = rawRef.includes("-") ? rawRef.split("-")[0] : rawRef;
      verifiedViaPaymobRef = true;
    }
  }

  let order = null;
  if (orderId && !isFailed) {
    const fetchedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: true,
          },
        },
        shippingMethod: true,
      },
    });

    if (fetchedOrder) {
      const isOwnerOrAdmin = Boolean(
        session?.user?.id &&
          (session.user.id === fetchedOrder.userId || session.user.role === "ADMIN")
      );
      const hasValidAccessToken = Boolean(
        tokenParam &&
          verifyOrderAccessToken(tokenParam, fetchedOrder.id, fetchedOrder.clientEmail || "")
      );

      if (verifiedViaPaymobRef || hasValidAccessToken || isOwnerOrAdmin) {
        order = fetchedOrder;
      }
    }
  }

  const clientName = order
    ? order.user?.name ||
      order.orderNotes?.match(/\[Customer:\s*([^\]]+)\]/i)?.[1]?.trim() ||
      (lang === "ar" ? "عميل جيفتيسان" : "Giftisan Customer")
    : undefined;

  const accessToken = order
    ? signOrderAccessToken(order.id, order.clientEmail || "")
    : undefined;

  // Serialize Prisma models to plain JSON-compatible objects without leaking sensitive fields
  const serializedOrder = order
    ? {
        id: order.id,
        userId: order.userId,
        status: order.status,
        totalAmount: order.totalAmount,
        discountApplied: order.discountApplied,
        shippingCost: order.shippingCost,
        shippingAddress: order.shippingAddress,
        shippingCity: order.shippingCity,
        shippingCountry: order.shippingCountry,
        clientName,
        clientEmail: order.clientEmail,
        clientPhone: order.clientPhone,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        items: order.items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          product: {
            ...sanitizePublicProduct(item.product),
            createdAt: item.product.createdAt.toISOString(),
            updatedAt: item.product.updatedAt.toISOString(),
          },
        })),
        shippingMethod: order.shippingMethod
          ? {
              ...order.shippingMethod,
              createdAt: order.shippingMethod.createdAt.toISOString(),
              updatedAt: order.shippingMethod.updatedAt.toISOString(),
            }
          : null,
      }
    : null;

  return (
    <SuccessClient
      dict={dict}
      lang={lang}
      order={serializedOrder}
      accessToken={accessToken}
      isFailed={isFailed}
      errorMessage={errorMessage}
    />
  );
}
