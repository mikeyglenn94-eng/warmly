import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import type { AuthResponse } from "@warmly/api-spec";
import { api, ApiError } from "../lib/api";
import { setToken } from "../lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/app";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await api<AuthResponse>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      setToken(res.token);
      nav(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your Warmly account.">
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
        <Field label="Email" type="email" value={email} onChange={setEmail} autoFocus />
        <Field label="Password" type="password" value={password} onChange={setPassword} />
        {error && <ErrorText>{error}</ErrorText>}
        <PrimaryButton disabled={pending}>{pending ? "Signing in…" : "Sign in"}</PrimaryButton>
      </form>
      <SwitchLink>
        New here? <Link to="/signup">Create an account</Link>
      </SwitchLink>
    </AuthShell>
  );
}

// ── Shared auth-page atoms ─────────────────────────────────────────────────
// Kept inline here (and re-imported by Signup) since this is the only place
// they're used and the file stays small.

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--cream)",
        display: "grid",
        placeItems: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--surface)",
          border: "1px solid var(--hair-2)",
          borderRadius: 20,
          boxShadow: "var(--shadow-md)",
          padding: "32px 32px 28px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 18,
          }}
        >
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
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            margin: 0,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: 14.5,
            color: "var(--ink-2)",
            margin: "6px 0 22px",
            lineHeight: 1.45,
            fontWeight: 500,
          }}
        >
          {subtitle}
        </p>
        {children}
      </div>
    </div>
  );
}

export function Field({
  label,
  type,
  value,
  onChange,
  autoFocus,
  hint,
}: {
  label: string;
  type: "email" | "password" | "text";
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  hint?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        required
        style={{
          height: 42,
          padding: "0 14px",
          border: "1px solid var(--hair)",
          borderRadius: 10,
          background: "var(--surface)",
          fontSize: 14,
          fontWeight: 500,
          outline: "none",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--orange)";
          e.currentTarget.style.boxShadow = "0 0 0 4px rgba(226,88,34,0.10)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--hair)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
      {hint && (
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{hint}</span>
      )}
    </label>
  );
}

export function PrimaryButton({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      style={{
        height: 46,
        marginTop: 6,
        background: disabled ? "var(--orange-soft)" : "var(--orange)",
        color: disabled ? "var(--orange-d)" : "#fff",
        border: "none",
        borderRadius: 12,
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: "-0.005em",
        boxShadow: disabled ? "none" : "0 8px 20px -10px rgba(226,88,34,0.45)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        color: "var(--red)",
        background: "var(--red-soft)",
        border: "1px solid var(--red)",
        borderRadius: 10,
        padding: "10px 12px",
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  );
}

export function SwitchLink({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        textAlign: "center",
        marginTop: 18,
        fontSize: 13.5,
        color: "var(--muted)",
      }}
    >
      {children}
    </div>
  );
}
