/** Local preparation of a selected product photograph for the face overlay. */
export function prepareTryOnImage(image:HTMLImageElement,optical:boolean,slug:string):string{
 const canvas=document.createElement("canvas"),scale=Math.min(1,900/image.naturalWidth);
 canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);
 const ctx=canvas.getContext("2d",{willReadFrequently:true});if(!ctx)throw Error("canvas_unavailable");
 ctx.drawImage(image,0,0,canvas.width,canvas.height);
 const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),{data,width,height}=pixels;
 let left=width,right=0,top=height,bottom=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=(y*width+x)*4,min=Math.min(data[i],data[i+1],data[i+2]),alpha=Math.max(0,Math.min(1,(253-min)/68));
   data[i+3]=Math.round(data[i+3]*alpha);
   if(alpha>0&&alpha<1)for(let c=0;c<3;c++)data[i+c]=Math.max(0,255-(255-data[i+c])/alpha);
   if(alpha>.45){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 }
 if(right<=left||bottom<=top)throw Error("frame_not_found");
 ctx.putImageData(pixels,0,0);
 // The contours remove folded arms inside the clear lenses of the restored photos.
 if(optical){
  const w=right-left,h=bottom-top;
  const contours:Record<string,number[][]>={
   kensington:[[.062,.17],[.14,.10],[.32,.11],[.433,.23],[.451,.38],[.426,.77],[.35,.92],[.145,.91],[.082,.78]],
   manhattan:[[.08,.24],[.16,.13],[.31,.14],[.422,.28],[.44,.42],[.407,.76],[.31,.94],[.16,.91],[.09,.72]],
   oslo:[[.075,.18],[.16,.12],[.32,.14],[.426,.30],[.437,.46],[.40,.81],[.33,.93],[.15,.91],[.097,.76]],
   bauhaus:[[.055,.18],[.14,.035],[.32,.04],[.444,.26],[.443,.51],[.37,.94],[.17,.94],[.07,.78]],
   perla:[[.08,.24],[.19,.15],[.34,.26],[.44,.39],[.441,.55],[.37,.85],[.21,.94],[.12,.79]]
  };
  const polygon=contours[slug.replace("optico-","")];
  if(polygon){ctx.globalCompositeOperation="destination-out";for(const mirror of[false,true]){ctx.beginPath();polygon.forEach(([x,y],index)=>{const px=left+(mirror?1-x:x)*w,py=top+y*h;if(index===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);});ctx.closePath();ctx.fill();}ctx.globalCompositeOperation="source-over";}
 }
 const out=document.createElement("canvas");out.width=right-left+5;out.height=bottom-top+5;
 out.getContext("2d")!.drawImage(canvas,left-2,top-2,out.width,out.height,0,0,out.width,out.height);
 return out.toDataURL("image/png");
}
