export type FacePoint={x:number;y:number};
export type FacePlacement={x:number;y:number;width:number;rotation:number};
type Size={width:number;height:number};
/** Maps pointer/keyboard marks through object-fit:contain; rejects the letterboxed area. */
export function photoPoint(point:FacePoint,image:Size,stage:Size):FacePoint|null {
 if(![image.width,image.height,stage.width,stage.height].every(v=>Number.isFinite(v)&&v>0))return null;
 const scale=Math.min(stage.width/image.width,stage.height/image.height),w=image.width*scale,h=image.height*scale;
 const p={x:(point.x*stage.width-(stage.width-w)/2)/w,y:(point.y*stage.height-(stage.height-h)/2)/h};
 return Object.values(p).every(n=>Number.isFinite(n)&&n>=0&&n<=1)?p:null;
}
export function stagePoint(point:FacePoint,image:Size,stage:Size):FacePoint {
 const scale=Math.min(stage.width/image.width,stage.height/image.height),w=image.width*scale,h=image.height*scale;
 return {x:((stage.width-w)/2+point.x*w)/stage.width,y:((stage.height-h)/2+point.y*h)/stage.height};
}
/** Two eye marks give a visual scale only, never a measured PD or fitting height. */
export function eyePlacement(points:FacePoint[],image:Size,stage:Size):FacePlacement|null {
 if(points.length!==2||!points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1))return null;
 if(![image.width,image.height,stage.width,stage.height].every(v=>Number.isFinite(v)&&v>0))return null;
 const [a,b]=[...points].sort((a,b)=>a.x-b.x),dx=(b.x-a.x)*image.width,dy=(b.y-a.y)*image.height;
 if(dx<image.width*.04||dx>image.width*.6)return null;
 const rotation=Math.atan2(dy,dx)*180/Math.PI;if(Math.abs(rotation)>30)return null;
 const first=stagePoint(a,image,stage),second=stagePoint(b,image,stage);
 return {x:(first.x+second.x)*50,y:(first.y+second.y)*50,width:Math.min(100,Math.max(10,Math.hypot((second.x-first.x)*stage.width,(second.y-first.y)*stage.height)*2.35/stage.width*100)),rotation};
}
/** Coordinates for a contained image, in CSS percentages. This intentionally returns no millimetres. */
export function facePlacement(points:FacePoint[],image:{width:number;height:number},stage:{width:number;height:number}):FacePlacement|null {
 const a=points[468],b=points[473],l=points[234],r=points[454],bridge=points[6];
 if(!a||!b||!l||!r||!bridge||![image.width,image.height,stage.width,stage.height].every(v=>Number.isFinite(v)&&v>0)||![a,b,l,r,bridge].every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1))return null;
 const eyeDistance=Math.abs(a.x-b.x);if(eyeDistance<.04||eyeDistance>.55||Math.abs(bridge.x-(a.x+b.x)/2)>eyeDistance*.35)return null;
 const scale=Math.min(stage.width/image.width,stage.height/image.height),w=image.width*scale,h=image.height*scale;
 const first=a.x<b.x?a:b,second=a.x<b.x?b:a;
 const rotation=Math.atan2((second.y-first.y)*image.height,(second.x-first.x)*image.width)*180/Math.PI;
 if(Math.abs(rotation)>25)return null;
 // Cheek landmarks can underestimate the front of the frame. Use both eye
 // spacing and face width; this remains a visual fit, not a physical measurement.
 const pupilSpan=Math.hypot((second.x-first.x)*w,(second.y-first.y)*h);
 const frameWidth=Math.max(Math.abs(r.x-l.x)*w*1.08,pupilSpan*2.35);
 return {x:((stage.width-w)/2+(a.x+b.x)/2*w)/stage.width*100,y:((stage.height-h)/2+(a.y+b.y)/2*h)/stage.height*100,width:Math.min(100,Math.max(10,frameWidth/stage.width*100)),rotation};
}

