import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RegisterForm } from "@/components/RegisterForm";
import { getStats } from "@/lib/stats";
import type { Stats } from "@/lib/stats";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  let initial: Stats | null = null;
  try {
    initial = await getStats();
  } catch (err) {
    console.error("register page initial stats error", err);
  }

  const full = initial?.full ?? false;

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              {config.eventName}
            </p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Register to <span className="gradient-text">build</span>.
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-[var(--color-muted)]">
              Fill in your details to secure your seat. Confirmation is instant.
            </p>
          </div>

          {full ? (
            <div className="glass mt-10 rounded-3xl p-10 text-center">
              <div className="text-5xl">🔴</div>
              <h2 className="mt-4 text-2xl font-bold text-white">Registration Closed</h2>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                All {config.totalCapacity} seats have been filled. Check back later in case a seat
                opens up.
              </p>
            </div>
          ) : (
            <RegisterForm initial={initial} />
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
