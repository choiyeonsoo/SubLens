import { useState } from "react";

export default function ResetStep({ token, onSuccess }: { token: string; onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    // TODO: reset mutation 호출
    onSuccess();
  };

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">새 비밀번호 설정</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="새 비밀번호"
          className="mb-4 w-full rounded border p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="비밀번호 확인"
          className="mb-4 w-full rounded border p-2"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <button className="w-full rounded bg-black py-2 text-white">비밀번호 변경</button>
      </form>
    </>
  );
}
