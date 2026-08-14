import { getDb, type DbAdapter } from "./db";

export interface Stats {
  total: number;
  online: number;
  onsite: number;
  onlineCapacity: number;
  onsiteCapacity: number;
  totalCapacity: number;
  onlineSeatsLeft: number;
  onsiteSeatsLeft: number;
  totalSeatsLeft: number;
  onlineFull: boolean;
  onsiteFull: boolean;
  full: boolean;
  registrationOpen: boolean;
  /** On-spot channel availability — independent of seats left. */
  onsiteOpen: boolean;
  updatedAt: string;
}

// Capacity is measured in PARTICIPANTS (SUM of team_size), never teams.
// ONLINE seats are consumed only once payment is submitted/verified (SUBMITTED
// or VERIFIED) — a registration with an unpaid PENDING payment holds no seat.
// ONSITE seats are consumed at registration (pay at venue, no online payment).
const COUNTS_SQL = `SELECT
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

const SETTINGS_SQL = `SELECT key, value FROM settings
  WHERE key IN ('online_capacity','onsite_capacity','total_capacity','registration_open','onsite_registration_open')`;

export async function getStats(adapter?: DbAdapter): Promise<Stats> {
  const db = adapter ?? (await getDb());
  const [{ rows: countRows }, { rows: settingRows }] = await Promise.all([
    db.query<{ online: number; onsite: number; total: number }>(COUNTS_SQL),
    db.query<{ key: string; value: string }>(SETTINGS_SQL),
  ]);

  const map = new Map(settingRows.map((r) => [r.key, r.value]));
  const onlineCapacity = Number(map.get("online_capacity") ?? "20");
  const onsiteCapacity = Number(map.get("onsite_capacity") ?? "10");
  const totalCapacity = Number(map.get("total_capacity") ?? "30");
  const registrationOpen = /^(1|true|yes|on)$/i.test(map.get("registration_open") ?? "true");
  const onsiteOpen = /^(1|true|yes|on)$/i.test(map.get("onsite_registration_open") ?? "true");

  const c = countRows[0] ?? { online: 0, onsite: 0, total: 0 };
  const online = Number(c.online);
  const onsite = Number(c.onsite);
  const total = Number(c.total);

  const onlineSeatsLeft = Math.max(0, onlineCapacity - online);
  const onsiteSeatsLeft = Math.max(0, onsiteCapacity - onsite);
  const totalSeatsLeft = Math.max(0, totalCapacity - total);

  return {
    total,
    online,
    onsite,
    onlineCapacity,
    onsiteCapacity,
    totalCapacity,
    onlineSeatsLeft,
    onsiteSeatsLeft,
    totalSeatsLeft,
    onlineFull: online >= onlineCapacity,
    onsiteFull: onsite >= onsiteCapacity,
    full: total >= totalCapacity,
    registrationOpen,
    onsiteOpen,
    updatedAt: new Date().toISOString(),
  };
}
