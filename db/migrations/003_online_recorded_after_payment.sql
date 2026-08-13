-- 003: ONLINE seats are recorded only after payment is submitted/verified.
-- ONSITE seats are consumed at registration (pay at venue, no online payment).
BEGIN;

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