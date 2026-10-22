# Migraciones PENDIENTES (no aplicadas)

Estos archivos son propuestas para revisión. **No están aplicados** en `zezqhjikapaelbjavjms` y ningún código desplegado
depende de ellos. Al aplicarlos (por el conector de Codex), Supabase asigna la versión: entonces se mueven a
`supabase/migrations/` con el nombre real del historial y se borra la copia de aquí.

| Archivo | Qué hace | Prueba con rollback |
|---|---|---|
| `02_endurecer_grants.sql` | Quita privilegios de tabla que RLS no necesita (TRUNCATE/TRIGGER/REFERENCES y escrituras sin policy) | `tests/grants-hardening.sql` |

Ninguno toca `storage.objects` ni borra archivos.

La revisión documental ya fue autorizada y aplicada el 21/10/2026 como `supabase/migrations/20261021192923_revision_documental_recetas.sql`. Incluye protección contra versión nula y transiciones inválidas. La prevalidación con reversión pasó; la lectura posterior confirmó versión, RLS y permisos. Las pruebas ampliadas posteriores devolvieron un error del conector (requestState), por lo que no se presentan como ejecutadas con éxito.

| `04_pedidos_laboratorio.sql` | Borradores de pedido para Fides, solo admin: RX transcrita, DP/alturas, bloqueo MF/bifocal sin medición profesional, versión, eventos | `tests/lab-orders-prevalidate.sql` |
