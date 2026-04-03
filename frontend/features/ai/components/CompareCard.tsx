import { CompareData } from "../types";

interface Props {
  data: CompareData;
}

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

export default function CompareCard({ data }: Props) {
  return (
    <div className="w-full overflow-hidden rounded-2xl rounded-tl-sm border border-white/10 bg-gray-800/80 text-sm">
      <div className={`grid divide-x divide-white/10 grid-cols-${data.options.length}`}>
        {data.options.map((option) => (
          <div
            key={option.name}
            className={`p-4 ${option.recommended ? "bg-violet-950/30" : ""}`}
          >
            <div className="mb-0.5 flex items-center justify-between gap-2">
              <p className="truncate text-xs font-semibold text-white">
                {option.name}
              </p>
              {option.recommended && (
                <span className="shrink-0 rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] text-white">
                  추천
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-500">{option.provider}</p>
            <p className="mt-1 text-base font-bold text-white">
              {fmt(option.price)}원
              <span className="text-xs font-normal text-gray-400">/월</span>
            </p>

            {option.pros.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-[10px] font-medium text-green-400">장점</p>
                <ul className="space-y-1">
                  {option.pros.map((pro, i) => (
                    <li key={i} className="text-xs text-gray-300">
                      ✓ {pro}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {option.cons.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-[10px] font-medium text-red-400">단점</p>
                <ul className="space-y-1">
                  {option.cons.map((con, i) => (
                    <li key={i} className="text-xs text-gray-500">
                      ✗ {con}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {data.summary && (
        <div className="border-t border-white/10 px-4 py-3 text-xs leading-relaxed text-gray-300">
          {data.summary}
        </div>
      )}
    </div>
  );
}
