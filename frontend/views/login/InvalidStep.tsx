import { useRouter } from "next/navigation";

export default function InvalidStep() {
  const router = useRouter();
  return (
    <div>
      <h1>인증코드가 유효하지 않습니다.</h1>
      <p>인증코드가 만료되었거나 유효하지 않습니다.</p>
      <button
        onClick={() => router.push("/login")}
        className="w-full rounded bg-black py-2 text-white"
      >
        돌아가기
      </button>
    </div>
  );
}
