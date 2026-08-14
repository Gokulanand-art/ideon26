import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { RegisterWizard } from "@/components/RegisterWizard";
import { getStats } from "@/lib/stats";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * On-spot registration route. Works exactly like online registration, except
 * the fee is paid at the venue (no online payment). When the channel is
 * closed this page only shows the closed notice.
 */
export default async function OnsiteRegisterPage() {
  let initial = null;
  try {
    initial = await getStats();
  } catch {
    /* fall through to closed notice */
  }
  const open =
    initial?.registrationOpen === true &&
    initial?.onsiteOpen === true &&
    !initial?.onsiteFull;
  const onsiteLeft = initial?.onsiteSeatsLeft ?? config.onsiteCapacity;

  return (
    <>
      <Navbar open={open} />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:px-8">
          <div className="text-center">
            <p className="kicker">
              <span className="kicker-dot">●</span> {config.eventName} · On-spot registration
            </p>
            <h1 className="display mt-3 text-4xl text-fg sm:text-5xl">
              REGISTER FOR ON-SPOT<span className="text-signal">.</span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-mut">
              Teams of 2–4 · ₹{config.feePerHead} per participant · pay the fee
              at the venue · {onsiteLeft} on-spot seats left.
            </p>
          </div>

          <div className="mt-12">
            {!open ? (
              <div className="mx-auto max-w-xl rounded-xl border border-line bg-panel px-6 py-12 text-center">
                <p className="font-mono text-xs font-bold tracking-[0.2em] text-bad">
                  ● ON-SPOT REGISTRATION CLOSED
                </p>
                <h2 className="display mt-4 text-2xl text-fg">
                  On-spot registration is currently closed
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-mut">
                  {initial?.onsiteFull
                    ? `All ${config.onsiteCapacity} on-spot participant seats have been filled.`
                    : "The organizers have paused on-spot registration."}{" "}
                  Check the homepage for live seat availability.
                </p>
                <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link href="/register?mode=online" className="btn btn-primary px-6 py-2.5 text-sm font-bold">
                    REGISTER ONLINE
                  </Link>
                  <Link href="/" className="btn btn-ghost px-6 py-2.5 text-sm">
                    ← Back to homepage
                  </Link>
                </div>
              </div>
            ) : (
              <RegisterWizard
                feePerHead={config.feePerHead}
                onlineLeft={initial?.onlineSeatsLeft ?? config.onlineCapacity}
                onsiteLeft={onsiteLeft}
                initialMode="ONSITE"
              />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}