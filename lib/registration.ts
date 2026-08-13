/**
 * Core registration logic (team-based, paid, offline-only event).
 *
 * Seat allocation is atomic and happens entirely on the server inside a single
 * database transaction:
 *
 *   1. Acquire a transaction-scoped advisory lock so concurrent registration
 *      transactions serialize (works on both `pg` and PGlite).
 *   2. Read capacities / fee / UPI details from the `settings` table (the DB
 *      is the single source of truth).
 *   3. Count active PARTICIPANTS per channel and in total (SUM of team_size —
 *      never the number of teams).
 *   4. Reject if the whole team does not fit the channel (or total) capacity.
 *   5. Reject duplicate active registrations for the same email.
 *   6. Atomically increment the registration id sequence (row lock).
 *   7. Insert the participant row, its normalized team_members (leader +
 *      members — count must equal team_size), and its payment row
 *      (amount = team_size × fee_per_head, always server-computed).
 *
 * Payment states:
 *   ONLINE  → status PENDING, payment PENDING (UPI; participant submits txn id,
 *             organizer verifies).
 *   ONSITE  → public registrations: status PENDING, payment PAY_AT_VENUE
 *             (no payment UI anywhere; organizer marks VERIFIED after
 *             collecting at the venue). Organizer-created on-spot
 *             registrations (opts.onsite): CONFIRMED / VERIFIED (cash).
 *
 * A BEFORE INSERT PL/pgSQL trigger (`enforce_capacity`) is a database-level
 * backstop that also raises SQLSTATE 45000 if a capacity would overflow, and
 * a statement-level trigger (`enforce_team_members`) enforces that the number
 * of team_member rows equals team_size.
 */
import { getDb, type DbAdapter, type QueryFn } from "./db";
import type { RegisterInput } from "./validation";
import { broadcastStats } from "./realtime";
import { getStats } from "./stats";
import { appendRegistrationToSheets, updateRegistrationInSheets } from "./sheets";

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
  registration_type: string;
  team_name: string | null;
  team_size: number;
  status: string;
  created_at: string;
  /** Team leader name (member 1) followed by the other members' names. */
  member_names: string[];
  // Payment / fee info.
  amount: number;
  fee_per_head: number;
  upi_id: string;
  payee_name: string;
  payment_status: string;
}

interface Settings {
  onlineCap: number;
  onsiteCap: number;
  totalCap: number;
  regIdPrefix: string;
  registrationOpen: boolean;
  onsiteRegistrationOpen: boolean;
  feePerHead: number;
  upiId: string;
  payeeName: string;
}

async function readSettings(q: QueryFn): Promise<Settings> {
  const { rows } = await q<{ key: string; value: string }>(
    "SELECT key, value FROM settings WHERE key IN ('online_capacity','onsite_capacity','total_capacity','reg_id_prefix','registration_open','onsite_registration_open','fee_per_head','upi_id','payee_name')",
  );
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    onlineCap: Number(map.get("online_capacity") ?? "20"),
    onsiteCap: Number(map.get("onsite_capacity") ?? "10"),
    totalCap: Number(map.get("total_capacity") ?? "30"),
    regIdPrefix: map.get("reg_id_prefix") ?? "HK26",
    registrationOpen: /^(1|true|yes|on)$/i.test(map.get("registration_open") ?? "true"),
    onsiteRegistrationOpen: /^(1|true|yes|on)$/i.test(map.get("onsite_registration_open") ?? "false"),
    feePerHead: Number(map.get("fee_per_head") ?? "150"),
    upiId: map.get("upi_id") ?? "7449007050@ybl",
    payeeName: map.get("payee_name") ?? "HACKATHON",
  };
}

/**
 * Active PARTICIPANTS per channel and in total. Capacity is measured in
 * participants (SUM of team_size), never in teams.
 * ONLINE seats are consumed only once payment is submitted/verified; ONSITE
 * seats are consumed at registration (pay at venue, no online payment).
 */
function countsSql(): string {
  return `SELECT
    COALESCE(SUM(p.team_size) FILTER (
      WHERE p.registration_type = 'ONLINE'
        AND p.status NOT IN ('CANCELLED','REJECTED')
        AND EXISTS (SELECT 1 FROM payments pay
                    WHERE pay.participant_id = p.id
                      AND pay.status IN ('SUBMITTED','VERIFIED'))
    ), 0)::int AS online,
    COALESCE(SUM(p.team_size) FILTER (
      WHERE p.registration_type = 'ONSITE' AND p.status NOT IN ('CANCELLED','REJECTED')
    ), 0)::int AS onsite,
    COALESCE(SUM(p.team_size) FILTER (
      WHERE p.status NOT IN ('CANCELLED','REJECTED')
        AND (p.registration_type = 'ONSITE'
             OR EXISTS (SELECT 1 FROM payments pay
                        WHERE pay.participant_id = p.id
                          AND pay.status IN ('SUBMITTED','VERIFIED')))
    ), 0)::int AS total
    FROM participants p`;
}

