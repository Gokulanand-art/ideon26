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
  { header: "Channel", accessor: (r) => (r.registration_type === "ONSITE" ? "On-spot" : "Website") },
  { header: "Team Name", accessor: (r) => r.team_name },
  { header: "Team Size", accessor: (r) => r.team_size },
  { header: "Members", accessor: (r) => r.members },
  { header: "Amount (INR)", accessor: (r) => r.amount },
  { header: "Payment Status", accessor: (r) => r.payment_status },
  { header: "UPI Txn ID", accessor: (r) => r.txn_id },
  { header: "Payment Note", accessor: (r) => r.note },
  { header: "Verified By", accessor: (r) => r.verified_by },
  { header: "Verified At", accessor: (r) => r.verified_at },
  { header: "Status", accessor: (r) => r.status },
  { header: "Created At", accessor: (r) => r.created_at },
];

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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