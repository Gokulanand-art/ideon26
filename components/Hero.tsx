import Link from "next/link";
import { config } from "@/lib/config";
import type { Stats } from "@/lib/stats";

export function Hero({ stats }: { stats: Stats | null }) {
  const open = stats?.registrationOpen === true && !stats?.onlineFull;
  const capacity = stats?.onlineCapacity ?? config.onlineCapacity;

  return (
    <section id="top" className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(52,211,122,0.07),transparent)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8">
        <div className="rise mx-auto max-w-3xl text-center">
          <p className="kicker">
            <span className="kicker-dot">●</span> {config.eventName} · {config.eventDate}
          </p>
          <h1 className="display mt-5 text-5xl leading-[1.02] text-fg sm:text-6xl lg:text-7xl">
            BUILD<span className="text-signal">.</span> CREATE
            <span className="text-signal">.</span> INNOVATE
            <span className="text-signal">.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-mut sm:text-lg">
            Bring your team. Build something meaningful. Compete with other
            creators.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[13px] text-mut">
            <span>
              <span className="text-fg">₹{config.feePerHead}</span> / participant
            </span>
            <span className="h-1 w-1 rounded-full bg-dim" aria-hidden="true" />
            <span>
              Teams of <span className="text-fg">2–4</span>
            </span>
          </div>

          <div className="mt-9 flex flex-col items-center gap-4">
            {open ? (
              <Link
                href="/register"
                className="btn btn-primary w-full max-w-xs px-8 py-4 text-[15px] font-bold tracking-wide"
              >
                REGISTER ONLINE
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ) : (
              <div className="w-full max-w-xs rounded-lg border border-line bg-panel px-6 py-4 text-center">
                <p className="font-mono text-xs font-bold tracking-[0.18em] text-bad">
                  REGISTRATION CLOSED
                </p>
                <p className="mt-2 text-sm text-mut">
                  All {config.totalCapacity} participant seats have been filled.
                </p>
              </div>
            )}

            <div className="flex items-center gap-2.5 rounded-full border border-line bg-panel px-4 py-2">
              <span className="live-dot" aria-hidden="true" />
              <span className="font-mono text-xs font-semibold tracking-[0.14em] text-signal">
                REGISTRATION LIVE
              </span>
              <span className="h-3 w-px bg-line-strong" aria-hidden="true" />
              <span className="font-mono text-xs text-mut">
                ONLINE OPEN · {capacity} participant capacity
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}