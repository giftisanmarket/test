import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const artisan = await prisma.artisanProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        bioLinks: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!artisan) {
      return NextResponse.json({ error: "Artisan profile not found" }, { status: 404 });
    }

    return NextResponse.json({ bioLinks: artisan.bioLinks, artisanSlug: artisan.slug });
  } catch (error) {
    console.error("GET /api/bio-links error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const artisan = await prisma.artisanProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!artisan) {
      return NextResponse.json({ error: "Artisan profile not found" }, { status: 404 });
    }

    const body = await req.json();
    const { title, url, icon, isFeatured } = body;

    if (!title || !url) {
      return NextResponse.json({ error: "Title and URL are required" }, { status: 400 });
    }

    // Get current highest order index
    const highestOrderLink = await prisma.artisanBioLink.findFirst({
      where: { artisanId: artisan.id },
      orderBy: { order: "desc" },
    });

    const nextOrder = (highestOrderLink?.order ?? -1) + 1;

    // If marked featured, un-feature other links
    if (isFeatured) {
      await prisma.artisanBioLink.updateMany({
        where: { artisanId: artisan.id },
        data: { isFeatured: false },
      });
    }

    const newLink = await prisma.artisanBioLink.create({
      data: {
        artisanId: artisan.id,
        title: title.trim(),
        url: url.trim(),
        icon: icon || "link",
        isFeatured: Boolean(isFeatured),
        order: nextOrder,
      },
    });

    return NextResponse.json({ bioLink: newLink }, { status: 201 });
  } catch (error) {
    console.error("POST /api/bio-links error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
