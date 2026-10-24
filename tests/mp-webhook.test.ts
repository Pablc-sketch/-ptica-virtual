import {describe,it,expect} from 'vitest';
import {createHmac} from 'node:crypto';
import {validMpWebhook} from '../src/lib/mp-webhook';

const secret='test-webhook-secret-not-a-real-credential';
const now=1792857000000,ts=String(now/1000),id='123456789';
const signature=createHmac('sha256',secret).update(`id:${id};request-id:req-1;ts:${ts};`).digest('hex');
const signed=()=>new Headers({'x-request-id':'req-1','x-signature':`ts=${ts},v1=${signature}`});
describe('notificaciones Mercado Pago',()=>{
 it('acepta la firma correcta y rechaza cambios en id o secreto',()=>{
  expect(validMpWebhook(signed(),id,secret,now)).toBe(true);
  expect(validMpWebhook(signed(),'987654321',secret,now)).toBe(false);
  expect(validMpWebhook(signed(),id,'wrong',now)).toBe(false);
 });
 it('rechaza notificaciones antiguas, sin firma o mal formadas',()=>{
  expect(validMpWebhook(signed(),id,secret,now+301000)).toBe(false);
  expect(validMpWebhook(new Headers(),id,secret,now)).toBe(false);
  expect(validMpWebhook(new Headers({'x-signature':'ts=no,v1=abc'}),id,secret,now)).toBe(false);
  expect(validMpWebhook(signed(),null,secret,now)).toBe(false);
 });
});
