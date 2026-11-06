"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export interface StudioTargetArtisan {
  id: string;
  studioName?: string | null;
  slug?: string | null;
  avatar?: string | null;
  status?: string | null;
  isVerified?: boolean;
  isAcceptingOrders?: boolean;
  vacationNotice?: string | null;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

interface StudioContextValue {
  targetArtisan: StudioTargetArtisan | null;
  setTargetArtisan: (artisan: StudioTargetArtisan | null) => void;
  isCleanMode: boolean;
  toggleCleanMode: () => void;
  setCleanMode: (val: boolean) => void;
}

const StudioContext = createContext<StudioContextValue>({
  targetArtisan: null,
  setTargetArtisan: () => {},
  isCleanMode: false,
  toggleCleanMode: () => {},
  setCleanMode: () => {},
});

export function StudioProvider({
  children,
  initialArtisan,
  initialCleanMode = false,
}: {
  children: React.ReactNode;
  initialArtisan?: StudioTargetArtisan | null;
  initialCleanMode?: boolean;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const queryClean =
    searchParams?.get("clean") === "true" ||
    searchParams?.get("clean") === "1" ||
    searchParams?.get("marketing") === "true";

  const [targetArtisan, setTargetArtisan] = useState<StudioTargetArtisan | null>(
    initialArtisan || null
  );

  const [isCleanMode, setIsCleanModeState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      if (queryClean) return true;
      try {
        const stored = sessionStorage.getItem("studio_clean_marketing_mode");
        if (stored === "true") return true;
      } catch {}
    }
    return initialCleanMode || queryClean;
  });

  useEffect(() => {
    if (queryClean) {
      setIsCleanModeState(true);
      try {
        sessionStorage.setItem("studio_clean_marketing_mode", "true");
      } catch {}
    }
  }, [queryClean]);

  const setCleanMode = useCallback(
    (val: boolean) => {
      setIsCleanModeState(val);
      try {
        sessionStorage.setItem("studio_clean_marketing_mode", val ? "true" : "false");
      } catch {}

      if (!searchParams) return;
      const current = new URLSearchParams(searchParams.toString());
      if (val) {
        current.set("clean", "true");
      } else {
        current.delete("clean");
        current.delete("marketing");
      }
      const qs = current.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const toggleCleanMode = useCallback(() => {
    setCleanMode(!isCleanMode);
  }, [isCleanMode, setCleanMode]);

  return (
    <StudioContext.Provider
      value={{
        targetArtisan,
        setTargetArtisan,
        isCleanMode,
        toggleCleanMode,
        setCleanMode,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  return useContext(StudioContext);
}

