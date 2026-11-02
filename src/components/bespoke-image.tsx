"use client";

import { useState, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { Skeleton } from "./skeleton";
import { cn, getOptimizedImageUrl, isVideoUrl, getVideoPosterUrl } from "@/lib/utils";

interface BespokeImageProps extends ImageProps {
  containerClassName?: string;
  type?: "product" | "artisan" | "review";
  id?: string;
}

export function BespokeImage({ 
  src, 
  alt, 
  className, 
  containerClassName,
  type,
  id,
  ...props 
}: BespokeImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const isFill = !!props.fill;

  // Resolve image source: prefer direct source; fallback to internal endpoint only if src is absent
  const rawSrc = typeof src === "string" ? src.trim() : "";
  const resolvedSrc = rawSrc || (type && id ? `/api/image/${type}/${id}` : "/icon.png");

  useEffect(() => {
    setIsLoading(true);
  }, [resolvedSrc]);

  const isVideo = isVideoUrl(resolvedSrc);
  const posterUrl = isVideo ? getVideoPosterUrl(resolvedSrc) : undefined;

  // Dynamic Edge CDN loader for Cloudinary and Unsplash
  const cdnLoader = ({ src: lSrc, width, quality }: { src: string; width: number; quality?: number }) => {
    if (!lSrc) return "/icon.png";
    if (lSrc.includes("res.cloudinary.com")) {
      return getOptimizedImageUrl(lSrc, { width, quality: quality || "auto" });
    }
    if (lSrc.includes("images.unsplash.com")) {
      const separator = lSrc.includes("?") ? "&" : "?";
      return `${lSrc}${separator}w=${width}&q=${quality || 80}&auto=format`;
    }
    return lSrc;
  };

  const isCdnEligible = typeof resolvedSrc === "string" && (
    resolvedSrc.includes("res.cloudinary.com") || resolvedSrc.includes("images.unsplash.com")
  );

  return (
    <div className={cn(
      "relative overflow-hidden", 
      isFill && "h-full w-full",
      containerClassName
    )}>
      {isLoading && <Skeleton className="absolute inset-0 z-10" />}
      {isVideo ? (
        <video
          ref={(el) => {
            if (el) {
              el.muted = true;
              el.play().catch(() => {});
            }
          }}
          src={resolvedSrc}
          poster={posterUrl}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className={cn(
            "transition-all duration-700 w-full h-full object-cover",
            isLoading ? "scale-105 blur-lg grayscale" : "scale-100 blur-0 grayscale-0",
            className
          )}
          onLoadedData={() => setIsLoading(false)}
          onCanPlay={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
          style={props.style}
          onClick={props.onClick as any}
          aria-label={alt || "Product media"}
          title={alt}
        />
      ) : (
        <Image
          loader={props.loader || (isCdnEligible ? cdnLoader : undefined)}
          src={resolvedSrc}
          alt={alt}
          className={cn(
            "transition-all duration-700",
            isLoading ? "scale-105 blur-lg grayscale" : "scale-100 blur-0 grayscale-0",
            className
          )}
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
          sizes={props.sizes || (isFill ? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" : undefined)}
          {...props}
        />
      )}
    </div>
  );
}
