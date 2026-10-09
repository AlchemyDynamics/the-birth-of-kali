import {composeMeal} from './feeding-music.js';
export const IGNITION=24, COLLAPSE=56, REACH=6.8;
export function phaseFor(n){return n>=COLLAPSE?'singularity':n>=IGNITION?'star':n>=8?'nebula':n>=1?'awakening':'first-light';}
export function smooth(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
export function integrateVelocity(v,input,dt,impulse=0,dashing=false,recovery=0,jetBoost=1){
  const moving=Math.hypot(...input)>.01;
  // Release the controls to brake; keep responsive propulsion while swimming.
  const damping=Math.exp(-(dashing?.28:recovery>0?6.5-4*recovery:moving?1.15:6.5)*dt);
  if(moving&&!dashing){const len=Math.hypot(...input),axis=input.map(x=>x/len),along=v.reduce((s,x,i)=>s+x*axis[i],0),lateral=Math.exp(-6*dt);for(let i=0;i<3;i++)v[i]=axis[i]*along+(v[i]-axis[i]*along)*lateral;}
  for(let i=0;i<3;i++)v[i]=(v[i]+input[i]*(5.2*dt+impulse))*damping;
  const limit=dashing||recovery>0?25*jetBoost:10;
  const speed=Math.hypot(...v);if(speed>limit)for(let i=0;i<3;i++)v[i]*=limit/speed;
  if(!moving&&!dashing&&speed<.06)v.fill(0);
  return v;
}
export const JET_SPEED=21,JET_DURATION=.45,JET_RECOVERY=1.6;
export function mantlePressureFor(dashTime,recoveryTime,pulse=0){
 if(dashTime>0){const elapsed=JET_DURATION-dashTime;return .22*(1-smooth(0,.1,elapsed))-.34*smooth(.04,.3,elapsed);}
 if(recoveryTime>0){const refill=1-recoveryTime/JET_RECOVERY;return -.34*smooth(0,JET_RECOVERY,recoveryTime)+.12*Math.sin(Math.PI*refill);}
 return -pulse*.12;
}
// Measure travel using the same burst and braking rules as gameplay.
export function jetTravelDistance(){let v=[0,0,-JET_SPEED],distance=0;const dt=1/240;for(let t=0;t<4;t+=dt){const recovery=t<JET_DURATION?0:Math.max(0,1-(t-JET_DURATION)/JET_RECOVERY);integrateVelocity(v,[0,0,0],dt,0,t<JET_DURATION,recovery);distance+=Math.hypot(...v)*dt;}return distance;}
export const JET_DISTANCE=jetTravelDistance();
export const SPAWN_DISTANCE=JET_DISTANCE*3, SPAWN_SPREAD=.12, SPAWN_INTERVAL=24, MAX_WISPS=12;
export function steeringRate(value){const a=Math.abs(value);return a<.12?0:Math.sign(value)*Math.pow((Math.min(a,1)-.12)/.88,1.4)*1.38;}
// A wisp is reserved by exactly one arm. Consumption is committed only at the mouth.
export function reserve(arm,wisp){if(arm.target||wisp.owner!==null||wisp.eaten)return false;arm.target=wisp;arm.elapsed=0;arm.mealDuration=null;arm.feedDelay=0;wisp.owner=arm.index;return true;}
// Choose once per meal; pauses preserve both progress and its 1-2 second duration.
export function advanceFeeding(arm,dt,canFeed=true){if(!arm.target||!canFeed)return null;if(arm.feedDelay>0){const waiting=Math.min(dt,arm.feedDelay);arm.feedDelay-=waiting;dt-=waiting;if(dt<=0)return null;}arm.mealDuration??=1+Math.random();arm.elapsed+=dt*3.2/arm.mealDuration;if(arm.elapsed<3.2-1e-9)return null;const w=arm.target;w.eaten=true;arm.target=null;return w;}
export function captureLight(arms,wisp){
 if(wisp.owner!==null||wisp.eaten)return null;
 const arm=arms.reduce((best,a)=>((a.target?1:0)+(a.cargo?.length||0)<(best.target?1:0)+(best.cargo?.length||0))?a:best);
 arm.cargo??=[];
 if(!arm.target)reserve(arm,wisp);else{arm.cargo.push(wisp);wisp.owner=arm.index;}
 return arm;
}
export function nextMeal(arm){arm.target=arm.cargo?.shift()||null;arm.elapsed=0;arm.mealDuration=null;arm.feedDelay=0;}

const feedingBatches=new WeakMap();
export function feedingArms(arms,canFeed,random=Math.random){
 if(!canFeed)return [];
 const existing=feedingBatches.get(arms)?.filter(({arm,target})=>arm.target===target&&!target.eaten);
 if(existing?.length)return existing.map(entry=>entry.arm);
 const available=arms.filter(a=>a.target);if(!available.length)return [];
 // Roll once per batch, not every frame or when a paused meal resumes.
 const music=available.every(a=>Number.isFinite(a.target.note))?composeMeal(arms,available,random):null;
 const selected=music?music.selected:available.slice(0,1+Math.floor(random()*3));
 const fresh=selected.filter(a=>a.mealDuration==null);
 if(fresh.length){const duration=music?music.duration:1+random(),spacing=music?music.spacing:.22+random()*.16;for(const [i,arm] of fresh.entries()){arm.mealDuration=duration;arm.feedDelay=i*spacing;}}
 feedingBatches.set(arms,selected.map(arm=>({arm,target:arm.target})));return selected;
}

export const GRAB_REACH_TIME=.2/.9;
