/**
 * Admin data access: list/search/filter registrations, update status.
 */
import { getDb } from "./db";
import { broadcastStats } from "./realtime";
import { getStats } from "./stats";
import type { RegistrationStatus } from "./validation";

export interface RegistrationRow {
  id: number;
  registration_id: string;
  full_name: string;
  email: string;
  phone: string;
  college: string;
  department: string;
  year: string;
  participation_type: string;
  team_name: string | null;
  team_size: number;
  status: string;
  created_at: string;
  updated_at: string;
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

export async function listRegistrations(params: ListParams): Promise<ListResult> {
  const db = await getDb();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 25));
  const offset = (page - 1) * limit;

  const where: string[] = [];
  const args: unknown[] = [];
  let argi = 1;

  const search = params.search?.trim();
  if (search) {
    where.push(
      `(full_name ILIKE $${argi} OR email ILIKE $${argi} OR registration_id ILIKE $${argi} OR team_name ILIKE $${argi} OR college ILIKE $${argi})`,
    );
    args.push(`%${search}%`);
    argi++;
  }
  if (params.mode && ALLOWED_MODES.has(params.mode)) {
    where.push(`participation_type = $${argi}`);
    args.push(params.mode);
    argi++;
  }
  if (params.status && ALLOWED_STATUSES.has(params.status)) {
    where.push(`status = $${argi}`);
    args.push(params.status);
    argi++;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const { rows: countRows } = await db.query<{ c: number }>(
    `SELECT count(*)::int AS c FROM participants ${whereSql}`,
    args,
  );
  const total = Number(countRows[0]?.c ?? 0);

  const { rows } = await db.query<RegistrationRow>(
    `SELECT id, registration_id, full_name, email, phone, college, department,
            year, participation_type, team_name, team_size, status,
            created_at::text AS created_at, updated_at::text AS updated_at
     FROM participants ${whereSql}
     ORDER BY created_at DESC
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

export async function getAllForExport(): Promise<RegistrationRow[]> {
  const db = await getDb();
  const { rows } = await db.query<RegistrationRow>(
    `SELECT id, registration_id, full_name, email, phone, college, department,
            year, participation_type, team_name, team_size, status,
            created_at::text AS created_at, updated_at::text AS updated_at
     FROM participants
     ORDER BY created_at ASC`,
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

export async function getRegistrationByPublicId(
  registrationId: string,
): Promise<Pick<
  RegistrationRow,
  "registration_id" | "full_name" | "participation_type" | "team_name" | "team_size" | "status" | "created_at"
> | null> {
  const db = await getDb();
  const { rows } = await db.query<RegistrationRow>(
    `SELECT registration_id, full_name, participation_type, team_name, team_size,
            status, created_at::text AS created_at
     FROM participants WHERE registration_id = $1 LIMIT 1`,
    [registrationId],
  );
  return rows[0] ?? null;
}

export async function updateStatus(
  id: number,
  status: RegistrationStatus,
): Promise<RegistrationRow | null> {
  const db = await getDb();
  const { rows } = await db.query<RegistrationRow>(
    `UPDATE participants SET status = $1 WHERE id = $2
     RETURNING id, registration_id, full_name, email, phone, college, department,
               year, participation_type, team_name, team_size, status,
               created_at::text AS created_at, updated_at::text AS updated_at`,
    [status, id],
  );
  const updated = rows[0] ?? null;
  if (updated) {
    try {
      broadcastStats(await getStats(db));
    } catch {
      /* best-effort */
    }
  }
  return updated;
}
