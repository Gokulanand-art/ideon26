import Link from "next/link";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="gradient-border relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-fuchsia-500/10"
          aria-hidden="true"
        />
        <div className="relative">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
            READY TO BUILD?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-[var(--color-muted)] sm:text-lg">
            Seats are limited. Secure your spot before they&apos;re gone.
          </p>
          <Link href="/register" className="btn-primary mt-8 inline-flex rounded-xl px-8 py-3.5 text-base">
            REGISTER NOW
          </Link>
        </div>
      </div>
    </section>
  );
}
