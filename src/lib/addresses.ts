// Direcciones de despacho: validación compartida (servidor) y regiones de Chile.
export const REGIONES = [
  "Arica y Parinacota", "Tarapacá", "Antofagasta", "Atacama", "Coquimbo", "Valparaíso", "Metropolitana",
  "O'Higgins", "Maule", "Ñuble", "Biobío", "La Araucanía", "Los Ríos", "Los Lagos", "Aysén", "Magallanes",
] as const;

export type AddressInput = {
  recipient: string; phone: string; region: string; comuna: string; street: string; street_number: string;
  unit: string | null; notes: string | null;
};
export type Address = AddressInput & { id: string; is_default: boolean };

const LIMITS: Record<keyof AddressInput, [number, number]> = {
  recipient: [2, 120], phone: [6, 30], region: [2, 60], comuna: [2, 60], street: [2, 120], street_number: [1, 20], unit: [0, 40], notes: [0, 300],
};

export function parseAddress(get: (k: string) => unknown): { ok: true; value: AddressInput } | { ok: false; error: string } {
  const v = {} as Record<keyof AddressInput, string | null>;
  for (const k of Object.keys(LIMITS) as (keyof AddressInput)[]) {
    const raw = get(k);
    const s = typeof raw === "string" ? raw.trim() : "";
    const [min, max] = LIMITS[k];
    if (s.length > max || (min > 0 && s.length < min)) return { ok: false, error: k };
    v[k] = s || null;
  }
  if (!(REGIONES as readonly string[]).includes(v.region!)) return { ok: false, error: "region" };
  if (!/^[+\d][\d\s-]{5,29}$/.test(v.phone!)) return { ok: false, error: "phone" };
  return { ok: true, value: v as AddressInput };
}

export const formatAddress = (a: Pick<Address, "street" | "street_number" | "unit" | "comuna" | "region">) =>
  `${a.street} ${a.street_number}${a.unit ? `, ${a.unit}` : ""}, ${a.comuna}, ${a.region}`;
