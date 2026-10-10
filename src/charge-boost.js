// Holding through recovery banks a single release burst; taps remain ordinary jets.
export const CHARGE_SECONDS=2, MIN_CHARGE_SECONDS=.12;
export const chargeMultiplier=q=>1.5+1.5*Math.max(0,Math.min(1,q));
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
