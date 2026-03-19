"use client";

import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { plainApi } from "@/lib/axios";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await plainApi.get("/api/auth/me");
        setUser(res.data.data);
      } catch (error: any) {
        if (error.response?.status === 401) {
          // 액세스 토큰 만료 → 리프래쉬 토큰으로 재발급 시도
          try {
            await plainApi.post("/api/auth/reissue");
            const res = await plainApi.get("/api/auth/me");
            setUser(res.data.data);
          } catch {
            // 리프래쉬 토큰도 만료 → 비로그인
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  return <>{children}</>;
}
