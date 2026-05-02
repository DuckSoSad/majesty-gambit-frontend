import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserInfo } from "@/types/chess";

interface AuthState {
  user: UserInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setUser: (user: UserInfo) => void;
  setAccessToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      login: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null }),

      setUser: (user) => set({ user }),

      setAccessToken: (token) => set({ accessToken: token }),
    }),
    { name: "chess-auth" }
  )
);
