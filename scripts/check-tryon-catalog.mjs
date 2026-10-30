// Local-only browser regression. Start Next at 127.0.0.1:3111 with Supabase URL 127.0.0.1:54397 and a mock publishable key.
import {createServer} from 'node:http';
import {chromium} from 'playwright-core';
const products=Array.from({length:21},(_,i)=>({id:`p${i}`,slug:`nuevo-${i}`,name:`Nuevo ${i}`,description:null,price_clp:28000,frame_shape:'Rectangular',material:'Metal',color:'Negro',gender:'unisex',lens_width_mm:null,bridge_mm:null,temple_mm:null,brands:null,product_models:null,product_images:[{path:'site/products/optico-kensington-negro.webp',alt:'Frontal fixture',position:0,verified:true,view:'front'}]}));
products[20].product_variants=[{id:'azul',color_name:'Azul',color_hex:'#00f',color_hex_2:null,position:0,status:'published'}];
products[20].product_images[0]={...products[20].product_images[0],variant_id:'azul',path:'site/products/optico-kensington-azul.webp'};
const mock=createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(req.url.startsWith('/rest/v1/products')?products:[]));});
await new Promise(r=>mock.listen(54397,'127.0.0.1',r));
await new Promise(r=>setTimeout(r,3000));
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/opt/pw-browsers/chromium',args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});const writes=[];
 await page.route('**/*',route=>{const url=route.request().url();if(!url.startsWith('http://127.0.0.1:3111')&&!url.startsWith('blob:')&&!url.startsWith('data:'))return route.abort();return route.continue();});
 page.on('request',r=>{if(['POST','PUT','PATCH','DELETE'].includes(r.method()))writes.push(r.url());});
 await page.goto('http://127.0.0.1:3111/probador?marco=nuevo-20&color=azul',{waitUntil:'networkidle',timeout:90000});
 const buttons=page.locator('.tryon-products button');if(await buttons.count()!==21)throw Error('Expected 21 models');
 if(!(await buttons.last().getAttribute('aria-pressed')==='true'))throw Error('Deep link wrong');
 await page.getByRole('button',{name:'Probar con modelo 1',exact:true}).click();
 await page.locator('.tryon-frame img').waitFor({timeout:15000});
 if(!(await page.locator('.tryon-frame img').getAttribute('src')).startsWith('blob:'))throw Error('No local overlay');
 await buttons.first().click();await page.locator('.tryon-frame img').waitFor({timeout:15000});
 if(!(await page.getByRole('link',{name:'Ver detalles de Nuevo 0'}).count()))throw Error('Wrong detail');
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Mobile overflow');
 if(writes.length)throw Error('Unexpected writes');
 console.log(JSON.stringify({checks:6,passed:6,models:21,deepLink:true,localOverlay:true,modelSwitch:true,noMobileOverflow:true,noWrites:true}));
}finally{await browser?.close();mock.close();}
