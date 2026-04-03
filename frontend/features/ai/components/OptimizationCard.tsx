import { OptimizeData } from "../types";

interface Props {
  data: OptimizeData;
}

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

export default function OptimizationCard({ data }: Props) {
  const allCautions = [
    ...data.cautions,
    ...data.recommended_bundles.flatMap((b) => b.cautions),
  ];

  return (
    <div className="w-full overflow-hidden rounded-2xl rounded-tl-sm border border-white/10 bg-gray-800/80 text-sm">
      {/* Savings banner */}
      <div className="flex items-center justify-between border-b border-white/10 bg-gray-900/60 px-4 py-3">
        <div>
          <p className="text-[10px] text-gray-500">현재</p>
          <p className="font-semibold text-gray-200">{fmt(data.current_total)}원</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-green-400">-{fmt(data.savings)}원</p>
          <p className="text-[10px] text-green-400/70">월 절약</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-500">최적화 후</p>
          <p className="font-semibold text-gray-200">{fmt(data.optimized_total)}원</p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-2 gap-4 p-4">
        {/* Left: current subscriptions */}
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            현재 구독
          </p>
          <ul className="space-y-1.5">
            {data.current_subscriptions.map((sub) => (
              <li
                key={sub.name}
                className={`flex items-center justify-between text-xs ${
                  sub.replaced
                    ? "text-gray-600 line-through"
                    : "text-gray-300"
                }`}
              >
                <span>{sub.name}</span>
                <span>{fmt(sub.price)}원</span>
              </li>
            ))}
          </ul>

          {data.keep_subscriptions.length > 0 && (
            <>
              <p className="mb-2 mt-4 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                유지 구독
              </p>
              <ul className="space-y-1.5">
                {data.keep_subscriptions.map((sub) => (
                  <li
                    key={sub.name}
                    className="flex items-center justify-between text-xs text-gray-300"
                  >
                    <span>{sub.name}</span>
                    <span>{fmt(sub.price)}원</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Right: recommended bundles */}
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            추천 번들
          </p>
          {data.recommended_bundles.length === 0 ? (
            <p className="text-xs text-gray-600">추천 가능한 번들이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {data.recommended_bundles.map((bundle, i) => (
                <div
                  key={bundle.name}
                  className={`rounded-xl border p-3 ${
                    i === 0
                      ? "border-violet-500/50 bg-violet-950/30"
                      : "border-white/10 bg-gray-900/40"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      {bundle.name}
                    </span>
                    {i === 0 && (
                      <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] text-white">
                        추천
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-[10px]">{bundle.provider}</p>
                  <p className="mt-0.5 text-sm font-bold text-white">
                    {fmt(bundle.price)}원
                    <span className="text-xs font-normal text-gray-400">/월</span>
                  </p>
                  <p className="mt-0.5 text-xs text-green-400">
                    -{fmt(bundle.saves)}원 절약
                  </p>
                  {bundle.includes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {bundle.includes.map((item) => (
                        <span
                          key={item}
                          className="rounded bg-gray-700/60 px-1.5 py-0.5 text-[10px] text-gray-300"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  )}
                  {bundle.telecom_exclusive && (
                    <p className="mt-1.5 text-[10px] text-amber-400">
                      {bundle.telecom_exclusive} 전용
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cautions */}
      {allCautions.length > 0 && (
        <div className="px-4 pb-4">
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/30 px-3 py-2.5">
            <p className="mb-1 text-[10px] font-medium text-amber-400">⚠️ 주의사항</p>
            <ul className="space-y-0.5">
              {allCautions.map((c, i) => (
                <li key={i} className="text-xs text-amber-200/70">
                  • {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
