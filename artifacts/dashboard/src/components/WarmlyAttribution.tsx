import { useMatchesQuery } from "../hooks/useMatchesQuery";
import { ReggieHead } from "./Reggie";

// Permanent (non-operator-controlled) Warmly attribution. Two surfaces:
// WarmlyBadge — small persistent top-right badge inside every form-card
// screen (questions / review / 404). WarmlyReviewCard — bigger moment that
// sits between the message preview and the Open WhatsApp CTA on review.
// Operator brandingEnabled toggle no longer applies to either.

const HOME_URL = "https://warmly.platespinner.studio";

function ChevronRight({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function WarmlyBadge() {
  const isNarrow = useMatchesQuery("(max-width: 720px)");
  return (
    <a
      href={HOME_URL}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--ink-2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--muted)";
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11.5,
        color: "var(--muted)",
        textDecoration: "none",
        fontWeight: 500,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
        transition: "color .15s",
      }}
    >
      {!isNarrow && (
        <>
          Get one for your business
          <ChevronRight size={11} />
        </>
      )}
      {isNarrow && <ChevronRight size={11} />}
      <span style={{ fontWeight: 700, color: "var(--ink)" }}>Warmly</span>
    </a>
  );
}

export function WarmlyReviewCard() {
  return (
    <a
      href={HOME_URL}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--cream-2)";
        e.currentTarget.style.borderColor = "var(--hair-2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--cream)";
        e.currentTarget.style.borderColor = "var(--hair)";
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "var(--cream)",
        border: "1px solid var(--hair)",
        borderRadius: 12,
        padding: "12px 14px",
        textDecoration: "none",
        marginTop: 14,
        transition: "background .15s, border-color .15s",
      }}
    >
      <ReggieHead size={36} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 500 }}>
          Like the look of this?
        </span>
        <span
          style={{
            fontSize: 14,
            color: "var(--ink-2)",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          Get one for your business
          <ChevronRight size={12} />
          <span style={{ fontWeight: 700, color: "var(--ink)" }}>Warmly</span>
        </span>
      </div>
    </a>
  );
}
