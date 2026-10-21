"use client";
import { useSyncExternalStore } from "react";

const KEY = "optica:comparar";
export const COMPARE_LIMIT = 3;
const EMPTY: string[] = [];
let cachedRaw: string | null | undefined;
let cachedIds: string[] = EMPTY;
let memoryIds: string[] = EMPTY;
let memoryOnly = false;
const listeners = new Set<() => void>();

export function comparisonIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.some(id => typeof id !== "string" || !id || id.length > 80)) return [];
  return [...new Set(value)].slice(0, COMPARE_LIMIT);
}

function snapshot() {
  if (memoryOnly) return memoryIds;
  let raw: string | null;
  try { raw = localStorage.getItem(KEY); }
  catch { memoryOnly = true; return memoryIds; }
  if (raw === cachedRaw) return cachedIds;
  cachedRaw = raw;
  try { cachedIds = raw ? comparisonIds(JSON.parse(raw)) : EMPTY; }
  catch { cachedIds = EMPTY; }
  return cachedIds;
}
function notify() { listeners.forEach(cb => cb()); }
function onStorage(e: StorageEvent) { if (e.key === KEY || e.key === null) notify(); }
function subscribe(cb: () => void) {
  if (!listeners.size) window.addEventListener("storage", onStorage);
  listeners.add(cb);
  return () => { listeners.delete(cb); if (!listeners.size) window.removeEventListener("storage", onStorage); };
}
function write(ids: string[]) {
  memoryIds = ids;
  try { localStorage.setItem(KEY, JSON.stringify(ids)); }
  catch { memoryOnly = true; }
  notify();
}
export function useComparison() { return useSyncExternalStore(subscribe, snapshot, () => EMPTY); }
export function toggleComparison(id: string): "ok" | "limit" {
  const ids = snapshot();
  if (ids.includes(id)) { write(ids.filter(value => value !== id)); return "ok"; }
  if (ids.length >= COMPARE_LIMIT) return "limit";
  write([...ids, id]);
  return "ok";
}
export function clearComparison() { write([]); }
