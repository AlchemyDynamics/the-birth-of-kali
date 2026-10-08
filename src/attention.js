import * as T from 'three';
export function nearestPathLight(wisps,position,heading){
 let best=null,distance=Infinity;
 for(const w of wisps){if(w.eaten||w.owner!==null)continue;const delta=w.position.clone().sub(position),d=delta.length();if(d<.01||d>70||delta.dot(heading)/d<.35)continue;if(d<distance){best=w;distance=d;}}
 return best;
}
export function nearerEye(eyeGroups,point){
 return eyeGroups.reduce((best,eye)=>eye.getWorldPosition(new T.Vector3()).distanceToSquared(point)<best.getWorldPosition(new T.Vector3()).distanceToSquared(point)?eye:best);
}
