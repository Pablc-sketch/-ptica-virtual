# Auditoría del catálogo público

La auditoría admite cualquier cantidad no vacía de productos publicados y cualquier precio entero positivo en CLP. Ya no exige tres muestras a $28.000. Falla por catálogo vacío, error de consulta, ausencia de precio, importe inválido o falta de imágenes elegibles. Informa muestras como advertencia, sin presentarlas como disponibilidad confirmada.

Con las dependencias del proyecto instaladas y configuración pública disponible:

```bash
node scripts/audit-catalog-public.mjs
```

Pruebas sin dependencias del proyecto, credenciales ni acceso de red:

```bash
node --test scripts/tests/catalog-audit.node.mjs
```

El comando consulta únicamente `products` publicados y sus metadatos públicos de imágenes. Nunca solicita `product_procurement` ni utiliza claves privilegiadas. La antigua prueba de denegación a esa tabla queda explícitamente como `privateProcurementCheck: "not_run"`; no se debe interpretar como una garantía de seguridad. Verificar permisos por separado mediante metadatos o en una base de prueba.

No comprueba que las fotos existan o representen el marco real, coherencia por variante, stock, checkout, calidad visual, rendimiento móvil o permisos privados. La elegibilidad de fotos debe mantenerse alineada con `src/lib/catalog-adapt.ts` cuando cambie su regla de visibilidad.

Cambio preparado para revisión. No modifica precios, publicaciones, inventario ni permisos. Reversión: revertir el cambio del script y retirar los archivos nuevos incluidos en el parche.
