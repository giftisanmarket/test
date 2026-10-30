import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { safeCompareSecrets } from "@/lib/security";
import { clearEligibleArtisanEscrow } from "@/lib/services/order-service";

/**
 * AUTOMATED ESCROW CLEARANCE CRON ENDPOINT
 * Authorized strictly via:
 * 1. Authorization: Bearer <CRON_SECRET> (Vercel Cron sends this automatically when CRON_SECRET is set)
 * 2. An authenticated ADMIN user session
 *
 * Path: GET /api/cron/clear-escrow
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";
    const cronSecret = process.env.CRON_SECRET;

    let isAuthorized = false;

    if (cronSecret && safeCompareSecrets(bearerToken, cronSecret)) {
      isAuthorized = true;
    } else {
      const session = await auth();
      if (session?.user?.role === "ADMIN") {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clearedCount, clearedTransactions } = await clearEligibleArtisanEscrow();

    if (clearedCount === 0) {
      return NextResponse.json({
        success: true,
        clearedCount: 0,
        message: "No pending escrow balances matched the clearance criteria today.",
      });
    }

    console.log(
      `[Cron Escrow] Completed. Cleared ${clearedCount} transaction(s) to withdrawable balances.`
    );

    return NextResponse.json({
      success: true,
      clearedCount,
      clearedTransactions,
    });
  } catch (error: any) {
    console.error("[Cron Escrow] Unexpected error during execution:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
