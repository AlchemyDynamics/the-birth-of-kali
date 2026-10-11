import * as T from 'three';
import {createKali} from './creature.js';
import {armRadius} from './grip-physics.js';
import {sampleSoftArm} from './soft-arm.js';
import {createTubeSimulation,TUBE_FRONT,TUBE_BACK,CHEMICAL_PATCHES} from './tube-physics.js';
const $=s=>document.querySelector(s),sim=createTubeSimulation(),scene=new T.Scene();
scene.background=new T.Color(0x030711);
const renderer=new T.WebGLRenderer({canvas:$('#lab'),antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
const camera=new T.PerspectiveCamera(43,innerWidth/innerHeight,.1,120),orbit={yaw:.24,pitch:.2,distance:23},target=new T.Vector3(3,0,0),pointers=new Map();
const stage=new T.Group();stage.rotation.z=Math.PI/2;scene.add(stage);
scene.add(new T.HemisphereLight(0xb7d9ef,0x111426,1.5));
for(const [x,y,z,c,p] of [[-3,6,7,0x98d7ff,140],[8,2,-5,0x766acc,160],[8,-4,8,0x96a8ef,100]]){const light=new T.PointLight(c,p,35,2);light.position.set(x,y,z);scene.add(light);}
const kali=createKali();stage.add(kali.group);
const bodyParts=kali.group.children.filter(c=>!kali.arms.some(a=>a.mesh===c||a.cups===c)&&c!==kali.core&&c!==kali.web);
// Cache undeformed transforms. Arms and their web remain in world-space simulation coordinates.
const bases=new Map(bodyParts.map(c=>[c,{p:c.position.clone(),s:c.scale.clone()}]));
for(const arm of kali.arms){
 arm.suckerOutward=true;
 arm.poseProvider=points=>sampleSoftArm(sim.state.arms[arm.index].points,points,(p,u)=>{sim.wallProject(p,armRadius(u));p[1]-=sim.state.bodyY;});
 arm.radiusProvider=armRadius;
}
const tubeGroup=new T.Group();stage.add(tubeGroup);let shell;
function rebuildTube(){while(tubeGroup.children.length){const c=tubeGroup.children[0];tubeGroup.remove(c);c.geometry?.dispose();c.material?.dispose();}
 const radius=sim.state.radius,mat=new T.MeshPhysicalMaterial({color:0x48718d,transparent:true,opacity:.16,roughness:.4,metalness:.15,side:T.DoubleSide,depthWrite:false});
 shell=new T.Mesh(new T.CylinderGeometry(radius,radius,6,80,1,true,0,$('#cutaway').checked?Math.PI*1.15:Math.PI*2),mat);shell.position.y=-3;tubeGroup.add(shell);
 for(const y of [0,-1.5,-3,-4.5,-6]){const rim=new T.Mesh(new T.TorusGeometry(radius,y===0||y===-6?.035:.009,8,80),new T.MeshBasicMaterial({color:y===0?0xa19bff:0x52738b,transparent:true,opacity:y===0?.9:.4}));rim.rotation.x=Math.PI/2;rim.position.y=y;tubeGroup.add(rim);}
}
rebuildTube();
const cueGroup=new T.Group();stage.add(cueGroup);
for(const patch of CHEMICAL_PATCHES){const marker=new T.Mesh(new T.SphereGeometry(.12,12,8),new T.MeshBasicMaterial({color:0xc7ac64,transparent:true,opacity:.65}));marker.userData.patch=patch;cueGroup.add(marker);}
const pads=new T.InstancedMesh(new T.SphereGeometry(.065,12,8),new T.MeshBasicMaterial({color:0x90f7de}),8);pads.frustumCulled=false;stage.add(pads);const dummy=new T.Object3D();
for(let i=0;i<8;i++){const row=document.createElement('div');row.className='arm-sense';row.innerHTML='<span>Arm '+(i+1)+'</span><b>Explore</b><i></i>';$('#arm-senses').appendChild(row);}
const canvas=renderer.domElement;
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);});
canvas.addEventListener('pointermove',e=>{const prev=pointers.get(e.pointerId);if(!prev)return;const before=[...pointers.values()];pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===1){orbit.yaw-=(e.clientX-prev[0])*.006;orbit.pitch=Math.max(-1.4,Math.min(1.4,orbit.pitch+(e.clientY-prev[1])*.006));}else{const after=[...pointers.values()],d0=Math.hypot(before[0][0]-before[1][0],before[0][1]-before[1][1]),d1=Math.hypot(after[0][0]-after[1][0],after[0][1]-after[1][1]);if(d1>1)orbit.distance=Math.max(8,Math.min(40,orbit.distance*d0/d1));}});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>pointers.delete(e.pointerId));
canvas.addEventListener('wheel',e=>{e.preventDefault();orbit.distance=Math.max(8,Math.min(40,orbit.distance*Math.exp(e.deltaY*.001)));},{passive:false});
let paused=false,last=performance.now();
function reset(){sim.reset();sim.state.traction=Number($('#traction').value)/100;paused=false;$('#pause').textContent='Pause';}
$('#start').onclick=()=>{if(sim.state.complete)reset();sim.start();paused=false;$('#pause').textContent='Pause';};
$('#pause').onclick=()=>{paused=!paused;$('#pause').textContent=paused?'Continue':'Pause';};
$('#reset').onclick=reset;$('#release').onclick=()=>{sim.release();$('#traction').value=0;$('#grip-value').value='0%';};
$('#traction').oninput=e=>{sim.state.traction=Number(e.target.value)/100;$('#grip-value').value=e.target.value+'%';};
$('#bore').oninput=e=>{sim.state.radius=Number(e.target.value)/100;$('#diameter').value=(2*sim.state.radius).toFixed(2);reset();rebuildTube();};
$('#explore-only').onchange=e=>{sim.state.exploreOnly=e.target.checked;if(e.target.checked)for(const arm of sim.state.arms)arm.anchor=null;};$('#cutaway').onchange=rebuildTube;$('#chemical').onchange=e=>sim.state.chemicalCues=e.target.checked;$('#sources').onclick=e=>{e.preventDefault();$('#research').hidden=!$('#research').hidden;};
window.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!['INPUT','BUTTON','A'].includes(e.target.tagName)){e.preventDefault();$('#pause').click();}});
function resize(){camera.aspect=innerWidth/innerHeight;if(innerWidth>850)camera.setViewOffset(innerWidth,innerHeight,158,0,innerWidth,innerHeight);else camera.clearViewOffset();camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}addEventListener('resize',resize);resize();
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;if(!paused)sim.update(dt);const s=sim.state;
 // Mild streamline unfolds the mantle; the laboratory envelope supplies compression.
 kali.group.position.y=s.bodyY;kali.update(s.time,paused?0:dt,4,0,0,0,.85);kali.core.visible=false;kali.light.intensity=0;
 for(const part of bodyParts){const b=bases.get(part);part.position.set(b.p.x*s.radialScale,b.p.y*s.axialScale,b.p.z*s.radialScale);part.scale.set(b.s.x*s.radialScale,b.s.y*s.axialScale,b.s.z*s.radialScale);}
 // The beak remains rigid while its attachment follows the soft surrounding body.
 kali.beak.scale.set(1,1,1);
 cueGroup.visible=$('#chemical').checked;for(const marker of cueGroup.children){const patch=marker.userData.patch;marker.position.set(Math.cos(patch.angle)*s.radius,patch.y,Math.sin(patch.angle)*s.radius);}
 let count=0;for(const arm of s.arms)if(arm.anchor){dummy.position.set(...arm.anchor);dummy.updateMatrix();pads.setMatrixAt(count++,dummy.matrix);}pads.count=count;pads.instanceMatrix.needsUpdate=true;pads.visible=$('#contacts').checked;
 for(let i=0;i<8;i++){const b=s.arms[i].senses,row=$('#arm-senses').children[i];row.querySelector('b').textContent=b.intention;row.querySelector('i').style.width=(4+96*Math.max(b.touch,b.chemical))+'%';}
 $('#attached').textContent=s.attached+' / 8';$('#load').textContent=s.load.toFixed(0);$('#width').textContent=Math.round(s.radialScale*100)+'%';$('#length').textContent=Math.round(s.axialScale*100)+'%';$('#status').textContent=s.phase;$('#progress').style.width=Math.min(100,Math.max(0,(3.2-s.bodyY)/15.2*100))+'%';
 const frameCenter=(Math.min(0,-s.bodyY-3.1*s.axialScale)+Math.max(6,-s.bodyY+6.4))*.5;target.x+=(frameCenter-target.x)*(1-Math.exp(-dt*2));camera.position.set(Math.sin(orbit.yaw)*Math.cos(orbit.pitch),Math.sin(orbit.pitch),Math.cos(orbit.yaw)*Math.cos(orbit.pitch)).multiplyScalar(orbit.distance).add(target);camera.lookAt(target);renderer.render(scene,camera);
}
requestAnimationFrame(frame);window.tubeLab={get state(){return JSON.parse(JSON.stringify(sim.state));}};
