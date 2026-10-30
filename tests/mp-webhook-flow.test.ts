import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {createHmac} from 'node:crypto';
const {rpc,createClient}=vi.hoisted(()=>({rpc:vi.fn(),createClient:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient}));
import {POST} from '../src/app/api/pagos/mercadopago/route';

const id='123456789',secret='test-signature-not-a-real-key';
const payment={id:Number(id),status:'approved',external_reference:'11111111-1111-4111-8111-111111111111',transaction_amount:28000,currency_id:'CLP'};
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status});
function signedRequest(){
 const ts=String(Math.floor(Date.now()/1000));
 const digest=createHmac('sha256',secret).update(`id:${id};request-id:flow-test;ts:${ts};`).digest('hex');
 return new Request(`https://example.test/api/pagos/mercadopago?data.id=${id}`,{method:'POST',headers:{'Content-Type':'application/json','x-request-id':'flow-test','x-signature':`ts=${ts},v1=${digest}`},body:JSON.stringify({type:'payment',data:{id}})});
}
beforeEach(()=>{
 vi.resetAllMocks();vi.stubEnv('MP_ACCESS_TOKEN','test-token-not-a-real-key');vi.stubEnv('PAYMENTS_SECRET','test-storage-secret');vi.stubEnv('MP_WEBHOOK_SECRET',secret);
 createClient.mockResolvedValue({rpc});rpc.mockResolvedValue({data:'paid',error:null});vi.spyOn(console,'error').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();vi.restoreAllMocks();});

describe('firma → consulta del proveedor → confirmación del pedido',()=>{
 it('un proveedor caído no consume el evento; un reintento posterior confirma una vez',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(response({},503)).mockResolvedValueOnce(response(payment));vi.stubGlobal('fetch',fetcher);
  expect((await POST(signedRequest())).status).toBe(503);expect(rpc).not.toHaveBeenCalled();
  expect((await POST(signedRequest())).status).toBe(200);expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledWith('confirm_store_order_payment',expect.objectContaining({p_order:payment.external_reference,p_payment:id,p_status:'approved',p_amount:28000}));
 });
 it('una base no disponible conserva el evento hasta poder confirmarlo',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockImplementation(()=>Promise.resolve(response(payment))));
  rpc.mockResolvedValueOnce({data:null,error:{code:'08006',message:'red no disponible'}}).mockResolvedValueOnce({data:'paid',error:null});
  expect((await POST(signedRequest())).status).toBe(503);expect((await POST(signedRequest())).status).toBe(200);
 });
 it.each([{...payment,external_reference:null},{...payment,external_reference:undefined},{...payment,currency_id:'USD',transaction_amount:12.5}])('descarta un pago ajeno sin escribir en la base: %j',async body=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(body)));
  expect((await POST(signedRequest())).status).toBe(200);expect(rpc).not.toHaveBeenCalled();
 });
 it('no redondea un monto CLP para hacerlo coincidir con el pedido',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({...payment,transaction_amount:27999.6})));
  expect((await POST(signedRequest())).status).toBe(503);expect(rpc).not.toHaveBeenCalled();
 });
 it('un monto distinto rechazado por la base no se registra ni se repite indefinidamente',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({...payment,transaction_amount:27000})));
  rpc.mockResolvedValue({data:null,error:{code:'22023',message:'amount_mismatch'}});
  expect((await POST(signedRequest())).status).toBe(200);expect(console.warn).toHaveBeenCalledWith('mercadopago_amount_mismatch');
 });
});
