import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
const base='http://localhost:3103';
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3103'],{env:{...process.env,NEXT_DIST_DIR:'.next-design-review-fresh'},stdio:'ignore',windowsHide:true});let browser;let passed=0;
function check(ok,name){if(!ok)throw Error(name);console.log('PASS',name);passed++;}
try{
for(let i=0;i<40;i++){try{if((await fetch(base+'/admin/login')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
for(const corrupt of [false,true]){
const context=await browser.newContext();if(corrupt)await context.addCookies([{name:'sb-zezqhjikapaelbjavjms-auth-token',value:'base64-invalid-session',url:base}]);const page=await context.newPage();
for(const path of ['/admin','/admin/productos','/admin/productos/nuevo','/admin/cotizaciones','/admin/recetas']){await page.goto(base+path);check(new URL(page.url()).pathname==='/admin/login',`${corrupt?'cookie inválida':'sin sesión'} bloquea ${path}`);}
await page.getByRole('button',{name:'Entrar',exact:true}).waitFor();check(await page.getByRole('button',{name:'Entrar',exact:true}).count()===1,'login exige formulario');check(await page.getByRole('link',{name:'Selección',exact:true}).count()===0,'administración sin navegación de compra');
const rx=await context.request.post(base+'/api/admin/recetas/00000000-0000-4000-8000-000000000001/estado',{headers:{origin:base},data:{to:'reviewed',expected_version:1}});check([401,403].includes(rx.status()),'mutación privada rechaza sesión ausente/inválida');await context.close();}
console.log('TOTAL',passed);
}finally{await browser?.close();app.kill();}


