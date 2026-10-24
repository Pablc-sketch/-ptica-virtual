import {createHmac,timingSafeEqual} from 'node:crypto';

// Mercado Pago firma data.id (query), x-request-id y ts. No se confía en el body.
export function validMpWebhook(headers:Headers,id:string|null,secret:string|undefined,now=Date.now()) {
  if(!secret||!id||!/^\d{1,20}$/.test(id))return false;
  const requestId=headers.get('x-request-id');
  const parts=(headers.get('x-signature')??'').split(',').map(p=>p.trim().split('='));
  const ts=parts.find(([k])=>k==='ts')?.[1];
  const signatures=parts.filter(([k,v])=>k==='v1'&&/^[a-f0-9]{64}$/i.test(v??'')).map(([,v])=>v);
  if(!requestId||!ts||!/^\d{10,13}$/.test(ts)||!signatures.length)return false;
  const timestamp=Number(ts)*(ts.length<=10?1000:1);
  if(Math.abs(now-timestamp)>300000)return false;
  const manifest=`id:${id};request-id:${requestId};ts:${ts};`;
  const expected=createHmac('sha256',secret).update(manifest).digest();
  return signatures.some(signature=>timingSafeEqual(expected,Buffer.from(signature,'hex')));
}
