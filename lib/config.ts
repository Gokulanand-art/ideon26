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
  // Trimmed, so a variable set to whitespace counts as unset rather than
  // overriding the fallback with a blank-looking value.
  const v = process.env[key]?.trim();
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
  eventName: env("EVENT_NAME", "IDEON'26"),
  eventType: env("EVENT_TYPE", "PROJECT EXPO 2026"),
  eventTagline: env("EVENT_TAGLINE", "Innovate. Build. Impact."),
  eventDate: env("EVENT_DATE", "2 September 2026"),
  eventTime: env("EVENT_TIME", "09:30 AM"),
  eventEndDate: env("EVENT_END_DATE", ""),
  eventVenue: env(
    "EVENT_VENUE",
    "Excel Engineering College, Komarapalayam \u2013 637303",
  ),
  eventDescription: env(
    "EVENT_DESCRIPTION",
    "IDEON'26 is the official project expo of Excel Engineering College, organised by the Department of Computer Science and Business System and the Department of Artificial Intelligence and Machine Learning. Student teams of 2–4 come together to build working solutions across six technology domains.",
  ),
  eventDuration: env("EVENT_DURATION", ""),
  eventPrize: env("EVENT_PRIZE", "Cash prize up to \u20B95,000"),
  /** Shown on the event facts table when non-empty. */
  eventCertificate: env("EVENT_CERTIFICATE", "Provided to all participants"),

  onlineCapacity: intEnv("ONLINE_CAPACITY", 20),
  onsiteCapacity: intEnv("ONSITE_CAPACITY", 10),
  totalCapacity: intEnv("TOTAL_CAPACITY", 30),

  // Paid entry: ₹fee per head. Team total = team_size × FEE_PER_HEAD,
  // computed server-side. Online teams pay via UPI; on-site teams pay at the
  // venue. The raw UPI ID is used only inside the payment implementation —
  // it is never rendered on the public website.
  feePerHead: intEnv("FEE_PER_HEAD", 150),
  upiId: env("UPI_ID", "prathipa1991-1@okaxis"),
  payeeName: env("PAYEE_NAME", "IDEON26"),

  registrationOpen: boolEnv("REGISTRATION_OPEN", true),

  // On-spot (walk-in) registration channel. Independent of REGISTRATION_OPEN:
  // a channel can have seats remaining yet be closed. On-spot works exactly
  // like online, except the fee is paid at the venue (no online payment).
  onsiteRegistrationOpen: boolEnv("ONSITE_REGISTRATION_OPEN", true),

  regIdPrefix: env("REG_ID_PREFIX", "IDEON26"),

  // Organizing institution (public-facing identity).
  collegeName: env("COLLEGE_NAME", "Excel Engineering College (Autonomous)"),
  departmentNames: env(
    "DEPARTMENT_NAMES",
    "Department of Computer Science and Business System & Artificial Intelligence and Machine Learning",
  ),

  // Admin auth
  adminUsername: env("ADMIN_USERNAME", "admin"),
  adminPasswordHash: env("ADMIN_PASSWORD_HASH", ""),
  adminPasswordPlain: env("ADMIN_PASSWORD", ""),
  adminAuthSecret: env("ADMIN_AUTH_SECRET", ""),
  // Optional explicit share key. Empty means "derive it from
  // ADMIN_AUTH_SECRET" (see adminAccessKey in lib/auth.ts).
  adminAccessKey: env("ADMIN_ACCESS_KEY", ""),
  sessionTtlMs: intEnv("SESSION_TTL_HOURS", 12) * 60 * 60 * 1000,

  /**
   * Event coordinators, as "Name:phone|Name:phone". Parsed into
   * `contacts` below; malformed entries are dropped rather than rendered
   * half-empty.
   */
  contactsRaw: env(
    "EVENT_CONTACTS",
    "Mrs. C. Prathipa:+91 95005 93632|Ms. C. Pavithra:+91 63802 06176|Mrs. N. Thenmozhi:+91 76958 65694",
  ),

  // Public site
  publicUrl: env("PUBLIC_URL", "http://localhost:3000"),

} as const;

export type Config = typeof config;

export interface EventContact {
  name: string;
  phone: string;
}

/**
 * Coordinators parsed from `contactsRaw`. Split on the LAST colon so a name
 * containing one still works; entries missing either half are dropped rather
 * than rendered as a dangling name or a bare number.
 */
export const contacts: EventContact[] = config.contactsRaw
  .split("|")
  .map((entry) => {
    const i = entry.lastIndexOf(":");
    if (i < 1) return null;
    const name = entry.slice(0, i).trim();
    const phone = entry.slice(i + 1).trim();
    return name && phone ? { name, phone } : null;
  })
  .filter((c): c is EventContact => c !== null);
