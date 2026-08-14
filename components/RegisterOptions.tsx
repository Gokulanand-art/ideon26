import Link from "next/link";
import { config } from "@/lib/config";
import type { Stats } from "@/lib/stats";

/**
 * Registration channels. Online and On-Spot are both live channels; the only
 * difference is payment — online teams pay now by UPI, on-spot teams pay the
 * fee at the venue. The raw UPI ID is deliberately not rendered anywhere on
 * the public site.
 */
export function RegisterOptions({ stats }: { stats: Stats | null }) {
  const onlineOpen = stats?.registrationOpen === true && !stats?.onlineFull;
  const onlineLeft = stats?.onlineSeatsLeft ?? config.onlineCapacity;
  const onsiteOpen =
    stats?.registrationOpen === true && stats?.onsiteOpen === true && !stats?.onsiteFull;
  const onsiteLeft = stats?.onsiteSeatsLeft ?? config.onsiteCapacity;

  return (
    <section id="options" className="scroll-mt-20 border-t border-line py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="kicker">
            <span className="kicker-dot">●</span> Registration
          </p>
          <h2 className="display mt-3 text-3xl text-fg sm:text-4xl">
            REGISTER YOUR TEAM
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-mut">
            Two ways to join {config.eventName}: register online and pay now
            with UPI, or register on-spot and pay the fee at the venue.
          </p>
        </div>

        <div className="mt-10 grid items-stretch gap-5 lg:grid-cols-2">
          {/* ---------------- ONLINE ---------------- */}
          <div className="relative flex flex-col rounded-xl border border-signal/50 bg-panel p-7 glow-cyan sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <h3 className="display text-2xl text-fg">ONLINE REGISTRATION</h3>
              <span className="chip chip-open">
                <span className="live-dot" aria-hidden="true" />
                Open
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-mut">
              Register your team online. The entry fee is paid now, securely
              with UPI from your phone — no venue visit required.
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
              <div className="bg-panel-2 p-4">
                <dt className="font-mono text-[10px] tracking-[0.14em] text-dim">CAPACITY</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-fg">
                  {config.onlineCapacity} participants
                </dd>
              </div>
              <div className="bg-panel-2 p-4">
                <dt className="font-mono text-[10px] tracking-[0.14em] text-dim">SEATS LEFT</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-signal">
                  {onlineLeft} participants
                </dd>
              </div>
              <div className="bg-panel-2 p-4">
                <dt className="font-mono text-[10px] tracking-[0.14em] text-dim">FEE</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-fg">
                  ₹{config.feePerHead} / participant
                </dd>
              </div>
              <div className="bg-panel-2 p-4">
                <dt className="font-mono text-[10px] tracking-[0.14em] text-dim">PAYMENT</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-fg">UPI now</dd>
              </div>
            </dl>

            <div className="mt-7 flex flex-1 flex-col justify-end">
              {onlineOpen ? (
                <Link
                  href="/register?mode=online"
                  className="btn btn-primary w-full px-6 py-3.5 text-sm font-bold tracking-wide"
                >
                  REGISTER ONLINE
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              ) : (
                <div className="w-full rounded-lg border border-line bg-panel-2 px-6 py-3.5 text-center">
                  <p className="font-mono text-xs font-bold tracking-[0.18em] text-bad">
                    REGISTRATION CLOSED
                  </p>
                </div>
              )}
              <p className="mt-3 text-center font-mono text-[11px] text-dim">
                SECURE UPI PAYMENT · AMOUNT CALCULATED AUTOMATICALLY
              </p>
            </div>
          </div>

          {/* ---------------- ON-SPOT ---------------- */}
          <div
            className={`relative flex flex-col rounded-xl border bg-panel p-7 sm:p-8 ${
              onsiteOpen ? "border-signal/40" : "border-line opacity-80"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className={`display text-2xl ${onsiteOpen ? "text-fg" : "text-dim"}`}>ON-SPOT</h3>
              <span className={`chip ${onsiteOpen ? "chip-open" : "chip-closed"}`}>
                <span className="live-dot" aria-hidden="true" />
                {onsiteOpen ? "Open" : "Registration closed"}
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-mut">
              Register at the venue, just like online. The only difference: the
              entry fee is paid on-spot when you arrive — no online payment.
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
              <div className="bg-panel-2 p-4">
                <dt className="font-mono text-[10px] tracking-[0.14em] text-dim">CAPACITY</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-fg">
                  {config.onsiteCapacity} participants
                </dd>
              </div>
              <div className="bg-panel-2 p-4">
                <dt className="font-mono text-[10px] tracking-[0.14em] text-dim">SEATS LEFT</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-signal">
                  {onsiteLeft} participants
                </dd>
              </div>
              <div className="bg-panel-2 p-4">
                <dt className="font-mono text-[10px] tracking-[0.14em] text-dim">FEE</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-fg">
                  ₹{config.feePerHead} / participant
                </dd>
              </div>
              <div className="bg-panel-2 p-4">
                <dt className="font-mono text-[10px] tracking-[0.14em] text-dim">PAYMENT</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-fg">At venue</dd>
              </div>
            </dl>

            <div className="mt-7 flex flex-1 flex-col justify-end">
              {onsiteOpen ? (
                <Link
                  href="/register/onsite"
                  className="btn btn-ghost w-full px-6 py-3.5 text-sm font-bold tracking-wide"
                >
                  REGISTER ON-SPOT
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              ) : (
                <div
                  className="w-full cursor-not-allowed rounded-lg border border-line bg-panel-2 px-6 py-3.5 text-center"
                  aria-disabled="true"
                >
                  <p className="font-mono text-xs font-bold tracking-[0.18em] text-dim">
                    REGISTRATION CLOSED
                  </p>
                </div>
              )}
              <p className="mt-3 text-center font-mono text-[11px] text-dim">
                FEE PAID AT THE VENUE · NO ONLINE PAYMENT
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}