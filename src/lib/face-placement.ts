export type FacePoint={x:number;y:number};
export type FacePlacement={x:number;y:number;width:number;rotation:number};
/** Coordinates for a contained image, in CSS percentages. This intentionally returns no millimetres. */
export function facePlacement(points:FacePoint[],image:{width:number;height:number},stage:{width:number;height:number}):FacePlacement|null {
 const a=points[468],b=points[473],l=points[234],r=points[454],bridge=points[6];
 if(!a||!b||!l||!r||!bridge||![image.width,image.height,stage.width,stage.height].every(v=>Number.isFinite(v)&&v>0)||![a,b,l,r,bridge].every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1))return null;
 const eyeDistance=Math.abs(a.x-b.x);if(eyeDistance<.04||eyeDistance>.55||Math.abs(bridge.x-(a.x+b.x)/2)>eyeDistance*.35)return null;
 const scale=Math.min(stage.width/image.width,stage.height/image.height),w=image.width*scale,h=image.height*scale;
 const first=a.x<b.x?a:b,second=a.x<b.x?b:a;
 const rotation=Math.atan2((second.y-first.y)*image.height,(second.x-first.x)*image.width)*180/Math.PI;
 if(Math.abs(rotation)>25)return null;
 const frameWidth=Math.abs(r.x-l.x)*w*1.04;
 return {x:((stage.width-w)/2+(a.x+b.x)/2*w)/stage.width*100,y:((stage.height-h)/2+(a.y+b.y)/2*h)/stage.height*100,width:Math.min(100,Math.max(10,frameWidth/stage.width*100)),rotation};
}
