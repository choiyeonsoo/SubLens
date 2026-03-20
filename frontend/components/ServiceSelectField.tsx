"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { useSubscriptionServices } from "@/features/subscription/hooks";
import type { SubscriptionServiceItem } from "@/features/subscription/types";

interface Props {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export default function ServiceSelectField({ value, onChange, error }: Props) {
  const { data: services = [], isLoading } = useSubscriptionServices();

  // 카테고리별 그룹핑
  const grouped = useMemo(() => {
    return services.reduce<Record<string, SubscriptionServiceItem[]>>((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, [services]);

  const matched = services.find((s) => s.name === value);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SubscriptionServiceItem | null>(matched ?? null);
  const [isDirect, setIsDirect] = useState(!matched && !!value);
  const [directInput, setDirectInput] = useState(!matched ? value : "");

  const searchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
    else setQuery("");
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // 검색 필터링
  const filtered = useMemo(() => {
    if (!query.trim()) return grouped;
    const q = query.toLowerCase();
    const result: Record<string, SubscriptionServiceItem[]> = {};
    Object.entries(grouped).forEach(([cat, items]) => {
      const hits = items.filter((i) => i.name.toLowerCase().includes(q));
      if (hits.length > 0) result[cat] = hits;
    });
    return result;
  }, [query, grouped]);

  const totalFiltered = Object.values(filtered).flat().length;

  const handleSelect = (item: SubscriptionServiceItem | "direct") => {
    if (item === "direct") {
      setSelected(null);
      setIsDirect(true);
      onChange(directInput);
    } else {
      setSelected(item);
      setIsDirect(false);
      setDirectInput("");
      onChange(item.name);
    }
    setOpen(false);
  };

  const triggerLabel = isDirect
    ? directInput || "서비스명 직접 입력"
    : selected?.name || "서비스를 선택하세요";

  const borderClass = error
    ? "border-red-400 dark:border-red-500"
    : "border-gray-200 dark:border-gray-700";

  return (
    <div ref={containerRef} className="relative flex flex-col gap-2">
      {/* 트리거 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-violet-500 dark:bg-gray-800 dark:text-white ${borderClass}`}
      >
        <div className="flex items-center gap-2">
          {selected?.logoUrl && (
            <img
              src={selected.logoUrl}
              alt={selected.name}
              className="h-5 w-5 shrink-0 rounded object-contain"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}
          <span
            className={selected || isDirect ? "text-gray-900 dark:text-white" : "text-gray-400"}
          >
            {isLoading ? "불러오는 중..." : triggerLabel}
          </span>
        </div>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 드롭다운 */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
          {/* 검색창 */}
          <div className="sticky top-0 z-10 border-b border-gray-100 bg-white p-2 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-800">
              <svg
                className="h-3.5 w-3.5 shrink-0 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="서비스 검색..."
                className="w-full bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none dark:text-gray-300 dark:placeholder-gray-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 목록 */}
          <div className="max-h-56 overflow-y-auto">
            {totalFiltered === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-sm text-gray-400">
                <span className="text-2xl">🔍</span>
                <span>"{query}" 검색 결과 없음</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsDirect(true);
                    setSelected(null);
                    setDirectInput(query);
                    onChange(query);
                    setOpen(false);
                  }}
                  className="mt-1 rounded-md bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-100 dark:bg-violet-950 dark:text-violet-300"
                >
                  "{query}" 직접 등록하기
                </button>
              </div>
            ) : (
              Object.entries(filtered).map(([category, items]) => (
                <div key={category}>
                  {!query && (
                    <div className="bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      {category}
                    </div>
                  )}
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950 dark:hover:text-violet-300 ${
                        selected?.id === item.id
                          ? "bg-violet-50 font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <img
                        src={item.logoUrl}
                        alt={item.name}
                        className="h-5 w-5 shrink-0 rounded object-contain"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                      {query ? <HighlightText text={item.name} query={query} /> : item.name}
                      {selected?.id === item.id && (
                        <span className="ml-auto text-violet-500">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* 직접입력 하단 고정 */}
          {!query && (
            <div className="sticky bottom-0 border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <button
                type="button"
                onClick={() => handleSelect("direct")}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-violet-50 hover:text-violet-700 dark:hover:bg-violet-950 dark:hover:text-violet-300 ${
                  isDirect
                    ? "bg-violet-50 font-medium text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded border border-dashed border-gray-400 text-xs">
                  ✏️
                </span>
                직접입력
                {isDirect && <span className="ml-auto text-violet-500">✓</span>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 직접입력 인풋 */}
      {isDirect && (
        <input
          type="text"
          placeholder="서비스명을 직접 입력하세요"
          value={directInput}
          autoFocus
          onChange={(e) => {
            setDirectInput(e.target.value);
            onChange(e.target.value);
          }}
          className="w-full rounded-lg border border-violet-400 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 dark:border-violet-600 dark:bg-gray-800 dark:text-white"
        />
      )}
    </div>
  );
}

function HighlightText({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="rounded bg-yellow-100 px-0.5 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  );
}
