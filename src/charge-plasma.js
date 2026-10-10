import * as T from 'three';
// Small, pooled electrical filaments span the tentacle basket, never the screen.
export function createChargePlasma(scene,texture){
 const group=new T.Group();scene.add(group);group.visible=false;
 const halo=new T.Sprite(new T.SpriteMaterial({map:texture,color:0x8844ff,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));group.add(halo);
 const core=new T.Mesh(new T.SphereGeometry(1,24,16),new T.MeshBasicMaterial({color:0x7744ff,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));group.add(core);
 const data=new Float32Array(8*12*2*3),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(data,3).setUsage(T.DynamicDrawUsage));
 const arcs=new T.LineSegments(geometry,new T.LineBasicMaterial({color:new T.Color(.55,.18,1.8),transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));arcs.frustumCulled=false;scene.add(arcs);arcs.visible=false;
 const lamp=new T.PointLight(0x8744ff,0,9,2);scene.add(lamp);
 const basket=new T.Vector3(),center=new T.Vector3(),start=new T.Vector3(),point=new T.Vector3(),previous=new T.Vector3();
 let flash=0,launchPower=0;
 return {
  fire(power){launchPower=power;flash=.65;},
  update(dt,time,charge,kali,wisps){
   flash=Math.max(0,flash-dt);const burst=flash/.65,visible=charge>0||burst>0;group.visible=arcs.visible=visible;lamp.intensity=0;if(!visible)return;
   center.set(0,0,0);let count=0;for(const w of wisps)if(w.owner!==null&&!w.eaten){center.add(w.position);count++;}
   if(count)center.multiplyScalar(1/count);else center.copy(kali.group.position);
   // Draw energy inward from the held stars to a compact point inside the arms.
   kali.group.localToWorld(basket.set(0,-1.9,0));center.lerp(basket,.55);
   group.position.copy(center);lamp.position.copy(center);
   const beat=.92+.08*Math.sin(time*(9+charge*9)),radius=charge>0?(1.05-.48*charge)*beat:(.38+Math.sin(Math.PI*burst)*.7)*(1+.15*launchPower);
   core.scale.setScalar(radius);core.material.opacity=charge>0?.07+.10*charge:.24*burst;
   halo.scale.setScalar(radius*3.2);halo.material.opacity=charge>0?.12+.18*charge:.4*burst;
   lamp.intensity=charge>0?2+7*charge:12*burst;
   arcs.material.opacity=charge>0?.25+.65*charge:.7*burst;const flicker=Math.floor(time*(14+charge*12));
   for(let a=0;a<8;a++){
    kali.group.localToWorld(start.copy(kali.arms[a].points[34]));start.sub(center).clampLength(0,2.1).add(center);previous.copy(start);
    for(let j=1;j<=12;j++){
     const u=j/12,envelope=Math.sin(Math.PI*u),seed=a*17+j*23+flicker*7;
     point.copy(start).lerp(center,u);
     point.x+=Math.sin(seed*1.7)*envelope*(.07+.16*charge);point.y+=Math.sin(seed*2.3)*envelope*(.07+.16*charge);point.z+=Math.cos(seed*1.3)*envelope*(.07+.16*charge);
     const offset=(a*12+j-1)*6;previous.toArray(data,offset);point.toArray(data,offset+3);previous.copy(point);
    }
   }
   geometry.attributes.position.needsUpdate=true;
  }
 };
}
