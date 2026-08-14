import Link from "next/link";
import { config } from "@/lib/config";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-md border border-signal/40 bg-signal/10 font-mono text-[13px] font-bold text-signal">
                ID
              </span>
              <span className="font-mono text-[13px] font-semibold tracking-[0.18em] text-fg">
                {config.eventName.toUpperCase()} · {config.eventType}
              </span>
            </div>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-dim">
              {config.collegeName} (Autonomous) — {config.departmentNames}.
              INNOVATE • BUILD • IMPACT.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-[11px] text-dim" aria-label="Footer">
            <Link href="/#about" className="hover:text-mut">About</Link>
            <Link href="/#domains" className="hover:text-mut">Domains</Link>
            <Link href="/#faq" className="hover:text-mut">FAQ</Link>
            <Link href="/#options" className="hover:text-mut">Registration</Link>
            <Link href="/admin/login" className="hover:text-mut">
              Organizer sign in
            </Link>
          </nav>
        </div>

        <p className="mt-10 border-t border-line pt-6 text-center font-mono text-[10px] tracking-[0.2em] text-dim">
          © 2026 {config.eventName.toUpperCase()} — {config.eventType}
        </p>
      </div>
    </footer>
  );
}