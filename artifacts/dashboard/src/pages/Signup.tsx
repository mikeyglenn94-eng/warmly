import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { AuthResponse } from "@warmly/api-spec";
import { api, ApiError } from "../lib/api";
import { setToken } from "../lib/auth";
import { AuthShell, Field, PrimaryButton, ErrorText, SwitchLink } from "./Login";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const nav = useNavigate();

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
