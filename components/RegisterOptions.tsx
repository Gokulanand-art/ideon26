import Link from "next/link";
import { config } from "@/lib/config";
import type { Stats } from "@/lib/stats";

/**
 * The two registration channels. Both are live when their channel flag is
 * open and seats remain. A channel can have seats remaining yet stay closed —
 * seats ≠ open, and the text says so.
 */
export function RegisterOptions({ stats }: { stats: Stats | null }) {
  const onlineOpen = stats?.registrationOpen === true && !stats?.onlineFull;
  const onsiteOpen = stats?.registrationOpen === true && stats?.onsiteOpen === true && !stats?.onsiteFull;
  const onlineLeft = stats?.onlineSeatsLeft ?? config.onlineCapacity;
  const onsiteLeft = stats?.onsiteSeatsLeft ?? config.onsiteCapacity;

  return (
    <section id="options" className="scroll-mt-20 border-t border-line py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="kicker">
            <span className="kicker-dot">●</span> Registration channels
          </p>
          <h2 className="display mt-3 text-3xl text-fg sm:text-4xl">
            CHOOSE HOW YOU PARTICIPATE
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-mut">
            Join online from anywhere, or register on-site and pay at the
            venue. Both channels are open.
          </p>
        </div>

        <div className="mt-10 grid items-stretch gap-5 lg:grid-cols-2">
          {/* ---------------- ONLINE — primary, active ---------------- */}
          <div className="relative flex flex-col rounded-xl border border-signal/50 bg-panel p-7 shadow-[0_0_0_1px_rgba(52,211,122,0.12),0_24px_60px_-28px_rgba(52,211,122,0.35)] sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <h3 className="display text-2xl text-fg">ONLINE</h3>
              <span className="chip chip-open">
                <span className="live-dot" aria-hidden="true" />
                Registration open
              </span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-mut">
              Register remotely. Your team joins the hackathon online and the
              fee is paid securely with UPI — no venue visit required.
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
                PAYMENT · UPI {config.upiId}
              </p>
            </div>
          </div>

          {/* ---------------- ON-SITE — active, pay at venue ---------------- */}
          <div className="relative flex flex-col rounded-xl border border-signal/50 bg-panel p-7 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <h3 className="display text-2xl text-fg">ON-SITE</h3>
              {onsiteOpen ? (
                <span className="chip chip-open">
                  <span className="live-dot" aria-hidden="true" />
                  Registration open
                </span>
              ) : (
                <span className="chip chip-closed">Registration closed</span>
              )}
            </div>

            <p className="mt-3 text-sm leading-relaxed text-mut">
              Register in advance and join at the venue. No online payment —
              the fee is collected at the venue on arrival.
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
                <dt className="font-mono text-[10px] tracking-[0.14em] text-dim">TEAM</dt>
                <dd className="mt-1 font-mono text-lg font-semibold text-fg">2–4 members</dd>
              </div>
            </dl>

            {onsiteOpen ? (
              <div className="mt-7 flex flex-1 flex-col justify-end">
                <Link
                  href="/register/onsite"
                  className="btn btn-primary w-full px-6 py-3.5 text-sm font-bold tracking-wide"
                >
                  REGISTER ON-SITE
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <p className="mt-3 text-center font-mono text-[11px] text-dim">
                  NO ONLINE PAYMENT · FEE COLLECTED AT VENUE
                </p>
              </div>
            ) : (
              <div className="mt-7 flex flex-1 flex-col justify-end">
                <div className="w-full rounded-lg border border-line bg-panel-2 px-6 py-3.5 text-center">
                  <p className="font-mono text-xs font-bold tracking-[0.18em] text-bad">
                    REGISTRATION CLOSED
                  </p>
                </div>
                <p className="mt-3 text-center font-mono text-[11px] text-dim">
                  NOT AVAILABLE
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}