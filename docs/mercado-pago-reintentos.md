# Confirmación fiable de pagos

El webhook solo debe confirmar la recepción cuando pudo consultar el pago y guardar el resultado, o cuando comprobó que el evento no corresponde a una compra de la tienda.

## Comportamiento

- Fallo de red, límite de consultas, error del proveedor o fallo de almacenamiento/configuración: HTTP 503, para conservar la posibilidad de reintento.
- Pago inexistente, referencia ajena, moneda diferente de CLP o pedido inexistente: HTTP 200 sin confirmar una compra.
- Monto incompatible con el pedido: se conserva el rechazo de la base y se registra un diagnóstico sin datos de cliente; no se redondea para hacerlo coincidir.
- Firma ausente, firma inválida o identificador del cuerpo diferente del firmado: HTTP 401 antes de sincronizar.
- Cuerpo JSON nulo, primitivo o array: HTTP 400 sin sincronizar.
- La consulta al proveedor tiene un plazo de ocho segundos y no sigue redirecciones.

## Verificación

Pruebas sintéticas cubren el recorrido firma → API de Mercado Pago simulada → función de confirmación simulada. Incluyen fallo inicial y reintento exitoso, fallo del almacenamiento, pagos ajenos, moneda incompatible y montos discrepantes. Ninguna prueba genera cobros ni consulta clientes reales. El bloqueo/validación del monto sigue en la función SQL existente.

## Pendientes para activar

Faltan MP_ACCESS_TOKEN y MP_WEBHOOK_SECRET en producción. Se debe comprobar que la cuenta receptora corresponde a la empresa. La presencia de PAYMENTS_SECRET no demuestra que coincida con el secreto interno de la base; esa igualdad también requiere comprobación autorizada sin exponer valores.

El modelo actual de pedidos no representa devoluciones parciales, devoluciones totales ni contracargos después de un pago. Esto requiere una evolución separada del estado financiero que conserve la logística del pedido; esta corrección de reintentos no la implementa. No deben presentarse esos estados como conciliados automáticamente.

## Documentación oficial

- [Mercado Pago: Webhooks](https://www.mercadopago.cl/developers/en/docs/checkout-pro-preferences/additional-content/notifications/webhooks)
- [Mercado Pago: estados de pagos y órdenes](https://www.mercadopago.cl/developers/es/docs/checkout-api-orders/resources/migrate-payments-to-orders)
