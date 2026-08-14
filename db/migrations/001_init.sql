-- ============================================================================
-- Hackathon Registration — schema v3 (team-based, paid)
-- Database: PostgreSQL (compatible with PGlite embedded engine)
--
-- Rules:
--   * Team-based ONLY. Every registration is a team of 2–4 members
--     (team leader + members). The team leader's name/email is the primary
--     contact. All member names are stored normalized in `team_members`.
--   * Participation mode: ONLINE (registered through the website, cap 20
--     participants) or ONSITE (registered at the venue / for the venue,
--     cap 10 teams). Total cap 30 TEAMS — not participants.
--   * Paid entry: fee per head (settings.fee_per_head, default ₹150). Total
--     payable = team_size × fee_per_head, always computed server-side.
--   * ONLINE registrations start as status PENDING with a payment row
--     (PENDING). After the participant pays via UPI and submits the UPI
--     transaction id, payment becomes SUBMITTED; an organizer verifies it
--     (payment → VERIFIED, participant → CONFIRMED).
--   * ONSITE registrations never show a payment UI. Public on-site
--     registrations are created PENDING with payment status PAY_AT_VENUE;
--     the organizer marks them VERIFIED (cash collected) from the admin
--     dashboard. Organizer-created on-spot registrations are created
--     CONFIRMED / VERIFIED immediately.
--   * Active participants = SUM(team_size) of registrations with status
--     NOT IN ('CANCELLED','REJECTED'), so PENDING seats hold capacity.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Settings table: single source of truth for capacities, fees and toggles.
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
  ('onsite_registration_open', 'false'),
  ('reg_id_prefix',       'IDEON26'),
  ('fee_per_head',        '150'),
  ('upi_id',              'prathipa1991-1@okaxis'),
  ('payee_name',          'HACKATHON')
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
-- Registrations (one row per team)
-- registration_type: ONLINE = registered through the website,
--                    ONSITE  = registered for/at the venue.
-- team_size is the number of PARTICIPANTS in the team: 2–4 enforced here.
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
  registration_type text NOT NULL CHECK (registration_type IN ('ONLINE','ONSITE')),
  team_name         text,
  team_size         integer NOT NULL DEFAULT 2 CHECK (team_size >= 2 AND team_size <= 4),
  status            text NOT NULL DEFAULT 'PENDING'
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
CREATE INDEX IF NOT EXISTS idx_participants_type         ON participants(registration_type);
CREATE INDEX IF NOT EXISTS idx_participants_status       ON participants(status);
CREATE INDEX IF NOT EXISTS idx_participants_created_at   ON participants(created_at DESC);

-- ---------------------------------------------------------------------------
-- Team members — normalized. member_number 1 = team leader.
-- The number of member rows must equal participants.team_size (enforced by
-- the statement-level trigger below).
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Payments. One row per registration. Website registrations are created with
-- status PENDING (amount = team_size × fee_per_head); on-spot registrations
-- created by organizers are VERIFIED (cash at counter); public on-site
-- registrations are PAY_AT_VENUE until the organizer collects the fee.
-- A UPI transaction id may only be used once across all active payments.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Capacity enforcement trigger (database-level backstop).
-- Runs BEFORE INSERT and raises SQLSTATE 45000 when a capacity would overflow.
-- Capacity is measured in TEAMS (COUNT of registrations), never participants.
-- The whole team is checked atomically: mode_cnt + 1 > cap.
-- ONLINE seats are consumed only once payment is submitted/verified; ONSITE
-- seats are consumed at registration (pay at venue, no online payment).
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Team member count must equal team_size. Statement-level AFTER trigger so a
-- single multi-row INSERT (leader + all members together) validates atomically.
-- ---------------------------------------------------------------------------
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

DROP TRIGGER IF EXISTS trg_touch_payments_updated_at ON payments;
CREATE TRIGGER trg_touch_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

COMMIT;
