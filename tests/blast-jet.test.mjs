import test from 'node:test';import assert from 'node:assert/strict';
import {STAR_BOOST_ENABLED,BLAST_JET_MULTIPLIER,blastJetAvailable} from '../src/movement-abilities.js';
import {IGNITION,JET_SPEED,JET_DURATION,JET_RECOVERY,integrateVelocity} from '../src/simulation.js';
test('legacy boost is disabled; blast requires completed ignition and more than eight held stars',()=>{
 assert.equal(STAR_BOOST_ENABLED,false);
 assert.equal(blastJetAvailable(IGNITION-1,true,20),false);
 assert.equal(blastJetAvailable(IGNITION,false,20),false);
 assert.equal(blastJetAvailable(IGNITION,true,8),false);
 assert.equal(blastJetAvailable(IGNITION,true,9),true);
 assert.equal(blastJetAvailable(IGNITION+20,true,40),true);
});
test('blast travels 25 percent farther with the same burst and water-drag timing',()=>{
 function distance(multiplier,fps){let v=[0,0,-JET_SPEED*multiplier],distance=0;const dt=1/fps;
  for(let frame=0;frame<fps*4;frame++){const t=frame*dt,recovery=t<JET_DURATION?0:Math.max(0,1-(t-JET_DURATION)/JET_RECOVERY);integrateVelocity(v,[0,0,0],dt,0,t<JET_DURATION,recovery,multiplier);distance+=Math.hypot(...v)*dt;}return distance;
 }
 for(const fps of [30,60,144])assert.ok(Math.abs(distance(BLAST_JET_MULTIPLIER,fps)/distance(1,fps)-1.25)<.001);
});
