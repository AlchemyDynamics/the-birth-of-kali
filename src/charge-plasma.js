import * as T from 'three';
// Small, pooled electrical filaments span the tentacle basket, never the screen.
export function createChargePlasma(scene,texture){
 const group=new T.Group();scene.add(group);group.visible=false;
 const halo=new T.Sprite(new T.SpriteMaterial({map:texture,color:0x8844ff,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));group.add(halo);
 const coreMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},charge:{value:0},burst:{value:0}},
  vertexShader: 'varying vec3 p;varying vec3 n;varying vec3 eye;uniform float time;uniform float charge;void main(){p=position;float ripple=sin(position.x*9.+time*17.)*sin(position.y*11.-time*13.);vec3 v=position*(1.+ripple*.035*charge);vec4 view=modelViewMatrix*vec4(v,1.);n=normalize(normalMatrix*normal);eye=-view.xyz;gl_Position=projectionMatrix*view;}',
  fragmentShader: 'varying vec3 p;varying vec3 n;varying vec3 eye;uniform float time;uniform float charge;uniform float burst;void main(){float edge=pow(1.-max(0.,dot(normalize(n),normalize(eye))),2.);float flow=sin(p.x*11.+sin(p.z*8.-time*4.)+p.y*7.+time*5.);float veins=smoothstep(.91,.995,flow)*(.3+.7*charge);float surge=.8+.2*sin(time*23.+p.y*19.);vec3 dark=mix(vec3(.14,.018,.32),vec3(.028,.002,.075),charge);vec3 violet=vec3(.45,.08,1.1);vec3 color=dark+violet*(edge*.7+veins*surge)+vec3(.55,.25,1.2)*burst;gl_FragColor=vec4(color,charge>0.0 ? 0.6+0.26*charge : 0.8*burst);}'
 });
 const core=new T.Mesh(new T.SphereGeometry(1,32,24),coreMaterial);group.add(core);
 const data=new Float32Array(8*12*2*3),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(data,3).setUsage(T.DynamicDrawUsage));
 const arcs=new T.LineSegments(geometry,new T.LineBasicMaterial({color:new T.Color(.55,.18,1.8),transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));arcs.frustumCulled=false;scene.add(arcs);arcs.visible=false;
 const lamp=new T.PointLight(0x8744ff,0,9,2);scene.add(lamp);
 const basket=new T.Vector3(),center=new T.Vector3(),start=new T.Vector3(),point=new T.Vector3(),previous=new T.Vector3();
 let flash=0,launchPower=0;
 return {
  get focalPoint(){return center;},
  get radius(){return group.visible?core.scale.y:0;},
  fire(power){launchPower=power;flash=.4;},
  update(dt,time,charge,kali,wisps){
   flash=Math.max(0,flash-dt);const burst=flash/.4,visible=charge>0||burst>0;group.visible=arcs.visible=visible;lamp.intensity=0;if(!visible)return;
   center.set(0,0,0);let count=0;for(const w of wisps)if(w.owner!==null&&!w.eaten){center.add(w.position);count++;}
   if(count)center.multiplyScalar(1/count);else center.copy(kali.group.position);
   // Draw energy inward from the held stars to a compact point inside the arms.
   kali.group.localToWorld(basket.set(0,-1.9,0));center.lerp(basket,.55);
   group.position.copy(center);lamp.position.copy(center);
   const compression=charge*charge*(3-2*charge),beat=1+compression*(.035*Math.sin(time*23)+.025*Math.sin(time*37)),rawRadius=charge>0?(1.12-.69*compression)*beat:(.25+Math.sin(Math.PI*burst)*.65)*(1+.12*launchPower);
   const radius=Math.max(rawRadius,kali.hole.visible?.64*kali.hole.scale.x*1.25:0);
   core.scale.set(radius*(1+.025*compression*Math.sin(time*29)),radius,radius*(1-.025*compression*Math.sin(time*29)));
   core.rotation.y=time*(.4+charge);coreMaterial.uniforms.time.value=time;coreMaterial.uniforms.charge.value=charge;coreMaterial.uniforms.burst.value=burst;
   halo.scale.setScalar(radius*2.8);halo.material.color.setHex(charge>.7?0x6622d8:0x8844ff);halo.material.opacity=charge>0?.2-.08*compression:.35*burst;
   lamp.intensity=charge>0?2+4*charge:12*burst;
   arcs.material.opacity=charge>0?.25+.65*charge:.7*burst;const flicker=Math.floor(time*(12+charge*24));
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
