// Non-destructive approximation for catalog frontals on a white background.
// Operates only on product pixels; never receives the customer's face photo.
export function cutoutWhite(data:Uint8ClampedArray,width:number,height:number){
 if(width<1||height<1||data.length!==width*height*4)throw Error('invalid_image');
 let left=width,top=height,right=-1,bottom=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,min=Math.min(data[i],data[i+1],data[i+2]),max=Math.max(data[i],data[i+1],data[i+2]);
  // Fade neutral near-white background/lenses; retain saturated colored acetates.
  if(max-min<24&&min>210)data[i+3]=Math.round(data[i+3]*Math.max(0,(245-min)/35));
  if(data[i+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 }
 if(right-left<width*.1||bottom-top<height*.03)throw Error('no_frame');
 return {x:left,y:top,width:right-left+1,height:bottom-top+1};
}
