import {createStarBoost} from '../src/star-boost.js';
import {captureLight} from '../src/simulation.js';
import test from 'node:test';
import assert from 'node:assert/strict';
const arms=()=>Array.from({length:8},(_,index)=>({index,target:null,cargo:[]}));
function add(a,n){return Array.from({length:n},()=>{const w={owner:null,eaten:false};captureLight(a,w);return w;});}
test('boost requires captured fuel and spends it without swallowing',()=>{
 const a=arms(),burns=[],boost=createStarBoost(a,w=>burns.push(w));assert.equal(boost.start(),false);
 const stars=add(a,3);assert.equal(boost.start(),true);assert.equal(boost.burned,1);
 boost.update(.99);assert.equal(boost.burned,1);boost.update(.01);assert.equal(boost.burned,2);
 boost.update(1);assert.equal(boost.burned,3);assert.equal(boost.active,true);
 boost.update(1);assert.equal(boost.active,false);assert.equal(burns.length,3);
 assert.ok(stars.every(w=>w.eaten&&w.burned));assert.ok(a.every(x=>!x.target));
});
test('fuel consumption is stable across frame rates and large timesteps',()=>{
 for(const fps of [30,60,144]){const a=arms();add(a,5);const b=createStarBoost(a);b.start();for(let i=0;i<fps*5;i++)b.update(1/fps);assert.equal(b.burned,5);assert.equal(b.active,false);}
 const a=arms();add(a,5);const b=createStarBoost(a);b.start();b.update(6);assert.equal(b.burned,5);assert.equal(b.active,false);
});
test('newly captured fuel extends the boost and cargo burns before meals',()=>{
 const a=arms(),stars=add(a,9),b=createStarBoost(a);a[0].grabLight=stars[8];a[0].grabPoint={};
 b.start();assert.equal(stars[8].burned,true);assert.equal(a[0].target,stars[0]);assert.equal(a[0].grabPoint,null);
 b.update(8.5);add(a,1);b.update(.5);assert.equal(b.active,true);assert.equal(b.burned,10);b.update(1);assert.equal(b.active,false);
});
test('partially eaten fuel clears its meal and reach animation',()=>{
 const a=arms(),[w]=add(a,1);Object.assign(a[0],{elapsed:2,feeding:true,feedSchedule:{},grabLight:w,grabPoint:{}});
 const b=createStarBoost(a);b.start();assert.equal(a[0].feedSchedule,null);assert.equal(a[0].elapsed,0);assert.equal(a[0].feeding,false);assert.equal(a[0].grabLight,null);
 b.stop();b.update(5);assert.equal(b.burned,1);assert.equal(b.active,false);
});
