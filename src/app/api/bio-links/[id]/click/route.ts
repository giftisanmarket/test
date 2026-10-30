import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ip = await getClientIp();
    const rate = checkRateLimit(`bio-click:${ip}:${id}`, 10, 60_000);
    if (!rate.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const updated = await prisma.artisanBioLink.updateMany({
      where: { id },
      data: {
        clicks: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/bio-links/[id]/click error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
