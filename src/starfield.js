import * as T from 'three';
const BANDS=6,SLICES=8,SECTORS=BANDS*SLICES,TAU=Math.PI*2;
export function starSector(x,y,z){const length=Math.hypot(x,y,z)||1;return Math.min(BANDS-1,Math.floor((y/length+1)*.5*BANDS))*SLICES+Math.min(SLICES-1,Math.floor(((Math.atan2(z,x)+TAU)%TAU)/TAU*SLICES));}
export function createStarfield(scene){
 const capacity=2000,positions=new Float32Array(capacity*3),births=new Float32Array(capacity),alive=new Float32Array(capacity),retiring=new Uint8Array(capacity),geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.BufferAttribute(positions,3));geo.setAttribute('birth',new T.BufferAttribute(births,1));geo.setAttribute('alive',new T.BufferAttribute(alive,1));geo.setDrawRange(0,0);
 const mat=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{time:{value:0},pixelRatio:{value:Math.min(devicePixelRatio,1.75)}},vertexShader:`attribute float birth;attribute float alive;uniform float time;uniform float pixelRatio;varying vec3 color;varying float fade;void main(){vec4 p=modelViewMatrix*vec4(position,1.);float d=length(p.xyz);color=mix(vec3(.035,.26,1.),vec3(1.1,1.25,1.4),smoothstep(80.,420.,d));fade=alive*smoothstep(0.,6.,time-birth)*(.72+.12*sin(time*.6+birth))*(1.-smoothstep(680.,730.,d));gl_PointSize=clamp(650./max(1.,d),2.4,5.5)*pixelRatio;gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec3 color;varying float fade;void main(){float r=length(gl_PointCoord-.5)*2.;float a=exp(-r*r*2.5)*(1.-smoothstep(.7,1.,r));gl_FragColor=vec4(color,fade*a);}`});
 const points=new T.Points(geo,mat);points.frustumCulled=false;scene.add(points);let count=0,budget=0,serial=0;const p=new T.Vector3(),bins=new Uint16Array(SECTORS),sectors=new Uint8Array(capacity);
 function update(time,dt,food,player,promote,room){
  mat.uniforms.time.value=time;if(food<2)return;
  bins.fill(0);let dirty=false,active=0;const vacant=[];
  for(let i=0;i<count;i++){
   if(alive[i]<=0){vacant.push(i);continue;}
   p.fromArray(positions,i*3).sub(player);const distance=p.length();
   if(distance<65&&room>0){const result=promote(p.clone().add(player),room),used=typeof result==='number'?result:1;if(used>0){alive[i]=0;retiring[i]=0;room-=used;vacant.push(i);dirty=true;continue;}}
   if(distance>760)retiring[i]=1;
   if(retiring[i]){alive[i]=Math.max(0,alive[i]-dt/4);dirty=true;if(alive[i]===0)vacant.push(i);continue;}
   const sector=starSector(p.x,p.y,p.z);sectors[i]=sector;bins[sector]++;active++;
  }
  // Fade out a crowded direction only when another section has become sparse.
  // World-space positions remain fixed, preserving parallax and approachable stars.
  if(active>=SECTORS*2&&Math.min(...bins)<active/SECTORS*.5){
   const limit=active/SECTORS*1.6+2;
   for(let i=0;i<count;i++)if(alive[i]>0&&!retiring[i]&&bins[sectors[i]]>limit){retiring[i]=1;bins[sectors[i]]--;break;}
  }
  budget=Math.min(capacity,budget+dt*(food<8?1.2:food<24?4:10));
  while(budget>=1&&(vacant.length||count<capacity)){
   budget--;const start=(serial++*19)%SECTORS;let sector=start;
   for(let j=1;j<SECTORS;j++){const candidate=(start+j*19)%SECTORS;if(bins[candidate]<bins[sector])sector=candidate;}
   const band=Math.floor(sector/SLICES),slice=sector%SLICES,y=-1+2*(band+Math.random())/BANDS,a=TAU*(slice+Math.random())/SLICES,r=95+Math.pow(Math.random(),.65)*500,side=Math.sqrt(1-y*y),i=vacant.length?vacant.pop():count++;
   positions.set([player.x+Math.cos(a)*side*r,player.y+y*r,player.z+Math.sin(a)*side*r],i*3);births[i]=time;alive[i]=1;retiring[i]=0;bins[sector]++;dirty=true;
  }
  if(dirty){geo.setDrawRange(0,count);geo.attributes.position.needsUpdate=true;geo.attributes.birth.needsUpdate=true;geo.attributes.alive.needsUpdate=true;}
 }
 return {update,setPixelRatio(ratio){mat.uniforms.pixelRatio.value=ratio;},get count(){return count;}};
}
