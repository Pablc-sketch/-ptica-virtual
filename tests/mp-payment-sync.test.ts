import {beforeEach, describe, expect, it, vi} from 'vitest';
const {lookup,rpc,createClient}=vi.hoisted(()=>({lookup:vi.fn(),rpc:vi.fn(),createClient:vi.fn()}));
vi.mock('@/lib/supabase/server',()=>({createClient}));
vi.mock('@/lib/mercadopago',()=>({getPayment:lookup}));
import {syncPayment} from '../src/lib/store-orders';

const pay={id:'123456789',status:'approved',externalReference:'11111111-1111-4111-8111-111111111111',amount:28000,currency:'CLP'};
beforeEach(()=>{vi.resetAllMocks();lookup.mockResolvedValue({kind:'found',payment:pay});createClient.mockResolvedValue({rpc});rpc.mockResolvedValue({data:'paid',error:null});});

describe('confirmación de pagos de la tienda',()=>{
 it('solo registra datos comprobados contra Mercado Pago',async()=>{
  expect(await syncPayment(pay.id)).toEqual({kind:'synced',status:'paid'});
  expect(rpc).toHaveBeenCalledWith('confirm_store_order_payment',expect.objectContaining({p_order:pay.externalReference,p_payment:pay.id,p_status:'approved',p_amount:28000}));
 });
 it('distingue fallo del proveedor y no registra nada todavía',async()=>{
  lookup.mockResolvedValue({kind:'retry'});
  expect(await syncPayment(pay.id)).toEqual({kind:'retry',reason:'provider'});
  expect(createClient).not.toHaveBeenCalled();
 });
 it.each([['invalid_id'],['not_found']])('descarta %s sin consultar la base',async reason=>{
  lookup.mockResolvedValue({kind:'ignored',reason});
  expect(await syncPayment(pay.id)).toEqual({kind:'ignored',reason});expect(createClient).not.toHaveBeenCalled();
 });
 it.each([[null,'unlinked'],['referencia-ajena','unlinked']])('descarta referencia ajena %s',async(reference,reason)=>{
  lookup.mockResolvedValue({kind:'found',payment:{...pay,externalReference:reference}});
  expect(await syncPayment(pay.id)).toEqual({kind:'ignored',reason});expect(createClient).not.toHaveBeenCalled();
 });
 it('descarta otra moneda antes de modificar pedidos',async()=>{
  lookup.mockResolvedValue({kind:'found',payment:{...pay,currency:'USD',amount:12.5}});
  expect(await syncPayment(pay.id)).toEqual({kind:'ignored',reason:'currency'});expect(createClient).not.toHaveBeenCalled();
 });
 it('no reintenta indefinidamente un pedido inexistente o un monto incompatible',async()=>{
  rpc.mockResolvedValueOnce({data:'not_found',error:null});
  expect(await syncPayment(pay.id)).toEqual({kind:'ignored',reason:'not_found'});
  rpc.mockResolvedValueOnce({data:null,error:{code:'22023',message:'amount_mismatch'}});
  expect(await syncPayment(pay.id)).toEqual({kind:'ignored',reason:'amount_mismatch'});
 });
 it.each([{code:'42501',message:'forbidden'},{code:'08006',message:'network'}])('conserva el evento si falla la base o su configuración: %j',async error=>{
  rpc.mockResolvedValue({data:null,error});expect(await syncPayment(pay.id)).toEqual({kind:'retry',reason:'storage'});
 });
 it('conserva el evento si falla la creación del cliente o no hay respuesta de la base',async()=>{
  createClient.mockRejectedValueOnce(new Error('detalle privado'));
  expect(await syncPayment(pay.id)).toEqual({kind:'retry',reason:'storage'});
  rpc.mockResolvedValue({data:null,error:null});expect(await syncPayment(pay.id)).toEqual({kind:'retry',reason:'storage'});
 });
});
