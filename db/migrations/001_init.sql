-- ============================================================================
-- Hackathon Registration — initial schema
-- Database: PostgreSQL (compatible with PGlite embedded engine)
-- Applies: tables, constraints, indexes, settings, capacity trigger
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Settings table: single source of truth for capacities & event toggles.
-- The capacity trigger and the application both read from here so that the
-- capacity logic is always synchronized with the database constraints.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Registration id sequence (gapless, guarded by an advisory lock + row lock)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS id_sequences (
  name  text PRIMARY KEY,
  value integer NOT NULL DEFAULT 0
);

INSERT INTO id_sequences(name, value) VALUES ('registration', 0)
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Participants / registrations
-- ---------------------------------------------------------------------------
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

-- Unique registration id (database-level guarantee).
CREATE UNIQUE INDEX IF NOT EXISTS uq_participants_registration_id
  ON participants(registration_id);

-- One active registration per email. Re-registration allowed after CANCELLED/REJECTED.
CREATE UNIQUE INDEX IF NOT EXISTS uq_participants_active_email
  ON participants(email)
  WHERE status NOT IN ('CANCELLED','REJECTED');

-- Reporting / filtering indexes.
CREATE INDEX IF NOT EXISTS idx_participants_email        ON participants(email);
CREATE INDEX IF NOT EXISTS idx_participants_type         ON participants(participation_type);
CREATE INDEX IF NOT EXISTS idx_participants_status       ON participants(status);
CREATE INDEX IF NOT EXISTS idx_participants_created_at   ON participants(created_at DESC);

-- ---------------------------------------------------------------------------
-- Capacity enforcement trigger (database-level backstop).
-- Runs BEFORE INSERT and raises SQLSTATE 45000 when a capacity would overflow.
-- Active registrations = those not CANCELLED/REJECTED.
-- ---------------------------------------------------------------------------
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

-- Keep updated_at in sync.
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
