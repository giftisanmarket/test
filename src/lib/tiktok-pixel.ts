"use client";

declare global {
  interface Window {
    ttq?: {
      track: (event: string, params?: Record<string, any>) => void;
      page: () => void;
      identify: (params?: Record<string, any>) => void;
    };
  }
}

/**
 * Safely triggers client-side TikTok Pixel events
 */
export function trackTikTokEvent(event: string, params?: Record<string, any>) {
  if (typeof window !== "undefined" && window.ttq && typeof window.ttq.track === "function") {
    try {
      window.ttq.track(event, params);
    } catch (e) {
      console.warn("TikTok tracking error:", e);
    }
  }
}

