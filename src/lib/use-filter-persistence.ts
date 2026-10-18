"use client";

import { useEffect, useRef } from "react";

export interface FilterPersistenceConfig<T extends Record<string, any>> {
  key: string;
  values: T;
  setters: { [K in keyof T]?: (val: T[K]) => void };
  defaultValues: T;
  paramMapping?: { [K in keyof T]?: string };
}

/**
 * Custom hook to preserve product filtering state across navigations (e.g. visiting a product page and going back).
 * Syncs filter state with sessionStorage and URL search parameters without page reloads.
 * Filters remain intact until the user explicitly clears them.
 */
export function useFilterPersistence<T extends Record<string, any>>({
  key,
  values,
  setters,
  defaultValues,
  paramMapping,
}: FilterPersistenceConfig<T>) {
  const isRestoringRef = useRef(false);
  const isMountedRef = useRef(false);
  const settersRef = useRef(setters);
  const defaultValuesRef = useRef(defaultValues);
  const paramMappingRef = useRef(paramMapping);

  // Keep refs in sync with latest props without mutating refs during render (React 19 compliance)
  useEffect(() => {
    settersRef.current = setters;
    defaultValuesRef.current = defaultValues;
    paramMappingRef.current = paramMapping;
  });

  // 1. Initial restoration on mount or when storage key changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    isRestoringRef.current = false;
    let loadedState: Partial<T> = {};

    // Check URL search parameters first if paramMapping is defined
    const urlParams = new URLSearchParams(window.location.search);
    const mapping = paramMappingRef.current;
    if (mapping) {
      Object.entries(mapping).forEach(([stateKey, paramName]) => {
        if (!paramName) return;
        const val = urlParams.get(paramName);
        if (val !== null) {
          const defaultVal = defaultValuesRef.current[stateKey as keyof T];
          if (typeof defaultVal === "boolean") {
            (loadedState as any)[stateKey] = val === "true" || val === "1";
          } else {
            (loadedState as any)[stateKey] = val;
          }
        }
      });
    }

    // If no active filters were found in URL, fall back to sessionStorage
    const hasUrlFilters = Object.keys(loadedState).length > 0;
    if (!hasUrlFilters) {
      try {
        const savedStr = sessionStorage.getItem(key);
        if (savedStr) {
          const parsed = JSON.parse(savedStr);
          if (parsed && typeof parsed === "object") {
            loadedState = parsed;
          }
        }
      } catch (e) {
        console.warn(`[FilterPersistence] Could not load filters for ${key}:`, e);
      }
    }

    // Identify which keys differ from defaultValues and restore them
    const keysToRestore = Object.keys(loadedState).filter((k) => {
      return (
        k in settersRef.current &&
        loadedState[k as keyof T] !== undefined &&
        loadedState[k as keyof T] !== defaultValuesRef.current[k as keyof T]
      );
    });

    if (keysToRestore.length > 0) {
      isRestoringRef.current = true;
      const s = settersRef.current;
      keysToRestore.forEach((k) => {
        const setter = s[k as keyof T];
        if (typeof setter === "function") {
          setter(loadedState[k as keyof T] as any);
        }
      });
    }

    isMountedRef.current = true;
  }, [key]);

  // 2. Persist state whenever values change, but skip the initial unapplied render
  useEffect(() => {
    if (typeof window === "undefined" || !isMountedRef.current) return;

    // If we just triggered restoration setters, this render still has stale values. Skip saving once.
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      return;
    }

    const defs = defaultValuesRef.current;
    const isDefault = Object.keys(defs).every(
      (k) => values[k as keyof T] === defs[k as keyof T]
    );

    try {
      if (isDefault) {
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, JSON.stringify(values));
      }
    } catch (e) {
      console.warn(`[FilterPersistence] Could not save filters for ${key}:`, e);
    }

    // Sync with URL query parameters without reloading
    const mapping = paramMappingRef.current;
    if (mapping) {
      try {
        const currentUrl = new URL(window.location.href);
        const searchParams = currentUrl.searchParams;

        Object.entries(mapping).forEach(([stateKey, paramName]) => {
          if (!paramName) return;
          const currentVal = values[stateKey as keyof T];
          const defaultVal = defs[stateKey as keyof T];

          if (currentVal !== defaultVal) {
            searchParams.set(paramName, String(currentVal));
          } else {
            searchParams.delete(paramName);
          }
        });

        const newSearch = searchParams.toString();
        const newUrl = `${currentUrl.pathname}${newSearch ? `?${newSearch}` : ""}${currentUrl.hash}`;
        const prevUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        if (newUrl !== prevUrl) {
          window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
        }
      } catch (e) {
        console.warn(`[FilterPersistence] Could not update URL for ${key}:`, e);
      }
    }
  }, [key, values]);

  // 3. Explicit clear helper for "Clear Filter" / "Reset All" buttons
  const clearPersistedFilters = () => {
    if (typeof window === "undefined") return;
    try {
      sessionStorage.removeItem(key);
    } catch {}

    const mapping = paramMappingRef.current;
    if (mapping) {
      try {
        const currentUrl = new URL(window.location.href);
        const searchParams = currentUrl.searchParams;
        Object.values(mapping).forEach((paramName) => {
          if (paramName) searchParams.delete(paramName);
        });
        const newSearch = searchParams.toString();
        const newUrl = `${currentUrl.pathname}${newSearch ? `?${newSearch}` : ""}${currentUrl.hash}`;
        window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
      } catch {}
    }
  };

  return { clearPersistedFilters };
}
