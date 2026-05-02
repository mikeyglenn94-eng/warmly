import { useEffect, useRef, useState } from "react";
import type { Answer, Question } from "@warmly/api-spec";
import { renderMessage } from "../lib/wa-message";
import { WarmlyBadge, WarmlyReviewCard } from "./WarmlyAttribution";
import WhatsAppGlyph from "./WhatsAppGlyph";

// How long the highlighted answer state shows before the form auto-advances.
// 250ms reads as "I see you tapped that, here's the next one" without feeling
// laggy. Re-tapping a different answer cancels the in-flight advance.
const ADVANCE_DELAY_MS = 250;

// "One quick tap" / "Three quick taps". WidgetConfigSchema constrains
// questions to 1–5; "A few quick taps" is just defensive fallback.
const NUMBER_WORDS: Record<number, string> = {
  1: "One",
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
};
function tapsCopy(n: number): string {
  const word = NUMBER_WORDS[n] ?? "A few";
  const noun = n === 1 ? "tap" : "taps";
  return `${word} quick ${noun}`;
}

interface FormShellProps {
  questions: Question[];
  // Used by the review state to render the assembled message preview.
  // Optional because the operator-config preview pane uses forcedStep
  // and never reaches review; safe to default to empty there.
  messageTemplate?: string;
  brandingEnabled?: boolean;
  onComplete: (picks: number[]) => void;
  onSkip?: () => void;
  // Allow the operator-config preview pane to drive which question is on
  // screen without taking over the internal state machine entirely. When
  // forcedStep is set, auto-advance is also disabled — the parent owns
  // the step.
  forcedStep?: number;
}

type InternalStep = number | "review";

