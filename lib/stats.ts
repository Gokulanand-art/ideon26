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
  updatedAt: string;
}

const COUNTS_SQL = `SELECT
  count(*) FILTER (WHERE participation_type = 'ONLINE' AND status NOT IN ('CANCELLED','REJECTED'))::int AS online,
  count(*) FILTER (WHERE participation_type = 'ONSITE' AND status NOT IN ('CANCELLED','REJECTED'))::int AS onsite,
  count(*) FILTER (WHERE status NOT IN ('CANCELLED','REJECTED'))::int AS total
  FROM participants`;

const SETTINGS_SQL = `SELECT key, value FROM settings
  WHERE key IN ('online_capacity','onsite_capacity','total_capacity','registration_open')`;

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
    updatedAt: new Date().toISOString(),
  };
}
