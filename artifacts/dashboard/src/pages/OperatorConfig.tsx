import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type {
  Answer,
  ButtonPosition,
  MeResponse,
  Question,
  StripeRedirectResponse,
  WidgetResponse,
} from "@warmly/api-spec";
import { CreateWidgetRequestSchema, SlugSchema, WhatsAppNumberSchema } from "@warmly/api-spec";
import FormShell from "../components/FormShell";
import WhatsAppOutput from "../components/WhatsAppOutput";
import { useMatchesQuery } from "../hooks/useMatchesQuery";
import { api, ApiError } from "../lib/api";
import { clearToken } from "../lib/auth";
import { renderMessage } from "../lib/wa-message";

interface DraftWidget {
  slug: string;
  whatsappNumber: string;
  questions: Question[];
  messageTemplate: string;
  buttonColour: string;
  buttonPosition: ButtonPosition;
  brandingEnabled: boolean;
}

// Starter template shown on first /app load. The slug is generated per-user
// at component init (see buildStarter) so two new signups don't collide on
// the same default. The message template uses three full sentences instead
// of conjunctions so it reads cleanly regardless of how the snippets start.
const STARTER_BASE: Omit<DraftWidget, "slug"> = {
  whatsappNumber: "",
  questions: [
    {
      text: "What's pulling you toward functional fitness?",
      answers: [
        { text: "Get stronger, fitter, healthier", snippet: "get stronger, fitter, healthier" },
        { text: "Make new mates, be part of something", snippet: "find a community and make new mates" },
        { text: "Honestly? Just want to look better naked", snippet: "honestly, just look and feel better" },
      ],
    },
    {
      text: "What's the worry?",
      answers: [
        { text: "Worried about getting injured", snippet: "I'm worried about getting injured" },
        { text: "Don't think I'm fit enough yet", snippet: "I'm not sure I'm fit enough yet" },
        { text: "Total beginner, won't know what I'm doing", snippet: "I'm a total beginner and won't know what I'm doing" },
      ],
    },
    {
      text: "What would help you most?",
      answers: [
        { text: "Need someone to ease me in", snippet: "I need someone to ease me in" },
        { text: "Want a proper structured plan", snippet: "I want a proper structured plan" },
        { text: "Just need accountability and a kick", snippet: "I just need accountability and a kick" },
      ],
    },
  ],
  messageTemplate: "Hi! I'd like to {q1}. {q2}. {q3}.",
  buttonColour: "#25D366",
  buttonPosition: "bottom-right",
  brandingEnabled: true,
};

function randomSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += chars[bytes[i]! % chars.length];
  }
  return out;
}

function buildStarter(): DraftWidget {
  return { ...STARTER_BASE, slug: randomSlug() };
}

function fromResponse(w: WidgetResponse): DraftWidget {
  return {
    slug: w.slug,
    whatsappNumber: w.whatsappNumber,
    questions: w.questions,
    messageTemplate: w.messageTemplate,
    buttonColour: w.buttonColour,
    buttonPosition: w.buttonPosition,
    brandingEnabled: w.brandingEnabled,
  };
}

// Fallback for browsers / contexts without async clipboard (e.g. http://
// origins that aren't localhost). Uses execCommand which is deprecated but
// still widely supported and works in non-secure contexts.
function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
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

type PreviewStep = "q1" | "q2" | "q3" | "out";

