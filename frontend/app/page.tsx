"use client";

import api from "@/lib/axios";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.get("/api/auth/me");
        router.replace("/dashboard");
      } catch {
        router.replace("/login");
      }
    };

    checkAuth();
  }, [router]);
  return <div className="p-10">로딩 중...</div>;
}
