/**
 * Google Sheets sync for registrations.
 *
 * One spreadsheet with two tabs — ONLINE and ONSITE — each holding the same
 * columns. Enabled only when SHEETS_CREDENTIALS_JSON (a Google service-account
 * key) is present; every call is best-effort and never blocks or fails the
 * registration flow. If SHEETS_SPREADSHEET_ID is not configured, the first
 * call creates the spreadsheet (title "Hackathon 2026 — Registrations"),
 * seeds both tabs with headers, shares it with SHEETS_OWNER_EMAIL and stores
 * the spreadsheet id in the `settings` table for subsequent calls.
 */

import { config } from "./config";
import { getDb } from "./db";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

// Shared column layout (A = 1 … Q = 17).
const HEADERS = [
  "Registration ID",
  "Full Name",
  "Email",
  "Phone",
  "College",
  "Department",
  "Year",
  "Team Name",
  "Team Size",
  "Members",
  "Type",
  "Status",
  "Payment Status",
  "Amount (INR)",
  "UPI Txn ID",
  "Verified By",
  "Created At",
] as const;

const LAST_COL = String.fromCharCode(64 + HEADERS.length); // "Q"

const SETTING_KEY = "sheets_spreadsheet_id";

export interface SheetsRow {
  registration_id: string;
  full_name: string;
  email: string;
  phone: string;
  college: string;
  department: string;
  year: string;
  team_name: string | null;
  team_size: number;
  /** All member names, leader first, comma-separated. */
  members: string;
  registration_type: string;
  status: string;
  payment_status: string;
  amount: number;
  txn_id: string | null;
  verified_by: string | null;
  created_at: string;
}

export interface SheetsPatch {
  status?: string;
  payment_status?: string;
  txn_id?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
}

type SheetsClient = import("googleapis").sheets_v4.Sheets;
type DriveClient = import("googleapis").drive_v3.Drive;

interface SheetsClients {
  sheets: SheetsClient;
  drive: DriveClient;
}

let clientPromise: Promise<SheetsClients> | null = null;
let setupPromise: Promise<string> | null = null;
let queue: Promise<unknown> = Promise.resolve();

function log(...args: unknown[]): void {
  console.error("[sheets]", ...args);
}

function isEnabled(): boolean {
  return Boolean(config.sheetsCredentialsJson);
}

async function getClient(): Promise<SheetsClients> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { google } = await import("googleapis");
      const creds = JSON.parse(config.sheetsCredentialsJson);
      const auth = new google.auth.JWT({
        email: creds.client_email,
        key: creds.private_key,
        scopes: SCOPES,
      });
      return {
        sheets: google.sheets({ version: "v4", auth }),
        drive: google.drive({ version: "v3", auth }),
      };
    })();
  }
  return clientPromise;
}

async function readStoredSpreadsheetId(): Promise<string | null> {
  try {
    const db = await getDb();
    const { rows } = await db.query<{ value: string }>(
      "SELECT value FROM settings WHERE key = $1",
      [SETTING_KEY],
    );
    return rows[0]?.value ?? null;
  } catch {
    return null;
  }
}

async function storeSpreadsheetId(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [SETTING_KEY, id],
    );
  } catch {
    /* settings write is best-effort */
  }
}

async function createSpreadsheet(client: SheetsClients): Promise<string> {
  const res = await client.sheets.spreadsheets.create({
    requestBody: {
      properties: { title: `${config.eventName} — Registrations` },
      sheets: [
        { properties: { title: config.sheetsTabOnline } },
        { properties: { title: config.sheetsTabOnsite } },
      ],
    },
  });
  const id = res.data.spreadsheetId;
  if (!id) throw new Error("Spreadsheet create returned no id");

  // Remove the default empty sheet and write headers into both tabs.
  await client.sheets.spreadsheets.batchUpdate({
    spreadsheetId: id,
    requestBody: {
      requests: [{ deleteSheet: { sheetId: 0 } }],
    },
  });
  for (const tab of [config.sheetsTabOnline, config.sheetsTabOnsite]) {
    await client.sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: `${tab}!A1:${LAST_COL}1`,
      valueInputOption: "RAW",
      requestBody: { values: [[...HEADERS]] },
    });
  }

  if (config.sheetsOwnerEmail) {
    try {
      await client.drive.permissions.create({
        fileId: id,
        requestBody: {
          type: "user",
          role: "writer",
          emailAddress: config.sheetsOwnerEmail,
        },
      });
    } catch (err) {
      log("could not share spreadsheet with", config.sheetsOwnerEmail, err);
    }
  }
  log(
    `created spreadsheet ${config.eventName} — Registrations`,
    `https://docs.google.com/spreadsheets/d/${id}`,
  );
  await storeSpreadsheetId(id);
  return id;
}

