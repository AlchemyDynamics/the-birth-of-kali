import {IGNITION,COLLAPSE} from './simulation.js';
// Preserve the fueled rolling experiment for later tuning, but leave it disabled.
export const STAR_BOOST_ENABLED=false;
export const BLAST_JET_MULTIPLIER=1.25, BLAST_JET_REQUIRED_STARS=9;
export function blastJetAvailable(food,ignitionComplete,heldStars){
 return ignitionComplete&&food>=IGNITION&&heldStars>=BLAST_JET_REQUIRED_STARS;
}

export function chargeBoostAvailable(food,collapseComplete,heldStars){
 return collapseComplete&&food>=COLLAPSE&&heldStars>=BLAST_JET_REQUIRED_STARS;
}
