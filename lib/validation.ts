import { z } from "zod";

export const PARTICIPATION_TYPES = ["ONLINE", "ONSITE"] as const;
export type ParticipationType = (typeof PARTICIPATION_TYPES)[number];

export const REGISTRATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "REJECTED",
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const YEARS = ["1", "2", "3", "4", "5+"] as const;

const phoneRegex = /^[+]?[\d\s().-]{7,20}$/;

export const registerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(120, "Full name is too long."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address.")
    .max(254, "Email is too long."),
  phone: z
    .string()
    .trim()
    .min(7, "Please enter a valid phone number.")
    .max(20, "Phone number is too long.")
    .regex(phoneRegex, "Please enter a valid phone number."),
  college: z
    .string()
    .trim()
    .min(2, "College / institution is required.")
    .max(200, "College name is too long."),
  department: z
    .string()
    .trim()
    .min(2, "Department is required.")
    .max(200, "Department is too long."),
  year: z.enum(YEARS, { error: "Please select your year of study." }),
  participation_type: z.enum(PARTICIPATION_TYPES, {
    error: "Please choose a participation mode.",
  }),
  team_name: z
    .string()
    .trim()
    .max(120, "Team name is too long.")
    .optional()
    .or(z.literal("")),
  team_size: z
    .number({ error: "Team size must be 1–6." })
    .int("Team size must be a whole number.")
    .min(1, "Team size must be at least 1.")
    .max(6, "Team size cannot exceed 6."),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const adminStatusUpdateSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(REGISTRATION_STATUSES),
});

export type AdminStatusUpdateInput = z.infer<typeof adminStatusUpdateSchema>;

export function formatZodError(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path[0]?.toString() ?? "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
