import { describe, it, expect } from "vitest";
import { registerParticipant } from "@/lib/registration";
import { getStats } from "@/lib/stats";
import { freshDb, makeInput } from "./helpers";

describe("registerParticipant", () => {
  it("creates a registration with a unique sequential id", async () => {
    const db = await freshDb();
    const a = await registerParticipant(makeInput(), { adapter: db, broadcast: false });
    const b = await registerParticipant(
      makeInput({ email: "second@example.com" }),
      { adapter: db, broadcast: false },
    );
    expect(a.registration_id).toMatch(/^HK26-\d{4}$/);
    expect(b.registration_id).toMatch(/^HK26-\d{4}$/);
    expect(a.registration_id).not.toBe(b.registration_id);
  });

  it("rejects a duplicate active email", async () => {
    const db = await freshDb();
    const input = makeInput();
    await registerParticipant(input, { adapter: db, broadcast: false });
    await expect(
      registerParticipant(input, { adapter: db, broadcast: false }),
    ).rejects.toMatchObject({ code: "DUPLICATE_EMAIL", status: 409 });
  });

  it("reflects the real database state in stats", async () => {
    const db = await freshDb();
    await registerParticipant(makeInput({ participation_type: "ONLINE" }), {
      adapter: db,
      broadcast: false,
    });
    await registerParticipant(makeInput({ participation_type: "ONSITE", email: "b@example.com" }), {
      adapter: db,
      broadcast: false,
    });
    const stats = await getStats(db);
    expect(stats.total).toBe(2);
    expect(stats.online).toBe(1);
    expect(stats.onsite).toBe(1);
    expect(stats.totalSeatsLeft).toBe(28);
  });

  it("re-registration is allowed after the previous one is cancelled", async () => {
    const db = await freshDb();
    const input = makeInput();
    const reg = await registerParticipant(input, { adapter: db, broadcast: false });
    await db.query("UPDATE participants SET status = 'CANCELLED' WHERE registration_id = $1", [
      reg.registration_id,
    ]);
    // Same email can now register again.
    const again = await registerParticipant(input, { adapter: db, broadcast: false });
    expect(again.registration_id).not.toBe(reg.registration_id);
  });
});

describe("capacity enforcement", () => {
  it("fills online to 20 and rejects the 21st online seat", async () => {
    const db = await freshDb();
    for (let i = 1; i <= 20; i++) {
      await registerParticipant(
        makeInput({ participation_type: "ONLINE", email: `o${i}@x.com` }),
        { adapter: db, broadcast: false },
      );
    }
    const stats = await getStats(db);
    expect(stats.online).toBe(20);
    expect(stats.onlineFull).toBe(true);

    await expect(
      registerParticipant(
        makeInput({ participation_type: "ONLINE", email: `o21@x.com` }),
        { adapter: db, broadcast: false },
      ),
    ).rejects.toMatchObject({ code: "ONLINE_FULL", status: 422 });

    // On-site is still available.
    const onsite = await registerParticipant(
      makeInput({ participation_type: "ONSITE", email: `s1@x.com` }),
      { adapter: db, broadcast: false },
    );
    expect(onsite.participation_type).toBe("ONSITE");
  });

  it("fills on-site to 10 and rejects the 11th on-site seat", async () => {
    const db = await freshDb();
    for (let i = 1; i <= 10; i++) {
      await registerParticipant(
        makeInput({ participation_type: "ONSITE", email: `s${i}@x.com` }),
        { adapter: db, broadcast: false },
      );
    }
    expect((await getStats(db)).onsiteFull).toBe(true);
    await expect(
      registerParticipant(
        makeInput({ participation_type: "ONSITE", email: `s11@x.com` }),
        { adapter: db, broadcast: false },
      ),
    ).rejects.toMatchObject({ code: "ONSITE_FULL", status: 422 });
  });

  it("rejects everything once the total of 30 is reached", async () => {
    const db = await freshDb();
    for (let i = 1; i <= 20; i++) {
      await registerParticipant(
        makeInput({ participation_type: "ONLINE", email: `o${i}@x.com` }),
        { adapter: db, broadcast: false },
      );
    }
    for (let i = 1; i <= 10; i++) {
      await registerParticipant(
        makeInput({ participation_type: "ONSITE", email: `s${i}@x.com` }),
        { adapter: db, broadcast: false },
      );
    }
    const stats = await getStats(db);
    expect(stats.total).toBe(30);
    expect(stats.full).toBe(true);

    await expect(
      registerParticipant(
        makeInput({ participation_type: "ONLINE", email: `o21@x.com` }),
        { adapter: db, broadcast: false },
      ),
    ).rejects.toMatchObject({ status: expect.any(Number) });

    await expect(
      registerParticipant(
        makeInput({ participation_type: "ONSITE", email: `s11@x.com` }),
        { adapter: db, broadcast: false },
      ),
    ).rejects.toMatchObject({ status: expect.any(Number) });
  });

  it("the database trigger rejects overflow even bypassing the app check", async () => {
    const db = await freshDb();
    for (let i = 1; i <= 10; i++) {
      await registerParticipant(
        makeInput({ participation_type: "ONSITE", email: `s${i}@x.com` }),
        { adapter: db, broadcast: false },
      );
    }
    // Direct insert attempt should be blocked by the BEFORE INSERT trigger.
    await expect(
      db.query(
        `INSERT INTO participants (registration_id, full_name, email, phone, college, department, year, participation_type, team_size)
         VALUES ('HK26-9999','X','s11@x.com','555','C','D','1','ONSITE',1)`,
      ),
    ).rejects.toMatchObject({ code: "45000" });
  });
});
