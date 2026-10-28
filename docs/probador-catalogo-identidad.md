# Probador ampliado y revisión de identidad — 28/10/2026

Base: main d9b8bda536252e3e48a2cf40add95056116e3de7.
Rama local: codex/probador-modelos-20261028.
Estado: preparado para revisión; no publicado.

## Probador
La ruta anterior filtraba por tres slugs fijos. Ahora construye opciones desde el catálogo publicado recibido (actualmente limitado a 200 productos por su consulta existente), con ID de producto y variante independientes, nombre, color y frontal de esa variante. No agrupa por parecido o color. Conserva el color seleccionado al entrar desde una tarjeta y en el enlace de vuelta a la ficha. Mantiene los tres recortes antiguos cuando corresponde.

Los nuevos frontales se preparan en el navegador: retira blancos neutros y recorta el borde vacío del producto; no modifica fotografías originales ni procesa el rostro con ese algoritmo. Las fotos faciales conservan el procesamiento local existente. El resultado es una aproximación: puede perder detalles blancos/translúcidos y conservar varillas. El recorte NO reconstruye un frontal real ni acredita talla, ajuste físico, DP o altura clínica. Para máxima fidelidad se necesitan recortes dedicados revisados por variante. Si una imagen no permite preparar un frontal o falla CORS, aparece un aviso; no se sustituye por otro marco.

## Marcos distintos frente a colores
El catálogo actual ya trae una relación producto/variante. No se encontró un reconocedor de modelos en el flujo revisado: el detector existente reconoce puntos del rostro, no identidad de marcos.

Se añade compareFrameIdentity y una herramienta de revisión offline:
- Solo same-model si fabricante, referencia de modelo, forma, material, construcción, puente, bisagras y las tres medidas coinciden, con evidencia verificada para ambos.
- Cualquier diferencia comprobada devuelve separate.
- Datos incompletos o evidencia sin verificar devuelve review.
- Color, nombre comercial y parecido de una fotografía no son prueba suficiente.
- Diferenciar referencia de modelo de sufijo/código de color. No inferir fabricante ni medidas a partir de imágenes retocadas.

Uso: node --experimental-strip-types scripts/review-frame-identity.mjs
Entrada por stdin: {"pairs":[{"a":{...},"b":{...}}]}.
Solo devuelve decisiones e índices, applied:false. No conecta a Supabase, no reclasifica publicaciones ni modifica inventario. Es una herramienta de revisión entregada, NO una validación instalada en el formulario de administración.

La separación de grupos actuales sigue pendiente. Se requiere una lista concreta de variantes y evidencia de cada modelo para preparar la reasignación sin romper enlaces, stock o pedidos. No se leyó procurement privado ni se aplicó una migración. Las fotos retocadas de Kensington examinadas muestran diferencias de contorno/construcción que justifican revisión; no acreditan por sí solas el código del modelo original.

## Pruebas
- 32 pruebas aprobadas: tryon-catalog, catalog, catalog-categories y face-placement.
- ESLint de todos los archivos editados/nuevos: aprobado.
- next typegen y TypeScript sin emisión: aprobados.
- Navegador Chromium local con catálogo simulado: 6/6 controles aprobados (21 modelos fuera de la lista antigua; selección inicial modelo/color; overlay blob local; cambio de modelo; sin desborde horizontal a 390 px; sin POST/PUT/PATCH/DELETE).
- La primera vía de navegador falló por extracción/configuración del entorno; se completó con Chromium local alternativo y servidor con directorio de compilación nuevo. No se probaron cámara, detección facial real, todas las imágenes/colores de producción ni compilación production.
- Prueba CLI con referencias diferentes y datos vacíos: separate y review, respectivamente, sin aplicar cambios.

Regresión de navegador reproducible: scripts/check-tryon-catalog.mjs. Requiere Next local en 127.0.0.1:3111, NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54397, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_mock y E2E_UNOPTIMIZED_IMAGES=1. El script inicia el mock público en 54397. CHROMIUM_PATH indica el ejecutable local. No usar configuración de producción para estas pruebas.

## Revisión, riesgos y reversión
Revisar visualmente cada frontal antes de autorizar publicación. El recorte genérico tiene riesgo visual medio; la identidad conservadora no garantiza reconocer modelos desde fotografías. No se prometen medidas o ajuste real. La agrupación actual en base permanece sin modificar. Revertir los tres archivos de interfaz/ruta modificados y retirar los archivos nuevos para volver al estado base.

Fuentes de código:
- https://github.com/Pablc-sketch/-ptica-virtual/blob/d9b8bda536252e3e48a2cf40add95056116e3de7/src/app/probador/page.tsx
- https://github.com/Pablc-sketch/-ptica-virtual/blob/d9b8bda536252e3e48a2cf40add95056116e3de7/src/lib/catalog-adapt.ts
- https://github.com/Pablc-sketch/-ptica-virtual/blob/d9b8bda536252e3e48a2cf40add95056116e3de7/src/components/photo-try-on.tsx
- https://opticaglobal.cl/probador (destino de publicación; esta revisión no acredita el parche en producción).

Consulta: 28/10/2026, mañana, America/Santiago. Se leyó AGENTS.md y las guías incluidas de Next 16.4.2 y se revisaron los criterios React de la habilidad Vercel. Confianza alta en el límite de tres slugs del código y las pruebas locales; parcial para fidelidad visual e identidad de marcos actuales.

Sin push, PR, despliegue, cambios de precios, fotografías originales, clasificaciones o datos de producción. Sin acceso a pacientes, recetas ni información clínica.
