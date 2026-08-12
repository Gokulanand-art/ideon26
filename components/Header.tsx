import Link from "next/link";
import { config } from "@/lib/config";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#060912]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5" aria-label={`${config.eventName} home`}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 via-indigo-500 to-fuchsia-500 font-mono text-sm font-bold text-[#060912]">
            HK
          </span>
          <span className="hidden text-sm font-semibold tracking-wide text-white sm:block">
            {config.eventName}
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary">
          <Link
            href="/#about"
            className="rounded-lg px-3 py-2 text-sm text-[var(--color-muted)] transition-colors hover:text-white"
          >
            About
          </Link>
          <Link
            href="/#modes"
            className="rounded-lg px-3 py-2 text-sm text-[var(--color-muted)] transition-colors hover:text-white"
          >
            Modes
          </Link>
          <Link
            href="/#faq"
            className="rounded-lg px-3 py-2 text-sm text-[var(--color-muted)] transition-colors hover:text-white"
          >
            FAQ
          </Link>
          <Link
            href="/register"
            className="btn-primary ml-1 rounded-xl px-4 py-2 text-sm"
          >
            Register Now
          </Link>
        </nav>
      </div>
    </header>
  );
}
