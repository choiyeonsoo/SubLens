"use client";

import { useState } from "react";
import { useRequestPasswordReset } from "@/features/auth/hooks";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition-colors focus:ring-2 focus:ring-violet-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500";

export default function RequestStep({ onNext }: { onNext: () => void }) {
  const [email, setEmail] = useState("");
  const { mutateAsync: requestReset, isPending, isError, error } = useRequestPasswordReset();

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    try {
      await requestReset(email);
      onNext();
    } catch {
      // 네트워크/서버 에러만 catch됨
    }
  };

  return (
    <>
      <h1 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">비밀번호 찾기</h1>
      <p className="mb-5 text-sm text-gray-400 dark:text-gray-500">
        가입한 이메일로 재설정 링크를 보내드립니다.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="이메일"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isPending}
        />
        {isError && (
          <p className="text-sm text-red-500">
            {error instanceof Error ? error.message : "요청에 실패했습니다. 잠시 후 다시 시도해 주세요."}
          </p>
        )}
        <button
          type="submit"
          className="cursor-pointer rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
        >
          {isPending ? "전송 중..." : "인증 메일 보내기"}
        </button>
      </form>
    </>
  );
}
