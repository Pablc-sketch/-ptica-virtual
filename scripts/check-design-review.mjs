// Background browser verification against the local production build. No user desktop or real uploads.
import {chromium} from 'playwright-core';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const port=3102,base=`http://localhost:${port}`,out='output/design-review';mkdirSync(out,{recursive:true});
const app=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p',String(port)],{env:{...process.env,NEXT_DIST_DIR:process.env.NEXT_DIST_DIR||'.next-design-review'},stdio:'ignore',windowsHide:true});
const checks=[];let browser;
function check(name,ok,detail=''){checks.push({name,ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name} ${detail}`);if(!ok)throw Error(name);}
try{
 for(let i=0;i<40;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-gpu']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${out}/portada-escritorio.png`,fullPage:true});
 check('portada usa colección y no plantillas de estilos sin stock',await page.getByRole('heading',{name:'Una forma que va contigo.'}).count()===1);
 await page.goto(base+'/cotizar-receta?marco=cat-eye-ambar',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Elegir mis graduaciones Ver una estimación'}).click();
 async function power(id,sign,value){await page.locator('#'+id).click();const d=page.getByRole('dialog');await d.getByRole('button',{name:sign==='-'?'− Negativo':'+ Positivo',exact:true}).click();await d.getByRole('button',{name:(value==='0.00'?'+':sign==='-'?'−':'+')+value,exact:true}).click();}
 await power('right-sphere','-','7.00');check('−7.00 se conserva con punto',await page.locator('#right-sphere').innerText()==='−7.00\n⌄');
 await power('right-sphere','-','1.00');await power('right-cylinder','-','0.50');await page.locator('#right-axis').selectOption('90');await power('left-sphere','+','1.00');await power('left-cylinder','+','0.00');
 await page.getByRole('radio',{name:/^Antirreflejo/}).check();await page.getByRole('checkbox',{name:/Revisé los signos/}).check();
 check('AR muestra precio completo 38.000',await page.locator('.rx-total').innerText().then(s=>s.includes('$38.000')));
 await page.getByRole('radio',{name:/^Polarizado/}).check();await page.getByRole('button',{name:'Verde',exact:true}).click();await page.getByRole('radio',{name:/^Fotocromático/}).check();
 check('fotocromático no conserva verde incompatible',await page.getByRole('button',{name:'Gris',exact:true}).getAttribute('aria-pressed')==='true'&&!(await page.locator('.rx-summary').innerText()).includes('verde'));
 await page.getByLabel('Uso de la receta').selectOption('near');await power('common-addition','+','2.00');await page.getByRole('checkbox',{name:/Revisé los signos/}).check();
 check('ADD para cerca deriva a revisión sin sumar automáticamente',await page.locator('.rx-total').innerText().then(s=>s.includes('Revisión profesional')));
 await page.locator('#left-sphere').click();await page.keyboard.press('Escape');check('Escape devuelve el foco al selector',await page.locator('#left-sphere').evaluate(el=>el===document.activeElement));
 const href=await page.getByRole('link',{name:'Continuar con mi receta',exact:true}).getAttribute('href');check('selección se conserva sin graduaciones en URL',href.includes('marco=cat-eye-ambar')&&!href.includes('sphere')&&!href.includes('2.00'));
 await page.locator('#right-sphere').click();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${out}/selector-dioptrias.png`});await page.keyboard.press('Escape');
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});check(`receta ${width}px sin desborde`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${out}/receta-movil.png`,fullPage:true});
 await page.goto(base+'/probador?marco=cat-eye-ambar',{waitUntil:'networkidle'});await page.setViewportSize({width:1440,height:1000});
 const transmissions=[];page.on('request',r=>{if(['POST','PUT','PATCH'].includes(r.method()))transmissions.push(r.url());});
 await page.getByRole('button',{name:'Probar con modelo 1',exact:true}).click();await page.getByRole('status').filter({hasText:'Marco alineado con tus ojos'}).waitFor({timeout:55000});check('detección facial real alinea modelo 1',true);
 await page.getByRole('button',{name:'Marcar mis ojos',exact:true}).click();await page.getByRole('button',{name:'Volver a marcar',exact:true}).click();const stage=page.locator('.tryon-stage'),rect=await stage.boundingBox();await stage.click({position:{x:rect.width*.39,y:rect.height*.38}});await stage.click({position:{x:rect.width*.61,y:rect.height*.38}});await page.getByRole('button',{name:'Ajustar con estas marcas',exact:true}).click();check('dos marcas manuales ajustan frontal',await page.getByRole('status').innerText().then(s=>s.includes('dos marcas')));
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${out}/probador-escritorio.png`,fullPage:true});
 for(const i of [2,3]){await page.getByRole('button',{name:`Probar con modelo ${i}`,exact:true}).click();await page.getByRole('status').filter({hasText:'Marco alineado con tus ojos'}).waitFor({timeout:55000});check(`detección facial real alinea modelo ${i}`,true);}
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${out}/probador-movil.png`,fullPage:true});check('probador móvil sin desborde',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.getByRole('button',{name:'Probar con modelo 1',exact:true}).click();await page.getByRole('status').filter({hasText:'Marco alineado con tus ojos'}).waitFor({timeout:55000});const visibleStage=await page.locator('.tryon-stage').boundingBox();check('foto permanece visible al cambiar modelo en móvil',visibleStage.y>=0&&visibleStage.y+visibleStage.height<844);await page.screenshot({path:out+'/probador-movil-interaccion.png'});
 check('probar caras no envía POST/PUT/PATCH',transmissions.length===0,JSON.stringify(transmissions));
 await page.getByRole('button',{name:'Quitar mi foto y cerrar cámara'}).click();check('retirar foto limpia el rostro',await page.locator('.tryon-face').count()===0);
 await page.addScriptTag({path:createRequire(import.meta.url).resolve('axe-core/axe.min.js')});const a=await page.evaluate(async()=>{const r=await window.axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}));});writeFileSync(`${out}/axe-probador.json`,JSON.stringify(a,null,2));check('accesibilidad automatizada del probador',a.length===0,JSON.stringify(a));
 check('sin errores de ejecución de página',errors.length===0,JSON.stringify(errors));
}finally{writeFileSync(`${out}/checks.json`,JSON.stringify(checks,null,2));await browser?.close();app.kill();}
