import Link from "next/link";
import { config } from "@/lib/config";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="grid h-6 w-6 place-items-center rounded border border-signal/40 bg-signal/10 font-mono text-[10px] font-bold text-signal">
            HK
          </span>
          <span className="font-mono text-xs tracking-[0.16em] text-mut">
            {config.eventName.toUpperCase()} · {config.eventDate}
          </span>
        </div>
        <div className="flex items-center gap-5 font-mono text-[11px] text-dim">
          <Link href="/#faq" className="hover:text-mut">FAQ</Link>
          <Link href="/#options" className="hover:text-mut">Registration</Link>
          <Link href="/admin/login" className="hover:text-mut">
            Organizer sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}