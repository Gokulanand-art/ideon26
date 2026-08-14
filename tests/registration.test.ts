import { describe, it, expect } from "vitest";
import {
  registerParticipant,
  submitPaymentTxn,
} from "@/lib/registration";
import { runAdminAction } from "@/lib/admin";
import { getStats } from "@/lib/stats";
import { freshDb, makeInput } from "./helpers";

describe("registerParticipant", () => {
  it("creates a PENDING team registration with a unique sequential id and fee", async () => {
    const db = await freshDb();
    const a = await registerParticipant(makeInput({ team_size: 2 }), {
      adapter: db,
      broadcast: false,
    });
    const b = await registerParticipant(
      makeInput({ email: "second@example.com", team_size: 3 }),
      { adapter: db, broadcast: false },
    );

    expect(a.registration_id).toMatch(/^IDEON26-T\d{3}$/);
    expect(b.registration_id).toMatch(/^IDEON26-T\d{3}$/);
    expect(a.registration_id).not.toBe(b.registration_id);

    // Website registration: PENDING until the payment is verified.
    expect(a.status).toBe("PENDING");
    expect(a.payment_status).toBe("PENDING");

    // Fee is per head: 2 × 150 = 300, 3 × 150 = 450.
    expect(a.amount).toBe(300);
    expect(a.fee_per_head).toBe(150);
    expect(b.amount).toBe(450);
    expect(a.upi_id).toBe("prathipa1991-1@okaxis");
    expect(a.payee_name).toBeTruthy();

    // Member records: leader + (team_size − 1) members.
    expect(a.member_names).toHaveLength(2);
    expect(a.member_names[0]).toBe(a.full_name);
    expect(b.member_names).toHaveLength(3);
  });

  it("calculates the full team fee (4 heads = 600)", async () => {
    const db = await freshDb();
    const reg = await registerParticipant(makeInput({ team_size: 4 }), {
      adapter: db,
      broadcast: false,
    });
    expect(reg.amount).toBe(600);
  });

  it("rejects a duplicate active email", async () => {
    const db = await freshDb();
    const input = makeInput();
    await registerParticipant(input, { adapter: db, broadcast: false });
    await expect(
      registerParticipant(input, { adapter: db, broadcast: false }),
    ).rejects.toMatchObject({ code: "DUPLICATE_EMAIL", status: 409 });
  });

  it("reflects the real database state in stats (teams = COUNT of registrations)", async () => {
    const db = await freshDb();
    const onlineA = await registerParticipant(makeInput({ team_size: 2 }), {
      adapter: db,
      broadcast: false,
    });
    await registerParticipant(makeInput({ email: "b@example.com", team_size: 3 }), {
      adapter: db,
      broadcast: false,
    });
    await registerParticipant(makeInput({ email: "c@example.com", team_size: 4 }), {
      adapter: db,
      broadcast: false,
      onsite: true,
    });
    const stats = await getStats(db);
    // Capacity counts TEAMS, not members: 2/3/4-member teams count as 1 each.
    // ONLINE seats are consumed only once payment is submitted; ONSITE counts immediately.
    expect(stats.total).toBe(1);
    expect(stats.online).toBe(0);
    expect(stats.onsite).toBe(1);
    expect(stats.totalSeatsLeft).toBe(29);
    // Submitting a txn id records the online team.
    await submitPaymentTxn(onlineA.registration_id, "410298330947", { adapter: db });
    const after = await getStats(db);
    expect(after.total).toBe(2);
    expect(after.online).toBe(1);
    expect(after.totalSeatsLeft).toBe(28);
  });

  it("reports the on-spot channel as closed unless explicitly enabled (seats ≠ open)", async () => {
    const db = await freshDb();

    // Default (seed): on-spot registration is CLOSED even with all 10 seats free.
    const closed = await getStats(db);
    expect(closed.onsiteOpen).toBe(false);
    expect(closed.onsiteSeatsLeft).toBe(10);
    expect(closed.onlineSeatsLeft).toBe(20);
    expect(closed.totalSeatsLeft).toBe(30);

    // Enabling the channel flips the flag; capacity counters are unchanged.
    await db.query(
      "UPDATE settings SET value = 'true' WHERE key = 'onsite_registration_open'",
    );
    const open = await getStats(db);
    expect(open.onsiteOpen).toBe(true);
    expect(open.onsiteSeatsLeft).toBe(10);
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

describe("payment flow", () => {
  it("records a txn id and moves payment to SUBMITTED", async () => {
    const db = await freshDb();
    const reg = await registerParticipant(makeInput(), { adapter: db, broadcast: false });
    const res = await submitPaymentTxn(reg.registration_id, "410298330947", { adapter: db });
    expect(res.payment_status).toBe("SUBMITTED");
  });

  it("rejects submitting a txn id for an unknown registration", async () => {
    const db = await freshDb();
    await expect(
      submitPaymentTxn("IDEON26-9999", "410298330947", { adapter: db }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  it("rejects reusing the same txn id twice", async () => {
    const db = await freshDb();
    const a = await registerParticipant(makeInput(), { adapter: db, broadcast: false });
    const b = await registerParticipant(makeInput({ email: "b@x.com" }), {
      adapter: db,
      broadcast: false,
    });
    await submitPaymentTxn(a.registration_id, "410298330947", { adapter: db });
    await expect(
      submitPaymentTxn(b.registration_id, "410298330947", { adapter: db }),
    ).rejects.toMatchObject({ code: "DUPLICATE_TXN", status: 409 });
  });

  it("admin verifies a submitted payment → CONFIRMED", async () => {
    const db = await freshDb();
    const reg = await registerParticipant(makeInput(), { adapter: db, broadcast: false });
    await submitPaymentTxn(reg.registration_id, "410298330947", { adapter: db });

    const updated = await runAdminAction(reg.id, "verify", "admin", { adapter: db });
    expect(updated.status).toBe("CONFIRMED");
    expect(updated.payment_status).toBe("VERIFIED");
    expect(updated.verified_by).toBe("admin");
    expect((await getStats(db)).online).toBe(1); // slot held, now confirmed
  });

  it("admin cannot verify before a txn id is submitted", async () => {
    const db = await freshDb();
    const reg = await registerParticipant(makeInput(), { adapter: db, broadcast: false });
    await expect(
      runAdminAction(reg.id, "verify", "admin", { adapter: db }),
    ).rejects.toMatchObject({ code: "NO_TXN", status: 400 });
  });

  it("admin cancel frees the seat and fails the payment, allowing re-registration", async () => {
    const db = await freshDb();
    const reg = await registerParticipant(makeInput(), { adapter: db, broadcast: false });
    const updated = await runAdminAction(reg.id, "cancel", "admin", { adapter: db });
    expect(updated.status).toBe("CANCELLED");
    expect(updated.payment_status).toBe("FAILED");

    // Seat is freed and the same email can re-register.
    expect((await getStats(db)).online).toBe(0);
    await registerParticipant(makeInput({ email: reg.email }), { adapter: db, broadcast: false });
  });

  it("admin cannot cancel a verified (paid) registration", async () => {
    const db = await freshDb();
    const reg = await registerParticipant(makeInput(), { adapter: db, broadcast: false });
    await submitPaymentTxn(reg.registration_id, "410298330947", { adapter: db });
    await runAdminAction(reg.id, "verify", "admin", { adapter: db });
    await expect(runAdminAction(reg.id, "cancel", "admin", { adapter: db })).rejects.toMatchObject({
      code: "PAYMENT_VERIFIED",
      status: 409,
    });
  });
});

describe("on-site registrations", () => {
  /** The on-site channel is CLOSED by default — tests open it explicitly. */
  async function openOnsite(db: import("@/lib/db").DbAdapter) {
    await db.query("UPDATE settings SET value = 'true' WHERE key = 'onsite_registration_open'");
  }

  it("rejects public on-site registrations while the channel is closed (seats ≠ open)", async () => {
    const db = await freshDb();
    const closed = await getStats(db);
    expect(closed.onsiteOpen).toBe(false);
    expect(closed.onsiteSeatsLeft).toBe(10);
    await expect(
      registerParticipant(makeInput({ team_size: 2 }), {
        adapter: db,
        broadcast: false,
        payAtVenue: true,
      }),
    ).rejects.toMatchObject({ code: "ONSITE_CLOSED", status: 403 });
    // No seat was consumed.
    expect((await getStats(db)).onsite).toBe(0);
  });

  it("creates a PENDING public registration with PAY_AT_VENUE payment once the channel is open", async () => {
    const db = await freshDb();
    await openOnsite(db);
    const reg = await registerParticipant(makeInput({ team_size: 3 }), {
      adapter: db,
      broadcast: false,
      payAtVenue: true,
    });
    expect(reg.registration_type).toBe("ONSITE");
    expect(reg.status).toBe("PENDING");
    expect(reg.payment_status).toBe("PAY_AT_VENUE");
    expect(reg.amount).toBe(450);
  });

  it("rejects UPI transaction submission for on-site registrations (no online payment)", async () => {
    const db = await freshDb();
    await openOnsite(db);
    const reg = await registerParticipant(makeInput({ team_size: 2 }), {
      adapter: db,
      broadcast: false,
      payAtVenue: true,
    });
    await expect(
      submitPaymentTxn(reg.registration_id, "410298330947", { adapter: db }),
    ).rejects.toMatchObject({ code: "PAY_AT_VENUE", status: 409 });
  });

  it("admin collects the venue fee → CONFIRMED / VERIFIED", async () => {
    const db = await freshDb();
    await openOnsite(db);
    const reg = await registerParticipant(makeInput({ team_size: 2 }), {
      adapter: db,
      broadcast: false,
      payAtVenue: true,
    });
    const updated = await runAdminAction(reg.id, "verify", "admin", { adapter: db });
    expect(updated.status).toBe("CONFIRMED");
    expect(updated.payment_status).toBe("VERIFIED");
    expect(updated.note).toBe("PAID_AT_VENUE");
  });

  it("creates an organizer on-spot registration as CONFIRMED with a VERIFIED cash payment", async () => {
    const db = await freshDb();
    const reg = await registerParticipant(makeInput({ team_size: 3 }), {
      adapter: db,
      broadcast: false,
      onsite: true,
      adminUser: "admin",
    });
    expect(reg.registration_type).toBe("ONSITE");
    expect(reg.status).toBe("CONFIRMED");
    expect(reg.payment_status).toBe("VERIFIED");
    expect(reg.amount).toBe(450);
  });

  it("rejects a team that would exceed the 10 on-site team slots", async () => {
    const db = await freshDb();
    // Capacity is 10 TEAMS (any size 2–4): fill all 10, then the 11th is rejected.
    for (let i = 1; i <= 10; i++) {
      await registerParticipant(makeInput({ email: `s${i}@x.com`, team_size: 4 }), {
        adapter: db,
        broadcast: false,
        onsite: true,
      });
    }
    expect((await getStats(db)).onsite).toBe(10);
    await expect(
      registerParticipant(makeInput({ email: "s11@x.com", team_size: 4 }), {
        adapter: db,
        broadcast: false,
        onsite: true,
      }),
    ).rejects.toMatchObject({ code: "ONSITE_FULL", status: 422 });
  });
});

describe("capacity enforcement (teams, not participants)", () => {
  it("does not record online registrations until their payment is submitted", async () => {
    const db = await freshDb();
    const a = await registerParticipant(makeInput({ team_size: 2 }), {
      adapter: db,
      broadcast: false,
    });
    await registerParticipant(makeInput({ email: "b@x.com", team_size: 3 }), {
      adapter: db,
      broadcast: false,
    });
    // Unpaid PENDING registrations hold no slots.
    const before = await getStats(db);
    expect(before.online).toBe(0);
    expect(before.onlineFull).toBe(false);
    expect(before.onlineSeatsLeft).toBe(20);
    // Once the txn id is submitted, the team is recorded.
    await submitPaymentTxn(a.registration_id, "410298330947", { adapter: db });
    const after = await getStats(db);
    expect(after.online).toBe(1);
    expect(after.onlineSeatsLeft).toBe(19);
  });

  it("fills website registrations to 20 teams and rejects a team that does not fit", async () => {
    const db = await freshDb();
    // Capacity is 20 TEAMS (any size 2–4): 20 teams of 2 fill it, the 21st is rejected.
    for (let i = 1; i <= 20; i++) {
      const r = await registerParticipant(makeInput({ email: `o${i}@x.com`, team_size: 2 }), {
        adapter: db,
        broadcast: false,
      });
      await submitPaymentTxn(r.registration_id, `4102${String(i).padStart(7, "0")}`, {
        adapter: db,
      });
    }
    const stats = await getStats(db);
    expect(stats.online).toBe(20);
    expect(stats.onlineFull).toBe(true);

    await expect(
      registerParticipant(makeInput({ email: "o21@x.com", team_size: 2 }), {
        adapter: db,
        broadcast: false,
      }),
    ).rejects.toMatchObject({ code: "ONLINE_FULL", status: 422 });

    // On-spot is still available.
    const onsite = await registerParticipant(makeInput({ email: "s1@x.com", team_size: 2 }), {
      adapter: db,
      broadcast: false,
      onsite: true,
    });
    expect(onsite.registration_type).toBe("ONSITE");
  });

  it("a whole 4-member team fits in the last remaining slot", async () => {
    const db = await freshDb();
    // 19 online teams seated → 1 slot left. A 4-member team takes that single slot
    // (capacity counts teams, so size is irrelevant), then the next team is rejected.
    for (let i = 1; i <= 19; i++) {
      const r = await registerParticipant(makeInput({ email: `o${i}@x.com`, team_size: 2 }), {
        adapter: db,
        broadcast: false,
      });
      await submitPaymentTxn(r.registration_id, `4102${String(i).padStart(7, "0")}`, {
        adapter: db,
      });
    }
    expect((await getStats(db)).onlineSeatsLeft).toBe(1);
    const last = await registerParticipant(makeInput({ email: "o20@x.com", team_size: 4 }), {
      adapter: db,
      broadcast: false,
    });
    await submitPaymentTxn(last.registration_id, "410200000020", { adapter: db });
    expect((await getStats(db)).online).toBe(20);
    await expect(
      registerParticipant(makeInput({ email: "o21@x.com", team_size: 4 }), {
        adapter: db,
        broadcast: false,
      }),
    ).rejects.toMatchObject({ code: "ONLINE_FULL", status: 422 });
    // Slot count unchanged.
    expect((await getStats(db)).online).toBe(20);
  });

  it("rejects everything once the total of 30 teams is reached", async () => {
    const db = await freshDb();
    // 20 online teams (payments submitted) + 10 on-site teams = 30 teams.
    for (let i = 1; i <= 20; i++) {
      const r = await registerParticipant(makeInput({ email: `o${i}@x.com`, team_size: 2 }), {
        adapter: db,
        broadcast: false,
      });
      await submitPaymentTxn(r.registration_id, `4102${String(i).padStart(7, "0")}`, {
        adapter: db,
      });
    }
    for (let i = 1; i <= 10; i++) {
      await registerParticipant(makeInput({ email: `s${i}@x.com`, team_size: 2 }), {
        adapter: db,
        broadcast: false,
        onsite: true,
      });
    }
    const stats = await getStats(db);
    expect(stats.total).toBe(30);
    expect(stats.full).toBe(true);

    await expect(
      registerParticipant(makeInput({ email: "o21@x.com", team_size: 2 }), {
        adapter: db,
        broadcast: false,
      }),
    ).rejects.toMatchObject({ status: expect.any(Number) });

    await expect(
      registerParticipant(makeInput({ email: "s11@x.com", team_size: 2 }), {
        adapter: db,
        broadcast: false,
        onsite: true,
      }),
    ).rejects.toMatchObject({ status: expect.any(Number) });
  });

  it("the database trigger rejects overflow even bypassing the app check", async () => {
    const db = await freshDb();
    for (let i = 1; i <= 10; i++) {
      await registerParticipant(makeInput({ email: `s${i}@x.com`, team_size: 2 }), {
        adapter: db,
        broadcast: false,
        onsite: true,
      });
    }
    // All 10 on-site team slots are seated; a direct insert of another team is blocked.
    await expect(
      db.query(
        `INSERT INTO participants (registration_id, full_name, email, phone, college, department, year, registration_type, team_size)
         VALUES ('IDEON26-9999','X','s11@x.com','555','C','D','1','ONSITE',2)`,
      ),
    ).rejects.toMatchObject({ code: "45000" });
  });
});
