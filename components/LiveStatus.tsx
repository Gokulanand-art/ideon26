"use client";

import { useEffect, useState } from "react";
import type { Stats } from "@/lib/stats";

/**
 * Live participant availability. Boots from the server-rendered snapshot,
 * then subscribes to the local SSE stream (`/api/realtime`) and falls back to
 * a slow poll. Only real database numbers are ever shown — there is no fake
 * activity or animation of counters.
 */
export function LiveStatus({ initial }: { initial: Stats | null }) {
  const [stats, setStats] = useState<Stats | null>(initial);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch("/api/registration/stats", { cache: "no-store" });
        if (!res.ok) return;
        const s = (await res.json()) as Stats;
        if (!cancelled) setStats(s);
      } catch {
        /* keep last known numbers */
      }
    }

    function boot() {
      void refresh();
      if (typeof EventSource === "undefined") return;
      es = new EventSource("/api/realtime");
      es.addEventListener("open", () => setLive(true));
      es.addEventListener("stats", (ev) => {
        try {
          const s = JSON.parse((ev as MessageEvent).data) as Stats;
          setStats(s);
          setLive(true);
        } catch {
          /* ignore malformed frame */
        }
      });
      es.addEventListener("error", () => {
        // Connection dropped → polling fallback covers the gap; reconnect
        // attempts are handled by the browser EventSource implementation.
        setLive(false);
      });
    }

    boot();
    poll = setInterval(() => {
      void refresh();
    }, 30_000);

    return () => {
      cancelled = true;
      es?.close();
      if (poll) clearInterval(poll);
    };
  }, []);

  const tiles = [
    {
      key: "total",
      label: "TOTAL PARTICIPANTS",
      used: stats?.total ?? 0,
      cap: stats?.totalCapacity ?? 30,
      note: `${stats?.totalSeatsLeft ?? 30} seats left`,
    },
    {
      key: "online",
      label: "ONLINE PARTICIPANTS",
      used: stats?.online ?? 0,
      cap: stats?.onlineCapacity ?? 20,
      note: `${stats?.onlineSeatsLeft ?? 20} seats left`,
    },
    {
      key: "onsite",
      label: "ON-SPOT PARTICIPANTS",
      used: stats?.onsite ?? 0,
      cap: stats?.onsiteCapacity ?? 10,
      note: `${stats?.onsiteSeatsLeft ?? 10} seats left`,
    },
  ];

  return (
    <section id="live" className="scroll-mt-20 border-t border-line py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker">
              <span className="kicker-dot">●</span> Live data
            </p>
            <h2 className="display mt-3 text-3xl text-fg sm:text-4xl">
              REGISTRATION IS LIVE
            </h2>
            <p className="mt-3 text-sm text-mut">
              Live participant availability — updated in real time.
            </p>
          </div>
          <span
            className={`font-mono text-[11px] font-semibold tracking-[0.16em] ${
              live ? "text-signal" : "text-dim"
            }`}
            role="status"
          >
            {live ? "● STREAM CONNECTED" : "○ SYNCING…"}
          </span>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {tiles.map((t) => {
            const pct = t.cap > 0 ? Math.min(100, Math.round((t.used / t.cap) * 100)) : 0;
            return (
              <div key={t.key} className="panel rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <span className="kicker">{t.label}</span>
                  <span className="font-mono text-[10px] tracking-[0.14em] text-dim">
                    SEATS
                  </span>
                </div>
                <p className="mt-5 font-mono text-4xl font-bold tracking-tight text-fg">
                  {t.used}
                  <span className="text-lg text-dim"> / {t.cap}</span>
                </p>
                <div
                  className="mt-4 h-1 overflow-hidden rounded-full bg-white/5"
                  role="progressbar"
                  aria-valuenow={t.used}
                  aria-valuemin={0}
                  aria-valuemax={t.cap}
                  aria-label={`${t.label} seats used`}
                >
                  <div
                    className={`grow h-full rounded-full ${
                      t.used >= t.cap ? "bg-bad" : "bg-signal/70"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-3 font-mono text-xs text-mut">{t.note}</p>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-xs leading-relaxed text-dim">
          Capacity is measured in participants — the sum of every team&apos;s
          size — never in teams. Seat numbers come straight from the local
          registration database.
        </p>
      </div>
    </section>
  );
}