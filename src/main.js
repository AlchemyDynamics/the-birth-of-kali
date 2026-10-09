import * as T from 'three';
import {createStarBoost,STAR_BOOST_SPEED,STAR_BOOST_STEERING} from './star-boost.js';
import {createBoostTrail} from './boost-trail.js';
import {FINAL_STARS,clusterCount} from './progression.js';
import {FinalScene} from './final-scene.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {createKali,glowTexture} from './creature.js';
import {Soundscape} from './audio.js';
import {HarmonicField} from './harmony.js';
import {Narrator} from './narration.js';
import {createInnerCosmos} from './inner-cosmos.js';
import {NARRATION} from './narration-lines.js';
import {createStarfield} from './starfield.js';
import {jetAim,travelLightPositions,lightClusterPositions} from './navigation.js';
import {feedingArms} from './simulation.js';
import {stabilizedRollAngle,ROLL_FINISH_TIME,smallJetRotation,smallJetAngle,SMALL_JET_SETTLE_TIME} from './roll-motion.js';
import {nearestPathLight,nearerEye} from './attention.js';
import {updateHorizonProjection} from './horizon-projection.js';
import {proximityBrightness} from './papillae.js';
import {renderPixelRatio,createRenderQuality} from './render-quality.js';
import {IGNITION,COLLAPSE,phaseFor,smooth,integrateVelocity,captureLight,nextMeal,advanceFeeding,REACH,steeringRate,SPAWN_DISTANCE,SPAWN_SPREAD,SPAWN_INTERVAL,MAX_WISPS,JET_DISTANCE,JET_SPEED,JET_DURATION,JET_RECOVERY,mantlePressureFor,GRAB_REACH_TIME} from './simulation.js';
const $=s=>document.querySelector(s),TAU=Math.PI*2;
let renderer;
try{renderer=new T.WebGLRenderer({canvas:$('#world'),antialias:true,powerPreference:'high-performance'});}catch(e){$('#error').hidden=false;$('#error').textContent='This experience needs WebGL 2. Please open it in a desktop browser with hardware acceleration enabled.';throw e;}
const renderQuality=createRenderQuality();
renderer.setPixelRatio(renderPixelRatio(innerWidth,innerHeight,devicePixelRatio));renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x000000);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(48,innerWidth/innerHeight,.1,900);
const starfield=createStarfield(scene);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const bloom=new UnrealBloomPass(new T.Vector2(innerWidth,innerHeight),.64,.65,.7);composer.addPass(bloom);composer.addPass(new OutputPass());
// Keep the event horizon light-absorbing after bloom; bend the nearby disk image.
const horizon=new ShaderPass({uniforms:{tDiffuse:{value:null},center:{value:new T.Vector2(.5,.5)},radius:{value:0},aspect:{value:innerWidth/innerHeight},amount:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 center;uniform float radius;uniform float aspect;uniform float amount;varying vec2 vUv;void main(){vec2 delta=vUv-center;vec2 metric=delta*vec2(aspect,1.);float d=length(metric);float lens=amount*.035*exp(-pow((d-radius*1.3)/max(radius*.5,.0001),2.));vec2 uv=vUv-delta*lens;vec4 color=texture2D(tDiffuse,uv);float feather=max(radius*.075,fwidth(d));float horizonMask=smoothstep(radius-feather,radius+feather,d);color.rgb*=mix(1.,horizonMask,amount);gl_FragColor=color;}`});composer.addPass(horizon);
const kali=createKali();scene.add(kali.group);
// No ambient light: every visible reflection is caused by an ember or consumed light.
const wispLights=Array.from({length:6},()=>{const l=new T.PointLight(0x329bff,0,85,1.25);scene.add(l);return l;});
const tex=glowTexture(),wispMat=new T.SpriteMaterial({map:tex,color:0x74cfff,transparent:true,blending:T.AdditiveBlending,depthWrite:false});
const wisps=[],keys=new Set(),velocity=new T.Vector3(),player=new T.Vector3();
const cameraAnchor=new T.Vector3();
const previousPlayer=new T.Vector3();let collected=0,settledTime=0;
const snowGeo=new T.BufferGeometry(),snowPos=new Float32Array(1400*3),snowColor=new Float32Array(1400*3);snowGeo.setAttribute('position',new T.BufferAttribute(snowPos,3));snowGeo.setAttribute('color',new T.BufferAttribute(snowColor,3));const snow=new T.Points(snowGeo,new T.PointsMaterial({map:tex,size:.12,transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexColors:true}));snow.frustumCulled=false;scene.add(snow);
let started=false,paused=false,food=0,time=0,age=0,last=performance.now(),yaw=0,pitch=.08,zoom=11.34705,pulse=0,cooldown=0,nextSpawn=0,collapseTime=-1,ended=false,freeplay=false,drag=false,lastMouse=[0,0],messageUntil=0,phase='first-light',spawnSerial=0;
let opening=false,openingTime=0,openingLight=null,openingCaptured=false,openingEaten=false,openingMealDuration=(1+Math.random())/1.5;
const openingOrigin=new T.Vector3(3,-1.8,3.5),openingMouth=new T.Vector3(0,-.95,.05);
let attractMode=new URLSearchParams(location.search).has('autoplay');
const pointer=new T.Vector2();let dashQueued=false,dashTime=0,recoveryTime=0,firstSpawned=false;
const facing=new T.Vector3(0,0,-1),jetPose=new T.Quaternion();
let bodyYaw=0,idleBob=0;
const swimPose=new T.Quaternion(),rollPose=new T.Quaternion();
let jetsSinceRoll=0,nextRollJet=4+Math.floor(Math.random()*5),lastJetTime=-Infinity,rollActive=false,rollAngle=0,rollCount=0,rollTarget=0,jetBoost=1;
let rollElapsed=0,rollSlowDegrees=10,rollCorrectionDegrees=5;
let boostRolling=false,boostSpin=0,boostAngularSpeed=0,boostCoast=0;
const boostTrail=createBoostTrail(scene,tex);
const starBoost=createStarBoost(kali.arms,()=>{boostTrail.ignite();audio.jet();});
function boostHeld(){return keys.has('Space')||keys.has('ShiftLeft');}
function endStarBoost(){
 starBoost.stop();dashTime=0;recoveryTime=JET_RECOVERY;boostCoast=0;
 if(pendingTravelLights)spawnTravelLights();
}
function releaseBoostIfUnheld(){if(starBoost.active&&!boostHeld())endStarBoost();}
const rollAxis=new T.Vector3();
const pathHeading=new T.Vector3(0,0,-1);let microJet={active:false,angle:0,duration:1},microElapsed=0;
function beginJetRoll(){
 // A new jet may interrupt stabilization; start from the visible pose.
 if(rollActive||microJet.active)swimPose.copy(kali.group.quaternion);
 if(time-lastJetTime>JET_DURATION+JET_RECOVERY+.25){jetsSinceRoll=0;nextRollJet=4+Math.floor(Math.random()*5);}
 lastJetTime=time;jetsSinceRoll++;rollActive=jetsSinceRoll>=nextRollJet;
 const fueled=rollActive&&starEnded&&food>=IGNITION&&boostHeld()&&starBoost.start();
 // Make the extra forward light visible even during a short, capped boost.
 if(fueled)nextSpawn=Math.min(nextSpawn,time+.15);
 jetBoost=fueled?STAR_BOOST_SPEED:1;rollTarget=rollActive?(270+Math.random()*450)*Math.PI/180*(Math.random()<.5?-1:1):0;
 boostRolling=fueled;boostSpin=0;boostAngularSpeed=0;boostCoast=0;
 microJet=rollActive?{active:false}:smallJetRotation();microElapsed=0;if(microJet.active)rollAxis.copy(aimDirection);
 if(rollActive){rollElapsed=0;rollSlowDegrees=5+Math.random()*15;rollCorrectionDegrees=3+Math.random()*7;rollAxis.copy(aimDirection);rollCount++;jetsSinceRoll=0;nextRollJet=4+Math.floor(Math.random()*5);}
}
const aimRay=new T.Raycaster(),aimDirection=new T.Vector3(),dashPointer=new T.Vector2();
const travelHeading=new T.Vector3();let travelJets=0,pendingTravelLights=false,travelClusters=0;
function recordTravelJet(heading){
 if(food<14)return;
 if(travelJets===0||travelHeading.dot(heading)<Math.cos(Math.PI/7.2)){travelHeading.copy(heading);travelJets=1;}else travelJets++;
 if(travelJets===3){travelJets=0;pendingTravelLights=true;}
}
function spawnTravelLights(){
 if(food<14){pendingTravelLights=false;return;}
 const positions=travelLightPositions(player,travelHeading,Math.random,food);
 // Recycle only unclaimed lights when the field is full; carried meals stay attached.
 const loose=wisps.filter(w=>w.owner===null&&!w.eaten).sort((a,b)=>b.position.distanceToSquared(player)-a.position.distanceToSquared(player));
 for(let i=0;i<Math.max(0,loose.length+positions.length-(food>=COLLAPSE?56:28));i++){const w=loose[i];scene.remove(w.sprite);w.sprite.material.dispose();w.center.geometry.dispose();w.center.material.dispose();wisps.splice(wisps.indexOf(w),1);}
 spawnHarmonicLights(positions);
 travelClusters++;pendingTravelLights=false;
}
const openingDustGeo=new T.BufferGeometry(),openingDustData=new Float32Array(240*3);
const openingDust=new T.Points(openingDustGeo,new T.PointsMaterial({map:tex,color:0x72baff,size:.035,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));openingDustGeo.setAttribute('position',new T.BufferAttribute(openingDustData,3));openingDust.frustumCulled=false;scene.add(openingDust);
const openingHaze=new T.Sprite(new T.SpriteMaterial({map:tex,color:0x2355b8,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));openingHaze.scale.set(8,10,1);openingHaze.position.copy(openingOrigin).add(new T.Vector3(0,2,-3));scene.add(openingHaze);
const audio=new Soundscape(),narrator=new Narrator(),harmony=new HarmonicField(),finalScene=new FinalScene();
const innerCosmos=createInnerCosmos($('#inner-cosmos'),$('#cosmos-stage'));
const shock=new T.Mesh(new T.TorusGeometry(1,.025,8,128),new T.MeshBasicMaterial({color:0x59b9ff,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false}));scene.add(shock);
const jetGeo=new T.BufferGeometry(),jetArr=new Float32Array(150*3),jetVel=new Float32Array(150*3),jetLife=new Float32Array(150);jetGeo.setAttribute('position',new T.BufferAttribute(jetArr,3));const jetParticles=new T.Points(jetGeo,new T.PointsMaterial({color:0x1c5c92,size:.055,map:tex,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false}));scene.add(jetParticles);let jetIndex=0;
const direction=new T.Vector3(),tmp=new T.Vector3(),local=new T.Vector3(),desiredCamera=new T.Vector3(),look=new T.Vector3(),rot=new T.Quaternion();
function spawnHarmonicLights(positions){
 const remaining=new Set(positions);
 while(remaining.size){
  const group=[remaining.values().next().value];remaining.delete(group[0]);
  // Assign a whole chord to each physical cluster, including close pairs.
  for(let i=0;i<group.length;i++)for(const p of remaining){if(p.distanceTo(group[i])<6){group.push(p);remaining.delete(p);}}
  const notes=harmony.next(group.length);group.forEach((position,i)=>spawnWisp(position,false,notes[i]));
 }
}
function spawnWisp(pos,first=false,music=null){
 const sprite=new T.Sprite(wispMat.clone());sprite.position.copy(pos);sprite.scale.setScalar(first?1.2:.8);sprite.material.opacity=0;scene.add(sprite);
 const center=new T.Mesh(new T.SphereGeometry(first?.022:.016,8,6),new T.MeshBasicMaterial({color:0x6baeff}));sprite.add(center);
 const w={...(music||(first?{note:0,noteGain:1,chord:'D major',harmonyId:0}:harmony.single())),sprite,base:pos.clone(),position:sprite.position,owner:null,eaten:false,born:time,seed:spawnSerial++*2.39996,first,center};wisps.push(w);return w;
}
function cluster(){
 const forward=starBoost.active?aimDirection.clone():new T.Vector3(0,0,-1).applyEuler(new T.Euler(pitch,yaw,0,'YXZ'));
 spawnHarmonicLights(travelLightPositions(player,forward,Math.random,food));
}
function say(text,seconds=7){narrator.say(text);$('#message').textContent=text;messageUntil=time+seconds;$('#message').style.opacity=1;}
function setStage(){
 const p=phaseFor(food);const texts={
 'first-light':['I / THE FIRST LIGHT','Curiosity','Approach the lonely blue ember.'],
 awakening:['II / A TASTE OF CREATION','Hunger',NARRATION.hunger],
 nebula:['III / THE LIGHT WITHIN','Becoming',NARRATION.nebula],
 star:['IV / A BLUE SUPERGIANT','Growing power','Keep feeding. Even a star has a limit.'],
 singularity:['V / THE DARKNESS WITHIN','Singularity','Feed the newborn singularity. Every swallowed star makes it grow.']};
 const t=texts[p];$('#chapter').textContent=t[0];$('#stage-name').textContent=t[1];$('#objective').textContent=t[2];
 if(p!==phase){if(p==='awakening'&&!opening)say('It’s so… warm.');if(p==='nebula')say(NARRATION.gathering);if(p!=='singularity'&&p!=='star'&&!opening)narrator.say(t[2]);phase=p;}
 $('#count').textContent=`${food} / ${FINAL_STARS}`;
}
let starTime=-1,starEnded=false;
function canSwim(){return finalScene.time<0&&!(starTime>=0&&!starEnded)&&(collapseTime<0||freeplay);}
function consume(w){if(!canSwim()||food>=COLLAPSE&&!freeplay)return;food++;audio.eat(w.note,w.noteGain);setStage();if(food===FINAL_STARS){narrator.clear();finalScene.start(camera,kali);velocity.set(0,0,0);keys.clear();releaseBoostIfUnheld();dashQueued=false;dashTime=0;recoveryTime=0;rollActive=false;microJet.active=false;pulse=0;document.body.classList.add('cinematic');$('#hud').hidden=true;return;}if(food===1)nextSpawn=Infinity;if(food===2){say(NARRATION.secondMeal,5);nextSpawn=time+1.5;}if([4,7,10].includes(food))nextSpawn=time+4;if(food===IGNITION&&!starEnded){starTime=0;narrator.clear();audio.tone(329.63,6,.10);document.body.classList.add('cinematic');$('#hud').hidden=true;keys.clear();releaseBoostIfUnheld();dashQueued=false;dashTime=0;recoveryTime=0;pulse=0;rollActive=false;jetBoost=1;velocity.set(0,0,0);}
if(food===COLLAPSE&&!ended){collapseTime=0;narrator.clear();document.body.classList.add('cinematic');$('#hud').hidden=true;audio.collapse();keys.clear();releaseBoostIfUnheld();dashQueued=false;dashTime=0;recoveryTime=0;pulse=0;rollActive=false;jetBoost=1;}}
function begin(){
 if(started)return;if(audio.enabled)audio.init();started=true;opening=true;openingTime=0;firstSpawned=true;
 player.set(0,0,0);kali.group.position.copy(player);kali.group.quaternion.identity();swimPose.identity();bodyYaw=0;cameraAnchor.copy(player);
 $('#intro').hidden=true;$('#hud').hidden=true;document.body.classList.add('cinematic');age=0;
 openingLight=spawnWisp(openingOrigin,true);openingLight.sprite.scale.setScalar(.45);
 // Keep the ember halo readable as the gripping tip passes in front of it.
 openingLight.sprite.material.depthTest=false;openingLight.sprite.renderOrder=10;
 camera.position.copy(openingOrigin).add(new T.Vector3(.1,.08,1.2));camera.lookAt(openingOrigin);
 narrator.clear();keys.clear();releaseBoostIfUnheld();pointer.set(0,0);
}
function updateOpening(dt){
 openingTime+=dt;
 // Let the first words exist in complete darkness before any light is revealed.
 if(openingTime<8){
  const caption=$('#caption');caption.classList.add('prologue');caption.textContent=NARRATION.opening;
  caption.style.opacity=smooth(0,1.2,openingTime)*(1-smooth(6.8,8,openingTime));
  narrator.say(NARRATION.opening);renderer.clear();return;
 }
 $('#caption').classList.remove('prologue');$('#caption').style.opacity='';
 const revealTime=openingTime-8,shotTime=revealTime<5?revealTime*.4:revealTime-3,rawTime=shotTime<5?shotTime:shotTime<8?5:shotTime-3,t=rawTime<=7?rawTime:rawTime<7+openingMealDuration?7+(rawTime-7)*2/openingMealDuration:rawTime+2-openingMealDuration,arm=kali.arms[0],reach=smooth(1.2,4.6,t),grip=smooth(5.4,6.8,t),meal=smooth(7,9,t);
 const glow=.06+.94*smooth(0,2,t);
 const atmosphere=smooth(.5,3,shotTime)*(1-smooth(15,18,shotTime));openingDust.material.opacity=atmosphere*.8;openingHaze.material.opacity=atmosphere*.2;
 for(let i=0;i<240;i++){const a=i*2.39996,r=.3+((i*71)%239)/65;openingDustData[i*3]=openingOrigin.x+Math.cos(a+time*.025)*r;openingDustData[i*3+1]=openingOrigin.y+Math.sin(a*1.7)*r+Math.sin(time*.22+i)*.15;openingDustData[i*3+2]=openingOrigin.z+Math.sin(a)*r;}openingDustGeo.attributes.position.needsUpdate=true;
 if(t>=2&&t<5.4){$('#caption').textContent=NARRATION.discovery;narrator.say(NARRATION.discovery);}else if(t>=9.3&&t<11.3){$('#caption').textContent=NARRATION.firstMeal;narrator.say(NARRATION.firstMeal);}else if(t>=11.3&&t<15){$('#caption').textContent=NARRATION.sweetness;narrator.say(NARRATION.sweetness);}else $('#caption').textContent='';
 // Preserve each background arm's own radial lane. Pulling all seven tips
 // around the spark made their thick lengths cross through one another.
 for(const other of kali.arms){if(other===arm)continue;other.cinematicGoal=null;other.cinematicBlend=0;}
 const goal=openingOrigin.clone();
 if(t<7){const caress=(1-grip)*.23;goal.add(new T.Vector3(Math.cos(t*2)*caress,Math.sin(t*2)*caress,.04));}
 else goal.lerp(openingMouth,meal);
 arm.cinematicGoal=goal;arm.cinematicBlend=reach*(1-smooth(9.4,11.2,t));
 if(t>=6.8&&!openingCaptured){openingCaptured=true;openingLight.owner=arm.index;arm.target=openingLight;collected++;audio.capture(openingLight.noteGain,openingLight.note);}
 arm.feeding=t>=7&&t<9;arm.elapsed=meal*3.2;
 for(const eye of kali.organicEyes){eye.cinematic.active=true;eye.cinematic.blink=Math.sin(Math.PI*smooth(6,6.65,shotTime))**2;eye.cinematic.dilation=T.MathUtils.lerp(T.MathUtils.lerp(2.3,.65,smooth(5.55,7.3,shotTime)),1,smooth(8,9.5,shotTime));eye.cinematic.reflection=openingEaten?0:glow;}
 const flush=openingEaten?smooth(9,9.6,t)*(1-smooth(10,12.8,t)):0;
 kali.update(time,dt,food,0,0,0,0,0,flush);kali.group.updateMatrixWorld(true);
 if(!openingEaten){
  openingLight.position.copy(openingCaptured?kali.group.localToWorld(arm.tip.clone()):openingOrigin);
  openingLight.sprite.material.opacity=glow*(1-smooth(8.8,9,t));openingLight.center.visible=true;
  if(t>=9){openingEaten=true;openingLight.eaten=true;arm.target=null;arm.feeding=false;scene.remove(openingLight.sprite);wisps.splice(wisps.indexOf(openingLight),1);openingLight.sprite.material.dispose();openingLight.center.geometry.dispose();openingLight.center.material.dispose();consume(openingLight);}
 }
 const lamp=wispLights[0];lamp.position.copy(openingLight.position);lamp.intensity=openingEaten?0:glow*10;
 for(let i=1;i<wispLights.length;i++)wispLights[i].intensity=0;
 // Blue light scattered near the ember supplies soft rim illumination for the macro shots.
 wispLights[1].color.setHex(0x9abfff);wispLights[1].position.copy(openingLight.position).add(new T.Vector3(1,1.8,2));wispLights[1].intensity=glow*14*(1-smooth(12,15,t));
 wispLights[2].color.setHex(0x555dff);wispLights[2].position.set(-2,2,1);wispLights[2].intensity=glow*7*(1-smooth(12,15,t));
 // Establish the ember first; widen for the curious touch, then escort it into the beak.
 const close=openingOrigin.clone().add(new T.Vector3(.1,.08,.95));
 const touch=openingOrigin.clone().add(new T.Vector3(.7,.25,2.3));
 desiredCamera.copy(close).lerp(touch,smooth(2.5,5,t));look.copy(openingOrigin);
 if(t>=7){desiredCamera.copy(goal).add(new T.Vector3(0,-2,2.5));look.copy(goal).lerp(openingMouth,meal*.6);}
 if(t>=9){const reveal=new T.Vector3(3.4,1.4,7);desiredCamera.set(0,-2.95,2.55).lerp(reveal,smooth(9,12,t));look.copy(openingMouth).lerp(new T.Vector3(0,.8,0),smooth(9,12,t));}
 if(t>=12){const handoff=smooth(12,15,t);desiredCamera.lerp(new T.Vector3(1.8,.9,zoom).applyEuler(new T.Euler(pitch,yaw,0,'YXZ')),handoff);const view=new T.Vector3(0,0,-1).applyEuler(new T.Euler(pitch,yaw,0,'YXZ'));look.lerp(desiredCamera.clone().addScaledVector(view,60),handoff);}
 if(shotTime>=5&&shotTime<8){const eyeBlend=smooth(5,5.6,shotTime)*(1-smooth(7.3,8,shotTime));const eye=new T.Vector3(1.4,.3,.02);desiredCamera.lerp(new T.Vector3(2.65,.52,.5),eyeBlend);look.lerp(eye,eyeBlend);}
 camera.position.lerp(desiredCamera,1-Math.exp(-dt*6));camera.lookAt(look);for(const eye of kali.organicEyes)eye.reflectLight(openingLight.position,camera.position);composer.render();
 if(t>=15){for(const eye of kali.organicEyes){eye.cinematic.active=false;eye.reflection.material.opacity=0;}for(const l of wispLights)l.color.setHex(0x329bff);openingDust.visible=false;openingHaze.visible=false;opening=false;for(const other of kali.arms){other.cinematicGoal=null;other.cinematicBlend=0;}arm.cinematicGoal=null;arm.cinematicBlend=0;arm.elapsed=0;arm.feeding=false;swimPose.copy(kali.group.quaternion);cameraAnchor.copy(player);keys.clear();releaseBoostIfUnheld();pointer.set(0,0);dashQueued=false;$('#caption').textContent='';document.body.classList.remove('cinematic');$('#hud').hidden=false;nextSpawn=Infinity;say(NARRATION.hunger);
 const forward=camera.getWorldDirection(new T.Vector3()),above=new T.Vector3(0,1,0).applyQuaternion(camera.quaternion);
 const second=spawnWisp(player.clone().addScaledVector(forward,JET_DISTANCE*2).addScaledVector(above,3));second.fadeSeconds=7;second.lightGain=2;}
}
function setPause(value){if(!started||collapseTime>=0&&!ended)return;paused=value;$('#paused').hidden=!paused;$('#pause').textContent=paused?'▷':'Ⅱ';keys.clear();releaseBoostIfUnheld();pointer.set(0,0);dashQueued=false;}
function reset(){location.href=location.pathname;}
$('#begin').onclick=begin;$('#resume').onclick=()=>setPause(false);$('#pause').onclick=()=>setPause(!paused);$('#restart').onclick=reset;$('#again').onclick=reset;
$('#wordmark').onclick=e=>{e.preventDefault();$('#controls').showModal();};
$('#sound').onclick=()=>{$('#sound span').textContent=audio.toggle()?'ON':'OFF';narrator.setMuted(!audio.enabled);};
$('#help').onclick=()=>{$('#controls').showModal();keys.clear();releaseBoostIfUnheld();};$('#close-help').onclick=()=>$('#controls').close();
$('#continue').onclick=()=>{freeplay=true;$('#ending').hidden=true;$('#hud').hidden=false;$('#objective').textContent='Feed the newborn singularity. Every swallowed star makes it grow.';nextSpawn=time+2;narrator.say(NARRATION.singularity);};
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;if((e.code==='Space'||e.code==='ShiftLeft')&&started&&!opening&&dashTime===0&&!paused&&!$('#controls').open){dashQueued=true;dashPointer.copy(pointer);}if(e.code==='KeyP'||e.code==='Escape'){if($('#controls').open)return;setPause(!paused);}if(e.code==='KeyM')$('#sound').click();if(e.code==='KeyR'&&!$('#controls').open)reset();keys.add(e.code);});
window.addEventListener('keyup',e=>{keys.delete(e.code);releaseBoostIfUnheld();});window.addEventListener('blur',()=>{keys.clear();releaseBoostIfUnheld();if(started&&collapseTime<0)setPause(true);});
$('#world').addEventListener('pointermove',e=>{if(!started||opening||paused||$('#controls').open)return;pointer.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);});
$('#world').addEventListener('pointerleave',()=>pointer.set(0,0));
$('#world').addEventListener('wheel',e=>{zoom=T.MathUtils.clamp(zoom+e.deltaY*.009,4.2,24);},{passive:true});
document.addEventListener('visibilitychange',()=>{last=performance.now();keys.clear();releaseBoostIfUnheld();narrator.setPaused(document.hidden||paused||$('#controls').open);});
function resizeRendering(){const ratio=renderPixelRatio(innerWidth,innerHeight,devicePixelRatio,renderQuality.scale);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight);composer.setPixelRatio(ratio);composer.setSize(innerWidth,innerHeight);starfield.setPixelRatio(ratio);}
resizeRendering();
window.addEventListener('resize',()=>{renderQuality.reset();resizeRendering();});
function updateMovement(dt){
 previousPlayer.copy(player);
 releaseBoostIfUnheld();
 const wasBoosting=starBoost.active;starBoost.update(dt);
 if(wasBoosting&&!starBoost.active)endStarBoost();
 const turn=starBoost.active?STAR_BOOST_STEERING:1;
 if(!attractMode){yaw-=steeringRate(pointer.x)*dt*turn;pitch=T.MathUtils.clamp(pitch+steeringRate(pointer.y)*dt*turn,-1.48,1.48);}
 if(keys.has('ArrowLeft'))yaw+=dt*1.44*turn;if(keys.has('ArrowRight'))yaw-=dt*1.44*turn;if(keys.has('ArrowUp'))pitch=Math.min(1.48,pitch+dt*.96*turn);if(keys.has('ArrowDown'))pitch=Math.max(-1.48,pitch-dt*.96*turn);
 facing.set(0,0,-1).applyEuler(new T.Euler(pitch,yaw,0,'YXZ'));
 direction.set((keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),(keys.has('KeyE')?1:0)-(keys.has('KeyQ')?1:0),(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0));
 direction.applyEuler(new T.Euler(pitch,yaw,0,'YXZ'));
 if(attractMode){let nearest=wisps.filter(w=>!w.eaten&&w.owner===null).sort((a,b)=>a.position.distanceToSquared(player)-b.position.distanceToSquared(player))[0];if(nearest){direction.copy(nearest.position).sub(player);if(direction.length()<3)direction.set(0,0,0);else direction.normalize();}}
 const moving=direction.lengthSq()>.01;if(moving)direction.normalize();cooldown=Math.max(0,cooldown-dt);let impulse=0;
 const previousDash=dashTime;dashTime=starBoost.active?JET_DURATION:Math.max(0,dashTime-dt);if(previousDash>0&&dashTime===0){recoveryTime=JET_RECOVERY;if(pendingTravelLights)spawnTravelLights();}else recoveryTime=Math.max(0,recoveryTime-dt);
 if(dashQueued&&dashTime===0){aimRay.setFromCamera(dashPointer,camera);aimDirection.copy(jetAim(aimRay.ray,player,wisps));dashTime=JET_DURATION;recoveryTime=0;jetPose.setFromUnitVectors(new T.Vector3(0,1,0),aimDirection);pulse=1;beginJetRoll();velocity.copy(aimDirection).multiplyScalar(JET_SPEED*jetBoost);recordTravelJet(aimDirection);audio.jet();}dashQueued=false;
 if(moving&&cooldown===0&&dashTime===0){pulse=1;cooldown=1.45;impulse=1.9;}
 if(starBoost.active){
  // The camera remains upright; propulsion and the longitudinal roll follow its heading.
  aimDirection.lerp(facing,1-Math.exp(-dt*9)).normalize();jetPose.setFromUnitVectors(new T.Vector3(0,1,0),aimDirection);
  velocity.lerp(tmp.copy(aimDirection).multiplyScalar(JET_SPEED*STAR_BOOST_SPEED),1-Math.exp(-dt*10));dashTime=JET_DURATION;recoveryTime=0;
 }else{const vv=integrateVelocity(velocity.toArray(),direction.toArray(),dt,impulse,dashTime>0,recoveryTime/JET_RECOVERY,jetBoost);velocity.fromArray(vv);}
 player.addScaledVector(velocity,dt);pulse*=Math.exp(-dt*4.4);
 const floating=!moving&&dashTime===0&&velocity.length()<.15;
 const bobTarget=floating?.065*Math.sin(time*.85)+.015*Math.sin(time*.43+1.2):0;
 idleBob=T.MathUtils.lerp(idleBob,bobTarget,1-Math.exp(-dt*(floating?2:8)));
 kali.group.position.copy(player);kali.group.position.y+=idleBob;
 // Looking around changes the camera orbit only. Body heading follows propulsion.
 const bodyDirection=dashTime>0?aimDirection:moving?direction:null;
 if(bodyDirection)pathHeading.copy(bodyDirection);
 if(bodyDirection&&Math.hypot(bodyDirection.x,bodyDirection.z)>.001)bodyYaw=Math.atan2(-bodyDirection.x,-bodyDirection.z);
 kali.group.updateWorldMatrix(true,true);
 const attention=nearestPathLight(wisps,player,pathHeading);let eyeLean=0;
 for(const eye of kali.organicEyes)eye.gazeTarget.set(0,0);
 if(attention){
  const eyeGroup=nearerEye(kali.eyeGroups,attention.position),index=kali.eyeGroups.indexOf(eyeGroup),eye=kali.organicEyes[index];
  const eyeLocal=eyeGroup.worldToLocal(attention.position.clone());eye.gazeTarget.set(T.MathUtils.clamp(-Math.atan2(eyeLocal.y,Math.max(.01,eyeLocal.z)),-.23,.23),T.MathUtils.clamp(Math.atan2(eyeLocal.x,Math.max(.01,eyeLocal.z)),-.28,.28));
  if(dashTime===0&&!rollActive&&!moving&&recoveryTime<.5){const d=attention.position.clone().sub(player),sign=index===0?-1:1,targetYaw=Math.atan2(-d.z,d.x)+(sign<0?Math.PI:0),delta=Math.atan2(Math.sin(targetYaw-bodyYaw),Math.cos(targetYaw-bodyYaw));bodyYaw+=T.MathUtils.clamp(delta,-dt*.4,dt*.4);eyeLean=T.MathUtils.clamp(Math.atan2(d.y,Math.hypot(d.x,d.z))*sign,-.2,.2);}
 }
 if(dashTime>0||rollActive||microJet.active){rot.copy(jetPose);}
 else{rot.setFromEuler(new T.Euler(moving?-.14:0,bodyYaw,eyeLean,'YXZ'));rot.slerp(jetPose,smooth(0,JET_RECOVERY,recoveryTime));}
 swimPose.slerp(rot,1-Math.exp(-dt*(dashTime>0?16:8)));
 // Apply the roll after steering smoothing; carry its final bank into the recovery pose.
 // Ordinary rolls run at 80% speed; fueled boost spin has its own clock below.
 if(rollActive&&!boostRolling)rollElapsed+=dt*.8;
 if(boostRolling){
  if(starBoost.active)boostAngularSpeed=T.MathUtils.lerp(boostAngularSpeed,Math.sign(rollTarget)*TAU*1.15*1.3,1-Math.exp(-dt*7));
  else {boostCoast+=dt;boostAngularSpeed*=Math.exp(-dt*9);}
  boostSpin+=boostAngularSpeed*dt;
 }
 rollAngle=boostRolling?boostSpin:rollActive?stabilizedRollAngle(rollElapsed,rollTarget,rollSlowDegrees,rollCorrectionDegrees):0;
 kali.group.quaternion.copy(swimPose);
 if(boostRolling){rollPose.setFromAxisAngle(new T.Vector3(0,1,0),rollAngle);kali.group.quaternion.multiply(rollPose);if(!starBoost.active&&boostCoast>=.55){swimPose.copy(kali.group.quaternion);jetPose.copy(swimPose);rollActive=false;boostRolling=false;}}
 else if(rollActive){rollPose.setFromAxisAngle(rollAxis,rollAngle);kali.group.quaternion.premultiply(rollPose);if(rollElapsed>=ROLL_FINISH_TIME){swimPose.copy(kali.group.quaternion);jetPose.premultiply(rollPose);rollActive=false;}}
 else if(microJet.active){microElapsed+=dt;rollPose.setFromAxisAngle(rollAxis,smallJetAngle(microElapsed,microJet.angle,microJet.duration));kali.group.quaternion.premultiply(rollPose);if(microElapsed>=microJet.duration+SMALL_JET_SETTLE_TIME){swimPose.copy(kali.group.quaternion);jetPose.premultiply(rollPose);microJet.active=false;}}
 $('#speed').textContent=velocity.length().toFixed(1)+' / VELOCITY';$('#jet-status').textContent=dashTime>0?'JET / STREAMLINED':recoveryTime>0?'GLIDING / JET READY':moving?'SWIMMING / JET READY':'DRIFTING / JET READY';$('#jet-bar').style.transform=`scaleX(${dashTime>0?1-dashTime/JET_DURATION:1})`;
}
function updateWisps(dt){
 kali.group.updateMatrixWorld(true);
 for(let i=wisps.length-1;i>=0;i--){const w=wisps[i];if(w.eaten||food>=2&&w.owner===null&&w.position.distanceTo(player)>85){scene.remove(w.sprite);w.sprite.material.dispose();w.center.geometry.dispose();w.center.material.dispose();wisps.splice(i,1);continue;}
   const born=smooth(w.first?2:0,w.first?6:(w.fadeSeconds||3),time-w.born);w.sprite.material.opacity=born*(.77+.15*Math.sin(time*1.5+w.seed));w.center.visible=born>.05;
   const distance=w.position.distanceTo(camera.position),white=smooth(22,90,distance);w.brightness=proximityBrightness(w.position.distanceTo(player))*(w.lightGain||1);w.sprite.material.color.setRGB(.08+.68*white,.32+.52*white,1).multiplyScalar(w.brightness);w.center.material.color.copy(w.sprite.material.color);
   if(w.owner===null){w.position.copy(w.base);w.position.x+=Math.sin(time*.22+w.seed)*.55;w.position.y+=Math.sin(time*.33+w.seed)*.55-(time-w.born)*.025;w.position.z+=Math.cos(time*.24+w.seed)*.35;}
 }
 if(age>5){
   const movingInput=['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE'].some(k=>keys.has(k));
   const settled=dashTime===0&&velocity.length()<.45&&!movingInput&&!kali.arms.some(a=>a.grabPoint);
   settledTime=settled?settledTime+dt:0;
   if(canSwim()){const path=new T.Line3(previousPlayer,player);for(const w of wisps){if(w.eaten||w.owner!==null||time-w.born<2)continue;path.closestPointToPoint(w.position,true,tmp);if(tmp.distanceTo(w.position)<=REACH){const arm=captureLight(kali.arms,w);if(arm){arm.grabPoint=w.position.clone();arm.grabTime=0;arm.grabLight=w;collected++;audio.capture(w.noteGain,w.note);}}}}
   const feeders=feedingArms(kali.arms,settledTime>.35&&(canSwim()),Math.random,dt);
   for(const arm of kali.arms){
     arm.feeding=canSwim()&&feeders.includes(arm);
     arm.feedBlend=T.MathUtils.lerp(arm.feedBlend||0,arm.feeding?1:0,1-Math.exp(-dt*6));
     if(arm.target){const eaten=advanceFeeding(arm,dt,arm.feeding);if(eaten){consume(eaten);nextMeal(arm);}}
     const carried=[...(arm.target?[arm.target]:[]),...(arm.cargo||[])];
     for(let i=0;i<carried.length;i++){const w=carried[i];if(arm.grabLight===w&&arm.grabTime<GRAB_REACH_TIME)continue;const p=i===0?arm.tip:arm.points[Math.max(28,46-i*3)];tmp.copy(p);if(i>0){tmp.x+=Math.sin(time*2+i)*.12;tmp.z+=Math.cos(time*2+i)*.12;}kali.group.localToWorld(tmp);w.position.lerp(tmp,1-Math.exp(-dt*(i===0&&arm.feeding?22:12)));}
   }
 }
 // Light pools are attached only to actual wisps, never to invisible fill lights.
 const near=wisps.filter(w=>!w.eaten).sort((a,b)=>a.position.distanceToSquared(player)-b.position.distanceToSquared(player));
 for(let i=0;i<wispLights.length;i++){const w=near[i],l=wispLights[i];l.intensity=w?w.sprite.material.opacity*(w.first?42:18)*(w.brightness||1):0;if(w)l.position.copy(w.position);}
 let si=0;for(const w of wisps){for(let j=0;j<24&&si<1400;j++,si++){const u=j/24,a=w.seed+j*2.399+time*.23,r=.05+u*.48;snowPos[si*3]=w.position.x+Math.sin(a)*r;snowPos[si*3+1]=w.position.y+u*1.4;snowPos[si*3+2]=w.position.z+Math.cos(a)*r;const b=(1-u)*w.sprite.material.opacity;snowColor.set([b*.1,b*.42,b*.9],si*3);}}snowGeo.setDrawRange(0,si);snowGeo.attributes.position.needsUpdate=true;snowGeo.attributes.color.needsUpdate=true;
 // A formed singularity draws twice the blue-light flow into her void.
 const spawnRate=(food>=COLLAPSE?2:1)*(starBoost.active?2:1),fieldLimit=Math.min(28,MAX_WISPS+Math.floor(food/8)*3)*spawnRate,batch=6;
 if(started&&food>=2&&(canSwim())&&time>nextSpawn){if(wisps.length<=fieldLimit-batch)cluster();nextSpawn=time+(food<14?8:SPAWN_INTERVAL)/spawnRate;}
 starfield.update(time,dt,food,player,(p,room)=>{
  if(room<1)return 0;
  // Approached background stars must be collectible even during discovery
  // or when only one slot remains in the blue-light field.
  if(food<14||room===1){const w=spawnWisp(p);if(p.distanceTo(player)<=REACH+5)w.born=time-3;return 1;}
  const count=Math.min(room,clusterCount());
  const heading=p.clone().sub(player).normalize(),right=new T.Vector3().crossVectors(heading,new T.Vector3(0,1,0));
  if(right.lengthSq()<.001)right.set(1,0,0);right.normalize();
  spawnHarmonicLights(lightClusterPositions(p,right,new T.Vector3().crossVectors(right,heading).normalize(),count));return count;
 },canSwim()?Math.max(0,fieldLimit-wisps.length):0);
}
function updateStarCinematic(dt){
 starTime+=dt;const t=starTime;
 const line=t<4?NARRATION.ignition:t<9?NARRATION.giant:'';
 $('#caption').textContent=line;if(line)narrator.say(line);
 kali.core.getWorldPosition(look);
 const angle=-.7+t*.10,dist=T.MathUtils.lerp(7,5.2,smooth(0,6,t));
 desiredCamera.set(Math.sin(angle)*dist,1.3+Math.sin(t*.25)*.35,Math.cos(angle)*dist).add(look);
 if(t>=11){starEnded=true;keys.clear();releaseBoostIfUnheld();pointer.set(0,0);dashQueued=false;cameraAnchor.copy(player);
  camera.getWorldDirection(facing);yaw=Math.atan2(-facing.x,-facing.z);pitch=Math.asin(T.MathUtils.clamp(facing.y,-1,1));
  document.body.classList.remove('cinematic');$('#caption').textContent='';$('#hud').hidden=false;nextSpawn=time+2;
  say(NARRATION.star,8);
 }
}
function updateCinematic(dt){
 collapseTime+=dt;velocity.multiplyScalar(Math.exp(-dt*2));const t=collapseTime;
 const c=t<5?NARRATION.hungered:t<10?NARRATION.escape:t<17?NARRATION.darkness:'';$('#caption').textContent=c;narrator.say(c);
 const angle=(t*.12),dist=T.MathUtils.lerp(12,7,smooth(0,7,t));kali.core.getWorldPosition(look);desiredCamera.set(Math.sin(angle)*dist,2.4+Math.sin(t*.2),Math.cos(angle)*dist).add(look);
 const flash=Math.exp(-Math.pow((t-9.7)*3,2))*.8;$('#flash').style.opacity=flash;
 shock.position.copy(look);shock.quaternion.copy(camera.quaternion);shock.scale.setScalar(1+Math.max(0,t-9.7)*8);shock.material.opacity=t>9.7?Math.max(0,1-(t-9.7)/3)*.6:0;
 if(t>20){
  ended=true;freeplay=true;attractMode=false;
  document.body.classList.remove('cinematic');$('#caption').textContent='';$('#ending').hidden=true;$('#hud').hidden=false;
  // Keep the final lines as an in-game message, with uninterrupted narration.
  say(NARRATION.ending,14);narrator.say(NARRATION.singularity);
  $('#objective').textContent='Feed the newborn singularity. Every swallowed star makes it grow.';nextSpawn=time+2;
  keys.clear();releaseBoostIfUnheld();pointer.set(0,0);dashQueued=false;dashTime=0;recoveryTime=0;pulse=0;rollActive=false;jetBoost=1;velocity.set(0,0,0);cameraAnchor.copy(player);
  camera.getWorldDirection(facing);yaw=Math.atan2(-facing.x,-facing.z);pitch=Math.asin(T.MathUtils.clamp(facing.y,-1,1));
 }
}
function frame(now){
 requestAnimationFrame(frame);const frameMs=now-last,dt=Math.min(frameMs/1000,.04);last=now;
 narrator.setPaused(paused||$('#controls').open||document.hidden);finalScene.setPaused(paused||$('#controls').open||document.hidden,!audio.enabled);
 if(paused||$('#controls').open||document.hidden){renderQuality.reset();return;}
 if(time>5&&renderQuality.sample(frameMs))resizeRendering();
 time+=dt;if(started)age+=dt;
 if(opening){updateOpening(dt);return;}
 if(started&&(canSwim()))updateMovement(dt);
 if(!started){kali.group.position.set(3.7,0,-1);kali.group.rotation.set(.12,-.4,.18);}
 const collapsing=collapseTime>=0&&!ended,igniting=starTime>=0&&!starEnded,cinematic=collapsing||igniting||finalScene.time>=0;
 // Let the body surge ahead of a trailing position anchor; view direction still follows the mouse.
 const spinTrail=jetBoost>1?(dashTime>0?1:recoveryTime/JET_RECOVERY):0;
 const followRate=dashTime>0?(spinTrail?2.2:4.2):recoveryTime>0?5+7*(1-recoveryTime/JET_RECOVERY)-2*spinTrail:12;
 cameraAnchor.lerp(player,1-Math.exp(-dt*followRate));
 tmp.copy(cameraAnchor).sub(player).clampLength(0,3+3*spinTrail);cameraAnchor.copy(player).add(tmp);
 if(igniting)updateStarCinematic(dt);
 else if(collapsing)updateCinematic(dt);
 else{desiredCamera.set(1.8,.9,zoom).applyEuler(new T.Euler(pitch,yaw,0,'YXZ')).add(cameraAnchor);look.copy(desiredCamera).addScaledVector(facing,60);if(!started){desiredCamera.set(0,2.3,17);look.set(0,-.3,0);}if(ended&&!freeplay){desiredCamera.set(5,3,12).add(player);look.copy(player).add(new T.Vector3(-2,0,0));}}
 camera.position.lerp(desiredCamera,1-Math.exp(-dt*(cinematic?1.4:8)));if(started&&!cinematic&&(!ended||freeplay))look.copy(camera.position).addScaledVector(facing,60);camera.lookAt(look);
 if(started&&!firstSpawned&&age>2){firstSpawned=true;const forward=camera.getWorldDirection(new T.Vector3());spawnWisp(camera.position.clone().addScaledVector(forward,zoom+JET_DISTANCE*4),true);}
 const collapse=collapseTime<0?0:Math.min(1,collapseTime/15);
 kali.update(time,dt,food,pulse,velocity.length(),collapse,dashTime>0?1:smooth(0,JET_RECOVERY,recoveryTime),mantlePressureFor(dashTime,recoveryTime,pulse),0,igniting?smooth(0,5,starTime):1);if(started)updateWisps(dt);
 boostTrail.update(dt,starBoost.active,player,aimDirection,time);
 if(collapseTime>=0){kali.core.getWorldQuaternion(kali.photon.quaternion);kali.photon.quaternion.invert().multiply(camera.quaternion);}
 $('#message').style.opacity=time<messageUntil?'1':'0';
 jetParticles.material.opacity=food>0?.25:0;
 for(let i=0;i<150;i++){jetLife[i]-=dt;if(jetLife[i]>0){for(let k=0;k<3;k++)jetArr[i*3+k]+=jetVel[i*3+k]*dt;}else{jetArr[i*3]=player.x;jetArr[i*3+1]=player.y;jetArr[i*3+2]=player.z;}}
 if(pulse>.2||dashTime>0){for(let j=0;j<(dashTime>0?8:3);j++){const i=jetIndex++%150;jetLife[i]=1.5;tmp.set(0,-.7,.1).applyQuaternion(kali.group.quaternion).add(player);for(let k=0;k<3;k++){jetArr[i*3+k]=tmp.getComponent(k)+(Math.random()-.5)*.2;jetVel[i*3+k]=-facing.getComponent(k)*(dashTime>0?12:3)+(Math.random()-.5)*.7;}}}jetGeo.attributes.position.needsUpdate=true;
 if(finalScene.time>=0)finalScene.update(dt,kali,camera,$('#caption'));
 horizon.uniforms.amount.value=smooth(.65,.78,collapse);horizon.uniforms.aspect.value=camera.aspect;horizon.enabled=collapse>.6;
 if(collapse>.6)updateHorizonProjection(camera,kali.hole,horizon.uniforms);
 if(started)innerCosmos.draw(time,food,collapse,kali.hole.scale.x);
 composer.render();
}
camera.position.set(0,2.3,17);requestAnimationFrame(frame);
// Read-only telemetry makes full-loop smoke tests possible without bypassing feeding.
window.kaliDemo={get state(){return {boosting:starBoost.active,boostBurned:starBoost.burned,boostRolling,finalTime:finalScene.time,started,opening,openingTime,starTime,starEnded,paused,food,phase:phaseFor(food),rollActive,rollAngle,rollTarget,jetBoost,rollCount,jetsSinceRoll,nextRollJet,travelJets,travelClusters,backgroundStars:starfield.count,cameraDistance:zoom,cameraLag:cameraAnchor.distanceTo(player),cameraPosition:camera.position.toArray(),bodyQuaternion:kali.group.quaternion.toArray(),blackHoleScale:kali.hole.scale.x,nebulaVisible:kali.nebula.visible,arms:kali.arms.length,activeArms:kali.arms.filter(a=>a.target).length,captured:wisps.filter(w=>w.owner!==null&&!w.eaten).length,collected,mealProgress:kali.arms.map(a=>a.elapsed),feeding:kali.arms.filter(a=>a.feeding).length,wisps:wisps.length,wispDistances:wisps.map(w=>w.position.distanceTo(player)),wispScreens:wisps.map(w=>w.position.clone().project(camera).toArray()),jetDistance:JET_DISTANCE,cameraForward:camera.getWorldDirection(new T.Vector3()).toArray(),yaw,pitch,dashTime,recoveryTime,upright:new T.Vector3(0,1,0).applyQuaternion(kali.group.quaternion).y,cameraHeight:camera.position.y-player.y,bumps:0,skinGlow:kali.mantle.material.emissive.b,armSpread:kali.arms.reduce((s,a)=>s+Math.hypot(a.tip.x,a.tip.z),0)/8,position:player.toArray(),velocity:velocity.length(),collapseTime,ended,freeplay,renderCalls:renderer.info.render.calls};}};
if(attractMode)begin();









