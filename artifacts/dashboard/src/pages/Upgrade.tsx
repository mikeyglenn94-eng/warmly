import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MeResponse, StripeRedirectResponse } from "@warmly/api-spec";
import { api, ApiError } from "../lib/api";
import { clearToken } from "../lib/auth";

export default function Upgrade() {
  const nav = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the user is already paid, send them straight to /app — no point
  // showing a checkout page.
  useEffect(() => {
    api<MeResponse>("/me", { auth: true })
      .then((m) => {
        if (m.isPaid) nav("/app", { replace: true });
      })
      .catch(() => undefined);
  }, [nav]);

  function logout() {
    clearToken();
    nav("/login");
  }

  async function startCheckout() {
    setError(null);
    setPending(true);
    try {
      const res = await api<StripeRedirectResponse>(
        "/billing/create-checkout-session",
        {
          method: "POST",
          body: { returnUrl: `${window.location.origin}/app` },
          auth: true,
        },
      );
      window.location.assign(res.url);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not start checkout. Try again.",
      );
      setPending(false);
    }
  }

  const bullets = [
    "Your link goes live and serves leads instantly.",
    "Apple Pay, Google Pay, or card.",
    "Cancel anytime from your dashboard.",
    "Full refund within 14 days.",
  ];

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--cream)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans)",
      }}
    >
      <TopBar onLogout={logout} />

      <div
        style={{
          flex: 1,
          display: "grid",
          placeItems: "center",
          padding: "clamp(20px, 5vw, 48px) clamp(16px, 4vw, 32px)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            background: "var(--surface)",
            border: "1px solid var(--hair-2)",
            borderRadius: 20,
            boxShadow: "var(--shadow-md)",
            padding: "clamp(24px, 5vw, 36px)",
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
            One step to go live
          </div>

          <h1
            style={{
              fontSize: "clamp(24px, 5vw, 30px)",
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
              color: "var(--ink)",
            }}
          >
            One quick step to go live
          </h1>
          <p
            style={{
              fontSize: "clamp(14px, 2vw, 16px)",
              color: "var(--ink-2)",
              margin: "8px 0 22px",
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            Your form is ready. £8/month gets it live and shareable.
          </p>

          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: "0 0 24px",
              display: "grid",
              gap: 10,
            }}
          >
            {bullets.map((b: string, i: number) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  fontSize: 14.5,
                  color: "var(--ink)",
                  fontWeight: 500,
                  lineHeight: 1.45,
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  style={{ flexShrink: 0, marginTop: 2 }}
                >
                  <path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    stroke="var(--orange)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          {error && (
            <div
              style={{
                fontSize: 13,
                color: "var(--red)",
                background: "var(--red-soft)",
                border: "1px solid var(--red)",
                borderRadius: 10,
                padding: "10px 12px",
                fontWeight: 500,
                marginBottom: 14,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={startCheckout}
            disabled={pending}
            style={{
              width: "100%",
              height: 48,
              background: pending ? "var(--orange-soft)" : "var(--orange)",
              color: pending ? "var(--orange-d)" : "#fff",
              border: "none",
              borderRadius: 14,
              fontSize: 15.5,
              fontWeight: 700,
              letterSpacing: "-0.005em",
              cursor: pending ? "not-allowed" : "pointer",
              boxShadow: pending ? "none" : "0 8px 20px -10px rgba(226,88,34,0.45)",
            }}
          >
            {pending ? "Opening checkout…" : "Continue to checkout"}
          </button>

          <div
            style={{
              textAlign: "center",
              marginTop: 16,
              fontSize: 12,
              color: "var(--muted)",
              fontWeight: 500,
            }}
          >
            Cancel anytime, full refund within 14 days.
          </div>

          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button
              type="button"
              onClick={() => nav("/app")}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 13,
                color: "var(--muted)",
                cursor: "pointer",
                padding: 4,
              }}
            >
              ← Back to dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopBar({ onLogout }: { onLogout: () => void }) {
  return (
    <div
      style={{
        height: 60,
        borderBottom: "1px solid var(--hair)",
        background: "var(--surface)",
        display: "flex",
        alignItems: "center",
        padding: "0 28px",
        gap: 14,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: "var(--ink)",
            display: "grid",
            placeItems: "center",
            color: "var(--cream)",
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: "-0.02em",
          }}
        >
          w
        </div>
        <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>
          Warmly
        </span>
      </div>
      <div style={{ flex: 1 }} />
      <button
        type="button"
        onClick={onLogout}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--muted)",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        Sign out
      </button>
    </div>
  );
}
