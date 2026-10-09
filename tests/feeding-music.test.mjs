import test from 'node:test';
import assert from 'node:assert/strict';
import {FEEDING_BEAT} from '../src/feeding-music.js';
import {feedingArms,advanceFeeding,nextMeal} from '../src/simulation.js';
const holding=notes=>notes.map((note,index)=>({index,target:{note,owner:index,eaten:false},elapsed:0,cargo:[]}));
test('reorders a scattered collection into a stepwise figure without changing pitches or owners',()=>{
 const arms=holding([24,0,12,14,16]),targets=arms.map(a=>a.target);
 const selected=feedingArms(arms,true,()=>.9);
 assert.deepEqual(selected.map(a=>a.target.note),[12,14,16]);
 assert.deepEqual(selected.map(a=>a.feedDelay),[0,FEEDING_BEAT*1.5,FEEDING_BEAT*3]);
 assert.deepEqual(arms.map(a=>a.target),targets);assert.ok(arms.every(a=>a.target.owner===a.index));
 advanceFeeding(selected[0],.3);const progress=selected[0].elapsed;
 assert.deepEqual(feedingArms(arms,false),[]);
 assert.deepEqual(feedingArms(arms,true,()=>{throw Error('must not recompose a paused phrase');}),selected);
 assert.equal(selected[0].elapsed,progress);
});
test('simultaneous chords exclude clashing seconds and retain unselected cargo',()=>{
 const arms=holding([12,14,16,19]),rolls=[.1,.1,.1,.99,.5];
 const selected=feedingArms(arms,true,()=>rolls.shift()??.5);
 assert.deepEqual(selected.map(a=>a.target.note),[12,16,19]);
 assert.deepEqual(selected.map(a=>a.feedDelay),[0,0,0]);
 for(const arm of selected){assert.ok(advanceFeeding(arm,3));nextMeal(arm);}
 assert.equal(arms[1].target.note,14);assert.equal(arms[1].target.eaten,false);
 assert.deepEqual(feedingArms(arms,true,()=>.5),[arms[1]]);
});
test('a full collection drains exactly once with no pitch changes',()=>{
 const notes=[24,2,19,4,12,0,21,7],arms=holding(notes),heard=[];
 for(let batch=0;batch<12&&arms.some(a=>a.target);batch++){
  for(const arm of feedingArms(arms,true,()=>.7)){const w=advanceFeeding(arm,4);assert.ok(w);heard.push(w.note);nextMeal(arm);}
 }
 assert.deepEqual(heard.sort((a,b)=>a-b),[...notes].sort((a,b)=>a-b));
});
test('92 BPM stays on the beat across batches, frame rates, and a pause',()=>{
 for(const fps of [30,60,144]){
  const arms=holding([24,0,12,14,16,7,9,19]),dt=1/fps,events=[];let activeTime=0;
  for(let frame=0;frame<fps*12&&arms.some(a=>a.target);frame++){
   const canFeed=!(frame>=fps&&frame<fps*2);if(canFeed)activeTime+=dt;
   const selected=feedingArms(arms,canFeed,()=>.9,dt);
   for(const arm of selected){if(advanceFeeding(arm,dt)){events.push(activeTime);nextMeal(arm);}}
  }
  assert.equal(events.length,8);
  events.forEach((time,i)=>assert.ok(Math.abs(time-(i+1)*FEEDING_BEAT)<=dt+1e-8,`${fps}fps: ${time}`));
 }
});
test('a scheduled chord is swallowed on one shared beat',()=>{
 const arms=holding([12,14,16,19]),rolls=[.1,.1,.1,.99],events=[];let time=0;
 for(let frame=0;frame<50;frame++){time+=1/60;for(const arm of feedingArms(arms,true,()=>rolls.shift()??.9,1/60)){if(advanceFeeding(arm,1/60)){events.push(time);nextMeal(arm);}}}
 assert.equal(events.length,3);assert.equal(new Set(events).size,1);assert.ok(Math.abs(events[0]-FEEDING_BEAT)<1/60);
});
