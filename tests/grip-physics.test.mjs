import test from 'node:test';
import assert from 'node:assert/strict';
import {createGripSimulation} from '../src/grip-physics.js';

const run=(sim,seconds,fps=60)=>{for(let i=0;i<Math.round(seconds*fps);i++)sim.update(1/fps);return sim.state;};
const magnitude=v=>Math.hypot(...v);
const close=(a,b,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} differs from ${b} by more than ${tolerance}`);
const finite=s=>{for(const v of [...s.ball.p,...s.ball.v,s.load,...s.netForce,...s.perArm,...s.arms.flatMap(a=>a.points.flat())])assert.ok(Number.isFinite(v));};

test('relaxed arms do not apply remote contact force to the ball',()=>{
 const sim=createGripSimulation(),s=run(sim,1);
 assert.equal(s.contacts.length,0);assert.equal(s.load,0);assert.deepEqual(s.ball.p,[0,-3,0]);assert.deepEqual(s.netForce,[0,0,0]);finite(s);
});

test('eight-arm grasp develops opposing load without a large resultant or excessive stretch',()=>{
 const sim=createGripSimulation();sim.grip();const s=run(sim,8);
 assert.ok(s.load>100);assert.equal(s.perArm.filter(f=>f>1).length,8);
 assert.ok(magnitude(s.netForce)<s.load*.01,'opposing contact loads should almost cancel');
 const mean=s.load/8;assert.ok(s.perArm.every(f=>Math.abs(f-mean)<mean*.025),'symmetric arm drives should have similar loads');
 assert.ok(s.maxStretch<.03,'arm lengths should stay within 3%');assert.ok(s.maxPenetration<.005,'contact should remain near the sphere surface');finite(s);
 sim.release();run(sim,4);assert.equal(s.load,0);assert.equal(s.contacts.length,0);finite(s);
});

test('stronger drive raises contact load without requiring a nonzero resultant',()=>{
 const results=[.1,1].map(squeeze=>{const sim=createGripSimulation();sim.state.squeeze=squeeze;sim.grip();return run(sim,6);});
 assert.ok(results[1].load>results[0].load*2,'drive must visibly increase compressive contact load');
 for(const s of results){assert.ok(magnitude(s.netForce)<s.load*.02);finite(s);}
});

test('render frame rate does not change the fixed-step simulation',()=>{
 const results=[30,60,144].map(fps=>{const sim=createGripSimulation();sim.grip();return run(sim,2,fps);});
 const reference=results[0];for(const s of results.slice(1)){close(s.time,reference.time);close(s.load,reference.load,1e-7);for(let k=0;k<3;k++)close(s.ball.p[k],reference.ball.p[k],1e-9);}
});

test('the ball reacts dynamically to a disturbance and reset clears contact history',()=>{
 const sim=createGripSimulation();sim.grip();let s=run(sim,4);const initial=s.ball.p.slice();sim.nudge([1,0,0],1.7);run(sim,.25,120);
 assert.ok(magnitude(s.ball.p.map((v,k)=>v-initial[k]))>.001,'the ball must not be kinematically pinned');finite(s);
 sim.reset();s=sim.state;assert.equal(s.command,0);assert.equal(s.activation,0);assert.equal(s.load,0);assert.equal(s.contacts.length,0);assert.deepEqual(s.ball.p,[0,-3,0]);assert.deepEqual(s.ball.v,[0,0,0]);assert.ok(s.enabled.every(Boolean));
});
