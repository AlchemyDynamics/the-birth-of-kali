import {createStarBoost} from '../src/star-boost.js';
import {captureLight} from '../src/simulation.js';
import test from 'node:test';
import assert from 'node:assert/strict';
const arms=()=>Array.from({length:8},(_,index)=>({index,target:null,cargo:[]}));
function add(a,n){return Array.from({length:n},()=>{const w={owner:null,eaten:false};captureLight(a,w);return w;});}
test('boost requires more than ten captured stars and preserves ten',()=>{
 for(const count of [0,9,10,11,12]){
  const a=arms(),stars=add(a,count),b=createStarBoost(a);
  assert.equal(b.start(),count>10);b.update(4);
  assert.equal(b.burned,Math.max(0,count-10));assert.equal(b.active,false);
  assert.equal(stars.filter(w=>!w.eaten).length,Math.min(count,10));
 }
});
test('boost burns at most two stars at one-second intervals',()=>{
 const a=arms(),stars=add(a,20),burns=[],b=createStarBoost(a,w=>burns.push(w));
 b.start();assert.equal(b.burned,1);b.update(.99);assert.equal(b.burned,1);
 b.update(.01);assert.equal(b.burned,2);assert.equal(b.active,true);
 b.start();b.update(1);assert.equal(b.active,false);assert.equal(b.burned,2);
 b.update(10);assert.equal(b.burned,2);assert.equal(stars.filter(w=>!w.eaten).length,18);
 assert.ok(burns.every(w=>w.burned&&w.eaten));
});
test('two-star cap holds across frame rates and long frames',()=>{
 for(const fps of [30,60,144]){const a=arms();add(a,20);const b=createStarBoost(a);b.start();for(let i=0;i<fps*3;i++)b.update(1/fps);assert.equal(b.burned,2);assert.equal(b.active,false);}
 const a=arms();add(a,20);const b=createStarBoost(a);b.start();b.update(6);assert.equal(b.burned,2);assert.equal(b.active,false);
});
test('fresh captures cannot exceed the per-boost cap; new activation resets it',()=>{
 const a=arms();add(a,11);const b=createStarBoost(a);b.start();add(a,10);
 b.update(1);b.update(1);assert.equal(b.burned,2);assert.equal(b.active,false);
 b.start();b.update(2);assert.equal(b.burned,4);assert.equal(b.active,false);
});
test('release preserves fuel and burning cargo clears its reach animation',()=>{
 const a=arms(),stars=add(a,12),b=createStarBoost(a);a[0].grabLight=stars[8];a[0].grabPoint={};
 b.start();assert.equal(stars[8].burned,true);assert.equal(a[0].target,stars[0]);assert.equal(a[0].grabPoint,null);
 b.stop();b.update(5);assert.equal(b.burned,1);assert.equal(b.active,false);
 assert.equal(stars.filter(w=>!w.eaten).length,11);
});
