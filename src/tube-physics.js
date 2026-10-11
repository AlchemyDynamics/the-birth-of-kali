import {createArmBehavior,updateArmBehavior} from './arm-behavior.js';
import {armRadius, STEP} from './grip-physics.js';
export const TUBE_FRONT=0, TUBE_BACK=-6, TUBE_SEGMENTS=24;
export const BEAK_RADIUS=.38, MIN_BODY_SCALE=.64, BODY_RADIUS=1.5;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mixRecovery=(a,b,t)=>a.map((v,k)=>v+(b[k]-v)*t);
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const distance=(a,b)=>Math.hypot(...a.map((x,k)=>x-b[k]));
export const CHEMICAL_PATCHES=[{angle:.8,y:-.7},{angle:3.1,y:-3.0},{angle:5.2,y:-5.2}];
export function chemicalField(angle,y){return Math.min(1,CHEMICAL_PATCHES.reduce((sum,p)=>sum+Math.exp((Math.cos(angle-p.angle)-1)*2-(y-p.y)**2*.22),0));}
function bezier(a,b,c,d,t){const s=1-t;return a.map((x,k)=>s*s*s*x+3*s*s*t*b[k]+3*s*t*t*c[k]+t*t*t*d[k]);}

// Reduced muscular-hydrostat study, not a calibrated animal or fluid model.
// World -Y is travel. The body's axial motion comes only from attached arms.
export function createTubeSimulation({radius=1.2,traction=1}={}) {
 const state={time:0,running:false,complete:false,radius,traction,bodyY:3.2,velocity:0,
  radialScale:1,axialScale:1,load:0,attached:0,phase:'Ready to explore',arms:[],maxStretch:0,maxPenetration:0,slips:0};
 let accumulator=0;
 function root(angle){return [Math.cos(angle)*.72*state.radialScale,state.bodyY-.22*state.axialScale,Math.sin(angle)*.72*state.radialScale];}
 function reset(){Object.assign(state,{time:0,running:false,complete:false,bodyY:3.2,velocity:0,radialScale:1,axialScale:1,load:0,attached:0,phase:'Ready to explore',maxStretch:0,maxPenetration:0,slips:0});
  state.arms=Array.from({length:8},(_,i)=>{const angle=i*Math.PI/4+Math.PI/8,r=root(angle),points=Array.from({length:25},(_,j)=>{const u=j/24;return [r[0]+Math.cos(angle)*.7*u,r[1]-6.4*u,r[2]+Math.sin(angle)*.7*u];});return {angle,points,vel:points.map(()=>[0,0,0]),rest:points.slice(1).map((p,j)=>distance(p,points[j])),anchor:null,anchorIndex:18,timer:-i*.17,mode:'probe',load:0,activation:0,offset:0,radiusScale:1,senses:createArmBehavior(i)};});accumulator=0;
 }
 reset();
 function wallProject(p,r){
  // Finite cylinder plus rounded lips. The solid wall exists outside its bore.
  let axial=0;if(p[1]>TUBE_FRONT)axial=p[1]-TUBE_FRONT;else if(p[1]<TUBE_BACK)axial=TUBE_BACK-p[1];
  if(axial>=r+.12)return;
  const clearance=Math.sqrt(Math.max(0,(r+.06)**2-Math.max(0,axial-.06)**2));
  const radial=Math.hypot(p[0],p[2]),allowed=Math.max(.02,state.radius-clearance);
  if(radial>allowed){p[0]*=allowed/radial;p[2]*=allowed/radial;}
 }
 function step(dt){
  if(!state.running)return;
  if(state.complete){
   state.time+=dt;state.radialScale+=(1-state.radialScale)*(1-Math.exp(-dt*1.6));state.axialScale=1/state.radialScale**2;state.load=state.attached=0;
   for(const arm of state.arms){
    arm.anchor=null;arm.load=0;updateArmBehavior(arm.senses,{touch:0,chemical:0,strain:0,load:0,anchored:false},dt,state.time);
    const r=root(arm.angle),b=arm.senses;
    for(let j=0;j<=24;j++){
     const u=j/24,arch=Math.sin(Math.PI*u),tip=ease((u-.72)/.28);
     const radial=u*1.45+arch*(.5+b.bow)+tip*.25*Math.sin(state.time*.28+b.phase);
     const sideways=arch*b.sweep,goal=[r[0]+Math.cos(arm.angle)*radial-Math.sin(arm.angle)*sideways,r[1]-4.8*u+tip*.65,r[2]+Math.sin(arm.angle)*radial+Math.cos(arm.angle)*sideways];
     arm.points[j]=mixRecovery(arm.points[j],goal,1-Math.exp(-dt*1.2));
    }
   }
   return;
  }
  state.time+=dt;state.load=state.attached=0;
  const fits=state.radius>BEAK_RADIUS+.06&&state.radius>BODY_RADIUS*MIN_BODY_SCALE+.06;
  // Anticipatory mantle elongation, followed by a slow elastic recovery on exit.
  const tail=state.bodyY+3.1*state.axialScale;
  const overlap=ease((4-state.bodyY)/3)*ease((tail-TUBE_BACK+1)/2);
  const desired=1-overlap*(1-clamp((state.radius-.07)/BODY_RADIUS,MIN_BODY_SCALE,1));
  state.radialScale+=(desired-state.radialScale)*(1-Math.exp(-dt*3));
  state.axialScale=1/(state.radialScale*state.radialScale);
  const forces=[];
  for(let a=0;a<8;a++){
   const arm=state.arms[a],r=root(arm.angle);arm.timer+=dt;arm.load=0;
   if(!arm.anchor)arm.anchorIndex=state.bodyY< -7?21:18;
   if(arm.anchor){
    arm.activation+=(1-arm.activation)*(1-Math.exp(-dt*5));
    // Shorten the axial muscle target after sealing. On exit, elongate behind
    // the body to push off the same contact. No prescribed body translation.
    const targetOffset=arm.offset-1.35*ease(arm.timer/(1.12+a*.028));
    const requested=Math.max(0,(state.bodyY-arm.anchor[1]-targetOffset)*19);
    const capacity=13*state.traction;
    arm.load=Math.min(requested,capacity);
    if(requested>capacity*1.8||state.traction<=0||arm.timer>1.5+a*.045||Math.abs(state.bodyY-arm.anchor[1])>6.1){arm.anchor=null;arm.timer=-.28;arm.mode='release';state.slips+=requested>capacity*1.8?1:0;}
    else{forces.push(arm.load);state.load+=arm.load;state.attached++;arm.mode=state.bodyY<arm.anchor[1]?'push':'pull';}
   }else arm.activation*=Math.exp(-dt*4);
   // Seven sensory regions include the thick proximal half, not only the tip.
   arm.sites=[3,6,9,12,15,18,21].map(j=>{
    const p=arm.points[j],axialGap=Math.max(0,p[1]-TUBE_FRONT,TUBE_BACK-p[1]);
    const gap=Math.hypot(state.radius-Math.hypot(p[0],p[2]),axialGap)-armRadius(j/24);
    return {section:j,touch:gap<.13?1:0,
     chemical:state.chemicalCues===false?0:chemicalField(Math.atan2(p[2],p[0]),p[1]),
     strain:Math.abs(distance(p,arm.points[j-1])/arm.rest[j-1]-1)};
   });
   const touch=Math.max(...arm.sites.map(s=>s.touch)),chemical=arm.sites.reduce((sum,s)=>sum+s.chemical,0)/arm.sites.length;
   const localStrain=Math.max(...arm.sites.map(s=>s.strain));
   const contactSense=arm.sites.find(s=>s.section===arm.anchorIndex);
   arm.sampleContactTime=contactSense.touch?(arm.sampleContactTime||0)+dt:0;
   updateArmBehavior(arm.senses,{touch,chemical,strain:localStrain,load:arm.load/13,anchored:!!arm.anchor},dt,state.time);
   const exploring=arm.timer>0;
   const nominalAhead=clamp(state.bodyY-2.65,TUBE_BACK+.38,TUBE_FRONT-.2);
   const senseGradient=state.chemicalCues===false?0:chemicalField(arm.angle+.18,nominalAhead)-chemicalField(arm.angle-.18,nominalAhead);
   const ahead=clamp(nominalAhead+(state.chemicalCues===false?0:.25*(chemicalField(arm.angle,nominalAhead+.3)-chemicalField(arm.angle,nominalAhead-.3))),TUBE_BACK+.38,TUBE_FRONT-.2);
   const contactU=arm.anchorIndex/24,rr=Math.max(.03,state.radius-armRadius(contactU));
   // Distal contact search is phase shifted; proximal arms stay coordinated.
   const searchAngle=arm.angle+(arm.anchor?0:clamp(senseGradient*.75,-.16,.16)+.06*Math.sin(state.time*.8+a));
   const contact=arm.anchor||[Math.cos(searchAngle)*rr,ahead,Math.sin(searchAngle)*rr];
   const destination=exploring||arm.anchor?contact:[Math.cos(arm.angle)*.8,r[1]-3.4,Math.sin(arm.angle)*.8];
   const radial=[Math.cos(arm.angle),0,Math.sin(arm.angle)],side=[-radial[2],0,radial[0]],b=arm.senses;
   const proximalTouch=Math.max(...arm.sites.slice(0,4).map(s=>s.touch));
   const room=(state.bodyY>1?1:.45)*(1-.55*proximalTouch);
   const bend1=[r[0]+radial[0]*b.bow*room+side[0]*b.sweep*room,r[1]-.95,r[2]+radial[2]*b.bow*room+side[2]*b.sweep*room];
   const bend2=[destination[0]*.72-side[0]*b.sweep*.6,destination[1]+(r[1]>destination[1]?.75:-.75),destination[2]*.72-side[2]*b.sweep*.6];
   const old=arm.points.map(p=>p.slice());
   for(let j=1;j<=24;j++){
    const u=j/24,t=Math.min(1,u/contactU);let goal=bezier(r,bend1,bend2,destination,t);
    if(u>contactU){const tip=(u-contactU)/(1-contactU);goal=[destination[0]*(1-.18*tip*tip),destination[1]-.85*tip,destination[2]*(1-.18*tip*tip)];}
    const p=arm.points[j],v=arm.vel[j];for(let k=0;k<3;k++){v[k]=(v[k]+(goal[k]-p[k])*140*dt)*Math.exp(-dt*10);p[k]+=v[k]*dt;}
   }
   arm.points[0]=r;
   // Bend and strain constraints spread curvature across tissue, never hinges.
   if(arm.anchor)arm.points[arm.anchorIndex]=arm.anchor.slice();
   for(let it=0;it<16;it++){
    for(let j=1;j<24;j++)if(!(arm.anchor&&j===arm.anchorIndex))for(let k=0;k<3;k++)arm.points[j][k]+=(.5*(arm.points[j-1][k]+arm.points[j+1][k])-arm.points[j][k])*.008;
    for(let j=1;j<=24;j++){
     const p=arm.points[j-1],q=arm.points[j],d=distance(p,q)||1e-8;
     const lo=arm.rest[j-1]*.52,hi=arm.rest[j-1]*1.26,w=j===1||(arm.anchor&&j===arm.anchorIndex+1)?0:1,wq=arm.anchor&&j===arm.anchorIndex?0:1;
     const error=d-clamp(d,lo,hi);for(let k=0;k<3;k++){const c=(q[k]-p[k])*error/(d*(wq+w||1));p[k]+=c*w;q[k]-=c*wq;}
     wallProject(q,armRadius(j/24));
    }
   }
   if(!arm.anchor&&exploring&&state.time>3&&!state.exploreOnly&&state.traction>0&&contactSense.touch&&arm.sampleContactTime>.32+a*.027){
    arm.anchor=arm.points[arm.anchorIndex].slice();arm.offset=state.bodyY-arm.anchor[1];arm.timer=0;arm.mode='seal';
   }
   for(let j=1;j<=24;j++)arm.vel[j]=arm.points[j].map((v,k)=>(v-old[j][k])/dt);
  }
  const total=forces.reduce((a,b)=>a+b,0);
  state.velocity+=( -total/9-state.velocity*4.3)*dt;
  state.velocity=Math.max(-1.35,Math.min(.15,state.velocity));
  state.bodyY+=state.velocity*dt;
  const stopY=state.radius<BEAK_RADIUS+.06?.64*state.axialScale+BEAK_RADIUS+.07:.85*state.axialScale+.12;
  if(!fits&&state.bodyY<stopY){state.bodyY=stopY;state.velocity=0;state.phase=state.radius<BEAK_RADIUS+.06?'Blocked: rigid beak clearance':'Blocked: tissue strain limit';}
  else state.phase=state.time<3||state.exploreOnly?'Arms feel the opening and sample its surface':state.attached?(state.bodyY< -5?'Rear contacts push the mantle through':'Seal · shorten · pull · release'):'Tips explore and seek wall contact';
  state.maxStretch=state.maxPenetration=0;
  for(const arm of state.arms)for(let j=1;j<=24;j++){
   const p=arm.points[j];state.maxStretch=Math.max(state.maxStretch,distance(p,arm.points[j-1])/arm.rest[j-1]-1);
   if(p[1]<=0&&p[1]>=-6)state.maxPenetration=Math.max(state.maxPenetration,Math.hypot(p[0],p[2])+armRadius(j/24)-state.radius);
  }
  if(state.bodyY+3.1*state.axialScale<TUBE_BACK-.5){state.complete=true;state.velocity=0;state.phase='Passage complete · reset to compare another opening';}
 }
 return {state,reset,step,wallProject,start(){state.running=true;},release(){for(const arm of state.arms){arm.anchor=null;arm.timer=-1;}state.traction=0;},update(elapsed){accumulator+=clamp(elapsed,0,.1);while(accumulator+1e-10>=STEP){step(STEP);accumulator-=STEP;}}};
}
