"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { insforge } from "@/lib/insforge-client";

export function InsforgeAuthProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      insforge.setAccessToken(null);
      return;
    }

    const refreshAuthToken = async () => {
      try {
        const token = await getToken({ template: "insforge" });
        if (token) {
          insforge.setAccessToken(token);
        }
      } catch (err) {
        console.error("Failed to sync Clerk token with InsForge:", err);
      }
    };

    refreshAuthToken();
    const interval = setInterval(refreshAuthToken, 50 * 1000);

    return () => clearInterval(interval);
  }, [getToken, isLoaded, isSignedIn]);

  return <>{children}</>;
}
