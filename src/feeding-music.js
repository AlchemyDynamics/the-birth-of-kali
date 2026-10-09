// Compose with the pitches already held by different arms; never retune a light
// or swap cargo between tentacles. State belongs to this creature's arm array.
export const FEEDING_BPM=92,FEEDING_BEAT=60/FEEDING_BPM;
const phrases=new WeakMap();
const consonant=(a,b)=>[0,3,4,5,7,8,9].includes(Math.abs(a-b)%12);
export function composeMeal(arms,available,random=Math.random){
 let phrase=phrases.get(arms);
 if(!phrase){phrase={last:null,direction:random()<.5?1:-1,step:0,length:4+Math.floor(random()*3),waiting:new WeakMap()};phrases.set(arms,phrase);}
 for(const arm of available)phrase.waiting.set(arm.target,(phrase.waiting.get(arm.target)||0)+1);
 const cadence=phrase.step>=phrase.length-1;
 const score=arm=>{
  const note=arm.target.note,delta=phrase.last===null?0:note-phrase.last;
  const distance=phrase.last===null?Math.abs(note-12)*.3:Math.abs(delta);
  const repeat=delta===0&&phrase.last!==null?3:0;
  const turn=delta*phrase.direction<0?2:0;
  const resolution=cadence?([0,7].includes(note%12)?-7:2):0;
  return distance+repeat+turn+resolution-(phrase.waiting.get(arm.target)||0)*1.5;
 };
 const selected=[],pool=[...available];
 // Mostly rippling melodic figures, with occasional simultaneous chords.
 const chord=random()<.25,maxNotes=Math.min(available.length,1+Math.floor(random()*3));
 while(selected.length<maxNotes&&pool.length){
  const choices=pool.filter(a=>!chord||selected.every(b=>consonant(a.target.note,b.target.note)));
  if(!choices.length)break;
  choices.sort((a,b)=>score(a)-score(b));const arm=choices[0];selected.push(arm);pool.splice(pool.indexOf(arm),1);
  phrase.last=arm.target.note;phrase.waiting.delete(arm.target);phrase.step++;
  if(phrase.step>=phrase.length){phrase.step=0;phrase.direction*=-1;phrase.length=4+Math.floor(random()*3);}
 }
 return {selected,duration:FEEDING_BEAT*1.5,spacing:chord?0:FEEDING_BEAT*1.5,chord};
}
