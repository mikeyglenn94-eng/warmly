import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  ButtonPosition,
  Question,
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

const STARTER: DraftWidget = {
  slug: "",
  whatsappNumber: "",
  questions: [
    {
      text: "What's the goal?",
      answers: [
        { text: "Lose some weight", snippet: "lose some weight" },
        { text: "Build some muscle", snippet: "build some muscle" },
        { text: "Get fit again", snippet: "get fit again" },
      ],
    },
  ],
  messageTemplate: "Hi! I'd like to {q1}.",
  buttonColour: "#25D366",
  buttonPosition: "bottom-right",
  brandingEnabled: true,
};

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

type PreviewStep = "q1" | "q2" | "q3" | "out";

export default function OperatorConfig() {
  const nav = useNavigate();
  const isMobile = useMatchesQuery("(max-width: 960px)");

  const [existing, setExisting] = useState<WidgetResponse | null>(null);
  const [draft, setDraft] = useState<DraftWidget>(STARTER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [slugTaken, setSlugTaken] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [previewStep, setPreviewStep] = useState<PreviewStep>("q2");
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    api<WidgetResponse>("/widgets/me", { auth: true })
      .then((res) => {
        setExisting(res);
        setDraft(fromResponse(res));
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          // No widget yet — keep STARTER as the draft.
          return;
        }
        // Other errors fall through; saveError covers user-actionable messaging.
      })
      .finally(() => setLoading(false));
  }, []);

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

  function copyPublicLink() {
    if (!draft.slug) return;
    const url = `${window.location.origin}/m/${draft.slug}`;
    navigator.clipboard?.writeText(url).catch(() => undefined);
  }

  function logout() {
    clearToken();
    nav("/login");
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
      }}
    >
      <TopBar onLogout={logout} />

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
              fontSize: isMobile ? 20 : 24,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Your form
          </h1>
          <p
            style={{
              fontSize: isMobile ? 13 : 13.5,
              color: "var(--muted)",
              margin: "4px 0 0",
              fontWeight: 500,
            }}
          >
            {existing
              ? "Edit on the left, preview on the right."
              : "Set your number and slug, build your form, hit save."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={copyPublicLink}
            disabled={!draft.slug}
            style={{
              height: 40,
              padding: "0 16px",
              borderRadius: 12,
              background: "transparent",
              border: "1px solid var(--hair)",
              color: "var(--ink-2)",
              fontSize: 13.5,
              fontWeight: 600,
              opacity: draft.slug ? 1 : 0.5,
              cursor: draft.slug ? "pointer" : "not-allowed",
            }}
          >
            Copy public link
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
            }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

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
          padding: isMobile ? "12px 16px 28px" : "12px 28px 28px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.45fr 0.95fr",
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
}: {
  draft: DraftWidget;
  setDraft: (d: DraftWidget | ((prev: DraftWidget) => DraftWidget)) => void;
  existing: WidgetResponse | null;
  slugTaken: boolean;
  setSlugTaken: (b: boolean) => void;
  onTogglePause: () => void;
}) {
  const slugValid = SlugSchema.safeParse(draft.slug).success;
  const numberValid = WhatsAppNumberSchema.safeParse(draft.whatsappNumber).success;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--hair)",
          borderRadius: 14,
          padding: "18px 22px",
          display: "grid",
          gridTemplateColumns: "1fr 1.4fr 0.9fr",
          gap: 24,
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

      {draft.questions.map((q, qi) => (
        <QuestionBuilder
          key={qi}
          num={qi + 1}
          q={q}
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
              questions: d.questions.filter((_, i) => i !== qi),
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
      />
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
            <div style={{ transform: "scale(0.78)", transformOrigin: "center center" }}>
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
}: {
  num: number;
  q: Question;
  canRemove: boolean;
  onChange: (q: Question) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--hair)",
        borderRadius: 16,
        padding: 22,
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.05fr 1.4fr auto",
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
        <div style={{ display: "grid", gap: 8 }}>
          {q.answers.map((a, ai) => (
            <div
              key={ai}
              style={{
                display: "grid",
                gridTemplateColumns: "1.05fr 1.4fr auto",
                gap: 10,
                alignItems: "center",
              }}
            >
              <input
                value={a.text}
                onChange={(e) => {
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
                }}
              />
              <input
                value={a.snippet}
                onChange={(e) => {
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
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (q.answers.length <= 2) return;
                  const next = q.answers.filter((_, i) => i !== ai);
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
                }}
              >
                ×
              </button>
            </div>
          ))}
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
  const tokens = Array.from({ length: questionCount }, (_, i) => `{q${i + 1}}`);
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--hair)",
        borderRadius: 16,
        padding: 22,
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
        onChange={(e) => onChange(e.target.value)}
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
}: {
  colour: string;
  position: ButtonPosition;
  onColour: (c: string) => void;
  onPosition: (p: ButtonPosition) => void;
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
        padding: 22,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
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
  return (
    <div
      style={{
        fontSize: 11,
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
      {prefix && <span style={{ color: "var(--muted)", fontWeight: 400 }}>{prefix}</span>}
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          minWidth: 0,
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
