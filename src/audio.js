// D major pentatonic, D4 through D7: open, gentle intervals over three octaves.
import {BELL_SCALE,bellFrequency} from './harmony.js';
export class Soundscape {
 constructor(){this.enabled=true;this.ctx=null;this.lastNote=-1;this.recentNotes=[];}
 pickNote(){
  const choices=BELL_SCALE.filter(note=>!this.recentNotes.includes(note));
  this.lastNote=choices[Math.floor(Math.random()*choices.length)];
  this.recentNotes.push(this.lastNote);if(this.recentNotes.length>2)this.recentNotes.shift();
  return bellFrequency(this.lastNote);
 }
 toggle(){this.enabled=!this.enabled;if(this.enabled)this.init();if(this.master)this.master.gain.setTargetAtTime(this.enabled?.09:0,this.ctx.currentTime,.4);return this.enabled;}
 init(){
  if(this.ctx){this.ctx.resume();return;}
  this.ctx=new AudioContext();const c=this.ctx;
  this.master=c.createGain();this.master.gain.value=.09;
  const soften=c.createBiquadFilter();soften.type='lowpass';soften.frequency.value=2800;soften.Q.value=.35;
  const limiter=c.createDynamicsCompressor();limiter.threshold.value=-18;limiter.knee.value=18;limiter.ratio.value=4;limiter.attack.value=.015;limiter.release.value=.3;
  this.master.connect(soften).connect(limiter).connect(c.destination);
  // A quiet diffuse tail instead of a bright metallic ping.
  const reverb=c.createConvolver(),wet=c.createGain(),buffer=c.createBuffer(2,Math.floor(c.sampleRate*1.8),c.sampleRate);let seed=71;
  for(let channel=0;channel<2;channel++){const data=buffer.getChannelData(channel);for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=(seed/2147483648-1)*Math.pow(1-i/data.length,3)*Math.min(1,i/(c.sampleRate*.04));}}
  reverb.buffer=buffer;wet.gain.value=.18;this.master.connect(reverb).connect(wet).connect(soften);
  for(const f of [36.7,55,73.5]){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;g.gain.value=.055;o.connect(g).connect(this.master);o.start();}
 }
 tone(f=220,length=2,volume=.12){
  if(!this.enabled||!this.ctx)return;const c=this.ctx,t=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.12);g.gain.exponentialRampToValueAtTime(.0001,t+length);o.connect(g).connect(this.master);o.start();o.stop(t+length+.1);o.onended=()=>{o.disconnect();g.disconnect();};
 }
 eat(note=null,gain=1){this.capture(.55*gain,note);}
 capture(volumeScale=1,note=null){
  if(!this.enabled||!this.ctx)return;const c=this.ctx,t=c.currentTime,f=BELL_SCALE.includes(note)?bellFrequency(note):this.pickNote();
  // Stable wisp pitches let successive captures overlap into their assigned chord.
  const softness=volumeScale*(.9+Math.random()*.1)*Math.pow(293.6647679174076/f,.18);
  for(const [ratio,level,decay,detune] of [[1,.08,3.8,-2],[1,.032,4.1,2],[2.002,.012,2.4,0],[3.01,.003,1.5,0]]){
   const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f*ratio;o.detune.value=detune;
   g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level*softness*.06,t+.04);g.gain.linearRampToValueAtTime(level*softness,t+.18);g.gain.exponentialRampToValueAtTime(.0001,t+decay);o.connect(g).connect(this.master);o.start(t);o.stop(t+decay+.05);o.onended=()=>{o.disconnect();g.disconnect();};
  }
 }
 jet(){
  if(!this.enabled||!this.ctx)return;const c=this.ctx,t=c.currentTime,b=c.createBuffer(1,Math.floor(c.sampleRate*.65),c.sampleRate),data=b.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=b;filter.type='lowpass';filter.frequency.value=300;filter.Q.value=.4;
  gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.16,t+.08);gain.gain.exponentialRampToValueAtTime(.0001,t+.64);source.connect(filter).connect(gain).connect(this.master);source.start();source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 }
 collapse(){this.tone(110,10,.24);this.tone(164.8,8,.09);}
}
