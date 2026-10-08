import {test} from 'node:test';import assert from 'node:assert/strict';import {Soundscape} from '../src/audio.js';
test('hums follow delayed meals, interruption, resume, and target changes',()=>{
 const a=new Soundscape();a.ctx={};const calls=[];let stopped=0;a.hum=(...args)=>{calls.push(args);return {stop(){stopped++;}};};const w={note:16,noteGain:.7},arm={target:w,feeding:true,elapsed:0,mealDuration:1.6,feedDelay:.2};
 a.feedVoice(arm);assert.equal(calls.length,0);arm.feedDelay=0;arm.elapsed=.8;a.feedVoice(arm);assert.equal(calls[0][0],16);assert.equal(calls[0][1],.7);assert.ok(Math.abs(calls[0][2]-1.2)<1e-9);a.feedVoice(arm);assert.equal(calls.length,1);
 arm.feeding=false;a.feedVoice(arm);assert.equal(stopped,1);arm.feeding=true;a.feedVoice(arm);assert.equal(calls.length,2);a.enabled=false;a.feedVoice(arm);assert.equal(stopped,2);
 a.enabled=true;arm.target={note:7,noteGain:.8};a.feedVoice(arm);assert.equal(calls[2][0],7);arm.target=null;a.feedVoice(arm);assert.equal(stopped,3);
});
