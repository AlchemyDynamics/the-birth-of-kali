import * as T from 'three';
export function createIrisTexture(){
 const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');let seed=921;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const g=x.createRadialGradient(256,256,20,256,256,256);g.addColorStop(0,'#bddbf1');g.addColorStop(.28,'#526cab');g.addColorStop(.66,'#343275');g.addColorStop(.88,'#6599cc');g.addColorStop(1,'#080d28');x.fillStyle=g;x.fillRect(0,0,512,512);
 for(let i=0;i<1400;i++){const a=rnd()*Math.PI*2,r=35+rnd()*205;x.strokeStyle=`rgba(${90+rnd()*90},${120+rnd()*110},255,${.08+rnd()*.4})`;x.lineWidth=.5+rnd()*1.2;x.beginPath();x.moveTo(256+Math.cos(a)*r,256+Math.sin(a)*r);x.quadraticCurveTo(256+Math.cos(a+.025)*r*1.15,256+Math.sin(a+.025)*r*1.15,256+Math.cos(a+.05)*Math.min(249,r+10+rnd()*50),256+Math.sin(a+.05)*Math.min(249,r+10+rnd()*50));x.stroke();}
 for(let i=0;i<650;i++){const a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*239;x.fillStyle=`rgba(185,222,255,${.15+rnd()*.7})`;x.beginPath();x.arc(256+Math.cos(a)*r,256+Math.sin(a)*r,.4+rnd()*1.3,0,Math.PI*2);x.fill();}
 for(let i=0;i<450;i++){const a=rnd()*Math.PI*2,r=80+rnd()*155;x.fillStyle=`rgba(190,218,255,${.15+rnd()*.5})`;x.beginPath();x.ellipse(256+Math.cos(a)*r,256+Math.sin(a)*r,1+rnd()*3,.4+rnd(),a,0,Math.PI*2);x.fill();}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
}
export function createSuckerGeometry(){
 const profile=[[0,-.18],[.18,-.2],[.43,-.14],[.68,-.04],[.88,.09],[1,.13],[1.08,.06],[1.03,-.09],[.82,-.23],[.3,-.28]].map(([x,y])=>new T.Vector2(x,y));
 const g=new T.LatheGeometry(profile,24);g.rotateX(Math.PI/2);return g;
}
