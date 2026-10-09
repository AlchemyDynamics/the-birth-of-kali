import test from 'node:test';
import assert from 'node:assert/strict';
import {feedingArms,advanceFeeding,nextMeal} from '../src/simulation.js';
const holding=notes=>notes.map((note,index)=>({index,target:{note,owner:index,eaten:false},elapsed:0,cargo:[]}));
test('reorders a scattered collection into a stepwise figure without changing pitches or owners',()=>{
 const arms=holding([24,0,12,14,16]),targets=arms.map(a=>a.target);
 const selected=feedingArms(arms,true,()=>.9);
 assert.deepEqual(selected.map(a=>a.target.note),[12,14,16]);
 assert.deepEqual(selected.map(a=>a.feedDelay),[0,.32,.64]);
 assert.deepEqual(arms.map(a=>a.target),targets);assert.ok(arms.every(a=>a.target.owner===a.index));
 advanceFeeding(selected[0],.3);const progress=selected[0].elapsed;
 assert.deepEqual(feedingArms(arms,false),[]);
 assert.deepEqual(feedingArms(arms,true,()=>{throw Error('must not recompose a paused phrase');}),selected);
 assert.equal(selected[0].elapsed,progress);
});
test('rolled chords exclude clashing seconds and retain unselected cargo',()=>{
 const arms=holding([12,14,16,19]),rolls=[.1,.1,.1,.99,.5];
 const selected=feedingArms(arms,true,()=>rolls.shift()??.5);
 assert.deepEqual(selected.map(a=>a.target.note),[12,16,19]);
 assert.deepEqual(selected.map(a=>a.feedDelay),[0,.065,.13]);
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
