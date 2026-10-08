import * as T from 'three';
// Seeded, periodic pigment, fine folds, and granular relief; no photographic assets.
export function createSkinMaps(){
 const size=512,canvases=Array.from({length:4},()=>{const c=document.createElement('canvas');c.width=c.height=size;return c;}),images=canvases.map(c=>c.getContext('2d').createImageData(size,size));
 const hash=(x,y,n)=>{x=(x%n+n)%n;y=(y%n+n)%n;let h=Math.imul(x+17,374761393)^Math.imul(y+83,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
 const noise=(u,v,n)=>{const x=u*n,y=v*n,ix=Math.floor(x),iy=Math.floor(y);let a=x-ix,b=y-iy;a=a*a*(3-2*a);b=b*b*(3-2*b);return T.MathUtils.lerp(T.MathUtils.lerp(hash(ix,iy,n),hash(ix+1,iy,n),a),T.MathUtils.lerp(hash(ix,iy+1,n),hash(ix+1,iy+1,n),a),b);};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,large=noise(u,v,6),medium=noise(u,v,19),grain=noise(u,v,110),warp=.018*(medium-.5),px=(u+warp)*38,py=(v+warp)*38,ix=Math.floor(px),iy=Math.floor(py);let nearest=9,second=9;
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const cx=ix+i,cy=iy+j,dx=cx+.15+.7*hash(cx,cy,38)-px,dy=cy+.15+.7*hash(cx+7,cy+11,38)-py,d=dx*dx+dy*dy;if(d<nearest){second=nearest;nearest=d;}else if(d<second)second=d;}
  const fold=Math.exp(-Math.max(0,Math.sqrt(second)-Math.sqrt(nearest))*22),pebble=Math.exp(-nearest*6),pigment=smoothstep(.36,.65,noise(u+.012*large,v,57));
  const height=T.MathUtils.clamp(.42+.22*pebble-.14*fold+.14*(medium-.5)+.12*(grain-.5),0,1),shade=.64+.18*large+.12*medium-.14*pigment,rough=.48+.28*fold+.12*grain-.13*pebble;
  const index=(y*size+x)*4;
  for(let k=0;k<3;k++){images[0].data[index+k]=255*shade;images[1].data[index+k]=255*height;images[2].data[index+k]=255*rough;}
  // Voronoi seams outline the relief cells; pigment breaks up the glowing rims.
  const light=T.MathUtils.clamp(fold*(.35+.65*medium)+Math.pow(Math.max(0,grain-.65),3)*5,0,1);
  images[3].data[index]=255*light*.18;images[3].data[index+1]=255*light*.65;images[3].data[index+2]=255*light;
  for(const im of images)im.data[index+3]=255;
 }
 const textures=canvases.map((c,i)=>{c.getContext('2d').putImageData(images[i],0,0);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(2,3);t.anisotropy=4;return t;});textures[0].colorSpace=T.SRGBColorSpace;
 return {map:textures[0],bumpMap:textures[1],roughnessMap:textures[2],emissiveMap:textures[3]};
}
function smoothstep(a,b,x){const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
