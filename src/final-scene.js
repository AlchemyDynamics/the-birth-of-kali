import * as T from 'three';
import {smooth} from './simulation.js';
export class FinalScene{
 constructor(){this.time=-1;this.played=new Set();this.sounds={};for(const [id,volume] of [['lion-roar',.8],['gasp',.7],['confrontation',.85]]){const a=new Audio(`assets/cinematic/${id}.mp3`);a.preload='auto';a.volume=volume;this.sounds[id]=a;}this.startCamera=new T.Vector3();this.entry=new T.Vector3();}
 start(camera,creature){this.time=0;this.startCamera.copy(camera.position);const center=creature.core.getWorldPosition(new T.Vector3());this.eye=creature.eyeGroups.reduce((best,e)=>e.getWorldPosition(new T.Vector3()).distanceToSquared(camera.position)<best.getWorldPosition(new T.Vector3()).distanceToSquared(camera.position)?e:best);this.entry.set(0,0,1).applyQuaternion(this.eye.getWorldQuaternion(new T.Quaternion())).normalize();}
 setPaused(paused,muted){for(const a of Object.values(this.sounds)){a.muted=muted;if(paused){if(!a.paused){a.pause();a.resumeAfterPause=true;}}else if(a.resumeAfterPause){a.resumeAfterPause=false;a.play().catch(()=>{});}}}
 play(id){if(this.played.has(id))return;this.played.add(id);this.sounds[id].play().catch(()=>{});}
 update(dt,creature,camera,caption){
  if(this.time<0)return;this.time=Math.min(24,this.time+dt);const t=this.time;
  this.play('lion-roar');if(t>=1.8)this.play('gasp');if(t>=3.4)this.play('confrontation');
  caption.textContent=t>=3.4&&t<9?'You dare destroy my light!?':'';
  for(const eye of creature.organicEyes){eye.cinematic.active=true;eye.cinematic.blink=smooth(8,10,t);eye.cinematic.dilation=1+.5*(1-smooth(3,8,t));}
  const center=creature.core.getWorldPosition(new T.Vector3());
  const eye=this.eye.getWorldPosition(new T.Vector3());
  const close=eye.clone().addScaledVector(this.entry,2.2);
  const inward=center.clone().addScaledVector(this.entry,1.55);
  camera.position.copy(this.startCamera).lerp(close,smooth(1.5,7,t)).lerp(inward,smooth(10,21,t));
  camera.lookAt(eye.clone().lerp(center,smooth(9,16,t)));camera.near=.025;camera.updateProjectionMatrix();
  creature.mantle.material.opacity*=1-smooth(12,16,t);
  if(t>=18)for(const child of creature.group.children)if(child!==creature.core)child.visible=false;
 }
}
