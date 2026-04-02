"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuccessStep() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push("/login"), 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
        <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">비밀번호 변경 완료</h1>
      <p className="mb-6 text-sm text-gray-400 dark:text-gray-500">
        비밀번호가 성공적으로 변경되었습니다.
        <br />
        잠시 후 로그인 페이지로 이동합니다.
      </p>
      <button
        onClick={() => router.push("/login")}
        className="w-full cursor-pointer rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700"
      >
        지금 로그인하기
      </button>
    </div>
  );
}
