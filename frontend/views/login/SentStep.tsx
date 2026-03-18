import { useRouter } from "next/navigation";

export default function SentStep() {
  const router = useRouter();
  return (
    <>
      <h1 className="mb-1 text-lg font-semibold text-gray-900 dark:text-white">이메일 발송 완료</h1>
      <p className="mb-5 text-sm text-gray-400 dark:text-gray-500">
        입력하신 이메일로 비밀번호 재설정 링크를 보냈습니다.
        <br />
        이메일이 오지 않으면 스팸함을 확인해 주세요.
      </p>
      <button
        onClick={() => router.push("/login")}
        className="w-full cursor-pointer rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700"
      >
        로그인으로 돌아가기
      </button>
    </>
  );
}
