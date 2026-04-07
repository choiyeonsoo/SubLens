import { TotalData } from "../types";
import { sanitizeAnswer } from "../utils";

interface Props {
  data: TotalData;
}

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

export default function TotalCostCard({ data }: Props) {
  return (
    <div className="w-full overflow-hidden rounded-2xl rounded-tl-sm border border-white/10 bg-gray-800/80 text-sm">
      {/* Main amount */}
      <div className="px-5 py-4">
        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
          {data.period}
        </p>
        <p className="mt-1 text-3xl font-bold text-gray-100">
          {fmt(data.amount)}
          <span className="ml-1 text-lg font-normal text-gray-400">원</span>
        </p>
      </div>

      {/* Breakdown */}
      {data.breakdown.length > 0 && (
        <div className="border-t border-white/10 px-5 py-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-gray-500">
            구독 내역
          </p>
          <ul className="space-y-1.5">
            {data.breakdown.map((item) => (
              <li key={item.name} className="flex items-center justify-between text-xs">
                <span className="text-gray-400">{item.name}</span>
                <span className="font-medium text-gray-300">{fmt(item.price)}원</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Answer */}
      {data.answer && (
        <div className="border-t border-white/5 px-5 py-3 text-xs leading-relaxed text-gray-400">
          {sanitizeAnswer(data.answer)}
        </div>
      )}
    </div>
  );
}
