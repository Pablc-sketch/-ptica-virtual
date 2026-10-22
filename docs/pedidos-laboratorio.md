# Borradores de pedido de laboratorio (Fides) — solo administración

Estado: **SQL propuesto, no aplicado** (`supabase/pendientes/04_pedidos_laboratorio.sql`; prevalidación
`tests/lab-orders-prevalidate.sql`, esperado `LAB_OK`). El código de esta rama depende de esa migración: no desplegar antes.

## Alcance
- Prepara un pedido verificable. **No** envía a Fides, **no** tiene estados de pago/fabricación y **no** autoriza fabricar sin
  revisión profesional. Cotizaciones y pagos siguen cerrados.
- La RX se **transcribe a mano** por un admin desde el archivo original (OD/OI ESF/CIL/EJE/ADD, DP monocular, alturas).
  Nada se calcula: no hay autodiagnóstico, conversión de ADD ni medición con selfie.

## Flujo
`/admin/recetas` (receta con revisión documental completada y marco elegido) → **Crear borrador de pedido** →
`/admin/pedidos/[id]`: transcripción, guardado con versión, lista de bloqueos → **Validar** (confirmando que se comparó con el
original) → vista imprimible y CSV. Reabrir vuelve a borrador; cancelar es definitivo.

## Reglas (en la base y reflejadas en `src/lib/lab-order.ts`)
| Bloqueo | Regla |
|---|---|
| Receta | `prescriptions.status = 'reviewed'` y con contexto de selección (marco, familia, tratamiento) |
| Proveedor | `product_procurement.confirmed` del marco (código privado; nunca `products.sku` ni público) |
| RX | ESF y CIL de ambos ojos; EJE obligatorio si CIL ≠ 0; DP monocular de ambos ojos |
| Monofocal | uso confirmado (lejos/cerca) y **sin ADD** (no se convierte; el campo se desactiva) |
| Bifocal/Multifocal | ADD y alturas de ambos ojos + medición profesional sobre marco ajustado (responsable y fecha) |

## Seguridad y privacidad
- Tablas `lab_orders`/`lab_order_events` solo admin (RLS). Clientes y anon: sin grants útiles ni filas. Sin DELETE (se cancela).
- Cada API usa `requireAdminApi` (401/403/503) + mismo origen en mutaciones; las páginas usan `requireAdmin`.
- Concurrencia: `UPDATE ... WHERE version = esperada` + trigger que exige `version + 1` (409 si otra persona cambió el pedido).
- Un cambio de estado no puede editar la transcripción en la misma operación (se valida exactamente lo guardado).
- CSV solo de pedidos validados; celdas que empiezan con `= + - @` (no numéricas) se neutralizan; sin URLs firmadas ni datos
  de la persona. La receta original se abre aparte con enlace de 60 s y se imprime por separado; nunca se guarda su URL.
- Si la persona borra su receta, su borrador de pedido se borra con ella (ON DELETE CASCADE).

## Pruebas
- `tests/lab-order.test.ts` (unitarias: transcripción, bloqueos alineados con el SQL, CSV seguro, errores).
- `npm run test:e2e`: 24 comprobaciones de pedidos contra un **Supabase simulado** (no es RLS real): permisos anon/cliente/admin,
  origen, receta no revisada, pedido único, transcripción y pasos, versión obsoleta, confirmación al validar, CSV, hoja
  imprimible sin URL firmada, reabrir, ADD bloqueada en monofocal (UI y API), multifocal sin alturas/medición, axe.
- RLS real: `tests/lab-orders-prevalidate.sql` (no ejecutado por Claude).
