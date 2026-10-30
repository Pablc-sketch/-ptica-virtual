# Activar Mercado Pago en opticaglobal.cl

El checkout usa Checkout Pro (Preferences API), con precio leído desde la base y confirmación del pago consultada a Mercado Pago. El formulario no cobra ni marca pedidos como pagados por una respuesta del navegador.

## Datos pendientes del titular

En la aplicación de Mercado Pago de la cuenta que recibirá las ventas, activar Producción con el sitio `https://opticaglobal.cl`.

Guardar como secretos de **Production** del proyecto Vercel `optica-global-virtual`:

- `MP_ACCESS_TOKEN`: Access Token de producción, nunca una credencial de prueba.
- `MP_WEBHOOK_SECRET`: firma secreta de las notificaciones de esa aplicación.

No se necesita Public Key, Client ID ni Client Secret para este checkout alojado, que crea preferencias desde el servidor.

Configurar en Mercado Pago la notificación de **Pagos** de producción en:

`https://opticaglobal.cl/api/pagos/mercadopago`

El endpoint comprueba HMAC y tolerancia temporal, identifica el pago mediante `data.id` firmado, consulta la API y verifica moneda, pedido y monto antes de confirmar.

## Secreto interno

`PAYMENTS_SECRET` debe coincidir con `private.app_settings['payments_secret']` en Supabase. No es una credencial proporcionada por Mercado Pago. El 27 de octubre de 2026 se verificó que ya existe como variable sensible de Production en Vercel; no se leyó su valor ni se comprobó en esta revisión que coincida con el de la base. No se incluye su valor en archivos ni en el chat.

`NEXT_PUBLIC_SITE_URL=https://opticaglobal.cl` ya está configurado en Production.

## Cierre de activación

Después de guardar las credenciales de Mercado Pago y comprobar el secreto interno, generar un nuevo despliegue de producción. Verificar creación de preferencia y recepción de una notificación válida mediante las herramientas de prueba de Mercado Pago. Una compra real y su cargo requieren que el titular complete el pago. Hasta entonces, el botón de pago permanece desactivado.
