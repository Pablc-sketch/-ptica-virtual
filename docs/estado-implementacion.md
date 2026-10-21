# Estado de implementación (Claude) — implementado / probado / pendiente

## Implementado y probado
- Catálogo, ficha, favoritos, selección, cotizar (cerrado), cristales, cómo funciona, ayuda, 404 propio.
- `/mi-cuenta`: ingreso y registro (rol siempre `customer`), subida de receta (4 MiB, consentimiento, JPG/PNG/WebP/PDF),
  lista "Mis recetas" y apertura por URL firmada de 60 s vía `GET /api/recetas/[id]`.
- `/privacidad`: borrador de revisión que describe el comportamiento real; no inventa responsable, contacto ni plazos.
- `/admin`: marcos (alta, edición, fotos, GLB, verificación, publicar/archivar), cotizaciones y recetas (apertura firmada).
- Menú móvil accesible: se cierra al navegar, con Escape (devuelve el foco al botón) y al hacer clic fuera.
- `proxy.ts`: una cookie de sesión corrupta se trata como anónimo (antes producía 500 en todo el sitio).

## Cambios del bloque 2 (borrado propio, auditoría y accesibilidad)
- `/mi-cuenta` filtra por dueño de forma explícita (`user_id`) en recetas y cotizaciones; la lista global queda solo en `/admin`.
- `DELETE /api/recetas/[id]`: solo la persona dueña (no admin), origen válido, primero elimina el objeto (idempotente) y luego el
  registro; si algo falla el registro se conserva y se puede reintentar. UI con confirmación en línea y manejo de foco.
- Un fallo del servicio de acceso ya no se confunde con "sin sesión" (`src/lib/session.ts`): `/mi-cuenta` avisa, las APIs de recetas
  responden 503 y `requireAdmin` falla en vez de reenviar al login. Un error de `is_admin` tampoco se trata como "no admin".
- `/privacidad` corregida: la selección se consulta al servidor solo con identificadores; contraseña protegida por el servicio de acceso.
- Accesibilidad: axe-core (WCAG 2.0/2.1 A y AA) sobre 11 páginas en móvil y escritorio sin violaciones serious/critical; se corrigió un
  `label-content-name-mismatch` real en los botones de favoritos de la ficha. Teclado: enlace "Saltar al contenido" verificado.

## Verificación visual de estilos (hallazgo de Codex sobre CSS vacío en el IAB)
- En el build de producción propio (Chromium/Playwright) el CSS servido es una sola hoja que contiene `--paper`, `.btn`, `.container-page`
  y `:root`; estilos calculados: `--paper` `#f7f6f2`, fondo del body `rgb(247,246,242)`, botón `rgb(66,77,59)`, contenedor
  280/350/728/984/1240 px en 320/390/768/1024/1440. **No se reproduce** el CSSOM sin esas reglas: la causa probable es una limitación del
  navegador integrado o del preview antiguo, no del CSS compilado. No se cambió el pipeline.
- Defecto real encontrado al medir más anchos: a 320 px el encabezado desbordaba 28 px. Corregido (marca y botones compactos bajo 360 px)
  y la navegación completa/menú móvil pasa al breakpoint `lg` (1024 px) para dar holgura en 768 px.
- e2e: aserciones de estilos calculados, ancho del contenedor, CSS servido, encabezado sin solapes y sin desborde en 10 páginas en
  320/390/768/1024/1440 px.

## Pruebas
- `npm test` (14 unitarias), `npx tsc --noEmit`, `npm run lint`.
- `npm run test:e2e` (145 comprobaciones, 390×844 y 1440×900) contra un Supabase **simulado en memoria**
  (`scripts/mock-supabase.mjs`): filtros combinados, favoritos persistentes, selección, ficha, 3D con GLB sintético
  de prueba (solo en el simulador, nunca en la base), 404, cotización sin precios del cliente, menú móvil, cuenta/recetas,
  APIs anónimas 401 y origen ajeno 403.
- Pruebas RLS contra la base real: `tests/*.sql` ejecutadas por Codex con rollback (ver docs/integracion-codex.md).

## No probado contra servicios reales
- Registro/confirmación de correo (depende de la configuración de Auth: Site URL, SMTP, confirmación de email).
- Subida/lectura real de recetas contra Storage con sesión real (probada con el simulador y por SQL/RLS de Codex).
- Visor 3D con un GLB comercial real y en dispositivos móviles físicos.

## Pendiente
- Alta del admin de Pablo (docs/ALTA-ADMIN.md), fotos/GLB comerciales, precios, importación desde Lentia (requiere identificación autorizada).
- Política de privacidad y condiciones validadas, canal de contacto real, derecho de eliminación de recetas (no hay botón ni API de borrado).
- Apertura de cotizaciones: migración GRANT de `create_quote` + `QUOTES_OPEN=true` (la flag sola no basta; el RPC está revocado).
- Pagos, OCR e IA: no integrados.
