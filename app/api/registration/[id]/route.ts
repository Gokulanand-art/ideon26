import { NextResponse } from "next/server";
import { getRegistrationByPublicId } from "@/lib/admin";
import { verifyRegistrationToken } from "@/lib/tokens";
import { buildUpiIntent, upiQrDataUrl, formatAmount } from "@/lib/upi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  // The success page proves access with a short-lived signed token bound to
  // this registration id, so guessed ids do not leak participant data.
  if (!verifyRegistrationToken(token, id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const row = await getRegistrationByPublicId(id);
  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

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

  return NextResponse.json(
    {
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
      upi_id: row.upi_id,
      payee_name: row.payee_name,
      payment_status: row.payment_status,
      txn_id: row.txn_id,
      upi_intent_url: intentUrl,
      qr_data_url: qrDataUrl,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}