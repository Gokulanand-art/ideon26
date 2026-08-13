import { describe, it, expect } from "vitest";
import { registerParticipant, RegistrationError, type RegistrationResult } from "@/lib/registration";
import { submitPaymentTxn } from "@/lib/registration";
import { getStats } from "@/lib/stats";
import { freshDb, makeInput } from "./helpers";

/**
 * Concurrency safety: fire many registration attempts simultaneously against
 * a single in-memory PostgreSQL (PGlite) engine. PGlite serializes writes on
 * its internal queue, and the advisory lock + capacity trigger guarantee the
 * capacity invariant can never be exceeded. All teams are 2 members, so the
 * capacity numbers are in PARTICIPANTS (20 online / 30 total).
 *
 * ONLINE seats are consumed only once payment is submitted/verified, so the
 * registration-time cap is enforced for ONSITE (and the total); the recorded
 * ONLINE count is bounded by payment submissions.
 */
describe("race condition", () => {
  it("records every concurrent online registration but consumes no seat until payment", async () => {
    const db = await freshDb();
    const attempts = 40; // 40 teams of 2 = 80 participants, none paid yet
    const results = await Promise.allSettled(
      Array.from({ length: attempts }, (_, i) =>
        registerParticipant(makeInput({ email: `race${i}@x.com`, team_size: 2 }), {
          adapter: db,
          broadcast: false,
        }),
      ),
    );

    const fulfilled = results.filter(
      (r): r is PromiseFulfilledResult<RegistrationResult> => r.status === "fulfilled",
    );

    // Unpaid PENDING registrations hold no seats, so every attempt succeeds.
    const stats = await getStats(db);
    expect(fulfilled.length).toBe(attempts);
    expect(stats.online).toBe(0);
    expect(stats.onlineSeatsLeft).toBe(20);
    expect(stats.total).toBe(0);
  });

  it("never exceeds the on-site cap (10 participants) under concurrent attempts", async () => {
    const db = await freshDb();
    const attempts = 30; // 30 teams of 2 = 60 participants competing for 10 on-site seats
    const results = await Promise.allSettled(
      Array.from({ length: attempts }, (_, i) =>
        registerParticipant(makeInput({ email: `race${i}@x.com`, team_size: 2 }), {
          adapter: db,
          broadcast: false,
          onsite: true,
        }),
      ),
    );

    const fulfilled = results.filter(
      (r): r is PromiseFulfilledResult<RegistrationResult> => r.status === "fulfilled",
    );
    const rejected = results.filter((r) => r.status === "rejected");

    const stats = await getStats(db);
    expect(stats.onsite).toBe(10); // exactly the capacity (5 teams × 2)
    expect(fulfilled.length).toBe(5);
    expect(rejected.length).toBe(attempts - 5);

    // All rejections must be capacity errors, never arbitrary crashes.
    for (const r of rejected) {
      if (r.status === "rejected") {
        expect(r.reason).toBeInstanceOf(RegistrationError);
      }
    }
  });

  it("never exceeds total capacity with a mixed concurrent storm", async () => {
    const db = await freshDb();
    // Pre-fill 18 online (9 teams × 2, payments submitted) + 8 on-spot (4 teams × 2)
    // = 26 recorded participants, leaving 4 seats (2 online, 2 on-spot) —
    // exactly one 2-member team per channel.
    for (let i = 0; i < 9; i++) {
      const r = await registerParticipant(makeInput({ email: `pre-o${i}@x.com`, team_size: 2 }), {
        adapter: db,
        broadcast: false,
      });
      await submitPaymentTxn(r.registration_id, `4102${String(i).padStart(7, "0")}`, {
        adapter: db,
      });
    }
    for (let i = 0; i < 4; i++) {
      await registerParticipant(makeInput({ email: `pre-s${i}@x.com`, team_size: 2 }), {
        adapter: db,
        broadcast: false,
        onsite: true,
      });
    }

    // 30 simultaneous 2-member teams (15 website + 15 on-spot). Online teams
    // consume no seat until payment, so all 15 register; only 2 on-site seats
    // remain (8 of 10 pre-filled), so exactly one on-site team fits.
    const attempts = await Promise.allSettled(
      Array.from({ length: 30 }, (_, i) =>
        registerParticipant(
          makeInput({
            email: `storm${i}@x.com`,
            team_size: 2,
          }),
          {
            adapter: db,
            broadcast: false,
            onsite: i % 2 === 0 ? false : true,
          },
        ),
      ),
    );
    const ok = attempts.filter((r) => r.status === "fulfilled").length;
    const stats = await getStats(db);

    expect(ok).toBe(16); // 15 unpaid online + 1 on-site team
    expect(stats.total).toBe(28); // 18 paid online + 8 + 2 on-site
    expect(stats.total).toBeLessThanOrEqual(30);
    expect(stats.online).toBe(18);
    expect(stats.onsite).toBe(10);
  });
});