"use client";

import { useState } from "react";
import { useRequestPasswordReset } from "@/features/auth/hooks";

export default function RequestStep({ onNext }: { onNext: () => void }) {
  const [email, setEmail] = useState("");
  const { mutateAsync: requestReset, isPending, isError, error } = useRequestPasswordReset();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestReset(email);
      onNext();
    } catch {
      // 백엔드가 보안상 항상 200을 반환하므로 실패 시에도 onNext 호출 가능
      // 네트워크/서버 에러만 catch됨
    }
  };

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">비밀번호 찾기</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="이메일"
          className="mb-4 w-full rounded border p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isPending}
        />
        {isError && (
          <p className="mb-2 text-sm text-red-600">
            {error instanceof Error ? error.message : "요청에 실패했습니다. 잠시 후 다시 시도해 주세요."}
          </p>
        )}
        <button
          type="submit"
          className="w-full rounded bg-black py-2 text-white disabled:opacity-50"
          disabled={isPending}
        >
          {isPending ? "전송 중..." : "인증 메일 보내기"}
        </button>
      </form>
    </>
  );
}
