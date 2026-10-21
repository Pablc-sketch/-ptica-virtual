# Migraciones PENDIENTES (no aplicadas)

Estos archivos son propuestas para revisión. **No están aplicados** en `zezqhjikapaelbjavjms` y ningún código desplegado
depende de ellos. Al aplicarlos (por el conector de Codex), Supabase asigna la versión: entonces se mueven a
`supabase/migrations/` con el nombre real del historial y se borra la copia de aquí.

| Archivo | Qué hace | Prueba con rollback |
|---|---|---|
| `01_revision_documental_recetas.sql` | Estados de revisión documental, transición solo por función admin, historial privado, concurrencia optimista, reemplazo de archivo | `tests/prescriptions-review-rls.sql` |
| `03_paquetes_cristales.sql` | Paquetes de cristales excluyentes con precio "desde, por par" confirmado (blanco 28.000, antirreflejo 38.000, filtro azul 48.000); uso lejos/cerca | `tests/lens-packages-prevalidate.sql` |
| `02_endurecer_grants.sql` | Quita privilegios de tabla que RLS no necesita (TRUNCATE/TRIGGER/REFERENCES y escrituras sin policy) | `tests/grants-hardening.sql` |

Ninguno toca `storage.objects` ni borra archivos.
