import { useEffect, useRef, useState, type ReactNode } from "react";
import WhatsAppGlyph from "./WhatsAppGlyph";

const SHARE_MESSAGE =
  "Got a butler called Reggie handling my WhatsApp leads now. Ridiculous and brilliant. https://warmly.platespinner.studio";

// Placeholder mascot art — single pose, stroke-led ink-line style. Final
// illustration will replace this. Exports kept small: Reggie is the raw SVG,
// ReggieHead is a tiny head-only variant for inline use (tooltips), and
// ReggieSays composes the figure with a speech bubble.

export function Reggie({ size = 96 }: { size?: number }) {
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

export function ReggieHead({ size = 24 }: { size?: number }) {
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

export function ReggieSays({
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
      <Reggie size={size} />
      <Bubble tail={isRow ? "left" : "top"} maxWidth={bubbleMaxWidth}>
        {children}
      </Bubble>
    </div>
  );
}

export function ReggieReferralPlea() {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--hair)",
        borderRadius: 16,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <ReggieSays layout="row" size={72} bubbleMaxWidth={520}>
        Enjoying my service, Master? One does so love a full house. A kind word in a friend's
        ear would be most appreciated. Master doesn't feed me unless more guests arrive at the
        party.
      </ReggieSays>
      <ShareButtons />
    </div>
  );
}

export function ReggieBreakthrough({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1.5px solid var(--ink)",
        borderRadius: 18,
        padding: "20px 22px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        boxShadow: "0 10px 30px -18px rgba(26,26,26,0.45)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
        <Reggie size={120} />
        <div style={{ flex: 1, minWidth: 240, display: "grid", gap: 10 }}>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            A triumph, Master.
          </h2>
          <p
            style={{
              fontSize: 14.5,
              color: "var(--ink-2)",
              margin: 0,
              lineHeight: 1.55,
              fontWeight: 500,
            }}
          >
            One's establishment is open. The first guests will arrive soon. If Master is
            feeling generous, a recommendation to a friend would not go amiss. One does, after
            all, eat only when guests arrive.
          </p>
        </div>
      </div>
      <ShareButtons size="large" />
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            fontSize: 13,
            fontWeight: 500,
            fontStyle: "italic",
            cursor: "pointer",
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          Right you are, Reggie
        </button>
      </div>
    </div>
  );
}

function ShareButtons({ size = "small" }: { size?: "small" | "large" }) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (copyTimerRef.current != null) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  async function copyMessage() {
    let ok = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(SHARE_MESSAGE);
        ok = true;
      } catch {
        ok = legacyCopy(SHARE_MESSAGE);
      }
    } else {
      ok = legacyCopy(SHARE_MESSAGE);
    }
    if (!ok) return;
    if (copyTimerRef.current != null) window.clearTimeout(copyTimerRef.current);
    setCopied(true);
    copyTimerRef.current = window.setTimeout(() => {
      setCopied(false);
      copyTimerRef.current = null;
    }, 2000);
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(SHARE_MESSAGE)}`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_MESSAGE)}`;
  const isLarge = size === "large";
  const iconBox = isLarge ? 44 : 36;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: isLarge ? 12 : 8,
      }}
    >
      <ShareButton href={waUrl} label="WhatsApp" iconBox={iconBox}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            background: "#25D366",
            width: iconBox,
            height: iconBox,
            borderRadius: 10,
          }}
        >
          <WhatsAppGlyph size={isLarge ? 22 : 18} color="#fff" />
        </span>
      </ShareButton>
      <ShareButton href={xUrl} label="X" iconBox={iconBox}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            background: "var(--ink)",
            width: iconBox,
            height: iconBox,
            borderRadius: 10,
            color: "#fff",
          }}
        >
          <svg
            width={isLarge ? 22 : 18}
            height={isLarge ? 22 : 18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 4 L20 20 M20 4 L4 20" />
          </svg>
        </span>
      </ShareButton>
      <ShareButton onClick={copyMessage} label={copied ? "Copied!" : "Copy"} iconBox={iconBox}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            background: copied ? "var(--cream)" : "var(--cream-2)",
            border: copied ? "1px solid var(--green)" : "1px solid var(--hair)",
            width: iconBox,
            height: iconBox,
            borderRadius: 10,
            color: copied ? "var(--green-d)" : "var(--ink-2)",
          }}
        >
          <svg
            width={isLarge ? 20 : 16}
            height={isLarge ? 20 : 16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="9" y="3" width="12" height="12" rx="2" />
            <rect x="3" y="9" width="12" height="12" rx="2" />
          </svg>
        </span>
      </ShareButton>
    </div>
  );
}

function ShareButton({
  href,
  onClick,
  label,
  iconBox: _iconBox,
  children,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  iconBox: number;
  children: ReactNode;
}) {
  const inner = (
    <span
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      {children}
      <span
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          color: "var(--ink-2)",
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </span>
    </span>
  );
  const sharedStyle = {
    background: "transparent",
    border: "none",
    padding: 4,
    cursor: "pointer",
    width: "100%",
  } as const;
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...sharedStyle, textDecoration: "none" }}
      >
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} style={sharedStyle}>
      {inner}
    </button>
  );
}

function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
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
