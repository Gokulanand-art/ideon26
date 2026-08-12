import { describe, it, expect } from "vitest";
import { registerSchema } from "@/lib/validation";

describe("registerSchema", () => {
  it("accepts a valid payload", () => {
    const r = registerSchema.safeParse({
      full_name: "Gokulanand",
      email: "Goku@example.com",
      phone: "+1 555 0100",
      college: "MIT",
      department: "CS",
      year: "3",
      participation_type: "ONLINE",
      team_name: "AURA",
      team_size: 4,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("goku@example.com"); // normalized to lower-case
    }
  });

  it("rejects an invalid email", () => {
    const r = registerSchema.safeParse({
      full_name: "A",
      email: "not-an-email",
      phone: "5550100",
      college: "MIT",
      department: "CS",
      year: "3",
      participation_type: "ONLINE",
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
      participation_type: "",
      team_size: 0,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const keys = r.error.issues.map((i) => i.path[0]);
      expect(keys).toContain("full_name");
      expect(keys).toContain("email");
      expect(keys).toContain("participation_type");
    }
  });

  it("rejects an invalid participation type", () => {
    const r = registerSchema.safeParse({
      full_name: "A B",
      email: "a@b.com",
      phone: "5550100",
      college: "MIT",
      department: "CS",
      year: "3",
      participation_type: "HYBRID",
      team_size: 2,
    });
    expect(r.success).toBe(false);
  });

  it("rejects team size out of range", () => {
    const base = {
      full_name: "A B",
      email: "a@b.com",
      phone: "5550100",
      college: "MIT",
      department: "CS",
      year: "3",
      participation_type: "ONLINE" as const,
      team_size: 7,
    };
    expect(registerSchema.safeParse(base).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, team_size: 0 }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, team_size: 1 }).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, team_size: 6 }).success).toBe(true);
  });

  it("trims whitespace and treats empty team name as optional", () => {
    const r = registerSchema.safeParse({
      full_name: "  A B  ",
      email: "  A@B.com  ",
      phone: "  5550100  ",
      college: " MIT ",
      department: " CS ",
      year: "3",
      participation_type: "ONLINE",
      team_name: "   ",
      team_size: 1,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.full_name).toBe("A B");
      expect(r.data.email).toBe("a@b.com");
    }
  });
});
