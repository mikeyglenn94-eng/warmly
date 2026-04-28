import type { WidgetConfig } from "@warmly/api-spec";

// Substitutes {q1}, {q2}, ... in the template with the snippet of the
// answer the user picked for that question (1-indexed for human authors).
// Unanswered tokens are left as-is so the operator can spot drift.
// Snippets are stored lowercase so they slot into the middle of templates
// cleanly; sentence-case is applied to the rendered output below so the
// final message reads naturally regardless of how snippets start.
export function renderMessage(
  template: string,
  questions: WidgetConfig["questions"],
  answerIndexes: (number | null)[],
): string {
  const substituted = template.replace(/\{q(\d+)\}/g, (match, n: string) => {
    const i = Number(n) - 1;
    const q = questions[i];
    const picked = answerIndexes[i];
    if (!q || picked == null) return match;
    return q.answers[picked]?.snippet ?? match;
  });
  return capitaliseSentences(substituted);
}

// Capitalises the first character of each sentence, where a sentence is
// delimited by ". ". Non-letter starts (digits, quotes, etc.) pass through
// unchanged because String#toUpperCase is a no-op on them.
function capitaliseSentences(text: string): string {
  return text
    .split(". ")
    .map((seg) => (seg.length > 0 ? seg.charAt(0).toUpperCase() + seg.slice(1) : seg))
    .join(". ");
}

// wa.me requires international digits only — no +, no spaces, no dashes.
export function toWaNumber(raw: string): string {
  return raw.replace(/[^0-9]/g, "");
}

export function buildWaUrl(whatsappNumber: string, message: string): string {
  return `https://wa.me/${toWaNumber(whatsappNumber)}?text=${encodeURIComponent(message)}`;
}

export const SKIP_FALLBACK_MESSAGE = "Hi, I came from your website";
