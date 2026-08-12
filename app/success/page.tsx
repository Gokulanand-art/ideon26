import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SuccessCard, type ConfirmationData } from "@/components/SuccessCard";
import { verifyRegistrationToken } from "@/lib/tokens";
import { getRegistrationByPublicId } from "@/lib/admin";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; token?: string }>;
}) {
  const { id, token } = await searchParams;

  let data: ConfirmationData | null = null;
  if (id && token && verifyRegistrationToken(token, id)) {
    try {
      const row = await getRegistrationByPublicId(id);
      if (row) {
        data = {
          registration_id: row.registration_id,
          name: row.full_name,
          participation_type: row.participation_type,
          team_name: row.team_name,
          team_size: row.team_size,
          status: row.status,
          created_at: row.created_at,
          event_name: config.eventName,
        };
      }
    } catch (err) {
      console.error("success page error", err);
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          {data ? (
            <SuccessCard data={data} />
          ) : (
            <div className="glass rounded-3xl p-10 text-center">
              <div className="text-5xl">🤔</div>
              <h1 className="mt-4 text-2xl font-bold text-white">Confirmation not found</h1>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                This confirmation link is invalid or has expired. If you just registered, your seat
                is still saved — contact the organizers with your email.
              </p>
              <a
                href="/register"
                className="btn-primary mt-6 inline-flex rounded-xl px-6 py-3 text-sm"
              >
                Back to registration
              </a>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
