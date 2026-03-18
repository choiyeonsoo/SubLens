import { useRouter } from "next/navigation";

export default function InvalidStep() {
  const router = useRouter();
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
        <svg className="h-6 w-6 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">링크가 유효하지 않습니다</h1>
      <p className="mb-6 text-sm text-gray-400 dark:text-gray-500">
        인증 링크가 만료되었거나 이미 사용된 링크입니다.
      </p>
      <button
        onClick={() => router.push("/login")}
        className="w-full cursor-pointer rounded-lg bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700"
      >
        로그인으로 돌아가기
      </button>
    </div>
  );
}
