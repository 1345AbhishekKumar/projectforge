import { createClient } from "@insforge/sdk";

export const createInsforgeServer = (userId?: string, token?: string) => {
  return createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
    headers: {
      ...(userId ? { "x-current-user-id": userId, "x-user-id": userId } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
};
