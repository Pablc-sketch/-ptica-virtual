// Validación del catálogo público; sin precios o cantidades de una campaña concreta.
export async function auditPublicCatalog(db) {
  const {data, error} = await db.from('products')
    .select('id,name,pair_base_price_clp,price_clp,is_sample,product_images(path,kind,verified)')
    .eq('status', 'published');
  if (error) throw new Error(`No se pudo consultar catálogo: ${error.code ?? 'unknown'}`);
  if (!Array.isArray(data)) throw new Error('Respuesta de catálogo inválida');
  if (data.length === 0) throw new Error('El catálogo público está vacío');

  let withoutPrice = 0, invalidPrice = 0, withoutVisibleImage = 0;
  for (const product of data) {
    const prices = [product.price_clp, product.pair_base_price_clp];
    if (prices.every((price) => price == null)) withoutPrice++;
    if (prices.some((price) => price != null && (!Number.isSafeInteger(price) || price <= 0))) invalidPrice++;
    // Misma elegibilidad de fotos que catalog-adapt.ts. No valida calidad visual ni descarga archivos.
    const images = Array.isArray(product.product_images) ? product.product_images : [];
    if (!images.some((image) => typeof image.path === 'string' && image.path.trim()
      && (image.verified === true || (product.is_sample === true && image.kind === 'retouched')))) {
      withoutVisibleImage++;
    }
  }
  const problems = [];
  if (withoutPrice) problems.push(`${withoutPrice} producto(s) sin precio`);
  if (invalidPrice) problems.push(`${invalidPrice} producto(s) con precio inválido`);
  if (withoutVisibleImage) problems.push(`${withoutVisibleImage} producto(s) sin fotografía elegible`);
  if (problems.length) throw new Error(`Catálogo público: ${problems.join('; ')}`);

  const samples = data.filter((product) => product.is_sample === true).length;
  return {
    publicProducts: data.map((product) => product.name),
    publishedCount: data.length,
    sampleCount: samples,
    warnings: samples ? ['Hay muestras publicadas; confirmar disponibilidad antes de vender.'] : [],
    privateProcurementCheck: 'not_run',
    coverage: 'Precios y elegibilidad de imágenes del catálogo público; no stock, archivos, variantes, UX ni permisos privados.',
  };
}
