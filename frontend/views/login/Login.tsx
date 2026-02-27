"use client";

import { useState } from "react";
import { useLogin } from "@/features/auth/hooks";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginView() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { mutate, isPending, isError, error } = useLogin();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    mutate(
      { email, password },
      {
        onSuccess: () => {
          router.push("/dashboard");
        },
      }
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleLogin} className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-2xl font-bold">로그인</h1>

        <input
          type="email"
          placeholder="이메일"
          className="mb-4 w-full rounded border p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="비밀번호"
          className="mb-4 w-full rounded border p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {isError && <p className="mb-4 text-sm text-red-500">로그인에 실패했습니다.</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded bg-black py-2 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "로그인 중..." : "로그인"}
        </button>
        <div className="mt-4 text-center text-sm">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="font-semibold text-blue-600 hover:underline">
            회원가입
          </Link>
        </div>
      </form>
    </div>
  );
}
