import {test} from 'node:test';import assert from 'node:assert/strict';
import {HarmonicField,CHORDS,BELL_SCALE,bellFrequency} from '../src/harmony.js';
import {Soundscape} from '../src/audio.js';
test('harmonic sets of 1–6 lights stay in scale and use distinct chord voices',()=>{
 let seed=18;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296),field=new HarmonicField(random);let previous=field.chord;
 for(let i=0;i<600;i++){const count=i%6+1,set=field.next(count),chord=CHORDS.find(c=>c.name===set[0].chord);assert.equal(set.length,count);assert.equal(new Set(set.map(n=>n.note)).size,count);assert.notEqual(chord,previous);assert.ok(chord.classes.filter(n=>previous.classes.includes(n)).length>=2);
 for(const n of set){assert.ok(BELL_SCALE.includes(n.note));assert.ok(chord.classes.includes(n.note%12));assert.ok(bellFrequency(n.note)>=293&&bellFrequency(n.note)<=1175);assert.ok(n.noteGain>0&&n.noteGain<=1);}
 if(count>=3)assert.ok(new Set(set.map(n=>n.note%12)).size>=3);previous=chord;
 const single=field.single();assert.ok(chord.classes.includes(single.note%12));
 }
});
test('swallow replays the assigned note at a softer level',()=>{const audio=new Soundscape();let heard;audio.capture=(gain,note)=>heard={gain,note};audio.eat(16,.7);assert.equal(heard.note,16);assert.equal(heard.gain,.55*.7);});
