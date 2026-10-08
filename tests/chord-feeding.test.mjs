import test from 'node:test';import assert from 'node:assert/strict';
import {captureLight,feedingArms,advanceFeeding,nextMeal} from '../src/simulation.js';
import {Soundscape} from '../src/audio.js';
test('three arms stagger their meals, pause together, and retain queued meals',()=>{
 const arms=Array.from({length:8},(_,index)=>({index,target:null,elapsed:0,cargo:[]}));
 const lights=Array.from({length:4},()=>({owner:null,eaten:false}));for(const light of lights)captureLight(arms,light);
 const rolls=[.9,.5,.5];const batch=feedingArms(arms,true,()=>rolls.shift());assert.equal(batch.length,3);assert.equal(new Set(batch.map(a=>a.index)).size,3);
 for(const a of batch)advanceFeeding(a,.5,true);const progress=batch.map(a=>a.elapsed);assert.ok(progress[0]>progress[1]&&progress[1]>progress[2]);const delays=batch.map(a=>a.feedDelay);
 assert.deepEqual(feedingArms(arms,false),[]);for(const a of batch)advanceFeeding(a,1,false);assert.deepEqual(batch.map(a=>a.elapsed),progress);assert.deepEqual(batch.map(a=>a.feedDelay),delays);
 const resumed=feedingArms(arms,true,()=>.9);assert.deepEqual(resumed,batch);assert.ok(resumed.every(a=>a.mealDuration===1.5));
 const eaten=resumed.map(a=>advanceFeeding(a,2,true));assert.ok(eaten.every(Boolean));assert.equal(lights.filter(w=>w.eaten).length,3);
 for(const a of batch)nextMeal(a);assert.equal(feedingArms(arms,true).length,1);assert.equal(lights[3].eaten,false);
});
test('full cargo still chooses one, two or three, and keeps that batch until finished',()=>{
 for(const [roll,count] of [[0,1],[.4,2],[.9,3]]){
  const arms=Array.from({length:8},(_,index)=>({index,target:null,elapsed:0,cargo:[]}));
  for(let i=0;i<8;i++)captureLight(arms,{owner:null,eaten:false});
  const batch=feedingArms(arms,true,()=>roll);assert.equal(batch.length,count);
  assert.deepEqual(feedingArms(arms,true,()=>.99),batch);
  assert.deepEqual(feedingArms(arms,false),[]);assert.deepEqual(feedingArms(arms,true,()=>0),batch);
  for(const arm of batch){advanceFeeding(arm,3,true);nextMeal(arm);}
  assert.equal(feedingArms(arms,true,()=>0).length,1);
 }
});
test('three consecutive bells have distinct scale notes; eating uses a softer glass bell',()=>{
 const audio=new Soundscape();for(let i=0;i<100;i++)assert.equal(new Set([audio.pickNote(),audio.pickNote(),audio.pickNote()]).size,3);
 let gain;audio.capture=value=>gain=value;audio.eat();assert.equal(gain,.55);
});
