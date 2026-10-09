import * as T from 'three';
// A small fixed particle pool leaves a world-space wake through each turn.
export function createBoostTrail(scene,texture){
 const count=360,positions=new Float32Array(count*3),colors=new Float32Array(count*3),life=new Float32Array(count);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('color',new T.BufferAttribute(colors,3));
 const points=new T.Points(geometry,new T.PointsMaterial({map:texture,size:.65,vertexColors:true,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));points.frustumCulled=false;scene.add(points);
 const flame=new T.Sprite(new T.SpriteMaterial({map:texture,color:0x388fff,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));scene.add(flame);
 const lamp=new T.PointLight(0x348aff,0,16,2);scene.add(lamp);
 const tail=new T.Vector3(),lastTail=new T.Vector3();let cursor=0,budget=0,flash=0,heat=0,wasActive=false;
 return {
  ignite(){flash=1;},
  update(dt,active,player,heading,time){
   flash=Math.max(0,flash-dt*2.5);heat=T.MathUtils.lerp(heat,active?1:0,1-Math.exp(-dt*(active?12:5)));
   tail.copy(player).addScaledVector(heading,-3.7);
   if(!wasActive)lastTail.copy(tail);
   for(let i=0;i<count;i++){life[i]=Math.max(0,life[i]-dt);const a=life[i]/1.8;colors.set([a*.08,a*.42,a],i*3);}
   if(active){budget+=dt*180;const n=Math.floor(budget);budget-=n;for(let j=0;j<n;j++){const i=cursor++%count,u=(j+1)/Math.max(1,n);life[i]=1.8;positions[i*3]=T.MathUtils.lerp(lastTail.x,tail.x,u)+(Math.random()-.5)*.24;positions[i*3+1]=T.MathUtils.lerp(lastTail.y,tail.y,u)+(Math.random()-.5)*.24;positions[i*3+2]=T.MathUtils.lerp(lastTail.z,tail.z,u)+(Math.random()-.5)*.24;colors.set([.1,.55,1],i*3);}}
   lastTail.copy(tail);wasActive=active;geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;
   flame.position.copy(tail);flame.scale.setScalar((1.5+flash*1.5+Math.sin(time*17)*.08)*heat);flame.material.opacity=heat*(.6+flash*.3);lamp.position.copy(tail);lamp.intensity=heat*(12+flash*12);
  }
 };
}
