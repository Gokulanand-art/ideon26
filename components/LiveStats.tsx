"use client";

import { useEffect, useRef, useState } from "react";
import type { Stats } from "@/lib/stats";

function useStatsStream(initial: Stats | null): Stats | null {
  const [stats, setStats] = useState<Stats | null>(initial);
  useEffect(() => {
    let es: EventSource | null = null;
    let cancelled = false;
    async function bootstrap() {
      try {
        const res = await fetch("/api/registration/stats", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as Stats;
          if (!cancelled) setStats(data);
        }
      } catch {
        /* ignore — SSE will still try */
      }
      if (cancelled || typeof EventSource === "undefined") return;
      es = new EventSource("/api/realtime");
      es.addEventListener("stats", (ev) => {
        try {
          setStats(JSON.parse((ev as MessageEvent).data) as Stats);
        } catch {
          /* ignore malformed */
        }
      });
      es.onerror = () => {
        // Browser will auto-reconnect; nothing to do.
      };
    }
    void bootstrap();
    return () => {
      cancelled = true;
      es?.close();
    };
  }, []);
  return stats;
}

function useAnimatedNumber(value: number, duration = 600): number {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = to;
    };
  }, [value, duration]);
  return display;
}

function ProgressBar({ value, capacity, full }: { value: number; capacity: number; full: boolean }) {
  const pct = capacity > 0 ? Math.min(100, (value / capacity) * 100) : 0;
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-white/10"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={capacity}
      aria-label={`${value} of ${capacity} seats taken`}
    >
      <div
        className={`bar-fill h-full rounded-full ${
          full
            ? "bg-gradient-to-r from-rose-500 to-red-500"
            : pct > 75
              ? "bg-gradient-to-r from-amber-400 to-orange-500"
              : "bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatusBadge({ stats }: { stats: Stats }) {
  if (stats.full) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-300">
        <span className="live-dot h-2 w-2 rounded-full bg-rose-400" aria-hidden="true" />
        REGISTRATION CLOSED
      </span>
    );
  }
  if (!stats.registrationOpen) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-zinc-500/30 bg-zinc-500/10 px-3 py-1 text-xs font-semibold text-zinc-300">
        REGISTRATION PAUSED
      </span>
    );
  }
  const lowSeats = Math.min(stats.onlineSeatsLeft, stats.onsiteSeatsLeft);
  if (lowSeats <= 3 && lowSeats > 0) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
        <span className="live-dot h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
        ⚡ ONLY {lowSeats} SEATS LEFT
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
      <span className="live-dot h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
      REGISTRATION OPEN
    </span>
  );
}

function StatCard({
  label,
  icon,
  value,
  capacity,
  seatsLeft,
  full,
  highlight,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  capacity: number;
  seatsLeft: number;
  full: boolean;
  highlight?: boolean;
}) {
  const animated = useAnimatedNumber(value);
  return (
    <div
      className={`glass rounded-2xl p-5 ${highlight ? "gradient-border" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-muted)]">
          <span aria-hidden="true">{icon}</span>
          {label}
        </div>
        {full ? (
          <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-rose-300">
            Full
          </span>
        ) : (
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
            Open
          </span>
        )}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="font-mono text-4xl font-bold tabular-nums text-white">
          {animated}
        </span>
        <span className="mb-1 font-mono text-lg text-[var(--color-muted)]">/ {capacity}</span>
      </div>
      <div className="mt-3">
        <ProgressBar value={value} capacity={capacity} full={full} />
      </div>
      <div className="mt-2 text-sm text-[var(--color-muted)]">
        {full ? (
          <span className="font-semibold text-rose-300">No seats available</span>
        ) : (
          <>
            <span className="font-semibold text-white">{seatsLeft}</span> seats available
          </>
        )}
      </div>
    </div>
  );
}

export function LiveStats({ initial }: { initial: Stats | null }) {
  const stats = useStatsStream(initial);
  if (!stats) {
    return (
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-busy="true">
        <div className="glass rounded-3xl p-10 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
          <p className="mt-4 text-sm text-[var(--color-muted)]">Checking availability…</p>
        </div>
      </section>
    );
  }

  const srText = `Total ${stats.total} of ${stats.totalCapacity} registered, ${stats.totalSeatsLeft} seats available. Online ${stats.online} of ${stats.onlineCapacity}, ${stats.onlineSeatsLeft} left. On-site ${stats.onsite} of ${stats.onsiteCapacity}, ${stats.onsiteSeatsLeft} left.`;

  return (
    <section aria-labelledby="live-stats-heading" aria-live="polite" aria-atomic="true">
      <h2 id="live-stats-heading" className="sr-only">
        Live registration statistics
      </h2>
      <p className="sr-only">{srText}</p>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="glass rounded-3xl p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-fuchsia-500 text-lg">
                🚀
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                  Registration is live
                </p>
                <p className="text-sm text-white">
                  Updated in real time — no refresh needed.
                </p>
              </div>
            </div>
            <StatusBadge stats={stats} />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <StatCard
              label="TOTAL REGISTERED"
              icon={<span>👥</span>}
              value={stats.total}
              capacity={stats.totalCapacity}
              seatsLeft={stats.totalSeatsLeft}
              full={stats.full}
              highlight
            />
            <StatCard
              label="ONLINE"
              icon={<span>💻</span>}
              value={stats.online}
              capacity={stats.onlineCapacity}
              seatsLeft={stats.onlineSeatsLeft}
              full={stats.onlineFull}
            />
            <StatCard
              label="ON-SITE"
              icon={<span>🏫</span>}
              value={stats.onsite}
              capacity={stats.onsiteCapacity}
              seatsLeft={stats.onsiteSeatsLeft}
              full={stats.onsiteFull}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
