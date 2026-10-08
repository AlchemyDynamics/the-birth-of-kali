import {NARRATION} from './narration-lines.js';
export class Narrator {
 constructor(){
  this.lines=new Map(Object.entries(NARRATION).map(([id,text])=>[text,id]));this.queue=[];this.seen=new Set();this.paused=false;this.active=false;
  this.player=new Audio();this.player.id='narration-player';this.player.hidden=true;this.player.preload='auto';this.player.volume=.7;document.body.appendChild(this.player);
  this.player.addEventListener('ended',()=>{this.active=false;this.next();});
  this.player.addEventListener('error',()=>{this.active=false;this.next();});
 }
 say(text){const id=this.lines.get(text);if(!id||this.seen.has(id))return;this.seen.add(id);this.queue.push(id);this.next();}
 next(){if(this.active||this.paused||!this.queue.length)return;this.active=true;this.player.src=`assets/narration/${this.queue.shift()}.mp3`;this.play();}
 play(){this.player.play().catch(()=>{this.active=false;});}
 setPaused(value){if(value===this.paused)return;this.paused=value;if(value)this.player.pause();else if(this.active)this.play();else this.next();}
 setMuted(value){this.player.muted=value;}
 clear(){this.player.pause();this.queue=[];this.active=false;}
}
