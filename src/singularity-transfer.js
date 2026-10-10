import * as T from 'three';
import {smooth} from './simulation.js';
// The singularity stays parented to the mantle so the return follows her moving body.
export function createSingularityTransfer(kali){
 const goal=new T.Vector3();
 return {
  update(dt,charge,focalPoint,enabled){
   const position=kali.singularity.position;
   if(!enabled){position.set(0,0,0);return;}
   if(charge>0){goal.copy(focalPoint);kali.core.worldToLocal(goal);goal.multiplyScalar(smooth(0,.65,charge));}
   else goal.set(0,0,0);
   position.lerp(goal,1-Math.exp(-dt*(charge>0?14:6)));
   if(charge===0&&position.lengthSq()<1e-6)position.set(0,0,0);
  }
 };
}