/**
 * Resolve the spreadsheet id (env → settings table → auto-create) and make
 * sure both tabs exist with headers. Runs once per process.
 */
async function ensureSetup(): Promise<string> {
  if (config.sheetsSpreadsheetId) return config.sheetsSpreadsheetId;
  if (!setupPromise) {
    setupPromise = (async () => {
      const stored = await readStoredSpreadsheetId();
      if (stored) return stored;
      const client = await getClient();
      const id = await createSpreadsheet(client);
      return id;
    })();
  }
  return setupPromise;
}

function tabFor(type: string): string {
  return type === "ONSITE" ? config.sheetsTabOnsite : config.sheetsTabOnline;
}

function rowToValues(row: SheetsRow): string[] {
  return [
    row.registration_id,
    row.full_name,
    row.email,
    row.phone,
    row.college,
    row.department,
    row.year,
    row.team_name ?? "",
    String(row.team_size),
    row.members ?? "",
    row.registration_type,
    row.status,
    row.payment_status,
    String(row.amount),
    row.txn_id ?? "",
    row.verified_by ?? "",
    row.created_at,
  ];
}

/** Find the 1-based row index of a registration id inside a tab (headers on row 1). */
async function findRowIndex(
  client: SheetsClients,
  spreadsheetId: string,
  tab: string,
  registrationId: string,
): Promise<number | null> {
  const res = await client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A2:A`,
  });
  const values = res.data.values ?? [];
  const idx = values.findIndex((r) => (r[0] ?? "") === registrationId);
  return idx === -1 ? null : idx + 2; // +1 for header, +1 for 1-based
}

function enqueue(fn: () => Promise<void>): void {
  queue = queue.then(fn).catch((err) => {
    log("sync failed", (err as Error)?.message ?? err);
  });
}

/**
 * Append a registration to the matching tab (Online / On-site). If the
 * registration id already exists (e.g. retry after a partial failure) the
 * row is overwritten instead of duplicated.
 */
export function appendRegistrationToSheets(row: SheetsRow): void {
  if (!isEnabled()) return;
  enqueue(async () => {
    const client = await getClient();
    const spreadsheetId = await ensureSetup();
    const tab = tabFor(row.registration_type);
    const existing = await findRowIndex(client, spreadsheetId, tab, row.registration_id);
    const values = [rowToValues(row)];
    if (existing) {
      await client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tab}!A${existing}:${LAST_COL}${existing}`,
        valueInputOption: "RAW",
        requestBody: { values },
      });
    } else {
      await client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${tab}!A${LAST_COL}`,
        valueInputOption: "RAW",
        requestBody: { values },
      });
    }
  });
}

const PATCH_COLS: Record<keyof SheetsPatch, string> = {
  status: "L",
  payment_status: "M",
  txn_id: "O",
  verified_by: "P",
  verified_at: "Q",
};

/** Update payment/status cells of an existing registration row (by id). */
export function updateRegistrationInSheets(registrationId: string, patch: SheetsPatch): void {
  if (!isEnabled() || Object.keys(patch).length === 0) return;
  enqueue(async () => {
    const client = await getClient();
    const spreadsheetId = await ensureSetup();
    for (const tab of [config.sheetsTabOnline, config.sheetsTabOnsite]) {
      const rowIdx = await findRowIndex(client, spreadsheetId, tab, registrationId);
      if (!rowIdx) continue;
      const updates: { range: string; value: string }[] = [];
      for (const [key, col] of Object.entries(PATCH_COLS) as [keyof SheetsPatch, string][]) {
        const v = patch[key];
        if (v === undefined) continue;
        updates.push({ range: `${tab}!${col}${rowIdx}`, value: v === null ? "" : v });
      }
      for (const u of updates) {
        await client.sheets.spreadsheets.values.update({
          spreadsheetId,
          range: u.range,
          valueInputOption: "RAW",
          requestBody: { values: [[u.value]] },
        });
      }
      return;
    }
  });
}