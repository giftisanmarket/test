import type { ShelfProduct } from "@/components/home/product-shelf-row";

export interface ScoringOptions {
  userAffinities?: Record<string, number>;
  favoriteIds?: Set<string>;
  maxPerShopInWindow?: number;
  windowSize?: number;
  deprioritizeIds?: Set<string>;
  preferFreshness?: boolean;
}

/**
 * Calculates a composite Homepage Discovery & Conversion Score:
 * Score = W_curated + W_traction + W_quality + W_giftability + W_affinity + D_freshness
 */
export function scoreProduct(product: ShelfProduct, options: ScoringOptions = {}): number {
  let score = 100;

  // 1. Stock availability (hard priority for in-stock items)
  const isOutOfStock = product.stock !== undefined && product.stock <= 0;
  if (isOutOfStock) {
    score -= 150;
  } else {
    score += 15;
  }

  // 2. Editorial & Curation Signals (W_curated)
  if (product.isFeatured) {
    score += 30;
  }
  if (product.badge) {
    score += 15;
  }
  if (product.artisan?.isVerified) {
    score += 20;
  }

  // 3. Real Marketplace Traction & Conversion Velocity (W_traction)
  if (product.ordersCount && product.ordersCount > 0) {
    score += Math.min(product.ordersCount * 18, 72);
  }
  if (product.favoritesCount && product.favoritesCount > 0) {
    score += Math.min(product.favoritesCount * 8, 40);
  }
  if (product.views && product.views > 0) {
    score += Math.min(product.views * 0.15, 20);
  }

  // 4. Review Quality & Social Proof (W_quality)
  if (product.avgRating && (product.reviewCount || 0) > 0) {
    if (product.avgRating >= 4.5) {
      score += 15 + Math.min((product.reviewCount || 0) * 4, 20);
    } else if (product.avgRating >= 4.0) {
      score += 8 + Math.min((product.reviewCount || 0) * 2, 10);
    }
  }

  // 5. Giftability & Listing Completeness (W_giftability)
  if (product.canPersonalize || product.requiresClientImage) {
    score += 12;
  }
  if (Array.isArray(product.images) && product.images.length >= 2) {
    score += 8;
  }
  if (product.price >= 80 && product.price <= 750) {
    score += 10;
  }

  // 6. Freshness / Cold-Start Discovery Boost (D_freshness)
  if (product.createdAt) {
    const createdTime = new Date(product.createdAt).getTime();
    if (!Number.isNaN(createdTime)) {
      const ageDays = Math.max(0, (Date.now() - createdTime) / (1000 * 60 * 60 * 24));
      if (options.preferFreshness) {
        // Strong recency weighting for New Arrivals shelf
        score += Math.max(0, 60 - ageDays * 1.5);
      } else if (ageDays <= 14) {
        // 14-day linear cold-start boost so new artisan creations get initial impressions
        score += Math.round(((14 - ageDays) / 14) * 18);
      }
    }
  }

  // 7. Personalized Category Affinity (Client-side browsing history)
  if (options.userAffinities && product.category) {
    const catKey = product.category.toLowerCase().trim();
    const affinityHits = options.userAffinities[catKey] || 0;
    if (affinityHits > 0) {
      score += Math.min(affinityHits * 15, 45);
    }
  }

  // 8. User Engagement (User has liked the item locally)
  if (options.favoriteIds && options.favoriteIds.has(product.id)) {
    score += 12;
  }

  // 9. Cross-Shelf Deduplication Penalty
  // Prevents the exact same products from dominating the first slots of every shelf
  if (options.deprioritizeIds && options.deprioritizeIds.has(product.id)) {
    score -= 45;
  }

  return score;
}

/**
 * Applies Marketplace Shop Diversity Constraint:
 * Enforces that no single artisan occupies more than `maxPerShopInWindow` slots in any rolling window,
 * preventing a single high-volume studio from monopolizing a shelf.
 */
