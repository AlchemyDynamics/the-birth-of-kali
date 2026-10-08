const clamp=x=>Math.max(0,Math.min(1,x));
export const SMALL_JET_SETTLE_TIME=.24;
export function smallJetRotation(random=Math.random){return {active:random()<.6*1.15,angle:(5+random()*15)*1.1*Math.PI/180*(random()<.5?-1:1),duration:.18+random()*.27};}
export function smallJetAngle(elapsed,angle,duration){const u=clamp(elapsed/duration),rebound=clamp((elapsed-duration)/SMALL_JET_SETTLE_TIME);return angle*(u*u*u*(10-15*u+6*u*u)-.15*rebound*rebound*rebound*(10-15*rebound+6*rebound*rebound));}
export const ROLL_FINISH_TIME=.8;
export function stabilizedRollAngle(elapsed,target,slowDegrees,correctionDegrees){
 const sign=Math.sign(target),total=Math.abs(target),tail=slowDegrees*Math.PI/180,correction=correctionDegrees*Math.PI/180;
 // Match angular velocity across the fast spin and the final, slower arc.
 if(elapsed<.34){const u=clamp(elapsed/.34),end=total-tail,endVelocity=2*tail/.22;return sign*((3*u*u-2*u*u*u)*end+(u*u*u-u*u)*endVelocity*.34);}
 if(elapsed<.56){const u=clamp((elapsed-.34)/.22);return sign*(total-tail*(1-u)*(1-u));}
 const u=clamp((elapsed-.56)/.24),settle=u*u*u*(10-15*u+6*u*u);
 return sign*(total-correction*settle);
}
