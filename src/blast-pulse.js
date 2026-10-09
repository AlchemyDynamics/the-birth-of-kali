import * as T from 'three';
const smooth=(a,b,t)=>{const u=T.MathUtils.clamp((t-a)/(b-a),0,1);return u*u*(3-2*u);};
// A compression, ignition, and release, centered on the actual captured lights.
export function createBlastPulse(scene,texture){
 const lamp=new T.PointLight(0x348aff,0,24,2);scene.add(lamp);
 const geometry=new T.SphereGeometry(1,32,24);
 const bursts=Array.from({length:4},()=>{
  const group=new T.Group();group.visible=false;scene.add(group);
  const halo=new T.Sprite(new T.SpriteMaterial({map:texture,color:0x187aff,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));group.add(halo);
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{power:{value:0},time:{value:0}},
   vertexShader:'varying vec3 point;varying vec3 normalView;varying vec3 eye;void main(){point=position;vec4 p=modelViewMatrix*vec4(position,1.);normalView=normalize(normalMatrix*normal);eye=-p.xyz;gl_Position=projectionMatrix*p;}',
   fragmentShader:'uniform float power;uniform float time;varying vec3 point;varying vec3 normalView;varying vec3 eye;void main(){float face=max(0.,dot(normalize(normalView),normalize(eye)));float flow=.88+.12*sin(point.y*13.+sin(point.x*8.+time*9.)+time*12.);vec3 blue=mix(vec3(.025,.2,1.2),vec3(.08,.75,2.6),pow(face,3.));gl_FragColor=vec4(blue*flow,power*pow(face,.65)*.55);}'
  });
  const sphere=new T.Mesh(geometry,material);group.add(sphere);
  return {group,halo,sphere,stars:[],age:2,radius:0,extent:.5};
 });
 let cursor=0,fired=0;
 const latest=()=>bursts[(cursor+bursts.length-1)%bursts.length];
 const centroid=new T.Vector3();
 return {
  get fired(){return fired;},get active(){return bursts.filter(b=>b.group.visible).length;},
  get squeeze(){const b=latest();return b.group.visible?smooth(0,.16,b.age)*(1-smooth(.3,.7,b.age)):0;},
  get state(){const b=latest();return {age:b.age,center:b.group.position.toArray(),radius:b.radius,stars:b.stars.length,visible:b.group.visible};},
  fire(player,heading,wisps){
   // Let a previous puff disperse instead of stacking multiple spheres on cargo.
   for(const old of bursts)if(old.group.visible)old.age=Math.max(old.age,.85);
   const b=bursts[cursor++%bursts.length];fired++;b.age=0;b.radius=0;
   b.stars=wisps.filter(w=>w.owner!==null&&!w.eaten);
   centroid.set(0,0,0);for(const w of b.stars)centroid.add(w.position);
   if(b.stars.length)centroid.multiplyScalar(1/b.stars.length);else centroid.copy(player).addScaledVector(heading,-5.5);
   b.group.position.copy(centroid);b.group.visible=true;b.sphere.material.uniforms.power.value=0;b.halo.material.opacity=0;
  },
  update(dt){
   lamp.intensity=0;
   for(const b of bursts){if(!b.group.visible)continue;b.age+=dt;const t=b.age;
    if(t>=1.5){b.group.visible=false;b.stars=[];continue;}
    if(t<.85){
     const stars=b.stars.filter(w=>!w.eaten&&w.owner!==null);
     if(stars.length){centroid.set(0,0,0);for(const w of stars)centroid.add(w.position);centroid.multiplyScalar(1/stars.length);b.group.position.copy(centroid);
      b.extent=.45;for(const w of stars)b.extent=Math.max(b.extent,w.position.distanceTo(centroid));b.extent=Math.min(b.extent,3);
     }
    }
    const charge=smooth(0,.16,t),ignite=smooth(.12,.27,t),fade=1-smooth(.65,1.5,t);
    b.radius=(Math.max(.7,b.extent+.25)*(1-.25*charge)+ignite*(.55+Math.max(0,t-.27)*1.4));
    const power=(.12*charge+.88*ignite)*fade;
    b.sphere.scale.setScalar(b.radius);b.sphere.material.uniforms.power.value=power;b.sphere.material.uniforms.time.value=t;
    b.halo.scale.setScalar(b.radius*5);b.halo.material.opacity=.22*power;
    if(18*power>lamp.intensity){lamp.intensity=18*power;lamp.position.copy(b.group.position);}
   }
  }
 };
}
