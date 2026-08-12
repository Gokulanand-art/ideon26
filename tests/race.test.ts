import { describe, it, expect } from "vitest";
import { registerParticipant, RegistrationError, type RegistrationResult } from "@/lib/registration";
import { getStats } from "@/lib/stats";
import { freshDb, makeInput } from "./helpers";

/**
 * Concurrency safety: fire many registration attempts simultaneously against
 * a single in-memory PostgreSQL (PGlite) engine. PGlite serializes writes on
 * its internal queue, and the advisory lock + capacity trigger guarantee the
 * capacity invariant can never be exceeded.
 */
describe("race condition", () => {
  it("never exceeds online capacity under concurrent attempts", async () => {
    const db = await freshDb();
    const attempts = 40; // 40 concurrent, only 20 online seats
    const results = await Promise.allSettled(
      Array.from({ length: attempts }, (_, i) =>
        registerParticipant(
          makeInput({ participation_type: "ONLINE", email: `race${i}@x.com` }),
          { adapter: db, broadcast: false },
        ),
      ),
    );

    const fulfilled = results.filter(
      (r): r is PromiseFulfilledResult<RegistrationResult> =>
        r.status === "fulfilled",
    );
    const rejected = results.filter((r) => r.status === "rejected");

    const stats = await getStats(db);
    expect(stats.online).toBe(20); // exactly the capacity
    expect(stats.online).toBeLessThanOrEqual(20);
    expect(stats.total).toBeLessThanOrEqual(30);
    expect(fulfilled.length).toBe(20);
    expect(rejected.length).toBe(attempts - 20);

    // All rejections must be capacity errors, never arbitrary crashes.
    for (const r of rejected) {
      if (r.status === "rejected") {
        expect(r.reason).toBeInstanceOf(RegistrationError);
      }
    }
  });

  it("never exceeds total capacity with a mixed concurrent storm", async () => {
    const db = await freshDb();
    // Pre-fill 18 online + 9 on-site = 27, leaving 3 seats total.
    for (let i = 0; i < 18; i++) {
      await registerParticipant(
        makeInput({ participation_type: "ONLINE", email: `pre-o${i}@x.com` }),
        { adapter: db, broadcast: false },
      );
    }
    for (let i = 0; i < 9; i++) {
      await registerParticipant(
        makeInput({ participation_type: "ONSITE", email: `pre-s${i}@x.com` }),
        { adapter: db, broadcast: false },
      );
    }

    // 30 simultaneous attempts (15 online + 15 onsite) competing for 3 seats.
    const attempts = await Promise.allSettled(
      Array.from({ length: 30 }, (_, i) =>
        registerParticipant(
          makeInput({
            participation_type: i % 2 === 0 ? "ONLINE" : "ONSITE",
            email: `storm${i}@x.com`,
          }),
          { adapter: db, broadcast: false },
        ),
      ),
    );
    const ok = attempts.filter((r) => r.status === "fulfilled").length;
    const stats = await getStats(db);

    expect(ok).toBe(3);
    expect(stats.total).toBe(30);
    expect(stats.total).toBeLessThanOrEqual(30);
    expect(stats.online).toBeLessThanOrEqual(20);
    expect(stats.onsite).toBeLessThanOrEqual(10);
  });
});
