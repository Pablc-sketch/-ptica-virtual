import test from 'node:test';
import assert from 'node:assert/strict';
import {auditPublicCatalog} from '../lib/catalog-audit.mjs';

const product = (overrides = {}) => ({
  id: 'public-fixture', name: 'Marco de prueba', price_clp: null,
  pair_base_price_clp: 28000, is_sample: true,
  product_images: [{path: 'site/products/test.webp', verified: false, kind: 'retouched'}],
  ...overrides,
});
function client(data, error = null) {
  const calls = [];
  return {
    calls,
    from(table) {
      calls.push(table);
      assert.equal(table, 'products');
      return {select(columns) {
        assert.ok(!columns.includes('*'));
        assert.ok(!columns.includes('supplier'));
        return {eq(column, value) {
          assert.equal(column, 'status');
          assert.equal(value, 'published');
          return Promise.resolve({data, error});
        }};
      }};
    },
  };
}
test('21 muestras válidas no fallan por la cantidad de la campaña antigua', async () => {
  const db = client(Array.from({length: 21}, (_, i) => product({id: `p${i}`})));
  const result = await auditPublicCatalog(db);
  assert.equal(result.publishedCount, 21);
  assert.equal(result.sampleCount, 21);
  assert.equal(result.warnings.length, 1);
  assert.deepEqual(db.calls, ['products']);
  assert.equal(result.privateProcurementCheck, 'not_run');
  assert.ok(!('privateProcurementDenied' in result));
});
test('acepta precios válidos distintos y productos confirmados', async () => {
  const p = product({price_clp: 17000, pair_base_price_clp: 39990, is_sample: false,
    product_images: [{path: 'real.webp', verified: true}]});
  const result = await auditPublicCatalog(client([p]));
  assert.deepEqual(result.warnings, []);
});
test('no transforma un error de consulta en catálogo vacío', async () => {
  await assert.rejects(auditPublicCatalog(client(null, {code: '42501'})), /42501/);
});
test('rechaza respuesta inválida y catálogo vacío', async () => {
  await assert.rejects(auditPublicCatalog(client(null)), /Respuesta/);
  await assert.rejects(auditPublicCatalog(client([])), /vacío/);
});
test('rechaza ausencia de precio aunque haya fotografía', async () => {
  await assert.rejects(auditPublicCatalog(client([product({pair_base_price_clp: null})])), /sin precio/);
});
test('rechaza negativos, cero, fracciones, texto y valores fuera de rango seguro', async () => {
  for (const value of [-1, 0, 28000.5, '28000', Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(auditPublicCatalog(client([product({pair_base_price_clp: value})])), /precio inválido/);
  }
});
test('rechaza fotos inexistentes, vacías o no elegibles', async () => {
  for (const images of [null, [], [{path: '', verified: true}], [{path: 'draft.webp', verified: false, kind: 'original'}]]) {
    await assert.rejects(auditPublicCatalog(client([product({product_images: images})])), /fotografía/);
  }
});
test('un retoque sin verificar solo es elegible si el producto es muestra', async () => {
  await assert.rejects(auditPublicCatalog(client([product({is_sample: false})])), /fotografía/);
});
