import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { PublicWidgetResponse } from "@warmly/api-spec";
import { ButlerSays } from "../components/Butler";
import FormShell from "../components/FormShell";
import { api, ApiError } from "../lib/api";
import { buildWaUrl, renderMessage, SKIP_FALLBACK_MESSAGE } from "../lib/wa-message";

export default function PublicForm() {
  const { slug } = useParams<{ slug: string }>();
  const [config, setConfig] = useState<PublicWidgetResponse | null>(null);
  // PAYWALL DISABLED — the previous version surfaced 402 from the public
  // endpoint as a "this form isn't live yet" page. With the server-side
  // gate removed there's no 402 to handle; only 404 / generic error
  // remain. Re-enable by reverting this commit.
  const [status, setStatus] = useState<
    "loading" | "ok" | "not-found" | "error"
  >("loading");

  useEffect(() => {
    if (!slug) return;
    setStatus("loading");
    api<PublicWidgetResponse>(`/widgets/public/${encodeURIComponent(slug)}`)
      .then((res) => {
        setConfig(res);
        setStatus("ok");
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setStatus("not-found");
        } else {
          setStatus("error");
        }
      });
  }, [slug]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--cream)",
        display: "grid",
        placeItems: "center",
        padding: "clamp(16px, 4vw, 32px) clamp(12px, 4vw, 16px)",
      }}
    >
      {status === "loading" && <Centered>Loading…</Centered>}

      {status === "not-found" && (
        <div
          style={{
            width: "100%",
            maxWidth: 460,
            background: "var(--surface)",
            border: "1px solid var(--hair-2)",
            borderRadius: 20,
            boxShadow: "var(--shadow-md)",
            padding: "28px 24px 28px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <ButlerSays layout="column" size={120} bubbleMaxWidth={400}>
            I do beg Master's pardon, but this establishment appears to be… unavailable.
          </ButlerSays>
        </div>
      )}

      {status === "error" && (
        <PageMessage
          title="Something went wrong"
          body="We couldn't load this form. Try refreshing in a moment."
        />
      )}

      {status === "ok" && config && !config.active && (
        <PageMessage
          title="Currently not taking enquiries"
          body="This form has been paused. Check back later."
        />
      )}

      {status === "ok" && config && config.active && (
        <FormShell
          questions={config.questions}
          messageTemplate={config.messageTemplate}
          brandingEnabled={config.brandingEnabled}
          onComplete={(picks) => {
            const message = renderMessage(config.messageTemplate, config.questions, picks);
            window.location.assign(buildWaUrl(config.whatsappNumber, message));
          }}
          onSkip={() => {
            window.location.assign(buildWaUrl(config.whatsappNumber, SKIP_FALLBACK_MESSAGE));
          }}
        />
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: "var(--muted)", fontSize: 14 }}>{children}</div>
  );
}

function PageMessage({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 460,
        background: "var(--surface)",
        border: "1px solid var(--hair-2)",
        borderRadius: 20,
        boxShadow: "var(--shadow-md)",
        padding: "32px 32px 28px",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: 24,
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
          margin: "10px 0 0",
          lineHeight: 1.45,
          fontWeight: 500,
        }}
      >
        {body}
      </p>
    </div>
  );
}
