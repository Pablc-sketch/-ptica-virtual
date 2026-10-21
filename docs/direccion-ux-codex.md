# Óptica Global — dirección UX y contrato de integración

Esta referencia muestra el lenguaje visual que debe integrarse en la app Next real. No reemplaza su esquema ni clientes Supabase. El prototipo público/estudio queda sin conexión a datos personales y sirve para revisión de diseño.

## Jerarquía y contenido

La página es una tienda de catálogo, no una landing: navegación permanente Marcos / Cristales / Cómo funciona, búsqueda, favoritos y selección. Portada editorial, selección de catálogo, explicación de imágenes/3D y proceso de cotización. Las páginas internas tienen filtros, resultados, estados vacíos, fichas y acompañamiento antes de enviar receta. El valor del marco se separa de los cristales. No hay compra sin revisión previa de receta y confirmación del total.

## Sistema visual

- Fondo crema #f7f6f2, texto grafito #292e29, verde profundo #424d3b.
- Acentos salvia #d9dfd0 y gris lavanda en degradés de fondo muy suaves.
- Serif editorial en titulares, sans en navegación, formularios y textos.
- Márgenes amplios, fotos con aire, pocas líneas decorativas, CTA primario verde profundo.
- Escala móvil desde 320 px: menú compacto, grilla de dos columnas, ficha y formularios en una columna. Objetivos táctiles de 44 px, foco visible y prefers-reduced-motion.
- No azul clínico, carruseles automáticos, animaciones pesadas ni módulos 3D cargados antes de solicitarlos.

## Fotografías y 3D

`hero-editorial.webp` es una composición conceptual generada con la herramienta integrada image_gen; nunca se vincula a SKU ni precio, y lleva rótulo “IMAGEN CONCEPTUAL · IA”. Archivo optimizado: aproximadamente 168 KB, fuente PNG conservada localmente. El prompt pide un marco de acetato oliva/marrón sin marca sobre piedra caliza, fondo crema/salvia/lavanda, iluminación de estudio y ausencia de texto. Está guardado en public/hero-editorial.png y public/hero-editorial.webp.

Los seis estudios ilustrados del catálogo existen solo para revisar composición y filtros. NO cargarlos como products publicados, no añadir precio inventado. Si el catálogo comercial está vacío, mostrar un estado honesto. Las fotos comerciales deben ser del modelo real, con su código, color y medidas.

Un GLB verificado se carga al pulsar “Vista 3D”. Mantener fotografía como fallback y avisar si el modelo no se puede cargar. Nada de girar un JPG y llamarlo 3D. No presentar el visor como probador facial ni garantía de ajuste. Optimizar mallas y texturas, probar dispositivos móviles y priorizar peso descargado.

## Integración

- La app real de Claude usa products.price_clp/status/frame_shape/lens_width_mm/bridge_mm/temple_mm, product_images y product_models. La referencia usa un shape plano con price, shape, image_url y model_url; crear un adaptador, no duplicar tablas store_*.
- Reutilizar auth SSR con rol profiles.role administrado en servidor. No copiar el login manual provisional de la referencia.
- API de cotizaciones: servidor fija precios desde DB. Cliente solo manda IDs/cantidades y preferencias. No aceptar montos del cliente.
- Recepción de receta: bucket privado, sesión válida, consentimiento, tamaño/tipo comprobados en servidor, acceso dueño/admin y URL firmada breve. No guardar en localStorage.
- Roles, importación de Lentia, estados de pago, confirmación de receta y entrega deben estar validados en backend, aunque UI oculte botones.
- Antes de abrir cotizaciones: validar política de privacidad, canal de contacto real, recepción/admin y antiabuso. No fingir éxito de envíos.

## Auditoría de aceptación

1. Mobile 390×844 y desktop 1440×900 sin scroll horizontal ni CTA cortado.
2. Catálogo: búsqueda+forma+material combinados, limpiar, vacío, error real y reintento.
3. Favoritos: guardar/quitar y persistencia; distinguir de selección para cotización.
4. Ficha: fotos legibles, medidas reales, precio solo marco, 3D solo si GLB verificado.
5. Admin: no autenticado redirige; usuario normal recibe acceso denegado; no puede elevar su rol.
6. Publicación: bloquear sin foto real verificada, código o precio confirmado; borradores invisibles al público.
7. Recetas: anónimo y otros clientes no acceden; admin autorizado sí; enlace temporal expira.
8. Cotización: rechazo de producto inexistente/no publicado, cantidades y payload fuera de rango; precio calculado en servidor.
9. No introducir datos ni cambios en Lentia durante estas pruebas.
10. Guardar pruebas y diferencias entre implementado, probado y pendiente; no llamar lista una integración parcial.
