import { StatusData } from "../types";
import { sanitizeAnswer } from "../utils";

interface Props {
  data: StatusData;
}

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

const SERVICE_COLORS: Record<string, string> = {
  netflix: "#e50914",
  youtube: "#ff0000",
  "youtube premium": "#ff0000",
  claude: "#cc5500",
  쿠팡: "#e8342a",
  카카오: "#ffcd00",
  요기요: "#e5003a",
};

function getServiceColor(name: string): { bg: string; text: string } {
  const key = name.toLowerCase();
  const found = Object.entries(SERVICE_COLORS).find(([k]) => key.includes(k));
  return found ? { bg: found[1], text: "#fff" } : { bg: "#6b7280", text: "#fff" };
}

export default function SubscriptionStatusCard({ data }: Props) {
  return (
    <div className="w-full overflow-hidden rounded-2xl rounded-tl-sm border border-white/10 bg-gray-800/80 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-gray-900/60 px-4 py-3">
        <p className="text-xs font-medium text-gray-400">활성 구독</p>
        <div className="text-right">
          <p className="text-[10px] text-gray-500">월 총액</p>
          <p className="font-semibold text-gray-200">{fmt(data.total_monthly_cost)}원</p>
        </div>
      </div>

      {/* Subscription rows */}
      <ul className="divide-y divide-white/5 px-4">
        {data.active_subscriptions.map((sub) => {
          const color = getServiceColor(sub.name);
          const isInactive = sub.status !== "활성" && sub.status !== "ACTIVE";
          return (
            <li
              key={sub.name}
              className={`flex items-center gap-3 py-3 ${isInactive ? "opacity-40" : ""}`}
            >
              {/* Icon circle */}
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{ backgroundColor: color.bg, color: color.text }}
              >
                {sub.name.charAt(0)}
              </span>

              {/* Name + date */}
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-xs font-medium ${
                    isInactive
                      ? "text-gray-600 line-through"
                      : "text-gray-200"
                  }`}
                >
                  {sub.name}
                </p>
                {sub.next_billing_date && (
                  <p className="text-[10px] text-gray-600">
                    다음 결제 {sub.next_billing_date}
                  </p>
                )}
              </div>

              {/* Price + cycle */}
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-200">
                  {fmt(sub.price)}원
                </p>
                <p className="text-[10px] text-gray-600">{sub.billing_cycle}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/10 bg-gray-900/40 px-4 py-2.5">
        <span className="rounded-full bg-violet-600/20 px-2.5 py-1 text-[10px] font-medium text-violet-300">
          {data.subscription_count}개 구독 중
        </span>
        <p className="text-xs font-semibold text-gray-300">
          {fmt(data.total_monthly_cost)}원<span className="font-normal text-gray-500">/월</span>
        </p>
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