export default function OperatorConfig() {
  const nav = useNavigate();
  const loc = useLocation();
  const isMobile = useMatchesQuery("(max-width: 960px)");
  // isNarrow drives the deeper mobile treatment: BrandStrip fields stack,
  // answer rows stack inside a card with the snippet labelled, and the
  // header action buttons move into a fixed bottom bar so they're always
  // tappable while scrolling.
  const isNarrow = useMatchesQuery("(max-width: 720px)");

  const [existing, setExisting] = useState<WidgetResponse | null>(null);
  const [draft, setDraft] = useState<DraftWidget>(() => buildStarter());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [slugTaken, setSlugTaken] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [previewStep, setPreviewStep] = useState<PreviewStep>("q2");
  // Default to Preview so first-time users see what the form does before
  // editing. Returning users get flipped to Edit once the load completes
  // and existing turns out to be non-null. The didInitTab ref makes that
  // flip a one-shot — anything the user taps after never gets overridden.
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("preview");
  const didInitTab = useRef(false);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<number | null>(null);

  // Billing state. me is null until /me resolves; treat unknown as
  // "preview mode" (banner shown, copy gated) to be safe.
  const [me, setMe] = useState<MeResponse | null>(null);
  const isPaid = me?.isPaid ?? false;

  // Success banner shown briefly after returning from Stripe Checkout via
  // ?upgrade=success. The query param is stripped from the URL after read
  // so a refresh doesn't re-show it.
  const [showUpgradeSuccess, setShowUpgradeSuccess] = useState(false);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current != null) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  function refetchMe(): Promise<void> {
    return api<MeResponse>("/me", { auth: true })
      .then((m) => setMe(m))
      .catch(() => undefined);
  }

  useEffect(() => {
    refetchMe();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(loc.search);
    if (params.get("upgrade") === "success") {
      setShowUpgradeSuccess(true);
      // Clean the URL so a refresh doesn't re-show the banner.
      window.history.replaceState({}, "", loc.pathname);
      // Webhook may take a beat to land — refetch /me a couple of times so
      // the upgrade banner clears and the Copy button unlocks soon after.
      refetchMe();
      const t1 = window.setTimeout(refetchMe, 2000);
      const t2 = window.setTimeout(refetchMe, 6000);
      const t3 = window.setTimeout(() => setShowUpgradeSuccess(false), 8000);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        window.clearTimeout(t3);
      };
    }
    return undefined;
  }, [loc.search, loc.pathname]);

  useEffect(() => {
    api<WidgetResponse>("/widgets/me", { auth: true })
      .then((res) => {
        setExisting(res);
        setDraft(fromResponse(res));
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          // No widget yet — keep the starter draft and show the banner.
          return;
        }
        // Other errors fall through; saveError covers user-actionable messaging.
      })
      .finally(() => setLoading(false));
  }, []);

  // One-shot tab init: once loading completes, returning users (existing
  // widget on file) jump to Edit. First-time users keep the Preview
  // default. Guarded by a ref so subsequent saves (which set existing
  // from null to non-null) don't yank an editing user back to Preview.
  useEffect(() => {
    if (loading) return;
    if (didInitTab.current) return;
    didInitTab.current = true;
    if (existing) setMobileTab("edit");
  }, [loading, existing]);

  const dirty = useMemo(() => {
    if (!existing) return true;
    return JSON.stringify(draft) !== JSON.stringify(fromResponse(existing));
  }, [draft, existing]);

  const validation = useMemo(() => {
    return CreateWidgetRequestSchema.safeParse(draft);
  }, [draft]);

  const canSave = dirty && validation.success && !saving;

  async function save() {
    if (!validation.success) return;
    setSaving(true);
    setSaveError(null);
    setSlugTaken(false);
    try {
      const payload = validation.data;
      const res = existing
        ? await api<WidgetResponse>("/widgets/me", { method: "PUT", body: payload, auth: true })
        : await api<WidgetResponse>("/widgets/me", { method: "POST", body: payload, auth: true });
      setExisting(res);
      setDraft(fromResponse(res));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        if (/slug/i.test(err.message)) setSlugTaken(true);
        setSaveError(err.message);
      } else if (err instanceof ApiError) {
        setSaveError(err.message);
      } else {
        setSaveError("Could not save. Try again in a moment.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function togglePause() {
    if (!existing) return;
    if (existing.active) {
      setShowPauseModal(true);
      return;
    }
    try {
      const res = await api<WidgetResponse>("/widgets/me", {
        method: "PATCH",
        body: { active: true },
        auth: true,
      });
      setExisting(res);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not reactivate");
    }
  }

  async function confirmPause() {
    setShowPauseModal(false);
    try {
      const res = await api<WidgetResponse>("/widgets/me", {
        method: "PATCH",
        body: { active: false },
        auth: true,
      });
      setExisting(res);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not pause");
    }
  }

  async function copyPublicLink() {
    if (!draft.slug) return;
    // First-time publish path: unpaid users get bounced to /app/upgrade
    // instead of seeing a copy that won't actually serve a live form.
    if (!isPaid) {
      nav("/app/upgrade");
      return;
    }
    const url = `${window.location.origin}/m/${draft.slug}`;

    let ok = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        ok = true;
      } catch {
        ok = legacyCopy(url);
      }
    } else {
      ok = legacyCopy(url);
    }
    if (!ok) return;

    if (copiedTimerRef.current != null) {
      window.clearTimeout(copiedTimerRef.current);
    }
    setCopied(true);
    copiedTimerRef.current = window.setTimeout(() => {
      setCopied(false);
      copiedTimerRef.current = null;
    }, 2000);
  }

  async function openBillingPortal() {
    try {
      const res = await api<StripeRedirectResponse>("/billing/create-portal-session", {
        method: "POST",
        body: { returnUrl: `${window.location.origin}/app` },
        auth: true,
      });
      window.location.assign(res.url);
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : "Could not open billing portal",
      );
    }
  }

  function logout() {
    clearToken();
    nav("/login");
  }

  // Inline helper (not a React component) — returns the Copy/Save action
  // pair as a fragment so it can be dropped into the desktop header
  // (stretched=false) and the mobile fixed bottom bar (stretched=true,
  // where each button takes equal width via flex: 1). Defined as a plain
  // function rather than a component so React doesn't see a new component
  // type on every parent render.
  function renderActionButtons(stretched: boolean) {
    return (
      <>
        <button
          type="button"
          onClick={copyPublicLink}
          disabled={!draft.slug}
          aria-live="polite"
          style={{
            height: 40,
            padding: "0 16px",
            borderRadius: 12,
            background: copied ? "var(--cream)" : "transparent",
            border: copied ? "1px solid var(--green)" : "1px solid var(--hair)",
            color: copied ? "var(--green-d)" : "var(--ink-2)",
            fontSize: 13.5,
            fontWeight: 600,
            opacity: draft.slug ? 1 : 0.5,
            cursor: draft.slug ? "pointer" : "not-allowed",
            transition: "background .15s, border-color .15s, color .15s",
            flex: stretched ? 1 : "none",
          }}
        >
          {copied ? "Copied" : "Copy public link"}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          style={{
            height: 40,
            padding: "0 18px",
            borderRadius: 12,
            background: canSave ? "var(--ink)" : "var(--cream-2)",
            color: canSave ? "var(--cream)" : "var(--muted)",
            border: "none",
            fontSize: 14,
            fontWeight: 600,
            cursor: canSave ? "pointer" : "not-allowed",
            flex: stretched ? 1 : "none",
          }}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: "var(--cream)",
          display: "grid",
          placeItems: "center",
          color: "var(--muted)",
          fontSize: 14,
        }}
      >
        Loading…
      </div>
    );
  }

  const previewMessage = renderMessage(
    draft.messageTemplate,
    draft.questions,
    draft.questions.map(() => 0),
  );

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--cream)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans)",
        overflowX: "hidden",
      }}
    >
      <TopBar onLogout={logout} />

      {/* Discreet "see it working" link. Lives only on /app — Upgrade and
          PublicForm pages are separate components and never render this. */}
      <div
        style={{
          background: "var(--blue-soft)",
          padding: isMobile ? "10px 16px" : "10px 28px",
          fontSize: 13,
          color: "var(--ink-2)",
          textAlign: "center",
          lineHeight: 1.5,
          fontWeight: 500,
        }}
      >
        Want to see one in the wild? Try mine:{" "}
        <a
          href="https://warmly.platespinner.studio/m/mgpt"
          target="_blank"
          rel="noopener noreferrer"
          onMouseEnter={(e) => {
            e.currentTarget.style.textDecoration = "underline";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.textDecoration = "none";
          }}
          style={{
            color: "var(--orange-d)",
            textDecoration: "none",
            fontWeight: 600,
            textUnderlineOffset: 3,
            wordBreak: "break-word",
          }}
        >
          warmly.platespinner.studio/m/mgpt
        </a>
      </div>

      <div
        style={{
          padding: isMobile ? "16px 16px 8px" : "22px 28px 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: isNarrow ? 18 : isMobile ? 20 : 24,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Your form
          </h1>
          <p
            style={{
              fontSize: isNarrow ? 12 : isMobile ? 13 : 13.5,
              color: "var(--muted)",
              margin: "4px 0 0",
              fontWeight: 500,
              lineHeight: 1.45,
            }}
          >
            Three questions, one link. Replace your WhatsApp button with this and leads arrive with a message ready to send.
          </p>
          {isMobile && (
            <p
              style={{
                fontSize: isNarrow ? 11 : 12,
                color: "var(--muted-2)",
                margin: "6px 0 0",
                fontWeight: 500,
              }}
            >
              Tap Edit and Preview tabs to switch.
            </p>
          )}
        </div>
        {!isNarrow && (
          <div style={{ display: "flex", gap: 10 }}>{renderActionButtons(false)}</div>
        )}
      </div>

      {!existing && (
        <div style={{ padding: isMobile ? "0 16px 8px" : "0 28px 8px" }}>
          <div
            style={{
              background: "var(--orange-tint)",
              border: "1px solid var(--orange-soft)",
              borderRadius: 12,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: "var(--orange)",
                color: "#fff",
                padding: "3px 8px",
                borderRadius: 6,
              }}
            >
              Starter template
            </span>
            <span style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 500 }}>
              Edit and save when ready.
            </span>
          </div>
        </div>
      )}

      {showUpgradeSuccess && (
        <div style={{ padding: isMobile ? "0 16px 8px" : "0 28px 8px" }}>
          <div
            style={{
              background: "rgba(37, 211, 102, 0.12)",
              border: "1px solid var(--green)",
              borderRadius: 12,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--ink-2)",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: "var(--green)",
                color: "#fff",
                padding: "3px 8px",
                borderRadius: 6,
              }}
            >
              You're live
            </span>
            <span>Share your link wherever your WhatsApp button goes.</span>
          </div>
        </div>
      )}

      {me && !isPaid && !showUpgradeSuccess && (
        <div style={{ padding: isMobile ? "0 16px 8px" : "0 28px 8px" }}>
          <div
            style={{
              background: "var(--blue-soft)",
              border: "1px solid var(--blue)",
              borderRadius: 12,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--ink-2)",
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: "var(--ink)",
                color: "var(--cream)",
                padding: "3px 8px",
                borderRadius: 6,
              }}
            >
              Preview mode
            </span>
            <span style={{ flex: 1, minWidth: 160 }}>
              Form is in preview. Upgrade to make it live.
            </span>
            <button
              type="button"
              onClick={() => nav("/app/upgrade")}
              style={{
                height: 32,
                padding: "0 12px",
                borderRadius: 8,
                background: "var(--orange)",
                color: "#fff",
                border: "none",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Upgrade →
            </button>
          </div>
        </div>
      )}

      {saveError && (
        <div style={{ padding: isMobile ? "0 16px 8px" : "0 28px 8px" }}>
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
            {saveError}
          </div>
        </div>
      )}

      {isMobile && (
        <div
          style={{
            padding: "8px 16px 0",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
          }}
        >
          {(["edit", "preview"] as const).map((t) => {
            const on = mobileTab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setMobileTab(t)}
                style={{
                  textAlign: "center",
                  padding: "10px 0",
                  borderRadius: 10,
                  background: on ? "var(--ink)" : "transparent",
                  color: on ? "var(--cream)" : "var(--ink-2)",
                  border: on ? "none" : "1px solid var(--hair)",
                  fontSize: 13.5,
                  fontWeight: 600,
                }}
              >
                {t === "edit" ? "Edit" : "Preview"}
              </button>
            );
          })}
        </div>
      )}

      <div
        style={{
          flex: 1,
          padding: isNarrow
            ? "12px 16px 96px"
            : isMobile
              ? "12px 16px 28px"
              : "12px 28px 28px",
          display: "grid",
          gridTemplateColumns: isMobile
            ? "minmax(0, 1fr)"
            : "minmax(0, 1.45fr) minmax(0, 0.95fr)",
          gap: isMobile ? 16 : 22,
          alignItems: "start",
        }}
      >
        {(!isMobile || mobileTab === "edit") && (
          <EditColumn
            draft={draft}
            setDraft={setDraft}
            existing={existing}
            slugTaken={slugTaken}
            setSlugTaken={setSlugTaken}
            onTogglePause={togglePause}
            isNarrow={isNarrow}
            isPaid={isPaid}
            onManageBilling={openBillingPortal}
          />
        )}
        {(!isMobile || mobileTab === "preview") && (
          <PreviewColumn
            draft={draft}
            previewStep={previewStep}
            setPreviewStep={setPreviewStep}
            previewMessage={previewMessage}
          />
        )}
      </div>

      {isNarrow && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            background: "var(--surface)",
            borderTop: "1px solid var(--hair)",
            padding: "12px 16px",
            paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
            display: "flex",
            gap: 10,
            boxShadow: "0 -4px 20px -8px rgba(42,37,32,0.12)",
            zIndex: 5,
          }}
        >
          {renderActionButtons(true)}
        </div>
      )}

      {showPauseModal && (
        <PauseModal onCancel={() => setShowPauseModal(false)} onConfirm={confirmPause} />
      )}
    </div>
  );
}

