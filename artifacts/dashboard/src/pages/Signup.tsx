import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { AuthResponse } from "@warmly/api-spec";
import { ReggieSays } from "../components/Reggie";
import { api, ApiError } from "../lib/api";
import { setToken } from "../lib/auth";
import { AuthShell, ErrorText, Field, PrimaryButton, SwitchLink } from "./Login";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const fromApp = new URLSearchParams(loc.search).get("from") === "app";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await api<AuthResponse>("/auth/signup", {
        method: "POST",
        body: { email, password },
      });
      setToken(res.token);
      nav("/app", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  if (fromApp) {
    return (
      <ReggieSignup
        email={email}
        password={password}
        error={error}
        pending={pending}
        onEmail={setEmail}
        onPassword={setPassword}
        onSubmit={onSubmit}
      />
    );
  }

  return (
    <AuthShell title="Create your account" subtitle="Set up your form in minutes.">
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
        <Field label="Email" type="email" value={email} onChange={setEmail} autoFocus />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          hint="At least 8 characters."
        />
        {error && <ErrorText>{error}</ErrorText>}
        <PrimaryButton disabled={pending}>{pending ? "Creating…" : "Create account"}</PrimaryButton>
      </form>
      <SwitchLink>
        Already have an account? <Link to="/login">Sign in</Link>
      </SwitchLink>
    </AuthShell>
  );
}

function ReggieSignup({
  email,
  password,
  error,
  pending,
  onEmail,
  onPassword,
  onSubmit,
}: {
  email: string;
  password: string;
  error: string | null;
  pending: boolean;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--cream)",
        display: "grid",
        placeItems: "center",
        padding: "32px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          display: "grid",
          gap: 22,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center" }}>
          <ReggieSays layout="column" size={140} bubbleMaxWidth={460}>
            Reginald Bartholomew Pemberton, at Master's service. Reggie, when one is among
            friends. Master has built something rather splendid. Shall we put it on the door?
          </ReggieSays>
        </div>

        <p
          style={{
            fontSize: 15.5,
            color: "var(--ink-2)",
            margin: 0,
            lineHeight: 1.55,
            fontWeight: 500,
            textAlign: "center",
          }}
        >
          Make an account so we can save your work and put your form live. We won't charge you
          straight away. Don't panic, you cheapskate. There's a 3-day free trial so you can make
          sure our product doesn't suck.
        </p>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--hair-2)",
            borderRadius: 18,
            boxShadow: "var(--shadow-md)",
            padding: "26px 28px 24px",
          }}
        >
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
            <Field label="Email" type="email" value={email} onChange={onEmail} autoFocus />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={onPassword}
              hint="At least 8 characters."
            />
            {error && <ErrorText>{error}</ErrorText>}
            <PrimaryButton disabled={pending}>
              {pending ? "Creating…" : "Create account"}
            </PrimaryButton>
          </form>
          <SwitchLink>
            Already have an account? <Link to="/login">Sign in</Link>
          </SwitchLink>
        </div>
      </div>
    </div>
  );
}
