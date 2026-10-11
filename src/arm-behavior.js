// A small local sensorimotor controller per arm, not a neuron-level connectome.
// Smooth internal state modulates the whole bend, with a shared task as context.
export function createArmBehavior(index) {
 return {index,phase:index*2.399963,touch:0,chemical:0,strain:0,load:0,sampleTime:0,
  intention:'explore',sweep:0,bow:0,stiffness:0};
}
export function updateArmBehavior(b,input,dt,time) {
 const follow=1-Math.exp(-dt*4);
 for(const key of ['touch','chemical','strain','load'])b[key]+=(Math.max(0,Math.min(1,input[key]||0))-b[key])*follow;
 b.sampleTime=input.touch>.5?b.sampleTime+dt:Math.max(0,b.sampleTime-dt*2);
 b.intention=input.anchored?'brace':b.touch>.35?'sample':b.chemical>.32?'follow cue':'explore';
 const stiffness=input.anchored?.9:Math.min(.65,b.touch*.55+b.strain*.6);
 b.stiffness+=(stiffness-b.stiffness)*follow;
 const activity=1-b.stiffness;
 // Broad, slow changes in curvature recruit the muscular upper half as well as tips.
 const frequency=.38+.05*(b.index%3)+b.chemical*.09;
 const sweep=activity*(.48*Math.sin(time*frequency+b.phase)+.17*Math.sin(time*.23+b.phase*1.7));
 const bow=activity*(.45+.32*Math.sin(time*.31+b.phase*.8))+b.touch*.12;
 b.sweep+=(sweep-b.sweep)*follow;b.bow+=(bow-b.bow)*follow;
 return b;
}
