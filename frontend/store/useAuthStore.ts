// store/useAuthStore.ts
import { create } from "zustand";

interface User {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));
