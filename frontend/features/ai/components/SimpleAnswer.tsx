import { SimpleData } from "../types";
import { sanitizeAnswer } from "../utils";

interface Props {
  data: SimpleData;
}

export default function SimpleAnswer({ data }: Props) {
  return (
    <div className="rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
      <p>{sanitizeAnswer(data.answer)}</p>
      {data.supporting_data && (
        <p className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {data.supporting_data}
        </p>
      )}
    </div>
  );
}
