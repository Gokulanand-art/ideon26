"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerSchema, formatZodError, YEARS } from "@/lib/validation";
import type { Stats as StatsT } from "@/lib/stats";

interface Props {
  initial: StatsT | null;
}

type FieldErrors = Record<string, string>;

export function RegisterForm({ initial }: Props) {
  const router = useRouter();
  const [stats, setStats] = useState<StatsT | null>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    college: "",
    department: "",
    year: "",
    participation_type: "",
    team_name: "",
    team_size: "1",
  });

  useEffect(() => {
    let es: EventSource | null = null;
    async function bootstrap() {
      try {
        const res = await fetch("/api/registration/stats", { cache: "no-store" });
        if (res.ok) setStats((await res.json()) as StatsT);
      } catch {
        /* ignore */
      }
      if (typeof EventSource === "undefined") return;
      es = new EventSource("/api/realtime");
      es.addEventListener("stats", (ev) => {
        try {
          setStats(JSON.parse((ev as MessageEvent).data) as StatsT);
        } catch {
          /* ignore */
        }
      });
    }
    void bootstrap();
    return () => es?.close();
  }, []);

  const onlineFull = stats?.onlineFull ?? false;
  const onsiteFull = stats?.onsiteFull ?? false;
  const closed = stats?.full ?? false;

  const seats = useMemo(() => {
    if (!stats) return null;
    return {
      ONLINE: stats.onlineSeatsLeft,
      ONSITE: stats.onsiteSeatsLeft,
    } as Record<string, number>;
  }, [stats]);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
    setGeneralError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setGeneralError(null);
    setErrors({});

    const payload = {
      ...form,
      team_size: Number(form.team_size),
      team_name: form.team_name || undefined,
    };
    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(formatZodError(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fields) setErrors(data.fields);
        setGeneralError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      const id: string = data.registration_id;
      const token: string = data.token;
      router.push(`/success?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`);
    } catch {
      setGeneralError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "field w-full rounded-xl px-4 py-3 text-sm";
  const labelCls = "mb-1.5 block text-sm font-medium text-white";
  const errCls = "mt-1.5 text-xs text-rose-300";

  return (
    <form onSubmit={onSubmit} noValidate className="glass mt-10 rounded-3xl p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-white">Participant information</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="full_name" className={labelCls}>
            Full name <span className="text-rose-400">*</span>
          </label>
          <input
            id="full_name"
            name="full_name"
            autoComplete="name"
            className={inputCls}
            value={form.full_name}
            onChange={(e) => update("full_name", e.target.value)}
            aria-invalid={!!errors.full_name}
            aria-describedby={errors.full_name ? "err-full_name" : undefined}
            disabled={submitting}
            required
          />
          {errors.full_name && <p id="err-full_name" className={errCls}>{errors.full_name}</p>}
        </div>

        <div>
          <label htmlFor="email" className={labelCls}>
            Email <span className="text-rose-400">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={inputCls}
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "err-email" : undefined}
            disabled={submitting}
            required
          />
          {errors.email && <p id="err-email" className={errCls}>{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="phone" className={labelCls}>
            Phone number <span className="text-rose-400">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            className={inputCls}
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? "err-phone" : undefined}
            disabled={submitting}
            required
          />
          {errors.phone && <p id="err-phone" className={errCls}>{errors.phone}</p>}
        </div>

        <div>
          <label htmlFor="college" className={labelCls}>
            College / Institution <span className="text-rose-400">*</span>
          </label>
          <input
            id="college"
            name="college"
            className={inputCls}
            value={form.college}
            onChange={(e) => update("college", e.target.value)}
            aria-invalid={!!errors.college}
            aria-describedby={errors.college ? "err-college" : undefined}
            disabled={submitting}
            required
          />
          {errors.college && <p id="err-college" className={errCls}>{errors.college}</p>}
        </div>

        <div>
          <label htmlFor="department" className={labelCls}>
            Department <span className="text-rose-400">*</span>
          </label>
          <input
            id="department"
            name="department"
            className={inputCls}
            value={form.department}
            onChange={(e) => update("department", e.target.value)}
            aria-invalid={!!errors.department}
            aria-describedby={errors.department ? "err-department" : undefined}
            disabled={submitting}
            required
          />
          {errors.department && <p id="err-department" className={errCls}>{errors.department}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="year" className={labelCls}>
            Year of study <span className="text-rose-400">*</span>
          </label>
          <select
            id="year"
            name="year"
            className={inputCls}
            value={form.year}
            onChange={(e) => update("year", e.target.value)}
            aria-invalid={!!errors.year}
            aria-describedby={errors.year ? "err-year" : undefined}
            disabled={submitting}
            required
          >
            <option value="">Select year…</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>{y === "5+" ? "5+ / Graduate" : `Year ${y}`}</option>
            ))}
          </select>
          {errors.year && <p id="err-year" className={errCls}>{errors.year}</p>}
        </div>
      </div>

      <h2 className="mt-9 text-lg font-semibold text-white">Hackathon information</h2>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium text-white">
          Participation mode <span className="text-rose-400">*</span>
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <ModeOption
            id="mode-online"
            value="ONLINE"
            icon="💻"
            title="Online"
            seatsLeft={seats?.ONLINE}
            full={onlineFull}
            disabled={submitting || closed}
            checked={form.participation_type === "ONLINE"}
            onChange={() => update("participation_type", "ONLINE")}
            error={errors.participation_type}
          />
          <ModeOption
            id="mode-onsite"
            value="ONSITE"
            icon="🏫"
            title="On-Site"
            seatsLeft={seats?.ONSITE}
            full={onsiteFull}
            disabled={submitting || closed}
            checked={form.participation_type === "ONSITE"}
            onChange={() => update("participation_type", "ONSITE")}
            error={errors.participation_type}
          />
        </div>
        {errors.participation_type && (
          <p className="mt-2 text-xs text-rose-300">{errors.participation_type}</p>
        )}
      </fieldset>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="team_name" className={labelCls}>
            Team name <span className="text-[var(--color-muted)]">(optional)</span>
          </label>
          <input
            id="team_name"
            name="team_name"
            className={inputCls}
            value={form.team_name}
            onChange={(e) => update("team_name", e.target.value)}
            aria-invalid={!!errors.team_name}
            aria-describedby={errors.team_name ? "err-team_name" : undefined}
            disabled={submitting}
          />
          {errors.team_name && <p id="err-team_name" className={errCls}>{errors.team_name}</p>}
        </div>
        <div>
          <label htmlFor="team_size" className={labelCls}>
            Team size <span className="text-rose-400">*</span>
          </label>
          <select
            id="team_size"
            name="team_size"
            className={inputCls}
            value={form.team_size}
            onChange={(e) => update("team_size", e.target.value)}
            aria-invalid={!!errors.team_size}
            aria-describedby={errors.team_size ? "err-team_size" : undefined}
            disabled={submitting}
            required
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          {errors.team_size && <p id="err-team_size" className={errCls}>{errors.team_size}</p>}
        </div>
      </div>

      {generalError && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
        >
          {generalError}
        </div>
      )}

      <div className="mt-7 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
        <Link
          href="/"
          className="text-sm text-[var(--color-muted)] hover:text-white"
        >
          ← Back to home
        </Link>
        <button
          type="submit"
          className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm sm:w-auto"
          disabled={submitting || closed}
          aria-busy={submitting}
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#060912]/40 border-t-[#060912]" />
              Submitting registration…
            </>
          ) : (
            "Complete registration"
          )}
        </button>
      </div>
    </form>
  );
}

function ModeOption({
  id,
  value,
  icon,
  title,
  seatsLeft,
  full,
  disabled,
  checked,
  onChange,
  error,
}: {
  id: string;
  value: string;
  icon: string;
  title: string;
  seatsLeft?: number;
  full: boolean;
  disabled: boolean;
  checked: boolean;
  onChange: () => void;
  error?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 transition-colors ${
        full || disabled
          ? "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-60"
          : checked
            ? "border-indigo-500/60 bg-indigo-500/10"
            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
      }`}
    >
      <input
        id={id}
        type="radio"
        name="participation_type"
        value={value}
        checked={checked}
        disabled={disabled || full}
        onChange={onChange}
        aria-invalid={!!error}
        className="h-4 w-4 accent-indigo-500"
      />
      <span className="text-xl" aria-hidden="true">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="block text-xs text-[var(--color-muted)]">
          {full ? "Full" : seatsLeft != null ? `${seatsLeft} seats left` : ""}
        </span>
      </span>
    </label>
  );
}