export function rankProductsWithDiversity(
  products: ShelfProduct[],
  options: ScoringOptions = {}
): ShelfProduct[] {
  const maxPerShop = options.maxPerShopInWindow ?? 2;
  const windowSize = options.windowSize ?? 8;

  // 1. Score all candidate products
  const scoredCandidates = products.map((product) => ({
    product,
    score: scoreProduct(product, options),
  }));

  // 2. Sort candidates descending by score
  scoredCandidates.sort((a, b) => b.score - a.score);

  // 3. Staggered extraction with rolling window diversity
  const result: ShelfProduct[] = [];
  const deferred: ShelfProduct[] = [];
  const shopCountInWindow = new Map<string, number>();

  const getShopKey = (p: ShelfProduct) =>
    p.artisan?.id ||
    p.artisan?.slug ||
    p.artisan?.studioName ||
    p.artisan?.user?.name ||
    "independent-maker";

  for (const item of scoredCandidates) {
    const shopKey = getShopKey(item.product);
    const currentCount = shopCountInWindow.get(shopKey) || 0;

    if (currentCount < maxPerShop) {
      result.push(item.product);
      shopCountInWindow.set(shopKey, currentCount + 1);

      // Slide window: reduce counts for items falling out of the window
      if (result.length > windowSize) {
        const exitingItem = result[result.length - windowSize - 1];
        const exitingShop = getShopKey(exitingItem);
        const c = shopCountInWindow.get(exitingShop) || 1;
        shopCountInWindow.set(exitingShop, Math.max(0, c - 1));
      }
    } else {
      deferred.push(item.product);
    }
  }

  // Second pass over deferred items so shelves still fill smoothly when fewer artisans exist in a niche category
  return [...result, ...deferred];
}

/**
 * Categorizes and ranks catalog products based on the selected Etsy Discovery Tab
 */
export function filterProductsByEtsyTab(
  catalog: ShelfProduct[],
  tabId: "forYou" | "newFinds" | "personalized" | "under250" | "jewelry" | "home",
  options: ScoringOptions = {}
): ShelfProduct[] {
  let filtered: ShelfProduct[] = [];

  switch (tabId) {
    case "forYou":
      return rankProductsWithDiversity(catalog, options);

    case "newFinds":
      // Newest approved additions, sorted with recency weighting & diversity
      filtered = [...catalog];
      return rankProductsWithDiversity(filtered, {
        ...options,
        maxPerShopInWindow: 2,
        preferFreshness: true,
      });

    case "personalized":
      // Customizable gifts: name engraving, personalized messages, custom photo uploads
      filtered = catalog.filter((p) => {
        const nameLower = p.name.toLowerCase();
        const catLower = (p.category || "").toLowerCase();
        return (
          p.canPersonalize ||
          p.requiresClientImage ||
          nameLower.includes("تخصيص") ||
          nameLower.includes("بالاسم") ||
          nameLower.includes("custom") ||
          nameLower.includes("personal") ||
          catLower.includes("personal")
        );
      });
      return rankProductsWithDiversity(filtered, options);

    case "under250":
      // High-converting budget gifting threshold
      filtered = catalog.filter((p) => p.price <= 250);
      return rankProductsWithDiversity(filtered, options);

    case "jewelry":
      filtered = catalog.filter((p) => {
        const cat = (p.category || "").toLowerCase();
        const name = p.name.toLowerCase();
        return (
          cat.includes("jewel") ||
          cat.includes("silver") ||
          cat.includes("gold") ||
          cat.includes("accessories") ||
          name.includes("فضة") ||
          name.includes("خاتم") ||
          name.includes("سلسلة") ||
          name.includes("إكسسوار") ||
          name.includes("حلق")
        );
      });
      return rankProductsWithDiversity(filtered, options);

    case "home":
      filtered = catalog.filter((p) => {
        const cat = (p.category || "").toLowerCase();
        const name = p.name.toLowerCase();
        return (
          cat.includes("home") ||
          cat.includes("decor") ||
          cat.includes("living") ||
          cat.includes("pottery") ||
          cat.includes("candles") ||
          name.includes("ديكور") ||
          name.includes("فخار") ||
          name.includes("شموع") ||
          name.includes("صينية") ||
          name.includes("تابلوه")
        );
      });
      return rankProductsWithDiversity(filtered, options);

    default:
      return rankProductsWithDiversity(catalog, options);
  }
}
