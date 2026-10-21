# Riesgo: borrar la receta anterior cuando ya existe un reemplazo

Decisión vigente (Pablo/Codex): la persona puede borrar cualquiera de sus recetas en cualquier momento (privacidad).
No se guardan copias ocultas del motivo ni del historial.

| Acción | Efecto | Riesgo | Mitigación aplicada |
|---|---|---|---|
| Borrar la receta **anterior** (needs_new_file) con reemplazo existente | Se borran su archivo, su motivo y su historial (cascada); el reemplazo queda con `replaces_id = NULL` | El admin pierde el contexto de por qué se pidió el archivo nuevo y ya no ve "reemplaza un archivo anterior" | Aviso explícito en la confirmación de borrado; el reemplazo sigue en la fila normal |
| Borrar el **reemplazo** | La anterior vuelve a mostrar "Subir un archivo nuevo" (el índice único se libera) | Ninguno de datos; puede generar otro reemplazo | Aviso: "la receta anterior volverá a esperar un archivo nuevo" |
| Borrar durante "En revisión" | La fila desaparece; la acción del admin responde 404 ("pudo ser eliminada por su dueña o dueño") | Trabajo del admin perdido | Mensaje claro en el panel; sin bloqueo (prima la privacidad) |
| Fallo de Storage al borrar | El registro se conserva y se reintenta; si el archivo ya no existe se cierra el registro | — | Implementado en `DELETE /api/recetas/[id]` |
| Fallo al registrar un reemplazo después de subir el archivo | Se intenta retirar el archivo; si falla queda un objeto privado sin fila | Archivo huérfano (solo dueño/admin) | Se registra en el log; conciliación pendiente (requiere proceso con service role) |

Pendiente de decisión con política legal: plazos de conservación, si el admin puede borrar y si debe quedar un rastro mínimo
(sin datos clínicos) de que existió una revisión.
