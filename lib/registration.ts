/**
 * Core registration logic.
 *
 * The seat allocation is atomic and happens entirely on the server inside a
 * single database transaction:
 *
 *   1. Acquire a transaction-scoped advisory lock so concurrent registration
 *      transactions serialize (works on both `pg` and PGlite).
 *   2. Read capacities from the `settings` table (DB is the source of truth).
 *   3. Count active registrations per mode and in total.
 *   4. Reject if the chosen mode (or total) is already at capacity.
 *   5. Reject duplicate active registrations for the same email.
 *   6. Atomically increment the registration id sequence (row lock).
 *   7. Insert the participant row.
 *
 * A BEFORE INSERT PL/pgSQL trigger (`enforce_capacity`) is a database-level
 * backstop that also raises SQLSTATE 45000 if a capacity would overflow, so the
 * invariant `online <= 20, onsite <= 10, total <= 30` can never be violated even
 * if the application check is bypassed.
 */
import { getDb, type DbAdapter, type QueryFn } from "./db";
import type { RegisterInput } from "./validation";
import { broadcastStats } from "./realtime";
import { getStats } from "./stats";

/** Advisory lock key (constant). pg_advisory_xact_lock(bigint). */
const REG_LOCK_KEY = 0x484b3226; // "HK26"

export class RegistrationError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export interface RegistrationResult {
  id: number;
  registration_id: string;
  full_name: string;
  email: string;
  participation_type: string;
  team_name: string | null;
  team_size: number;
  status: string;
  created_at: string;
}

interface Settings {
  onlineCap: number;
  onsiteCap: number;
  totalCap: number;
  regIdPrefix: string;
  registrationOpen: boolean;
}

async function readSettings(q: QueryFn): Promise<Settings> {
  const { rows } = await q<{ key: string; value: string }>(
    "SELECT key, value FROM settings WHERE key IN ('online_capacity','onsite_capacity','total_capacity','reg_id_prefix','registration_open')",
  );
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    onlineCap: Number(map.get("online_capacity") ?? "20"),
    onsiteCap: Number(map.get("onsite_capacity") ?? "10"),
    totalCap: Number(map.get("total_capacity") ?? "30"),
    regIdPrefix: map.get("reg_id_prefix") ?? "HK26",
    registrationOpen: /^(1|true|yes|on)$/i.test(map.get("registration_open") ?? "true"),
  };
}

function countsSql(): string {
  return `SELECT
    count(*) FILTER (WHERE participation_type = 'ONLINE' AND status NOT IN ('CANCELLED','REJECTED'))::int AS online,
    count(*) FILTER (WHERE participation_type = 'ONSITE' AND status NOT IN ('CANCELLED','REJECTED'))::int AS onsite,
    count(*) FILTER (WHERE status NOT IN ('CANCELLED','REJECTED'))::int AS total
    FROM participants`;
}

export interface RegisterOptions {
  broadcast?: boolean;
  adapter?: DbAdapter;
}

/**
 * Register a participant atomically.
 */
