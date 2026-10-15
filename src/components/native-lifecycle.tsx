"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { initNativeApp, registerPushNotifications, isNativePlatform } from "@/lib/native";

export function NativeLifecycle() {
  const router = useRouter();

  useEffect(() => {
    const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "app";
    if (isNativePlatform() || isPreview) {
      document.body.classList.add("is-native-app");
    }

    if (!isNativePlatform()) return;

    // Initialize status bar, splash screen, and Android hardware back button
    initNativeApp(() => {
      router.back();
    });

    // Register push notifications
    registerPushNotifications((token) => {
      console.log("Device registered with FCM/APNs token:", token);
      // Optional: Send token to your backend API to link with the active user session
    });
  }, [router]);

  return null;
}
