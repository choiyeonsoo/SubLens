import { SimpleData } from "../types";
import { sanitizeAnswer } from "../utils";

interface Props {
  data: SimpleData;
}

export default function SimpleAnswer({ data }: Props) {
  return (
    <div className="space-y-2">
      <div className="rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
        <p>{sanitizeAnswer(data.answer)}</p>
        {data.supporting_data && (
          <p className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
            {data.supporting_data}
          </p>
        )}
      </div>

      {data.summary && (
        <div className="rounded-xl border border-white/10 bg-gray-800/80 px-3 py-2.5">
          <p className="mb-0.5 text-[10px] font-medium text-gray-400">요약</p>
          <p className="text-xs leading-relaxed text-gray-200">{data.summary}</p>
        </div>
      )}

      {data.cautions && data.cautions.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-950/30 px-3 py-2.5">
          <p className="mb-1 text-[10px] font-medium text-amber-400">⚠️ 주의사항</p>
          <ul className="space-y-0.5">
            {data.cautions.map((c, i) => (
              <li key={i} className="text-xs text-amber-200/70">
                • {c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
