import Link from "next/link";
import { config } from "@/lib/config";
import type { Stats } from "@/lib/stats";

/**
 * Registration channels. Online is the dominant, active card; On-Spot is
 * informational only — currently closed and never clickable. The raw UPI ID
 * is deliberately not rendered anywhere on the public site.
 */
export function RegisterOptions({ stats }: { stats: Stats | null }) {
  const onlineOpen = stats?.registrationOpen === true && !stats?.onlineFull;
  const onlineLeft = stats?.onlineSeatsLeft ?? config.onlineCapacity;
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
            Online registration is open. On-spot registration is currently
            closed — only the online channel is available.
          </p>
        </div>

        <div className="mt-10 grid items-stretch gap-5 lg:grid-cols-2">
          {/* ---------------- ONLINE — primary, active ---------------- */}
          <div className="relative flex flex-col rounded-xl border border-signal/50 bg-panel p-7 glow-cyan sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <h3 className="display text-2xl text-fg">ONLINE REGISTRATION</h3>
              <span className="chip chip-open">
                <span className="live-dot" aria-hidden="true" />
                Open
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-mut">
              Register your team online. The entry fee is paid securely with
              UPI — no venue visit required.
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
                <dt className="font-mono text-[10px] tracking-[0.14em] text-dim">TEAM</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-fg">2–4 members</dd>
              </div>
            </dl>

            <div className="mt-7 flex flex-1 flex-col justify-end">
              {onlineOpen ? (
                <Link
                  href="/register"
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

          {/* ---------------- ON-SPOT — informational, closed ---------------- */}
          <div className="relative flex flex-col rounded-xl border border-line bg-panel/60 p-7 opacity-80 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <h3 className="display text-2xl text-dim">ON-SPOT</h3>
              <span className="chip chip-closed">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M3 5V3.5A3 3 0 0 1 9 3.5V5m-7 0h8v5.5H2V5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Registration closed
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-mut">
              On-spot registration is currently unavailable. Only online
              registration is open at this time.
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
              <div className="bg-panel-2 p-4">
                <dt className="font-mono text-[10px] tracking-[0.14em] text-dim">CAPACITY</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-mut">
                  {config.onsiteCapacity} participants
                </dd>
              </div>
              <div className="bg-panel-2 p-4">
                <dt className="font-mono text-[10px] tracking-[0.14em] text-dim">SEATS LEFT</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-mut">
                  {onsiteLeft} participants
                </dd>
              </div>
              <div className="bg-panel-2 p-4">
                <dt className="font-mono text-[10px] tracking-[0.14em] text-dim">FEE</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-mut">
                  ₹{config.feePerHead} / participant
                </dd>
              </div>
              <div className="bg-panel-2 p-4">
                <dt className="font-mono text-[10px] tracking-[0.14em] text-dim">TEAM</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-mut">2–4 members</dd>
              </div>
            </dl>

            <div className="mt-7 flex flex-1 flex-col justify-end">
              <div
                className="w-full cursor-not-allowed rounded-lg border border-line bg-panel-2 px-6 py-3.5 text-center"
                aria-disabled="true"
              >
                <p className="font-mono text-xs font-bold tracking-[0.18em] text-dim">
                  REGISTRATION CLOSED
                </p>
              </div>
              <p className="mt-3 text-center font-mono text-[11px] text-dim">
                NOT AVAILABLE · CHECK BACK LATER
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}