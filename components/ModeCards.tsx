"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Stats } from "@/lib/stats";

export function ModeCards({ initial }: { initial: Stats | null }) {
  const [stats, setStats] = useState<Stats | null>(initial);

  useEffect(() => {
    let es: EventSource | null = null;
    async function bootstrap() {
      try {
        const res = await fetch("/api/registration/stats", { cache: "no-store" });
        if (res.ok) setStats((await res.json()) as Stats);
      } catch {
        /* ignore */
      }
      if (typeof EventSource === "undefined") return;
      es = new EventSource("/api/realtime");
      es.addEventListener("stats", (ev) => {
        try {
          setStats(JSON.parse((ev as MessageEvent).data) as Stats);
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
  const onlineLeft = stats?.onlineSeatsLeft ?? configFallback().onlineCapacity;
  const onsiteLeft = stats?.onsiteSeatsLeft ?? configFallback().onsiteCapacity;

  return (
    <section id="modes" className="mx-auto max-w-7xl scroll-mt-20 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Participation modes
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Choose how you build.
        </h2>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <ModeCard
          icon="💻"
          title="Online"
          subtitle="Remote participation"
          capacity={stats?.onlineCapacity ?? configFallback().onlineCapacity}
          seatsLeft={onlineLeft}
          full={onlineFull}
          accent="from-cyan-400 to-blue-500"
        />
        <ModeCard
          icon="🏫"
          title="On-Site"
          subtitle="Physical venue"
          capacity={stats?.onsiteCapacity ?? configFallback().onsiteCapacity}
          seatsLeft={onsiteLeft}
          full={onsiteFull}
          accent="from-fuchsia-500 to-purple-600"
        />
      </div>
    </section>
  );
}

function ModeCard({
  icon,
  title,
  subtitle,
  capacity,
  seatsLeft,
  full,
  accent,
}: {
  icon: string;
  title: string;
  subtitle: string;
  capacity: number;
  seatsLeft: number;
  full: boolean;
  accent: string;
}) {
  return (
    <div className={`glass relative overflow-hidden rounded-3xl p-7 ${full ? "opacity-80" : ""}`}>
      <div
        className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl`}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-4xl" aria-hidden="true">{icon}</div>
          <h3 className="mt-4 text-2xl font-bold text-white">{title}</h3>
          <p className="mt-1 text-sm text-[var(--color-muted)]">{subtitle}</p>
        </div>
        {full ? (
          <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-rose-300">
            Full
          </span>
        ) : (
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
            Open
          </span>
        )}
      </div>
      <div className="mt-6 flex items-end gap-2">
        <span className="font-mono text-4xl font-bold text-white">{capacity}</span>
        <span className="mb-1 text-sm text-[var(--color-muted)]">seats total</span>
      </div>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        {full ? (
          <span className="font-semibold text-rose-300">No seats available.</span>
        ) : (
          <>
            <span className="font-semibold text-white">{seatsLeft}</span> seats available right now
          </>
        )}
      </p>
      <Link
        href={full ? "#live" : "/register"}
        aria-disabled={full}
        tabIndex={full ? -1 : 0}
        className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${
          full
            ? "cursor-not-allowed border border-white/10 bg-white/5 text-[var(--color-muted)]"
            : "btn-primary"
        }`}
        onClick={full ? (e) => e.preventDefault() : undefined}
      >
        {full ? "This mode is full" : "Register for " + title}
      </Link>
    </div>
  );
}

// Avoid importing config (server-only-ish) duplication here for display fallback.
function configFallback() {
  return {
    onlineCapacity: Number(process.env.NEXT_PUBLIC_ONLINE_CAPACITY ?? 20),
    onsiteCapacity: Number(process.env.NEXT_PUBLIC_ONSITE_CAPACITY ?? 10),
  };
}