// ── TopBar ─────────────────────────────────────────────────────────────────

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
        gap: 18,
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
        <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: "-0.01em" }}>Warmly</span>
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

// ── Edit column ────────────────────────────────────────────────────────────

function EditColumn({
  draft,
  setDraft,
  existing,
  slugTaken,
  setSlugTaken,
  onTogglePause,
  isNarrow,
  isPaid,
  onManageBilling,
}: {
  draft: DraftWidget;
  setDraft: (d: DraftWidget | ((prev: DraftWidget) => DraftWidget)) => void;
  existing: WidgetResponse | null;
  slugTaken: boolean;
  setSlugTaken: (b: boolean) => void;
  onTogglePause: () => void;
  isNarrow: boolean;
  isPaid: boolean;
  onManageBilling: () => void;
}) {
  const slugValid = SlugSchema.safeParse(draft.slug).success;
  const numberValid = WhatsAppNumberSchema.safeParse(draft.whatsappNumber).success;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        gap: 16,
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--hair)",
          borderRadius: 14,
          padding: isNarrow ? "16px 16px" : "18px 22px",
          display: "grid",
          // minmax(0, 1fr) lets columns shrink below their min-content
          // (otherwise inputs with default size=20 force ~200px columns
          // and overflow the card at narrow widths).
          gridTemplateColumns: isNarrow
            ? "minmax(0, 1fr)"
            : "minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 0.9fr)",
          gap: isNarrow ? 14 : 24,
          alignItems: "start",
        }}
      >
        <div>
          <Label>WhatsApp number</Label>
          <Input
            value={draft.whatsappNumber}
            placeholder="+447700900000"
            mono
            onChange={(v) => setDraft((d) => ({ ...d, whatsappNumber: v }))}
            invalid={!numberValid && draft.whatsappNumber.length > 0}
          />
          <Hint>{numberValid ? " " : "International format, e.g. +447700900000"}</Hint>
        </div>
        <div>
          <Label>Public link</Label>
          <Input
            prefix={`${window.location.host}/m/`}
            value={draft.slug}
            placeholder="your-business"
            mono
            onChange={(v) => {
              setSlugTaken(false);
              setDraft((d) => ({ ...d, slug: v.toLowerCase() }));
            }}
            invalid={(slugTaken || (!slugValid && draft.slug.length > 0))}
          />
          <SlugStatus slug={draft.slug} valid={slugValid} taken={slugTaken} />
        </div>
        <div>
          <Label>Form status</Label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              height: 42,
              padding: "0 14px",
              border: "1px solid var(--hair)",
              borderRadius: 10,
              background: "var(--cream)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 99,
                background: existing?.active === false ? "var(--muted-2)" : "var(--green)",
                boxShadow:
                  existing?.active === false
                    ? "none"
                    : "0 0 0 3px rgba(37,211,102,0.18)",
              }}
            />
            <span style={{ fontSize: 13.5, fontWeight: 500 }}>
              {existing?.active === false ? "Paused" : "Live"}
            </span>
            <span style={{ flex: 1 }} />
            {existing && (
              <button
                type="button"
                onClick={onTogglePause}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--ink-2)",
                  background: "transparent",
                  border: "none",
                  textDecoration: "underline",
                  textUnderlineOffset: 3,
                  cursor: "pointer",
                }}
              >
                {existing.active === false ? "Reactivate" : "Pause"}
              </button>
            )}
          </div>
        </div>
      </div>

      {draft.questions.map((q: Question, qi: number) => (
        <QuestionBuilder
          key={qi}
          num={qi + 1}
          q={q}
          isNarrow={isNarrow}
          canRemove={draft.questions.length > 1}
          onChange={(next) =>
            setDraft((d) => {
              const qs = [...d.questions];
              qs[qi] = next;
              return { ...d, questions: qs };
            })
          }
          onRemove={() =>
            setDraft((d) => ({
              ...d,
              questions: d.questions.filter((_: Question, i: number) => i !== qi),
            }))
          }
          onMove={(dir) =>
            setDraft((d) => {
              const qs = [...d.questions];
              const target = qi + dir;
              if (target < 0 || target >= qs.length) return d;
              const [moved] = qs.splice(qi, 1);
              if (!moved) return d;
              qs.splice(target, 0, moved);
              return { ...d, questions: qs };
            })
          }
        />
      ))}

      {draft.questions.length < 5 && (
        <button
          type="button"
          onClick={() =>
            setDraft((d) => ({
              ...d,
              questions: [
                ...d.questions,
                {
                  text: "New question",
                  answers: [
                    { text: "Option A", snippet: "option a" },
                    { text: "Option B", snippet: "option b" },
                  ],
                },
              ],
            }))
          }
          style={{
            height: 44,
            borderRadius: 12,
            background: "transparent",
            border: "1px dashed var(--muted-2)",
            color: "var(--ink-2)",
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          + Add question
        </button>
      )}

      <MessageTemplateEditor
        value={draft.messageTemplate}
        onChange={(v) => setDraft((d) => ({ ...d, messageTemplate: v }))}
        questionCount={draft.questions.length}
      />

      <StyleControls
        colour={draft.buttonColour}
        position={draft.buttonPosition}
        onColour={(c) => setDraft((d) => ({ ...d, buttonColour: c }))}
        onPosition={(p) => setDraft((d) => ({ ...d, buttonPosition: p }))}
        isNarrow={isNarrow}
      />

      {isPaid && (
        <div
          style={{
            textAlign: "right",
            paddingTop: 4,
          }}
        >
          <button
            type="button"
            onClick={onManageBilling}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 3,
              padding: 4,
            }}
          >
            Manage billing
          </button>
        </div>
      )}
    </div>
  );
}

