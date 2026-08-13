/**
 * Admin data access: list/search/filter registrations (with payment info),
 * on-spot creation, and verify / cancel / reject actions.
 */
import { getDb } from "./db";
import { broadcastStats } from "./realtime";
import { getStats } from "./stats";
import { RegistrationError } from "./registration";
import type { AdminAction, RegistrationStatus } from "./validation";

export interface RegistrationRow {
  id: number;
  registration_id: string;
  full_name: string;
  email: string;
  phone: string;
  college: string;
  department: string;
  year: string;
  registration_type: string;
  team_name: string | null;
  team_size: number;
  status: string;
  created_at: string;
  updated_at: string;
  /** All member names (leader first), comma-separated — from team_members. */
  members: string | null;
  // Payment info (joined).
  amount: number;
  payment_status: string;
  txn_id: string | null;
  note: string | null;
  verified_by: string | null;
  verified_at: string | null;
}

export interface ListParams {
  search?: string;
  mode?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ListResult {
  rows: RegistrationRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ALLOWED_MODES = new Set(["ONLINE", "ONSITE"]);
const ALLOWED_STATUSES = new Set([
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "REJECTED",
]);

const COLUMNS_SQL = `p.id, p.registration_id, p.full_name, p.email, p.phone, p.college, p.department,
            p.year, p.registration_type, p.team_name, p.team_size, p.status,
            p.created_at::text AS created_at, p.updated_at::text AS updated_at,
            (SELECT string_agg(tm.member_name, ', ' ORDER BY tm.member_number)
             FROM team_members tm WHERE tm.participant_id = p.id) AS members,
            pay.amount, pay.status AS payment_status, pay.txn_id, pay.note,
            pay.verified_by, pay.verified_at::text AS verified_at`;

export async function listRegistrations(
  params: ListParams,
  opts: { adapter?: import("./db").DbAdapter } = {},
): Promise<ListResult> {
  const db = opts.adapter ?? (await getDb());
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));
  const offset = (page - 1) * limit;

  const where: string[] = [];
  const args: unknown[] = [];
  let argi = 1;

