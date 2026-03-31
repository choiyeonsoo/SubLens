"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  BarChart3,
  Sparkles,
  Bell,
  Layers,
  User,
  LogOut,
  BookOpen,
  ChevronUp,
  Tags,
  AppWindow,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuthStore } from "@/store/useAuthStore";
import { useRef, useState } from "react";
import { useClickOutside } from "@/hooks/useClickOutside";
import api from "@/lib/axios";

const NAV_MENU = [
  { label: "대시보드", href: "/dashboard", icon: LayoutDashboard },
  { label: "구독 목록", href: "/subscriptions", icon: CreditCard },
  { label: "지출 분석", href: "/analytics", icon: BarChart3 },
];

const NAV_TOOLS = [
  { label: "AI 추천", href: "/recommend", icon: Sparkles },
  { label: "알림 설정", href: "/alert", icon: Bell },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useClickOutside(menuRef, () => setMenuOpen(false), menuOpen);

  const handleLogout = async () => {
    await api.post("/api/auth/logout").catch(() => {});
    setUser(null);
    router.push("/login");
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const navItemClass = (href: string) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive(href)
        ? "bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
    }`;

  return (
    <aside className="flex w-[200px] shrink-0 flex-col border-r border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* 로고 */}
      <Link href="/dashboard" className="flex items-center gap-2 px-4 py-5">
        <Layers className="h-5 w-5 text-violet-600" />
        <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
          SubLens
        </span>
      </Link>

      {/* 네비게이션 */}
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-2">
        {/* 메뉴 섹션 */}
        <div>
          <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            메뉴
          </p>
          <ul className="space-y-0.5">
            {NAV_MENU.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className={navItemClass(href)}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* 도구 섹션 */}
        <div>
          <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            도구
          </p>
          <ul className="space-y-0.5">
            {NAV_TOOLS.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className={navItemClass(href)}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* 관리자 섹션 — ADMIN 전용 */}
        {user?.role === "ADMIN" && (
          <div>
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-violet-400 dark:text-violet-500">
              관리자
            </p>
            <ul className="space-y-0.5">
              <li>
                <Link href="/admin/services" className={navItemClass("/admin/services")}>
                  <AppWindow className="h-4 w-4 shrink-0" />
                  서비스 관리
                </Link>
              </li>
              <li>
                <Link href="/admin/categories" className={navItemClass("/admin/categories")}>
                  <Tags className="h-4 w-4 shrink-0" />
                  카테고리 관리
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>

      {/* 유저 정보 + 팝업 메뉴 */}
      <div
        ref={menuRef}
        className="relative border-t border-gray-100 px-3 py-4 dark:border-gray-800"
      >
        {/* 팝업 메뉴 */}
        {menuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-1 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {/* 테마 전환 */}
            <ThemeToggle variant="menu" />

            {/* Docs — ADMIN 전용 */}
            {user?.role === "ADMIN" && (
              <>
                <Link
                  href="/docs/AI_SPEC.html"
                  target="_blank"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  onClick={() => setMenuOpen(false)}
                >
                  <BookOpen className="h-4 w-4 shrink-0" />
                  AI 아키텍처 명세서
                </Link>
                <Link
                  href="/docs/SUBLENS_DB_SPEC.html"
                  target="_blank"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  onClick={() => setMenuOpen(false)}
                >
                  <BookOpen className="h-4 w-4 shrink-0" />
                  데이터베이스 명세서
                </Link>
                <Link
                  href="/docs/SUBLENS_AUTH_SPEC.html"
                  target="_blank"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  onClick={() => setMenuOpen(false)}
                >
                  <BookOpen className="h-4 w-4 shrink-0" />
                  기술명세서
                </Link>
                <Link
                  href="/docs/PLAN.html"
                  target="_blank"
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  onClick={() => setMenuOpen(false)}
                >
                  <BookOpen className="h-4 w-4 shrink-0" />
                  기획서
                </Link>
              </>
            )}

            <div className="my-1 h-px bg-gray-100 dark:bg-gray-700" />

            {/* 로그아웃 */}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              로그아웃
            </button>
          </div>
        )}

        {/* 유저 버튼 */}
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900">
            <User className="h-4 w-4 text-violet-600 dark:text-violet-300" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
              {user?.name}
            </p>
          </div>
          <ChevronUp
            className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${menuOpen ? "" : "rotate-180"}`}
          />
        </button>
      </div>
    </aside>
  );
}
