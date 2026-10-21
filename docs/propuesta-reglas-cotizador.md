# Propuesta: almacenamiento y administración de reglas del motor de cotización

Estado: **propuesta, no aplicada** (`supabase/pendientes/03_reglas_cotizador.sql`; prevalidación `tests/quote-rules-prevalidate.sql`,
esperado `RULES_OK`). El motor (`src/lib/optical-quote-engine.ts`) es de Codex; esto solo guarda y administra sus reglas.

## Qué se guarda y qué significa
| Dato | Dónde | Confirmado | Si falta |
|---|---|---|---|
| Precio del marco solo | `products.price_clp` (sin cambios) | sí, por marco | — |
| Base del **par completo** (marco + cristal blanco monofocal, sin recargo por graduación) | `products.pair_base_price_clp`, **nullable** | **no** (por marco) | motor: `requires_review` |
| Tratamiento alternativo (uno por par) | `lens_treatments`: blanco 0 · antirreflejo 10.000 · filtro azul 20.000 | sí | — |
| Recargo por graduación | `rx_surcharge_bands` (ESF y CIL, valores firmados, pasos 0,25, CIL negativo) | **no** (tabla vacía) | `requires_review` |
| Cómo se combinan los recargos de ambos ojos | `quote_engine_settings.surcharge_policy` = `max_per_pair` \| `sum_per_eye` | **no** (NULL) | `requires_review` |

$28.000 / $38.000 / $48.000 son precios **desde** del par completo: se muestran como "desde" (p. ej. el mínimo publicado de
`pair_base_price_clp` + recargo del tratamiento), **nunca** se asume que cada marco tiene base $28.000.

## Garantías en la base
- Bandas publicadas del mismo componente no se solapan (trigger); borradores pueden solaparse mientras se editan.
- Un valor fuera de toda banda, o en un hueco, no tiene recargo implícito: el motor pide revisión.
- Cilindro solo en notación negativa: no se transpone (sería recálculo clínico); cilindro positivo => revisión.
- Lectura pública solo de reglas publicadas; escritura solo admin (RLS). Cada regla guarda `confirmed_source`/`confirmed_at`.
- No se abren cotizaciones ni pagos; `create_quote` sigue revocado.

## Contrato sugerido hacia el motor (solo datos publicados)
```ts
type EngineRules = {
  pairBaseClp: number | null;                    // products.pair_base_price_clp del marco
  treatments: { code: string; surchargeClp: number }[];
  bands: { component: "sph" | "cyl"; min: number; max: number; surchargeClp: number }[];
  policy: "max_per_pair" | "sum_per_eye" | null;
};
```
El servidor debe leer estas reglas en el momento de cotizar (nunca aceptar precios ni reglas desde el cliente) y guardar una
instantánea en la cotización cuando se habilite.

## Administración propuesta (UI no construida hasta aplicar la migración)
- `/admin/cotizador/tratamientos`: editar nombre/recargo/estado; cambio de recargo exige escribir quién lo confirmó.
- `/admin/cotizador/bandas`: tabla por componente con mínimo/máximo/recargo/estado; validación con `src/lib/quote-rules.ts`
  (pasos de 0,25, cilindro negativo, solapes y aviso de huecos) antes de publicar; la base vuelve a validar.
- `/admin/cotizador/politica`: elegir `max_per_pair` o `sum_per_eye` con confirmación explícita (fuente y fecha).
- En la ficha admin de cada marco: campo "Base del par completo (opcional)" junto a "Precio del marco", con texto que aclare la diferencia.
- Vista previa: probar una receta sintética contra las reglas publicadas y ver el resultado del motor, incluido `requires_review`.

## Pendiente de Pablo
Rangos ESF/CIL y sus recargos, política (máximo por par o suma por ojo), base del par por marco, fotocromático y progresivos.
