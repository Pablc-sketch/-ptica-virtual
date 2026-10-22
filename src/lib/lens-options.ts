// Precios iniciales confirmados por Pablo el 21/10/2026. No son precios finales de un SKU.
// El extra azul sustituye al extra antirreflejo; nunca se suman entre sí.
export const LENS_OPTIONS = [
  { id: "blanco", name: "Lente básico", extraClp: 0, fromClp: 28000, note: "Transparente, para el día a día con tu receta." },
  { id: "antirreflejo", name: "Antirreflejo", extraClp: 10000, fromClp: 38000, note: "Tratamiento para reducir reflejos en el cristal." },
  { id: "azul", name: "Filtro azul", extraClp: 20000, fromClp: 48000, note: "Una alternativa con filtro de luz azul." },
] as const;
export type LensOptionId = typeof LENS_OPTIONS[number]["id"];
export const LENS_BASE_FROM_CLP = 28000;
