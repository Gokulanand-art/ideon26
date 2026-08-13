import { z } from "zod";

export const REGISTRATION_TYPES = ["ONLINE", "ONSITE"] as const;
export type RegistrationType = (typeof REGISTRATION_TYPES)[number];

export const REGISTRATION_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "REJECTED",
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const PAYMENT_STATUSES = ["PENDING", "SUBMITTED", "VERIFIED", "FAILED", "PAY_AT_VENUE"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const YEARS = ["1", "2", "3", "4", "5+"] as const;

const phoneRegex = /^[+]?[\d\s().-]{7,20}$/;

/**
 * Public registration form. Team-based ONLY: the participant picks a
 * participation mode (ONLINE or ONSITE) and a team size of 2–4; the member
 * name inputs match the team size (member 1 is the team leader, whose name
 * and email are the primary contact). The fee is never accepted from the
 * client — the server always computes team_size × fee_per_head.
 *
 * The public form intentionally collects ONLY the essentials: leader name,
 * leader email, team size and member names. The optional profile fields
 * (phone / college / department / year) are kept for admin/organizer use and
 * default to empty strings when not provided.
 */
export const registerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Team leader name must be at least 2 characters.")
    .max(120, "Team leader name is too long."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address.")
    .max(254, "Email is too long."),
  phone: z
    .string()
    .trim()
    .max(20, "Phone number is too long.")
    .regex(phoneRegex, "Please enter a valid phone number.")
    .optional()
    .or(z.literal(""))
    .default(""),
  college: z
    .string()
    .trim()
    .max(200, "College name is too long.")
    .optional()
    .or(z.literal(""))
    .default(""),
  department: z
    .string()
    .trim()
    .max(200, "Department is too long.")
    .optional()
    .or(z.literal(""))
    .default(""),
  year: z
    .enum([...YEARS, ""], { error: "Please select your year of study." })
    .default(""),
  team_name: z
    .string()
    .trim()
    .max(120, "Team name is too long.")
    .optional()
    .or(z.literal("")),
  registration_type: z
    .enum(REGISTRATION_TYPES, { error: "Please choose a participation mode." })
    .default("ONLINE"),
  team_size: z
    .number({ error: "Team size must be a number." })
    .int("Team size must be a whole number.")
    .min(2, "Teams must have at least 2 members.")
    .max(4, "Teams cannot have more than 4 members."),
  /** Names of the non-leader members (member 2 … team_size). */
  member_names: z
    .array(
      z
        .string()
        .trim()
        .min(2, "Every member name must be at least 2 characters.")
        .max(120, "Member name is too long."),
    )
    .max(3, "Too many member names.")
    .default([]),
});

/**
 * Cross-field rule: the number of member names must match the team size
 * (team_size − 1 non-leader members; the leader is member 1).
 */
export const registerPayloadSchema = registerSchema.superRefine((val, ctx) => {
  const expected = val.team_size - 1;
  if (val.member_names.length !== expected) {
    ctx.addIssue({
      code: "custom",
      path: ["member_names"],
      message: `Provide a name for each member (${expected} more for a team of ${val.team_size}).`,
    });
  }
});

export type RegisterInput = z.infer<typeof registerPayloadSchema>;

/**
 * UPI transaction id submitted by the participant after paying (UTR /
 * reference shown in their UPI app). Alphanumeric, 6–24 chars.
 */
export const txnIdSchema = z.object({
  txn_id: z
    .string()
    .trim()
    .regex(
      /^[A-Za-z0-9]{6,24}$/,
      "Enter a valid UPI transaction ID (6–24 alphanumeric characters, no spaces).",
    )
    .transform((s) => s.toUpperCase()),
});

export type TxnIdInput = z.infer<typeof txnIdSchema>;

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, "Username is required."),
  password: z.string().min(1, "Password is required."),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const ADMIN_ACTIONS = ["verify", "cancel", "reject"] as const;
export type AdminAction = (typeof ADMIN_ACTIONS)[number];

export const adminActionSchema = z.object({
  id: z.number().int().positive(),
  action: z.enum(ADMIN_ACTIONS, { error: "Invalid action." }),
});

export type AdminActionInput = z.infer<typeof adminActionSchema>;

export function formatZodError(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path[0]?.toString() ?? "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
