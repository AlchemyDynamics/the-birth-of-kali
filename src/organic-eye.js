import * as T from 'three';
export function createOrganicEye(skin,texture,phase=0,papillaMaterial=skin){
 const cinematic={active:false,blink:0,dilation:1,reflection:0},dilation={value:1};
 const group=new T.Group(),gaze=new T.Group();group.add(gaze);
 const cavity=new T.Mesh(new T.SphereGeometry(1,40,24),new T.MeshStandardMaterial({color:0x020511,roughness:.35}));cavity.scale.set(.32,.29,.11);cavity.position.z=.23;group.add(cavity);
 // Concentric rings give the cornea and iris real convex contours, not a flat decal.
 const dome=new T.SphereGeometry(.285,64,32,0,Math.PI*2,0,Math.PI/2);dome.rotateX(Math.PI/2);
 const dp=dome.attributes.position,uv=dome.attributes.uv;
 for(let i=0;i<dp.count;i++){const x=dp.getX(i),y=dp.getY(i),r=Math.hypot(x,y);dp.setZ(i,.31+.10*Math.sqrt(Math.max(0,1-r*r/(.285*.285))));uv.setXY(i,x/.57+.5,y/.57+.5);}dome.computeVertexNormals();
 const iris=new T.Mesh(dome,new T.MeshPhysicalMaterial({map:texture,emissiveMap:texture,color:0xcbd4ee,roughness:.24,clearcoat:1,clearcoatRoughness:.08}));gaze.add(iris);
 const shape=new T.Shape();shape.moveTo(-.205,.035);shape.bezierCurveTo(-.2,.12,-.125,.065,-.035,.015);shape.bezierCurveTo(.06,-.035,.15,-.052,.215,-.055);shape.bezierCurveTo(.10,-.13,-.10,-.08,-.205,.035);
 // Subdivide the fill before projecting it: broad triangles would cut through the iris.
 const flatPupil=new T.ShapeGeometry(shape,36).toNonIndexed();let triangles=Array.from(flatPupil.attributes.position.array);flatPupil.dispose();
 for(let pass=0;pass<3;pass++){const next=[];for(let i=0;i<triangles.length;i+=9){const a=triangles.slice(i,i+3),b=triangles.slice(i+3,i+6),c=triangles.slice(i+6,i+9),ab=a.map((v,k)=>(v+b[k])/2),bc=b.map((v,k)=>(v+c[k])/2),ca=c.map((v,k)=>(v+a[k])/2);next.push(...a,...ab,...ca,...ab,...b,...bc,...ca,...bc,...c,...ab,...bc,...ca);}triangles=next;}
 const pupilGeo=new T.BufferGeometry();pupilGeo.setAttribute('position',new T.Float32BufferAttribute(triangles,3));const pp=pupilGeo.attributes.position;for(let i=0;i<pp.count;i++){const x=pp.getX(i),y=pp.getY(i);pp.setZ(i,.316+.10*Math.sqrt(Math.max(0,1-(x*x+y*y)/(.285*.285))));}pupilGeo.computeVertexNormals();const pupil=new T.Mesh(pupilGeo,new T.MeshBasicMaterial({color:0x01020a,side:T.DoubleSide}));gaze.add(pupil);
 const cornea=new T.Mesh(dome.clone(),new T.MeshPhysicalMaterial({color:0xc5ddff,transparent:true,opacity:.07,roughness:.045,clearcoat:1,clearcoatRoughness:.03,depthWrite:false}));cornea.position.z=.008;gaze.add(cornea);
 pupil.material.onBeforeCompile=shader=>{shader.uniforms.pupilDilation=dilation;shader.vertexShader='uniform float pupilDilation;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 transformed.y*=pupilDilation;
 transformed.z=.317+.10*sqrt(max(0.,1.-dot(transformed.xy,transformed.xy)/(.285*.285)));`);};pupil.material.customProgramCacheKey=()=> 'living-pupil-v1';
 const glintCanvas=document.createElement('canvas');glintCanvas.width=glintCanvas.height=64;const ctx=glintCanvas.getContext('2d'),gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'#efffff');gradient.addColorStop(.14,'#95eaff');gradient.addColorStop(.4,'#268dff99');gradient.addColorStop(1,'#145aff00');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
 const reflection=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(glintCanvas),transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity:0}));reflection.scale.setScalar(.075);gaze.add(reflection);
 function reflectLight(light,camera){const l=group.worldToLocal(light.clone()).sub(new T.Vector3(0,0,.31)).normalize(),view=group.worldToLocal(camera.clone()).sub(new T.Vector3(0,0,.31)).normalize(),h=l.add(view).normalize();const x=T.MathUtils.clamp(h.x*.20,-.19,.19),y=T.MathUtils.clamp(h.y*.20,-.19,.19);reflection.position.set(x,y,.33+.10*Math.sqrt(Math.max(0,1-(x*x+y*y)/(.285*.285))));}
 const segments=80,rings=12,vertices=new Float32Array((segments+1)*(rings+1)*3),uvs=new Float32Array((segments+1)*(rings+1)*2),indices=[];
 for(let j=0;j<rings;j++)for(let i=0;i<segments;i++){const k=j*(segments+1)+i;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
 const lidGeo=new T.BufferGeometry();lidGeo.setAttribute('position',new T.BufferAttribute(vertices,3));lidGeo.setAttribute('uv',new T.BufferAttribute(uvs,2));lidGeo.setIndex(indices);
 const lidMaterial=skin.clone();lidMaterial.onBeforeCompile=skin.onBeforeCompile;lidMaterial.customProgramCacheKey=skin.customProgramCacheKey;lidMaterial.color.setHex(0x3b4a61);lidMaterial.side=T.DoubleSide;const lids=new T.Mesh(lidGeo,lidMaterial);gaze.add(lids);
 const gazeTarget=new T.Vector2();let previousBlink=-1;
 function update(time,dt=.016){
  const cycle=(time+phase)%8.7,blink=cinematic.active?cinematic.blink:cycle>7.9?Math.sin(Math.PI*Math.min(1,(cycle-7.9)/.65))**2:0,aperture=1-.999*blink;
  dilation.value=cinematic.active?cinematic.dilation:1;reflection.material.opacity=cinematic.active?cinematic.reflection*(1-blink):0;
  gaze.rotation.y=T.MathUtils.lerp(gaze.rotation.y,gazeTarget.y+.045*Math.sin(time*.63+phase),1-Math.exp(-dt*3));gaze.rotation.x=T.MathUtils.lerp(gaze.rotation.x,gazeTarget.x+.028*Math.sin(time*.47+phase),1-Math.exp(-dt*3));pupil.scale.y=1+.06*Math.sin(time*.7+phase);
  if(Math.abs(blink-previousBlink)<1e-6)return;previousBlink=blink;
  for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,u=j/rings,upper=Math.max(0,Math.sin(a)),irregular=1+.045*Math.sin(a*3+.8)+.025*Math.sin(a*7),innerX=.282*Math.cos(a)*irregular,innerY=(.253*Math.sin(a)*irregular+.014*Math.cos(a))*aperture;
   const x=T.MathUtils.lerp(innerX,.49*Math.cos(a)*(1+.04*Math.sin(a*5)),u),y=T.MathUtils.lerp(innerY,.405*Math.sin(a)+.025,u),z=T.MathUtils.lerp(.351+.085*blink,.07,u)+Math.sin(Math.PI*u)*(.075+upper*.055)+Math.sin(u*Math.PI*6+a*3)*.007*Math.sin(Math.PI*u);
   // Wrap the closing skin over the convex cornea instead of interpolating
   // through it. The expanded shell also clears the triangles between rings.
   const r=Math.hypot(x,y),shell=r<.315?.322+.12*Math.sqrt(Math.max(0,1-r*r/(.315*.315))):0;
   const k=j*(segments+1)+i;lidGeo.attributes.position.setXYZ(k,x,y,Math.max(z,shell));lidGeo.attributes.uv.setXY(k,x+phase,y+.5);
  }lidGeo.attributes.position.needsUpdate=true;lidGeo.attributes.uv.needsUpdate=true;lidGeo.computeVertexNormals();
 }
 update(0);return {group,iris,update,lids,pupil,gaze,gazeTarget,cinematic,reflectLight,reflection};
}
