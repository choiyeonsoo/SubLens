"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  BarChart3,
  Sparkles,
  Bell,
  Layers,
  User,
} from "lucide-react";

interface SidebarProps {
  userName?: string;
  subscriptionCount?: number;
}

const NAV_MENU = [
  { label: "대시보드", href: "/dashboard", icon: LayoutDashboard },
  { label: "구독 목록", href: "/subscriptions", icon: CreditCard },
  { label: "지출 분석", href: "/analytics", icon: BarChart3 },
];

const NAV_TOOLS = [
  { label: "AI 추천", href: "/recommend", icon: Sparkles },
  { label: "알림 설정", href: "/alert", icon: Bell },
];

export default function Sidebar({ userName = "사용자", subscriptionCount = 0 }: SidebarProps) {
  const pathname = usePathname();

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
      <div className="flex items-center gap-2 px-4 py-5">
        <Layers className="h-5 w-5 text-violet-600" />
        <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
          SubLens
        </span>
      </div>

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
      </nav>

      {/* 유저 정보 */}
      <div className="border-t border-gray-100 px-3 py-4 dark:border-gray-800">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900">
            <User className="h-4 w-4 text-violet-600 dark:text-violet-300" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
              {userName}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Free · {subscriptionCount}/5
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
