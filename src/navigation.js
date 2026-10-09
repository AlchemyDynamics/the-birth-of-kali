import * as T from 'three';
import {discoveryCount,clusterCount} from './progression.js';
import {JET_DISTANCE,REACH} from './simulation.js';

export function jetAim(ray,player,wisps){
 // Aim beyond the player even when the camera is still catching up to a jet.
 const playerDepth=new T.Vector3().subVectors(player,ray.origin).dot(ray.direction);
 const target=ray.at(Math.max(0,playerDepth)+JET_DISTANCE*4,new T.Vector3());
 let nearest=Infinity;
 for(const w of wisps){
  // Cargo and lights already within reach must never pull our aim back into Kali.
  if(w.eaten||w.owner!==null||w.position.distanceTo(player)<=REACH)continue;
  if(new T.Vector3().subVectors(w.position,player).dot(ray.direction)<=0)continue;
  const hit=ray.intersectSphere(new T.Sphere(w.position,.9),new T.Vector3());
  if(hit){const distance=hit.distanceTo(ray.origin);if(distance<nearest){nearest=distance;target.copy(w.position);}}
 }
 return target.sub(player).normalize();
}

export function travelLightPositions(player,heading,random=Math.random,food=0){
 const right=new T.Vector3().crossVectors(heading,new T.Vector3(0,1,0));
 if(right.lengthSq()<.001)right.set(1,0,0);
 right.normalize();const up=new T.Vector3().crossVectors(right,heading).normalize(),angle=random()*Math.PI*2;
 const count=discoveryCount(food)||clusterCount(random),positions=[];
 if(food>=2){
  // Once the nebula forms, every new set is a single reachable chord cluster.
  // Keep the whole set outside the straight jet corridor so it needs steering.
  const distance=JET_DISTANCE*(3.2+random()*1.6),offset=REACH+6+random()*3;
  const center=player.clone().addScaledVector(heading,Math.sqrt(distance*distance-offset*offset)).addScaledVector(right,Math.cos(angle)*offset).addScaledVector(up,Math.sin(angle)*offset);
  return lightClusterPositions(center,right,up,count,random);
 }
 // Occasionally offer one along the route; all companions require steering.
 if(random()<.4)positions.push(player.clone().addScaledVector(heading,JET_DISTANCE*(3+random()*2)));
 let group=0;
 while(positions.length<count){
  // Previously two thirds of group choices were clusters; increase that chance by 15%.
  const groupSize=random()<(2/3)*1.15?2+Math.floor(random()*3):1;
  const size=Math.min(count-positions.length,groupSize);
  const distance=JET_DISTANCE*(3.2+random()*1.6),offset=REACH+6+random()*3,a=angle+group++*2.39996;
  const center=player.clone().addScaledVector(heading,Math.sqrt(distance*distance-offset*offset)).addScaledVector(right,Math.cos(a)*offset).addScaledVector(up,Math.sin(a)*offset);
  positions.push(...lightClusterPositions(center,right,up,size,random));
 }
 return positions;
}

export function lightClusterPositions(center,right,up,count=3,random=Math.random){
 const phase=random()*Math.PI*2;
 return Array.from({length:count},(_,i)=>{const a=phase+i*Math.PI*2/count,r=1.8+random()*.75;return center.clone().addScaledVector(right,Math.cos(a)*r).addScaledVector(up,Math.sin(a)*r);});
}
