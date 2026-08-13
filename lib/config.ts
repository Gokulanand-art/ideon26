/**
 * Centralized event configuration.
 *
 * Event organizers can override any of these values via environment variables
 * (see .env.example). Capacities are also seeded into the database `settings`
 * table during `npm run db:setup`; the database settings table is the single
 * source of truth used by the capacity trigger and the stats API so that the
 * capacity logic always stays synchronized with the database constraints.
 */

function env(key: string, fallback: string): string {
  const v = process.env[key];
  return v === undefined || v === "" ? fallback : v;
}

function intEnv(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function boolEnv(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  return /^(1|true|yes|on)$/i.test(v);
}

export const config = {
  eventName: env("EVENT_NAME", "Hackathon 2026"),
  eventTagline: env("EVENT_TAGLINE", "Build. Create. Innovate."),
  eventDate: env("EVENT_DATE", "TBA"),
  eventEndDate: env("EVENT_END_DATE", ""),
  eventVenue: env("EVENT_VENUE", "TBA"),
  eventDescription: env(
    "EVENT_DESCRIPTION",
    "A high-energy hackathon for builders, creators and problem solvers. Form a team, pick a problem, and build something extraordinary in 24 hours. Compete online from anywhere in the world or join us on-site for the full experience.",
  ),
  eventDuration: env("EVENT_DURATION", "24 hours"),
  eventPrize: env("EVENT_PRIZE", "Cash prizes, swag & internship opportunities"),

  onlineCapacity: intEnv("ONLINE_CAPACITY", 20),
  onsiteCapacity: intEnv("ONSITE_CAPACITY", 10),
  totalCapacity: intEnv("TOTAL_CAPACITY", 30),

  // Paid entry: ₹fee per head. Team total = team_size × FEE_PER_HEAD,
  // computed server-side. Online teams pay via UPI; on-site teams pay at the
  // venue.
  feePerHead: intEnv("FEE_PER_HEAD", 150),
  upiId: env("UPI_ID", "7449007050@ybl"),
  payeeName: env("PAYEE_NAME", "HACKATHON"),

  registrationOpen: boolEnv("REGISTRATION_OPEN", true),

  // On-spot (walk-in) registration channel. Independent of REGISTRATION_OPEN:
  // a channel can have seats remaining yet be closed. Defaults to closed —
  // only online registration is available unless explicitly enabled.
  onsiteRegistrationOpen: boolEnv("ONSITE_REGISTRATION_OPEN", false),

  regIdPrefix: env("REG_ID_PREFIX", "HK26"),

  // Admin auth
  adminUsername: env("ADMIN_USERNAME", "admin"),
  adminPasswordHash: env("ADMIN_PASSWORD_HASH", ""),
  adminPasswordPlain: env("ADMIN_PASSWORD", ""),
  adminAuthSecret: env("ADMIN_AUTH_SECRET", ""),
  sessionTtlMs: intEnv("SESSION_TTL_HOURS", 12) * 60 * 60 * 1000,

  // Public site
  publicUrl: env("PUBLIC_URL", "http://localhost:3000"),
} as const;

export type Config = typeof config;
