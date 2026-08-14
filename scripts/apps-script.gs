/**
 * Hackathon registrations → Google Sheets (web app backend)
 *
 * Creates one spreadsheet ("Hackathon 2026 — Registrations") with two tabs —
 * "Online" and "On-site" — and receives registration rows from the deployed
 * site via POST (JSON). Registration data is stored per tab.
 *
 * SETUP (one time):
 *   1. Open https://script.google.com → New project
 *   2. Replace TOKEN below with the same value you set as SHEETS_WEBHOOK_TOKEN
 *      on the server (any long random string).
 *   3. Paste this whole file, then Deploy → New deployment → Web app:
 *        - Execute as: Me
 *        - Who has access: Anyone
 *   4. Copy the web app URL (ends with /exec) → set it as SHEETS_WEBHOOK_URL.
 *   5. Open <url>?check in a browser once — it creates the spreadsheet and
 *      prints its link. Both tabs are auto-created with headers.
 */
const TOKEN = "CHANGE_ME";

const SPREADSHEET_NAME = "Hackathon 2026 — Registrations";
const TAB_ONLINE = "Online";
const TAB_ONSITE = "On-site";

const HEADERS = [
  "Registration ID", "Full Name", "Email", "Phone", "College", "Department",
  "Year", "Team Name", "Team Size", "Members", "Type", "Status",
  "Payment Status", "Amount (INR)", "UPI Txn ID", "Verified By", "Created At",
];

// Column letters for the patchable fields (1-based, A=1 … Q=17).
const PATCH_COLS = { status: "L", payment_status: "M", txn_id: "O", verified_by: "P", verified_at: "Q" };

function doGet(e) {
  const ss = getSpreadsheet_();
  const out = { ok: true, url: ss.getUrl(), tabs: [TAB_ONLINE, TAB_ONSITE] };
  return json_(out);
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: "invalid json" }, 400);
  }
  if (data.token !== TOKEN) return json_({ ok: false, error: "unauthorized" }, 403);

  const ss = getSpreadsheet_();
  const tab = data.registration_type === "ONSITE" ? TAB_ONSITE : TAB_ONLINE;
  const sheet = ensureTab_(ss, tab);

  if (data.action === "update") {
    const rowIdx = findRow_(sheet, data.registration_id);
    if (rowIdx < 0) return json_({ ok: true, updated: false });
    for (const key in data.patch || {}) {
      if (!(key in PATCH_COLS)) continue;
      const value = data.patch[key] === null ? "" : String(data.patch[key]);
      sheet.getRange(rowIdx, PATCH_COLS[key].charCodeAt(0) - 64).setValue(value);
    }
    return json_({ ok: true, updated: true });
  }

  // Default: append (or overwrite the row if the registration id exists).
  const rowIdx = findRow_(sheet, data.registration_id);
  const values = HEADERS.map((h) => (data[h] === undefined || data[h] === null ? "" : String(data[h])));
  if (rowIdx >= 0) sheet.getRange(rowIdx, 1, 1, HEADERS.length).setValues([values]);
  else sheet.appendRow(values);
  return json_({ ok: true, spreadsheetUrl: ss.getUrl(), tab, row: rowIdx >= 0 ? rowIdx : sheet.getLastRow() });
}

function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty("spreadsheetId");
  let ss = null;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (err) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create(SPREADSHEET_NAME);
    props.setProperty("spreadsheetId", ss.getId());
    const def = ss.getSheetByName("Sheet1");
    if (def) ss.deleteSheet(def);
    ensureTab_(ss, TAB_ONLINE);
    ensureTab_(ss, TAB_ONSITE);
  }
  return ss;
}

function ensureTab_(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  return sheet;
}

function findRow_(sheet, registrationId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(registrationId)) return i + 2;
  }
  return -1;
}

function json_(obj, status) {
  const out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  if (status) out.setContent(JSON.stringify(obj)); // status unused; kept simple
  return out;
}