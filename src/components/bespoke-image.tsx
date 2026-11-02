"use client";

import { useState, useEffect, useRef } from "react";
import Image, { ImageProps } from "next/image";
import { Skeleton } from "./skeleton";
import { cn, getOptimizedImageUrl, isVideoUrl, getVideoPosterUrl } from "@/lib/utils";

interface BespokeImageProps extends ImageProps {
  containerClassName?: string;
  type?: "product" | "artisan" | "review";
  id?: string;
  images?: string[]; // All product media
  videoUrl?: string; // Etsy-style: Video URL to play on hover
  hoverToPlay?: boolean; // When true (default for cards), shows photo and plays video on hover/in-view
}

export function BespokeImage({ 
  src, 
  alt, 
  className, 
  containerClassName,
  type,
  id,
  images,
  videoUrl,
  hoverToPlay = true,
  ...props 
}: BespokeImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isFill = !!props.fill;

  // Resolve image source: prefer direct source; fallback to internal endpoint only if src is absent
  const rawSrc = typeof src === "string" ? src.trim() : "";
  const resolvedSrc = rawSrc || (type && id ? `/api/image/${type}/${id}` : "/icon.png");

  useEffect(() => {
    setIsLoading(true);
  }, [resolvedSrc]);

  const isSrcVideo = isVideoUrl(resolvedSrc);

  // Etsy-Style: If a product has uploaded images, prefer an actual uploaded photo as the cover card image
  const photoFromImages = images?.find((img) => img && typeof img === "string" && !isVideoUrl(img));
  const activeVideoUrl = videoUrl || images?.find(isVideoUrl) || (isSrcVideo ? resolvedSrc : undefined);
  const hasVideo = !!activeVideoUrl;

  // Determine cover photo source:
  // 1. If images has an actual photo, use that!
  // 2. If src is an image, use src!
  // 3. If src is a video and no photo exists, use the video's poster snapshot
  const staticCoverSrc = photoFromImages 
    || (!isSrcVideo ? resolvedSrc : (getVideoPosterUrl(resolvedSrc) || resolvedSrc));

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

  const isCdnEligible = typeof staticCoverSrc === "string" && (
    staticCoverSrc.includes("res.cloudinary.com") || staticCoverSrc.includes("images.unsplash.com")
  );

  // Etsy Desktop Hover Interaction: Play on hover, pause & reset on mouse leave
  const handleMouseEnter = () => {
    if (!hasVideo || !videoRef.current || !hoverToPlay) return;
    const v = videoRef.current;
    v.currentTime = 0;
    const playPromise = v.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      setIsPlaying(true);
    }
  };

  const handleMouseLeave = () => {
    if (!hasVideo || !videoRef.current || !hoverToPlay) return;
    const v = videoRef.current;
    v.pause();
    v.currentTime = 0;
    setIsPlaying(false);
  };

  // Etsy Mobile Interaction: On touch devices where hover does not exist,
  // autoplay when card enters central viewport (threshold: 0.6) and pause when scrolled away
  useEffect(() => {
    if (!hasVideo || !containerRef.current || !hoverToPlay) return;
    if (typeof window === "undefined") return;

    const isTouch = window.matchMedia("(hover: none)").matches;
    if (!isTouch) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!videoRef.current) return;
          if (entry.isIntersecting) {
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.then(() => setIsPlaying(true)).catch(() => {});
            }
          } else {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.6 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [hasVideo, hoverToPlay]);

  return (
    <div 
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative overflow-hidden", 
        isFill && "h-full w-full",
        containerClassName
      )}
    >
      {isLoading && <Skeleton className="absolute inset-0 z-10 pointer-events-none" />}

      {/* Static Cover Image: Displays an actual uploaded photo from the product */}
      <Image
        loader={props.loader || (isCdnEligible ? cdnLoader : undefined)}
        src={staticCoverSrc}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "scale-105 blur-lg grayscale" : "scale-100 blur-0 grayscale-0",
          hasVideo && isPlaying ? "opacity-0" : "opacity-100",
          className
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => setIsLoading(false)}
        sizes={props.sizes || (isFill ? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" : undefined)}
        {...props}
      />

      {/* Etsy-Style Hover / In-View Video: Plays on hover over the static photo */}
      {hasVideo && (
        <video
          ref={(el) => {
            (videoRef as any).current = el;
            if (el) {
              el.muted = true;
              if (!hoverToPlay) {
                el.play().catch(() => {});
                setIsPlaying(true);
              }
            }
          }}
          src={activeVideoUrl}
          loop
          muted
          playsInline
          preload="metadata"
          onPlaying={() => setIsPlaying(true)}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none",
            isPlaying ? "opacity-100" : "opacity-0",
            className
          )}
          style={props.style}
          aria-label={alt || "Product media"}
          title={alt}
        />
      )}
    </div>
  );
}
