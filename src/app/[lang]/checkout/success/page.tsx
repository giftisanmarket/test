import { getDictionary, hasLocale } from "../../dictionaries";
import { notFound } from "next/navigation";
import { SuccessClient } from "@/components/success-client";
import { prisma } from "@/lib/prisma";
import { createOrderFromAbandonedCheckout } from "@/lib/actions";

interface SuccessPageProps {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SuccessPage({ params, searchParams }: SuccessPageProps) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  
  const dict = await getDictionary(lang as any);
  const search = await searchParams;
  
  const successParam = search.success as string | undefined;
  const isFailed = successParam === "false";
  const errorMessage = search.data_message as string | undefined;

  let orderId = search.orderId as string | undefined;
  const rawRef = (search.merchant_order_id || search.special_reference) as string | undefined;

  // Resolve orderId via Paymob's merchant_order_id if not directly in URL
  if (!orderId && rawRef) {
    if (rawRef.startsWith("AC-")) {
      const abandonedCheckoutId = rawRef.replace(/^AC-/, "").split("-").slice(0, -1).join("-");
      if (abandonedCheckoutId) {
        try {
          const rows = await prisma.$queryRawUnsafe<any[]>(
            `SELECT id, "orderId", status FROM "AbandonedCheckout" WHERE id = $1 LIMIT 1`,
            abandonedCheckoutId
          );
          const ac = rows?.[0];
          if (ac?.orderId) {
            orderId = ac.orderId;
          } else if (!isFailed) {
            // Webhook race condition / local dev fallback: convert immediately
            const newOrder = await createOrderFromAbandonedCheckout(abandonedCheckoutId, rawRef);
            if (newOrder?.id) {
              orderId = newOrder.id;
            }
          }
        } catch (err) {
          console.error("Failed to resolve abandoned checkout in success page:", err);
        }
      }
    } else {
      // Legacy format: <orderId>-<timestamp>
      orderId = rawRef.includes("-") ? rawRef.split("-")[0] : rawRef;
    }
  }

  let order = null;
  if (orderId && !isFailed) {
    order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true
          }
        },
        shippingMethod: true
      }
    });
  }

  // Serialize Prisma models to plain JSON-compatible objects
  const serializedOrder = order ? {
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map(item => ({
      ...item,
      product: {
        ...item.product,
        createdAt: item.product.createdAt.toISOString(),
        updatedAt: item.product.updatedAt.toISOString()
      }
    })),
    shippingMethod: order.shippingMethod ? {
      ...order.shippingMethod,
      createdAt: order.shippingMethod.createdAt.toISOString(),
      updatedAt: order.shippingMethod.updatedAt.toISOString()
    } : null
  } : null;

  return (
    <SuccessClient 
      dict={dict} 
      lang={lang} 
      order={serializedOrder} 
      isFailed={isFailed}
      errorMessage={errorMessage}
    />
  );
}
