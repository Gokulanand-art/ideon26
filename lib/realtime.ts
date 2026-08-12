/**
 * In-process realtime broadcaster.
 *
 * After any successful registration (or admin status change) we compute fresh
 * stats and broadcast them. The public SSE endpoint (`/api/realtime`) subscribes
 * to this bus and pushes updates to every connected browser — so seat counters
 * update live without a page refresh.
 *
 * This works for any single-process deployment (next dev, next start, a single
 * container, Vercel hobby). For multi-instance production setups, wire this to
 * Postgres LISTEN/NOTIFY or Supabase Realtime (see README).
 */
import { EventEmitter } from "node:events";
import type { Stats } from "./stats";

const bus = new EventEmitter();
bus.setMaxListeners(0);

export type StatsListener = (stats: Stats) => void;

export function broadcastStats(stats: Stats): void {
  bus.emit("stats", stats);
}

export function onStats(listener: StatsListener): () => void {
  bus.on("stats", listener);
  return () => bus.off("stats", listener);
}
