import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright-core';
const port=3118,mockPort=54418,base=`http://localhost:${port}`;
const products=['ovalo-negro','cat-eye-ambar','cat-eye-mosaico'].map((slug,i)=>({id:`11111111-1111-4111-8111-11111111111${i}`,slug,name:['Óvalo','Ámbar','Mosaico'][i],price_clp:18000,pair_base_price_clp:28000,use:'optical',color:'Negro',product_images:[{path:'site/products/tryon-ovalo.webp',position:0,verified:true,kind:'photo'}],product_variants:[],product_models:null}));
let orderStatus='pending_payment';
const server=createServer((req,res)=>{
 const url=new URL(req.url,`http://localhost:${mockPort}`),path=url.pathname;
 res.setHeader('Content-Type','application/json');
 if(path==='/rest/v1/products'){const list=url.searchParams.has('slug')?products.filter(p=>`eq.${p.slug}`===url.searchParams.get('slug')):products;return res.end(JSON.stringify(req.headers.accept?.includes('vnd.pgrst.object')?list[0]:list));}
 if(path==='/rest/v1/rpc/get_store_order')return res.end(JSON.stringify([{status:orderStatus,product_name:'Marco de prueba',total_clp:28000}]));
 res.statusCode=401;res.end('{}');
});
await new Promise(r=>server.listen(mockPort,r));
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port)],{env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:`http://localhost:${mockPort}`,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_mock'},stdio:['ignore','pipe','pipe']});
let log='';app.stdout.on('data',d=>log+=d);app.stderr.on('data',d=>log+=d);
let browser;
try{
 for(let i=0;i<50;i++){try{if((await fetch(`${base}/ayuda`)).ok)break;}catch{}await new Promise(r=>setTimeout(r,300));}
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 for(const [name,viewport] of [['movil',{width:390,height:844}],['escritorio',{width:1440,height:1000}]]){
  const context=await browser.newContext({viewport});
  await context.addInitScript(()=>{
   // Asymmetric camera: left red, right blue. No physical camera is accessed.
   window.testStreams=[];
   navigator.mediaDevices.getUserMedia=async constraints=>{
    window.testCameraConstraints=constraints;
    const c=document.createElement('canvas');c.width=720;c.height=960;
    const ctx=c.getContext('2d');ctx.fillStyle='red';ctx.fillRect(0,0,360,960);ctx.fillStyle='blue';ctx.fillRect(360,0,360,960);
    const stream=c.captureStream(24);window.testStreams.push(stream);return stream;
   };
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/probador`);
  await page.getByRole('button',{name:'Usar mi cámara',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('video')?.videoWidth>0);
  assert.equal(await page.locator('video').evaluate(v=>getComputedStyle(v).transform),'matrix(-1, 0, 0, 1, 0, 0)');
  assert.equal(await page.evaluate(()=>window.testCameraConstraints.video.frameRate.max),30);
  await page.getByRole('button',{name:'Tomar foto',exact:true}).click();
  await page.locator('.tryon-face').waitFor();
  const pixel=await page.locator('.tryon-face').evaluate(async img=>{await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return [...ctx.getImageData(20,20,1,1).data];});
  assert(pixel[2]>200&&pixel[0]<30,'La foto debe mantener el lado azul a la izquierda, igual que el espejo');
  assert(await page.evaluate(()=>window.testStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))),'La captura debe apagar la cámara');
  const cancel=page.getByRole('button',{name:'Ajustar a mano',exact:true});if(await cancel.isVisible())await cancel.click();
  await page.getByRole('button',{name:'Marcar mis ojos',exact:true}).click();
  await page.locator('.tryon-stage').scrollIntoViewIfNeeded();
  const r=await page.locator('.tryon-stage').boundingBox();
  await page.mouse.click(r.x+r.width*.43,r.y+r.height*.4);await page.mouse.click(r.x+r.width*.57,r.y+r.height*.4);
  await page.getByRole('button',{name:'Ajustar con estas marcas',exact:true}).click();
  const overlay=page.locator('.tryon-frame');await overlay.scrollIntoViewIfNeeded();const before=await overlay.evaluate(e=>parseFloat(e.style.left));const box=await overlay.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+30,box.y+box.height/2,{steps:20});await page.mouse.up();
  assert((await overlay.evaluate(e=>parseFloat(e.style.left)))>before,'El marco debe seguir el movimiento a la derecha');
  await page.getByRole('button',{name:'Probar con modelo 1',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Marco alineado con tus ojos'}).waitFor({timeout:20000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert.deepEqual(errors,[]);
  mkdirSync('../../outputs',{recursive:true});
  await page.getByRole('heading',{name:'Encuentra tu forma.'}).click();await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:`../../outputs/probador-${name}.png`,fullPage:true});
  console.log(`OK ${name}: espejo en cámara y foto, cámara apagada, ajuste manual, arrastre, alineación facial real, sin desborde ni errores`);
  await page.getByRole('button',{name:'Quitar mi foto y cerrar cámara',exact:true}).click();assert.equal(await page.locator('.tryon-face').count(),0);
  if(name==='escritorio'){
   await page.goto(`${base}/comprar/ovalo-negro`);
   assert(await page.getByRole('button',{name:'Pagar con Mercado Pago',exact:true}).isDisabled());
   assert(await page.getByRole('link',{name:'escríbenos por WhatsApp para comprar este marco'}).getAttribute('href'));
   await page.goto(`${base}/comprar/estado?pedido=11111111-1111-4111-8111-111111111110&t=123456789012345678901234&status=approved`);
   await page.getByRole('heading',{name:'Pago pendiente',exact:true}).waitFor();
   orderStatus='paid';await page.getByRole('button',{name:'Actualizar estado del pago',exact:true}).click();
   await page.getByRole('heading',{name:'¡Pago recibido!',exact:true}).waitFor();
   console.log('OK compra: pago desactivado sin credenciales, alternativa WhatsApp, estado consultado a la base y actualización manual');
  }
  await context.close();
 }
}finally{await browser?.close();app.kill();server.close();if(log.includes('Error:'))console.error(log);}
