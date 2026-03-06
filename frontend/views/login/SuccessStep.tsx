"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SuccessStep() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/login");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="text-center">
      <h1 className="mb-4 text-2xl font-bold">비밀번호 변경 완료</h1>

      <p className="mb-6 text-sm text-gray-600">
        비밀번호가 성공적으로 변경되었습니다.
        <br />
        잠시 후 로그인 페이지로 이동합니다.
      </p>

      <button
        onClick={() => router.push("/login")}
        className="w-full rounded bg-black py-2 text-white hover:bg-gray-800"
      >
        지금 로그인하기
      </button>
    </div>
  );
}
