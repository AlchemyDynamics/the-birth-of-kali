import * as T from 'three';
const center=new T.Vector3(),edge=new T.Vector3(),right=new T.Vector3(),scale=new T.Vector3();
export function updateHorizonProjection(camera,hole,uniforms){
 // Projection must use this frame's camera, not the previous render's inverse matrix.
 camera.updateWorldMatrix(true,false);
 hole.updateWorldMatrix(true,false);
 hole.getWorldPosition(center);hole.getWorldScale(scale);
 right.setFromMatrixColumn(camera.matrixWorld,0);
 edge.copy(center).addScaledVector(right,.64*scale.x);
 center.project(camera);edge.project(camera);
 uniforms.center.value.set(center.x*.5+.5,center.y*.5+.5);
 uniforms.radius.value=Math.abs(edge.x-center.x)*.5*camera.aspect;
}
