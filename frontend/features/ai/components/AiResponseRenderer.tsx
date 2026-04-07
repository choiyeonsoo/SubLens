"use client";

import {
  AiApiResponse,
  AiResponse,
  Type1ApiResponse,
  Type1Data,
} from "../types";
import { sanitizeAnswer } from "../utils";
import OptimizationCard from "./OptimizationCard";
import CompareCard from "./CompareCard";
import SimpleAnswer from "./SimpleAnswer";
import SubscriptionStatusCard from "./SubscriptionStatusCard";
import TotalCostCard from "./TotalCostCard";
import ForecastCard from "./ForecastCard";

interface Props {
  response: AiApiResponse;
}

function renderType1(data: Type1Data) {
  switch (data.view_type) {
    case "status":
      return <SubscriptionStatusCard data={data} />;
    case "total":
      return <TotalCostCard data={data} />;
    case "forecast":
      return <ForecastCard data={data} />;
    case "single":
      return (
        <SimpleAnswer
          data={{
            view_type: "simple",
            answer: sanitizeAnswer(data.answer),
            supporting_data: null,
          }}
        />
      );
    default:
      return (
        <SimpleAnswer
          data={{
            view_type: "simple",
            answer: JSON.stringify(data),
            supporting_data: null,
          }}
        />
      );
  }
}

export default function AiResponseRenderer({ response }: Props) {
  try {
    // type_1 responses arrive wrapped as { type: "type_1", data: Type1Data }
    if ("type" in response && (response as Type1ApiResponse).type === "type_1") {
      return renderType1((response as Type1ApiResponse).data);
    }

    // type_4 responses (existing) — discriminated by view_type at the top level
    switch ((response as AiResponse).view_type) {
      case "optimize":
        return <OptimizationCard data={response as AiResponse & { view_type: "optimize" }} />;
      case "compare":
        return <CompareCard data={response as AiResponse & { view_type: "compare" }} />;
      case "simple":
        return <SimpleAnswer data={response as AiResponse & { view_type: "simple" }} />;
      default:
        return (
          <SimpleAnswer
            data={{
              view_type: "simple",
              answer: JSON.stringify(response),
              supporting_data: null,
            }}
          />
        );
    }
  } catch {
    return (
      <div className="rounded-2xl rounded-tl-sm border border-red-500/20 bg-red-950/20 px-4 py-3 text-xs text-red-400">
        응답을 표시하는 중 오류가 발생했습니다.
      </div>
    );
  }
}
