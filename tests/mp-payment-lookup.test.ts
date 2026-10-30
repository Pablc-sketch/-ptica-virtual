import {afterEach, describe, expect, it, vi} from 'vitest';
import {getPayment} from '../src/lib/mercadopago';

const payment = {id: 123456789, status: 'approved', external_reference: '11111111-1111-4111-8111-111111111111', transaction_amount: 28000, currency_id: 'CLP'};
const response = (data: unknown, status=200) => new Response(JSON.stringify(data), {status, headers: {'Content-Type':'application/json'}});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});

describe('consulta del pago antes de confirmar la compra',()=>{
 it('rechaza identificadores inválidos sin consultar al proveedor',async()=>{
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  expect(await getPayment('../otro')).toEqual({kind:'ignored',reason:'invalid_id'});
  expect(fetcher).not.toHaveBeenCalled();
 });
 it('limita datos, tiempo de espera y redirecciones de la consulta',async()=>{
  const fetcher=vi.fn().mockResolvedValue(response({...payment,payer:{email:'privado@example.test'}}));
  vi.stubGlobal('fetch',fetcher);vi.stubEnv('MP_ACCESS_TOKEN','test-placeholder');
  expect(await getPayment('123456789')).toEqual({kind:'found',payment:{id:'123456789',status:'approved',externalReference:payment.external_reference,amount:28000,currency:'CLP'}});
  const [url,options]=fetcher.mock.calls[0];
  expect(url).toBe('https://api.mercadopago.com/v1/payments/123456789');
  expect(options).toMatchObject({cache:'no-store',redirect:'error',headers:{Authorization:'Bearer test-placeholder'}});
  expect(options.signal).toBeInstanceOf(AbortSignal);
 });
 it('un pago inexistente se distingue de una falla del proveedor',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({},404)));
  expect(await getPayment('123456789')).toEqual({kind:'ignored',reason:'not_found'});
 });
 it.each([401,403,429,500,503])('conserva la posibilidad de reintentar HTTP %s',async status=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({},status)));
  expect(await getPayment('123456789')).toEqual({kind:'retry'});
 });
 it('conserva el evento cuando hay fallo de red o respuesta no JSON',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('detalle privado')));
  expect(await getPayment('123456789')).toEqual({kind:'retry'});
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('<html>error</html>')));
  expect(await getPayment('123456789')).toEqual({kind:'retry'});
 });
 it.each([null,{}, {...payment,id:987}, {...payment,id:9007199254740992}, {...payment,status:null}, {...payment,transaction_amount:28000.4}])('no confirma con datos inconsistentes: %j',async data=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(data)));
  expect(await getPayment('123456789')).toEqual({kind:'retry'});
 });
 it('conserva moneda y monto extranjeros para que la sincronización pueda descartarlos',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({...payment,currency_id:'USD',transaction_amount:12.5})));
  expect(await getPayment('123456789')).toMatchObject({kind:'found',payment:{currency:'USD',amount:12.5}});
 });
 it('acepta pagos sin referencia de tienda para poder descartarlos sin reintentos',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({...payment,external_reference:undefined})));
  expect(await getPayment('123456789')).toMatchObject({kind:'found',payment:{externalReference:null}});
 });
});
