import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { generateUniqueProductSlug } from "@/lib/actions";
import { safeCompareSecrets } from "@/lib/security";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    const cronSecret = process.env.CRON_SECRET;

    let isAuthorized = Boolean(cronSecret && safeCompareSecrets(bearerToken, cronSecret));

    if (!isAuthorized) {
      const session = await auth();
      if (session?.user?.role === "ADMIN") {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Backfill ONLY products that do not yet have a slug so existing indexed URLs never break
    const productsMissingSlugs = await prisma.product.findMany({
      where: { OR: [{ slug: null }, { slug: "" }] },
      select: { id: true, name: true },
    });

    let updatedProducts = 0;
    for (const product of productsMissingSlugs) {
      const slug = await generateUniqueProductSlug(product.name, product.id);
      await prisma.product.update({
        where: { id: product.id },
        data: { slug },
      });
      updatedProducts++;
    }

    // Backfill ONLY artisans that do not yet have a slug so custom studio URLs and QR codes stay intact
    const artisansMissingSlugs = await prisma.artisanProfile.findMany({
      where: { OR: [{ slug: null }, { slug: "" }] },
      select: {
        id: true,
        userId: true,
        studioName: true,
        user: { select: { name: true } },
      },
    });

    let updatedArtisans = 0;
    for (const artisan of artisansMissingSlugs) {
      const nameToUse = artisan.studioName || artisan.user.name || "artisan";
      const baseSlug = slugify(nameToUse) || "artisan";
      const candidateSlug = `${baseSlug}-${artisan.userId.slice(-4)}`;
      await prisma.artisanProfile.update({
        where: { id: artisan.id },
        data: { slug: candidateSlug },
      });
      updatedArtisans++;
    }

    return NextResponse.json({
      success: true,
      updatedProducts,
      updatedArtisans,
      message: "Missing slugs backfilled successfully",
    });
  } catch (error: any) {
    console.error("[sync-slugs] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync slugs" },
      { status: 500 }
    );
  }
}
