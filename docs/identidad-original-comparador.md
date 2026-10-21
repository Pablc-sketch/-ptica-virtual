# Óptica Global: identidad original y herramientas de elección

Pablo confirmó el logo original, el naranjo y el eslogan «Visión sin fronteras», y pidió menos imagen generada, más originalidad y funcionalidad. Cambios sobre codex/diseno-editorial 0a178f275ba1ea4dc0e7267115da953510ea53e6; sin cambios en Lentia, roles ni esquema Supabase.

## Identidad

- Original: Desktop/logoopticaglobal.png, copiado intacto a public/brand/logo-original.png. Color predominante medido: RGB217/119/86 (#d97756). La API HTTP local devuelve exactamente los mismos bytes/SHA256 del original.
- El símbolo y el nombre se muestran mediante ventanas SVG del PNG original; no se redibujaron ni se generó otra marca. Header y footer muestran el eslogan.
- Paleta cálida: naranjo original en la marca, naranjo oscuro #b65432 para botones y texto, fondo #fbf8f3 y tinta #30332c. Contraste calculado: botón blanco4.88:1; texto principal12.12:1.
- Portada sin las dos imágenes generadas anteriores. Se sustituyeron por un explorador de siluetas programado (rectangular/redondo/cat eye) y una explicación de medidas con ejemplo identificado como ilustrativo. No se muestran como productos comerciales ni como prueba virtual3D.

## Comparador funcional

Nueva ruta /comparar. Cada ficha y tarjeta permite guardar hasta tres modelos. Se conservan solo IDs en el navegador, sincronizados entre pestañas y con alternativa en memoria si el almacenamiento está bloqueado. Hay controles de quitar, vaciar y pasar a la selección existente.

GET /api/comparar valida de uno a tres UUID y consulta exclusivamente esos productos publicados; conserva el adaptador de fotos/GLB verificados. No descarga todo el catálogo ni guarda precios localmente. Respuesta private/no-store; error503 con reintento conserva la lista. Los campos faltantes se muestran como «Sin informar»; no se inventa ajuste, stock o medida. Tabla con cabeceras semánticas y desplazamiento propio en pantallas estrechas.

El ejemplo52/18/140 representa lente/puente/varilla en milímetros, sin recomendación de ajuste. Referencia de nomenclatura: https://testindia1.ray-ban.com/size-guide (fabricante). Los valores son ilustrativos y no corresponden a un modelo real.

## Verificación

- Compilación local de producción y TypeScript pasan, incluyendo /comparar y /api/comparar (23 rutas).
-36 pruebas unitarias pasan; incluye límite real de elecciones, sustitución tras quitar, persistencia/memoria bloqueada y validación de consultas malformadas/excesivas. Lint sin errores;3 avisos heredados ajenos a este cambio.
- Prueba HTTP de compilación aislada .next-e2e contra mock en memoria: solicitudes inválidas o de cuatro modelos400; tres productos actuales200; medidas null conservadas; duplicados normalizados; UUID desconocido devuelve[]; Cache-Control correcto.
- HTML de portada sin referencias a las imágenes IA anteriores; logo servido byte por byte idéntico al original. No se insertaron datos ni archivos en Supabase real.
- Esta pasada NO tiene nueva revisión visual con navegador: el usuario detuvo Computer Use con Escape. Se respetó la interrupción; solo continuaron código, compilación, pruebas y HTTP. No se enviaron nuevas instrucciones a Claude después de esa interrupción. La última revisión visual corresponde al diseño azul anterior, no debe atribuirse a este cambio naranjo.
