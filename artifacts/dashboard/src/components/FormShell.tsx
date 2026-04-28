import { useState } from "react";
import type { Answer, Question } from "@warmly/api-spec";
import WhatsAppGlyph from "./WhatsAppGlyph";

interface FormShellProps {
  questions: Question[];
  brandingEnabled?: boolean;
  onComplete: (picks: number[]) => void;
  onSkip?: () => void;
  // Allow the operator-config preview pane to drive which question is on
  // screen without taking over the internal state machine entirely.
  forcedStep?: number;
}

export default function FormShell({
  questions,
  brandingEnabled = true,
  onComplete,
  onSkip,
  forcedStep,
}: FormShellProps) {
  const [internalStep, setInternalStep] = useState(0);
  const [picks, setPicks] = useState<(number | null)[]>(() =>
    questions.map(() => null),
  );

  const total = questions.length;
  const current = forcedStep ?? internalStep;
  const q = questions[current];
  const selected = picks[current];
  const isLast = current === total - 1;
  const hasPick = selected != null;

  function pick(i: number) {
    setPicks((prev) => {
      const next = [...prev];
      next[current] = i;
      return next;
    });
  }

  function advanceOrSubmit() {
    if (!hasPick) return;
    if (isLast) {
      onComplete(picks.map((p: number | null) => (p ?? 0)));
      return;
    }
    if (forcedStep == null) setInternalStep(current + 1);
  }

  function back() {
    if (forcedStep == null && current > 0) setInternalStep(current - 1);
  }

  if (!q) return null;

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
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "var(--blue)",
          color: "var(--blue-d)",
          padding: "5px 11px",
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          marginBottom: 16,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 99,
            background: "var(--blue-d)",
          }}
        />
        A few quick questions
      </div>

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
        Hey, glad you're here.
      </h1>
      <p
        style={{
          fontSize: "clamp(14px, 2vw, 16px)",
          color: "var(--ink-2)",
          margin: "8px 0 24px",
          lineHeight: 1.45,
          fontWeight: 500,
        }}
      >
        Three quick taps and you'll be chatting on WhatsApp.
      </p>

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
          {current + 1}.
        </span>
        {q.text}
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {q.answers.map((opt: Answer, i: number) => {
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

      <div
        style={{
          marginTop: 22,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Dots total={total} current={current} />
        {current > 0 && forcedStep == null && (
          <button
            type="button"
            onClick={back}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              fontSize: 13,
              padding: 4,
            }}
          >
            ← Back
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={advanceOrSubmit}
        disabled={!hasPick}
        style={{
          marginTop: 18,
          width: "100%",
          background: !hasPick
            ? "var(--orange)"
            : isLast
              ? "var(--green)"
              : "var(--orange)",
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
          opacity: !hasPick ? 0.55 : 1,
          boxShadow:
            isLast && hasPick
              ? "0 10px 24px -10px rgba(37,211,102,0.55)"
              : "0 8px 20px -10px rgba(226,88,34,0.45)",
          cursor: hasPick ? "pointer" : "not-allowed",
        }}
      >
        <WhatsAppGlyph size={20} color="#fff" />
        {!hasPick
          ? "Answer to continue"
          : isLast
            ? "Open WhatsApp"
            : "Continue"}
      </button>

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

      {onSkip && (
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button
            type="button"
            onClick={onSkip}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 13,
              color: "var(--muted)",
              textDecoration: "underline",
              textUnderlineOffset: 3,
              cursor: "pointer",
              padding: 4,
            }}
          >
            Skip the questions, just message
          </button>
        </div>
      )}

      {brandingEnabled && (
        <div
          style={{
            textAlign: "center",
            marginTop: 16,
            fontSize: 11,
            color: "var(--muted-2)",
            letterSpacing: "0.04em",
          }}
        >
          Powered by Warmly
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
