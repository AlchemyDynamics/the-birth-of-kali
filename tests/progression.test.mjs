import test from 'node:test';import assert from 'node:assert/strict';import {discoveryCount,clusterCount,FINAL_STARS} from '../src/progression.js';
test('discovery yields pair, trio, trio, quartet at collection boundaries',()=>{assert.deepEqual([2,4,7,10,14].map(discoveryCount),[2,3,3,4,0]);assert.equal(FINAL_STARS,350);});
test('small clusters dominate the weighted variety',()=>{const counts=[0,0,0,0,0,0,0];for(let i=0;i<10000;i++)counts[clusterCount(()=>(i+.5)/10000)]++;assert.deepEqual(counts.slice(2),[3200,2800,2200,1200,600]);});
