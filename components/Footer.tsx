import Link from "next/link";
import { config } from "@/lib/config";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 via-indigo-500 to-fuchsia-500 font-mono text-xs font-bold text-[#060912]">
                HK
              </span>
              <span className="font-semibold text-white">{config.eventName}</span>
            </div>
            <p className="mt-3 max-w-sm text-sm text-[var(--color-muted)]">
              {config.eventTagline}
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Footer">
            <Link href="/#about" className="text-[var(--color-muted)] hover:text-white">
              About
            </Link>
            <Link href="/#modes" className="text-[var(--color-muted)] hover:text-white">
              Participation
            </Link>
            <Link href="/register" className="text-[var(--color-muted)] hover:text-white">
              Register
            </Link>
            <Link href="/admin" className="text-[var(--color-muted)] hover:text-white">
              Admin
            </Link>
          </nav>
        </div>
        <div className="mt-8 border-t border-white/5 pt-6 text-xs text-[var(--color-muted)]">
          © {new Date().getFullYear()} {config.eventName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
