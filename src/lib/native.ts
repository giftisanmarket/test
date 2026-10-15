"use client";

import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Checks if the current runtime is running inside an iOS or Android Capacitor wrapper.
 */
export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

/**
 * React hook that returns true if inside native app or if ?preview=app query param is present.
 */
export function useIsNative(): boolean {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasPreview = new URLSearchParams(window.location.search).get("preview") === "app";
    setIsNative(Capacitor.isNativePlatform() || hasPreview);
  }, []);

  return isNative;
}

/**
 * Gets the current platform ('ios' | 'android' | 'web')
 */
export function getNativePlatform(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  return Capacitor.getPlatform() as "ios" | "android" | "web";
}

/**
 * Native Haptic Feedback for buttons, cart updates, and favorite toggles
 */
export async function triggerHaptic(
  type: "light" | "medium" | "heavy" | "success" | "warning" | "error" = "light"
): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");

    if (type === "success") {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (type === "warning") {
      await Haptics.notification({ type: NotificationType.Warning });
    } else if (type === "error") {
      await Haptics.notification({ type: NotificationType.Error });
    } else {
      const styleMap = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      };
      await Haptics.impact({ style: styleMap[type] || ImpactStyle.Light });
    }
  } catch {
    // Graceful fallback if unsupported
  }
}

/**
 * Initialize native UI enhancements (Status bar, Splash screen, Hardware Back button)
 */
export async function initNativeApp(onNavigateBack?: () => void): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    // 1. Configure Native Status Bar
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setOverlaysWebView({ overlay: false });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#064E3B" }); // Brand forest green
    }

    // 2. Hide Splash Screen after app loads
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();

    // 3. Android Hardware Back Button Handling
    const { App } = await import("@capacitor/app");
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack && onNavigateBack) {
        onNavigateBack();
      } else if (canGoBack && typeof window !== "undefined") {
        window.history.back();
      } else {
        App.exitApp();
      }
    });

    // 4. Handle OAuth Deep Link Return from Chrome Custom Tabs
    App.addListener("appUrlOpen", async ({ url }) => {
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.close();
      } catch {
        // Browser might not have been open
      }

      if (url && typeof window !== "undefined") {
        try {
          const parsed = new URL(url);
          if (parsed.pathname) {
            window.location.href = parsed.pathname + parsed.search;
          }
        } catch {
          // Fallback if URL parsing fails
        }
      }
    });
  } catch (error) {
    console.warn("Failed to initialize native app plugins:", error);
  }
}

/**
 * Performs Google Sign-In: uses Chrome Custom Tabs on native Android to share phone accounts,
 * or standard NextAuth signin on web.
 */
export async function performGoogleSignIn(callbackUrl: string = "/"): Promise<void> {
  const { signIn } = await import("next-auth/react");

  if (isNativePlatform()) {
    try {
      const res = await signIn("google", {
        redirect: false,
        callbackUrl: "https://www.giftisan.com",
      });

      if (res?.url) {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({
          url: res.url,
          windowName: "_blank",
          presentationStyle: "popover",
        });
        return;
      }
    } catch (err) {
      console.warn("Native browser auth error, falling back:", err);
    }
  }

  // Web fallback or direct browser signin
  await signIn("google", { callbackUrl });
}

/**
 * Request permission and register for native Push Notifications
 * (Requires google-services.json from Firebase Console)
 */
export async function registerPushNotifications(
  _onTokenReceived?: (token: string) => void
): Promise<void> {
  if (!isNativePlatform()) return;
  // Push notifications can be wired with Firebase Cloud Messaging once google-services.json is added
}
