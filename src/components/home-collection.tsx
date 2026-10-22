import {getPublishedProducts} from '@/lib/catalog';
import {FrameExplorer} from './frame-explorer';
export async function HomeCollection(){
 let products;
 try{products=await getPublishedProducts();}
 catch{return <div className="frame-explorer"><p role="alert">No pudimos cargar los marcos. Puedes volver a consultar el catálogo.</p></div>;}
 return <FrameExplorer frames={products.slice(0,3).map(p=>({name:p.name,slug:p.slug,shape:p.frameShape??'',image:p.images[0].url,sample:!!p.isSample}))}/>;
}