// ── Preview column ─────────────────────────────────────────────────────────

function PreviewColumn({
  draft,
  previewStep,
  setPreviewStep,
  previewMessage,
}: {
  draft: DraftWidget;
  previewStep: PreviewStep;
  setPreviewStep: (s: PreviewStep) => void;
  previewMessage: string;
}) {
  const isNarrow = useMatchesQuery("(max-width: 720px)");
  const isOutput = previewStep === "out";
  const stepIdx =
    previewStep === "q1" ? 0 : previewStep === "q2" ? 1 : previewStep === "q3" ? 2 : 0;
  // Clamp to actual question count so "Q3" doesn't crash on a 1-question draft.
  const safeStep = Math.min(stepIdx, Math.max(0, draft.questions.length - 1));

  return (
    <div
      style={{
        background: "var(--cream)",
        borderRadius: 18,
        border: "1px solid var(--hair)",
        padding: 18,
        position: "sticky",
        top: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <Label>Live preview</Label>
      <Stepper active={previewStep} onChange={setPreviewStep} questionCount={draft.questions.length} />
      <div
        style={{
          border: "1px solid var(--hair)",
          borderRadius: 14,
          padding: "24px 14px",
          background: "var(--cream-2)",
          display: "grid",
          placeItems: "center",
          minHeight: 540,
          position: "relative",
        }}
      >
        {!isOutput ? (
          draft.questions.length > 0 ? (
            // Without an explicit width here, FormShell's `width: 100%`
            // resolves against an unconstrained parent and ends up at its
            // 520px maxWidth — wider than the preview cell and the
            // viewport. The scale transform doesn't change layout box
            // size, so the oversized wrapper would push body scrollWidth
            // past the viewport. width:100%+maxWidth ties the wrapper to
            // its grid cell. On narrow we skip the 0.78 scale entirely;
            // the FormShell already fits the preview at its natural
            // mobile sizing.
            <div
              style={{
                width: "100%",
                maxWidth: 520,
                transform: isNarrow ? "none" : "scale(0.78)",
                transformOrigin: "center center",
              }}
            >
              <FormShell
                questions={draft.questions}
                brandingEnabled={draft.brandingEnabled}
                onComplete={() => undefined}
                forcedStep={safeStep}
              />
            </div>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 13 }}>
              Add a question to see the preview.
            </div>
          )
        ) : (
          <WhatsAppOutput message={previewMessage} />
        )}
        {isOutput && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              background: "var(--ink)",
              color: "var(--cream)",
              fontSize: 10.5,
              fontWeight: 600,
              padding: "4px 8px",
              borderRadius: 6,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            WhatsApp output · default answers
          </div>
        )}
      </div>
    </div>
  );
}

