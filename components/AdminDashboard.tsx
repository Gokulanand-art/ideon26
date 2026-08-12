"use client";

import { useCallback, useEffect, useState } from "react";
import type { Stats } from "@/lib/stats";
import type { RegistrationRow, ListResult } from "@/lib/admin";

interface Props {
  initialStats: Stats | null;
  initialList: ListResult | null;
  adminUser: string;
}

const STATUSES = ["CONFIRMED", "PENDING", "CANCELLED", "REJECTED"] as const;
const MODES = ["ONLINE", "ONSITE"] as const;

export function AdminDashboard({ initialStats, initialList, adminUser }: Props) {
  const [stats, setStats] = useState<Stats | null>(initialStats);
  const [data, setData] = useState<ListResult | null>(initialList);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        window.location.href = "/admin/login";
        return;
      }
      if (!res.ok) throw new Error();
      setData((await res.json()) as ListResult);
    } catch {
      setError("Failed to load registrations.");
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

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
        } catch {
          /* ignore */
        }
      });
    }
    void boot();
    return () => es?.close();
  }, []);

  async function changeStatus(id: number, newStatus: string) {
    setUpdatingId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Update failed.");
        return;
      }
      await fetchList();
    } catch {
      setError("Network error during update.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <div>
      {/* Stats overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Total registered" value={stats?.total ?? 0} capacity={stats?.totalCapacity} />
        <StatTile label="Online" value={stats?.online ?? 0} capacity={stats?.onlineCapacity} />
        <StatTile label="On-site" value={stats?.onsite ?? 0} capacity={stats?.onsiteCapacity} />
      </div>

      {/* Controls */}
      <div className="glass mt-6 rounded-2xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            type="search"
            placeholder="Search name, email, ID, team, college…"
            className="field flex-1 rounded-xl px-4 py-2.5 text-sm"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className="field rounded-xl px-3 py-2.5 text-sm"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by mode"
          >
            <option value="">All modes</option>
            {MODES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            className="field rounded-xl px-3 py-2.5 text-sm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <a
            href="/api/admin/export"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-white/10"
          >
            ⬇ Export CSV
          </a>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="glass mt-6 overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-[var(--color-muted)]">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">College</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && !data ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[var(--color-muted)]">
                    Loading registrations…
                  </td>
                </tr>
              ) : data && data.rows.length > 0 ? (
                data.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-white">
                      {r.registration_id}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{r.full_name}</td>
                    <td className="px-4 py-3 text-[var(--color-muted)]">{r.email}</td>
                    <td className="px-4 py-3">
                      <span className={modeBadge(r.participation_type)}>
                        {r.participation_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted)]">
                      {r.team_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-muted)]">{r.college}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-muted)]">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={r.status}
                        disabled={updatingId === r.id}
                        onChange={(e) => changeStatus(r.id, e.target.value)}
                        className={`rounded-lg border px-2 py-1 text-xs font-semibold ${statusSelectColor(r.status)}`}
                        aria-label={`Change status for ${r.registration_id}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[var(--color-muted)]">
                    No registrations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-sm">
            <span className="text-[var(--color-muted)]">
              {data.total} total · page {data.page} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between text-xs text-[var(--color-muted)]">
        <span>Signed in as <span className="font-semibold text-white">{adminUser}</span></span>
        <button onClick={logout} className="rounded-lg border border-white/10 px-3 py-1.5 hover:bg-white/5">
          Sign out
        </button>
      </div>
    </div>
  );
}

function StatTile({ label, value, capacity }: { label: string; value: number; capacity?: number }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
        {label}
      </div>
      <div className="mt-2 flex items-end gap-1.5">
        <span className="font-mono text-3xl font-bold text-white">{value}</span>
        {capacity != null && (
          <span className="mb-1 font-mono text-sm text-[var(--color-muted)]">/ {capacity}</span>
        )}
      </div>
    </div>
  );
}

function modeBadge(mode: string): string {
  if (mode === "ONLINE") return "rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-xs font-semibold text-cyan-300";
  return "rounded-full bg-fuchsia-500/15 px-2.5 py-0.5 text-xs font-semibold text-fuchsia-300";
}

function statusSelectColor(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "PENDING":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    case "CANCELLED":
      return "border-zinc-500/40 bg-zinc-500/10 text-zinc-300";
    case "REJECTED":
      return "border-rose-500/40 bg-rose-500/10 text-rose-300";
    default:
      return "border-white/10 bg-white/5 text-white";
  }
}
