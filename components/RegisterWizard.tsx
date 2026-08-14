"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { config } from "@/lib/config";

interface Props {
  feePerHead: number;
  onlineLeft: number;
}

interface ApiError {
  error?: string;
  fields?: Record<string, string>;
}

const TEAM_SIZES = [2, 3, 4] as const;

type Errors = Record<string, string>;

export function RegisterWizard({ feePerHead, onlineLeft }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [leader, setLeader] = useState({ name: "", email: "" });
  const [teamSize, setTeamSize] = useState<2 | 3 | 4>(2);
  const [members, setMembers] = useState<string[]>(["", ""]);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const totalSteps = 4;
  const isLast = step === totalSteps - 1;

  const amount = feePerHead * teamSize;
  const memberSlots = Math.max(0, teamSize - 1);
  const liveTeamFits = onlineLeft >= teamSize;

  const steps = [
    { label: "Team leader", hint: "01" },
    { label: "Team size", hint: "02" },
    { label: "Members", hint: "03" },
    { label: "Review & pay", hint: "04" },
  ];

  const errorFor = (key: string): string | undefined => errors[key];

  function validateLeader(): boolean {
    const e: Errors = {};
    if (leader.name.trim().length < 2) e.name = "Team leader name must be at least 2 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leader.email.trim()))
      e.email = "Please enter a valid email address.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateMembers(): boolean {
    const e: Errors = {};
    if (!liveTeamFits) {
      e.team = `Only ${onlineLeft} online participant seats remain. A ${teamSize}-member team cannot register — try a smaller team.`;
    }
    members.slice(0, memberSlots).forEach((m, i) => {
      if (m.trim().length < 2) e[`member${i}`] = "Every member name must be at least 2 characters.";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    setServerError(null);
    if (step === 0 && !validateLeader()) return;
    if (step === 2 && !validateMembers()) return;
    setStep((s) => Math.min(totalSteps - 1, s + 1));
  }

  function back() {
    setServerError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setServerError(null);
    setErrors({});
    try {
      const res = await fetch("/api/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: leader.name.trim(),
          email: leader.email.trim(),
          registration_type: "ONLINE",
          team_size: teamSize,
          member_names: members.slice(0, memberSlots).map((m) => m.trim()),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as ApiError & {
        registration_id?: string;
        token?: string;
      };
      if (!res.ok) {
        setServerError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      router.push(`/success?id=${encodeURIComponent(data.registration_id ?? "")}&token=${encodeURIComponent(data.token ?? "")}`);
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const progress = useMemo(() => ((step + 1) / totalSteps) * 100, [step, totalSteps]);

  return (
    <div className="mx-auto w-full max-w-xl">
      {/* Step rail */}
      <ol className="flex items-center justify-between gap-2" aria-label="Registration steps">
        {steps.map((s, i) => {
          const state = i < step ? "done" : i === step ? "current" : "todo";
          return (
            <li key={s.hint} className="flex flex-1 flex-col gap-1.5">
              <span className="flex items-center gap-2">
                <span
                  className={`grid h-6 w-6 flex-none place-items-center rounded-full font-mono text-[10px] font-bold ${
                    state === "done"
                      ? "bg-signal text-signal-ink"
                      : state === "current"
                        ? "border border-signal text-signal"
                        : "border border-line-strong text-dim"
                  }`}
                  aria-hidden="true"
                >
                  {state === "done" ? "✓" : s.hint}
                </span>
                <span
                  className={`hidden font-mono text-[10px] font-semibold tracking-[0.12em] sm:block ${
                    state === "todo" ? "text-dim" : "text-mut"
                  }`}
                >
                  {s.label.toUpperCase()}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 h-px w-full bg-line" role="presentation">
        <div className="h-px bg-signal transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Server error banner */}
      {serverError && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-[#f2a9a6]"
        >
          {serverError}
        </div>
      )}

      <div className="mt-8">
        {step === 0 && (
          <section aria-labelledby="step-leader" className="rise">
            <p className="kicker">Step 01 / 04</p>
            <h2 id="step-leader" className="display mt-2 text-2xl text-fg">TEAM LEADER</h2>
            <p className="mt-2 text-sm text-mut">
              The leader is member 1 and the primary contact for this team.
            </p>
            <div className="mt-6 space-y-5">
              <Field label="Team leader name" id="leader-name" error={errorFor("name")}>
                <input
                  id="leader-name"
                  className="field"
                  autoComplete="name"
                  value={leader.name}
                  onChange={(e) => setLeader({ ...leader, name: e.target.value })}
                  aria-invalid={errorFor("name") ? true : undefined}
                  placeholder="e.g. Ada Lovelace"
                />
              </Field>
              <Field label="Team leader email" id="leader-email" error={errorFor("email")}>
                <input
                  id="leader-email"
                  type="email"
                  className="field"
                  autoComplete="email"
                  value={leader.email}
                  onChange={(e) => setLeader({ ...leader, email: e.target.value })}
                  aria-invalid={errorFor("email") ? true : undefined}
                  placeholder="ada@example.com"
                />
              </Field>
            </div>
          </section>
        )}

        {step === 1 && (
          <section aria-labelledby="step-size" className="rise">
            <p className="kicker">Step 02 / 04</p>
            <h2 id="step-size" className="display mt-2 text-2xl text-fg">TEAM SIZE</h2>
            <p className="mt-2 text-sm text-mut">
              Every registration is a team of 2–4. No solo entries.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3" role="radiogroup" aria-label="Team size">
              {TEAM_SIZES.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={teamSize === n}
                  onClick={() => {
                    setTeamSize(n);
                    setMembers((m) =>
                      Array.from({ length: n }, (_, i) => m[i] ?? ""),
                    );
                  }}
                  className={`rounded-xl border px-4 py-5 text-center transition-colors ${
                    teamSize === n
                      ? "border-signal bg-signal/10 shadow-[0_0_0_1px_rgba(56,189,248,0.3)]"
                      : "border-line-strong bg-panel hover:border-mut"
                  }`}
                >
                  <span className="block font-mono text-2xl font-bold text-fg">{n}</span>
                  <span className="mt-1 block font-mono text-[10px] tracking-[0.14em] text-mut">
                    MEMBERS
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-4 font-mono text-xs text-mut">
              FEE · ₹{feePerHead} × {teamSize} = <span className="text-fg">₹{amount}</span>
            </p>
            <p className="mt-1 font-mono text-[10px] text-dim">
              PAID VIA UPI AT THE FINAL STEP
            </p>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="step-members" className="rise">
            <p className="kicker">Step 03 / 04</p>
            <h2 id="step-members" className="display mt-2 text-2xl text-fg">TEAM MEMBERS</h2>
            <p className="mt-2 text-sm text-mut">
              Names only — no emails needed. Member 1 is {leader.name.trim() || "the team leader"}.
            </p>

            {!liveTeamFits && (
              <div role="alert" className="mt-5 rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-[#f2a9a6]">
                Only {onlineLeft} online participant seats remain. A {teamSize}-member team
                cannot register — try a smaller team.
              </div>
            )}

            <div className="mt-6 space-y-5">
              <div className="rounded-lg border border-line bg-panel/50 px-4 py-3">
                <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-dim">MEMBER 1 · TEAM LEADER</p>
                <p className="mt-1 text-sm text-fg">{leader.name.trim() || "—"}</p>
              </div>
              {memberSlots > 0 &&
                Array.from({ length: memberSlots }, (_, i) => i).map((i) => (
                  <Field key={i} label={`Member ${i + 2} name`} id={`member-${i}`} error={errorFor(`member${i}`)}>
                    <input
                      id={`member-${i}`}
                      className="field"
                      autoComplete="name"
                      value={members[i] ?? ""}
                      onChange={(e) => {
                        const next = [...members];
                        next[i] = e.target.value;
                        setMembers(next);
                      }}
                      aria-invalid={errorFor(`member${i}`) ? true : undefined}
                      placeholder={`Member ${i + 2}`}
                    />
                  </Field>
                ))}
            </div>
          </section>
        )}

        {isLast && (
          <section aria-labelledby="step-review" className="rise">
            <p className="kicker">Step 04 / 04</p>
            <h2 id="step-review" className="display mt-2 text-2xl text-fg">
              REVIEW &amp; PAY
            </h2>
            <p className="mt-2 text-sm text-mut">
              Confirm the details. The fee is calculated automatically — you
              never type the amount.
            </p>

            <dl className="panel mt-6 divide-y divide-line rounded-xl">
              <div className="flex items-center justify-between px-5 py-3.5">
                <dt className="font-mono text-[11px] tracking-[0.14em] text-dim">MODE</dt>
                <dd>
                  <span className="chip chip-open">ONLINE · UPI PAYMENT</span>
                </dd>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <dt className="font-mono text-[11px] tracking-[0.14em] text-dim">TEAM LEADER</dt>
                <dd className="text-sm font-medium text-fg">{leader.name.trim()}</dd>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <dt className="font-mono text-[11px] tracking-[0.14em] text-dim">EMAIL</dt>
                <dd className="font-mono text-xs text-fg">{leader.email.trim()}</dd>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <dt className="font-mono text-[11px] tracking-[0.14em] text-dim">TEAM SIZE</dt>
                <dd className="text-sm font-medium text-fg">{teamSize} members</dd>
              </div>
              <div className="px-5 py-3.5">
                <dt className="font-mono text-[11px] tracking-[0.14em] text-dim">MEMBERS</dt>
                <dd className="mt-2 space-y-1">
                  {[leader.name.trim(), ...members.slice(0, memberSlots).map((m) => m.trim())].map(
                    (name, i) => (
                      <p key={i} className="flex items-center gap-2 text-sm text-fg">
                        <span className="font-mono text-[10px] text-dim">{i + 1}.</span>
                        {name}
                      </p>
                    ),
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-5 rounded-xl border border-signal/30 bg-signal/[0.06] p-5">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] tracking-[0.14em] text-mut">
                  ₹{feePerHead} × {teamSize} MEMBERS
                </span>
                <span className="font-mono text-[11px] text-dim">UPI PAYMENT</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-sm font-medium text-fg">TOTAL REGISTRATION FEE</span>
                <span className="font-mono text-3xl font-bold text-signal">
                  ₹{amount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="btn btn-primary mt-6 w-full px-6 py-4 text-[15px] font-bold tracking-wide"
            >
              {submitting ? "RESERVING SEAT…" : `CONTINUE TO PAYMENT · ₹${amount}`}
            </button>
            <p className="mt-3 text-center font-mono text-[11px] text-dim">
              SECURE UPI PAYMENT · AMOUNT CALCULATED AUTOMATICALLY
            </p>
          </section>
        )}

        {/* Footer controls */}
        {!isLast && (
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="btn btn-ghost px-5 py-2.5 text-sm disabled:opacity-0"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={next}
              className="btn btn-primary px-7 py-2.5 text-sm font-bold tracking-wide"
            >
              Continue →
            </button>
          </div>
        )}
      </div>

      <p className="mt-8 text-center font-mono text-[11px] leading-relaxed text-dim">
        {config.eventName.toUpperCase()} · ONLINE REGISTRATION · UPI PAYMENT · ₹{feePerHead} / PARTICIPANT
      </p>
    </div>
  );
}

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-mono text-[11px] font-semibold tracking-[0.14em] text-mut">
        {label.toUpperCase()}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-[#f2a9a6]">
          {error}
        </p>
      )}
    </div>
  );
}