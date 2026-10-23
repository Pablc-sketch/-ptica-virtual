export type CatalogImage = { url: string; alt: string };
/** Color de un modelo. `front` (y `back`, si existe) son las fotos en fondo blanco de ese color: cambian al elegir color. */
export type CatalogVariant = { id: string; name: string; hex: string; hex2: string | null; front: CatalogImage | null; back?: CatalogImage | null };
export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  sku: string | null;
  brand: string | null;
  description: string | null;
  priceClp: number | null;
  pairBasePriceClp?: number | null;
  isSample?: boolean;
  frameShape: string | null;
  material: string | null;
  color: string | null;
  gender: string | null;
  lensWidthMm: number | null;
  bridgeMm: number | null;
  templeMm: number | null;
  images: CatalogImage[];
  modelUrl: string | null;
  use?: "optical" | "solar";
  variants?: CatalogVariant[];
  /** Fotos de contexto del modelo (no cambian con el color). */
  contextImages?: CatalogImage[];
};
