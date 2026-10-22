"use client";

import { useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";

/**
 * Checks if the current runtime is running inside an iOS or Android Capacitor wrapper.
 */
export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  return Capacitor.isNativePlatform();
}

function emptySubscribe() {
  return () => {};
}

function getNativeSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  const hasPreview = new URLSearchParams(window.location.search).get("preview") === "app";
  return Capacitor.isNativePlatform() || hasPreview;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * React hook that returns true if inside native app or if ?preview=app query param is present.
 */
export function useIsNative(): boolean {
  return useSyncExternalStore(emptySubscribe, getNativeSnapshot, getServerSnapshot);
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

type BackHandler = () => boolean;
const backHandlers: BackHandler[] = [];

/**
 * Register a back-button handler (e.g., to close an active drawer or search overlay).
 * Returns an unregister function. Handlers execute in reverse-registration (LIFO) order.
 */
export function registerNativeBackHandler(handler: BackHandler): () => void {
  backHandlers.push(handler);
  return () => {
    const idx = backHandlers.indexOf(handler);
    if (idx > -1) backHandlers.splice(idx, 1);
  };
}

/**
 * Initialize native UI enhancements (Status bar, Splash screen, Hardware Back button)
 */
export async function initNativeApp(onNavigateBack?: () => void): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    // 1. Configure Native Status Bar
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setOverlaysWebView({ overlay: false });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#FDFCF0" }); // Giftisan signature cream
    }

    // 2. Hide Splash Screen after app loads
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();

    // 3. Android Hardware Back Button Handling with Modal Stack Priority
    const { App } = await import("@capacitor/app");
    App.addListener("backButton", ({ canGoBack }) => {
      // 1. Check registered modal/drawer handlers first (LIFO)
      for (let i = backHandlers.length - 1; i >= 0; i--) {
        try {
          const handled = backHandlers[i]();
          if (handled) return;
        } catch {
          // Ignore handler error and continue stack
        }
      }

      // 2. Standard navigation back
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
 * Performs Google Sign-In: uses Native Google One-Tap/Credential Manager on iOS & Android
 * without opening external browsers, setting the session cookie directly in the WebView,
 * or standard NextAuth signin on web.
 */
export async function performGoogleSignIn(callbackUrl: string = "/"): Promise<boolean> {
  const { signIn } = await import("next-auth/react");

  if (isNativePlatform()) {
    try {
      const { GoogleSignIn } = await import("@capawesome/capacitor-google-sign-in");
      const clientId =
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
        "57073334809-61ac8q40c6furmrmgh441mi7o6b3aalk.apps.googleusercontent.com";

      // 1. Initialize plugin with Web Client ID
      await GoogleSignIn.initialize({ clientId });

      // 2. Trigger native OS account selector prompt
      const result = await GoogleSignIn.signIn();

      if (result?.idToken) {
        // 3. Exchange native idToken directly inside WebView with NextAuth Credentials
        const authRes = await signIn("credentials", {
          redirect: false,
          isGoogleNative: "true",
          idToken: result.idToken,
        });

        if (authRes?.ok) {
          triggerHaptic("success");
          if (typeof window !== "undefined") {
            window.location.reload();
          }
          return true;
        } else {
          console.error("NextAuth native exchange failed:", authRes?.error);
        }
      }
    } catch (err: any) {
      console.warn("Native Google Sign-In error, checking fallback:", err);
      // If user dismissed the prompt or SHA-1 is not yet registered, do not error out
      if (
        err?.message?.includes("cancelled") ||
        err?.message?.includes("canceled") ||
        err?.code === "12501" ||
        err?.code === "16" ||
        err?.code === "SIGN_IN_CANCELED"
      ) {
        return false;
      }

      // Fallback to in-app browser with dynamic origin (not hardcoded prod URL)
      try {
        const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
        const res = await signIn("google", {
          redirect: false,
          callbackUrl: origin,
        });

        if (res?.url) {
          const { Browser } = await import("@capacitor/browser");
          await Browser.open({
            url: res.url,
            windowName: "_blank",
            presentationStyle: "popover",
          });
          return true;
        }
      } catch (browserErr) {
        console.warn("Browser fallback also failed:", browserErr);
      }
    }
  }

  // Web fallback or direct browser signin
  await signIn("google", { callbackUrl });
  return true;
}

/**
 * Opens native OS share sheet (WhatsApp, Messenger, Copy Link, AirDrop)
 */
export async function shareNativeContent(options: {
  title: string;
  text?: string;
  url: string;
  dialogTitle?: string;
}): Promise<boolean> {
  triggerHaptic("light");

  // 1. Try Capacitor Native Share
  try {
    const { Share } = await import("@capacitor/share");
    const canShare = await Share.canShare();
    if (canShare.value) {
      await Share.share({
        title: options.title,
        text: options.text || options.title,
        url: options.url,
        dialogTitle: options.dialogTitle || "Share",
      });
      return true;
    }
  } catch {
    // Fallback if plugin unavailable
  }

  // 2. Try Web Share API
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: options.title,
        text: options.text || options.title,
        url: options.url,
      });
      return true;
    } catch {
      // User cancelled
    }
  }

  // 3. Clipboard copy fallback
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(options.url);
      return false;
    } catch {
      // Fallback
    }
  }

  return false;
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

/**
 * Universal safe Sign-Out handler:
 * 1. Clears native Google credentials if on Android/iOS
 * 2. Uses NextAuth signOut with redirect: false to prevent cross-origin/external redirects
 * 3. Navigates cleanly in-app to /${lang} without breaking Capacitor WebViews
 */
export async function performSignOut(lang: string = "en"): Promise<void> {
  triggerHaptic("medium");

  if (isNativePlatform()) {
    try {
      const { GoogleSignIn } = await import("@capawesome/capacitor-google-sign-in");
      await GoogleSignIn.signOut();
    } catch {
      // Graceful fallback if not signed in via Google
    }
  }

  try {
    const { signOut } = await import("next-auth/react");
    await signOut({ redirect: false });
  } catch (err) {
    console.warn("SignOut error:", err);
  }

  if (typeof window !== "undefined") {
    window.location.href = `/${lang}`;
  }
}

/**
 * Universal Geolocation helper:
 * Uses @capacitor/geolocation on native devices (handles Android runtime permission prompt),
 * falling back gracefully to navigator.geolocation on standard browsers.
 */
export async function getCurrentCoordinates(): Promise<{ latitude: number; longitude: number }> {
  triggerHaptic("light");

  if (isNativePlatform()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");

      // Check current permission state
      let permission = await Geolocation.checkPermissions();
      if (permission.location !== "granted") {
        permission = await Geolocation.requestPermissions();
      }

      if (permission.location !== "granted") {
        throw new Error("Location permission denied");
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 12000,
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
    } catch (nativeErr: any) {
      console.warn("Native Geolocation error, trying web fallback:", nativeErr);
    }
  }

  // Web fallback
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return reject(new Error("Geolocation is not supported"));
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}
