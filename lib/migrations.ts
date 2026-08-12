/**
 * Embedded migrations.
 *
 * The canonical SQL lives in db/migrations/001_init.sql for documentation and
 * manual application (e.g. against Supabase/Postgres via psql). The same SQL is
 * embedded here so the runtime migration runner works without filesystem access
 * to the .sql files (important for serverless/bundled deployments).
 *
 * IMPORTANT: keep this string in sync with db/migrations/001_init.sql.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export interface Migration {
  name: string;
  sql: string;
}

// Read the canonical SQL file at runtime from the repo for local dev, with the
// embedded copy below as a fallback for bundled/serverless environments.
const embedded = `BEGIN;

CREATE TABLE IF NOT EXISTS settings (
  key   text PRIMARY KEY,
  value text NOT NULL
);

INSERT INTO settings(key, value) VALUES
  ('online_capacity',     '20'),
  ('onsite_capacity',     '10'),
  ('total_capacity',      '30'),
  ('registration_open',   'true'),
  ('reg_id_prefix',       'HK26')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS id_sequences (
  name  text PRIMARY KEY,
  value integer NOT NULL DEFAULT 0
);

INSERT INTO id_sequences(name, value) VALUES ('registration', 0)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS participants (
  id                bigserial PRIMARY KEY,
  registration_id   text NOT NULL,
  full_name         text NOT NULL,
  email             text NOT NULL,
  phone             text NOT NULL,
  college           text NOT NULL,
  department        text NOT NULL,
  year              text NOT NULL,
  participation_type text NOT NULL CHECK (participation_type IN ('ONLINE','ONSITE')),
  team_name         text,
  team_size         integer NOT NULL DEFAULT 1 CHECK (team_size >= 1 AND team_size <= 6),
  status            text NOT NULL DEFAULT 'CONFIRMED'
                    CHECK (status IN ('PENDING','CONFIRMED','CANCELLED','REJECTED')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_participants_registration_id
  ON participants(registration_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_participants_active_email
  ON participants(email)
  WHERE status NOT IN ('CANCELLED','REJECTED');

CREATE INDEX IF NOT EXISTS idx_participants_email        ON participants(email);
CREATE INDEX IF NOT EXISTS idx_participants_type         ON participants(participation_type);
CREATE INDEX IF NOT EXISTS idx_participants_status       ON participants(status);
CREATE INDEX IF NOT EXISTS idx_participants_created_at   ON participants(created_at DESC);

CREATE OR REPLACE FUNCTION enforce_capacity() RETURNS trigger AS $$
DECLARE
  mode_cap  integer;
  total_cap integer;
  mode_cnt  integer;
  total_cnt integer;
BEGIN
  SELECT value::integer INTO mode_cap
    FROM settings WHERE key = CASE WHEN NEW.participation_type = 'ONLINE'
                                   THEN 'online_capacity' ELSE 'onsite_capacity' END;
  SELECT value::integer INTO total_cap
    FROM settings WHERE key = 'total_capacity';

  SELECT count(*)::integer INTO mode_cnt
    FROM participants
    WHERE participation_type = NEW.participation_type
      AND status NOT IN ('CANCELLED','REJECTED');

  SELECT count(*)::integer INTO total_cnt
    FROM participants
    WHERE status NOT IN ('CANCELLED','REJECTED');

  IF mode_cnt >= mode_cap THEN
    RAISE EXCEPTION 'CAPACITY_EXCEEDED:%', NEW.participation_type
      USING ERRCODE = '45000';
  END IF;

  IF total_cnt >= total_cap THEN
    RAISE EXCEPTION 'CAPACITY_EXCEEDED:TOTAL'
      USING ERRCODE = '45000';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_capacity ON participants;
CREATE TRIGGER trg_enforce_capacity
  BEFORE INSERT ON participants
  FOR EACH ROW
  EXECUTE FUNCTION enforce_capacity();

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_updated_at ON participants;
CREATE TRIGGER trg_touch_updated_at
  BEFORE UPDATE ON participants
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

COMMIT;
`;

function loadMigrations(): Migration[] {
  const name = "001_init.sql";
  const fileUrl = path.join(process.cwd(), "db", "migrations", name);
  try {
    const sql = readFileSync(fileUrl, "utf8");
    return [{ name, sql }];
  } catch {
    return [{ name, sql: embedded }];
  }
}

export const migrations: Migration[] = loadMigrations();
