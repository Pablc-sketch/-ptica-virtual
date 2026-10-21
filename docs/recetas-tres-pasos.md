# Recetas: comprobación antes de enviar

Codex implementa selección, comprobación y consentimiento. Claude integra estado e historial de revisión documental en una entrega separada; no considerar esa parte lista hasta revisar y aplicar su migración.

Referencia consultada: https://www.warbyparker.com/eyeglasses (21/10/2026). Se toma la separación clara entre explorar marcos, elegir y resolver receta; no se copian imágenes, precios ni servicios clínicos.

El formulario mantiene el archivo en memoria hasta el último paso. La foto se previsualiza mediante URL blob local, revocada al cambiar archivo o salir. PDF se identifica por nombre y se pide comprobar el original; no hay visor externo ni OCR. Solo acepta JPG/PNG/WebP/PDF hasta4MiB y rechaza archivos vacíos; el servidor conserva comprobación independiente de firma, permisos, cuota y consentimiento. Cambiar archivo elimina comprobación y autorización anteriores. Envío con bloqueo sincrónico contra doble clic; no inventa porcentaje de progreso. Ante respuesta incierta conserva el archivo y recomienda consultar Mis recetas antes de repetir.

Comprobación real de navegador con Supabase simulado SOLO en memoria, sin clientes ni datos médicos reales: ingreso sintético, bloqueo sin archivo, selección PNG sintético, paso2 con vista previa y foco en título, bloqueo sin comprobación, paso3 con bloqueo sin consentimiento, POST201 y lista actualizada tras refresco de servidor. A320px scrollWidth305 frente a innerWidth320, sin desborde horizontal. Falta ampliar casos de archivo incompatible/tamaño y fallo de red, revisión visual tras integrar administración y prueba real con cuenta autorizada. No afirmar estas pruebas como RLS real.

36 unitarias existentes pasan; lint sin errores con3avisos previos. Compilación aislada .next-e2e pasó23rutas. Build normal encontró proceso auxiliar Turbopack Windows; una compilación aislada no reprodujo el fallo. Verificar Vercel por SHA antes de llamar publicado al cambio.

No se cambia esquema, Auth, permisos, cotizaciones cerradas ni Lentia en esta entrega.