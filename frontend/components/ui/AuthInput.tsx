import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

const BASE_CLASS =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition-colors focus:ring-2 focus:ring-violet-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500";

export default function AuthInput({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(BASE_CLASS, className)} {...props} />;
}
