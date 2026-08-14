"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { config } from "@/lib/config";

/**
 * Primary navigation for IDEON'26. The Register Online button is only
 * rendered as an active link while online registration is open.
 */
export function Navbar({ open }: { open: boolean }) {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menu]);

  const links = [
    { href: "/#top", label: "Home" },
    { href: "/#about", label: "About" },
    { href: "/#domains", label: "Domains" },
    { href: "/#faq", label: "FAQ" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/#top"
          className="flex items-center gap-3"
          aria-label={`${config.eventName} — home`}
        >
          <span className="grid h-8 w-8 place-items-center rounded-md border border-signal/40 bg-signal/10 font-mono text-[13px] font-bold text-signal">
            ID
          </span>
          <span className="font-mono text-[13px] font-semibold tracking-[0.18em] text-fg">
            {config.eventName.toUpperCase()}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm text-mut transition-colors hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href={open ? "/register" : "/#options"}
            aria-disabled={!open}
            className={`ml-2 rounded-md px-4 py-2 text-sm font-semibold ${
              open
                ? "bg-signal text-signal-ink shadow-[0_0_0_1px_rgba(56,189,248,0.4),0_8px_28px_-12px_rgba(56,189,248,0.55)] transition hover:brightness-110"
                : "cursor-not-allowed border border-line bg-transparent text-dim"
            }`}
          >
            {open ? "Register" : "Registration Closed"}
          </Link>
        </nav>

        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-md border border-line-strong text-mut md:hidden"
          onClick={() => setMenu((m) => !m)}
          aria-expanded={menu}
          aria-controls="mobile-menu"
          aria-label={menu ? "Close navigation menu" : "Open navigation menu"}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            {menu ? (
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
              <path d="M2 4.5h12M2 8h12M2 11.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {menu && (
        <div id="mobile-menu" ref={menuRef} className="border-t border-line bg-ink/95 px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenu(false)}
                className="rounded-md px-3 py-2.5 text-sm text-mut transition-colors hover:text-fg"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href={open ? "/register" : "/#options"}
              onClick={() => setMenu(false)}
              aria-disabled={!open}
              className={`mt-1 rounded-md px-3 py-2.5 text-center text-sm font-semibold ${
                open
                  ? "bg-signal text-signal-ink"
                  : "cursor-not-allowed border border-line bg-transparent text-dim"
              }`}
            >
              {open ? "Register" : "Registration Closed"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}