"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Send, Bot, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import AiResponseRenderer from "@/features/ai/components/AiResponseRenderer";
import { AiResponse } from "@/features/ai/types";

const AI_BASE =
  process.env.NEXT_PUBLIC_AI_API_URL ?? "http://localhost:8001";
const AI_STREAM_URL = `${AI_BASE}/api/ai/query/stream`;
const SESSIONS_URL = (userId: string) => `${AI_BASE}/api/ai/sessions/${userId}`;
const SESSION_MSGS_URL = (userId: string, sid: string) =>
  `${AI_BASE}/api/ai/sessions/${userId}/${sid}`;

const QUICK_QUESTIONS = [
  "이번 달 구독료 총액이 얼마야?",
  "내 구독 최적화해줘",
  "유독 해지하면 위약금 있어?",
  "구독 어떻게 추가해?",
  "넷플릭스랑 유튜브 프리미엄 번들이 나한테 이득이야?",
];

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  type_1: { label: "내 데이터",    className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  type_2: { label: "서비스 안내",  className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  type_3: { label: "번들 문의",    className: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  type_4: { label: "구독 최적화",  className: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
};

// ── Types ──────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "ai";
  content: string | AiResponse;
  query_type?: string;
  status?: string;
}

interface SessionMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function parseMarkdown(text: string): { __html: string } {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const bolded = escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return { __html: bolded.replace(/\n/g, "<br>") };
}

function relativeDate(ts: number): string {
  const now = Date.now() / 1000;
  const diffSec = now - ts;
  const diffDays = Math.floor(diffSec / 86_400);
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";
  return `${diffDays}일 전`;
}

function redisToMessages(history: { role: string; content: string }[]): Message[] {
  return history.map((h) => {
    if (h.role === "user") {
      return { id: uuid(), role: "user" as const, content: h.content };
    }
    let parsed: string | AiResponse = h.content;
    try {
      const obj = JSON.parse(h.content);
      if (obj && typeof obj === "object" && ("view_type" in obj || "answer" in obj)) {
        parsed = obj as AiResponse;
      }
    } catch {
      /* plain text */
    }
    return { id: uuid(), role: "ai" as const, content: parsed };
  });
}

// ── Component ──────────────────────────────────────────────────────────────
export default function RecommendView() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredSessionId, setHoveredSessionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── API helpers ──────────────────────────────────────────────────────────
  const refreshSessions = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(SESSIONS_URL(user.id), { mode: "cors" });
      if (res.ok) {
        const data: SessionMeta[] = await res.json();
        setSessions(data);
      }
    } catch {
      /* silently ignore — sessions sidebar is non-critical */
    }
  }, [user]);

  // Load sessions from API on mount
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) router.replace("/login");
  }, [user, router]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ── Session actions ──────────────────────────────────────────────────────
  const startNewChat = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  }, []);

  const loadSession = useCallback(
    async (session: SessionMeta) => {
      if (!user) return;
      setActiveSessionId(session.id);
      setMessages([]);
      setInput("");
      inputRef.current?.focus();

      try {
        const res = await fetch(SESSION_MSGS_URL(user.id, session.id), { mode: "cors" });
        if (res.ok) {
          const history = await res.json();
          setMessages(redisToMessages(history));
        }
      } catch {
        toast.error("대화 내역을 불러올 수 없습니다.");
      }
    },
    [user],
  );

  const deleteSession = useCallback(
    async (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation();
      if (!user) return;
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
      }
      try {
        await fetch(SESSION_MSGS_URL(user.id, sessionId), { method: "DELETE", mode: "cors" });
      } catch {
        /* best-effort delete */
      }
    },
    [activeSessionId, user],
  );

  // ── Send message (SSE streaming) ─────────────────────────────────────────
  async function sendMessage(question: string) {
    const q = question.trim();
    if (!q || isLoading || !user) return;

    setInput("");
    inputRef.current!.style.height = "44px";

    const currentSessionId = activeSessionId ?? uuid();
    if (!activeSessionId) setActiveSessionId(currentSessionId);

    const userMsg: Message = { id: uuid(), role: "user", content: q };
    const aiMsgId = uuid();
    const aiPlaceholder: Message = { id: aiMsgId, role: "ai", content: "" };

    setMessages((prev) => [...prev, userMsg, aiPlaceholder]);
    setIsLoading(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    try {
      const res = await fetch(AI_STREAM_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          question: q,
          session_id: currentSessionId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text().catch(() => `HTTP ${res.status}`);
        throw new Error(`서버 오류 (${res.status}): ${text}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamedText = "";
      let queryType = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop()!;

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;

          let data: Record<string, unknown>;
          try {
            data = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          switch (data.event) {
            case "classify":
              queryType = data.query_type as string;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId ? { ...m, query_type: queryType } : m,
                ),
              );
              break;

            case "status":
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId
                    ? { ...m, status: data.text as string, content: "" }
                    : m,
                ),
              );
              break;

            case "token":
              streamedText += data.text as string;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId
                    ? { ...m, content: streamedText, status: undefined }
                    : m,
                ),
              );
              break;

            case "done": {
              const finalContent = data.answer as string | AiResponse;
              queryType = (data.query_type as string) || queryType;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMsgId
                    ? {
                        ...m,
                        content: finalContent,
                        query_type: queryType,
                        status: undefined,
                      }
                    : m,
                ),
              );
              refreshSessions();
              break;
            }

            case "error":
              throw new Error(data.message as string);
          }
        }
      }
    } catch (err) {
      clearTimeout(timeout);
      const message =
        err instanceof Error
          ? err.name === "AbortError"
            ? "응답 시간이 초과됐습니다. (120초)"
            : err.message.includes("Failed to fetch") ||
                err.message.includes("NetworkError")
              ? "AI 서버에 연결할 수 없습니다. 서버 상태를 확인해주세요."
              : err.message
          : "알 수 없는 오류가 발생했습니다.";

      toast.error(message);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId ? { ...m, content: message, status: undefined } : m,
        ),
      );
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = "44px";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  }

  if (!user) return null;

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">

      {/* ── Session Sidebar ── */}
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-gray-100 dark:border-gray-800 sm:flex">
        {/* New chat button */}
        <div className="shrink-0 p-3">
          <button
            onClick={startNewChat}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Plus className="h-4 w-4 text-violet-600" />
            새 대화
          </button>
        </div>

        <div className="shrink-0 border-t border-gray-100 dark:border-gray-800" />

        {/* Session list */}
        <div className="flex-1 overflow-y-auto py-2">
          {sessions.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-gray-400 dark:text-gray-600">
              저장된 대화가 없습니다.
            </p>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isHovered = session.id === hoveredSessionId;
              return (
                <div
                  key={session.id}
                  onClick={() => loadSession(session)}
                  onMouseEnter={() => setHoveredSessionId(session.id)}
                  onMouseLeave={() => setHoveredSessionId(null)}
                  className={`group relative mx-2 cursor-pointer rounded-lg px-3 py-2.5 transition-colors ${
                    isActive
                      ? "bg-violet-50 dark:bg-violet-950"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <p
                    className={`truncate text-sm font-medium leading-snug ${
                      isActive
                        ? "text-violet-700 dark:text-violet-300"
                        : "text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {session.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    {relativeDate(session.updatedAt)}
                  </p>

                  {/* Delete button */}
                  {isHovered && (
                    <button
                      onClick={(e) => deleteSession(e, session.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950 dark:hover:text-red-400"
                      title="삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Chat Area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-5 py-4 dark:border-gray-800 dark:bg-gray-900">
          <Sparkles className="h-4 w-4 text-violet-600" />
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
            AI 구독 추천
          </h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">

            {/* Empty state */}
            {messages.length === 0 && !isLoading && (
              <div className="flex flex-col items-center gap-6 py-10">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950">
                  <Bot className="h-7 w-7 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="text-center">
                  <p className="text-base font-medium text-gray-900 dark:text-white">
                    무엇을 도와드릴까요?
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    구독 현황, 비용 분석, 번들 추천까지 물어보세요.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 transition-colors hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-violet-700 dark:hover:bg-violet-950 dark:hover:text-violet-300"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message list */}
            {messages.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-violet-600 px-4 py-2.5 text-sm leading-relaxed text-white">
                    {msg.content as string}
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950">
                    <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    {msg.query_type && TYPE_BADGE[msg.query_type] && (
                      <span
                        className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[msg.query_type].className}`}
                      >
                        {TYPE_BADGE[msg.query_type].label}
                      </span>
                    )}
                    {msg.status ? (
                      <div className="rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                          <span>{msg.status}</span>
                        </div>
                      </div>
                    ) : typeof msg.content === "string" && msg.content === "" ? (
                      <div className="rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-4 py-3.5 dark:border-gray-700 dark:bg-gray-800">
                        <div className="flex items-center gap-1">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.3s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.15s]" />
                          <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" />
                        </div>
                      </div>
                    ) : typeof msg.content === "string" ? (
                      <div className="rounded-2xl rounded-tl-sm border border-gray-100 bg-white px-4 py-3 text-sm leading-relaxed text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        <span dangerouslySetInnerHTML={parseMarkdown(msg.content)} />
                      </div>
                    ) : (
                      <AiResponseRenderer response={msg.content} />
                    )}
                  </div>
                </div>
              ),
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900 sm:px-6">
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="질문을 입력하세요..."
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-violet-400 focus:bg-white disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-violet-600 dark:focus:bg-gray-800"
              style={{ height: "44px", minHeight: "44px", maxHeight: "120px" }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-700 dark:disabled:text-gray-500"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
