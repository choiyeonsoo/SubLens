"use client";

import { usePathname, useRouter } from "next/navigation";
import { Search, Plus, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "대시보드",
  "/subscriptions": "구독 목록",
  "/analytics": "지출 분석",
  "/recommend": "AI 추천",
  "/alert": "알림 설정",
};

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 하이드레이션 불일치 방지
  useEffect(() => setMounted(true), []);

  const title =
    Object.entries(PAGE_TITLES).find(([key]) => pathname === key || pathname.startsWith(key + "/"))?.[1] ??
    "SubLens";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6 dark:border-gray-800 dark:bg-gray-900">
      {/* 페이지 타이틀 */}
      <h1 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h1>

      {/* 우측 액션 */}
      <div className="flex items-center gap-2">
        {/* 검색 */}
        <button
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          aria-label="검색"
        >
          <Search className="h-4 w-4" />
        </button>

        {/* 구독 추가 */}
        <button
          onClick={() => router.push("/subscriptions/new")}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-medium text-white transition-colors hover:bg-violet-700"
          aria-label="구독 추가"
        >
          <Plus className="h-3.5 w-3.5" />
          구독 추가
        </button>

        {/* 다크/라이트 토글 */}
        {mounted && (
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            aria-label="테마 전환"
          >
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}
      </div>
    </header>
  );
}
