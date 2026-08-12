import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAllForExport } from "@/lib/admin";
import { toCsv, type CsvColumn } from "@/lib/csv";
import type { RegistrationRow } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const columns: CsvColumn<RegistrationRow>[] = [
  { header: "Registration ID", accessor: (r) => r.registration_id },
  { header: "Full Name", accessor: (r) => r.full_name },
  { header: "Email", accessor: (r) => r.email },
  { header: "Phone", accessor: (r) => r.phone },
  { header: "College", accessor: (r) => r.college },
  { header: "Department", accessor: (r) => r.department },
  { header: "Year", accessor: (r) => r.year },
  { header: "Mode", accessor: (r) => r.participation_type },
  { header: "Team Name", accessor: (r) => r.team_name },
  { header: "Team Size", accessor: (r) => r.team_size },
  { header: "Status", accessor: (r) => r.status },
  { header: "Created At", accessor: (r) => r.created_at },
];

export async function GET() {
  await requireAdmin();
  const rows = await getAllForExport();
  const csv = toCsv(rows, columns);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hackathon-registrations-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
