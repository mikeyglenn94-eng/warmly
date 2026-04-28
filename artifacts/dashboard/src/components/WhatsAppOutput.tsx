// Mock WhatsApp chat UI used in the operator preview pane. Renders a single
// pre-filled message bubble in the composer, exactly as the lead would see
// it before they tap send.

export default function WhatsAppOutput({
  message,
  contactName = "Your business",
  initials = "WA",
}: {
  message: string;
  contactName?: string;
  initials?: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 520,
        height: 540,
        borderRadius: 14,
        overflow: "hidden",
        background: "#E5DDD5",
        border: "1px solid var(--hair)",
        boxShadow: "var(--shadow-md)",
        fontFamily: "var(--font-sans)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <div
        style={{
          background: "#075E54",
          color: "#fff",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 600, opacity: 0.9 }}>←</span>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            background: "#0A8F7E",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>{contactName}</div>
          <div style={{ fontSize: 11.5, opacity: 0.75 }}>online</div>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 16, opacity: 0.85 }}>
          <span>📞</span>
          <span>⋮</span>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          padding: "14px 14px",
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(0,0,0,0.04) 1px, transparent 1px), radial-gradient(circle at 80% 60%, rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            alignSelf: "center",
            background: "rgba(255,237,180,0.85)",
            color: "#5C4A1F",
            fontSize: 11.5,
            fontWeight: 500,
            padding: "5px 10px",
            borderRadius: 6,
            marginBottom: 6,
          }}
        >
          Today
        </div>
        <div
          style={{
            alignSelf: "center",
            background: "rgba(225,245,254,0.9)",
            color: "#3A5A6B",
            fontSize: 10.5,
            padding: "5px 10px",
            borderRadius: 6,
            maxWidth: "80%",
            textAlign: "center",
          }}
        >
          🔒 Messages are end-to-end encrypted.
        </div>
      </div>
      <div
        style={{
          padding: "8px 8px 10px",
          display: "flex",
          gap: 6,
          alignItems: "flex-end",
          background: "transparent",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            background: "#fff",
            borderRadius: 22,
            padding: "9px 14px",
            fontSize: 14,
            color: "var(--ink)",
            lineHeight: 1.45,
            minHeight: 40,
            whiteSpace: "pre-wrap",
            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
          }}
        >
          {message}
        </div>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 999,
            background: "var(--green)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            boxShadow: "0 2px 6px rgba(37,211,102,0.4)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
