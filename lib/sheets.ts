/**
 * Google Sheets sync via a Google Apps Script webhook.
 *
 * The deployed web app (see scripts/apps-script.gs) owns the spreadsheet and
 * exposes a tiny JSON API: append a registration to the Online / On-site tab
 * or update status/payment cells of an existing row. Enabled only when
 * SHEETS_WEBHOOK_URL + SHEETS_WEBHOOK_TOKEN are configured; every call is
 * best-effort and never blocks or fails the registration flow.
 */

import { config } from "./config";

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

let queue: Promise<unknown> = Promise.resolve();

function log(...args: unknown[]): void {
  console.error("[sheets]", ...args);
}

function isEnabled(): boolean {
  return Boolean(config.sheetsWebhookUrl && config.sheetsWebhookToken);
}

function enqueue(fn: () => Promise<void>): void {
  queue = queue.then(fn).catch((err) => {
    log("sync failed", (err as Error)?.message ?? err);
  });
}

async function post(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(config.sheetsWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`webhook responded ${res.status}`);
  const out = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!out?.ok) throw new Error(String(out?.error ?? "webhook rejected the request"));
  return out;
}

/**
 * Append a registration to the matching tab (Online / On-site). The webhook
 * overwrites instead of duplicating if the registration id already exists.
 */
export function appendRegistrationToSheets(row: SheetsRow): void {
  if (!isEnabled()) return;
  enqueue(async () => {
    const out = await post({
      token: config.sheetsWebhookToken,
      action: "append",
      ...row,
    });
    if (out.spreadsheetUrl) log(`spreadsheet: ${out.spreadsheetUrl}`);
  });
}

/** Update payment/status cells of an existing registration row (by id). */
export function updateRegistrationInSheets(
  registrationId: string,
  registrationType: string,
  patch: SheetsPatch,
): void {
  if (!isEnabled() || Object.keys(patch).length === 0) return;
  enqueue(async () => {
    await post({
      token: config.sheetsWebhookToken,
      action: "update",
      registration_id: registrationId,
      registration_type: registrationType,
      patch,
    });
  });
}