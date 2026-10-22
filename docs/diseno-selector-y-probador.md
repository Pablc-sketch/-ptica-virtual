# Diseño, receta y probador — 22 de octubre de 2026

Implementación directa de Codex sobre c16407e. Sin control del escritorio del usuario.

## Cambios
- Portada: colección oval/cat eye con imágenes de los marcos, degradados naranja y mineral, precios y tres pasos.
- Selector de dioptrías: cuadrícula de cuartos con signo explícito y dos decimales; escritura alternativa; Escape/foco; eje 0–180; ADD opcional.
- Cerca con ADD queda en revisión, sin convertir ESF. Cambio de polarizado verde a fotocromático normaliza a gris.
- Avisos repetidos reducidos, revisión profesional explicada al enviar receta. No se elimina consentimiento ni privacidad.
- Probador: detección facial local, dos marcas manuales sobre pupilas, ajuste por teclado, adaptación al tamaño de la imagen y tres modelos digitales.
- No se convierte el probador en herramienta clínica de DP o altura.

## Activos
Generados con la herramienta integrada imagegen, sin API externa ni claves nuevas. WebP 800×1000, 50–57 KB cada uno:
public/tryon/modelo-1.webp, modelo-2.webp, modelo-3.webp. Son personas ficticias identificadas como modelos digitales en el probador.
Prompt común: photorealistic-natural; fictional adult portrait for eyewear try-on; straight frontal face, upright head, visible pupils, no eyeglasses; natural skin texture; gray background; dark crewneck; head and shoulders, no text or logos.
Variantes: mujer negra de treinta y tantos con cabello corto natural; hombre de piel clara de treinta y tantos, cabello rubio oscuro y barba corta; mujer latina de cuarenta y tantos, piel oliva y cabello recogido.

## Referencias consultadas
- Firmoo: https://www.firmoo.cl/help-p-112.shtml/ — foto, detección y corrección manual, prueba de estilo.
- Mercado Pago: https://www.mercadopago.cl/developers/es/docs/checkout-pro-orders/create-application — aplicación y credenciales de prueba/producción; autorización del vendedor pendiente. Pablo confirmó que solo tiene la cuenta de la máquina; aún no existe una aplicación web conectada.

## Pendientes que no deben presentarse como terminados
- El ingreso manual sirve para estimar; la recepción privada del original sigue siendo por archivo. Falta persistencia segura de la transcripción del cliente.
- Tres fotos reales por marco: solicitar frontal, tres cuartos y lateral del mismo código/color. No inventar lados ocultos ni presentar una imagen girada como 3D.
- Cuarta vista GLB: visor disponible, falta modelo exacto verificado por producto. Fotografías solas no garantizan reconstrucción de geometría y escala.
- Checkout Mercado Pago: sin aplicación conectada, credenciales o pagos probados. Las cotizaciones siguen cerradas. Flujo previsto: cotización final validada en servidor → checkout → webhook autenticado y consulta al proveedor → estado pagado; nunca confiar en monto del navegador o URL de retorno.
- Fides: rama de Claude claude/pedidos-laboratorio, 1e3f9dd10d9a1aaa22720f0bae0ab419a13f3015. No integrada ni migrada todavía. Revisión encontró salida anticipada del trigger que permite editar campos inmutables con la misma versión; exportación debe congelar referencia de proveedor y volver a verificar vigencia de receta. Corregir y pasar pruebas antes de activación.
- Usuarios reales en Supabase: 0 en consulta de este turno. No se probó revisión con una cuenta admin real.

## Verificación
79 pruebas unitarias pasan. Compilación de producción aislada pasa. 20 comprobaciones de navegador pasaron: AR $38.000, signos, punto decimal, color, cerca con ADD, foco Escape, contexto sin graduaciones en URL, anchos 320/390/768/1440, detección facial real en los tres modelos, dos marcas manuales, retirar foto, sin envíos POST/PUT/PATCH en el probador y sin errores de página. Axe no detectó incidencias WCAG A/AA en el probador. Capturas en output/design-review/.
