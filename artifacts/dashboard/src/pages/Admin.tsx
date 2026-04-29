import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AdminUserRow } from "@warmly/api-spec";
import { api, ApiError } from "../lib/api";
import { clearToken } from "../lib/auth";
import { relativeTime } from "../lib/relative-time";

const COLUMNS = "minmax(220px, 1.3fr) minmax(110px, 0.7fr) minmax(180px, 1fr) minmax(110px, 0.6fr) minmax(110px, 0.6fr) minmax(140px, 0.8fr)";

export default function Admin() {
  const nav = useNavigate();
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    api<AdminUserRow[]>("/admin/users", { auth: true })
      .then((data) => {
        setRows(data);
        setStatus("ok");
      })
      .catch((err: unknown) => {
        // Server is the source of truth for the admin allowlist; a 403
        // here means the logged-in user isn't on it. Bounce them to /app.
        if (err instanceof ApiError && err.status === 403) {
          nav("/app", { replace: true });
          return;
        }
        setStatus("error");
      });
  }, [nav]);

  function logout() {
    clearToken();
    nav("/login");
  }

  if (status === "loading") {
    return <CenterMessage tone="muted">Loading…</CenterMessage>;
  }
  if (status === "error" || !rows) {
    return <CenterMessage tone="error">Could not load admin data.</CenterMessage>;
  }

  const totalUsers = rows.length;
  const activeWidgets = rows.filter((r: AdminUserRow) => r.widget !== null && r.widget.active).length;

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

      <div style={{ padding: "22px 28px 28px" }}>
        <div style={{ marginBottom: 16 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Admin
          </h1>
          <p
            style={{
              fontSize: 13.5,
              color: "var(--muted)",
              margin: "4px 0 0",
              fontWeight: 500,
            }}
          >
            Operator overview.
          </p>
        </div>

        <UserTable rows={rows} />

        <div
          style={{
            marginTop: 14,
            fontSize: 12.5,
            color: "var(--muted)",
            fontWeight: 500,
          }}
        >
          {totalUsers} {totalUsers === 1 ? "user" : "users"} total ·{" "}
          {activeWidgets} active {activeWidgets === 1 ? "widget" : "widgets"} ·{" "}
          <span style={{ opacity: 0.45 }}>0</span> form submissions
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
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            background: "var(--ink)",
            color: "var(--cream)",
            padding: "3px 8px",
            borderRadius: 6,
          }}
        >
          Admin
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

function UserTable({ rows }: { rows: AdminUserRow[] }) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--hair)",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: COLUMNS,
          background: "var(--cream)",
          padding: "10px 16px",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--muted)",
          borderBottom: "1px solid var(--hair)",
        }}
      >
        <span>Email</span>
        <span>Joined</span>
        <span>Slug</span>
        <span>Number set?</span>
        <span>Status</span>
        <span>Last activity</span>
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            padding: "20px 16px",
            textAlign: "center",
            color: "var(--muted)",
            fontSize: 13,
          }}
        >
          No users yet.
        </div>
      ) : (
        rows.map((r: AdminUserRow, i: number) => (
          <div
            key={r.id}
            style={{
              display: "grid",
              gridTemplateColumns: COLUMNS,
              padding: "12px 16px",
              fontSize: 13,
              borderBottom:
                i === rows.length - 1 ? "none" : "1px solid var(--hair-2)",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontWeight: 500,
                color: "var(--ink)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={r.email}
            >
              {r.email}
            </span>
            <span style={{ color: "var(--ink-2)" }}>{relativeTime(r.createdAt)}</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: r.widget ? "var(--ink-2)" : "var(--muted-2)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={r.widget?.slug ?? ""}
            >
              {r.widget ? r.widget.slug : "·"}
            </span>
            <span style={{ color: "var(--ink-2)" }}>
              {r.widget ? (r.widget.whatsappNumber.length > 0 ? "Yes" : "No") : "·"}
            </span>
            <StatusPill widget={r.widget} />
            <span style={{ color: "var(--ink-2)" }}>
              {r.widget ? relativeTime(r.widget.updatedAt) : "·"}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function StatusPill({ widget }: { widget: AdminUserRow["widget"] }) {
  if (!widget) {
    return (
      <span style={{ color: "var(--muted-2)", fontSize: 12.5, fontWeight: 500 }}>
        No widget
      </span>
    );
  }
  if (widget.active) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12.5,
          fontWeight: 500,
          color: "var(--ink-2)",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 99,
            background: "var(--green)",
            boxShadow: "0 0 0 3px rgba(37,211,102,0.18)",
          }}
        />
        Live
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12.5,
        fontWeight: 500,
        color: "var(--ink-2)",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 99,
          background: "var(--muted-2)",
        }}
      />
      Paused
    </span>
  );
}

function CenterMessage({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "muted" | "error";
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--cream)",
        display: "grid",
        placeItems: "center",
        color: tone === "error" ? "var(--red)" : "var(--muted)",
        fontSize: 14,
      }}
    >
      {children}
    </div>
  );
}
