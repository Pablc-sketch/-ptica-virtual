# Rediseño editorial — 21 de octubre de 2026

Pablo pidió una identidad más definida y menos genérica sobre la aplicación funcional. Base: claude/backend 88d01a128908982235146e3d68a1af159b4fbf9c. Solo óptica virtual; sin cambios en Lentia ni en bases, roles o autenticación.

## Dirección aplicada

Tinta azul #142238, azul eléctrico #2945ed, porcelana fría #f5f6fa y un acento cálido en la exploración por formas. Manrope autoalojada por Next, jerarquías tipográficas nuevas, marca compacta, portada fotográfica con composición dividida, ilustraciones de formas navegables, sección de detalle material y pie oscuro. Se sustituyó el serif/oliva y el hero en arco.

Catálogo con tarjetas y filtros nuevos; ficha con galería y panel de información definidos; selección vacía con ilustración, contexto y siguiente acción; selección con productos mantiene su formulario a ancho completo. Páginas de lectura y sesiones heredan el nuevo sistema. Menú conserva cierre al navegar/Escape/exterior y tamaños táctiles.

La imagen de portada es un editorial conceptual generado con IA, rotulado en su pie. WebP de 158316 bytes, sin SKU, precio, stock ni testimonio. No se presenta como fotografía comercial de un marco real. Las ilustraciones de formas también se identifican como ilustraciones. El catálogo comercial sigue dependiendo de registros reales verificados.

## Funcionalidad

Los enlaces por forma inicializan el filtro del catálogo. Los controles se reinician al cambiar la consulta de la URL, corrigiendo que el enlace de favoritos no actualizara la vista al navegar dentro de /marcos. No se alteró el servidor de cotizaciones, las recetas privadas ni la autorización de administración. Vista 3D sigue bajo demanda y solo para GLB verificado.

## Verificación realizada

- Compilación local de producción y TypeScript: pasan (21 rutas).
- Pruebas unitarias existentes: 27 pasan. Lint: cero errores; tres avisos previos ajenos al rediseño en scripts y una directiva de cuenta.
- Navegador real: portada, selección vacía y catálogo en 320/768/1024, sin desborde; portada inspeccionada también en 390 y escritorio.
- Compilación aislada .next-e2e con Supabase simulado en memoria: filtro round muestra Redondo y un resultado; favorito guardado actualiza contador; selección agrega un marco y conserva precio; navegar a favoritos activa el filtro y limpia la forma previa; ficha y selección poblada sin desborde a320; menú móvil abre y se cierra al navegar. Consola sin errores en esas pruebas.
- Sin registros ni archivos de prueba en Supabase real. El mock solo usa memoria y otro puerto/origen; no se publica como inventario.
- Se actualizaron los colores esperados en el script e2e existente. No se afirma que las148 comprobaciones se hayan vuelto a ejecutar en este cambio: se ejecutaron27 unitarias y la revisión dirigida descrita.

La revisión visual de producción requiere una sesión Vercel autorizada. No crear bypass SSO sin la autorización específica pendiente del usuario. La comprobación de registro/correo y subida de recetas con una cuenta real permanece fuera de esta revisión de diseño.
