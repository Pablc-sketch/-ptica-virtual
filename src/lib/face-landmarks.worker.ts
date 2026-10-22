import {FaceLandmarker,FilesetResolver} from '@mediapipe/tasks-vision';
let task:Promise<FaceLandmarker>|undefined;
self.onmessage=async(event:MessageEvent<{id:number;bitmap:ImageBitmap;origin:string}>)=>{
 const {id,bitmap,origin}=event.data;
 try {
  task??=FilesetResolver.forVisionTasks(`${origin}/vision`).then(files=>FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:`${origin}/vision/face_landmarker.task`,delegate:'CPU'},runningMode:'IMAGE',numFaces:2,outputFaceBlendshapes:false,outputFacialTransformationMatrixes:false}));
  const detector=await task,result=detector.detect(bitmap);
  self.postMessage({id,points:result.faceLandmarks.length===1?result.faceLandmarks[0]:null,error:result.faceLandmarks.length>1?'Solo puede aparecer una persona en la imagen.':result.faceLandmarks.length===0?'No encontramos un rostro. Mira de frente y mejora la luz.':null});
 }catch{task=undefined;self.postMessage({id,points:null,error:'No pudimos iniciar el ajuste facial. Puedes usar los controles manuales.'});}
 finally{bitmap.close();}
};
