"use client";

import { useState } from "react";
import { useLogin } from "@/features/auth/hooks";
import Link from "next/link";
import { Layers } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import AuthInput from "@/components/ui/AuthInput";

export default function LoginView() {
  const { user, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { mutate, isPending, isError, error } = useLogin();

  if (isLoading || user) return null;

  const handleLogin = (e: { preventDefault(): void }) => {
    e.preventDefault();
    mutate(
      { email, password },
      {
        onSuccess: () => {
          // 로그인 성공 → full reload로 /dashboard 이동
          // AuthProvider가 me를 호출해 사용자 상태 초기화
          window.location.replace("/dashboard");
        },
      }
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-violet-600" />
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              SubLens
            </span>
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">구독을 한눈에 관리하세요</p>
        </div>

        {/* 폼 카드 */}
        <form
          onSubmit={handleLogin}
          className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <h1 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">로그인</h1>

          <div className="flex flex-col gap-3">
            <AuthInput
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <AuthInput
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {isError && (
            <p className="mt-3 text-sm text-red-500">
              {(error as any)?.response?.data?.message ?? "로그인에 실패했습니다."}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="mt-5 w-full cursor-pointer rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "로그인 중..." : "로그인"}
          </button>

          <div className="mt-5 flex items-center justify-center gap-0 text-sm text-gray-400 dark:text-gray-500">
            <Link
              href="/find-id"
              className="px-2 hover:text-gray-600 hover:underline dark:hover:text-gray-300"
            >
              아이디 찾기
            </Link>
            <span className="border-l border-gray-200 dark:border-gray-700 h-3" />
            <Link
              href="/reset-password"
              className="px-2 hover:text-gray-600 hover:underline dark:hover:text-gray-300"
            >
              비밀번호 찾기
            </Link>
            <span className="border-l border-gray-200 dark:border-gray-700 h-3" />
            <Link
              href="/signup"
              className="px-2 font-medium text-violet-600 hover:underline dark:text-violet-400"
            >
              회원가입
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
