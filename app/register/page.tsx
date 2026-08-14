import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { RegisterWizard } from "@/components/RegisterWizard";
import { getStats } from "@/lib/stats";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  let initial = null;
  let statsError = false;
  try {
    initial = await getStats();
  } catch (err) {
    statsError = true;
    console.error("register page initial stats error", err);
  }

  const onlineLeft = initial?.onlineSeatsLeft ?? config.onlineCapacity;
  const open = initial?.registrationOpen === true && !initial?.onlineFull;

  return (
    <>
      <Navbar open={open} />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:px-8">
          <div className="text-center">
            <p className="kicker">
              <span className="kicker-dot">●</span> {config.eventName} · Online registration
            </p>
            <h1 className="display mt-3 text-4xl text-fg sm:text-5xl">
              REGISTER YOUR TEAM<span className="text-signal">.</span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-mut">
              Teams of 2–4 · ₹{config.feePerHead} per participant · secure UPI
              payment · {onlineLeft} online participant seats left.
            </p>
          </div>

          <div className="mt-12">
            {statsError ? (
              <div className="mx-auto max-w-xl rounded-xl border border-bad/40 bg-bad/10 px-6 py-10 text-center">
                <p className="text-lg font-semibold text-fg">Could not load registration data</p>
                <p className="mt-2 text-sm text-mut">
                  Please refresh the page. If this persists, the local server may be offline.
                </p>
              </div>
            ) : !open ? (
              <div className="mx-auto max-w-xl rounded-xl border border-line bg-panel px-6 py-12 text-center">
                <p className="font-mono text-xs font-bold tracking-[0.2em] text-bad">
                  ● ONLINE REGISTRATION CLOSED
                </p>
                <h2 className="display mt-4 text-2xl text-fg">
                  Online registration is currently closed
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-mut">
                  {initial?.onlineFull
                    ? `All ${config.onlineCapacity} online participant seats have been filled.`
                    : "The organizers have paused online registration."}{" "}
                  Check the homepage for live seat availability.
                </p>
                <Link href="/" className="btn btn-ghost mt-7 px-6 py-2.5 text-sm">
                  ← Back to homepage
                </Link>
              </div>
            ) : (
              <RegisterWizard feePerHead={config.feePerHead} onlineLeft={onlineLeft} />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}