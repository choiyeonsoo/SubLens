import { useResetPassword } from "@/features/auth/hooks";
import { useState } from "react";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition-colors focus:ring-2 focus:ring-violet-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500";

export default function ResetStep({ token, onSuccess }: { token: string; onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [matchError, setMatchError] = useState("");
  const { mutate, isPending, isError } = useResetPassword();

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (password !== confirm) {
      setMatchError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setMatchError("");
    mutate({ token, password }, { onSuccess });
  };

  return (
    <>
      <h1 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">새 비밀번호 설정</h1>
      <p className="mb-5 text-sm text-gray-400 dark:text-gray-500">새로 사용할 비밀번호를 입력해주세요.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="password"
          placeholder="새 비밀번호"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="flex flex-col gap-1">
          <input
            type="password"
            placeholder="비밀번호 확인"
            className={`${inputClass} ${matchError ? "border-red-400 dark:border-red-500" : ""}`}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          {matchError && <p className="text-xs text-red-500">{matchError}</p>}
        </div>
        {isError && (
          <p className="text-sm text-red-500">비밀번호 변경에 실패했습니다. 링크가 만료되었을 수 있습니다.</p>
        )}
        <button
          type="submit"
          className="cursor-pointer rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
        >
          {isPending ? "변경 중..." : "비밀번호 변경"}
        </button>
      </form>
    </>
  );
}
