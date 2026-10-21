# Estado de implementación (Claude) — implementado / probado / pendiente

## Implementado y probado
- Catálogo, ficha, favoritos, selección, cotizar (cerrado), cristales, cómo funciona, ayuda, 404 propio.
- `/mi-cuenta`: ingreso y registro (rol siempre `customer`), subida de receta (4 MiB, consentimiento, JPG/PNG/WebP/PDF),
  lista "Mis recetas" y apertura por URL firmada de 60 s vía `GET /api/recetas/[id]`.
- `/privacidad`: borrador de revisión que describe el comportamiento real; no inventa responsable, contacto ni plazos.
- `/admin`: marcos (alta, edición, fotos, GLB, verificación, publicar/archivar), cotizaciones y recetas (apertura firmada).
- Menú móvil accesible: se cierra al navegar, con Escape (devuelve el foco al botón) y al hacer clic fuera.
- `proxy.ts`: una cookie de sesión corrupta se trata como anónimo (antes producía 500 en todo el sitio).

## Pruebas
- `npm test` (14 unitarias), `npx tsc --noEmit`, `npm run lint`.
- `npm run test:e2e` (64 comprobaciones, 390×844 y 1440×900) contra un Supabase **simulado en memoria**
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
