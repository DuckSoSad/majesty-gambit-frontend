import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserInfo } from "@/types/chess";

interface AuthState {
  user: UserInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  hasHydrated: boolean;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setUser: (user: UserInfo) => void;
  setAccessToken: (token: string) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hasHydrated: false,

      login: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null }),

      setUser: (user) => set({ user }),

      setAccessToken: (token) => set({ accessToken: token }),

      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "chess-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
