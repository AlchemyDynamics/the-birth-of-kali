import test from 'node:test';import assert from 'node:assert/strict';
import {stabilizedRollAngle as angle,ROLL_FINISH_TIME,smallJetRotation,smallJetAngle} from '../src/roll-motion.js';
test('small jet rotations vary chance, direction, angle and speed',()=>{
 for(const [values,active,sign] of [[[.2,0,.2,0],true,-1],[[.68,.999,.8,.999],true,1],[[.8,.5,.7,.5],false,1]]){
  const r=smallJetRotation(()=>values.shift());assert.equal(r.active,active);assert.equal(Math.sign(r.angle),sign);assert.ok(Math.abs(r.angle)>=5.5*Math.PI/180&&Math.abs(r.angle)<=22*Math.PI/180);assert.ok(r.duration>=.18&&r.duration<=.45);assert.equal(Math.abs(smallJetAngle(0,r.angle,r.duration)),0);assert.ok(Math.abs(smallJetAngle(r.duration,r.angle,r.duration)-r.angle)<1e-9);assert.ok(Math.abs(smallJetAngle(r.duration+.24,r.angle,r.duration)-r.angle*.85)<1e-9);assert.ok(Math.abs(smallJetAngle(r.duration+.12,r.angle,r.duration))<Math.abs(r.angle));
 }
});
test('roll slows through chosen final arc, then gently reverses in either direction',()=>{
 for(const sign of [-1,1])for(const tail of [5,12,20])for(const correction of [3,6,10]){
  const target=sign*500*Math.PI/180,radians=Math.PI/180;
  assert.ok(Math.abs(angle(.34,target,tail,correction)-(target-sign*tail*radians))<1e-9);
  assert.ok(Math.abs(angle(.56,target,tail,correction)-target)<1e-9);
  assert.ok(Math.abs(angle(ROLL_FINISH_TIME,target,tail,correction)-(target-sign*correction*radians))<1e-9);
  const velocity=t=>sign*(angle(t+.00001,target,tail,correction)-angle(t,target,tail,correction))/.00001;
  assert.ok(velocity(.38)>velocity(.48)&&velocity(.48)>velocity(.54));assert.ok(velocity(.68)<0);
  assert.ok(Math.abs(velocity(.7999))<.001);
  assert.ok(Math.abs(velocity(.34-.00002)-velocity(.34))<.02);
 }
});
