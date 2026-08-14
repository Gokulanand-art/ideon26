import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { RegisterWizard } from "@/components/RegisterWizard";
import { getStats } from "@/lib/stats";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const fixedMode = mode === "onsite" ? "ONSITE" : mode === "online" ? "ONLINE" : null;

  let initial = null;
  let statsError = false;
  try {
    initial = await getStats();
  } catch (err) {
    statsError = true;
    console.error("register page initial stats error", err);
  }

  const onlineLeft = initial?.onlineSeatsLeft ?? config.onlineCapacity;
  const onsiteLeft = initial?.onsiteSeatsLeft ?? config.onsiteCapacity;
  const open =
    initial?.registrationOpen === true &&
    (fixedMode === "ONSITE"
      ? initial?.onsiteOpen === true && !initial?.onsiteFull
      : fixedMode === "ONLINE"
        ? !initial?.onlineFull
        : !initial?.onlineFull || (initial?.onsiteOpen === true && !initial?.onsiteFull));

  const title = fixedMode === "ONSITE" ? "ON-SPOT REGISTRATION" : "REGISTER YOUR TEAM";
  const subtitle =
    fixedMode === "ONSITE"
      ? `Teams of 2–4 · ₹${config.feePerHead} per participant · pay at the venue · ${onsiteLeft} on-spot team slots left.`
      : `Teams of 2–4 · ₹${config.feePerHead} per participant · online: UPI payment now · on-spot: pay at venue · ${onlineLeft} online / ${onsiteLeft} on-spot team slots left.`;

  return (
    <>
      <Navbar open={open} />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:px-8">
          <div className="text-center">
            <p className="kicker">
              <span className="kicker-dot">●</span> {config.eventName} ·{" "}
              {fixedMode === "ONSITE" ? "On-spot registration" : "Registration"}
            </p>
            <h1 className="display mt-3 text-4xl text-fg sm:text-5xl">
              {title}
              <span className="text-signal">.</span>
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-mut">{subtitle}</p>
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
                  ● {fixedMode === "ONSITE" ? "ON-SPOT" : "ONLINE"} REGISTRATION CLOSED
                </p>
                <h2 className="display mt-4 text-2xl text-fg">
                  {fixedMode === "ONSITE"
                    ? "On-spot registration is currently closed"
                    : "Online registration is currently closed"}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-mut">
                  {fixedMode === "ONSITE"
                    ? initial?.onsiteFull
                      ? `All ${config.onsiteCapacity} on-spot team slots have been filled.`
                      : "The organizers have paused on-spot registration."
                    : initial?.onlineFull
                      ? `All ${config.onlineCapacity} online team slots have been filled.`
                      : "The organizers have paused online registration."}{" "}
                  Check the homepage for live slot availability.
                </p>
                <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link href="/register" className="btn btn-primary px-6 py-2.5 text-sm font-bold">
                    REGISTER ANOTHER WAY
                  </Link>
                  <Link href="/" className="btn btn-ghost px-6 py-2.5 text-sm">
                    ← Back to homepage
                  </Link>
                </div>
              </div>
            ) : (
              <RegisterWizard
                feePerHead={config.feePerHead}
                onlineLeft={onlineLeft}
                onsiteLeft={onsiteLeft}
                initialMode={fixedMode ?? undefined}
              />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}