function Stepper({
  active,
  onChange,
  questionCount,
}: {
  active: PreviewStep;
  onChange: (s: PreviewStep) => void;
  questionCount: number;
}) {
  const steps: { id: PreviewStep; label: string }[] = [
    { id: "q1", label: "Q1" },
    { id: "q2", label: "Q2" },
    { id: "q3", label: "Q3" },
    { id: "out", label: "Output" },
  ];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        background: "var(--surface)",
        border: "1px solid var(--hair)",
        borderRadius: 999,
        padding: 4,
        gap: 2,
        overflowX: "auto",
      }}
    >
      {steps.map((s, i) => {
        const on = s.id === active;
        const disabled = s.id !== "out" && i + 1 > questionCount;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => !disabled && onChange(s.id)}
            disabled={disabled}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              background: on ? "var(--orange)" : "transparent",
              color: on ? "#fff" : disabled ? "var(--muted-2)" : "var(--ink-2)",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: 99,
                background: on ? "rgba(255,255,255,0.25)" : "var(--cream-2)",
                color: on ? "#fff" : "var(--muted)",
                display: "grid",
                placeItems: "center",
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              {i + 1}
            </span>
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Question builder ───────────────────────────────────────────────────────

function QuestionBuilder({
  num,
  q,
  canRemove,
  onChange,
  onRemove,
  onMove,
  isNarrow,
}: {
  num: number;
  q: Question;
  canRemove: boolean;
  onChange: (q: Question) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  isNarrow: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--hair)",
        borderRadius: 16,
        padding: isNarrow ? "18px 16px" : 22,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 18,
          left: -12,
          width: 26,
          height: 26,
          borderRadius: 99,
          background: "var(--orange)",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {num}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          paddingLeft: 18,
        }}
      >
        <Label>Question {num}</Label>
        <div style={{ display: "flex", gap: 6 }}>
          <ChipBtn onClick={() => onMove(-1)}>↑</ChipBtn>
          <ChipBtn onClick={() => onMove(1)}>↓</ChipBtn>
          {canRemove && <ChipBtn onClick={onRemove}>Remove</ChipBtn>}
        </div>
      </div>
      <Input
        value={q.text}
        onChange={(v) => onChange({ ...q, text: v })}
        placeholder="What's the goal?"
        bigText
      />

      <div style={{ marginTop: 16 }}>
        {!isNarrow && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1.4fr) auto",
              gap: 10,
              padding: "0 6px 8px",
              fontSize: 11,
              color: "var(--muted)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            <span>Answer label</span>
            <span>Adds to message</span>
            <span />
          </div>
        )}
        <div style={{ display: "grid", gap: isNarrow ? 14 : 8 }}>
          {q.answers.map((a: Answer, ai: number) => {
            const labelInput = (
              <input
                value={a.text}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const next = [...q.answers];
                  next[ai] = { ...a, text: e.target.value };
                  onChange({ ...q, answers: next });
                }}
                style={{
                  height: 38,
                  border: "1px solid var(--hair)",
                  borderRadius: 10,
                  background: "var(--surface)",
                  padding: "0 12px",
                  fontSize: 13.5,
                  fontWeight: 500,
                  outline: "none",
                  width: "100%",
                }}
              />
            );
            const snippetInput = (
              <input
                value={a.snippet}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const next = [...q.answers];
                  next[ai] = { ...a, snippet: e.target.value };
                  onChange({ ...q, answers: next });
                }}
                style={{
                  height: 38,
                  border: "1px dashed var(--muted-2)",
                  borderRadius: 10,
                  background: "var(--cream)",
                  padding: "0 12px",
                  fontSize: 12.5,
                  fontFamily: "var(--font-mono)",
                  color: "var(--ink-2)",
                  outline: "none",
                  width: "100%",
                }}
              />
            );
            const removeBtn = (
              <button
                type="button"
                onClick={() => {
                  if (q.answers.length <= 2) return;
                  const next = q.answers.filter((_: Answer, i: number) => i !== ai);
                  onChange({ ...q, answers: next });
                }}
                disabled={q.answers.length <= 2}
                title={q.answers.length <= 2 ? "At least 2 answers required" : "Remove answer"}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "1px solid var(--hair)",
                  background: "var(--surface)",
                  color: "var(--muted)",
                  fontSize: 16,
                  cursor: q.answers.length <= 2 ? "not-allowed" : "pointer",
                  opacity: q.answers.length <= 2 ? 0.4 : 1,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            );

            if (isNarrow) {
              // Stack each answer's label above its snippet, with a small
              // sublabel between them. A 2px hair-coloured left border
              // visually pairs the two inputs as one answer.
              return (
                <div
                  key={ai}
                  style={{
                    borderLeft: "2px solid var(--hair-2)",
                    paddingLeft: 12,
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>{labelInput}</div>
                    {removeBtn}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                      marginTop: 2,
                    }}
                  >
                    Adds to message
                  </div>
                  {snippetInput}
                </div>
              );
            }

            return (
              <div
                key={ai}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1.4fr) auto",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                {labelInput}
                {snippetInput}
                {removeBtn}
              </div>
            );
          })}
        </div>
        {q.answers.length < 4 && (
          <button
            type="button"
            onClick={() =>
              onChange({
                ...q,
                answers: [...q.answers, { text: "New option", snippet: "new option" }],
              })
            }
            style={{
              marginTop: 12,
              height: 36,
              borderRadius: 10,
              padding: "0 14px",
              border: "1px dashed var(--muted-2)",
              background: "transparent",
              color: "var(--ink-2)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            + Add answer
          </button>
        )}
      </div>
    </div>
  );
}

