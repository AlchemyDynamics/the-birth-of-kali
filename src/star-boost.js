import {nextMeal} from './simulation.js';
export const STAR_BOOST_SPEED=1.8, STAR_BOOST_STEERING=1.65;
// One captured, uneaten star buys one second of propulsion. Never touch food.
export function createStarBoost(arms,onBurn=()=>{}){
 let active=false,remaining=0,burned=0;
 function burn(){
  let arm=arms.find(a=>a.cargo?.some(w=>!w.eaten));
  let star;
  if(arm){const index=arm.cargo.findLastIndex(w=>!w.eaten);star=arm.cargo.splice(index,1)[0];}
  else {arm=arms.find(a=>a.target&&!a.target.eaten);if(!arm)return false;star=arm.target;nextMeal(arm);arm.feeding=false;}
  star.eaten=true;star.burned=true;
  if(arm.grabLight===star){arm.grabLight=null;arm.grabPoint=null;arm.grabTime=0;}
  burned++;onBurn(star);return true;
 }
 return {
  get active(){return active;},get burned(){return burned;},
  start(){if(active)return true;if(!burn())return false;active=true;remaining=1;return true;},
  update(dt){if(!active)return;remaining-=Math.max(0,dt);while(remaining<=1e-9&&active){if(burn())remaining+=1;else {active=false;remaining=0;}}},
  stop(){active=false;remaining=0;}
 };
}
