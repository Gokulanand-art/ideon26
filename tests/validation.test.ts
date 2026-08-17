import { describe, it, expect } from "vitest";
import { registerSchema, registerPayloadSchema, txnIdSchema } from "@/lib/validation";

describe("registerSchema", () => {
  it("accepts a valid payload", () => {
    const r = registerSchema.safeParse({
      full_name: "Gokulanand",
      email: "Goku@example.com",
      phone: "+1 555 0100",
      college: "MIT",
      department: "CS",
      year: "3",
      team_name: "AURA",
      team_size: 4,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("goku@example.com"); // normalized to lower-case
    }
  });

  it("requires the leader's contact and academic details", () => {
    const r = registerPayloadSchema.safeParse({
      full_name: "Gokulanand",
      email: "goku@example.com",
      team_size: 4,
      member_names: ["Ada", "Grace", "Katherine"],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("phone");
      expect(paths).toContain("college");
      expect(paths).toContain("department");
      expect(paths).toContain("year");
    }
  });

  it("accepts a complete public payload and defaults the mode to ONLINE", () => {
    const r = registerPayloadSchema.safeParse({
      full_name: "Gokulanand",
      email: "goku@example.com",
      phone: "98765 43210",
      college: "Excel Engineering College",
      department: "CSBS",
      year: "3",
      team_size: 4,
      member_names: ["Ada", "Grace", "Katherine"],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.registration_type).toBe("ONLINE");
      // Team name stays optional — teams without one are identified by reg id.
      expect(r.data.team_name).toBeUndefined();
    }
  });

  it("rejects a blank or malformed phone number", () => {
    const base = {
      full_name: "Gokulanand",
      email: "goku@example.com",
      college: "Excel Engineering College",
      department: "CSBS",
      year: "3",
      team_size: 2,
      member_names: ["Ada"],
    };
    expect(registerPayloadSchema.safeParse({ ...base, phone: "" }).success).toBe(false);
    expect(registerPayloadSchema.safeParse({ ...base, phone: "abc" }).success).toBe(false);
    expect(registerPayloadSchema.safeParse({ ...base, phone: "9876543210" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const r = registerSchema.safeParse({
      full_name: "A",
      email: "not-an-email",
      phone: "5550100",
      college: "MIT",
      department: "CS",
      year: "3",
      team_size: 2,
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const r = registerSchema.safeParse({
      full_name: "",
      email: "",
      phone: "",
      college: "",
      department: "",
      year: "",
      team_size: 0,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const keys = r.error.issues.map((i) => i.path[0]);
      expect(keys).toContain("full_name");
      expect(keys).toContain("email");
    }
  });

  it("rejects team size out of range (teams are 2–4, no solo)", () => {
    const base = {
      full_name: "A B",
      email: "a@b.com",
      phone: "5550100",
      college: "MIT",
      department: "CS",
      year: "3",
      team_size: 2,
    };
    expect(registerSchema.safeParse({ ...base, team_size: 5 }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, team_size: 0 }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, team_size: 1 }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, team_size: 2 }).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, team_size: 4 }).success).toBe(true);
  });

  it("trims whitespace and treats empty team name as optional", () => {
    const r = registerSchema.safeParse({
      full_name: "  A B  ",
      email: "  A@B.com  ",
      phone: "  5550100  ",
      college: " MIT ",
      department: " CS ",
      year: "3",
      team_name: "   ",
      team_size: 2,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.full_name).toBe("A B");
      expect(r.data.email).toBe("a@b.com");
    }
  });

  it("requires exactly team_size − 1 member names", () => {
    const base = {
      full_name: "A B",
      email: "a@b.com",
      phone: "5550100",
      college: "MIT",
      department: "CS",
      year: "3",
      team_size: 3,
    };
    // Too few member names → invalid.
    expect(
      registerPayloadSchema.safeParse({ ...base, member_names: ["C D"] }).success,
    ).toBe(false);
    // Exactly 2 members for a 3-person team → valid.
    expect(
      registerPayloadSchema.safeParse({ ...base, member_names: ["C D", "E F"] }).success,
    ).toBe(true);
  });
});

describe("txnIdSchema", () => {
  it("accepts a 12-digit UTR and uppercases letters", () => {
    const r = txnIdSchema.safeParse({ txn_id: "  4AB1029830947  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.txn_id).toBe("4AB1029830947");
  });

  it("rejects ids with spaces or special characters", () => {
    expect(txnIdSchema.safeParse({ txn_id: "12 34 56" }).success).toBe(false);
    expect(txnIdSchema.safeParse({ txn_id: "abc-123" }).success).toBe(false);
    expect(txnIdSchema.safeParse({ txn_id: "abc" }).success).toBe(false);
    expect(txnIdSchema.safeParse({ txn_id: "" }).success).toBe(false);
  });
});