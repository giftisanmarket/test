import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * AUTOMATED ESCROW CLEARANCE CRON ENDPOINT
 * 
 * This API endpoint can be called by:
 * 1. Vercel Cron (sends x-vercel-cron header or Bearer <CRON_SECRET>)
 * 2. An external scheduler with Authorization: Bearer <CRON_SECRET>
 * 3. An authenticated Admin user session
 * 
 * Path: GET /api/cron/clear-escrow
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Authorization Guard
    const authHeader = req.headers.get("authorization");
    const isVercelCron = req.headers.get("x-vercel-cron") === "1" || req.headers.get("user-agent")?.includes("vercel-cron");
    const cronSecret = process.env.CRON_SECRET;
    const isProd = process.env.NODE_ENV === "production";

    let isAuthorized = !isProd; // Allowed in development

    if (!isAuthorized) {
      if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
        isAuthorized = true;
      } else if (isVercelCron) {
        isAuthorized = true;
      } else {
        const session = await auth();
        if (session?.user?.role === "ADMIN") {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Configurable holding window (7 days is standard ecommerce escrow)
    const HOLDING_DAYS = 7;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - HOLDING_DAYS);

    console.log(`⏳ [Cron Escrow] Scanning for SALE transactions created before: ${thresholdDate.toISOString()}`);

    // 3. Find pending sale transactions older than the threshold
    const pendingSales = await prisma.artisanTransaction.findMany({
      where: {
        type: "SALE",
        status: "PENDING",
        createdAt: {
          lt: thresholdDate
        },
        order: {
          status: "DELIVERED"
        }
      }
    });

    if (pendingSales.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending escrow balances matched the clearance criteria today."
      });
    }

    let clearedCount = 0;
    const clearedTransactionsLog: Array<{ txId: string; artisanId: string; amount: number }> = [];

    // 4. Process each transaction atomically
    for (const tx of pendingSales) {
      try {
        await prisma.$transaction(async (prismaTx) => {
          // A. Mark transaction as CLEARED
          await prismaTx.artisanTransaction.update({
            where: { id: tx.id },
            data: { status: "CLEARED" }
          });

          // B. Transfer funds from pending to withdrawable
          await prismaTx.artisanBalance.update({
            where: { artisanId: tx.artisanId },
            data: {
              pending: { decrement: tx.amount },
              withdrawable: { increment: tx.amount }
            }
          });
        });

        clearedTransactionsLog.push({ txId: tx.id, artisanId: tx.artisanId, amount: tx.amount });
        clearedCount++;
      } catch (err: any) {
        console.error(`❌ [Cron Escrow] Failed to clear transaction ${tx.id} for artisan ${tx.artisanId}:`, err);
      }
    }

    console.log(`🎉 [Cron Escrow] Process completed. Successfully cleared ${clearedCount} transaction(s).`);

    return NextResponse.json({
      success: true,
      clearedCount,
      clearedTransactions: clearedTransactionsLog
    });

  } catch (error: any) {
    console.error("❌ [Cron Escrow] Unexpected error during execution:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      message: error.message || "An unexpected error occurred." 
    }, { status: 500 });
  }
}
