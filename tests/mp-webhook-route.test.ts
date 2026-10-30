import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {createHmac} from 'node:crypto';
const {sync,enabled}=vi.hoisted(()=>({sync:vi.fn(),enabled:vi.fn()}));
vi.mock('@/lib/store-orders',()=>({syncPayment:sync}));
vi.mock('@/lib/mercadopago',()=>({paymentsEnabled:enabled}));
import {POST} from '../src/app/api/pagos/mercadopago/route';

const secret='test-signature-not-a-real-key',id='123456789';
function request({signature=true,bodyId=id,type='payment'}={}){
 const ts=String(Math.floor(Date.now()/1000));
 const digest=createHmac('sha256',secret).update(`id:${id};request-id:test-request;ts:${ts};`).digest('hex');
 return new Request(`https://example.test/api/pagos/mercadopago?data.id=${id}`,{method:'POST',headers:{'Content-Type':'application/json','x-request-id':'test-request',...(signature?{'x-signature':`ts=${ts},v1=${digest}`}:{})},body:JSON.stringify({type,data:{id:bodyId}})});
}
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('MP_WEBHOOK_SECRET',secret);enabled.mockReturnValue(true);sync.mockResolvedValue({kind:'synced',status:'paid'});vi.spyOn(console,'error').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});});
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks();});

describe('recepción comprobada de notificaciones',()=>{
 it('no admite un aviso sin firma ni uno con identificador alterado',async()=>{
  expect((await POST(request({signature:false}))).status).toBe(401);
  expect((await POST(request({bodyId:'999'}))).status).toBe(401);expect(sync).not.toHaveBeenCalled();
 });
 it('responde 503 sin consumir eventos cuando faltan credenciales',async()=>{
  enabled.mockReturnValue(false);expect((await POST(request())).status).toBe(503);expect(sync).not.toHaveBeenCalled();
 });
 it.each(['provider','storage'])('solicita reintento cuando falla %s',async reason=>{
  sync.mockResolvedValue({kind:'retry',reason});
  const res=await POST(request());expect(res.status).toBe(503);expect(await res.json()).toEqual({ok:false});
 });
 it.each(['invalid_id','not_found','unlinked','currency','amount_mismatch'])('confirma el descarte definitivo de %s',async reason=>{
  sync.mockResolvedValue({kind:'ignored',reason});expect((await POST(request())).status).toBe(200);
  if(reason==='amount_mismatch')expect(console.warn).toHaveBeenCalledWith('mercadopago_amount_mismatch');
 });
 it('acepta el evento después de que su reintento se guarda correctamente',async()=>{
  sync.mockResolvedValueOnce({kind:'retry',reason:'storage'}).mockResolvedValueOnce({kind:'synced',status:'paid'});
  expect((await POST(request())).status).toBe(503);expect((await POST(request())).status).toBe(200);
 });
 it('no intenta sincronizar otros tipos de evento',async()=>{
  expect((await POST(request({type:'merchant_order'}))).status).toBe(200);expect(sync).not.toHaveBeenCalled();
 });
 it.each([null,42,'texto',[]])('rechaza cuerpos no estructurados: %j',async body=>{
  const signed=request();
  const malformed=new Request(signed.url,{method:'POST',headers:signed.headers,body:JSON.stringify(body)});
  expect((await POST(malformed)).status).toBe(400);expect(sync).not.toHaveBeenCalled();
 });
});
