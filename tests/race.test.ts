import { describe, it, expect } from "vitest";
import { registerParticipant, RegistrationError, type RegistrationResult } from "@/lib/registration";
import { submitPaymentTxn } from "@/lib/registration";
import { getStats } from "@/lib/stats";
import { freshDb, makeInput } from "./helpers";

/**
 * Concurrency safety: fire many registration attempts simultaneously against
 * a single in-memory PostgreSQL (PGlite) engine. PGlite serializes writes on
 * its internal queue, and the advisory lock + capacity trigger guarantee the
 * capacity invariant can never be exceeded. Capacity is counted in TEAMS
 * (one registration = one team, any size), never participants.
 *
 * ONLINE seats are consumed only once payment is submitted/verified, so the
 * registration-time cap is enforced for ONSITE (and the total); the recorded
 * ONLINE count is bounded by payment submissions.
 */
describe("race condition", () => {
  it("records every concurrent online registration but consumes no slot until payment", async () => {
    const db = await freshDb();
    const attempts = 40; // 40 unpaid online teams hold no slots
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

    // Unpaid PENDING registrations hold no slots, so every attempt succeeds.
    const stats = await getStats(db);
    expect(fulfilled.length).toBe(attempts);
    expect(stats.online).toBe(0);
    expect(stats.onlineSeatsLeft).toBe(20);
    expect(stats.total).toBe(0);
  });

  it("never exceeds the on-site cap (10 teams) under concurrent attempts", async () => {
    const db = await freshDb();
    const attempts = 30; // 30 teams competing for 10 on-site team slots
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
    expect(stats.onsite).toBe(10); // exactly the capacity (10 teams)
    expect(fulfilled.length).toBe(10);
    expect(rejected.length).toBe(attempts - 10);

    // All rejections must be capacity errors, never arbitrary crashes.
    for (const r of rejected) {
      if (r.status === "rejected") {
        expect(r.reason).toBeInstanceOf(RegistrationError);
      }
    }
  });

  it("never exceeds total capacity with a mixed concurrent storm", async () => {
    const db = await freshDb();
    // Pre-fill 9 online teams (payments submitted) + 4 on-spot teams = 13 teams,
    // leaving 6 on-spot slots (10 - 4) and 17 total slots (30 - 13).
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
    // consume no slot until payment, so all 15 register; 6 on-spot slots remain
    // (4 of 10 pre-filled), so exactly 6 on-site teams fit.
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

    expect(ok).toBe(21); // 15 unpaid online + 6 on-site teams
    expect(stats.total).toBe(19); // 9 paid online + 4 + 6 on-site teams
    expect(stats.total).toBeLessThanOrEqual(30);
    expect(stats.online).toBe(9);
    expect(stats.onsite).toBe(10);
  });
});