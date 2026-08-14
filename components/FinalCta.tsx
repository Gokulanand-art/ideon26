import Link from "next/link";
import { config } from "@/lib/config";

export function FinalCta({ open }: { open: boolean }) {
  return (
    <section className="border-t border-line py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <p className="kicker">
          <span className="kicker-dot">●</span> {config.eventName}
        </p>
        <h2 className="display mt-4 text-4xl text-fg sm:text-5xl">
          READY TO BUILD THE FUTURE<span className="text-signal">?</span>
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-mut">
          {open
            ? `Gather your team of 2–4 and lock in your seat before the ${config.onlineCapacity} online participant slots fill up.`
            : "All available seats have been filled. Check back later in case a seat opens up."}
        </p>
        <div className="mt-8">
          {open ? (
            <Link
              href="/register"
              className="btn btn-primary px-10 py-4 text-[15px] font-bold tracking-wide"
            >
              REGISTER ONLINE
            </Link>
          ) : (
            <span className="btn btn-disabled px-10 py-4 text-[15px] font-bold tracking-wide">
              REGISTRATION CLOSED
            </span>
          )}
        </div>
      </div>
    </section>
  );
}