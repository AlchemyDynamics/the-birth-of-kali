import * as T from 'three';
const center=new T.Vector3(),edge=new T.Vector3(),right=new T.Vector3(),scale=new T.Vector3(),view=new T.Vector3(),world=new T.Vector3();
export function projectWarpSphere(camera,worldCenter,worldRadius,screenCenter){
 camera.updateWorldMatrix(true,false);
 view.copy(worldCenter).applyMatrix4(camera.matrixWorldInverse);
 // Disable the field behind or intersecting the camera's near plane.
 if(view.z>=-Math.max(camera.near,worldRadius)){screenCenter.set(.5,.5);return 0;}
 right.setFromMatrixColumn(camera.matrixWorld,0);
 edge.copy(worldCenter).addScaledVector(right,worldRadius).project(camera);
 center.copy(worldCenter).project(camera);
 screenCenter.set(center.x*.5+.5,center.y*.5+.5);
 return Math.min(.35,Math.abs(edge.x-center.x)*.5*camera.aspect);
}
export function updateHorizonProjection(camera,hole,uniforms){
 hole.updateWorldMatrix(true,false);hole.getWorldPosition(world);hole.getWorldScale(scale);
 uniforms.radius.value=projectWarpSphere(camera,world,.64*scale.x,uniforms.center.value);
 if(!uniforms.radius.value)uniforms.amount.value=0;
}
