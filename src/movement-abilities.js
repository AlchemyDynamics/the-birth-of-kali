import {COLLAPSE} from './simulation.js';
// Preserve the fueled rolling experiment for later tuning, but leave it disabled.
export const STAR_BOOST_ENABLED=false;
export const BLAST_JET_MULTIPLIER=1.25, BLAST_JET_REQUIRED_STARS=16;
export function blastJetAvailable(food,collapseComplete,heldStars){
 return collapseComplete&&food>=COLLAPSE&&heldStars>=BLAST_JET_REQUIRED_STARS;
}
