import type { CatalogProduct } from './catalog-types';
import { matchesCategory } from './catalog-categories';
import { clp } from './format';

// Paquete neutro independiente del filtro azul con receta (+$20.000).
export const SCREEN_LENSES = { fromClp: 38000, extraClp: 10000 } as const;
export function screenPairPrice(p: CatalogProduct) {
  const base = p.pairBasePriceClp;
  return matchesCategory(p, 'filtro-azul') && base != null && Number.isSafeInteger(base) && base > 0
    ? base + SCREEN_LENSES.extraClp : null;
}
export function screenInquiry(p: CatalogProduct, color?: string | null) {
  const price = screenPairPrice(p);
  const message = `Hola, quiero mis lentes para pantallas: ${p.name}, color ${color || p.color || 'de la foto'}. Marco + cristales con filtro de luz azul SIN AUMENTO (0.00), sin receta${price ? `, desde ${clp(price)} el par` : ''}. ¿Me confirman disponibilidad y despacho?`;
  return `https://wa.me/56975512281?text=${encodeURIComponent(message)}`;
}
