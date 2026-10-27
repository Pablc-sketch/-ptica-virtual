// Auditoría de SOLO LECTURA con clave pública. No inicia sesión, crea usuarios ni escribe datos.
import nextEnv from '@next/env';
import {createClient} from '@supabase/supabase-js';
import {auditPublicCatalog} from './lib/catalog-audit.mjs';
nextEnv.loadEnvConfig(process.cwd(),false,{info(){},error(){}});
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!url||!key)throw new Error('Falta configuración pública');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
// No solicita tablas privadas: una prueba de denegación podría devolver datos si los permisos fallan.
// Las comprobaciones de permisos deben ejecutarse aparte contra metadatos o una base de prueba.
console.log(JSON.stringify(await auditPublicCatalog(db)));
