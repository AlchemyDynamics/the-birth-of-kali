import {smooth} from './simulation.js';
export function createInnerCosmos(canvas,label){
 const ctx=canvas.getContext('2d'),size=180,ratio=Math.min(devicePixelRatio||1,2);canvas.width=canvas.height=size*ratio;
 let lastLabel='';
 function glow(x,y,r,alpha){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(148,221,255,${alpha})`);g.addColorStop(.25,`rgba(34,132,255,${alpha*.7})`);g.addColorStop(1,'rgba(0,40,180,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
 return {draw(time,food,collapse,holeScale){
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,size,size);ctx.translate(90,90);
  const black=collapse>=.65,star=food>=24&&!black,nebula=food>=8&&!star&&!black;
  const title=black?'SINGULARITY':star?(collapse>0?'COLLAPSING STAR':'BLUE STAR'):nebula?'NEBULA':food?'FIRST LIGHT':'DORMANT';
  const description=`${title.toLowerCase()}, ${food} lights consumed`;
  if(description!==lastLabel){label.textContent=title;canvas.setAttribute('aria-label',description);lastLabel=description;}
  ctx.strokeStyle='rgba(87,153,190,.13)';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(0,0,78,0,Math.PI*2);ctx.stroke();
  if(!food){ctx.fillStyle='#385667';ctx.beginPath();ctx.arc(0,0,1.5,0,Math.PI*2);ctx.fill();return;}
  ctx.globalCompositeOperation='lighter';
  if(!black){
   const mass=smooth(1,24,food),cloudFade=1-smooth(.28,.65,collapse);
   for(let i=0;i<60;i++){const a=i*2.39996+time*(.08+i%3*.014),r=(8+Math.sqrt(i/60)*45)*(.25+.75*mass),x=Math.cos(a)*r,y=Math.sin(a)*r*.68+Math.sin(time*.6+i)*4;glow(x,y,(9+mass*16)*(1+.15*Math.sin(time+i)),(.065+.1*mass)*cloudFade);}
   for(let i=0;i<Math.min(food,23);i++){const a=i*2.399+time*.1,r=Math.sqrt((i+.5)/24)*50;glow(Math.cos(a)*r,Math.sin(a)*r*.7,2.5,food>=8?.3:.65);}
   if(star){let r=10+smooth(24,56,food)*19;r*=collapse>0?(collapse<.28?1+collapse*1.4:Math.max(.02,1-(collapse-.28)/.37)):1;r*=1+.035*Math.sin(time*4);glow(0,0,r*2.4,.6);glow(0,0,r,1);ctx.fillStyle='#d8f7ff';ctx.beginPath();ctx.arc(0,0,r*.35,0,Math.PI*2);ctx.fill();}
  }else{
   const r=28*holeScale;glow(0,0,r*2.8,.22);
   ctx.save();ctx.rotate(-.3);ctx.scale(1,.38);
   for(let i=0;i<14;i++){ctx.strokeStyle=`rgba(65,156,255,${.1+.16*(1-i/14)})`;ctx.lineWidth=1.1;ctx.beginPath();ctx.ellipse(0,0,r*(1.4+i*.08),r*(1.4+i*.08),0,0,Math.PI*2);ctx.stroke();}
   ctx.restore();ctx.globalCompositeOperation='source-over';ctx.fillStyle='#000';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#9adfff';ctx.lineWidth=.9;ctx.stroke();
   ctx.strokeStyle='rgba(92,177,255,.7)';ctx.beginPath();ctx.ellipse(0,0,r*1.9,r*.5,-.3,0,Math.PI);ctx.stroke();
  }
  ctx.globalCompositeOperation='source-over';
 }};
}
