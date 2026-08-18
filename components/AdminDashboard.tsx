"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Stats } from "@/lib/stats";
import type { ListResult, RegistrationRow, AdminSummary } from "@/lib/admin";
import { formatAmount } from "@/lib/upi";

interface Props {
  initialStats: Stats | null;
  initialList: ListResult | null;
  initialSummary: AdminSummary | null;
  adminUser: string;
  feePerHead: number;
}

const MODES = ["ONLINE", "ONSITE"] as const;

type OnspotForm = {
  full_name: string;
  email: string;
  phone: string;
  college: string;
  department: string;
  year: string;
  team_name: string;
  team_size: string;
  member_names: Record<number, string>;
};

const EMPTY_ONSPOT: OnspotForm = {
  full_name: "",
  email: "",
  phone: "",
  college: "",
  department: "",
  year: "",
  team_name: "",
  team_size: "2",
  member_names: { 2: "", 3: "", 4: "" },
};

export function AdminDashboard({
  initialStats,
  initialList,
  initialSummary,
  adminUser,
  feePerHead,
}: Props) {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(initialStats);
  const [summary, setSummary] = useState<AdminSummary | null>(initialSummary);
  const [data, setData] = useState<ListResult | null>(initialList);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [viewing, setViewing] = useState<RegistrationRow | null>(null);

  const [showOnspot, setShowOnspot] = useState(false);
  const [onspot, setOnspot] = useState<OnspotForm>(EMPTY_ONSPOT);
  const [onspotErrors, setOnspotErrors] = useState<Record<string, string>>({});
  const [onspotSubmitting, setOnspotSubmitting] = useState(false);
  const [onspotError, setOnspotError] = useState<string | null>(null);

  const buildQuery = useCallback(
    (overrides?: Partial<{ search: string; mode: string; status: string; page: number }>) => {
      const p = new URLSearchParams();
      const s = (overrides?.search ?? search).trim();
      const m = overrides?.mode ?? mode;
      const st = overrides?.status ?? status;
      const pg = overrides?.page ?? page;
      if (s) p.set("search", s);
      if (m) p.set("mode", m);
      if (st) p.set("status", st);
      p.set("page", String(pg));
      p.set("limit", "25");
      return p.toString();
    },
    [search, mode, status, page],
  );

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/registrations?${buildQuery()}`, { cache: "no-store" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      if (!res.ok) throw new Error();
      setData((await res.json()) as ListResult);
    } catch {
      setError("Failed to load registrations.");
    } finally {
      setLoading(false);
    }
  }, [buildQuery, router]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/summary", { cache: "no-store" });
      if (res.ok) setSummary((await res.json()) as AdminSummary);
    } catch {
      /* keep last known */
    }
  }, []);

  // Refetch when filters/page change (debounced for search).
  useEffect(() => {
    const t = setTimeout(fetchList, search ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, mode, status, page]);

  // Live stats via SSE.
  useEffect(() => {
    let es: EventSource | null = null;
    async function boot() {
      try {
        const r = await fetch("/api/registration/stats", { cache: "no-store" });
        if (r.ok) setStats((await r.json()) as Stats);
      } catch {
        /* ignore */
      }
      if (typeof EventSource === "undefined") return;
      es = new EventSource("/api/realtime");
      es.addEventListener("stats", (ev) => {
        try {
          setStats(JSON.parse((ev as MessageEvent).data) as Stats);
          void fetchSummary();
        } catch {
          /* ignore */
        }
      });
    }
    void boot();
    return () => es?.close();
  }, [fetchSummary]);

  async function runAction(id: number, action: string) {
    setUpdatingId(id);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error ?? "Update failed.");
        return;
      }
      setNotice(
        action === "verify"
          ? `Payment verified for ${d.registration_id}.`
          : `${action}d ${d.registration_id}.`,
      );
      await fetchList();
      await fetchSummary();
    } catch {
      setError("Network error during update.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function submitOnspot(e: React.FormEvent) {
    e.preventDefault();
    if (onspotSubmitting) return;
    setOnspotSubmitting(true);
    setOnspotError(null);
    setOnspotErrors({});
    try {
      const teamSize = Math.min(4, Math.max(2, Number(onspot.team_size) || 2));
      const res = await fetch("/api/admin/onspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...onspot,
          team_size: teamSize,
          team_name: onspot.team_name || undefined,
          member_names: [2, 3, 4].slice(0, teamSize - 1).map((n) => onspot.member_names[n] ?? ""),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (d.fields) setOnspotErrors(d.fields);
        setOnspotError(d.error ?? "Could not create the registration.");
        return;
      }
      setNotice(d.message ?? "On-spot registration created.");
      setShowOnspot(false);
      setOnspot(EMPTY_ONSPOT);
      await fetchList();
      await fetchSummary();
    } catch {
      setOnspotError("Network error.");
    } finally {
      setOnspotSubmitting(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const onspotSize = Math.min(4, Math.max(2, Number(onspot.team_size) || 2));
  const onspotAmount = feePerHead * onspotSize;

  const memberList = (r: RegistrationRow): string[] =>
    r.members ? r.members.split(", ").map((s) => s.trim()) : [];

  return (
    <div>
      {/* Participants */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Total teams" value={stats?.total ?? 0} capacity={stats?.totalCapacity} />
        <StatTile label="Online" value={stats?.online ?? 0} capacity={stats?.onlineCapacity} />
        <StatTile label="On-site" value={stats?.onsite ?? 0} capacity={stats?.onsiteCapacity} />
      </div>

      {/* Teams + payments */}
      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Total teams" value={summary?.totalTeams ?? 0} />
        <StatTile label="Online teams" value={summary?.onlineTeams ?? 0} />
        <StatTile label="On-site teams" value={summary?.onsiteTeams ?? 0} />
        <StatTile label="Seats left" value={stats?.totalSeatsLeft ?? 0} />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Online paid" value={summary?.onlinePaidTeams ?? 0} sub={`${summary?.onlinePaidParticipants ?? 0} participants`} />
        <StatTile label="On-site payments" value={summary?.onsitePaidTeams ?? 0} />
        <StatTile label="Pending payments" value={summary?.pendingPayments ?? 0} tone="warn" />
        <StatTile label="Total collected" value={summary?.totalCollected ?? 0} money />
      </div>

      {/* Controls */}
      <div className="panel mt-6 rounded-xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            type="search"
            placeholder="Search name, email, ID, team, txn ID, college…"
            className="field flex-1"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Search registrations"
          />
          <select
            className="field w-auto"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by channel"
          >
            <option value="">All channels</option>
            {MODES.map((m) => (
              <option key={m} value={m}>{m === "ONLINE" ? "ONLINE" : "ONSITE (on-spot)"}</option>
            ))}
          </select>
          <select
            className="field w-auto"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="PENDING">PENDING (payment)</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setOnspot(EMPTY_ONSPOT);
                setOnspotError(null);
                setOnspotErrors({});
                setShowOnspot(true);
              }}
              className="btn btn-ghost px-4 py-2.5 text-sm"
            >
              + On-spot registration
            </button>
            {/* One download per channel plus a combined list. Plain links so
                the browser handles the download and the CSV never passes
                through client memory. */}
            <a
              href="/api/admin/export?channel=online"
              className="btn btn-ghost px-4 py-2.5 text-sm"
            >
              ⬇ Online CSV
            </a>
            <a
              href="/api/admin/export?channel=onsite"
              className="btn btn-ghost px-4 py-2.5 text-sm"
            >
              ⬇ On-spot CSV
            </a>
            <a
              href="/api/admin/export"
              className="btn btn-ghost px-4 py-2.5 text-sm"
            >
              ⬇ All CSV
            </a>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-[#f2a9a6]">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="mt-4 rounded-lg border border-signal/40 bg-signal/10 px-4 py-3 text-sm text-[#9fe8c3]">
          {notice}
        </div>
      )}

      {/* On-spot modal */}
      {showOnspot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="On-spot registration">
          <form onSubmit={submitOnspot} className="panel max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="display text-lg text-fg">On-spot registration</h2>
              <button
                type="button"
                onClick={() => setShowOnspot(false)}
                className="btn btn-ghost px-2.5 py-1 text-sm"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="mt-1 text-xs text-mut">
              Collected at the counter: {formatAmount(onspotAmount)} ({feePerHead}/head × {onspotSize}).
              Seat counts against the on-spot cap (10) and total (30).
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={onspotErrors.full_name}>
                <input className="field" value={onspot.full_name}
                  onChange={(e) => setOnspot({ ...onspot, full_name: e.target.value })} required />
              </Field>
              <Field label="Email" error={onspotErrors.email}>
                <input type="email" className="field" value={onspot.email}
                  onChange={(e) => setOnspot({ ...onspot, email: e.target.value })} required />
              </Field>
              <Field label="Phone" error={onspotErrors.phone}>
                <input type="tel" className="field" value={onspot.phone}
                  onChange={(e) => setOnspot({ ...onspot, phone: e.target.value })} required />
              </Field>
              <Field label="College" error={onspotErrors.college}>
                <input className="field" value={onspot.college}
                  onChange={(e) => setOnspot({ ...onspot, college: e.target.value })} required />
              </Field>
              <Field label="Department" error={onspotErrors.department}>
                <input className="field" value={onspot.department}
                  onChange={(e) => setOnspot({ ...onspot, department: e.target.value })} required />
              </Field>
              <Field label="Year" error={onspotErrors.year}>
                <select className="field" value={onspot.year} required
                  onChange={(e) => setOnspot({ ...onspot, year: e.target.value })}>
                  <option value="">—</option>
                  {["1", "2", "3", "4", "5+"].map((y) => (
                    <option key={y} value={y}>{y === "5+" ? "5+ / Graduate" : `Year ${y}`}</option>
                  ))}
                </select>
              </Field>
              <Field label="Team name (optional)">
                <input className="field" value={onspot.team_name}
                  onChange={(e) => setOnspot({ ...onspot, team_name: e.target.value })} />
              </Field>
              <Field label="Team size (2–4 members)" error={onspotErrors.team_size}>
                <select className="field" value={onspot.team_size}
                  onChange={(e) => setOnspot({ ...onspot, team_size: e.target.value })}
                  onBlur={(e) => setOnspot({ ...onspot, team_size: String(Math.min(4, Math.max(2, Number(e.target.value) || 2))) })}
                  required>
                  {[2, 3, 4].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-4">
              <p className="mb-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-mut">TEAM MEMBERS</p>
              <p className="mb-3 text-xs text-dim">
                Member 1 is the team leader ({onspot.full_name || "name above"}).
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {[2, 3, 4].slice(0, onspotSize - 1).map((n) => (
                  <Field key={n} label={`Member ${n} name`}>
                    <input className="field"
                      value={onspot.member_names[n] ?? ""}
                      onChange={(e) => setOnspot({ ...onspot, member_names: { ...onspot.member_names, [n]: e.target.value } })}
                      required />
                  </Field>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-signal/30 bg-signal/[0.06] px-4 py-3 text-sm">
              <span className="text-mut">Amount collected: </span>
              <span className="font-mono font-bold text-signal">{formatAmount(onspotAmount)}</span>
            </div>

            {onspotError && (
              <p role="alert" className="mt-4 text-sm text-[#f2a9a6]">{onspotError}</p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowOnspot(false)}
                className="btn btn-ghost px-4 py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={onspotSubmitting}
                className="btn btn-primary px-5 py-2.5 text-sm font-bold"
              >
                {onspotSubmitting ? "Saving…" : "Confirm & collect"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="panel mt-6 overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-white/[0.02] text-[10px] uppercase tracking-[0.14em] text-dim">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Leader</th>
                <th className="px-4 py-3 font-semibold">Mode</th>
                <th className="px-4 py-3 font-semibold">Team</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading && !data ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-mut">
                    Loading registrations…
                  </td>
                </tr>
              ) : data && data.rows.length > 0 ? (
                data.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-fg">
                      {r.registration_id}
                    </td>
                    <td className="px-4 py-3 font-medium text-fg">
                      {r.full_name}
                      <span className="block text-xs text-dim">{r.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={modeBadge(r.registration_type)}>
                        {r.registration_type === "ONLINE" ? "ONLINE" : "ON-SPOT"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-mut">
                      {r.team_name || "—"}
                      <span className="block text-xs text-dim">size {r.team_size}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-fg">
                      {formatAmount(r.amount ?? feePerHead * r.team_size)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`chip ${paymentBadge(r.payment_status)}`}>
                        {r.payment_status}
                      </span>
                      {r.txn_id && (
                        <span className="block font-mono text-[11px] text-dim">txn: {r.txn_id}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`chip ${statusChip(r.status)}`}>{r.status}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-dim">
                      {new Date(r.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex gap-1.5">
                        <ActionBtn onClick={() => setViewing(r)} tone="ghost">View</ActionBtn>
                        {r.registration_type === "ONSITE" && r.status === "PENDING" && r.payment_status === "PAY_AT_VENUE" && (
                          <ActionBtn disabled={updatingId === r.id} onClick={() => runAction(r.id, "verify")} tone="paid">
                            Collect ₹{r.amount}
                          </ActionBtn>
                        )}
                        {r.status === "PENDING" && r.payment_status === "SUBMITTED" && (
                          <ActionBtn disabled={updatingId === r.id} onClick={() => runAction(r.id, "verify")} tone="paid">
                            Verify
                          </ActionBtn>
                        )}
                        {(r.status === "PENDING" || r.status === "CONFIRMED") && (
                          <>
                            <ActionBtn disabled={updatingId === r.id} onClick={() => runAction(r.id, "cancel")} tone="ghost">
                              Cancel
                            </ActionBtn>
                            {r.status === "PENDING" && (
                              <ActionBtn disabled={updatingId === r.id} onClick={() => runAction(r.id, "reject")} tone="bad">
                                Reject
                              </ActionBtn>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-mut">
                    No registrations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
            <span className="text-mut">
              {data.total} total · page {data.page} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn-ghost px-3 py-1.5 text-xs"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="btn btn-ghost px-3 py-1.5 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Registration ${viewing.registration_id}`}
          onClick={() => setViewing(null)}
        >
          <div className="panel max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="kicker">Registration detail</p>
                <h2 className="mt-1 font-mono text-lg font-bold text-fg">{viewing.registration_id}</h2>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="btn btn-ghost px-2.5 py-1 text-sm"
                aria-label="Close detail"
              >
                ✕
              </button>
            </div>

            <dl className="mt-5 divide-y divide-line rounded-lg border border-line">
              <Row k="Team leader" v={viewing.full_name} />
              <Row k="Email" v={viewing.email} mono />
              <Row k="Phone" v={viewing.phone || "—"} />
              <Row k="College" v={viewing.college || "—"} />
              <Row k="Department" v={viewing.department || "—"} />
              <Row k="Year" v={viewing.year || "—"} />
              <Row k="Mode" v={viewing.registration_type === "ONLINE" ? "ONLINE" : "ON-SITE"} />
              <Row k="Team name" v={viewing.team_name || "—"} />
              <Row k="Team size" v={`${viewing.team_size} members`} />
              <div className="px-4 py-3">
                <dt className="font-mono text-[10px] tracking-[0.14em] text-dim">MEMBERS</dt>
                <dd className="mt-1.5 space-y-1">
                  {memberList(viewing).map((m, i) => (
                    <p key={i} className="text-sm text-fg">
                      <span className="mr-2 font-mono text-[10px] text-dim">{i + 1}.</span>
                      {m}
                      {i === 0 && <span className="ml-2 chip chip-muted">LEADER</span>}
                    </p>
                  ))}
                </dd>
              </div>
              <Row k="Amount" v={formatAmount(viewing.amount ?? feePerHead * viewing.team_size)} />
              <Row k="Payment status" v={viewing.payment_status} />
              <Row k="UPI txn ID" v={viewing.txn_id || "—"} mono />
              <Row k="Payment note" v={viewing.note || "—"} />
              <Row k="Verified by" v={viewing.verified_by || "—"} />
              <Row k="Status" v={viewing.status} />
              <Row k="Created" v={new Date(viewing.created_at).toLocaleString("en-IN")} />
            </dl>

            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setViewing(null)} className="btn btn-ghost px-4 py-2 text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between text-xs text-dim">
        <span>
          Signed in as <span className="font-semibold text-fg">{adminUser}</span>
        </span>
        <button onClick={logout} className="btn btn-ghost px-3 py-1.5 text-xs">
          Sign out
        </button>
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="font-mono text-[10px] tracking-[0.14em] text-dim">{k.toUpperCase()}</dt>
      <dd className={`text-sm text-fg ${mono ? "font-mono text-xs" : "font-medium"}`}>{v}</dd>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] font-semibold tracking-[0.14em] text-mut">
        {label.toUpperCase()}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-[#f2a9a6]">{error}</span>}
    </label>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone: "ghost" | "paid" | "bad";
}) {
  const tones: Record<string, string> = {
    ghost: "btn btn-ghost",
    paid: "btn btn-ghost !border-signal/50 !text-signal",
    bad: "btn btn-danger",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-40 ${tones[tone]}`}
    >
      {children}
    </button>
  );
}

function StatTile({
  label,
  value,
  capacity,
  sub,
  tone,
  money,
}: {
  label: string;
  value: number;
  capacity?: number;
  sub?: string;
  tone?: "warn";
  money?: boolean;
}) {
  return (
    <div className="panel rounded-xl p-4">
      <div className="font-mono text-[10px] font-semibold tracking-[0.16em] text-dim">
        {label.toUpperCase()}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className={`font-mono text-2xl font-bold ${tone === "warn" ? "text-warn" : "text-fg"}`}>
          {money ? formatAmount(value) : value}
        </span>
        {capacity != null && <span className="font-mono text-xs text-dim">/ {capacity}</span>}
      </div>
      {sub && <div className="mt-0.5 font-mono text-[10px] text-dim">{sub}</div>}
    </div>
  );
}

function modeBadge(mode: string): string {
  if (mode === "ONLINE") return "chip chip-open";
  return "chip chip-muted";
}

function paymentBadge(status: string | null): string {
  switch (status) {
    case "VERIFIED":
      return "chip-paid";
    case "SUBMITTED":
      return "chip-pending";
    case "FAILED":
      return "chip-closed";
    default:
      return "chip-pending";
  }
}

function statusChip(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "chip-paid";
    case "PENDING":
      return "chip-pending";
    case "CANCELLED":
      return "chip-muted";
    case "REJECTED":
      return "chip-closed";
    default:
      return "chip-muted";
  }
}