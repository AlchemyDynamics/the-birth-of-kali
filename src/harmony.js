// All pitches are semitones above D4, confined to D-major pentatonic, D4–D6.
export const BELL_SCALE=[0,2,4,7,9,12,14,16,19,21,24];
export const CHORDS=[
 {name:'D major',voices:[0,7,16],classes:[0,4,7]},
 {name:'B minor',voices:[9,16,24],classes:[9,0,4]},
 {name:'D6',voices:[0,7,16,21],classes:[0,4,7,9]},
 {name:'Bm7',voices:[9,16,24,7],classes:[9,0,4,7]},
 {name:'Dsus2',voices:[0,7,14],classes:[0,2,7]},
 {name:'Asus4',voices:[7,14,24],classes:[7,0,2]}
];
const shuffle=(values,random)=>{const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export class HarmonicField {
 constructor(random=Math.random){this.random=random;this.chord=CHORDS[0];this.serial=0;this.looseIndex=0;}
 next(count){
  // Shared tones connect successive groups; no fixed ascending progression.
  const choices=CHORDS.filter(c=>c!==this.chord&&c.classes.filter(p=>this.chord.classes.includes(p)).length>=2);
  this.chord=choices[Math.floor(this.random()*choices.length)];this.serial++;this.looseIndex=0;
  const pool=BELL_SCALE.filter(n=>this.chord.classes.includes(n%12));
  const notes=this.chord.voices.slice(0,count);
  for(const n of shuffle(pool.filter(n=>!notes.includes(n)),this.random)){if(notes.length>=count)break;notes.push(n);}
  if(count===1)notes[0]=this.chord.voices[Math.floor(this.random()*this.chord.voices.length)];
  return shuffle(notes,this.random).map(note=>({note,chord:this.chord.name,harmonyId:this.serial,noteGain:.95/Math.sqrt(Math.max(1,count*.5))}));
 }
 single(){const note=this.chord.voices[this.looseIndex++%this.chord.voices.length];return {note,chord:this.chord.name,harmonyId:this.serial,noteGain:.8};}
}
export const bellFrequency=note=>293.6647679174076*Math.pow(2,note/12);
