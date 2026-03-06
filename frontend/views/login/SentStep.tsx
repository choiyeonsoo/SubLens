import { useRouter } from "next/navigation";

export default function SentStep() {
  const router = useRouter();
  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">이메일 발송 완료</h1>
      <p className="text-sm text-gray-600">
        입력하신 이메일로 비밀번호 재설정 링크를 보냈습니다. 이메일이 오지 않으면 스팸함을 확인해
        주세요.
      </p>
      <button
        onClick={() => router.push("/login")}
        className="w-full rounded bg-black py-2 text-white"
      >
        돌아가기
      </button>
    </>
  );
}
