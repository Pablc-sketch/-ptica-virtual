import {it,expect} from 'vitest';
import {facePlacement} from '../src/lib/face-placement';
const points=Array.from({length:478},()=>({x:.5,y:.5}));points[468]={x:.4,y:.4};points[473]={x:.6,y:.4};points[234]={x:.25,y:.5};points[454]={x:.75,y:.5};
it('ajusta en píxeles, respeta bandas de una imagen contenida y no produce DP/altura',()=>{expect(facePlacement(points,{width:1000,height:1000},{width:400,height:600})).toEqual({x:50,y:43.333333333333336,width:52,rotation:0});});
it('rechaza perfiles, puntos inválidos e imágenes vacías',()=>{expect(facePlacement([],{width:1,height:1},{width:1,height:1})).toBeNull();const profile=points.map(p=>({...p}));profile[6].x=.8;expect(facePlacement(profile,{width:1,height:1},{width:1,height:1})).toBeNull();expect(facePlacement(points,{width:0,height:1},{width:1,height:1})).toBeNull();});
