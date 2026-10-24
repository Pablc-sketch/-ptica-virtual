import type { CatalogProduct } from './catalog-types';
import { frameDesign } from './frame-design';

export const CATALOG_CATEGORIES = [
  ['', 'Todos'], ['mujer', 'Ópticos mujer'], ['hombre', 'Ópticos hombre'],
  ['sol', 'Lentes de sol'], ['filtro-azul', 'Pantallas · sin aumento'],
] as const;
export type CatalogCategory = typeof CATALOG_CATEGORIES[number][0];
export function categoryHref(category: CatalogCategory) {
  return category === 'filtro-azul' ? '/sin-aumento' : category ? `/marcos?categoria=${category}` : '/marcos';
}
export function matchesCategory(p: CatalogProduct, category: CatalogCategory) {
  if (!category) return true;
  const use = p.use ?? frameDesign(p.slug)?.use;
  if (category === 'sol') return use === 'solar';
  if (use !== 'optical') return false;
  if (category === 'filtro-azul') return true;
  // Los dos modelos iniciales no tenían género registrado; ambos son cat-eye de mujer.
  const fallback = ['cat-eye-ambar', 'cat-eye-mosaico'].includes(p.slug) ? 'mujer' : '';
  const gender = (p.gender ?? fallback).trim().toLowerCase();
  return ['unisex', category, category === 'mujer' ? 'female' : 'male', category === 'mujer' ? 'femenino' : 'masculino'].includes(gender);
}
