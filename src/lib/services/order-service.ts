import { prisma } from "@/lib/prisma";
import { getEffectiveArtisanCommissionRate } from "@/lib/commission";
import { getEscrowClearanceThresholdDate } from "@/lib/utils";
import { OPEN_REFUND_CLAIM_STATUSES } from "@/lib/refund-policy";

export interface OrderLedgerItem {
  productId: string;
  name?: string;
  price: number;
  quantity: number;
}

function roundCurrency(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Internal server-only ledger recorder.
 * Idempotent per orderId: if SALE transactions already exist for this order, it safely skips duplicate credits.
 */
export async function recordArtisanOrderLedgerInTx(
  tx: any,
  params: {
    orderId: string;
    couponId?: string | null;
    discountApplied?: number | null;
    items: OrderLedgerItem[];
  }
) {
  const { orderId, couponId, discountApplied = 0, items } = params;
  if (!items || items.length === 0) return { productMap: new Map<string, any>(), skipped: true };

  // Strict idempotency guard: prevent duplicate SALE credits on webhook retries or race conditions
  const existingSaleTxCount = await tx.artisanTransaction.count({
    where: {
      orderId,
      type: "SALE",
    },
  });

  const productIds = Array.from(new Set(items.map((i) => i.productId)));
  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      name: true,
      artisanId: true,
      artisan: {
        select: {
          id: true,
          commissionRate: true,
          createdAt: true,
          termsAcceptedAt: true,
          studioName: true,
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  const productMap = new Map<string, any>(products.map((p: any) => [p.id, p]));

  if (existingSaleTxCount > 0) {
    return { productMap, skipped: true };
  }

  const coupon = couponId
    ? await tx.coupon.findUnique({
        where: { id: couponId },
        select: {
          id: true,
          code: true,
          artisanId: true,
          discountType: true,
          discountValue: true,
        },
      })
    : null;

  const artisanSponsoredTotal = coupon?.artisanId
    ? items
        .filter((item) => {
          const prod = productMap.get(item.productId);
          return prod?.artisanId === coupon.artisanId;
        })
        .reduce((sum, item) => sum + item.price * item.quantity, 0)
    : 0;

  for (const item of items) {
    const product: any = productMap.get(item.productId);
    const artisan: any = product?.artisan;
    if (!artisan) continue;

    const itemTotal = roundCurrency(item.price * item.quantity);
    let netItemTotal = itemTotal;
    let discountNote = "";

    if (coupon?.artisanId && coupon.artisanId === artisan.id && artisanSponsoredTotal > 0) {
      const itemDiscountShare = roundCurrency(
        (itemTotal / artisanSponsoredTotal) * (discountApplied || 0)
      );
      netItemTotal = Math.max(0, roundCurrency(itemTotal - itemDiscountShare));
      discountNote = ` (Shop coupon "${coupon.code}": -${itemDiscountShare.toFixed(2)} EGP)`;
    } else if (coupon && !coupon.artisanId && (discountApplied || 0) > 0) {
      discountNote = ` (Platform promo "${coupon.code}" absorbed by Giftisan)`;
    }

    const commissionRate = getEffectiveArtisanCommissionRate(artisan);
    const adminShare = roundCurrency(netItemTotal * commissionRate);
    const artisanShare = Math.max(0, roundCurrency(netItemTotal - adminShare));

    await tx.artisanTransaction.create({
      data: {
        artisanId: artisan.id,
        orderId,
        amount: artisanShare,
        type: "SALE",
        status: "PENDING",
        description: `Earnings from "${product.name || item.name || "Item"}" (Qty: ${item.quantity}). Total: ${itemTotal.toFixed(2)} EGP${discountNote}${adminShare > 0 ? ` (Commission: ${adminShare.toFixed(2)} EGP)` : ""}`,
      },
    });

    await tx.artisanBalance.upsert({
      where: { artisanId: artisan.id },
      update: { pending: { increment: artisanShare } },
      create: {
        artisanId: artisan.id,
        pending: artisanShare,
        withdrawable: 0.0,
        withdrawn: 0.0,
      },
    });
  }

  return { productMap, skipped: false };
}

/**
 * Atomically converts an AbandonedCheckout into a paid PROCESSING Order AND records artisan ledger credits
 * in a single transaction. Safe against concurrent Paymob webhook / redirect deliveries.
 */
export async function convertAbandonedCheckoutAndRecordLedger(
  abandonedCheckoutId: string,
  options?: { expectedAmountCents?: number }
): Promise<{ order: any | null; newlyCreated: boolean }> {
  const existingAc = await prisma.abandonedCheckout.findUnique({
    where: { id: abandonedCheckoutId },
  });

  if (!existingAc) {
    console.error(`AbandonedCheckout not found for id: ${abandonedCheckoutId}`);
    return { order: null, newlyCreated: false };
  }

  if (options?.expectedAmountCents !== undefined) {
    const expectedCents = Math.round(existingAc.totalAmount * 100);
    if (Math.abs(options.expectedAmountCents - expectedCents) > 5) {
      throw new Error(
        `Paid amount mismatch for AbandonedCheckout ${abandonedCheckoutId}: received ${options.expectedAmountCents} cents, expected ${expectedCents} cents.`
      );
    }
  }

  if (existingAc.status === "CONVERTED" && existingAc.orderId) {
    const existingOrder = await prisma.order.findUnique({
      where: { id: existingAc.orderId },
      include: {
        user: true,
        shippingMethod: true,
        items: {
          include: {
            product: { include: { artisan: { include: { user: true } } } },
          },
        },
      },
    });

    if (existingOrder) {
      await prisma.$transaction(async (tx) => {
        await recordArtisanOrderLedgerInTx(tx, {
          orderId: existingOrder.id,
          couponId: existingOrder.couponId,
          discountApplied: existingOrder.discountApplied,
          items: existingOrder.items.map((i: any) => ({
            productId: i.productId,
            name: i.product?.name,
            price: i.price,
            quantity: i.quantity,
          })),
        });
      });
    }

    return { order: existingOrder, newlyCreated: false };
  }

  const storedItems: any[] = Array.isArray(existingAc.items) ? (existingAc.items as any[]) : [];
  if (storedItems.length === 0) {
    throw new Error(`AbandonedCheckout ${abandonedCheckoutId} has no items.`);
  }

  const shippingData = storedItems[0]?.shippingData || {};
  let effectiveUserId: string | null = shippingData.userId || null;

  if (!effectiveUserId && existingAc.customerEmail) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: { equals: existingAc.customerEmail.toLowerCase().trim(), mode: "insensitive" },
      },
      select: { id: true },
    });
    if (existingUser) effectiveUserId = existingUser.id;
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Atomically claim this AbandonedCheckout so concurrent requests cannot double-create
    const claimed = await tx.abandonedCheckout.updateMany({
      where: {
        id: abandonedCheckoutId,
        status: { not: "CONVERTED" },
      },
      data: {
        status: "CONVERTED",
      },
    });

    if (claimed.count === 0) {
      const refreshed = await tx.abandonedCheckout.findUnique({
        where: { id: abandonedCheckoutId },
      });
      if (refreshed?.orderId) {
        const concurrentOrder = await tx.order.findUnique({
          where: { id: refreshed.orderId },
          include: {
            user: true,
            shippingMethod: true,
            items: {
              include: {
                product: { include: { artisan: { include: { user: true } } } },
              },
            },
          },
        });
        return { order: concurrentOrder, newlyCreated: false };
      }
      return { order: null, newlyCreated: false };
    }

    // 2. Atomically decrement stock using conditional gte guards to prevent overselling
    for (const item of storedItems) {
      const qty = Math.max(1, Math.round(Number(item.quantity || 1)));
      if (item.variantId) {
        const updatedVariant = await tx.productVariant.updateMany({
          where: { id: item.variantId, productId: item.id, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
        });
        if (updatedVariant.count !== 1) {
          throw new Error(
            `Stock unavailable for variant "${item.variantName || item.name || item.id}".`
          );
        }
      } else {
        const updatedProduct = await tx.product.updateMany({
          where: { id: item.id, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
        });
        if (updatedProduct.count !== 1) {
          throw new Error(`Stock unavailable for "${item.name || item.id}".`);
        }
      }
    }

    // 3. Create the Order
    const newOrder = await tx.order.create({
      data: {
        userId: effectiveUserId,
        totalAmount: existingAc.totalAmount,
        status: "PROCESSING",
        shippingAddress: shippingData.address || existingAc.shippingAddress,
        shippingCity: shippingData.city || existingAc.shippingCity,
        shippingZip: shippingData.zip || null,
        shippingCountry: shippingData.country || "Egypt",
        clientPhone: shippingData.phone || existingAc.customerPhone,
        clientEmail: (shippingData.email || existingAc.customerEmail || "").trim().toLowerCase(),
        orderNotes: shippingData.orderNotes || existingAc.orderNotes,
        isGift: Boolean(shippingData.isGift),
        giftMessage: shippingData.giftMessage || null,
        couponId: shippingData.couponId || null,
        discountApplied: existingAc.discountApplied ?? shippingData.discountApplied ?? 0,
        shippingMethodId: shippingData.shippingMethodId || null,
        shippingCost: existingAc.shippingCost ?? shippingData.shippingCost ?? 0,
        items: {
          create: storedItems.map((item: any) => ({
            productId: item.id,
            variantId: item.variantId || null,
            quantity: Math.max(1, Math.round(Number(item.quantity || 1))),
            price: Number(item.price),
            personalization: item.personalization || null,
            customImage: item.customImage || null,
          })),
        },
      },
      include: {
        user: true,
        shippingMethod: true,
        items: {
          include: {
            product: { include: { artisan: { include: { user: true } } } },
          },
        },
      },
    });

    // 4. Increment coupon usage within maxUses bounds if applicable
    if (shippingData.couponId) {
      const coupon = await tx.coupon.findUnique({ where: { id: shippingData.couponId } });
      if (
        coupon &&
        coupon.isActive &&
        (!coupon.expiresAt || new Date(coupon.expiresAt) > new Date()) &&
        (coupon.maxUses === null || coupon.usedCount < coupon.maxUses)
      ) {
        await tx.coupon.update({
          where: { id: shippingData.couponId },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    // 5. Link orderId onto AbandonedCheckout
    await tx.abandonedCheckout.update({
      where: { id: abandonedCheckoutId },
      data: {
        status: "CONVERTED",
        orderId: newOrder.id,
      },
    });

    // 6. Record artisan ledger in the exact same transaction
    await recordArtisanOrderLedgerInTx(tx, {
      orderId: newOrder.id,
      couponId: newOrder.couponId,
      discountApplied: newOrder.discountApplied,
      items: newOrder.items.map((i: any) => ({
        productId: i.productId,
        name: i.product?.name,
        price: i.price,
        quantity: i.quantity,
      })),
    });

    return { order: newOrder, newlyCreated: true };
  });
}

/**
 * Atomically clears eligible PENDING SALE transactions older than 7 days for DELIVERED orders
 * that have NO open RefundRequests. Safe against concurrent invocations.
 */
export async function clearEligibleArtisanEscrow(artisanId?: string): Promise<{
  clearedCount: number;
  clearedTransactions: Array<{ txId: string; artisanId: string; amount: number }>;
}> {
  const thresholdDate = getEscrowClearanceThresholdDate(7);

  const eligibleSales = await prisma.artisanTransaction.findMany({
    where: {
      ...(artisanId ? { artisanId } : {}),
      type: "SALE",
      status: "PENDING",
      createdAt: { lt: thresholdDate },
      order: {
        status: { in: ["DELIVERED", "REFUNDED"] },
        refundRequests: {
          none: { status: { in: [...OPEN_REFUND_CLAIM_STATUSES] } },
        },
      },
    },
  });

  if (eligibleSales.length === 0) {
    return { clearedCount: 0, clearedTransactions: [] };
  }

  let clearedCount = 0;
  const clearedTransactions: Array<{ txId: string; artisanId: string; amount: number }> = [];

  for (const saleTx of eligibleSales) {
    try {
      const didClear = await prisma.$transaction(async (prismaTx) => {
        // Atomic state transition: only the first caller flips PENDING -> CLEARED
        const claimed = await prismaTx.artisanTransaction.updateMany({
          where: { id: saleTx.id, status: "PENDING" },
          data: { status: "CLEARED" },
        });

        if (claimed.count !== 1) return false;

        await prismaTx.artisanBalance.upsert({
          where: { artisanId: saleTx.artisanId },
          update: {
            pending: { decrement: saleTx.amount },
            withdrawable: { increment: saleTx.amount },
          },
          create: {
            artisanId: saleTx.artisanId,
            pending: 0,
            withdrawable: saleTx.amount,
            withdrawn: 0,
          },
        });

        return true;
      });

      if (didClear) {
        clearedCount++;
        clearedTransactions.push({
          txId: saleTx.id,
          artisanId: saleTx.artisanId,
          amount: saleTx.amount,
        });
      }
    } catch (err) {
      console.error(`Failed to clear escrow transaction ${saleTx.id}:`, err);
    }
  }

  return { clearedCount, clearedTransactions };
}

export interface OrderRefundOptions {
  restockItems?: boolean;
  debitArtisan?: boolean;
  refundAmount?: number;
  claimId?: string;
}

async function reverseOrderLedgerAndStockInTx(
  tx: any,
  orderId: string,
  targetItemStatus: "CANCELLED" | "REFUNDED",
  options?: OrderRefundOptions
) {
  const restockItems = options?.restockItems ?? true;
  const debitArtisan = options?.debitArtisan ?? true;

  // 1. Only mark & optionally restore stock for items that have NOT already been cancelled or refunded
  const restorableItems = await tx.orderItem.findMany({
    where: {
      orderId,
      status: { notIn: ["CANCELLED", "REFUNDED"] },
    },
    select: { id: true, variantId: true, productId: true, quantity: true },
  });

  if (restorableItems.length > 0) {
    await tx.orderItem.updateMany({
      where: { id: { in: restorableItems.map((i: any) => i.id) } },
      data: { status: targetItemStatus },
    });

    if (restockItems) {
      for (const item of restorableItems) {
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
        } else if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    }
  }

  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { couponId: true, totalAmount: true, shippingCost: true },
  });

  const maxMerchandiseRefund = Math.max(
    0,
    roundCurrency((order?.totalAmount || 0) - (order?.shippingCost || 0))
  );
  const isPartialRefund =
    targetItemStatus === "REFUNDED" &&
    options?.refundAmount !== undefined &&
    maxMerchandiseRefund > 0 &&
    options.refundAmount < maxMerchandiseRefund;

  // 2. Reverse SALE transactions unless the platform explicitly absorbed the refund
  if (debitArtisan) {
    const transactions = await tx.artisanTransaction.findMany({
      where: {
        orderId,
        type: "SALE",
        status: { in: ["PENDING", "CLEARED"] },
      },
    });

    const partialRatio = isPartialRefund
      ? Math.min(1, Math.max(0, (options?.refundAmount || 0) / maxMerchandiseRefund))
      : 1;

    for (const t of transactions) {
      const fullAmount = roundCurrency(Math.abs(t.amount));
      const amountToDeduct = isPartialRefund
        ? roundCurrency(fullAmount * partialRatio)
        : fullAmount;
      if (amountToDeduct <= 0) continue;

      if (isPartialRefund && t.status === "PENDING") {
        const reducedAmount = Math.max(0, roundCurrency(fullAmount - amountToDeduct));
        const updated = await tx.artisanTransaction.updateMany({
          where: { id: t.id, status: "PENDING" },
          data: reducedAmount <= 0 ? { status: "FAILED" } : { amount: reducedAmount },
        });
        if (updated.count !== 1) continue;
      } else if (!isPartialRefund) {
        const claimed = await tx.artisanTransaction.updateMany({
          where: { id: t.id, status: t.status },
          data: { status: "FAILED" },
        });
        if (claimed.count !== 1) continue;
      }

      const balance = await tx.artisanBalance.findUnique({
        where: { artisanId: t.artisanId },
      });

      if (balance) {
        if (t.status === "PENDING") {
          await tx.artisanBalance.update({
            where: { artisanId: t.artisanId },
            data: { pending: Math.max(0, roundCurrency(balance.pending - amountToDeduct)) },
          });
        } else if (t.status === "CLEARED") {
          // Allow withdrawable to go negative if artisan already withdrew prior to a Day 8-14 refund
          await tx.artisanBalance.update({
            where: { artisanId: t.artisanId },
            data: { withdrawable: roundCurrency(balance.withdrawable - amountToDeduct) },
          });
        }
      } else if (t.status === "CLEARED") {
        await tx.artisanBalance.create({
          data: {
            artisanId: t.artisanId,
            pending: 0,
            withdrawable: -amountToDeduct,
            withdrawn: 0,
          },
        });
      }

      if (targetItemStatus === "REFUNDED") {
        await tx.artisanTransaction.create({
          data: {
            artisanId: t.artisanId,
            orderId,
            amount: -amountToDeduct,
            type: "REFUND_DEBIT",
            status: "COMPLETED",
            description: options?.claimId
              ? `Refund debited for dispute #${options.claimId} (${isPartialRefund ? "Partial" : "Full"} order refund)`
              : `Refund debited for order #${orderId}`,
          },
        });
      }
    }
  }

  // 3. Restore coupon quota once on full reversal
  if (order?.couponId && !isPartialRefund) {
    await tx.coupon.updateMany({
      where: { id: order.couponId, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
  }
}

export async function processOrderCancellationInTx(tx: any, orderId: string) {
  await reverseOrderLedgerAndStockInTx(tx, orderId, "CANCELLED");
}

export async function processOrderRefundInTx(
  tx: any,
  orderId: string,
  options?: OrderRefundOptions
) {
  await reverseOrderLedgerAndStockInTx(tx, orderId, "REFUNDED", options);
}
