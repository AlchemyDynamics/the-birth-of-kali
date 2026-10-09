import * as T from 'three';
// Reuse four flares so rapid jets can overlap without accumulating objects.
export function createBlastPulse(scene,texture){
 const lamp=new T.PointLight(0x348aff,0,22,2);scene.add(lamp);
 const bursts=Array.from({length:4},()=>{
  const group=new T.Group();group.visible=false;scene.add(group);
  const halo=new T.Sprite(new T.SpriteMaterial({map:texture,color:0x185dff,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));group.add(halo);
  // HDR blue feeds the existing bloom pass without changing global bloom strength.
  const pulse=new T.Sprite(new T.SpriteMaterial({map:texture,color:new T.Color(.22,1.1,3),transparent:true,depthWrite:false,blending:T.AdditiveBlending}));group.add(pulse);
  return {group,pulse,halo,age:2};
 });
 let cursor=0,fired=0;
 return {
  get fired(){return fired;},get active(){return bursts.filter(b=>b.group.visible).length;},
  fire(player,heading){
   const b=bursts[cursor++%bursts.length];fired++;b.age=0;b.group.position.copy(player).addScaledVector(heading,-3.8);
   b.pulse.position.set(0,0,0);b.halo.position.set(0,0,0);b.group.visible=true;
  },
  update(dt,player,heading){
   lamp.intensity=0;
   for(const b of bursts){if(!b.group.visible)continue;b.age+=dt;const t=b.age;
    if(t>=1.45){b.group.visible=false;continue;}
    const flash=Math.exp(-Math.max(0,t-.18)*3.5);
    // Keep the flare behind her long enough to read during the roll.
    if(t<.7)b.pulse.position.copy(player).addScaledVector(heading,-3.8).sub(b.group.position);
    b.halo.position.copy(b.pulse.position);
    b.pulse.scale.setScalar(1.8+Math.min(t,.7)*3);b.pulse.material.opacity=.55*flash;
    b.halo.scale.setScalar(4.5+Math.min(t,.7)*4);b.halo.material.opacity=.24*flash;
    if(22*flash>lamp.intensity){lamp.intensity=22*flash;lamp.position.copy(b.group.position).add(b.pulse.position);}
   }
  }
 };
}
