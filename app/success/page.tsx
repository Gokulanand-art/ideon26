import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ConfirmationPanel, type ConfirmationData } from "@/components/ConfirmationPanel";
import { verifyRegistrationToken } from "@/lib/tokens";
import { getRegistrationByPublicId } from "@/lib/admin";
import { buildUpiIntent, upiQrDataUrl, formatAmount } from "@/lib/upi";
import { getStats } from "@/lib/stats";
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
        const intentUrl = buildUpiIntent({
          upiId: row.upi_id,
          payeeName: row.payee_name,
          amount: row.amount,
          note: row.registration_id,
        });
        let qrDataUrl: string | null = null;
        try {
          qrDataUrl = await upiQrDataUrl(intentUrl);
        } catch {
          /* QR is best-effort */
        }
        data = {
          registration_id: row.registration_id,
          name: row.full_name,
          registration_type: row.registration_type,
          team_name: row.team_name,
          team_size: row.team_size,
          member_names: row.member_names,
          status: row.status,
          created_at: row.created_at,
          amount: row.amount,
          amount_display: formatAmount(row.amount),
          fee_per_head: row.fee_per_head,
          payee_name: row.payee_name,
          payment_status: row.payment_status,
          txn_id: row.txn_id,
          upi_intent_url: intentUrl,
          qr_data_url: qrDataUrl,
          token,
        };
      }
    } catch (err) {
      console.error("success page error", err);
    }
  }

  let open = false;
  try {
    const stats = await getStats();
    open = stats.registrationOpen === true && !stats.onlineFull;
  } catch {
    /* navbar CTA stays disabled */
  }

  return (
    <>
      <Navbar open={open} />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:px-8">
          <div className="mb-10 text-center">
            <p className="kicker">
              <span className="kicker-dot">●</span> {config.eventName} · Confirmation
            </p>
            <h1 className="display mt-3 text-4xl text-fg sm:text-5xl">
              YOUR REGISTRATION<span className="text-signal">.</span>
            </h1>
          </div>

          {data ? (
            <ConfirmationPanel data={data} />
          ) : (
            <div className="mx-auto max-w-xl rounded-xl border border-line bg-panel px-6 py-12 text-center">
              <p className="font-mono text-xs font-bold tracking-[0.2em] text-warn">
                ● LINK EXPIRED OR INVALID
              </p>
              <h2 className="display mt-4 text-2xl text-fg">Confirmation not found</h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-mut">
                This confirmation link is invalid or has expired. If you just
                registered, your seat is still saved — contact the organizers
                to continue your payment.
              </p>
              <a href="/register" className="btn btn-primary mt-7 px-6 py-2.5 text-sm font-bold">
                Register another team
              </a>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}