import { clearToken, getToken } from "./auth";

const BASE = (import.meta.env["VITE_API_URL"] ?? "http://localhost:3000").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

interface RequestOpts {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

export async function api<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = "GET", body, auth = false } = opts;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (!token) {
      // No token where one is required — surface as 401 so callers handle uniformly.
      handleAuthFailure();
      throw new ApiError(401, "Not authenticated", null);
    }
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && auth) handleAuthFailure();
    const message =
      typeof parsed === "object" && parsed !== null && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : `Request failed with ${res.status}`;
    throw new ApiError(res.status, message, parsed);
  }

  return parsed as T;
}

function handleAuthFailure(): void {
  clearToken();
  // Avoid bouncing a public form route into /login. Public routes live under /m/.
  if (!window.location.pathname.startsWith("/m/")) {
    window.location.assign("/login");
  }
}
