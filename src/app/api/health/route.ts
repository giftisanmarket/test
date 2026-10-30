import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const start = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Math.round(performance.now() - start);

    return NextResponse.json(
      {
        status: "ok",
        uptime: process.uptime ? Math.round(process.uptime()) : undefined,
        databaseLatencyMs: latency,
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "Database connectivity check failed",
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  }
}

