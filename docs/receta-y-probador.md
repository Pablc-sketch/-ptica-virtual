# Receta y probador — 21 de octubre de 2026

## Cambios

Cotizador con dos rutas: archivo privado para revisión humana (predeterminado), o transcripción local para estimar. Esfera y cilindro tienen signo explícito y decimales con punto. Se aceptan coma y menos Unicode al pegar; no se infieren signos ni ceros. Eje entero entre 0 y 180. ADD se conserva como dato distinto, sin transformar la esfera. DP opcional total o por ojo, sin calcularla desde una imagen.

Tratamientos con muestras visuales: básico, AR, azul, fotocromático gris/café, polarizado gris/café/verde. El gris fotocromático corresponde a la tarifa existente con filtro azul; el café, a antirreflejo. Los colores son orientativos. Los paquetes confirmados siguen desde 28/38/48 mil. Donde no hay paquete autorizado, el total queda a cotizar. Nunca sumar una tarifa completa de cristales al precio de un par que ya los incluye. La tabla real de venta se conserva; no se importaron costos ni pacientes.

La selección de marco y tratamientos se asocia al archivo privado y sobrevive al ingreso. Las potencias y DP escritas en la estimación NO se guardan ni viajan en la URL: el profesional recibe el archivo original. Los códigos de proveedor siguen exclusivamente en product_procurement protegido por RLS.

## Probador

MediaPipe Tasks Vision 1.1.1, fijado en lockfile. El build copia WASM del paquete y obtiene el modelo oficial versionado; verifica SHA256 64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff. Modelo y WASM se sirven desde el mismo sitio y solo se descargan al elegir una foto. Procesamiento en Web Worker, sin enviar fotos a Google ni a la tienda. Sin analítica facial, identificación, registro de puntos, DP o milímetros.

Cámara opcional para capturar una foto; se detiene al capturar, cerrar o salir. No es seguimiento en vivo. Alinea frontales con ojos y contorno, admite corrección manual y antes/después. Rechaza rostros múltiples, perfiles marcados y ángulos excesivos. La vista no confirma talla física.

Frontales de los tres marcos: ediciones aproximadas a partir de las fotos del usuario, realizadas con imagegen, fondo y lentes claros transparentes. Maestros en output/catalogo/tryon-*.png, originales de herramienta preservados. WebP de 1440px con alfa. No son escaneos, medidas ni modelos 3D; detalles ocultos pueden reconstruirse. No convertir estas muestras en productos verificados sin revisar contra cada marco real.

## Medición y fuentes

Los multifocales y bifocales necesitan un protocolo de medición profesional con el marco colocado y ajustado, DP monocular y alturas. Una foto sin referencia física no aporta escala real, y el probador no autoriza fabricación. El sistema permite iniciar una solicitud y deja el montaje pendiente; falta acordar con Fides el protocolo remoto o presencial que aceptará.

- [Firmoo: prueba con foto](https://www.firmoo.cl/help-p-112.shtml/): comparación del recorrido, sin copiar identidad ni imágenes.
- [Google: Face Landmarker web](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js): puntos faciales, procesamiento y worker.
- [ZEISS: guía de montaje](https://www.zeiss.com/content/dam/Vision/Vision/en_us/PDF/ECP/ZI2_FitDisp_Guide_051012FNLAppd.pdf): ajuste del marco antes de medir y alturas monoculares. Referencia de principios de montaje, no especificación de un producto Fides.
- [GMO: formas](https://gmo.cl/collections/anteojos-de-sol-polarizados): terminología comercial oval, agatado/cat eye, rectangular, redondo y piloto. Clasificación visual propia de las fotos, no identificación de marca.

## Verificación

75 pruebas unitarias pasan, TypeScript y compilación de 26 páginas correctos. Lint sin errores y tres avisos heredados. npm audit --omit=dev: 0 vulnerabilidades conocidas. RLS de referencias activo, anon sin SELECT y create_quote sin EXECUTE para cliente; usuarios/recetas reales 0. No se probó una cuenta admin real, un pago ni fabricación. Auditoría ampliada SQL anterior no completó por error requestState del conector: no se declara aprobada. Las pruebas de interfaz nuevas se documentan al finalizar la revisión visual. Panel privado Fides a integrar tras revisión de Claude, sin envío automático al laboratorio.
