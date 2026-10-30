import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { auth } from "@/auth";
import { getOptimizedImageUrl } from "@/lib/utils";

const ALLOWED_REMOTE_IMAGE_HOSTS = new Set([
  "res.cloudinary.com",
  "images.unsplash.com",
  "lh3.googleusercontent.com",
  "api.dicebear.com",
]);

const MAX_REMOTE_IMAGE_BYTES = 12 * 1024 * 1024; // 12 MB safety ceiling

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const searchParams = request.nextUrl.searchParams;

  // Bounded optimization parameters to block CPU/RAM amplification DoS
  const rawWidth = parseInt(searchParams.get("w") || "1080", 10);
  const width = Math.min(1920, Math.max(32, Number.isFinite(rawWidth) ? rawWidth : 1080));

  const rawQuality = parseInt(searchParams.get("q") || "80", 10);
  const quality = Math.min(90, Math.max(40, Number.isFinite(rawQuality) ? rawQuality : 80));

  const format = searchParams.get("f") || "webp";

  try {
    let imageData: string | null = null;
    let isPrivateDraft = false;

    if (type === "product") {
      const product = await prisma.product.findUnique({
        where: { id },
        select: {
          images: true,
          status: true,
          artisan: { select: { userId: true } },
        },
      });

      if (!product) {
        return new NextResponse("Image not found", { status: 404 });
      }

      if (product.status !== "APPROVED") {
        const session = await auth();
        const isOwnerOrAdmin =
          session?.user?.role === "ADMIN" ||
          (Boolean(session?.user?.id) && session?.user?.id === product.artisan?.userId);
        if (!isOwnerOrAdmin) {
          return new NextResponse("Image not found", { status: 404 });
        }
        isPrivateDraft = true;
      }

      imageData = product.images[0] || null;
    } else if (type === "artisan") {
      const artisan = await prisma.artisanProfile.findUnique({
        where: { id },
        select: { avatar: true, studioName: true, userId: true },
      });
      if (!artisan) {
        return new NextResponse("Image not found", { status: 404 });
      }
      const seed = encodeURIComponent(artisan.studioName || artisan.userId || id);
      imageData = artisan.avatar || `https://api.dicebear.com/10.x/gaze/svg?seed=${seed}`;
    } else if (type === "review") {
      const review = await prisma.review.findUnique({
        where: { id },
        select: { images: true },
      });
      imageData = review?.images[0] || null;
    } else {
      return new NextResponse("Invalid image type", { status: 400 });
    }

    if (!imageData) {
      return new NextResponse("Image not found", { status: 404 });
    }

    const cacheControlHeader = isPrivateDraft
      ? "private, no-store"
      : "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400";

    // High performance shortcut: If image is hosted on Cloudinary CDN, redirect directly to Cloudinary's edge
    if (imageData.startsWith("https://res.cloudinary.com/") || imageData.startsWith("http://res.cloudinary.com/")) {
      const cdnUrl = getOptimizedImageUrl(imageData, { width, quality });
      return NextResponse.redirect(cdnUrl, {
        status: 307,
        headers: {
          "Cache-Control": cacheControlHeader,
        },
      });
    }

    let buffer: Buffer;
    let contentType: string;

    if (imageData.startsWith("http://") || imageData.startsWith("https://")) {
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(imageData);
      } catch {
        return new NextResponse("Invalid remote image URL", { status: 400 });
      }

      if (
        (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") ||
        !ALLOWED_REMOTE_IMAGE_HOSTS.has(parsedUrl.hostname.toLowerCase())
      ) {
        return new NextResponse("Disallowed remote image host", { status: 403 });
      }

      const response = await fetch(parsedUrl.toString(), {
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        return new NextResponse("Upstream image unavailable", { status: 502 });
      }

      const contentLength = Number(response.headers.get("content-length") || "0");
      if (contentLength > MAX_REMOTE_IMAGE_BYTES) {
        return new NextResponse("Remote image too large", { status: 413 });
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_REMOTE_IMAGE_BYTES) {
        return new NextResponse("Remote image too large", { status: 413 });
      }

      buffer = Buffer.from(arrayBuffer);
      contentType = response.headers.get("Content-Type") || "image/jpeg";
    } else if (imageData.startsWith("data:image")) {
      const matches = imageData.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return new NextResponse("Invalid image format", { status: 400 });
      }
      contentType = matches[1];
      buffer = Buffer.from(matches[2], "base64");
    } else if (imageData.startsWith("/")) {
      const publicDir = path.resolve(process.cwd(), "public");
      const resolvedPath = path.resolve(publicDir, "." + imageData);
      if (!resolvedPath.startsWith(publicDir + path.sep)) {
        return new NextResponse("Forbidden path", { status: 403 });
      }

      try {
        buffer = await fs.readFile(resolvedPath);
        const ext = path.extname(resolvedPath).slice(1).toLowerCase();
        contentType =
          ext === "png"
            ? "image/png"
            : ext === "svg"
            ? "image/svg+xml"
            : ext === "webp"
            ? "image/webp"
            : "image/jpeg";
      } catch {
        return new NextResponse("Local file not found", { status: 404 });
      }
    } else {
      return new NextResponse("Unknown image source", { status: 400 });
    }

    // Processing with Sharp
    let transformed = sharp(buffer);
    const metadata = await transformed.metadata();

    if (metadata.width && metadata.width > width) {
      transformed = transformed.resize(width, null, {
        withoutEnlargement: true,
        fit: "inside",
      });
    }

    if (format === "webp") {
      transformed = transformed.webp({ quality, effort: 4 });
      contentType = "image/webp";
    } else if (format === "avif") {
      transformed = transformed.avif({ quality, effort: 4 });
      contentType = "image/avif";
    } else {
      transformed = transformed.jpeg({ quality, mozjpeg: true, progressive: true });
      contentType = "image/jpeg";
    }

    const outputBuffer = await transformed.toBuffer();

    return new NextResponse(new Uint8Array(outputBuffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": cacheControlHeader,
        "X-Image-Optimizer": "Sharp",
      },
    });
  } catch (error) {
    console.error("Image optimization error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
