"use client";

import { useSyncExternalStore } from "react";

// Favoritos (solo guardado personal) y selección (marcos para cotizar) viven en el
// navegador del visitante. Nunca se guardan precios ni datos de receta aquí.
const KEYS = { favoritos: "optica:favoritos", seleccion: "optica:seleccion" } as const;
export type SelectionItem = { id: string; quantity: number };

const EMPTY_FAVS: string[] = [];
const EMPTY_SEL: SelectionItem[] = [];
const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: unknown }>();

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function snapshot<T>(key: string, empty: T, valid: (v: unknown) => v is T): T {
  const raw = readRaw(key);
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  let value = empty;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (valid(parsed)) value = parsed;
    } catch {
      /* datos corruptos: se ignoran */
    }
  }
  cache.set(key, { raw, value });
  return value;
}

const isFavs = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
const isSel = (v: unknown): v is SelectionItem[] =>
  Array.isArray(v) &&
  v.every(
    (x) =>
      x && typeof x.id === "string" && Number.isInteger(x.quantity) && x.quantity >= 1 && x.quantity <= 10,
  );

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* navegador sin almacenamiento: la UI sigue funcionando sin persistir */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || Object.values(KEYS).includes(e.key as never)) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useFavorites(): string[] {
  return useSyncExternalStore(
    subscribe,
    () => snapshot(KEYS.favoritos, EMPTY_FAVS, isFavs),
    () => EMPTY_FAVS,
  );
}

export function useSelection(): SelectionItem[] {
  return useSyncExternalStore(
    subscribe,
    () => snapshot(KEYS.seleccion, EMPTY_SEL, isSel),
    () => EMPTY_SEL,
  );
}

export function toggleFavorite(id: string) {
  const cur = snapshot(KEYS.favoritos, EMPTY_FAVS, isFavs);
  write(KEYS.favoritos, cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
}

export function toggleSelection(id: string) {
  const cur = snapshot(KEYS.seleccion, EMPTY_SEL, isSel);
  write(
    KEYS.seleccion,
    cur.some((x) => x.id === id)
      ? cur.filter((x) => x.id !== id)
      : cur.length >= 10
        ? cur
        : [...cur, { id, quantity: 1 }],
  );
}

export function setQuantity(id: string, quantity: number) {
  const q = Math.min(10, Math.max(1, Math.trunc(quantity) || 1));
  const cur = snapshot(KEYS.seleccion, EMPTY_SEL, isSel);
  write(KEYS.seleccion, cur.map((x) => (x.id === id ? { ...x, quantity: q } : x)));
}

export function clearSelection() {
  write(KEYS.seleccion, []);
}