// ── Message template ───────────────────────────────────────────────────────

function MessageTemplateEditor({
  value,
  onChange,
  questionCount,
}: {
  value: string;
  onChange: (v: string) => void;
  questionCount: number;
}) {
  const isNarrow = useMatchesQuery("(max-width: 720px)");
  const tokens = Array.from({ length: questionCount }, (_, i: number) => `{q${i + 1}}`);
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--hair)",
        borderRadius: 16,
        padding: isNarrow ? "18px 16px" : 22,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <Label>Message template</Label>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          Tokens:{" "}
          {tokens.map((t) => (
            <Token key={t}>{t}</Token>
          ))}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        rows={4}
        style={{
          width: "100%",
          border: "1px solid var(--hair)",
          borderRadius: 12,
          padding: 14,
          background: "var(--cream)",
          fontSize: 14,
          color: "var(--ink)",
          lineHeight: 1.6,
          fontFamily: "var(--font-sans)",
          fontWeight: 500,
          resize: "vertical",
          outline: "none",
        }}
      />
      <div
        style={{
          marginTop: 14,
          fontSize: 12,
          color: "var(--muted)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: 99,
            border: "1px solid var(--muted-2)",
            display: "grid",
            placeItems: "center",
            fontSize: 9,
            color: "var(--muted)",
            fontWeight: 600,
          }}
        >
          i
        </span>
        Tokens fill in with the lead's answer snippet. Output preview shows the final message.
      </div>
    </div>
  );
}

