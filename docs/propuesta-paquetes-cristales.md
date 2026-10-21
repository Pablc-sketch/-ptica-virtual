# Propuesta mínima: paquetes de cristales y uso lejos/cerca (sin pagos)

Estado: **propuesta, no aplicada** (`supabase/pendientes/03_paquetes_cristales.sql`, prueba `tests/lens-packages-prevalidate.sql`).

## Qué está confirmado (Pablo, 21/10/2026, vía Codex)
- Cristales **desde, por par**: blanco $28.000; antirreflejo $38.000; filtro azul $48.000 (= base + $20.000).
- No confirmado: fotocromático (precio), progresivos/bifocales, límites de graduación, combinaciones (p. ej. antirreflejo + filtro azul).

## Modelo propuesto
- `lens_packages`: un paquete **excluyente** por par (no se suman tratamientos), con `price_from_clp` siempre
  `price_basis = 'desde_por_par'`, `usages` ⊆ {lejos, cerca}, estado borrador/publicado, y `confirmed_source`/`confirmed_at`
  para saber quién confirmó cada precio. Lectura pública solo de publicados; escritura solo admin.
- `products.price_clp` **no cambia de significado**: sigue siendo solo el marco. La UI muestra "marco $X + cristales desde $Y" y
  cualquier suma como **referencial**, nunca como precio final; el total se confirma tras revisar la receta.
- No se validan graduaciones ni se recalcula nada clínico. Si la receta requiere algo fuera de los paquetes (alta graduación,
  progresivo), lo indica la revisión humana.

## Cuándo se usa en una cotización (diseño, NO implementado; las cotizaciones siguen cerradas)
- Tabla futura `quote_lens_choices(quote_item_id, package_code, usage, reference_price_clp)`: el cliente envía **solo códigos**
  (paquete y uso); el servidor copia el precio "desde" vigente como referencia. Requiere migración propia + GRANT de `create_quote`
  + `QUOTES_OPEN=true`, por decisión de Pablo.

## Riesgos y decisiones abiertas
- Si el configurador de Codex usa constantes en el código, habrá dos fuentes de precio hasta leerlo desde `lens_packages`.
  Propuesta: al aplicar la migración, el configurador lee la tabla y las constantes quedan solo como respaldo de pruebas.
- "Desde" puede crear expectativas: mantener el texto "precio referencial, se confirma tras revisar tu receta" junto a cada valor.
- Fotocromático/progresivos: no se muestran con precio hasta confirmación; a lo sumo "consultar".

Referencia de estructura consultada: https://www.firmoo.cl/z/cristales-funcionales (uso → tipo de cristal → función). No se copian
textos, precios, descuentos ni promociones.
