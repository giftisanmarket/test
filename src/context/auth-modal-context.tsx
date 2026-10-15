"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type AuthModalMode = "login" | "signup" | "forgot";

interface AuthModalContextType {
  isOpen: boolean;
  mode: AuthModalMode;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  setMode: (mode: AuthModalMode) => void;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthModalMode>("login");

  const openAuthModal = useCallback((initialMode: AuthModalMode = "login") => {
    setMode(initialMode);
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AuthModalContext.Provider
      value={{
        isOpen,
        mode,
        openAuthModal,
        closeAuthModal,
        setMode,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
}
