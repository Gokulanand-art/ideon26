import Link from "next/link";
import { config } from "@/lib/config";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28 lg:px-8 lg:pt-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-[var(--color-muted)]">
            <span className="live-dot h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
            REGISTRATION LIVE · {config.totalCapacity} TOTAL SEATS · {config.onlineCapacity} ONLINE · {config.onsiteCapacity} ON-SITE
          </div>

          <h1 className="animate-fade-up mt-6 font-mono text-5xl font-bold tracking-tight text-white sm:text-7xl lg:text-8xl">
            <span className="gradient-text">HACKATHON</span>{" "}
            <span className="text-white">2026</span>
          </h1>

          <p className="animate-fade-up mt-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            BUILD. CREATE. INNOVATE.
          </p>
          <p className="animate-fade-up mx-auto mt-4 max-w-xl text-base text-[var(--color-muted)] sm:text-lg">
            A challenge for builders, creators and problem solvers. {config.eventDuration} of
            pure building — online or on-site.
          </p>

          <div className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className="btn-primary rounded-xl px-8 py-3.5 text-base">
              REGISTER NOW
            </Link>
            <Link
              href="#live"
              className="rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              View Live Seats
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
