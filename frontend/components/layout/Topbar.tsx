"use client";

import { useRouter } from "next/navigation";
import { Search, Plus } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Topbar() {
  const router = useRouter();

  return (
    <header className="flex h-14 shrink-0 items-center justify-end border-b border-gray-100 bg-white px-6 dark:border-gray-800 dark:bg-gray-900">

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
          onClick={() => router.push("/subscriptions?modal=new")}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-medium text-white transition-colors hover:bg-violet-700"
          aria-label="구독 추가"
        >
          <Plus className="h-3.5 w-3.5" />
          구독 추가
        </button>

        {/* 다크/라이트 토글 */}
        <ThemeToggle />
      </div>
    </header>
  );
}