export interface RegisterOptions {
  broadcast?: boolean;
  adapter?: DbAdapter;
  /** Create an organizer-entered on-spot registration (cash collected now). */
  onsite?: boolean;
  /** Public on-site registration: no payment UI, pay at the venue later. */
  payAtVenue?: boolean;
  /** Admin username performing an on-spot registration (recorded on payment). */
  adminUser?: string;
}

/**
 * Register a team atomically and create its member + payment records.
 *
 * Website (ONLINE) registrations: status PENDING, payment PENDING.
 * Public on-site registrations (opts.payAtVenue): status PENDING, payment
 *   PAY_AT_VENUE — the fee is collected at the venue, never on this page.
 * Organizer on-spot registrations (opts.onsite): status CONFIRMED, payment
 *   VERIFIED (cash already collected at the counter).
 */
export async function registerParticipant(
  input: RegisterInput,
  opts: RegisterOptions = {},
): Promise<RegistrationResult> {
  const db = opts.adapter ?? (await getDb());
  const onsite = opts.onsite === true;
  const payAtVenue = opts.payAtVenue === true;
  const registrationType: "ONLINE" | "ONSITE" = onsite || payAtVenue ? "ONSITE" : "ONLINE";

  let result!: RegistrationResult;
  await db.transaction(async (q) => {
    // 1. Serialize concurrent registration transactions.
    await q(`SELECT pg_advisory_xact_lock($1)`, [REG_LOCK_KEY]);

    // 2. Read capacities / fee / UPI details from the DB.
    const settings = await readSettings(q);
    if (!settings.registrationOpen) {
      throw new RegistrationError(
        "REGISTRATION_CLOSED",
        "Registration is closed. All available seats have been filled.",
        423,
      );
    }
    // Public on-site (pay-at-venue) registrations are gated by the channel
    // flag: seats remaining does NOT mean the channel is open.
    if (payAtVenue && !settings.onsiteRegistrationOpen) {
      throw new RegistrationError(
        "ONSITE_CLOSED",
        "On-site registration is currently closed. Only online registration is available.",
        403,
      );
    }

    // 3. Live participant counts from the database (within the transaction).
    const { rows: countRows } = await q<{ online: number; onsite: number; total: number }>(
      countsSql(),
    );
    const counts = countRows[0] ?? { online: 0, onsite: 0, total: 0 };
    const online = Number(counts.online);
    const onSiteCount = Number(counts.onsite);
    const total = Number(counts.total);

    // 4. Capacity check (server-side, transactional) — the WHOLE team must fit.
    if (registrationType === "ONSITE" && onSiteCount + input.team_size > settings.onsiteCap) {
      throw new RegistrationError(
        "ONSITE_FULL",
        `Only ${Math.max(0, settings.onsiteCap - onSiteCount)} on-site participant seats remain — a ${input.team_size}-member team cannot be registered on-site.`,
        422,
      );
    }
    if (registrationType === "ONLINE" && online + input.team_size > settings.onlineCap) {
      throw new RegistrationError(
        "ONLINE_FULL",
        `Only ${Math.max(0, settings.onlineCap - online)} online participant seats remain — a ${input.team_size}-member team cannot register online.`,
        422,
      );
    }
    if (total + input.team_size > settings.totalCap) {
      throw new RegistrationError(
        "TOTAL_FULL",
        `Registration is closed: only ${Math.max(0, settings.totalCap - total)} participant seats remain and a ${input.team_size}-member team needs ${input.team_size}.`,
        423,
      );
    }

    // 5. Duplicate active email check (includes unverified PENDING seats).
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
    // Team registration id, e.g. HK26-T001.
    const registrationId = `${settings.regIdPrefix}-T${String(seq).padStart(3, "0")}`;

    // 7. Insert the participant row. The capacity trigger is the DB-level backstop.
    const teamName = input.team_name && input.team_name.length > 0 ? input.team_name : null;
    const status = onsite ? "CONFIRMED" : "PENDING";
    const { rows: insRows } = await q<RegistrationResult>(
      `INSERT INTO participants
        (registration_id, full_name, email, phone, college, department, year,
         registration_type, team_name, team_size, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id, registration_id, full_name, email, registration_type,
                 team_name, team_size, status, created_at::text`,
      [
        registrationId,
        input.full_name,
        input.email,
        input.phone,
        input.college,
        input.department,
        input.year,
        registrationType,
        teamName,
        input.team_size,
        status,
      ],
    );
    const participantId = insRows[0].id;

    // 8. Normalized team members — leader is member 1. All rows inserted in a
    //    single statement so the statement-level count trigger validates.
    const memberRows: Array<{ num: number; name: string; leader: boolean }> = [
      { num: 1, name: input.full_name, leader: true },
      ...input.member_names.map((name, i) => ({ num: i + 2, name, leader: false })),
    ];
    await q(
      `INSERT INTO team_members (participant_id, member_number, member_name, is_team_leader)
       SELECT $1, m.num, m.name, m.leader FROM jsonb_to_recordset($2::jsonb) AS m(num int, name text, leader bool)`,
      [
        participantId,
        JSON.stringify(memberRows.map((m) => ({ num: m.num, name: m.name, leader: m.leader }))),
      ],
    );

    // 9. Payment record. Fee is per head: amount = team_size × fee_per_head,
    //    computed here — never trusted from the browser.
    const amount = settings.feePerHead * input.team_size;
    const paymentStatus = onsite ? "VERIFIED" : payAtVenue ? "PAY_AT_VENUE" : "PENDING";
    const paymentNote = onsite ? "CASH" : payAtVenue ? "PAY_AT_VENUE" : null;
    const { rows: payRows } = await q<{ status: string }>(
      `INSERT INTO payments (participant_id, amount, status, note, verified_by, verified_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING status`,
      [
        participantId,
        amount,
        paymentStatus,
        paymentNote,
        onsite ? opts.adminUser ?? null : null,
        onsite ? new Date().toISOString() : null,
      ],
    );

    result = {
      ...insRows[0],
      member_names: memberRows.map((m) => m.name),
      amount,
      fee_per_head: settings.feePerHead,
      upi_id: settings.upiId,
      payee_name: settings.payeeName,
      payment_status: payRows[0].status,
    };
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

  // Google Sheets sync (best-effort, never blocks registration).
  appendRegistrationToSheets({
    registration_id: result.registration_id,
    full_name: result.full_name,
    email: result.email,
    phone: input.phone,
    college: input.college,
    department: input.department,
    year: input.year,
    team_name: input.team_name ?? null,
    team_size: result.team_size,
    members: result.member_names.join(", "),
    registration_type: result.registration_type,
    status: result.status,
    payment_status: result.payment_status,
    amount: result.amount,
    txn_id: null,
    verified_by: opts.onsite ? opts.adminUser ?? null : null,
    created_at: result.created_at,
  });

  return result;
}

/**
 * Record the UPI transaction id submitted by a participant after paying.
 * ONLINE only: the payment moves PENDING → SUBMITTED; an organizer still has
 * to verify it against their UPI app before the seat is CONFIRMED.
 */
export async function submitPaymentTxn(
  registrationId: string,
  txnId: string,
  opts: { adapter?: DbAdapter } = {},
): Promise<{ registration_id: string; payment_status: string }> {
  const db = opts.adapter ?? (await getDb());

  try {
    const { rows } = await db.query<{
      id: number;
      status: string;
      registration_type: string;
      payment_status: string;
    }>(
      `SELECT p.id, p.status, p.registration_type, pay.status AS payment_status
       FROM participants p
       LEFT JOIN payments pay ON pay.participant_id = p.id
       WHERE p.registration_id = $1
       LIMIT 1`,
      [registrationId],
    );
    const reg = rows[0];
    if (!reg) {
      throw new RegistrationError("NOT_FOUND", "Registration not found.", 404);
    }
    if (reg.registration_type === "ONSITE") {
      throw new RegistrationError(
        "PAY_AT_VENUE",
        "On-site registrations pay at the venue — no UPI payment is required.",
        409,
      );
    }
    if (reg.status !== "PENDING") {
      throw new RegistrationError(
        "NOT_OPEN",
        "Payment verification is not open for this registration.",
        409,
      );
    }
    if (reg.payment_status === "VERIFIED") {
      throw new RegistrationError("ALREADY_VERIFIED", "This payment is already verified.", 409);
    }

    const { rows: upd } = await db.query<{ payment_status: string }>(
      `UPDATE payments SET txn_id = $1, status = 'SUBMITTED'
       WHERE participant_id = $2
       RETURNING status AS payment_status`,
      [txnId, reg.id],
    );
    updateRegistrationInSheets(registrationId, {
      payment_status: upd[0].payment_status,
      txn_id: txnId,
    });
    return { registration_id: registrationId, payment_status: upd[0].payment_status };
  } catch (err) {
    throw mapDbError(err);
  }
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
      if (msg.includes("TEAM_MEMBERS_MISMATCH")) {
        return new RegistrationError(
          "TEAM_MEMBERS_MISMATCH",
          "Team member details could not be saved. Please try again.",
          400,
        );
      }
      if (msg.includes("ONLINE")) {
        return new RegistrationError(
          "ONLINE_FULL",
          "Online registration is currently full — the whole team could not be seated.",
          422,
        );
      }
      if (msg.includes("ONSITE")) {
        return new RegistrationError(
          "ONSITE_FULL",
          "On-spot registration is full — the whole team could not be seated.",
          422,
        );
      }
      return new RegistrationError(
        "TOTAL_FULL",
        "Registration is closed. All available participant seats have been filled.",
        423,
      );
    }
    case "23505": {
      const msg = e.message ?? "";
      if (msg.includes("uq_payments_txn_id") || /txn_id/i.test(msg)) {
        return new RegistrationError(
          "DUPLICATE_TXN",
          "This UPI transaction ID has already been used.",
          409,
        );
      }
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

// Re-export used by tests / admin flows.
export type { QueryFn };