export async function registerParticipant(
  input: RegisterInput,
  opts: RegisterOptions = {},
): Promise<RegistrationResult> {
  const db = opts.adapter ?? (await getDb());

  let result!: RegistrationResult;
  await db.transaction(async (q) => {
    // 1. Serialize concurrent registration transactions.
    await q(`SELECT pg_advisory_xact_lock($1)`, [REG_LOCK_KEY]);

    // 2. Read capacities / open flag from the DB.
    const settings = await readSettings(q);
    if (!settings.registrationOpen) {
      throw new RegistrationError(
        "REGISTRATION_CLOSED",
        "Registration is closed. All available seats have been filled.",
        423,
      );
    }

    // 3. Live counts from the database (within the transaction).
    const { rows: countRows } = await q<{ online: number; onsite: number; total: number }>(
      countsSql(),
    );
    const counts = countRows[0] ?? { online: 0, onsite: 0, total: 0 };
    const online = Number(counts.online);
    const onsite = Number(counts.onsite);
    const total = Number(counts.total);

    // 4. Capacity check (server-side, transactional).
    if (input.participation_type === "ONLINE" && online >= settings.onlineCap) {
      throw new RegistrationError(
        "ONLINE_FULL",
        "Online registration is currently full. Please choose On-site if seats are available.",
        422,
      );
    }
    if (input.participation_type === "ONSITE" && onsite >= settings.onsiteCap) {
      throw new RegistrationError(
        "ONSITE_FULL",
        "On-site registration is currently full. Please choose Online if seats are available.",
        422,
      );
    }
    if (total >= settings.totalCap) {
      throw new RegistrationError(
        "TOTAL_FULL",
        "Registration is closed. All available seats have been filled.",
        423,
      );
    }

    // 5. Duplicate active email check.
    const { rows: dupRows } = await q<{ id: number }>(
      `SELECT id FROM participants
       WHERE email = $1 AND status NOT IN ('CANCELLED','REJECTED')
       LIMIT 1`,
      [input.email],
    );
    if (dupRows.length > 0) {
      throw new RegistrationError(
        "DUPLICATE_EMAIL",
        "This email is already registered.",
        409,
      );
    }

    // 6. Atomically increment the registration id sequence.
    await q(
      `INSERT INTO id_sequences(name, value) VALUES ('registration', 0)
       ON CONFLICT (name) DO NOTHING`,
    );
    const { rows: seqRows } = await q<{ value: number }>(
      `UPDATE id_sequences SET value = value + 1 WHERE name = 'registration' RETURNING value`,
    );
    const seq = Number(seqRows[0].value);
    const registrationId = `${settings.regIdPrefix}-${String(seq).padStart(4, "0")}`;

    // 7. Insert. The capacity trigger is the database-level backstop.
    const teamName = input.team_name && input.team_name.length > 0 ? input.team_name : null;
    const { rows: insRows } = await q<RegistrationResult>(
      `INSERT INTO participants
        (registration_id, full_name, email, phone, college, department, year,
         participation_type, team_name, team_size, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'CONFIRMED')
       RETURNING id, registration_id, full_name, email, participation_type,
                 team_name, team_size, status, created_at::text`,
      [
        registrationId,
        input.full_name,
        input.email,
        input.phone,
        input.college,
        input.department,
        input.year,
        input.participation_type,
        teamName,
        input.team_size,
      ],
    );

    result = insRows[0];
  }).catch((err: unknown) => {
    // Map database-level errors to friendly RegistrationErrors.
    throw mapDbError(err);
  });

  // Broadcast live stats AFTER the transaction has committed. Doing this
  // inside the transaction would deadlock PGlite's single-connection queue.
  if (opts.broadcast !== false) {
    try {
      const stats = await getStats(db);
      broadcastStats(stats);
    } catch {
      /* realtime is best-effort */
    }
  }

  return result;
}

/**
 * Map low-level database errors to friendly RegistrationError instances.
 */
export function mapDbError(err: unknown): unknown {
  if (err instanceof RegistrationError) return err;
  const e = err as { code?: string; message?: string };
  // PostgreSQL / PGlite error codes.
  switch (e.code) {
    case "45000": {
      const msg = e.message ?? "";
      if (msg.includes("ONLINE")) {
        return new RegistrationError(
          "ONLINE_FULL",
          "Online registration is currently full. Please choose On-site if seats are available.",
          422,
        );
      }
      if (msg.includes("ONSITE")) {
        return new RegistrationError(
          "ONSITE_FULL",
          "On-site registration is currently full. Please choose Online if seats are available.",
          422,
        );
      }
      return new RegistrationError(
        "TOTAL_FULL",
        "Registration is closed. All available seats have been filled.",
        423,
      );
    }
    case "23505": {
      const msg = e.message ?? "";
      if (msg.includes("uq_participants_active_email") || /email/i.test(msg)) {
        return new RegistrationError(
          "DUPLICATE_EMAIL",
          "This email is already registered.",
          409,
        );
      }
      if (msg.includes("uq_participants_registration_id") || /registration_id/i.test(msg)) {
        return new RegistrationError(
          "SERVER_ERROR",
          "Something went wrong while completing your registration. Please try again.",
          500,
        );
      }
      return new RegistrationError(
        "DUPLICATE_EMAIL",
        "This email is already registered.",
        409,
      );
    }
    case "23514": {
      return new RegistrationError(
        "VALIDATION",
        "Some of the provided details are invalid.",
        400,
      );
    }
  }
  return err;
}
