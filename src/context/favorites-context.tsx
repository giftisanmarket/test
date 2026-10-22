"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Product } from "@/lib/data";
import { useSession } from "next-auth/react";
import { toggleFavoriteAction, getUserFavorites, getProductsByIds } from "@/lib/actions";
import { triggerHaptic } from "@/lib/native";

interface FavoritesContextType {
  favorites: Product[];
  toggleFavorite: (product: any) => Promise<void>;
  isFavorite: (productId: string) => boolean;
  totalFavorites: number;

  // Artisan / Studio favorites
  favoriteArtisans: any[];
  toggleFavoriteArtisan: (artisan: any) => void;
  isFavoriteArtisan: (artisanId: string) => boolean;
  totalFavoriteArtisans: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [favoriteArtisans, setFavoriteArtisans] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount, then sync with DB if logged in or refresh stale guest items
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const savedFavorites = localStorage.getItem("giftisan-favorites");
        let localList: any[] = [];
        if (savedFavorites) {
          const parsed = JSON.parse(savedFavorites);
          if (Array.isArray(parsed)) {
            localList = parsed;
            setFavorites(parsed);
          }
        }

        // Load favorite artisans
        const savedArtisans =
          localStorage.getItem("giftisan-favorite-artisans") ||
          localStorage.getItem("giftisan-followed-artisans");
        if (savedArtisans) {
          try {
            const parsedArtisans = JSON.parse(savedArtisans);
            if (Array.isArray(parsedArtisans)) {
              setFavoriteArtisans(parsedArtisans);
            }
          } catch (e) {
            console.error("Failed to parse favorite artisans", e);
          }
        }

        if (session?.user?.id) {
          const dbFavorites = await getUserFavorites(session.user.id);
          const mappedDbFavorites = dbFavorites as any;
          setFavorites(mappedDbFavorites);
          localStorage.setItem("giftisan-favorites", JSON.stringify(mappedDbFavorites));
        } else if (localList.length > 0) {
          const ids = localList
            .map((p: any) => (typeof p === "string" ? p : p?.id))
            .filter(Boolean);
          if (ids.length > 0) {
            const freshProducts = await getProductsByIds(ids);
            if (freshProducts && freshProducts.length > 0) {
              const freshMap = new Map(freshProducts.map((p: any) => [p.id, p]));
              const updatedList = localList
                .map((p: any) => {
                  const pId = typeof p === "string" ? p : p?.id;
                  const fresh = freshMap.get(pId);
                  if (fresh) return fresh;
                  return typeof p === "object" && p?.name ? p : null;
                })
                .filter(Boolean);
              setFavorites(updatedList as any);
              localStorage.setItem("giftisan-favorites", JSON.stringify(updatedList));
            }
          }
        }
      } catch (e) {
        console.error("Failed to load favorites", e);
      } finally {
        setIsInitialized(true);
      }
    };

    loadFavorites();
  }, [session?.user?.id]);

  // Save to localStorage whenever favorites change ONLY AFTER initialization
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("giftisan-favorites", JSON.stringify(favorites));
    }
  }, [favorites, isInitialized]);

  // Save favorite artisans to localStorage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("giftisan-favorite-artisans", JSON.stringify(favoriteArtisans));
      const ids = favoriteArtisans
        .map((a) => (typeof a === "string" ? a : a?.id))
        .filter(Boolean);
      localStorage.setItem("giftisan-followed-artisans", JSON.stringify(ids));
    }
  }, [favoriteArtisans, isInitialized]);

  const toggleFavorite = async (productInput: any) => {
    triggerHaptic("light");
    if (!productInput) return;

    const productId = typeof productInput === "string" ? productInput : productInput.id;
    if (!productId) return;

    const isCurrentlyFav = favorites.some((p) =>
      typeof p === "string" ? p === productId : p?.id === productId
    );
    const isAdding = !isCurrentlyFav;

    const productObj =
      typeof productInput === "object" && productInput !== null
        ? productInput
        : { id: productId };

    // Optimistic update
    setFavorites((prev) => {
      const exists = prev.some((p) =>
        typeof p === "string" ? p === productId : p?.id === productId
      );
      if (exists) {
        return prev.filter((p) =>
          typeof p === "string" ? p !== productId : p?.id !== productId
        );
      }
      return [...prev, productObj];
    });

    // If adding a product that might lack full details (or was passed only as an ID), enrich it
    if (
      isAdding &&
      (typeof productInput === "string" ||
        productInput.stock === undefined ||
        !productInput.variants ||
        !productInput.name)
    ) {
      getProductsByIds([productId])
        .then((fresh) => {
          if (fresh && fresh[0]) {
            setFavorites((prev) =>
              prev.map((p) => {
                const pId = typeof p === "string" ? p : p?.id;
                return pId === productId ? { ...(typeof p === "object" ? p : {}), ...fresh[0] } : p;
              }) as any
            );
          }
        })
        .catch(console.error);
    }

    // DB sync if logged in
    if (session?.user?.id) {
      const res = await toggleFavoriteAction(productId, session.user.id);
      if (res.error) {
        // Rollback on error
        console.error(res.error);
        const savedFavorites = localStorage.getItem("giftisan-favorites");
        if (savedFavorites) {
          setFavorites(JSON.parse(savedFavorites));
        }
      }
    }
  };

  const isFavorite = (productId: string) => {
    if (!productId) return false;
    return favorites.some((p) =>
      typeof p === "string" ? p === productId : p?.id === productId
    );
  };

  const toggleFavoriteArtisan = (artisan: any) => {
    triggerHaptic("light");
    const artisanId = typeof artisan === "string" ? artisan : artisan.id;
    setFavoriteArtisans((prev) => {
      const exists = prev.some((a) =>
        typeof a === "string" ? a === artisanId : a?.id === artisanId
      );
      if (exists) {
        return prev.filter((a) =>
          typeof a === "string" ? a !== artisanId : a?.id !== artisanId
        );
      }
      return [...prev, artisan];
    });
  };

  const isFavoriteArtisan = (artisanId: string) => {
    return favoriteArtisans.some((a) =>
      typeof a === "string" ? a === artisanId : a?.id === artisanId
    );
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        toggleFavorite,
        isFavorite,
        totalFavorites: favorites.length,
        favoriteArtisans,
        toggleFavoriteArtisan,
        isFavoriteArtisan,
        totalFavoriteArtisans: favoriteArtisans.length,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}

