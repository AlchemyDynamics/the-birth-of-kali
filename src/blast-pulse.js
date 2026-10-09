import * as T from 'three';
// Reuse four bursts so rapid jets can overlap without accumulating objects.
export function createBlastPulse(scene,texture){
 const ringGeometry=new T.RingGeometry(.82,1.18,128);
 function waveMaterial(color){return new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
  uniforms:{color:{value:color},alpha:{value:0},age:{value:0}},
  vertexShader:'varying vec2 p;void main(){p=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform vec3 color;uniform float alpha;uniform float age;varying vec2 p;void main(){float r=length(p);float ripple=.012*sin(atan(p.y,p.x)*13.-age*16.);float band=exp(-pow((r-1.+ripple)/.055,2.));gl_FragColor=vec4(color,alpha*band);}'
 });}
 const lamp=new T.PointLight(0x348aff,0,22,2);scene.add(lamp);
 const bursts=Array.from({length:4},()=>{
  const group=new T.Group();group.visible=false;scene.add(group);
  const pulse=new T.Sprite(new T.SpriteMaterial({map:texture,color:0x248aff,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));group.add(pulse);
  const ring=new T.Mesh(ringGeometry,waveMaterial(new T.Color(.12,.65,1.8)));group.add(ring);
  const echo=new T.Mesh(ringGeometry,waveMaterial(new T.Color(.05,.22,1.2)));group.add(echo);
  return {group,pulse,ring,echo,age:2};
 });
 let cursor=0,fired=0;const axis=new T.Vector3(0,0,1);
 return {
  get fired(){return fired;},get active(){return bursts.filter(b=>b.group.visible).length;},
  fire(player,heading){
   const b=bursts[cursor++%bursts.length];fired++;b.age=0;b.group.position.copy(player).addScaledVector(heading,-3.8);
   b.pulse.position.set(0,0,0);
   b.ring.quaternion.setFromUnitVectors(axis,heading);b.echo.quaternion.copy(b.ring.quaternion);b.group.visible=true;
  },
  update(dt,player,heading){
   lamp.intensity=0;
   for(const b of bursts){if(!b.group.visible)continue;b.age+=dt;const t=b.age;
    if(t>=1.45){b.group.visible=false;continue;}
    const flash=Math.exp(-Math.max(0,t-.18)*3.5),fade=Math.pow(1-t/1.45,2);
    // The flash rides behind her through the roll, while its shockwave remains
    // at the emission point. The following camera cannot immediately pass it.
    if(t<.7)b.pulse.position.copy(player).addScaledVector(heading,-3.8).sub(b.group.position);
    b.pulse.scale.setScalar(1.8+Math.min(t,.7)*3);b.pulse.material.opacity=.7*flash;
    b.ring.scale.setScalar(.65+t*5.5);b.ring.material.uniforms.alpha.value=.65*fade;b.ring.material.uniforms.age.value=t;
    b.echo.scale.setScalar(.45+t*3.8);b.echo.material.uniforms.alpha.value=.35*fade;b.echo.material.uniforms.age.value=t;
    if(22*flash>lamp.intensity){lamp.intensity=22*flash;lamp.position.copy(b.group.position).add(b.pulse.position);}
   }
  }
 };
}
