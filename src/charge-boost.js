import {JET_DISTANCE} from './simulation.js';
// Holding through recovery banks a single release burst; taps remain ordinary jets.
export const CHARGE_SECONDS=1, MIN_CHARGE_SECONDS=.12;
export const chargeMultiplier=q=>1.4*(1.5+1.5*Math.max(0,Math.min(1,q)));
// Calibrated with water drag: +40% launch speed and about +80% total travel.
export const CHARGED_JET_DURATION=.715;
export const chargeTravelDistance=q=>JET_DISTANCE*(chargeMultiplier(q)/1.4)*1.8;
export function createChargeBoost(){
 let armed=false,elapsed=0;
 return {
  get armed(){return armed;},get active(){return armed&&elapsed>0;},get amount(){return elapsed/CHARGE_SECONDS;},
  arm(){armed=true;elapsed=0;},
  cancel(){armed=false;elapsed=0;},
  update(dt,{held,eligible,recovering}){if(!held||!eligible){this.cancel();return;}if(armed&&recovering)elapsed=Math.min(CHARGE_SECONDS,elapsed+dt);},
  release(){const amount=armed&&elapsed>=MIN_CHARGE_SECONDS?elapsed/CHARGE_SECONDS:0;this.cancel();return amount;}
 };
}
