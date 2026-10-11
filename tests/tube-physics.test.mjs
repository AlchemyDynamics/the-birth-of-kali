import test from 'node:test';
import assert from 'node:assert/strict';
import {createTubeSimulation} from '../src/tube-physics.js';
import {sampleSoftArm} from '../src/soft-arm.js';
import {createGripSimulation,armRadius} from '../src/grip-physics.js';
const run=(sim,seconds,fps=60)=>{for(let i=0;i<seconds*fps;i++)sim.update(1/fps);return sim.state;};
const finite=s=>assert.ok(s.arms.every(a=>a.points.flat().every(Number.isFinite)));

test('default passage completes with bounded extension and recovers mantle volume',()=>{
 const sim=createTubeSimulation();sim.start();let maximum=0,s=sim.state;
 for(let i=0;i<6000;i++){sim.step(1/120);maximum=Math.max(maximum,s.maxStretch);assert.ok(Math.abs(s.radialScale*s.radialScale*s.axialScale-1)<1e-10);}
 assert.ok(s.complete);assert.ok(s.bodyY< -9);assert.ok(maximum<.30,`peak extension ${maximum}`);assert.ok(s.maxPenetration<.005);assert.ok(s.radialScale>.999);finite(s);
});
test('without attachment force the body does not advance; releasing removes propulsion',()=>{
 const idle=createTubeSimulation({traction:0});idle.start();run(idle,4);assert.equal(idle.state.bodyY,3.2);assert.equal(idle.state.load,0);
 const sim=createTubeSimulation();sim.start();run(sim,5);assert.ok(sim.state.bodyY<3);sim.release();const speed=Math.abs(sim.state.velocity);run(sim,2);assert.equal(sim.state.attached,0);assert.equal(sim.state.load,0);assert.ok(Math.abs(sim.state.velocity)<speed*.01);finite(sim.state);
});
test('rigid beak and tissue limits block narrow apertures',()=>{
 for(const [radius,reason] of [[.4,'beak'],[.8,'tissue']]){const sim=createTubeSimulation({radius});sim.start();run(sim,12);assert.ok(!sim.state.complete);assert.ok(sim.state.bodyY>0);assert.match(sim.state.phase,new RegExp(reason));finite(sim.state);}
});
test('the proximal arm senses contact independently of its distal section',()=>{
 const sim=createTubeSimulation();sim.start();const arm=sim.state.arms[0];arm.points[3]=[sim.state.radius-armRadius(3/24)-.02,-1,0];arm.points[18]=[0,3,0];sim.step(1/120);
 assert.equal(arm.sites[0].touch,1);assert.equal(arm.sites.find(s=>s.section===18).touch,0);assert.ok(arm.senses.touch>0);assert.equal(arm.sites.length,7);
});
test('chemical cues influence upper-arm search; fixed step is frame-rate independent',()=>{
 const on=createTubeSimulation(),off=createTubeSimulation();off.state.chemicalCues=false;on.start();off.start();run(on,2);run(off,2);
 assert.notDeepEqual(on.state.arms[0].points[6],off.state.arms[0].points[6]);assert.ok(on.state.arms[0].senses.chemical>0);assert.equal(off.state.arms[0].senses.chemical,0);
 const a=createTubeSimulation(),b=createTubeSimulation();a.start();b.start();run(a,2,30);run(b,2,144);assert.ok(Math.abs(a.state.bodyY-b.state.bodyY)<1e-10);
});
test('spline retains endpoints and smooth straight spacing; projected skin clears tube wall',()=>{
 const nodes=[[0,0,0],[1,0,0],[2,0,0],[3,0,0]],out=Array.from({length:49},()=>({p:[],set(...v){this.p=v;}}));sampleSoftArm(nodes,out);
 for(let j=0;j<49;j++){assert.ok(Math.abs(out[j].p[0]-3*j/48)<1e-10);assert.equal(out[j].p[1],0);}
 const sim=createTubeSimulation();sampleSoftArm([[2,-1,0],[2,-2,0],[2,-3,0],[2,-4,0]],out,(p,u)=>sim.wallProject(p,armRadius(u)));
 for(let j=0;j<49;j++)assert.ok(Math.hypot(out[j].p[0],out[j].p[2])+armRadius(j/48)<=sim.state.radius+1e-8);
});
test('one released grip arm relaxes its length and thickness independently',()=>{
 const sim=createGripSimulation();sim.grip();run(sim,4);sim.state.enabled[0]=false;run(sim,3);
 assert.ok(sim.state.arms[0].contraction>.999);assert.ok(sim.state.arms[0].radiusScale<1.001);assert.ok(sim.state.arms[1].contraction<.85);finite(sim.state);
});
