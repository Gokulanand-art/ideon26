import { NextResponse } from "next/server";
import { getRegistrationByPublicId } from "@/lib/admin";
import { verifyRegistrationToken } from "@/lib/tokens";

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

  return NextResponse.json(
    {
      registration_id: row.registration_id,
      name: row.full_name,
      participation_type: row.participation_type,
      team_name: row.team_name,
      team_size: row.team_size,
      status: row.status,
      created_at: row.created_at,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
