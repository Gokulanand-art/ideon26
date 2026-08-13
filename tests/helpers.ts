import { createTestAdapter, type DbAdapter } from "@/lib/db";
import type { RegisterInput } from "@/lib/validation";

export async function freshDb(): Promise<DbAdapter> {
  return createTestAdapter({ memory: true });
}

let counter = 0;
export function makeInput(overrides: Partial<RegisterInput> = {}): RegisterInput {
  counter += 1;
  const team_size = overrides.team_size ?? 2;
  return {
    full_name: `Tester ${counter}`,
    email: `tester${counter}@example.com`,
    phone: "+1 555 0100",
    college: "State University",
    department: "Computer Science",
    year: "3",
    registration_type: "ONLINE",
    team_name: `Team ${counter}`,
    team_size,
    member_names: Array.from({ length: Math.max(0, team_size - 1) }, (_, i) => `Member ${i + 2}`),
    ...overrides,
  };
}
