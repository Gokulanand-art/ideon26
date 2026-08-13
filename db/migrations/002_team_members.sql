-- ============================================================================
-- Schema v3 upgrade: team-based registrations (applied on top of v2).
--
--   * participants.team_size now 2–4 (teams only) with DEFAULT 2.
--   * New normalized `team_members` table (member_number 1 = team leader);
--     a statement-level trigger enforces member_count === team_size.
--   * payments.status gains PAY_AT_VENUE (public on-site registrations pay
--     at the venue; organizers mark them VERIFIED from the admin dashboard).
--   * The capacity trigger now measures PARTICIPANTS (SUM(team_size)) instead
--     of counting rows, checking the whole team atomically.
--
-- Everything below is idempotent so it also runs cleanly on a fresh install.
-- ============================================================================

BEGIN;

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
