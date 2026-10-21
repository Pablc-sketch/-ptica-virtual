# Integración comprobada — Óptica Global

## Alcance

Tienda completamente independiente. Únicos destinos: Pablc-sketch/-ptica-virtual, Supabase zezqhjikapaelbjavjms y Vercel optica-global-virtual. Ningún cambio en Lentia.

## Implementación

Diseño editorial y rutas Next reales integradas con el catálogo, favoritos, selección, formulario de cotización y administración de marcos. El catálogo comercial permanece vacío hasta disponer de fotos reales verificadas y precios. El hero es una composición conceptual con IA, explícitamente rotulada, sin SKU ni precio.

El código/SKU real se captura en administración y aparece en la ficha. El backend impide publicar sin SKU, precio positivo y foto verificada.

Recetas: bucket prescriptions privado; políticas de dueño/admin; el registro exige objeto propio existente y cotización propia cuando se asocia. POST /api/recetas valida sesión, origen, consentimiento, tamaño máximo de archivo de 4 MiB, límite del cuerpo por streaming y firma del formato (JPG/PNG/WebP/PDF). GET /api/recetas/[id] aplica RLS y emite URL firmada por 60 segundos. No usa service-role en el cliente. Son APIs; queda pendiente la interfaz de acceso de clientes y subida en su sesión.

## Evidencias

- Tests unitarios: 8 pasan; comprobación TypeScript pasa; lint sin errores (un aviso previo de variable no usada en script QA de Claude).
- tests/storage-rls.sql: PASS con fixtures sintéticos y rollback. Comprueba separación entre usuarios, subida a carpeta propia, registro de objeto existente, enlace a cotización propia, bloqueo anónimo y revisión admin. Se verificó que no quedaron usuarios, cotizaciones ni objetos de prueba.
- tests/catalog-rls.sql: PASS con rollback. Comprueba producto borrador oculto, escritura anónima bloqueada, precio recalculado en DB, aislamiento de cotizaciones, elevación de rol bloqueada, subidas de catálogo restringidas y visibilidad admin.
- Prueba adicional de SKU: publicación rechazada sin código y aceptada con código/foto/precio dentro de transacción revertida.
- Auditoría npm de dependencias de producción: 0 vulnerabilidades reportadas. La auditoría incluyendo desarrollo informó 5 alertas heredadas de braces/micromatch/fast-glob/eslint-config-next; la solución automática propuesta degradaba Next, por lo que no se aplicó sin análisis.
- Primer despliegue integrado: commit ce0690b1d5a4d3c0b590d1b1297935d707e6a79e, Vercel dpl_6YYwHW7oStv2uA7iTsSw7Yr6B3re, estado READY. URL https://optica-global-virtual-b5ydtm0q2-prxva.vercel.app/.
- Navegador abrió la tienda desplegada mediante acceso temporal Vercel y mostró portada, navegación y contenido integrado. Se está revisando móvil/escritorio y mejorando el lenguaje de clientes.
- Build local Windows falló en un proceso auxiliar de Turbopack al compilar Tailwind, incluso fuera del sandbox. El mismo commit compiló en Vercel con estado READY. No se describe la compilación local como aprobada.

## Migraciones

Se detectó que los archivos iniciales incluían partes canceladas que duplicaban la migración de recetas. Se exportaron las cinco entradas REALES de supabase_migrations.schema_migrations al repositorio con sus versiones, nombres y SQL efectivamente aplicados. Solo se ordenaron archivos del repositorio: no se alteró el historial remoto ni se reaplicó el esquema. Los nombres de archivos corresponden a IDs generados por Supabase, no a versiones inventadas.

## Pendientes reales

Alta del administrador de Pablo (falta email inequívoco), fotos/GLB comerciales, precios online validados, importación de catálogo con identificación autorizada, interfaz de cliente y receta, canal de contacto, validación de privacidad/condiciones, pago y servicios IA/OCR. No se presentan como integrados. QUOTES_OPEN permanece falso. Antes de abrir cotizaciones, revisar también acceso directo a create_quote: la flag del servidor no desactiva por sí sola el RPC público.

Actualización 01:29 Santiago: la migración remota 20261021042756_cotizaciones_cerradas_preview_codex revoca EXECUTE de create_quote a PUBLIC/anon/authenticated. Verificación real: has_function_privilege=false para anon y authenticated. Así QUOTES_OPEN=false coincide con la base. Para abrir la tienda se requiere una nueva migración explícita que conceda EXECUTE a anon/authenticated y activar QUOTES_OPEN en Vercel después de validar datos/contacto/privacidad. Nunca concederlo desde una petición del cliente. El test de catálogo otorga temporalmente ese permiso dentro de su transacción con ROLLBACK para probar el futuro flujo abierto sin abrir la vista previa.

Vista previa actual: https://optica-global-virtual-fccmqjhtp-prxva.vercel.app/ (bcc713e, READY). Navegador real: portada, catálogo vacío y menú móvil expandible verificados; ancho del documento 375 y scrollWidth 375 con viewport 390 (sin desborde en esa página). La revisión sigue en curso.

Para Claude: fusionar codex/tienda-integrada y continuar desde esa base. No reaplicar migraciones ya aplicadas. Las pruebas de recetas y catálogo se pueden repetir con rollback; no usar datos reales para probar.