  const search = params.search?.trim();
  if (search) {
    where.push(
      `(p.full_name ILIKE $${argi} OR p.email ILIKE $${argi} OR p.registration_id ILIKE $${argi} OR p.team_name ILIKE $${argi} OR p.college ILIKE $${argi} OR pay.txn_id ILIKE $${argi})`,
    );
    args.push(`%${search}%`);
    argi++;
  }
  if (params.mode && ALLOWED_MODES.has(params.mode)) {
    where.push(`p.registration_type = $${argi}`);
    args.push(params.mode);
    argi++;
  }
  if (params.status && ALLOWED_STATUSES.has(params.status)) {
    where.push(`p.status = $${argi}`);
    args.push(params.status);
    argi++;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const { rows: countRows } = await db.query<{ c: number }>(
    `SELECT count(*)::int AS c
     FROM participants p
     LEFT JOIN payments pay ON pay.participant_id = p.id
     ${whereSql}`,
    args,
  );
  const total = Number(countRows[0]?.c ?? 0);

  const { rows } = await db.query<RegistrationRow>(
    `SELECT ${COLUMNS_SQL}
     FROM participants p
     LEFT JOIN payments pay ON pay.participant_id = p.id
     ${whereSql}
     ORDER BY p.created_at DESC
     LIMIT $${argi} OFFSET $${argi + 1}`,
    [...args, limit, offset],
  );

  return {
    rows,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getAllForExport(
  opts: { adapter?: import("./db").DbAdapter } = {},
): Promise<RegistrationRow[]> {
  const db = opts.adapter ?? (await getDb());
  const { rows } = await db.query<RegistrationRow>(
    `SELECT ${COLUMNS_SQL}
     FROM participants p
     LEFT JOIN payments pay ON pay.participant_id = p.id
     ORDER BY p.created_at ASC`,
  );
  return rows;
}

export async function getTodayCount(): Promise<number> {
  const db = await getDb();
  const { rows } = await db.query<{ c: number }>(
    `SELECT count(*)::int AS c FROM participants
     WHERE created_at::date = now()::date
       AND status NOT IN ('CANCELLED','REJECTED')`,
  );
  return Number(rows[0]?.c ?? 0);
}

export interface AdminSummary {
  totalTeams: number;
  onlineTeams: number;
  onsiteTeams: number;
  onlinePaidTeams: number;
  onlinePaidParticipants: number;
  onsitePaidTeams: number;
  pendingPayments: number;
  totalCollected: number;
}

/**
 * Organizer-facing aggregates: team counts (not participants) plus payment
 * totals. ONLINE pays by UPI (VERIFIED = collected), ONSITE pays at the venue
 * (VERIFIED = collected at the counter).
 */
export async function getAdminSummary(
  opts: { adapter?: import("./db").DbAdapter } = {},
): Promise<AdminSummary> {
  const db = opts.adapter ?? (await getDb());
  const { rows } = await db.query<{
    total_teams: number;
    online_teams: number;
    onsite_teams: number;
    online_paid_teams: number;
    online_paid_participants: number;
    onsite_paid_teams: number;
    pending_payments: number;
    total_collected: number;
  }>(
    `SELECT
       count(*) FILTER (WHERE p.status NOT IN ('CANCELLED','REJECTED')
         AND (p.registration_type = 'ONSITE' OR pay.status IN ('SUBMITTED','VERIFIED')))::int AS total_teams,
       count(*) FILTER (WHERE p.registration_type = 'ONLINE' AND p.status NOT IN ('CANCELLED','REJECTED')
         AND pay.status IN ('SUBMITTED','VERIFIED'))::int AS online_teams,
       count(*) FILTER (WHERE p.registration_type = 'ONSITE' AND p.status NOT IN ('CANCELLED','REJECTED'))::int AS onsite_teams,
       count(*) FILTER (WHERE p.registration_type = 'ONLINE' AND pay.status = 'VERIFIED')::int AS online_paid_teams,
       COALESCE(SUM(p.team_size) FILTER (WHERE p.registration_type = 'ONLINE' AND pay.status = 'VERIFIED'), 0)::int AS online_paid_participants,
       count(*) FILTER (WHERE p.registration_type = 'ONSITE' AND pay.status = 'VERIFIED')::int AS onsite_paid_teams,
       count(*) FILTER (WHERE pay.status IN ('PENDING','SUBMITTED','PAY_AT_VENUE') AND p.status NOT IN ('CANCELLED','REJECTED'))::int AS pending_payments,
       COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'VERIFIED'), 0)::int AS total_collected
     FROM participants p
     LEFT JOIN payments pay ON pay.participant_id = p.id`,
  );
  const r = rows[0] ?? {
    total_teams: 0,
    online_teams: 0,
    onsite_teams: 0,
    online_paid_teams: 0,
    online_paid_participants: 0,
    onsite_paid_teams: 0,
    pending_payments: 0,
    total_collected: 0,
  };
  return {
    totalTeams: Number(r.total_teams),
    onlineTeams: Number(r.online_teams),
    onsiteTeams: Number(r.onsite_teams),
    onlinePaidTeams: Number(r.online_paid_teams),
    onlinePaidParticipants: Number(r.online_paid_participants),
    onsitePaidTeams: Number(r.onsite_paid_teams),
    pendingPayments: Number(r.pending_payments),
    totalCollected: Number(r.total_collected),
  };
}

export interface RegistrationPublicDetail {
  id: number;
  registration_id: string;
  full_name: string;
  registration_type: string;
  team_name: string | null;
  team_size: number;
  status: string;
  created_at: string;
  amount: number;
  fee_per_head: number;
  upi_id: string;
  payee_name: string;
  payment_status: string;
  txn_id: string | null;
  /** All member names (leader first). */
  member_names: string[];
}

/** Public (token-gated) detail for the success page, including payment/UPI info. */
export async function getRegistrationByPublicId(
  registrationId: string,
): Promise<RegistrationPublicDetail | null> {
  const db = await getDb();
  const { rows } = await db.query<RegistrationPublicDetail>(
    `SELECT p.id, p.registration_id, p.full_name, p.registration_type, p.team_name, p.team_size,
            p.status, p.created_at::text AS created_at,
            pay.amount, pay.status AS payment_status, pay.txn_id,
            s.value AS fee_per_head
     FROM participants p
     LEFT JOIN payments pay ON pay.participant_id = p.id
     CROSS JOIN settings s
     WHERE p.registration_id = $1 AND s.key = 'fee_per_head'
     LIMIT 1`,
    [registrationId],
  );
  const row = rows[0];
  if (!row) return null;

  const { rows: upiRows } = await db.query<{ key: string; value: string }>(
    `SELECT key, value FROM settings WHERE key IN ('upi_id','payee_name')`,
  );
  const map = new Map(upiRows.map((r) => [r.key, r.value]));

  const { rows: memberRows } = await db.query<{ member_name: string }>(
    `SELECT member_name FROM team_members
     WHERE participant_id = $1
     ORDER BY member_number`,
    [row.id],
  );

  return {
    ...row,
    fee_per_head: Number(row.fee_per_head),
    upi_id: map.get("upi_id") ?? "7449007050@ybl",
    payee_name: map.get("payee_name") ?? "HACKATHON",
    member_names: memberRows.map((m) => m.member_name),
  };
}

/**
 * Admin actions on a registration:
 *   verify — confirm the payment (participant CONFIRMED, payment VERIFIED).
 *            Only allowed once a UPI txn id has been submitted.
 *   cancel / reject — free the seat (participant CANCELLED/REJECTED, payment FAILED).
 *            Blocked for payments that were already verified (money received —
 *            organisers must refund outside the system first).
 */
export async function runAdminAction(
  id: number,
  action: AdminAction,
  adminName: string,
  opts: { adapter?: import("./db").DbAdapter } = {},
): Promise<RegistrationRow> {
  const db = opts.adapter ?? (await getDb());
  let result!: RegistrationRow;

  await db.transaction(async (q) => {
    const { rows } = await q<RegistrationRow>(
      `SELECT ${COLUMNS_SQL}
       FROM participants p
       LEFT JOIN payments pay ON pay.participant_id = p.id
       WHERE p.id = $1
       LIMIT 1`,
      [id],
    );
    const reg = rows[0];
    if (!reg) {
      throw new RegistrationError("NOT_FOUND", "Registration not found.", 404);
    }

    if (action === "verify") {
      if (reg.status === "CONFIRMED") {
        throw new RegistrationError("ALREADY_CONFIRMED", "This registration is already confirmed.", 409);
      }
      if (reg.registration_type === "ONSITE") {
        // On-site registrations pay at the venue — no UPI transaction id.
        // Mark the fee as collected (PAID_AT_VENUE).
        if (reg.payment_status === "VERIFIED") {
          throw new RegistrationError("ALREADY_VERIFIED", "Payment is already collected.", 409);
        }
        await q(`UPDATE participants SET status = 'CONFIRMED' WHERE id = $1`, [id]);
        await q(
          `UPDATE payments SET status = 'VERIFIED', verified_by = $1, verified_at = now(),
                  note = 'PAID_AT_VENUE'
           WHERE participant_id = $2`,
          [adminName, id],
        );
      } else {
        if (reg.payment_status !== "SUBMITTED" || !reg.txn_id) {
          throw new RegistrationError(
            "NO_TXN",
            "Cannot verify: no UPI transaction ID has been recorded for this registration yet.",
            400,
          );
        }
        await q(`UPDATE participants SET status = 'CONFIRMED' WHERE id = $1`, [id]);
        await q(
          `UPDATE payments SET status = 'VERIFIED', verified_by = $1, verified_at = now()
           WHERE participant_id = $2`,
          [adminName, id],
        );
      }
    } else {
      if (reg.payment_status === "VERIFIED") {
        throw new RegistrationError(
          "PAYMENT_VERIFIED",
          `Payment for ${reg.registration_id} is already verified. Refund it before ${action === "cancel" ? "cancelling" : "rejecting"}.`,
          409,
        );
      }
      const status: RegistrationStatus = action === "cancel" ? "CANCELLED" : "REJECTED";
      await q(`UPDATE participants SET status = $1 WHERE id = $2`, [status, id]);
      await q(
        `UPDATE payments SET status = 'FAILED', verified_by = $1
         WHERE participant_id = $2 AND status IN ('PENDING','SUBMITTED','PAY_AT_VENUE')`,
        [adminName, id],
      );
    }

    const { rows: upd } = await q<RegistrationRow>(
      `SELECT ${COLUMNS_SQL}
       FROM participants p
       LEFT JOIN payments pay ON pay.participant_id = p.id
       WHERE p.id = $1`,
      [id],
    );
    result = upd[0];
  });

  try {
    broadcastStats(await getStats(db));
  } catch {
    /* best-effort */
  }
  return result;
}