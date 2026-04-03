/**
 * Strip any leading JSON block that may bleed through from the backend
 * when a structured response is included alongside a natural language answer.
 *
 * e.g. `{"view_type":"total",...}\n이번 달 총액은 …` → `이번 달 총액은 …`
 */
export function sanitizeAnswer(text: string): string {
  return text.replace(/^\s*\{[\s\S]*?\}\s*/m, "").trim();
}
