import { create } from "zustand";

import * as authClient from "@/lib/auth-client";
import type { UserDto } from "@/lib/auth-client";

/**
 * New this sprint, additive per docs/33_AUTH_ARCHITECTURE.md — `null` `user` is the default,
 * fully-supported "anonymous visitor" state, never treated as an error. No existing store gains
 * a required auth dependency (per ADR-0015): a store that wants to know "is someone logged in"
 * reads this one directly, an additive read, not a new required parameter threaded through
 * every existing caller.
 */
interface AuthStoreState {
  user: UserDto | null;
  status: "idle" | "restoring" | "authenticated" | "anonymous";
  error: string | null;

  restore: () => Promise<void>;
  login: (email: string, password: string, deviceName?: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<UserDto>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStoreState>()((set) => ({
  user: null,
  status: "idle",
  error: null,

  restore: async () => {
    set({ status: "restoring" });
    const user = await authClient.restoreSession();
    set({ user, status: user ? "authenticated" : "anonymous" });
  },

  login: async (email, password, deviceName) => {
    set({ error: null });
    try {
      const user = await authClient.login(email, password, deviceName);
      set({ user, status: "authenticated" });
    } catch (err) {
      const message = err instanceof authClient.ApiError ? err.message : "Something went wrong. Please try again.";
      set({ error: message });
      throw err;
    }
  },

  register: async (email, password, fullName) => {
    set({ error: null });
    try {
      return await authClient.register(email, password, fullName);
    } catch (err) {
      const message = err instanceof authClient.ApiError ? err.message : "Something went wrong. Please try again.";
      set({ error: message });
      throw err;
    }
  },

  logout: async () => {
    await authClient.logout();
    set({ user: null, status: "anonymous" });
  },

  clearError: () => set({ error: null }),
}));