// ── Style controls ─────────────────────────────────────────────────────────

function StyleControls({
  colour,
  position,
  onColour,
  onPosition,
  isNarrow,
}: {
  colour: string;
  position: ButtonPosition;
  onColour: (c: string) => void;
  onPosition: (p: ButtonPosition) => void;
  isNarrow: boolean;
}) {
  const swatches = [
    { c: "#25D366", name: "WhatsApp" },
    { c: "#1A1A1A", name: "Ink" },
    { c: "#E25822", name: "Orange" },
  ];
  const positions: { id: ButtonPosition; label: string }[] = [
    { id: "bottom-right", label: "Bottom right" },
    { id: "bottom-left", label: "Bottom left" },
  ];
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--hair)",
        borderRadius: 16,
        padding: isNarrow ? "18px 16px" : 22,
        display: "grid",
        gridTemplateColumns: isNarrow ? "minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 1fr)",
        gap: 22,
      }}
    >
      <div>
        <Label>Button colour</Label>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {swatches.map((s) => {
            const on = s.c.toLowerCase() === colour.toLowerCase();
            return (
              <button
                key={s.c}
                type="button"
                onClick={() => onColour(s.c)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px 6px 6px",
                  borderRadius: 999,
                  border: on ? "2px solid var(--ink)" : "1px solid var(--hair)",
                  background: on ? "var(--cream)" : "var(--surface)",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    background: s.c,
                  }}
                />
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>{s.name}</span>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
          Green is recommended — leads recognise it.
        </div>
      </div>
      <div>
        <Label>Floating button position</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {positions.map((p) => {
            const on = p.id === position;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPosition(p.id)}
                style={{
                  border: on ? "2px solid var(--ink)" : "1px solid var(--hair)",
                  background: on ? "var(--cream)" : "var(--surface)",
                  borderRadius: 10,
                  padding: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: 42,
                    height: 30,
                    borderRadius: 4,
                    background: "var(--cream-2)",
                    border: "1px solid var(--hair)",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      bottom: 3,
                      [p.id === "bottom-right" ? "right" : "left"]: 3,
                      width: 11,
                      height: 11,
                      borderRadius: 99,
                      background: "var(--green)",
                    }}
                  />
                </div>
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Pause modal ────────────────────────────────────────────────────────────

function PauseModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26,26,26,0.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 10,
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        style={{
          width: "min(440px, calc(100vw - 32px))",
          background: "var(--surface)",
          borderRadius: 18,
          padding: "28px 28px 22px",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--hair-2)",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: "var(--blue-soft)",
            border: "1px solid var(--blue)",
            display: "grid",
            placeItems: "center",
            marginBottom: 16,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect x="6" y="5" width="4" height="14" rx="1" fill="var(--blue-d)" />
            <rect x="14" y="5" width="4" height="14" rx="1" fill="var(--blue-d)" />
          </svg>
        </div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            margin: "0 0 8px",
            letterSpacing: "-0.02em",
            color: "var(--ink)",
          }}
        >
          Pause your form?
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--ink-2)",
            margin: 0,
            lineHeight: 1.5,
            fontWeight: 500,
          }}
        >
          Your link will show{" "}
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              background: "var(--cream)",
              padding: "1px 6px",
              borderRadius: 4,
              border: "1px solid var(--hair)",
            }}
          >
            currently not taking enquiries
          </span>{" "}
          until you reactivate.
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              height: 42,
              padding: "0 18px",
              borderRadius: 12,
              background: "transparent",
              border: "1px solid var(--hair)",
              color: "var(--ink-2)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              height: 42,
              padding: "0 20px",
              borderRadius: 12,
              background: "var(--ink)",
              color: "var(--cream)",
              border: "none",
              fontSize: 14,
              fontWeight: 700,
              boxShadow: "0 6px 16px -8px rgba(26,26,26,0.4)",
            }}
          >
            Pause form
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Atoms ──────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  // Reduce ~9% on narrow viewports — uppercase labels feel oversized at
  // 11px on phones with the surrounding card padding tightened.
  const isNarrow = useMatchesQuery("(max-width: 720px)");
  return (
    <div
      style={{
        fontSize: isNarrow ? 10 : 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--muted)",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)", minHeight: 18 }}>
      {children}
    </div>
  );
}

