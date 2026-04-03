import { ForecastData } from "../types";
import { sanitizeAnswer } from "../utils";

interface Props {
  data: ForecastData;
}

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

export default function ForecastCard({ data }: Props) {
  return (
    <div className="w-full overflow-hidden rounded-2xl rounded-tl-sm border border-white/10 bg-gray-800/80 text-sm">
      {/* Metric boxes */}
      <div className="grid grid-cols-2 divide-x divide-white/10">
        <div className="px-4 py-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
            월 평균
          </p>
          <p className="mt-1 text-xl font-bold text-gray-100">
            {fmt(data.monthly_average)}
            <span className="ml-0.5 text-sm font-normal text-gray-400">원</span>
          </p>
        </div>
        <div className="px-4 py-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
            연간 예상
          </p>
          <p className="mt-1 text-xl font-bold text-green-400">
            {fmt(data.annual_estimate)}
            <span className="ml-0.5 text-sm font-normal text-green-400/70">원</span>
          </p>
        </div>
      </div>

      {/* Note */}
      <div className="border-t border-white/10 px-4 py-2">
        <p className="text-[10px] text-gray-600">{data.based_on_count}개 구독 기준</p>
      </div>

      {/* Answer */}
      {data.answer && (
        <div className="border-t border-white/5 px-4 py-3 text-xs leading-relaxed text-gray-400">
          {sanitizeAnswer(data.answer)}
        </div>
      )}
    </div>
  );
}
