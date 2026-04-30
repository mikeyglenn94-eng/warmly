import type { ReactNode } from "react";

// Placeholder mascot art — single pose, stroke-led ink-line style. Final
// illustration will replace this. Exports kept small: Butler is the raw SVG,
// ButlerHead is a tiny head-only variant for inline use (tooltips), and
// ButlerSays composes the figure with a speech bubble.

export function Butler({ size = 96 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={(size * 130) / 100}
      viewBox="0 0 100 130"
      fill="none"
      stroke="var(--ink)"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, display: "block" }}
      aria-hidden="true"
    >
      <path d="M 65 82 Q 80 72 88 58" stroke="var(--ink)" strokeWidth="7" />
      <circle cx="88" cy="56" r="5.5" fill="#fff" stroke="var(--ink)" strokeWidth="1.6" />
      <path d="M 35 82 L 28 112" stroke="var(--ink)" strokeWidth="7" />
      <circle cx="27" cy="115" r="4.8" fill="#fff" stroke="var(--ink)" strokeWidth="1.6" />
      <path d="M 35 82 L 22 100 L 22 124 L 78 124 L 78 100 L 65 82 Z" fill="var(--ink)" />
      <path d="M 50 70 L 42 96 L 50 102 L 58 96 Z" fill="#fff" stroke="var(--ink)" />
      <path d="M 50 70 L 42 80 M 50 70 L 58 80" stroke="var(--ink)" />
      <circle cx="50" cy="86" r="1" fill="var(--ink)" stroke="none" />
      <circle cx="50" cy="93" r="1" fill="var(--ink)" stroke="none" />
      <path
        d="M 50 70 L 41 65 L 41 76 L 50 70 L 59 65 L 59 76 Z"
        fill="var(--ink)"
        stroke="var(--ink)"
      />
      <ellipse cx="50" cy="70.5" rx="1.6" ry="2.6" fill="var(--cream)" stroke="none" />
      <ellipse cx="50" cy="40" rx="18" ry="20" fill="var(--cream)" stroke="var(--ink)" />
      <path
        d="M 33 33 Q 36 20 50 18 Q 64 20 67 33 Q 60 26 50 26 Q 40 26 33 33 Z"
        fill="var(--ink)"
        stroke="none"
      />
      <path d="M 41 40 Q 43 43 45 40" />
      <path d="M 55 40 Q 57 43 59 40" />
      <path
        d="M 41 49 Q 45 51 50 50 Q 55 51 59 49 Q 57 53 52 51 Q 50 51 48 51 Q 43 53 41 49 Z"
        fill="var(--ink)"
        stroke="none"
      />
      <path d="M 47 55 Q 50 57 53 55" />
    </svg>
  );
}

export function ButlerHead({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      fill="none"
      stroke="var(--ink)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      <ellipse cx="25" cy="22" rx="14" ry="16" fill="var(--cream)" stroke="var(--ink)" />
      <path
        d="M 11 18 Q 14 6 25 5 Q 36 6 39 18 Q 33 11 25 11 Q 17 11 11 18 Z"
        fill="var(--ink)"
        stroke="none"
      />
      <path d="M 19 24 Q 21 27 23 24" />
      <path d="M 27 24 Q 29 27 31 24" />
      <path
        d="M 17 32 Q 21 34 25 33 Q 29 34 33 32 Q 31 36 26 34 Q 25 34 24 34 Q 19 36 17 32 Z"
        fill="var(--ink)"
        stroke="none"
      />
      <path d="M 14 41 L 18 47 L 32 47 L 36 41 Z" fill="var(--ink)" stroke="var(--ink)" />
      <path d="M 22 41 L 25 44 L 28 41" stroke="#fff" />
    </svg>
  );
}

export function ButlerSays({
  children,
  layout = "row",
  size = 96,
  bubbleMaxWidth = 460,
}: {
  children: ReactNode;
  layout?: "row" | "column";
  size?: number;
  bubbleMaxWidth?: number;
}) {
  const isRow = layout === "row";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: isRow ? "row" : "column",
        alignItems: isRow ? "flex-start" : "center",
        gap: isRow ? 18 : 14,
        width: "100%",
      }}
    >
      <Butler size={size} />
      <Bubble tail={isRow ? "left" : "top"} maxWidth={bubbleMaxWidth}>
        {children}
      </Bubble>
    </div>
  );
}

function Bubble({
  children,
  tail,
  maxWidth,
}: {
  children: ReactNode;
  tail: "left" | "top";
  maxWidth: number;
}) {
  return (
    <div
      style={{
        position: "relative",
        background: "var(--surface)",
        border: "1.5px solid var(--ink)",
        borderRadius: 14,
        padding: "14px 18px",
        fontSize: 14.5,
        lineHeight: 1.5,
        color: "var(--ink)",
        fontWeight: 500,
        maxWidth,
        boxShadow: "0 4px 14px -10px rgba(26,26,26,0.25)",
      }}
    >
      <span
        aria-hidden="true"
        style={
          tail === "left"
            ? {
                position: "absolute",
                left: -8,
                top: 22,
                width: 14,
                height: 14,
                background: "var(--surface)",
                borderLeft: "1.5px solid var(--ink)",
                borderBottom: "1.5px solid var(--ink)",
                transform: "rotate(45deg)",
              }
            : {
                position: "absolute",
                top: -8,
                left: "50%",
                marginLeft: -7,
                width: 14,
                height: 14,
                background: "var(--surface)",
                borderTop: "1.5px solid var(--ink)",
                borderLeft: "1.5px solid var(--ink)",
                transform: "rotate(45deg)",
              }
        }
      />
      {children}
    </div>
  );
}
