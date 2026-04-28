import type { WidgetConfig } from "@warmly/api-spec";

// Substitutes {q1}, {q2}, ... in the template with the snippet of the
// answer the user picked for that question (1-indexed for human authors).
// Unanswered tokens are left as-is so the operator can spot drift.
export function renderMessage(
  template: string,
  questions: WidgetConfig["questions"],
  answerIndexes: (number | null)[],
): string {
  return template.replace(/\{q(\d+)\}/g, (match, n: string) => {
    const i = Number(n) - 1;
    const q = questions[i];
    const picked = answerIndexes[i];
    if (!q || picked == null) return match;
    return q.answers[picked]?.snippet ?? match;
  });
}

// wa.me requires international digits only — no +, no spaces, no dashes.
export function toWaNumber(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

export function buildWaUrl(whatsappNumber: string, message: string): string {
  return `https://wa.me/${toWaNumber(whatsappNumber)}?text=${encodeURIComponent(message)}`;
}

export const SKIP_FALLBACK_MESSAGE = "Hi, I came from your website";
