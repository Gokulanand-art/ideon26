/**
 * Embedded migrations.
 *
 * The canonical SQL lives in db/migrations/001_init.sql (schema v3, team-based)
 * and db/migrations/002_team_members.sql (idempotent v2→v3 upgrade) for
 * documentation and manual application (e.g. against Supabase/Postgres via
 * psql). The same SQL is embedded here so the runtime migration runner works
 * without filesystem access to the .sql files (important for serverless/bundled
 * deployments). Migration 003_online_recorded_after_payment.sql (v3→v4, online
 * counts once payment is submitted/verified) and 004_teams_capacity.sql
 * (v4→v5, capacity counted in teams) follow the same pattern.
 *
 * IMPORTANT: keep these strings in sync with db/migrations/*.sql.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

export interface Migration {
  name: string;
  sql: string;
}

// Read the canonical SQL files at runtime from the repo for local dev, with the
// embedded copies below as a fallback for bundled/serverless environments.
const embedded001 = `BEGIN;

CREATE TABLE IF NOT EXISTS settings (
  key   text PRIMARY KEY,
  value text NOT NULL
);

INSERT INTO settings(key, value) VALUES
  ('online_capacity',     '20'),
  ('onsite_capacity',     '10'),
  ('total_capacity',      '30'),
  ('registration_open',   'true'),
  ('onsite_registration_open', 'false'),
  ('reg_id_prefix',       'IDEON26'),
  ('fee_per_head',        '150'),
  ('upi_id',              'prathipa1991-1@okaxis'),
  ('payee_name',          'HACKATHON')
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
  registration_type text NOT NULL CHECK (registration_type IN ('ONLINE','ONSITE')),
  team_name         text,
  team_size         integer NOT NULL DEFAULT 2 CHECK (team_size >= 2 AND team_size <= 4),
  status            text NOT NULL DEFAULT 'PENDING'
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
CREATE INDEX IF NOT EXISTS idx_participants_type         ON participants(registration_type);
CREATE INDEX IF NOT EXISTS idx_participants_status       ON participants(status);
CREATE INDEX IF NOT EXISTS idx_participants_created_at   ON participants(created_at DESC);

CREATE TABLE IF NOT EXISTS team_members (
  id             bigserial PRIMARY KEY,
  participant_id bigint NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  member_number  integer NOT NULL CHECK (member_number >= 1 AND member_number <= 4),
  member_name    text NOT NULL,
  is_team_leader boolean NOT NULL DEFAULT false,
  UNIQUE (participant_id, member_number)
);

CREATE INDEX IF NOT EXISTS idx_team_members_participant
  ON team_members(participant_id);

CREATE TABLE IF NOT EXISTS payments (
  id             bigserial PRIMARY KEY,
  participant_id bigint NOT NULL UNIQUE REFERENCES participants(id) ON DELETE CASCADE,
  amount         integer NOT NULL CHECK (amount > 0),
  status         text NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING','SUBMITTED','VERIFIED','FAILED','PAY_AT_VENUE')),
  txn_id         text,
  note           text,
  verified_by    text,
  verified_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_txn_id
  ON payments(txn_id)
  WHERE txn_id IS NOT NULL AND status <> 'FAILED';

CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE OR REPLACE FUNCTION enforce_capacity() RETURNS trigger AS $$
DECLARE
  mode_cap  integer;
  total_cap integer;
  mode_cnt  integer;
  total_cnt integer;
BEGIN
  SELECT value::integer INTO mode_cap
    FROM settings WHERE key = CASE WHEN NEW.registration_type = 'ONLINE'
                                   THEN 'online_capacity' ELSE 'onsite_capacity' END;
  SELECT value::integer INTO total_cap
    FROM settings WHERE key = 'total_capacity';

  SELECT count(*)::integer INTO mode_cnt
    FROM participants
    WHERE registration_type = NEW.registration_type
      AND status NOT IN ('CANCELLED','REJECTED')
      AND (NEW.registration_type = 'ONSITE'
           OR EXISTS (SELECT 1 FROM payments pay
                      WHERE pay.participant_id = participants.id
                        AND pay.status IN ('SUBMITTED','VERIFIED')));

  SELECT count(*)::integer INTO total_cnt
    FROM participants
    WHERE status NOT IN ('CANCELLED','REJECTED')
      AND (registration_type = 'ONSITE'
           OR EXISTS (SELECT 1 FROM payments pay
                      WHERE pay.participant_id = participants.id
                        AND pay.status IN ('SUBMITTED','VERIFIED')));

  IF mode_cnt + 1 > mode_cap THEN
    RAISE EXCEPTION 'CAPACITY_EXCEEDED:%', NEW.registration_type
      USING ERRCODE = '45000';
  END IF;

  IF total_cnt + 1 > total_cap THEN
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

CREATE OR REPLACE FUNCTION enforce_team_members() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM participants p
    WHERE (SELECT count(*) FROM team_members tm WHERE tm.participant_id = p.id) <> p.team_size
  ) THEN
    RAISE EXCEPTION 'TEAM_MEMBERS_MISMATCH: member count must equal team_size'
      USING ERRCODE = '45000';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_team_members ON team_members;
CREATE TRIGGER trg_enforce_team_members
  AFTER INSERT OR DELETE ON team_members
  FOR EACH STATEMENT
  EXECUTE FUNCTION enforce_team_members();

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

DROP TRIGGER IF EXISTS trg_touch_payments_updated_at ON payments;
CREATE TRIGGER trg_touch_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

COMMIT;
`;

const embedded002 = `BEGIN;

-- 1. Team size: teams only (2–4).
ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_team_size_check;
ALTER TABLE participants ADD CONSTRAINT participants_team_size_check
  CHECK (team_size >= 2 AND team_size <= 4);
ALTER TABLE participants ALTER COLUMN team_size SET DEFAULT 2;

-- 2. Payments: allow PAY_AT_VENUE status.
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('PENDING','SUBMITTED','VERIFIED','FAILED','PAY_AT_VENUE'));

-- 3. Normalized team members.
CREATE TABLE IF NOT EXISTS team_members (
  id             bigserial PRIMARY KEY,
  participant_id bigint NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  member_number  integer NOT NULL CHECK (member_number >= 1 AND member_number <= 4),
  member_name    text NOT NULL,
  is_team_leader boolean NOT NULL DEFAULT false,
  UNIQUE (participant_id, member_number)
);

CREATE INDEX IF NOT EXISTS idx_team_members_participant
  ON team_members(participant_id);

-- 4. Capacity in PARTICIPANTS (SUM of team_size), whole team checked atomically.
CREATE OR REPLACE FUNCTION enforce_capacity() RETURNS trigger AS $$
DECLARE
  mode_cap  integer;
  total_cap integer;
  mode_cnt  integer;
  total_cnt integer;
BEGIN
  SELECT value::integer INTO mode_cap
    FROM settings WHERE key = CASE WHEN NEW.registration_type = 'ONLINE'
                                   THEN 'online_capacity' ELSE 'onsite_capacity' END;
  SELECT value::integer INTO total_cap
    FROM settings WHERE key = 'total_capacity';

  SELECT COALESCE(SUM(team_size), 0)::integer INTO mode_cnt
    FROM participants
    WHERE registration_type = NEW.registration_type
      AND status NOT IN ('CANCELLED','REJECTED');

  SELECT COALESCE(SUM(team_size), 0)::integer INTO total_cnt
    FROM participants
    WHERE status NOT IN ('CANCELLED','REJECTED');

  IF mode_cnt + NEW.team_size > mode_cap THEN
    RAISE EXCEPTION 'CAPACITY_EXCEEDED:%', NEW.registration_type
      USING ERRCODE = '45000';
  END IF;

  IF total_cnt + NEW.team_size > total_cap THEN
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

-- 5. Team member count must equal team_size (statement-level, so a single
--    multi-row INSERT with leader + all members validates atomically).
CREATE OR REPLACE FUNCTION enforce_team_members() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM participants p
    WHERE (SELECT count(*) FROM team_members tm WHERE tm.participant_id = p.id) <> p.team_size
  ) THEN
    RAISE EXCEPTION 'TEAM_MEMBERS_MISMATCH: member count must equal team_size'
      USING ERRCODE = '45000';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_team_members ON team_members;
CREATE TRIGGER trg_enforce_team_members
  AFTER INSERT OR DELETE ON team_members
  FOR EACH STATEMENT
  EXECUTE FUNCTION enforce_team_members();

COMMIT;
`;

const embedded003 = `BEGIN;

CREATE OR REPLACE FUNCTION enforce_capacity() RETURNS trigger AS $$
DECLARE
  mode_cap  integer;
  total_cap integer;
  mode_cnt  integer;
  total_cnt integer;
BEGIN
  SELECT value::integer INTO mode_cap
    FROM settings WHERE key = CASE WHEN NEW.registration_type = 'ONLINE'
                                   THEN 'online_capacity' ELSE 'onsite_capacity' END;
  SELECT value::integer INTO total_cap
    FROM settings WHERE key = 'total_capacity';

  SELECT COALESCE(SUM(p.team_size), 0)::integer INTO mode_cnt
    FROM participants p
    WHERE p.registration_type = NEW.registration_type
      AND p.status NOT IN ('CANCELLED','REJECTED')
      AND (NEW.registration_type = 'ONSITE'
           OR EXISTS (SELECT 1 FROM payments pay
                      WHERE pay.participant_id = p.id
                        AND pay.status IN ('SUBMITTED','VERIFIED')));

  SELECT COALESCE(SUM(p.team_size), 0)::integer INTO total_cnt
    FROM participants p
    WHERE p.status NOT IN ('CANCELLED','REJECTED')
      AND (p.registration_type = 'ONSITE'
           OR EXISTS (SELECT 1 FROM payments pay
                      WHERE pay.participant_id = p.id
                        AND pay.status IN ('SUBMITTED','VERIFIED')));

  IF mode_cnt + NEW.team_size > mode_cap THEN
    RAISE EXCEPTION 'CAPACITY_EXCEEDED:%', NEW.registration_type
      USING ERRCODE = '45000';
  END IF;

  IF total_cnt + NEW.team_size > total_cap THEN
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

COMMIT;
`;

const embedded004 = `BEGIN;

-- Capacity is measured in TEAMS (COUNT of registrations), not participants
-- (SUM of team_size). The whole team is checked atomically: mode_cnt + 1 > cap.
-- ONLINE seats are consumed only once payment is submitted/verified; ONSITE
-- seats are consumed at registration (pay at venue, no online payment).

CREATE OR REPLACE FUNCTION enforce_capacity() RETURNS trigger AS $$
DECLARE
  mode_cap  integer;
  total_cap integer;
  mode_cnt  integer;
  total_cnt integer;
BEGIN
  SELECT value::integer INTO mode_cap
    FROM settings WHERE key = CASE WHEN NEW.registration_type = 'ONLINE'
                                   THEN 'online_capacity' ELSE 'onsite_capacity' END;
  SELECT value::integer INTO total_cap
    FROM settings WHERE key = 'total_capacity';

  SELECT count(*)::integer INTO mode_cnt
    FROM participants
    WHERE registration_type = NEW.registration_type
      AND status NOT IN ('CANCELLED','REJECTED')
      AND (NEW.registration_type = 'ONSITE'
           OR EXISTS (SELECT 1 FROM payments pay
                      WHERE pay.participant_id = participants.id
                        AND pay.status IN ('SUBMITTED','VERIFIED')));

  SELECT count(*)::integer INTO total_cnt
    FROM participants
    WHERE status NOT IN ('CANCELLED','REJECTED')
      AND (registration_type = 'ONSITE'
           OR EXISTS (SELECT 1 FROM payments pay
                      WHERE pay.participant_id = participants.id
                        AND pay.status IN ('SUBMITTED','VERIFIED')));

  IF mode_cnt + 1 > mode_cap THEN
    RAISE EXCEPTION 'CAPACITY_EXCEEDED:%', NEW.registration_type
      USING ERRCODE = '45000';
  END IF;

  IF total_cnt + 1 > total_cap THEN
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

COMMIT;
`;

function loadMigrations(): Migration[] {
  const files = [
    "001_init.sql",
    "002_team_members.sql",
    "003_online_recorded_after_payment.sql",
    "004_teams_capacity.sql",
  ];
  const embedded: Record<string, string> = {
    "001_init.sql": embedded001,
    "002_team_members.sql": embedded002,
    "003_online_recorded_after_payment.sql": embedded003,
    "004_teams_capacity.sql": embedded004,
  };
  return files.map((name) => {
    const fileUrl = path.join(process.cwd(), "db", "migrations", name);
    try {
      return { name, sql: readFileSync(fileUrl, "utf8") };
    } catch {
      return { name, sql: embedded[name] };
    }
  });
}

export const migrations: Migration[] = loadMigrations();
