"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation"; // ✅ window 대신 Next.js 훅 사용
import { useAuthStore } from "../store/useAuthStore";
import { plainApi } from "@/lib/axios";

// ✅ 컴포넌트 외부로 분리 (매 렌더마다 재생성 방지)
const AUTH_FREE_PATHS = ["/login", "/signup", "/reset-password", "/find-id"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useAuthStore();
  const pathname = usePathname(); // ✅ Next.js 라우터 기반 pathname
  const initialized = useRef(false); // ✅ 리마운트 시 재실행 방지 가드

  useEffect(() => {
    // ✅ 이미 초기화됐으면 재실행 차단
    if (initialized.current) return;
    initialized.current = true;

    if (AUTH_FREE_PATHS.some((p) => pathname.startsWith(p))) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const res = await plainApi.get("/api/auth/me");
        setUser(res.data.data);
      } catch (error: any) {
        if (error.response?.status === 401) {
          try {
            await plainApi.post("/api/auth/reissue");
            const res = await plainApi.get("/api/auth/me");
            setUser(res.data.data);
          } catch {
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
