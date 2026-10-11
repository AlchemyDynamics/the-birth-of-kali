import {IGNITION,COLLAPSE} from './simulation.js';
import * as T from 'three';
import {smooth,GRAB_REACH_TIME} from './simulation.js';
import {createSkinMaps} from './skin.js';
import {createIrisTexture,createSuckerGeometry} from './anatomy-detail.js';
import {createOrganicEye} from './organic-eye.js';
import {createPapillaMaterial} from './papillae.js';
const TAU=Math.PI*2, UP=new T.Vector3(0,1,0), Z=new T.Vector3(0,0,1);
const v=new T.Vector3(),tangent=new T.Vector3(),side=new T.Vector3(),normal=new T.Vector3(),dummy=new T.Object3D();
function mantleSurface(out,x,y,z,time,pressure,relax=0){
 const anchor=smooth(-.8,.15,y),breath=1+.022*Math.sin(time*1.5+y*2)+pressure*anchor;
 const ripple=1+.018*Math.sin(y*13+time*1.7)*Math.cos(x*7+z*5);
 out.set(x*(1.25+.14*y)*breath*ripple*(1+.10*relax*anchor),-1.57+(y+1)*1.4*(1-pressure*.22*anchor),z*(1.08+.12*y)*breath*ripple);
 // The neck stays seated in the crown; the soft sac folds back above it.
 const bend=relax*smooth(-.9,.65,y)*(-.9+.035*Math.sin(time*.8+y*1.4));
 const height=out.y+1.05,depth=out.z;
 out.y=-1.05+height*Math.cos(bend)-depth*Math.sin(bend);
 out.z=height*Math.sin(bend)+depth*Math.cos(bend);
 return out;
}
export function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(205,247,255,1)');g.addColorStop(.07,'rgba(115,210,255,.95)');g.addColorStop(.22,'rgba(25,116,255,.35)');g.addColorStop(.55,'rgba(10,55,180,.08)');g.addColorStop(1,'rgba(0,15,80,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new T.CanvasTexture(c);}
export function createKali(){
 const group=new T.Group();
 const maps=createSkinMaps();
 const baseSkin=new T.MeshPhysicalMaterial({color:0x283451,roughness:.8,metalness:0,clearcoat:.65,clearcoatRoughness:.28,...maps,bumpScale:.055});
 const papillae=createPapillaMaterial(baseSkin),skin=papillae.material;baseSkin.dispose();
 const innerGlow={value:.35},armSkin=skin.clone();
 armSkin.onBeforeCompile=shader=>{
   skin.onBeforeCompile(shader);shader.uniforms.innerGlow=innerGlow;
   shader.vertexShader='varying vec3 armSurfaceNormal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n armSurfaceNormal=normal;');
   shader.fragmentShader='uniform float innerGlow;varying vec3 armSurfaceNormal;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',`float inward=smoothstep(-.1,.55,-dot(normalize(armSurfaceNormal.xz+vec2(.00001)),normalize(papillaPosition.xz+vec2(.00001))));
   totalEmissiveRadiance*=mix(1.,innerGlow,inward);
   #include <lights_physical_fragment>`);
 };
 armSkin.customProgramCacheKey=()=> 'soft-inner-arm-glow-v1';
 const mantleSkin=skin.clone();mantleSkin.onBeforeCompile=skin.onBeforeCompile;mantleSkin.customProgramCacheKey=skin.customProgramCacheKey;mantleSkin.transparent=true;mantleSkin.opacity=.97;mantleSkin.depthWrite=false;
 const mantleGeo=new T.SphereGeometry(1,64,48);const base=mantleGeo.attributes.position.array.slice();
 const mantle=new T.Mesh(mantleGeo,mantleSkin);mantle.position.y=1.45;mantle.renderOrder=3;group.add(mantle);
 // A broad muscular crown overlaps both the anchored mantle neck and all arm roots.
 const collar=new T.Mesh(new T.SphereGeometry(1,64,40),skin);collar.scale.set(1.23,.84,1.19);collar.position.y=.17;group.add(collar);
 const mouth=new T.Mesh(new T.TorusGeometry(.29,.09,12,40),skin);mouth.rotation.x=Math.PI/2;mouth.position.y=-.65;group.add(mouth);
 const beak=new T.Group();beak.position.y=-.64;group.add(beak);
 const horn=new T.MeshPhysicalMaterial({color:0x030405,roughness:.16,clearcoat:1,clearcoatRoughness:.09,metalness:0});
 const profile=new T.Shape();profile.moveTo(-.19,.06);profile.quadraticCurveTo(-.27,-.16,-.04,-.33);profile.quadraticCurveTo(.19,-.53,.27,-.44);profile.quadraticCurveTo(.10,-.35,.14,-.20);profile.quadraticCurveTo(.24,-.04,.12,.06);profile.closePath();
 const jawGeo=new T.ExtrudeGeometry(profile,{depth:.24,bevelEnabled:true,bevelSegments:8,steps:1,bevelSize:.045,bevelThickness:.045,curveSegments:32});jawGeo.translate(0,0,-.12);jawGeo.rotateY(Math.PI/2);
 const jawVertices=jawGeo.attributes.position;for(let i=0;i<jawVertices.count;i++){const taper=.15+.85*(1-smooth(.05,.5,-jawVertices.getY(i)));jawVertices.setX(i,jawVertices.getX(i)*taper);}jawVertices.needsUpdate=true;jawGeo.computeVertexNormals();
 // Extrusion duplicates vertices at triangle edges; share their shading normals
 // so highlights flow continuously over the rounded horn and hooked tip.
 const jawNormals=jawGeo.attributes.normal,normalSums=new Map(),vertexKeys=[];
 for(let i=0;i<jawVertices.count;i++){const key=[jawVertices.getX(i),jawVertices.getY(i),jawVertices.getZ(i)].map(n=>Math.round(n*1e5)).join(',');vertexKeys.push(key);if(!normalSums.has(key))normalSums.set(key,new T.Vector3());normalSums.get(key).add(new T.Vector3().fromBufferAttribute(jawNormals,i));}
 for(const n of normalSums.values())n.normalize();
 for(let i=0;i<jawVertices.count;i++){const n=normalSums.get(vertexKeys[i]);jawNormals.setXYZ(i,n.x,n.y,n.z);}jawNormals.needsUpdate=true;
 const jaws=[];for(const sign of [-1,1]){const hinge=new T.Group();hinge.position.z=sign*.12;const jaw=new T.Mesh(jawGeo,horn);jaw.rotation.y=sign===1?0:Math.PI;jaw.scale.setScalar(sign===1?1:.85);hinge.add(jaw);beak.add(hinge);jaws.push(hinge);}
 let previousFood=0,chewTime=0;
 const eyes=[],eyeGroups=[],organicEyes=[],irisTexture=createIrisTexture();
 for(const s of [-1,1]){
   const eyeGroup=new T.Group();eyeGroup.position.set(s*1.08,.3,.02);eyeGroup.rotation.y=s*Math.PI/2;group.add(eyeGroup);eyeGroups.push(eyeGroup);
   const organic=createOrganicEye(skin,irisTexture,s<0?.25:0,papillae.material);eyeGroup.add(organic.group);eyes.push(organic.iris);organicEyes.push(organic);
 }
 const cupMaterial=new T.MeshPhysicalMaterial({color:0x50628e,roughness:.55,clearcoat:.45,clearcoatRoughness:.3,emissive:0x172b80,emissiveIntensity:0});
 const suckerGeometry=createSuckerGeometry();
 const arms=[];const rings=49,sides=20;
 for(let a=0;a<8;a++){
   const positions=new Float32Array(rings*(sides+1)*3),uv=new Float32Array(rings*(sides+1)*2),indices=[];
   for(let j=0;j<rings;j++)for(let k=0;k<=sides;k++){let i=j*(sides+1)+k;uv[i*2]=k/sides;uv[i*2+1]=j/(rings-1);if(j<rings-1&&k<sides){indices.push(i,i+sides+1,i+1,i+1,i+sides+1,i+sides+2);}}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geo.setAttribute('uv',new T.BufferAttribute(uv,2));geo.setIndex(indices);
   const mesh=new T.Mesh(geo,armSkin);mesh.frustumCulled=false;group.add(mesh);
   const cups=new T.InstancedMesh(suckerGeometry,cupMaterial,40);cups.instanceMatrix.setUsage(T.DynamicDrawUsage);cups.frustumCulled=false;group.add(cups);
   arms.push({index:a,angle:a*TAU/8+Math.PI/8,mesh,cups,points:Array.from({length:rings},()=>new T.Vector3()),frames:Array.from({length:rings},()=>({side:new T.Vector3(),normal:new T.Vector3(),radius:0})),target:null,elapsed:0,tip:new T.Vector3(),reach:new T.Vector3(),capture:new T.Vector3()});
 }
 const webGeo=new T.BufferGeometry();webGeo.setAttribute('position',new T.BufferAttribute(new Float32Array(8*12*6*3),3));webGeo.setAttribute('uv',new T.BufferAttribute(new Float32Array(8*12*6*2),2));const web=new T.Mesh(webGeo,skin);web.material=skin.clone();web.material.onBeforeCompile=skin.onBeforeCompile;web.material.customProgramCacheKey=skin.customProgramCacheKey;web.material.side=T.DoubleSide;web.frustumCulled=false;group.add(web);
 const skinLight=new T.PointLight(0x248aff,0,16,1.25);skinLight.position.set(0,1,1);group.add(skinLight);
 const core=new T.Group();core.position.y=1.5;group.add(core);
 // Ray-marched gas, confined to an ellipsoid inside the mantle.
 const cloudMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.BackSide,uniforms:{time:{value:0},opacity:{value:0},eye:{value:new T.Vector3()}},vertexShader:`varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
 varying vec3 p;uniform vec3 eye;uniform float time;uniform float opacity;
 float hash(vec3 v){return fract(sin(dot(v,vec3(127.1,311.7,74.7)))*43758.5453);}
 float noise(vec3 v){vec3 i=floor(v),f=fract(v);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float fbm(vec3 q){return noise(q)*.58+noise(q*2.07+4.1)*.28+noise(q*4.13-2.7)*.14;}
 void main(){vec3 rd=normalize(p-eye),radii=vec3(.87,1.18,.72),o=eye/radii,d=rd/radii;float a=dot(d,d),b=dot(o,d),c=dot(o,o)-1.,h=b*b-a*c;if(h<0.)discard;float nearT=max(0.,(-b-sqrt(h))/a),farT=(-b+sqrt(h))/a;if(farT<=nearT)discard;float stepT=(farT-nearT)/40.,alpha=0.;vec3 col=vec3(0.);for(int i=0;i<40;i++){vec3 q=eye+rd*(nearT+(float(i)+.5)*stepT);float envelope=1.-smoothstep(.45,1.,length(q/radii));vec3 warp=q*3.6+vec3(sin(q.y*3.+time*.45)*.5,time*.17,cos(q.x*3.-time*.35)*.5);float gas=fbm(warp+fbm(warp*.7+time*.08)*1.4);float density=smoothstep(.29,.72,gas)*envelope;float strand=pow(max(0.,1.-abs(gas-.5)*5.),3.);float absorb=1.-exp(-density*stepT*3.8);vec3 light=mix(vec3(.015,.10,.55),vec3(.12,.65,1.5),strand);col+=(1.-alpha)*absorb*light*2.1;alpha+=(1.-alpha)*absorb;}gl_FragColor=vec4(col/max(alpha,.001),alpha*opacity);}`});
 const nebula=new T.Mesh(new T.BoxGeometry(2,2.6,1.8),cloudMat);nebula.renderOrder=2;core.add(nebula);
 nebula.onBeforeRender=(_r,_s,camera)=>{cloudMat.uniforms.eye.value.copy(camera.position);nebula.worldToLocal(cloudMat.uniforms.eye.value);};
 const starMaterial=new T.ShaderMaterial({uniforms:{time:{value:0},power:{value:0}},vertexShader:`varying vec3 p; varying vec3 n; void main(){p=position;n=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float time;uniform float power;varying vec3 p;varying vec3 n;void main(){float noise=sin(p.x*29.+time*2.)*sin(p.y*33.-time*1.3)*sin(p.z*27.+time);float f=.65+.35*noise;gl_FragColor=vec4(vec3(.15,.55,1.)*(2.+f*2.)*power,1.);}`});
 const star=new T.Mesh(new T.SphereGeometry(1,40,28),starMaterial);core.add(star);
 const halo=new T.Sprite(new T.SpriteMaterial({map:glowTexture(),color:0x168dff,transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity:0}));halo.scale.setScalar(5);core.add(halo);
 const light=new T.PointLight(0x288fff,0,18,1.5);core.add(light);
 const hole=new T.Mesh(new T.SphereGeometry(.64,48,32),new T.MeshBasicMaterial({color:0x000000,transparent:true,opacity:1}));hole.visible=false;hole.renderOrder=7;core.add(hole);
 const diskMat=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{time:{value:0},opacity:{value:0}},vertexShader:`varying vec2 v;void main(){v=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 v;uniform float time;uniform float opacity;void main(){float r=length(v);float a=atan(v.y,v.x);float ring=exp(-pow((r-.49)*21.,2.));float disk=smoothstep(.30,.38,r)*(1.-smoothstep(.4,.94,r));float bands=.6+.4*sin(r*95.-a*3.-time*3.);float flame=.65+.35*sin(a*9.+r*21.-time*2.);vec3 col=mix(vec3(.05,.18,.8),vec3(.45,.86,1.),ring);gl_FragColor=vec4(col*(ring*3.+disk*bands*flame),opacity*(ring+disk)*.8);}`});
 const disk=new T.Mesh(new T.PlaneGeometry(3.5,3.5),diskMat);disk.rotation.x=-1.05;disk.rotation.y=.25;disk.visible=false;disk.renderOrder=6;core.add(disk);
 const photon=new T.Mesh(new T.TorusGeometry(.675,.012,8,100),new T.MeshBasicMaterial({color:0x369ddd,transparent:true,blending:T.AdditiveBlending,depthTest:false}));photon.visible=false;photon.renderOrder=8;core.add(photon);
 // Move the singularity and its surrounding light together, leaving the mantle anchor in place.
 const singularity=new T.Group();core.add(singularity);singularity.add(hole,disk,photon);
 let mantleRelax=1;
 function update(time,dt,food,pulse,speed,collapse=0,streamline=0,mantlePressure=-pulse*.32,flush=0,stellarReveal=1){
   const targetRelax=1-streamline;
   mantleRelax=T.MathUtils.lerp(mantleRelax,targetRelax,1-Math.exp(-Math.min(dt,.1)*(targetRelax<mantleRelax?8:1.8)));
   mantleSurface(core.position,0,0,0,time,mantlePressure,mantleRelax);core.position.y+=1.45;
   core.rotation.x=mantleRelax*smooth(-.9,.65,0)*(-.9+.035*Math.sin(time*.8));
   papillae.uniforms.papillaTime.value=time;papillae.uniforms.papillaEnergy.value=(food>0?.08:0)+smooth(2,30,food)*.7+flush*2.2;
   const warmth=Math.min(1,food/24);const pos=mantleGeo.attributes.position;
   for(let i=0;i<pos.count;i++){
     mantleSurface(v,base[i*3],base[i*3+1],base[i*3+2],time,mantlePressure,mantleRelax);pos.setXYZ(i,v.x,v.y,v.z);
   }pos.needsUpdate=true;mantleGeo.computeVertexNormals();
   mantleSkin.opacity=.97-smooth(5,14,food)*.65;skin.emissive.setRGB(.025*smooth(2,24,food),.22*smooth(2,24,food),.65*smooth(2,24,food));cupMaterial.emissiveIntensity=smooth(1,24,food)*.7;mantleSkin.emissive.copy(skin.emissive);
   skin.emissive.r+=flush*.06;skin.emissive.g+=flush*.5;skin.emissive.b+=flush*1.2;mantleSkin.emissive.copy(skin.emissive);cupMaterial.emissiveIntensity+=flush*.6;
   innerGlow.value=.35+.30*(1-mantleRelax);
   armSkin.emissive.copy(skin.emissive);cupMaterial.emissiveIntensity*=innerGlow.value;
   for(const eye of organicEyes)eye.update(time,dt);
   for(const eye of eyes)eye.material.emissive.setRGB(0,.04*warmth,.09*warmth);
   if(food>previousFood)chewTime=.65;previousFood=food;chewTime=Math.max(0,chewTime-dt);
   const feedingArm=arms.find(a=>a.feeding&&a.target),meal=feedingArm?.elapsed||0;
   const gape=feedingArm?smooth(.25,1,meal)*(1-smooth(2.75,3.2,meal))*.48:0;
   const bite=chewTime>0?Math.abs(Math.sin(chewTime*17))*.16:0;
   jaws[0].rotation.x=gape+bite;jaws[1].rotation.x=-(gape+bite);
   for(const arm of arms){
     const desiredFeedPull=arm.target?smooth(0,3.2,arm.elapsed)*(arm.feedBlend||0):0;
     const releaseRate=desiredFeedPull<(arm.feedPull||0)?2.8:12;
     arm.feedPull=T.MathUtils.lerp(arm.feedPull||0,desiredFeedPull,1-Math.exp(-dt*releaseRate));
     let grabLocal=null,grabBlend=0;
     if(arm.grabPoint){
       arm.grabTime+=dt;
       grabLocal=group.worldToLocal(arm.grabPoint.clone());
       grabLocal.clampLength(0,8);
       const reachDelay=GRAB_REACH_TIME-.2;
       grabBlend=smooth(0,GRAB_REACH_TIME,arm.grabTime)*(1-smooth(.38+reachDelay,.95+reachDelay,arm.grabTime));
       if(arm.grabTime>=.95+GRAB_REACH_TIME-.2){arm.grabPoint=null;arm.grabLight=null;}
     }
     if(arm.cinematicGoal){grabLocal=group.worldToLocal(arm.cinematicGoal.clone());grabBlend=arm.cinematicBlend;}
     const a=arm.angle,points=arm.points;const dir=new T.Vector3(Math.cos(a),0,Math.sin(a));
     // Each distal arm breathes between a loose sweep and a soft curl.
     // Slow, unrelated waves avoid eight identical hooks moving in lockstep.
     const phase=arm.index*2.399963;
     const character=.5+.5*Math.sin(phase*1.7);
     const curlMood=.5+.32*Math.sin(time*(.18+arm.index*.013)+phase)+.18*Math.sin(time*.117+phase*2.3);
     const tipTurn=Math.PI*(.22+.30*character+.65*curlMood);
     const tipRoll=.18*Math.sin(time*.23+phase)+.12*Math.sin(time*.137+phase*1.4);
     let normalLength=0;const previousNormal=new T.Vector3();
     const restPrevious=new T.Vector3(),restBefore=new T.Vector3(),tipTangent=new T.Vector3(),tipAxis=new T.Vector3();let tipStep=0;
     // Thick muscular bases lead into traveling waves and coiled distal tips.
     for(let j=0;j<rings;j++){
       const u=j/(rings-1),wave=Math.sin(time*1.15-u*7+a*2),spread=.72+u*3.63-pulse*u*.7;
       const curl=smooth(.56,1,u),theta=(u-.56)*10.8+Math.sin(time*.6+a)*.6;
       const radial=spread+curl*Math.sin(theta)*.95;
       const sideways=Math.sin(u*6-time*1.25+a)*u*.65;
       const p=points[j];p.set(dir.x*radial-Math.sin(a)*sideways,-.22-u*3.93+curl*(1-Math.cos(theta))*1.05+wave*.28*u,dir.z*radial+Math.cos(a)*sideways);
       p.z+=speed*.055*u*u;
       // Only the narrow final 28% coils. Integrate a turning tangent with
       // decreasing step length so the end winds inward instead of growing a broad loop.
       if(j===35){
         tipTangent.copy(restPrevious).sub(restBefore);tipStep=tipTangent.length();tipTangent.normalize();
         // A stable anatomical bend plane avoids the sign flip of a cross
         // product when the incoming tangent passes through the radial axis.
         tipAxis.set(Math.sin(a),0,-Math.cos(a));
         tipAxis.addScaledVector(tipTangent,-tipAxis.dot(tipTangent)).normalize();
       }
       if(j>=35){
         const t=(j-34)/(rings-1-34),turn=t*t*(2-t);
         // Distribute the bend and gentle three-dimensional drift along the
         // tip, with zero added curvature at its junction with the thick arm.
         const ripple=.13*Math.sin(time*.36+phase-t*2.2)*t*t;
         v.copy(tipTangent).applyAxisAngle(tipAxis,tipTurn*turn+ripple);
         v.applyAxisAngle(tipTangent,tipRoll*turn);
         p.copy(restPrevious).addScaledVector(v,tipStep*(1-(.22+.18*character)*t*t));
       }
       restBefore.copy(restPrevious);restPrevious.copy(p);
       // In the body frame the mantle leads along +Y, so the arms trail along -Y.
       const narrow=.72-u*.52;
       v.set(dir.x*narrow+Math.sin(time*6-u*8+a)*u*.035,-.22-u*5.93,dir.z*narrow);
       p.lerp(v,streamline);
       if(j>0)normalLength+=p.distanceTo(previousNormal);previousNormal.copy(p);
       // A collecting arm breaks formation, hooks around the light, then trails again.
       if(grabLocal){
         const root=new T.Vector3(dir.x*.72,-.22,dir.z*.72);
         v.copy(root).lerp(grabLocal,u);
         const arch=Math.sin(Math.PI*u);
         v.addScaledVector(dir,arch*.9);
         if(arm.cinematicGoal){v.x+=Math.sin(a)*Math.sin(u*TAU)*arch*.65;v.z-=Math.cos(a)*Math.sin(u*TAU)*arch*.65;}
         const hook=smooth(.8,1,u)*Math.sin((u-.8)*Math.PI*5)*.28;
         v.addScaledVector(dir,hook);
         p.lerp(v,grabBlend*smooth(0,.35,u));
       }
       if(arm.feedPull>.0001&&!arm.cinematicGoal){
         const pull=arm.feedPull*(1-streamline);
         v.set(dir.x*(1-u)*1.5,-.22-u*.88+Math.sin(u*Math.PI)*.6,dir.z*(1-u)*1.5);
         p.lerp(v,pull*smooth(.08,1,u));
       }
       if(arm.blastSqueeze>0&&!arm.cinematicGoal){
         // Contract the distal arms around their carried lights, then release.
         const squeeze=arm.blastSqueeze*smooth(.35,1,u);
         p.x*=1-.58*squeeze;p.z*=1-.58*squeeze;p.y+=.65*squeeze*u;
       }
     }
     arm.normalLength=normalLength;
     // Limit the entire curved centerline, not only root-to-tip distance.
     if(grabLocal){
       let length=0;for(let j=1;j<rings;j++)length+=points[j].distanceTo(points[j-1]);
       const limit=normalLength*1.07;
       if(length>limit){const root=points[0];for(let j=1;j<rings;j++)points[j].sub(root).multiplyScalar(limit/length).add(root);}
     }
     // Optional external soft-body controller for the isolated grip laboratory.
     arm.poseProvider?.(points);
     arm.tip.copy(points[rings-1]);
     const attr=arm.mesh.geometry.attributes.position;
     for(let j=0;j<rings;j++){
       const u=j/(rings-1);tangent.copy(points[Math.min(j+1,rings-1)]).sub(points[Math.max(0,j-1)]).normalize();normal.copy(j>0?arm.frames[j-1].normal:dir);normal.addScaledVector(tangent,-normal.dot(tangent));if(normal.lengthSq()<.001)normal.copy(j>0?arm.frames[j-1].side:Z).addScaledVector(tangent,-(j>0?arm.frames[j-1].side:Z).dot(tangent));normal.normalize();side.crossVectors(tangent,normal).normalize();
       // Close the final ring to a point; a constant minimum radius left an
       // open, visibly chopped-off tube at the end of every curled arm.
       const radius=arm.radiusProvider?.(u)??((.43*Math.pow(1-u,1.3)+.017)*(1-smooth(.88,1,u)));
       arm.frames[j].side.copy(side);arm.frames[j].normal.copy(normal);arm.frames[j].radius=radius;
       for(let k=0;k<=sides;k++){const theta=k/sides*TAU;v.copy(points[j]).addScaledVector(side,Math.cos(theta)*radius).addScaledVector(normal,Math.sin(theta)*radius);attr.setXYZ(j*(sides+1)+k,v.x,v.y,v.z);}
     }
     attr.needsUpdate=true;arm.mesh.geometry.computeVertexNormals();
     for(let j=0;j<20;j++)for(let row=0;row<2;row++){
       const idx=3+j*2,frame=arm.frames[idx],p=points[idx];
       const cupNormal=frame.normal.clone().multiplyScalar(arm.suckerOutward?1:-1),cupSide=frame.side.clone();
       // Roll the sucker surface inward around the arm, independent of world orientation.
       if(streamline>0&&!arm.suckerOutward){
         const axis=points[idx+1].clone().sub(points[idx-1]).normalize();
         const inward=new T.Vector3(-p.x,0,-p.z).addScaledVector(axis,p.x*axis.x+p.z*axis.z);
         if(inward.lengthSq()>.0001){
           inward.normalize();const roll=Math.atan2(axis.dot(cupNormal.clone().cross(inward)),cupNormal.dot(inward))*streamline;
           cupNormal.applyAxisAngle(axis,roll);cupSide.applyAxisAngle(axis,roll);
         }
       }
       const face=cupNormal.addScaledVector(cupSide,(row===0?-1:1)*.68).normalize();dummy.position.copy(p).addScaledVector(face,frame.radius*1.08);dummy.quaternion.setFromUnitVectors(Z,face);const s=frame.radius*.46;dummy.scale.set(s,s,s*.7);dummy.updateMatrix();arm.cups.setMatrixAt(j*2+row,dummy.matrix);
     }arm.cups.instanceMatrix.needsUpdate=true;
   }
   const webP=webGeo.attributes.position;let wi=0;
   for(let a=0;a<8;a++)for(let j=0;j<12;j++){
     const p=arms[a].points[j],q=arms[(a+1)%8].points[j],p2=arms[a].points[j+1],q2=arms[(a+1)%8].points[j+1];
     for(const vertex of [p,q,p2,q,q2,p2]){webGeo.attributes.uv.setXY(wi,vertex.x*.15,vertex.z*.15);webP.setXYZ(wi++,vertex.x,vertex.y,vertex.z);}
   }webGeo.attributes.uv.needsUpdate=true;webP.needsUpdate=true;webGeo.computeVertexNormals();
   // Relief and luminous cell borders are sampled from baked procedural maps.
   skinLight.intensity=(food===0?0:9)+flush*18;
   skinLight.position.copy(core.position);skinLight.position.z+=1;
   nebula.visible=food>=8&&collapse<.65;nebula.rotation.y=Math.sin(time*.13)*.15;nebula.scale.set(.82+.05*Math.sin(time*.5),.86+.05*Math.cos(time*.4),.9+.04*Math.sin(time*.3));cloudMat.uniforms.time.value=time;cloudMat.uniforms.opacity.value=(.65+.35*smooth(8,18,food))*(1-smooth(.3,.65,collapse));
   const starOn=food>=IGNITION;star.visible=starOn&&collapse<.65;starMaterial.uniforms.time.value=time;starMaterial.uniforms.power.value=(1+collapse*3)*(.3+.7*stellarReveal);
   let radius=.24+smooth(IGNITION,COLLAPSE,food)*.43;radius*=1+.035*Math.sin(time*4);if(collapse>0)radius*=collapse<.28?1+collapse*1.4:Math.max(.01,1-(collapse-.28)/.37);
   radius*=.08+.92*stellarReveal;star.scale.setScalar(radius);halo.material.opacity=starOn?(collapse>.65?.1:.55):smooth(8,IGNITION,food)*.17;halo.scale.setScalar(starOn?radius*8:2);
   light.intensity=food===0?0:1+warmth*12;if(collapse>.65)light.intensity=4;
   const black=collapse>=.65,seedScale=.045+.135*smooth(.65,1,collapse)+1.02*(1-Math.exp(-Math.max(0,food-COLLAPSE)/100));hole.scale.setScalar(seedScale);disk.scale.setScalar(seedScale);photon.scale.setScalar(seedScale);
   hole.visible=disk.visible=photon.visible=black;diskMat.uniforms.time.value=time;diskMat.uniforms.opacity.value=smooth(.65,.72,collapse)*.48;photon.material.opacity=smooth(.65,.72,collapse);photon.quaternion.copy(group.quaternion).invert();
 }
 return {group,arms,core,singularity,update,mantle,light,photon,hole,nebula,collar,beak,jaws,eyeGroups,organicEyes,web};
}