export default function FormShell({
  questions,
  messageTemplate = "",
  brandingEnabled = true,
  onComplete,
  onSkip,
  forcedStep,
}: FormShellProps) {
  const [internalStep, setInternalStep] = useState<InternalStep>(0);
  const [picks, setPicks] = useState<(number | null)[]>(() =>
    questions.map(() => null),
  );
  const advanceTimerRef = useRef<number | null>(null);

  const isPreview = forcedStep != null;
  const total = questions.length;
  const stepValue: InternalStep = isPreview ? forcedStep : internalStep;
  const isReview = stepValue === "review";

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current != null) {
        window.clearTimeout(advanceTimerRef.current);
      }
    };
  }, []);

  function clearPendingAdvance() {
    if (advanceTimerRef.current != null) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }

  function pick(i: number) {
    if (stepValue === "review") return;
    const stepIdx = stepValue;
    setPicks((prev: (number | null)[]) => {
      const next = [...prev];
      next[stepIdx] = i;
      return next;
    });
    // Operator preview: highlight only, never auto-advance — the parent
    // controls which step is visible.
    if (isPreview) return;

    clearPendingAdvance();
    advanceTimerRef.current = window.setTimeout(() => {
      advanceTimerRef.current = null;
      setInternalStep((prev: InternalStep): InternalStep => {
        if (prev === "review") return prev;
        if (prev === total - 1) return "review";
        return prev + 1;
      });
    }, ADVANCE_DELAY_MS);
  }

  function back() {
    if (isPreview) return;
    clearPendingAdvance();
    setInternalStep((prev: InternalStep): InternalStep => {
      if (prev === "review") return total - 1;
      if (typeof prev === "number" && prev > 0) return prev - 1;
      return prev;
    });
  }

  function submit() {
    onComplete(picks.map((p: number | null) => p ?? 0));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const reviewMessage = isReview
    ? renderMessage(
        messageTemplate,
        questions,
        picks.map((p: number | null) => p ?? 0),
      )
    : "";

  const currentIdx = isReview ? -1 : (stepValue as number);
  const q = !isReview && currentIdx >= 0 ? questions[currentIdx] : null;
  const selected = !isReview && currentIdx >= 0 ? picks[currentIdx] ?? null : null;

  if (!isReview && !q) return null;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 520,
        background: "var(--surface)",
        borderRadius: 20,
        boxShadow: "var(--shadow-md)",
        border: "1px solid var(--hair-2)",
        padding: "clamp(22px, 5vw, 32px) clamp(20px, 6vw, 36px) clamp(22px, 5vw, 28px)",
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: isReview ? "rgba(37, 211, 102, 0.18)" : "var(--blue)",
            color: isReview ? "var(--green-d)" : "var(--blue-d)",
            padding: "5px 11px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 99,
              background: isReview ? "var(--green-d)" : "var(--blue-d)",
            }}
          />
          {isReview ? "Ready to send" : "A few quick questions"}
        </div>
        <WarmlyBadge />
      </div>

      {isReview && (
        <h1
          style={{
            fontSize: "clamp(26px, 5vw, 34px)",
            fontWeight: 700,
            margin: 0,
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            color: "var(--ink)",
          }}
        >
          All set.
        </h1>
      )}
      <p
        style={{
          fontSize: "clamp(14px, 2vw, 16px)",
          color: "var(--ink-2)",
          margin: "8px 0 24px",
          lineHeight: 1.45,
          fontWeight: 500,
        }}
      >
        {isReview
          ? "Open WhatsApp to send your message."
          : `${tapsCopy(total)} and you'll be chatting on WhatsApp.`}
      </p>

      {isReview ? (
        <div
          style={{
            background: "var(--cream)",
            border: "1px solid var(--hair)",
            borderRadius: 12,
            padding: "16px 18px",
            fontSize: "clamp(14.5px, 2vw, 15.5px)",
            lineHeight: 1.5,
            color: "var(--ink)",
            whiteSpace: "pre-wrap",
            fontWeight: 500,
          }}
        >
          {reviewMessage}
        </div>
      ) : (
        <>
          <div
            style={{
              fontSize: "clamp(15px, 2.4vw, 17px)",
              color: "var(--ink)",
              marginBottom: 14,
              fontWeight: 600,
              letterSpacing: "-0.005em",
            }}
          >
            <span
              style={{
                color: "var(--orange)",
                fontWeight: 700,
                marginRight: 4,
              }}
            >
              {(currentIdx as number) + 1}.
            </span>
            {q!.text}
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {q!.answers.map((opt: Answer, i: number) => {
              const isSel = selected === i;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(i)}
                  style={{
                    appearance: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    width: "100%",
                    border: isSel ? "2px solid var(--orange)" : "1px solid var(--hair)",
                    background: isSel ? "var(--orange-tint)" : "var(--surface)",
                    borderRadius: 14,
                    padding: isSel ? "13px 17px" : "14px 18px",
                    fontSize: "clamp(14.5px, 2vw, 15.5px)",
                    fontWeight: 500,
                    color: "var(--ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    boxShadow: isSel ? "0 0 0 4px rgba(226,88,34,0.10)" : "none",
                    transition: "all .15s",
                  }}
                >
                  <span>{opt.text}</span>
                  {isSel && (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 12.5l4.5 4.5L19 7.5"
                        stroke="var(--orange)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Question-state footer: progress dots + inline back link.
          Review state replaces this with the green CTA + a centered back
          link below it. */}
      {!isReview && (
        <div
          style={{
            marginTop: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Dots total={total} current={currentIdx as number} />
          {(currentIdx as number) > 0 && !isPreview && (
            <button
              type="button"
              onClick={back}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                fontSize: 13,
                padding: 4,
                cursor: "pointer",
              }}
            >
              ← Back
            </button>
          )}
        </div>
      )}

      {isReview && (
        <button
          type="button"
          onClick={submit}
          style={{
            marginTop: 22,
            width: "100%",
            background: "var(--green)",
            color: "#fff",
            border: "none",
            padding: "clamp(15px, 3vw, 18px)",
            borderRadius: 14,
            fontSize: "clamp(15px, 2.2vw, 17px)",
            fontWeight: 700,
            letterSpacing: "-0.005em",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            boxShadow: "0 10px 24px -10px rgba(37,211,102,0.55)",
            cursor: "pointer",
          }}
        >
          <WhatsAppGlyph size={20} color="#fff" />
          Send on WhatsApp
        </button>
      )}

      <div
        style={{
          textAlign: "center",
          marginTop: 14,
          fontSize: 12.5,
          color: "var(--blue-d)",
          background: "var(--blue-soft)",
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid var(--blue)",
        }}
      >
        Your message will be ready, just hit send.
      </div>

      {isReview && <WarmlyReviewCard />}

      {isReview && !isPreview && (
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button
            type="button"
            onClick={back}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 13,
              color: "var(--muted)",
              cursor: "pointer",
              padding: 4,
            }}
          >
            ← Back
          </button>
        </div>
      )}

      {onSkip && (
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <button
            type="button"
            onClick={onSkip}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 16,
              color: "var(--muted)",
              textDecoration: "underline",
              textUnderlineOffset: 4,
              cursor: "pointer",
              padding: "14px 16px",
              minHeight: 44,
            }}
          >
            Skip the questions, just message
          </button>
        </div>
      )}
    </div>
  );
}

function Dots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {Array.from({ length: total }).map((_: unknown, i: number) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            background:
              i === current
                ? "var(--orange)"
                : i < current
                  ? "var(--ink)"
                  : "var(--muted-2)",
            opacity: i <= current ? 1 : 0.45,
          }}
        />
      ))}
      <span
        style={{
          fontSize: 12.5,
          color: "var(--muted)",
          marginLeft: 6,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {current + 1} of {total}
      </span>
    </div>
  );
}
