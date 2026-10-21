// Auditoría de SOLO LECTURA con clave pública. No inicia sesión, crea usuarios ni escribe datos.
import nextEnv from '@next/env';
import {createClient} from '@supabase/supabase-js';
nextEnv.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!url||!key)throw new Error('Falta configuración pública');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data,error}=await db.from('products').select('id,name,pair_base_price_clp,price_clp,is_sample,product_images(path,kind,verified)').eq('status','published');
if(error)throw new Error(`No se pudo consultar catálogo: ${error.code}`);
if(data.length!==3||data.some(p=>p.pair_base_price_clp!==28000||p.price_clp!==null||!p.is_sample))throw new Error('Catálogo no coincide con las tres muestras aprobadas');
const privateResult=await db.from('product_procurement').select('product_id,supplier_code');
if(!privateResult.error || privateResult.data?.length)throw new Error('La referencia privada no debe ser accesible con clave pública');
console.log(JSON.stringify({publicProducts:data.map(p=>p.name),approvedPairBaseClp:28000,privateProcurementDenied:true,privateErrorCode:privateResult.error.code}));
