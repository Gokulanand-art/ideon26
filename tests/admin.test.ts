import { describe, it, expect } from "vitest";
import {
  listRegistrations,
  getAllForExport,
  getAdminSummary,
} from "@/lib/admin";
import { registerParticipant, submitPaymentTxn } from "@/lib/registration";
import { runAdminAction } from "@/lib/admin";
import { freshDb, makeInput } from "./helpers";

describe("listRegistrations", () => {
  it("lists registrations with joined payment info", async () => {
    const db = await freshDb();
    const reg = await registerParticipant(makeInput({ team_size: 2 }), {
      adapter: db,
      broadcast: false,
    });
    await submitPaymentTxn(reg.registration_id, "410298330947", { adapter: db });

    const list = await listRegistrations({}, { adapter: db });
    expect(list.total).toBe(1);
    expect(list.rows[0]).toMatchObject({
      registration_id: reg.registration_id,
      amount: 300,
      payment_status: "SUBMITTED",
      txn_id: "410298330947",
    });
  });

  // Regression: the count query must also join `payments` when a search term
  // references pay.txn_id, otherwise it fails with 42P01 (missing FROM-clause
  // entry for table "pay").
  it("searching by txn id / name / email does not break the count query", async () => {
    const db = await freshDb();
    const a = await registerParticipant(makeInput({ email: "alpha@x.com" }), {
      adapter: db,
      broadcast: false,
    });
    const b = await registerParticipant(makeInput({ email: "beta@x.com" }), {
      adapter: db,
      broadcast: false,
    });
    await submitPaymentTxn(a.registration_id, "410298330947", { adapter: db });

    const byTxn = await listRegistrations({ search: "410298330947" }, { adapter: db });
    expect(byTxn.total).toBe(1);
    expect(byTxn.rows[0].registration_id).toBe(a.registration_id);

    const byEmail = await listRegistrations({ search: "beta@x" }, { adapter: db });
    expect(byEmail.total).toBe(1);
    expect(byEmail.rows[0].registration_id).toBe(b.registration_id);

    const byName = await listRegistrations({ search: a.full_name.split(" ")[0] }, { adapter: db });
    expect(byName.total).toBeGreaterThanOrEqual(1);
  });

  it("filters by channel, status and paginates", async () => {
    const db = await freshDb();
    for (let i = 1; i <= 3; i++) {
      await registerParticipant(makeInput({ email: `o${i}@x.com` }), {
        adapter: db,
        broadcast: false,
      });
    }
    const onsite = await registerParticipant(makeInput({ email: "s1@x.com" }), {
      adapter: db,
      broadcast: false,
      onsite: true,
    });

    const online = await listRegistrations({ mode: "ONLINE" }, { adapter: db });
    expect(online.total).toBe(3);

    const onlyOnsite = await listRegistrations({ mode: "ONSITE" }, { adapter: db });
    expect(onlyOnsite.total).toBe(1);
    expect(onlyOnsite.rows[0].registration_id).toBe(onsite.registration_id);

    const pending = await listRegistrations({ status: "PENDING" }, { adapter: db });
    expect(pending.total).toBe(3);

    const page1 = await listRegistrations({ page: 1, limit: 2 }, { adapter: db });
    const page2 = await listRegistrations({ page: 2, limit: 2 }, { adapter: db });
    expect(page1.rows).toHaveLength(2);
    expect(page2.rows).toHaveLength(2);
    expect(page1.totalPages).toBe(2);
    const ids = new Set([...page1.rows, ...page2.rows].map((r) => r.id));
    expect(ids.size).toBe(4);
  });
});

describe("getAllForExport", () => {
  it("exports all registrations including on-spot", async () => {
    const db = await freshDb();
    await registerParticipant(makeInput({ email: "a@x.com" }), { adapter: db, broadcast: false });
    await registerParticipant(makeInput({ email: "b@x.com" }), {
      adapter: db,
      broadcast: false,
      onsite: true,
    });
    const rows = await getAllForExport({ adapter: db });
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.registration_type).sort()).toEqual(["ONLINE", "ONSITE"]);
  });
});

describe("getAdminSummary", () => {
  it("counts teams (not participants) and aggregates payments by channel", async () => {
    const db = await freshDb();
    // 2 online teams: one unpaid (PENDING — not recorded yet), one paid (2 members, verified).
    await registerParticipant(makeInput({ email: "a@x.com", team_size: 3 }), {
      adapter: db,
      broadcast: false,
    });
    const paidOnline = await registerParticipant(makeInput({ email: "b@x.com", team_size: 2 }), {
      adapter: db,
      broadcast: false,
    });
    await submitPaymentTxn(paidOnline.registration_id, "410298330947", { adapter: db });
    await runAdminAction(paidOnline.id, "verify", "admin", { adapter: db });

    // 1 on-site team, cash collected at the counter (VERIFIED).
    await registerParticipant(makeInput({ email: "c@x.com", team_size: 4 }), {
      adapter: db,
      broadcast: false,
      onsite: true,
      adminUser: "admin",
    });

    const s = await getAdminSummary({ adapter: db });
    // Unpaid online registrations are only recorded once payment is submitted.
    expect(s.totalTeams).toBe(2);
    expect(s.onlineTeams).toBe(1);
    expect(s.onsiteTeams).toBe(1);
    expect(s.onlinePaidTeams).toBe(1);
    expect(s.onlinePaidParticipants).toBe(2);
    expect(s.onsitePaidTeams).toBe(1);
    // 1 pending (online team a) + 0 PAY_AT_VENUE pending.
    expect(s.pendingPayments).toBe(1);
    // Verified money: 2×150 online + 4×150 on-site = 900.
    expect(s.totalCollected).toBe(900);
  });

  it("is empty on a fresh database", async () => {
    const db = await freshDb();
    const s = await getAdminSummary({ adapter: db });
    expect(s).toEqual({
      totalTeams: 0,
      onlineTeams: 0,
      onsiteTeams: 0,
      onlinePaidTeams: 0,
      onlinePaidParticipants: 0,
      onsitePaidTeams: 0,
      pendingPayments: 0,
      totalCollected: 0,
    });
  });
});