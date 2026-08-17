import { create } from "zustand";
import { User } from "@/lib/api";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoaded: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoaded: false,

  setAuth: (user, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, token, isLoaded: true });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ user: null, token: null, isLoaded: true });
  },

  loadFromStorage: () => {
    try {
      const token = localStorage.getItem("token");
      const raw = localStorage.getItem("user");
      const user: User | null = raw ? JSON.parse(raw) : null;
      set({ user, token, isLoaded: true });
    } catch {
      set({ user: null, token: null, isLoaded: true });
    }
  },
}));
