/**
 * IDEON'26 registrations → Google Sheets (web app backend)
 *
 * Creates TWO separate spreadsheets — one for Online registrations and one
 * for On-site registrations — and receives rows from the deployed site via
 * POST (JSON). Each spreadsheet holds a single "Registrations" tab; the
 * webhook routes by `registration_type`.
 *
 * SETUP (one time):
 *   1. Sign in to the Google account that should OWN the spreadsheets.
 *   2. Open https://script.google.com → New project.
 *   3. Paste this whole file, then replace TOKEN below with the same value
 *      you set as SHEETS_WEBHOOK_TOKEN on the server (any long random string).
 *   4. Run the `setup` function once (Run ▸ setup). Approve the permission
 *      prompt. The execution log prints both spreadsheet URLs.
 *   5. Deploy ▸ New deployment ▸ Web app:
 *        - Execute as: Me
 *        - Who has access: Anyone
 *   6. Copy the web app URL (ends with /exec) → set it as SHEETS_WEBHOOK_URL.
 *
 * Re-deploying after an edit: use Deploy ▸ Manage deployments ▸ edit ▸
 * New version, so the /exec URL stays the same.
 */
const TOKEN = "CHANGE_ME";

const SPREADSHEET_NAME_ONLINE = "IDEON'26 — Online Registrations";
const SPREADSHEET_NAME_ONSITE = "IDEON'26 — On-site Registrations";
const TAB_NAME = "Registrations";

/**
 * Column order. `header` is what the organizer sees; `key` is the field the
 * server actually sends (snake_case, see SheetsRow in lib/sheets.ts). Keeping
 * them paired here is what prevents the two from drifting apart.
 */
const COLUMNS = [
  { header: "Registration ID", key: "registration_id" },
  { header: "Full Name", key: "full_name" },
  { header: "Email", key: "email" },
  { header: "Phone", key: "phone" },
  { header: "College", key: "college" },
  { header: "Department", key: "department" },
  { header: "Year", key: "year" },
  { header: "Team Size", key: "team_size" },
  { header: "Members", key: "members" },
  { header: "Type", key: "registration_type" },
  { header: "Status", key: "status" },
  { header: "Payment Status", key: "payment_status" },
  { header: "Amount (INR)", key: "amount" },
  { header: "UPI Txn ID", key: "txn_id" },
  { header: "Verified By", key: "verified_by" },
  { header: "Verified At", key: "verified_at" },
  { header: "Created At", key: "created_at" },
];

const HEADERS = COLUMNS.map(function (c) { return c.header; });

/** 1-based column index for each patchable field, derived from COLUMNS. */
function colIndex_(key) {
  for (var i = 0; i < COLUMNS.length; i++) {
    if (COLUMNS[i].key === key) return i + 1;
  }
  return -1;
}

const PATCHABLE = ["status", "payment_status", "txn_id", "verified_by", "verified_at"];

/** Run this once from the editor to create both spreadsheets. */
function setup() {
  var online = getSpreadsheet_("ONLINE");
  var onsite = getSpreadsheet_("ONSITE");
  Logger.log("Online  spreadsheet: " + online.getUrl());
  Logger.log("On-site spreadsheet: " + onsite.getUrl());
  return { online: online.getUrl(), onsite: onsite.getUrl() };
}

function doGet(e) {
  return json_({
    ok: true,
    online: getSpreadsheet_("ONLINE").getUrl(),
    onsite: getSpreadsheet_("ONSITE").getUrl(),
  });
}

