import {createArmBehavior,updateArmBehavior} from './arm-behavior.js';
// Reduced position-based muscle/contact test. Units are normalized, not calibrated newtons.
export const ARM_COUNT=8, SEGMENTS=24, STEP=1/120;
const TAU=Math.PI*2,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const length=v=>Math.hypot(...v),sub=(a,b)=>a.map((v,i)=>v-b[i]);
function add(p,v,s){for(let k=0;k<3;k++)p[k]+=v[k]*s;}
function lerp(a,b,t){return a.map((v,i)=>v+(b[i]-v)*t);}
export function armRadius(u){const t=clamp((u-.88)/.12);return (.43*Math.pow(1-u,1.3)+.017)*(1-t*t*(3-2*t));}
function path(angle,u,closed,ball,strength){
 const dr=[Math.cos(angle),0,Math.sin(angle)],root=[dr[0]*.72,-.22,dr[2]*.72];
 const open=[dr[0]*(.72+3.45*u),-.22-4.1*u+.25*Math.sin(u*Math.PI),dr[2]*(.72+3.45*u)];
 let grip;
 if(u<.26){const shoulder=[ball[0]+dr[0]*1.22,ball[1]+1.05,ball[2]+dr[2]*1.22];grip=lerp(root,shoulder,u/.26);}
 else{const phi=.65+(u-.26)/.74*2.06,r=1.15+armRadius(u)-.045-.20*strength;
 grip=[ball[0]+dr[0]*Math.sin(phi)*r,ball[1]+Math.cos(phi)*r,ball[2]+dr[2]*Math.sin(phi)*r];}
 return lerp(open,grip,closed);
}
export function createGripSimulation({exploration=false}={}){
 const state={time:0,activation:0,squeeze:.55,command:0,enabled:Array(8).fill(true),ball:{p:[0,-3,0],v:[0,0,0],radius:1.15,invMass:.12},arms:[],contacts:[],load:0,netForce:[0,0,0],perArm:Array(8).fill(0),maxStretch:0,maxPenetration:0};
 const radii=Array.from({length:SEGMENTS+1},(_,j)=>armRadius(j/SEGMENTS));
 let accumulator=0;
 function reset(){state.time=state.activation=state.command=0;state.ball.p=[0,-3,0];state.ball.v=[0,0,0];state.contacts=[];state.load=0;state.netForce=[0,0,0];state.maxStretch=state.maxPenetration=0;state.perArm.fill(0);state.enabled.fill(true);state.arms=Array.from({length:8},(_,a)=>{const angle=a*TAU/8+Math.PI/8,points=Array.from({length:SEGMENTS+1},(_,j)=>path(angle,j/SEGMENTS,0,state.ball.p,0));return {angle,points,vel:points.map(()=>[0,0,0]),rest:points.slice(1).map((p,j)=>length(sub(p,points[j]))),contraction:1,radiusScale:1,localActivation:0,senses:createArmBehavior(a),goal:points.map(p=>p.slice())};});accumulator=0;}
 reset();
 function step(dt){
 state.time+=dt;state.activation+=(state.command-state.activation)*(1-Math.exp(-dt*2.2));
 // Longitudinal contraction trades length for cross section (constant tissue volume).
 for(const [a,arm] of state.arms.entries()){
  arm.localActivation+=((state.enabled[a]?state.activation:0)-arm.localActivation)*(1-Math.exp(-dt*5));
  arm.contraction=1-.16*arm.localActivation;arm.radiusScale=1/Math.sqrt(arm.contraction);
 }
 const b=state.ball,oldBall=b.p.slice();b.v=b.v.map(v=>v*Math.exp(-dt*.7));add(b.p,b.v,dt);
 const old=state.arms.map(arm=>arm.points.map(p=>p.slice()));
 // Distributed muscle drives are smoothed and delayed toward the distal arm.
 for(let a=0;a<8;a++){const arm=state.arms[a];
 const gap=Math.min(...arm.points.slice(3).map((p,j)=>length(sub(p,b.p))-b.radius-radii[j+3]*arm.radiusScale));
 updateArmBehavior(arm.senses,{touch:gap<.055?1:0,chemical:Math.exp(-Math.max(0,gap)*1.2)*.55,strain:state.maxStretch,load:state.perArm[a]/300,anchored:state.activation>.8&&gap<.055},dt,state.time);
 for(let j=1;j<=SEGMENTS;j++){
  const u=j/SEGMENTS,active=state.enabled[a]?Math.min(1,state.activation+(exploration?.18*arm.senses.chemical*(1-state.activation):0)):0,goal=path(arm.angle,u,active,[0,-3,0],state.squeeze);
  if(exploration){const envelope=Math.sin(Math.PI*u)**2*(1-.82*state.activation),sense=arm.senses;
   goal[0]+=(Math.cos(arm.angle)*sense.bow-Math.sin(arm.angle)*sense.sweep)*envelope*1.15;
   goal[2]+=(Math.sin(arm.angle)*sense.bow+Math.cos(arm.angle)*sense.sweep)*envelope*.62;
   goal[1]+=.16*Math.sin(state.time*.38+a*1.7)*envelope;
  }
  arm.goal[j]=lerp(arm.goal[j],goal,1-Math.exp(-dt*(9-4*u)));
  const p=arm.points[j],v=arm.vel[j],drive=sub(arm.goal[j],p),gain=Math.min(90,100/(length(drive)||1e-8));for(let k=0;k<3;k++){const force=drive[k]*gain;v[k]=(v[k]+force*dt)*Math.exp(-dt*9);p[k]+=v[k]*dt;}
 }}
 const lambdas=Array.from({length:8},()=>new Float64Array(SEGMENTS+1));
 // All constraints use the same fixed timestep. Contact reactions move both arm and ball.
 for(let iteration=0;iteration<16;iteration++){
  // Distributed bending resistance removes accordion buckling without hinge joints.
  for(const arm of state.arms)for(let j=1;j<SEGMENTS;j++){
   const p=arm.points[j-1],q=arm.points[j],r=arm.points[j+1];
   const ax=q[0]-p[0],ay=q[1]-p[1],az=q[2]-p[2],bx=r[0]-q[0],by=r[1]-q[1],bz=r[2]-q[2];
   const cosine=(ax*bx+ay*by+az*bz)/(Math.hypot(ax,ay,az)*Math.hypot(bx,by,bz)||1);
   const weight=cosine<.97?.24:.035;
   for(let k=0;k<3;k++){const correction=((p[k]+r[k])*.5-q[k])*weight;q[k]+=correction;if(j>1)p[k]-=correction*.5;r[k]-=correction*.5;}
  }
  for(let a=0;a<8;a++){const arm=state.arms[a];for(let j=1;j<=SEGMENTS;j++){
   const p=arm.points[j-1],q=arm.points[j],x=q[0]-p[0],y=q[1]-p[1],z=q[2]-p[2],d=Math.hypot(x,y,z)||1e-8,w0=j===1?0:1;
   const correction=(d-arm.rest[j-1]*arm.contraction)/((w0+1)*d);p[0]+=x*correction*w0;p[1]+=y*correction*w0;p[2]+=z*correction*w0;q[0]-=x*correction;q[1]-=y*correction;q[2]-=z*correction;
  }}
  // Adjacent arms keep their individual lanes, with finite thickness outside the crown.
  for(let a=0;a<8;a++)for(let j=5;j<=SEGMENTS;j++)for(let offset=-1;offset<=1;offset++){
   const k=j+offset;if(k<5||k>SEGMENTS)continue;const p=state.arms[a].points[j],q=state.arms[(a+1)%8].points[k];let x=q[0]-p[0],y=q[1]-p[1],z=q[2]-p[2],d=Math.hypot(x,y,z);const min=(radii[j]*state.arms[a].radiusScale+radii[k]*state.arms[(a+1)%8].radiusScale)*.8;
   if(d<min){if(d<1e-8){x=Math.cos(state.arms[a].angle+Math.PI/2);y=0;z=Math.sin(state.arms[a].angle+Math.PI/2);d=1e-8;}const f=(min-d)*.5/(d===1e-8?1:d);p[0]-=x*f;p[1]-=y*f;p[2]-=z*f;q[0]+=x*f;q[1]+=y*f;q[2]+=z*f;}
  }
  for(let a=0;a<8;a++){const arm=state.arms[a];for(let j=3;j<=SEGMENTS;j++){
   const p=arm.points[j];let x=p[0]-b.p[0],y=p[1]-b.p[1],z=p[2]-b.p[2],d=Math.hypot(x,y,z);const gap=d-b.radius-radii[j]*arm.radiusScale,alpha=.000015/(dt*dt),previous=lambdas[a][j];if(d<1e-8){x=Math.cos(arm.angle);y=0;z=Math.sin(arm.angle);d=1;}
   const next=Math.max(0,previous+(-gap-alpha*previous)/(1+b.invMass+alpha)),dl=next-previous;lambdas[a][j]=next;
   const f=dl/d;p[0]+=x*f;p[1]+=y*f;p[2]+=z*f;b.p[0]-=x*f*b.invMass;b.p[1]-=y*f*b.invMass;b.p[2]-=z*f*b.invMass;
  }}
 }
 state.contacts=[];state.load=0;state.netForce=[0,0,0];state.perArm.fill(0);state.maxStretch=0;state.maxPenetration=0;
 for(let a=0;a<8;a++){const arm=state.arms[a];for(let j=1;j<=SEGMENTS;j++){
  arm.vel[j]=sub(arm.points[j],old[a][j]).map(v=>v/dt);
  state.maxStretch=Math.max(state.maxStretch,length(sub(arm.points[j],arm.points[j-1]))/(arm.rest[j-1]*arm.contraction)-1);
  const n=sub(arm.points[j],b.p),d=length(n)||1,force=lambdas[a][j]/(dt*dt);if(j>=3)state.maxPenetration=Math.max(state.maxPenetration,b.radius+radii[j]*arm.radiusScale-d);
  if(force>.015){const normal=n.map(v=>v/d);state.contacts.push({arm:a,section:j,normal,force,point:b.p.map((v,k)=>v+normal[k]*b.radius)});state.load+=force;state.perArm[a]+=force;add(state.netForce,normal,-force);}
 }}
 b.v=sub(b.p,oldBall).map(v=>v/dt);
 }
 return {state,reset,grip(){state.command=1;},release(){state.command=0;},nudge(direction=[1,0,0],speed=1.5){add(state.ball.v,direction,speed);},update(elapsed){accumulator+=clamp(elapsed,0,.1);while(accumulator+1e-10>=STEP){step(STEP);accumulator-=STEP;}},step};
}
