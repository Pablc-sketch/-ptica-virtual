# Óptica Global: auditoría y cambios en borrador

Estado al 23 de octubre de 2026: **no publicado**. Esta rama requiere integrar imágenes y verificación visual antes de pasar a producción. No se ha modificado la base de datos de producción.

## Imágenes
Se inspeccionaron 137 WebP del repositorio (producto, vistas posteriores y contexto) y el logo PNG. Se detectaron 14 fotos frontales de productos ópticos con borrados blancos que dañaban puentes, aros o patillas:
- Kensington: azul, bronce, negro.
- Bauhaus: dorado rosa, dorado, negro.
- Manhattan: azul noche con dorado, negro con plateado.
- Oslo: lila translúcido, negro, rosa translúcido.
- Perla / Montmartre: amarillo nacarado, cristal nacarado, fucsia nacarado.

Se generaron 14 restauraciones conservadoras, guardadas en el archivo **Optica-Global-14-fotos-restauradas.zip**. **Los binarios todavía no están integrados en esta rama.** El acceso al ejecutor del computador falló durante la transferencia, con el error de configuración `invalid sandbox permission path URI: file:///workspace is invalid on windows`. También existe una comparación antes/después.

Las otras 123 WebP no presentaban el mismo daño de borrado; se conservan. Algunas reflexiones solares y bordes de los antiguos recortes del probador pueden mejorar en una segunda revisión.

## Probador
El catálogo del probador se construye desde los productos y variantes publicados, usando su imagen frontal. La selección conserva modelo y color desde la ficha y desde las tarjetas. Se sustituyó el selector limitado a tres modelos por selector de modelo y colores del modelo elegido. La carga asíncrona evita mostrar la imagen anterior mientras se prepara la nueva.

Los tres modelos antiguos mantienen sus recortes transparentes existentes. Los demás usan preparación local en canvas y recorte interior aproximado por familia óptica. **Esta preparación necesita revisión visual de cada variante; las siluetas aproximadas no garantizan todavía un resultado aceptable.** No debe publicarse con las fotos antiguas dañadas.

## Compra y envío
La base ya admitía pedidos sin usuario; se simplificaron los textos y la interfaz de compra como invitado, manteniendo los campos obligatorios de contacto y dirección. El resumen reacciona a la selección de cristales:
- Mercadería menor de $60.000: envío $3.500.
- Desde $60.000: envío gratis.

El SQL pendiente calcula y guarda el envío en el servidor, antes de generar el pago. Mercado Pago sigue usando el total del pedido recuperado de la base. Los pedidos existentes conservan sus importes. La pantalla de estado muestra subtotal y envío cuando están disponibles.

**No desplegar el código de checkout sin aplicar antes la migración revisada**: sin ella el resumen de pantalla y el importe cobrado no incluirían el mismo envío. Archivo pendiente: `supabase/pendientes/03_guest_checkout_shipping.sql`. Debe convertirse en migración y aplicarse mediante el flujo de Supabase; no se ha ejecutado en producción.

## Nombres y diseño
Se mantienen URLs e identificadores. Los nombres visibles se organizan en colecciones con títulos discretos, fotos amplias y tarjetas más limpias.

| Identificador anterior | Nombre visible |
| --- | --- |
| Perla | Montmartre |
| Leone | Bellagio |
| Pantera | Tribeca |
| Azzurra | Capri |
| Óvalo negro | Soho |
| Cat eye ámbar | Riviera |
| Cat eye mosaico | Brera |

Se conservaron Kensington, Oslo, Bauhaus, Manhattan, Amalfi, Cannes, Brooklyn, Sicilia, Havana, Riva y Palazzo. El SQL pendiente alinea los nombres persistidos en los nuevos pedidos.

Se retiraron avisos de retoque, ambientación digital y disponibilidad por confirmar en los componentes revisados, además de la casilla de consentimiento genérica del checkout. La página independiente de privacidad no se eliminó.

## Comprobaciones
- `npm test`: 95 pruebas correctas, 16 archivos.
- `npm run build`: compilación y TypeScript correctos; entorno de prueba sin credenciales reales.
- SQL ejecutado contra PGlite aislado con un esquema mínimo: pedidos anteriores intactos, límite 59.999/60.000, cantidad, cálculo del servidor sobre valores enviados por el cliente y autorización por token.
- No se realizaron cargos ni compras de producción.

Las pruebas unitarias y el esquema mínimo no sustituyen una compra de prueba integrada con Supabase/Mercado Pago.

## Antes de publicar
1. Integrar las 14 restauraciones en sus rutas WebP y verificar dimensiones, color y contornos contra las referencias.
2. Revisar las 48 variantes aproximadas en catálogo y probador, escritorio y móvil; corregir recortes donde sea necesario.
3. Revisar y aplicar la migración en entorno de prueba; probar compra invitada con dirección y pagos de prueba por debajo y desde el límite.
4. Verificar selección de color desde tarjeta, ficha y probador, y coherencia con la compra.
5. Desplegar y verificar dominio público únicamente después de esas comprobaciones.
