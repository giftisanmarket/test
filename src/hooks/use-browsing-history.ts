"use client";

import { useState, useEffect, useCallback } from "react";

export interface BrowsingHistoryItem {
  id: string;
  slug?: string | null;
  name: string;
  price: number;
  category?: string | null;
  image: string;
  artisanName?: string | null;
  viewedAt: number;
}

const STORAGE_KEY_VIEWS = "giftisan_recent_views_v1";
const STORAGE_KEY_AFFINITIES = "giftisan_category_affinities_v1";
const MAX_HISTORY = 16;

/**
 * Client-side browsing history and category affinity tracker.
 * Powers the Etsy-style "Continue browsing" shelf and personalized feed ranking with 0ms server latency.
 */
export function useBrowsingHistory() {
  const [recentViews, setRecentViews] = useState<BrowsingHistoryItem[]>([]);
  const [categoryAffinities, setCategoryAffinities] = useState<Record<string, number>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const storedViews = localStorage.getItem(STORAGE_KEY_VIEWS);
      if (storedViews) {
        const parsed = JSON.parse(storedViews);
        if (Array.isArray(parsed)) {
          setRecentViews(parsed);
        }
      }

      const storedAffinities = localStorage.getItem(STORAGE_KEY_AFFINITIES);
      if (storedAffinities) {
        const parsed = JSON.parse(storedAffinities);
        if (typeof parsed === "object" && parsed !== null) {
          setCategoryAffinities(parsed);
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Record a product view
  const recordView = useCallback((product: {
    id: string;
    slug?: string | null;
    name: string;
    price: number;
    category?: string | null;
    image?: string | null;
    artisanName?: string | null;
  }) => {
    if (typeof window === "undefined" || !product?.id) return;

    try {
      const newItem: BrowsingHistoryItem = {
        id: product.id,
        slug: product.slug || null,
        name: product.name,
        price: product.price,
        category: product.category || null,
        image: product.image || "/placeholder.jpg",
        artisanName: product.artisanName || null,
        viewedAt: Date.now(),
      };

      // 1. Update Recent Views (deduplicate and keep most recent at top)
      setRecentViews((prev) => {
        const filtered = prev.filter((item) => item.id !== newItem.id);
        const updated = [newItem, ...filtered].slice(0, MAX_HISTORY);
        try {
          localStorage.setItem(STORAGE_KEY_VIEWS, JSON.stringify(updated));
        } catch {}
        return updated;
      });

      // 2. Increment Category Affinity score
      if (product.category) {
        const catKey = product.category.toLowerCase().trim();
        setCategoryAffinities((prev) => {
          const updated = {
            ...prev,
            [catKey]: (prev[catKey] || 0) + 1,
          };
          try {
            localStorage.setItem(STORAGE_KEY_AFFINITIES, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    } catch {
      // Fallback
    }
  }, []);

  const clearHistory = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY_VIEWS);
      localStorage.removeItem(STORAGE_KEY_AFFINITIES);
      setRecentViews([]);
      setCategoryAffinities({});
    } catch {}
  }, []);

  return {
    recentViews,
    categoryAffinities,
    isLoaded,
    recordView,
    clearHistory,
  };
}
