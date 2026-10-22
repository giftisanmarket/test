import type { ShelfProduct } from "@/components/home/product-shelf-row";

export interface ScoringOptions {
  userAffinities?: Record<string, number>;
  favoriteIds?: Set<string>;
  maxPerShopInWindow?: number;
}

/**
 * Calculates a composite Listing Quality & Affinity Score (LQS) based on Etsy's ranking formula:
 * Score = (W_quality * LQS) + (W_trust * TrustScore) + (W_affinity * UserAffinity) + (W_freshness * Recency)
 */
export function scoreProduct(product: ShelfProduct, options: ScoringOptions = {}): number {
  let score = 100;

  // 1. Stock availability (critical filter: prioritize in-stock goods)
  const isOutOfStock = product.stock !== undefined && product.stock <= 0;
  if (isOutOfStock) {
    score -= 100; // Heavily de-prioritize sold-out items from discovery
  } else {
    score += 15;
  }

  // 2. Listing Quality Signals (Curation & Badges)
  if (product.isFeatured) {
    score += 35;
  }
  if (product.badge) {
    score += 20;
  }

  // 3. Maker Trust & Heritage Signals
  if (product.artisan?.isVerified) {
    score += 25; // Boost verified Egyptian artisans
  }

  // 4. Personalized Category Affinity (Zero-Latency Local Profiling)
  if (options.userAffinities && product.category) {
    const catKey = product.category.toLowerCase().trim();
    const affinityHits = options.userAffinities[catKey] || 0;
    if (affinityHits > 0) {
      // Damped boost: +15 points per view, capped at +45
      score += Math.min(affinityHits * 15, 45);
    }
  }

  // 5. Engagement (User has liked the item)
  if (options.favoriteIds && options.favoriteIds.has(product.id)) {
    score += 12;
  }

  // 6. Gifting Price Sweet-spot (Egyptian marketplace gifting range: 100–600 EGP)
  if (product.price >= 80 && product.price <= 600) {
    score += 10;
  }

  return score;
}

/**
 * Applies Etsy's Shop Diversity Constraint:
 * Enforces that no single artisan occupies more than `maxPerShop` slots in any window of 8 items,
 * preventing a high-volume studio from dominating the user's initial screen.
 */
export function rankProductsWithDiversity(
  products: ShelfProduct[],
  options: ScoringOptions = {}
): ShelfProduct[] {
  const maxPerShop = options.maxPerShopInWindow || 2;
  const windowSize = 8;

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

  for (const item of scoredCandidates) {
    const shopKey =
      item.product.artisan?.studioName ||
      item.product.artisan?.user?.name ||
      "independent-maker";

    const currentCount = shopCountInWindow.get(shopKey) || 0;

    if (currentCount < maxPerShop) {
      result.push(item.product);
      shopCountInWindow.set(shopKey, currentCount + 1);

      // Slide window: reduce counts for items falling out of the window
      if (result.length > windowSize) {
        const exitingItem = result[result.length - windowSize - 1];
        const exitingShop =
          exitingItem.artisan?.studioName ||
          exitingItem.artisan?.user?.name ||
          "independent-maker";
        const c = shopCountInWindow.get(exitingShop) || 1;
        shopCountInWindow.set(exitingShop, Math.max(0, c - 1));
      }
    } else {
      deferred.push(item.product);
    }
  }

  // Backfill with deferred items so no inventory is lost
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
      // Newest approved additions, sorted with diversity
      filtered = [...catalog];
      return rankProductsWithDiversity(filtered, { ...options, maxPerShopInWindow: 2 });

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
