import { create } from "zustand";
import type { UserOut } from "../types/api";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserOut | null;
  setSession: (accessToken: string, refreshToken: string) => void;
  setUser: (user: UserOut) => void;
  logout: () => void;
}

const ACCESS_KEY = "sentinelx-access-token";
const REFRESH_KEY = "sentinelx-refresh-token";

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: window.localStorage.getItem(ACCESS_KEY),
  refreshToken: window.localStorage.getItem(REFRESH_KEY),
  user: null,
  setSession: (accessToken, refreshToken) => {
    window.localStorage.setItem(ACCESS_KEY, accessToken);
    window.localStorage.setItem(REFRESH_KEY, refreshToken);
    set({ accessToken, refreshToken });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));
