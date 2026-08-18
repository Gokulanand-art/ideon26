import Link from "next/link";
import { config } from "@/lib/config";
import type { Stats } from "@/lib/stats";

/**
 * IDEON'26 hero: institution → departments → event name → status → CTA.
 * The live status text is explicit ("ONLINE REGISTRATION OPEN") so it is
 * readable with or without color.
 */
export function Hero({ stats }: { stats: Stats | null }) {
  const onlineOpen = stats?.registrationOpen === true && !stats?.onlineFull;
  const onsiteOpen = stats?.registrationOpen === true && stats?.onsiteOpen === true && !stats?.onsiteFull;
  const open = onlineOpen || onsiteOpen;
  const onlineLeft = stats?.onlineSeatsLeft ?? config.onlineCapacity;

  return (
    <section id="top" className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(56,189,248,0.1),transparent)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-40 top-24 h-96 w-96 rounded-full bg-violet/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-gold/[0.06] blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-14 sm:px-6 sm:pt-20 lg:px-8">
        <div className="rise mx-auto max-w-3xl text-center">
          <p className="kicker">
            <span className="kicker-dot">●</span> {config.collegeName}
          </p>
          <p className="mt-2 text-xs leading-relaxed tracking-wide text-mut sm:text-sm">
            Organised by {config.departmentNames}
          </p>

          <h1 className="display mt-8 text-6xl font-bold leading-none tracking-tight sm:text-7xl lg:text-8xl">
            <span className="text-grad">IDEON&apos;26</span>
          </h1>
          <p className="display mt-3 text-xl font-semibold tracking-[0.3em] text-fg sm:text-2xl">
            {config.eventType}
          </p>

          <p className="mt-6 font-mono text-[13px] tracking-[0.24em] text-mut sm:text-sm">
            INNOVATE <span className="text-signal">•</span> BUILD{" "}
            <span className="text-signal">•</span> IMPACT
          </p>

          <div className="mt-9 flex flex-col items-center gap-4">
            {open ? (
              <Link
                href="/register"
                className="btn btn-primary w-full max-w-xs px-8 py-4 text-[15px] font-bold tracking-wide"
              >
                REGISTER YOUR TEAM
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
                  All {config.totalCapacity} team slots have been filled.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-full border border-line bg-panel px-5 py-2.5">
              <span className="flex items-center gap-2.5">
                <span className="live-dot" aria-hidden="true" />
                <span className="font-mono text-xs font-semibold tracking-[0.14em] text-signal">
                  {onlineOpen && onsiteOpen
                    ? "ONLINE & ON-SPOT REGISTRATION OPEN"
                    : onlineOpen
                      ? "ONLINE REGISTRATION OPEN"
                      : onsiteOpen
                        ? "ON-SPOT REGISTRATION OPEN"
                        : "REGISTRATION STATUS CLOSED"}
                </span>
              </span>
              <span className="h-3 w-px bg-line-strong" aria-hidden="true" />
              <span className="font-mono text-xs text-mut">
                ₹{config.feePerHead} / participant
              </span>
              <span className="h-3 w-px bg-line-strong" aria-hidden="true" />
              <span className="font-mono text-xs text-mut">Teams of 2–4</span>
            </div>

            {/* Headline facts from the brochure. The prize is the strongest
                draw, so it leads and carries the gold accent; each item is
                dropped when its value is blank rather than left dangling. */}
            {(config.eventPrize || config.eventDate || config.eventCertificate) && (
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {config.eventPrize && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/[0.08] px-4 py-2">
                    <span aria-hidden="true">🏆</span>
                    <span className="font-mono text-xs font-bold tracking-[0.12em] text-gold">
                      {config.eventPrize.toUpperCase()}
                    </span>
                  </span>
                )}
                {config.eventDate && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2 font-mono text-xs text-mut">
                    <span aria-hidden="true">📅</span>
                    {config.eventDate}
                    {config.eventTime ? ` · ${config.eventTime}` : ""}
                  </span>
                )}
                {config.eventCertificate && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2 font-mono text-xs text-mut">
                    <span aria-hidden="true">📜</span>
                    Certificate provided
                  </span>
                )}
              </div>
            )}

            {onlineOpen && onlineLeft <= 5 && (
              <p className="font-mono text-[11px] tracking-[0.1em] text-gold" role="status">
                ONLY {onlineLeft} ONLINE SEAT{onlineLeft === 1 ? "" : "S"} LEFT
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