function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: "invalid json" });
  }
  if (data.token !== TOKEN) return json_({ ok: false, error: "unauthorized" });

  // Wipe every data row (headers survive) for one channel, or both when
  // `scope` is "all". Used to reset the sheets after a test run.
  if (data.action === "clear") {
    var targets = String(data.scope).toLowerCase() === "all"
      ? ["ONLINE", "ONSITE"]
      : [data.registration_type];
    var cleared = {};
    for (var t = 0; t < targets.length; t++) {
      var target = getSpreadsheet_(targets[t]);
      var tab = ensureTab_(target);
      var last = tab.getLastRow();
      if (last > 1) tab.deleteRows(2, last - 1);
      cleared[targets[t]] = Math.max(0, last - 1);
    }
    return json_({ ok: true, cleared: cleared });
  }

  // Read-only inventory of both sheets: row count plus the registration ids
  // present. Used to verify a clear actually emptied them.
  if (data.action === "list") {
    var out = {};
    var kinds = ["ONLINE", "ONSITE"];
    for (var k = 0; k < kinds.length; k++) {
      var tab2 = ensureTab_(getSpreadsheet_(kinds[k]));
      var lastRow = tab2.getLastRow();
      var ids = [];
      if (lastRow > 1) {
        var col = tab2.getRange(2, 1, lastRow - 1, 1).getValues();
        for (var m = 0; m < col.length; m++) ids.push(String(col[m][0]));
      }
      out[kinds[k]] = { rows: Math.max(0, lastRow - 1), ids: ids };
    }
    return json_({ ok: true, sheets: out });
  }

  var ss, sheet;
  try {
    ss = getSpreadsheet_(data.registration_type);
    sheet = ensureTab_(ss);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }

  if (data.action === "update") {
    var existing = findRow_(sheet, data.registration_id);
    if (existing < 0) return json_({ ok: true, updated: false });
    var patch = data.patch || {};
    for (var key in patch) {
      if (PATCHABLE.indexOf(key) === -1) continue;
      var col = colIndex_(key);
      if (col < 0) continue;
      var value = patch[key] === null || patch[key] === undefined ? "" : String(patch[key]);
      sheet.getRange(existing, col).setValue(value);
    }
    return json_({ ok: true, updated: true });
  }

  // Default: append, or overwrite in place if the registration id is already
  // present, so a retried webhook never duplicates a team.
  var values = COLUMNS.map(function (c) {
    var v = data[c.key];
    return v === undefined || v === null ? "" : String(v);
  });
  var rowIdx = findRow_(sheet, data.registration_id);
  if (rowIdx >= 0) {
    sheet.getRange(rowIdx, 1, 1, COLUMNS.length).setValues([values]);
  } else {
    sheet.appendRow(values);
    rowIdx = sheet.getLastRow();
  }
  return json_({ ok: true, spreadsheetUrl: ss.getUrl(), row: rowIdx });
}

/**
 * ONSITE → the on-site spreadsheet, ONLINE → the online one.
 *
 * Anything else throws rather than quietly falling back to online. A silent
 * default is how on-site rows end up in the online sheet: one payload with a
 * missing or misspelled registration_type and the row lands in the wrong
 * file with nothing to show it went astray.
 */
function getSpreadsheet_(registrationType) {
  var type = String(registrationType == null ? "" : registrationType).toUpperCase();
  if (type !== "ONLINE" && type !== "ONSITE") {
    throw new Error("unknown registration_type: " + JSON.stringify(registrationType));
  }
  var isOnsite = type === "ONSITE";
  var prop = isOnsite ? "spreadsheetIdOnsite" : "spreadsheetIdOnline";
  var name = isOnsite ? SPREADSHEET_NAME_ONSITE : SPREADSHEET_NAME_ONLINE;

  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty(prop);
  var ss = null;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (err) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create(name);
    props.setProperty(prop, ss.getId());
    var def = ss.getSheetByName("Sheet1");
    var tab = ensureTab_(ss);
    if (def && def.getSheetId() !== tab.getSheetId()) ss.deleteSheet(def);
  }
  return ss;
}

function ensureTab_(ss) {
  var sheet = ss.getSheetByName(TAB_NAME);
  if (!sheet) sheet = ss.insertSheet(TAB_NAME);

  // Rewrite the header row whenever it does not match COLUMNS, so that adding
  // or removing a column takes effect on an existing sheet instead of leaving
  // the old headers sitting above differently-shaped rows.
  var width = Math.max(sheet.getLastColumn(), HEADERS.length);
  var current = sheet.getLastRow() === 0
    ? []
    : sheet.getRange(1, 1, 1, width).getValues()[0];
  var matches = current.length >= HEADERS.length;
  for (var i = 0; matches && i < HEADERS.length; i++) {
    if (String(current[i]) !== HEADERS[i]) matches = false;
  }
  // Any stale trailing columns (from a removed field) must be blank.
  for (var j = HEADERS.length; matches && j < current.length; j++) {
    if (String(current[j]) !== "") matches = false;
  }

  if (!matches) {
    if (width > HEADERS.length) {
      sheet.getRange(1, HEADERS.length + 1, 1, width - HEADERS.length).clearContent();
    }
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sheet;
}

function findRow_(sheet, registrationId) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === String(registrationId)) return i + 2;
  }
  return -1;
}

function json_(obj) {
  var out = ContentService.createTextOutput(JSON.stringify(obj));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}