function Token({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 12.5,
        fontWeight: 600,
        background: "var(--orange-soft)",
        color: "var(--orange-d)",
        padding: "2px 7px",
        borderRadius: 5,
        marginLeft: 4,
      }}
    >
      {children}
    </span>
  );
}

function ChipBtn({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 30,
        borderRadius: 8,
        padding: "0 12px",
        border: "1px solid var(--hair)",
        background: "transparent",
        color: "var(--muted)",
        fontSize: 12.5,
        fontWeight: 500,
      }}
    >
      {children}
    </button>
  );
}

function Input({
  value,
  prefix,
  mono,
  bigText,
  placeholder,
  invalid,
  onChange,
}: {
  value: string;
  prefix?: string;
  mono?: boolean;
  bigText?: boolean;
  placeholder?: string;
  invalid?: boolean;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const showRing = focused || invalid;
  const ringColour = invalid ? "var(--red)" : "var(--orange)";
  const ringShadow = invalid
    ? "0 0 0 4px rgba(184,83,66,0.10)"
    : "0 0 0 4px rgba(226,88,34,0.10)";
  return (
    <div
      style={{
        height: bigText ? 48 : 42,
        // Explicit width+minWidth so grid/flex parents don't size this
        // by intrinsic content (which would respect the inner <input>'s
        // ~200px min-content and overflow narrow viewports).
        width: "100%",
        minWidth: 0,
        border: showRing ? `2px solid ${ringColour}` : "1px solid var(--hair)",
        borderRadius: bigText ? 10 : 10,
        background: bigText ? "var(--cream)" : "var(--surface)",
        display: "flex",
        alignItems: "center",
        padding: showRing ? "0 13px" : "0 14px",
        gap: 4,
        fontSize: bigText ? 15.5 : 14,
        fontWeight: bigText ? 600 : 500,
        fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
        boxShadow: showRing ? ringShadow : "none",
      }}
    >
      {prefix && (
        <span
          style={{
            color: "var(--muted)",
            fontWeight: 400,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {prefix}
        </span>
      )}
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          minWidth: 0,
          width: "100%",
          border: "none",
          outline: "none",
          background: "transparent",
          color: "var(--ink)",
          fontSize: "inherit",
          fontWeight: "inherit",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}

function SlugStatus({
  slug,
  valid,
  taken,
}: {
  slug: string;
  valid: boolean;
  taken: boolean;
}) {
  if (!slug) return <Hint>Lowercase letters, digits, and hyphens.</Hint>;
  if (taken) {
    return (
      <div
        style={{
          marginTop: 6,
          fontSize: 12,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--red)",
        }}
      >
        <span
          style={{
            width: 14,
            height: 14,
            borderRadius: 99,
            background: "#E8C5BD",
            color: "#9A2E1E",
            display: "grid",
            placeItems: "center",
            fontSize: 9,
            fontWeight: 700,
          }}
        >
          !
        </span>
        Taken, try another
      </div>
    );
  }
  if (!valid) {
    return <Hint>Lowercase letters, digits, hyphens. 3–40 characters.</Hint>;
  }
  return (
    <div
      style={{
        marginTop: 6,
        fontSize: 12,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 6,
        color: "#1FAA52",
      }}
    >
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 99,
          background: "#25D366",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          fontSize: 9,
          fontWeight: 700,
        }}
      >
        ✓
      </span>
      Looks good
    </div>
  );
}
