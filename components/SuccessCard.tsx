"use client";

import Link from "next/link";

export interface ConfirmationData {
  registration_id: string;
  name: string;
  participation_type: string;
  team_name: string | null;
  team_size: number;
  status: string;
  created_at: string;
  event_name: string;
}

export function SuccessCard({ data }: { data: ConfirmationData }) {
  function downloadConfirmation() {
    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>${data.event_name} — Confirmation ${data.registration_id}</title>
<style>
  body{font-family:ui-sans-serif,system-ui,sans-serif;background:#0b1020;color:#e6ebf5;margin:0;padding:48px}
  .card{max-width:640px;margin:0 auto;background:#0c1222;border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:40px}
  h1{font-size:28px;margin:0 0 4px;background:linear-gradient(110deg,#22d3ee,#7c5cff,#f471b5);-webkit-background-clip:text;background-clip:text;color:transparent}
  .id{font-family:ui-monospace,monospace;font-size:32px;font-weight:700;letter-spacing:.04em;margin:24px 0}
  .row{display:flex;justify-content:space-between;padding:12px 0;border-top:1px solid rgba(255,255,255,.08)}
  .label{color:#93a0bd;font-size:13px;text-transform:uppercase;letter-spacing:.08em}
  .val{font-weight:600}
  .foot{margin-top:24px;color:#93a0bd;font-size:13px}
</style></head><body><div class="card">
  <h1>🎉 Registration Successful</h1>
  <p>Welcome to ${data.event_name}!</p>
  <div class="id">${data.registration_id}</div>
  <div class="row"><span class="label">Name</span><span class="val">${escapeHtml(data.name)}</span></div>
  <div class="row"><span class="label">Participation</span><span class="val">${data.participation_type}</span></div>
  <div class="row"><span class="label">Team</span><span class="val">${escapeHtml(data.team_name || "Individual")}</span></div>
  <div class="row"><span class="label">Team size</span><span class="val">${data.team_size}</span></div>
  <div class="row"><span class="label">Status</span><span class="val">${data.status}</span></div>
  <div class="row"><span class="label">Registered at</span><span class="val">${new Date(data.created_at).toLocaleString()}</span></div>
  <p class="foot">Your registration has been successfully recorded. Keep this confirmation for your records.</p>
</div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `confirmation-${data.registration_id}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="glass animate-fade-up rounded-3xl p-8 text-center sm:p-12">
      <div className="text-6xl" aria-hidden="true">🎉</div>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Registration Successful
      </h1>
      <p className="mt-2 text-[var(--color-muted)]">
        Welcome to {data.event_name}!
      </p>

      <div className="mx-auto mt-8 max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
          Registration ID
        </p>
        <p className="mt-1 font-mono text-3xl font-bold gradient-text">
          {data.registration_id}
        </p>

        <div className="mt-6 space-y-3">
          <Row label="Name" value={data.name} />
          <Row label="Participation" value={data.participation_type} />
          <Row label="Team" value={data.team_name || "Individual"} />
          <Row label="Team size" value={String(data.team_size)} />
          <Row label="Status" value={data.status} />
        </div>
      </div>

      <p className="mx-auto mt-6 max-w-md text-sm text-[var(--color-muted)]">
        Your registration has been successfully recorded. Save your registration ID.
      </p>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={downloadConfirmation}
          className="btn-primary inline-flex w-full items-center justify-center rounded-xl px-6 py-3 text-sm sm:w-auto"
        >
          ⬇ Download Confirmation
        </button>
        <Link
          href="/"
          className="inline-flex w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 sm:w-auto"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-t border-white/5 pt-3">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
