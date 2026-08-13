"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel mt-10 rounded-xl p-8" noValidate>
      <div>
        <label
          htmlFor="username"
          className="mb-1.5 block font-mono text-[11px] font-semibold tracking-[0.14em] text-mut"
        >
          USERNAME
        </label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          className="field"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
          required
        />
      </div>
      <div className="mt-4">
        <label
          htmlFor="password"
          className="mb-1.5 block font-mono text-[11px] font-semibold tracking-[0.14em] text-mut"
        >
          PASSWORD
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
        />
      </div>
      {error && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-[#f2a9a6]"
        >
          {error}
        </div>
      )}
      <button
        type="submit"
        className="btn btn-primary mt-6 w-full px-6 py-3 text-sm font-bold"
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}