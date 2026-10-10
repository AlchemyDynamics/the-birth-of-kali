import * as T from 'three';
const smooth=(a,b,t)=>{const u=T.MathUtils.clamp((t-a)/(b-a),0,1);return u*u*(3-2*u);};
// A bounded swell and contraction, following the captured lights for its entire life.
export function createBlastPulse(scene,texture){
 const lamp=new T.PointLight(0x348aff,0,24,2);scene.add(lamp);
 const geometry=new T.SphereGeometry(1,32,24);
 const bursts=Array.from({length:4},()=>{
  const group=new T.Group();group.visible=false;scene.add(group);
  const halo=new T.Sprite(new T.SpriteMaterial({map:texture,color:0x187aff,transparent:true,depthWrite:false,blending:T.AdditiveBlending}));group.add(halo);
  const material=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{power:{value:0},time:{value:0}},
   vertexShader:'varying vec3 point;varying vec3 normalView;varying vec3 eye;void main(){point=position;vec4 p=modelViewMatrix*vec4(position,1.);normalView=normalize(normalMatrix*normal);eye=-p.xyz;gl_Position=projectionMatrix*p;}',
   fragmentShader:'uniform float power;uniform float time;varying vec3 point;varying vec3 normalView;varying vec3 eye;void main(){float face=max(0.,dot(normalize(normalView),normalize(eye)));float flow=.88+.12*sin(point.y*13.+sin(point.x*8.+time*9.)+time*12.);vec3 blue=mix(vec3(.025,.2,.85),vec3(.08,.55,1.5),pow(face,3.));gl_FragColor=vec4(blue*flow,power*pow(face,.65)*.28);}'
  });
  const sphere=new T.Mesh(geometry,material);group.add(sphere);
  return {group,halo,sphere,stars:[],age:2,radius:0,peakRadius:.5};
 });
 let cursor=0,fired=0;
 const latest=()=>bursts[(cursor+bursts.length-1)%bursts.length];
 const centroid=new T.Vector3();
 return {
  get fired(){return fired;},get active(){return bursts.filter(b=>b.group.visible).length;},
  get squeeze(){const b=latest();return b.group.visible?smooth(0,.16,b.age)*(1-smooth(.3,.7,b.age)):0;},
  get state(){const b=latest();return {age:b.age,center:b.group.position.toArray(),radius:b.radius,stars:b.stars.length,visible:b.group.visible};},
  fire(player,heading,wisps){
   // A new ignition replaces the old pulse so overlapping jets never stack glare.
   for(const old of bursts){old.group.visible=false;old.stars=[];}
   const b=bursts[cursor++%bursts.length];fired++;b.age=0;b.radius=0;
   b.stars=wisps.filter(w=>w.owner!==null&&!w.eaten);
   centroid.set(0,0,0);for(const w of b.stars)centroid.add(w.position);
   if(b.stars.length)centroid.multiplyScalar(1/b.stars.length);else centroid.copy(player).addScaledVector(heading,-5.5);
   let extent=.45;for(const w of b.stars)extent=Math.max(extent,w.position.distanceTo(centroid));
   b.peakRadius=.9*T.MathUtils.clamp(extent+.2,.8,2.2);
   b.group.position.copy(centroid);b.group.visible=true;b.sphere.material.uniforms.power.value=0;b.halo.material.opacity=0;
  },
  update(dt){
   lamp.intensity=0;
   for(const b of bursts){if(!b.group.visible)continue;b.age+=dt;const t=b.age;
    if(t>=1.5){b.group.visible=false;b.radius=0;b.stars=[];continue;}
    const stars=b.stars.filter(w=>!w.eaten&&w.owner!==null);
    if(stars.length){centroid.set(0,0,0);for(const w of stars)centroid.add(w.position);centroid.multiplyScalar(1/stars.length);b.group.position.copy(centroid);}
    // Give the swell time to read, then keep the shrinking surface visible before fading.
    const swell=smooth(0,.45,t),contract=1-smooth(.52,1.4,t);
    b.radius=b.peakRadius*swell*contract;
    const power=smooth(0,.16,t)*(1-smooth(1,1.5,t));
    b.sphere.scale.setScalar(b.radius);b.sphere.material.uniforms.power.value=power;b.sphere.material.uniforms.time.value=t;
    b.halo.scale.setScalar(b.radius*2.6);b.halo.material.opacity=.10*power;
    if(10*power>lamp.intensity){lamp.intensity=10*power;lamp.position.copy(b.group.position);}
   }
  }
 };
}
