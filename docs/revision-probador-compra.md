# Óptica Global: mejoras del probador y compra

27 de octubre de 2026

## Cambios preparados

- Cámara con vista tipo espejo activada de inicio; la foto conserva la misma orientación. Se puede desactivar.
- Cámara a resolución moderada y máximo 30 cuadros por segundo.
- Fotos limitadas a 1600 píxeles en su lado mayor; alineación facial a 1024 píxeles como máximo, en un trabajador separado.
- Arrastre del marco sin renderizar todos los controles con cada movimiento.
- Ajuste manual disponible sin esperar al detector y límite de espera de 15 segundos.
- Controles más legibles y con mayor contraste, y vista móvil sin una foto fija que tape el contenido.
- Visor 3D renderiza al interactuar; no dibuja continuamente cuando está quieto.
- Botón de compra muestra el envío en curso y evita nuevos envíos mientras está pendiente.
- Alternativa de compra por WhatsApp mientras Mercado Pago esté desactivado.
- Estado del pedido con actualización manual y confirmación según la base; un parámetro del navegador no confirma un pago.

## Verificación

Compilación de producción y TypeScript correctos. Las 93 pruebas existentes pasan.

Prueba de navegador en 390 × 844 y 1440 × 1000: cámara sintética asimétrica para comprobar la orientación, foto con la misma orientación, cámara apagada tras capturar, marcas manuales, arrastre a la derecha y alineación real con el modelo facial local. Sin desborde horizontal ni errores de JavaScript en ese recorrido.

Compra con datos simulados: botón desactivado sin credenciales, enlace a WhatsApp, retorno con estado aprobado sin falsear la confirmación y actualización del estado al cambiar el pedido a pagado en la base simulada.

No se han probado un cobro real, la notificación de Mercado Pago contra producción ni el rendimiento en un teléfono físico. La prueba de cámara no accedió a la cámara de la persona.

## Pendiente para cobrar y publicar

La cuenta Empresa del titular ya existe. En Vercel se verificó la presencia de PAYMENTS_SECRET y NEXT_PUBLIC_SITE_URL, sin leer el secreto. Faltan MP_ACCESS_TOKEN y MP_WEBHOOK_SECRET. Deben obtenerse desde la aplicación de Mercado Pago de esa misma cuenta y guardarse como secretos de Production; después se debe comprobar la coincidencia del secreto interno con Supabase, configurar las notificaciones y probar el pago completo.

No publicar ni promocionar como tienda lista para cobrar hasta cerrar esa comprobación. Las modificaciones de este trabajo se guardan para revisión, sin cambiar el sitio público.

## Ejecutar la prueba del probador

Con dependencias instaladas y Chrome disponible:

1. npm run build
2. node scripts/e2e-tryon.mjs

Se usa un catálogo sintético en memoria. CHROMIUM_PATH permite elegir el ejecutable de Chrome. Las capturas se guardan en ../../outputs respecto a la raíz de este checkout.


## Revisión del 30 de octubre de 2026

Integración con `main` 8b50379878b721d763615486e0559a8b972dba8d. Se conservó el catálogo por producto y variante y la preparación local del frontal. `TryOnOverlay` administra el gesto; `TryOnFrameImage` prepara la imagen sin volver a renderizar todo el probador en cada movimiento.

- 110 pruebas unitarias aprobadas; TypeScript y compilación de producción aprobados.
- ESLint de los tres componentes: sin errores, dos avisos sobre la invalidación de solicitudes al desmontar (los contadores no son nodos DOM).
- Comprobación de navegador con datos sintéticos: color inicial desde la URL, ajuste facial real sobre un modelo digital, arrastre del marco, cambio de variante y enlace conservando color. El frontal nuevo se prepara como imagen local en memoria.
- Pantalla de 390 × 844: sin desbordamiento horizontal. No se utilizó la cámara física ni se repitió hoy la simulación de cámara del día 27.
- Credenciales de producción comprobadas solo por nombre: existen PAYMENTS_SECRET y NEXT_PUBLIC_SITE_URL; faltan MP_ACCESS_TOKEN y MP_WEBHOOK_SECRET. No se crearon cobros ni se consultó información de clientes.
- Esta rama es una propuesta de revisión. La publicación en producción y una prueba de pago siguen pendientes.
