import test from 'node:test';import assert from 'node:assert/strict';
import {createChargeBoost,chargeMultiplier,CHARGED_JET_DURATION} from '../src/charge-boost.js';
const ready={held:true,eligible:true,recovering:true};
test('tap and initial jet do not charge or release a boost',()=>{const c=createChargeBoost();c.arm();c.update(.3,{...ready,recovering:false});assert.equal(c.release(),0);assert.equal(c.armed,false);});
test('charge scales with hold time and caps consistently across frame rates',()=>{for(const fps of [30,60,144]){const c=createChargeBoost();c.arm();for(let i=0;i<fps/2;i++)c.update(1/fps,ready);assert.ok(Math.abs(c.amount-.5)<1e-8);for(let i=0;i<fps*3;i++)c.update(1/fps,ready);assert.equal(c.amount,1);assert.equal(c.release(),1);assert.equal(c.release(),0);}assert.ok(chargeMultiplier(.2)<chargeMultiplier(1));assert.ok(Math.abs(chargeMultiplier(1)/3-1.4)<1e-10);});
test('loss of eligibility, cancel, and release below minimum cannot launch',()=>{for(const change of [{eligible:false},{held:false}]){const c=createChargeBoost();c.arm();c.update(1,ready);c.update(.01,{...ready,...change});assert.equal(c.release(),0);}const c=createChargeBoost();c.arm();c.update(.1,ready);assert.equal(c.release(),0);c.arm();c.update(2,ready);c.cancel();assert.equal(c.release(),0);});

import {JET_SPEED,JET_DURATION,JET_RECOVERY,integrateVelocity} from '../src/simulation.js';
test('charged launch travels about 80 percent farther at 40 percent higher initial speed',()=>{
 function travel(mult,duration,fps){let v=[0,0,-JET_SPEED*mult],dash=duration,recovery=0,distance=0;const dt=1/fps;
  for(let i=0;i<fps*5;i++){if(i){const previous=dash;dash=Math.max(0,dash-dt);if(previous>0&&dash===0)recovery=JET_RECOVERY;else recovery=Math.max(0,recovery-dt);}integrateVelocity(v,[0,0,0],dt,0,dash>0,recovery/JET_RECOVERY,mult);distance+=Math.hypot(...v)*dt;}return distance;}
 for(const fps of [30,60,144])for(const q of [.25,1]){const old=1.5+1.5*q,ratio=travel(chargeMultiplier(q),CHARGED_JET_DURATION,fps)/travel(old,JET_DURATION,fps);assert.ok(Math.abs(ratio-1.8)<.025,JSON.stringify({fps,q,ratio}));}
});
