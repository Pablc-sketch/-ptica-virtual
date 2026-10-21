// Validación de REGLAS del cotizador para los formularios admin (no es el motor; el motor es optical-quote-engine.ts).
// Refleja las restricciones de supabase/pendientes/03_reglas_cotizador.sql para dar errores claros antes de guardar.

export type RxComponent = "sph" | "cyl";
export type SurchargePolicy = "max_per_pair" | "sum_per_eye";
export type BandInput = { id?: string; component: RxComponent; min: number; max: number; surchargeClp: number; status: "draft" | "published" | "archived" };

/** Lee dioptrías escritas como "-1,75", "+2.00" o "0". Devuelve null si no es un número en pasos de 0,25 dentro de ±40. */
export function parseDiopter(raw: string): number | null {
  const s = raw.trim().replace(",", ".").replace(/^\+/, "");
  if (!/^-?\d{1,2}(\.\d{1,2})?$/.test(s)) return null;
  const v = Number(s);
  if (!Number.isFinite(v) || Math.abs(v) > 40 || Math.round(v * 4) !== v * 4) return null;
  return Object.is(v, -0) ? 0 : v;
}

export function validateBand(b: BandInput): string | null {
  if (b.component !== "sph" && b.component !== "cyl") return "Componente inválido.";
  for (const v of [b.min, b.max]) {
    if (!Number.isFinite(v) || Math.abs(v) > 40 || Math.round(v * 4) !== v * 4) return "Los valores deben ir en pasos de 0,25 D y dentro de ±40.";
  }
  if (b.min > b.max) return "El mínimo no puede ser mayor que el máximo.";
  if (b.component === "cyl" && b.max > 0) return "El cilindro se registra en notación negativa (máximo ≤ 0).";
  if (!Number.isInteger(b.surchargeClp) || b.surchargeClp < 0) return "El recargo debe ser un entero en pesos, 0 o mayor.";
  return null;
}

/** Bandas PUBLICADAS del mismo componente que se solapan (bordes incluidos), igual que el trigger de la base. */
export function findOverlaps(bands: BandInput[]): [BandInput, BandInput][] {
  const pub = bands.filter((b) => b.status === "published");
  const out: [BandInput, BandInput][] = [];
  for (let i = 0; i < pub.length; i++) {
    for (let j = i + 1; j < pub.length; j++) {
      const a = pub[i], b = pub[j];
      if (a.component === b.component && a.min <= b.max && b.min <= a.max) out.push([a, b]);
    }
  }
  return out;
}

/** Huecos entre bandas publicadas (informativo: un valor en un hueco hace que el motor pida revisión). */
export function findGaps(bands: BandInput[], component: RxComponent): { from: number; to: number }[] {
  const pub = bands.filter((b) => b.status === "published" && b.component === component).sort((a, b) => a.min - b.min);
  const gaps: { from: number; to: number }[] = [];
  for (let i = 1; i < pub.length; i++) {
    const nextAllowed = pub[i - 1].max + 0.25;
    if (pub[i].min > nextAllowed) gaps.push({ from: nextAllowed, to: pub[i].min - 0.25 });
  }
  return gaps;
}
