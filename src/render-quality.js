export function renderPixelRatio(width,height,dpr,scale=1){
 return Math.min(dpr,1.75,Math.sqrt(2800000/Math.max(1,width*height)))*scale;
}
export function createRenderQuality(){
 let scale=1,total=0,samples=0,fastWindows=0;
 return {get scale(){return scale;},reset(){total=0;samples=0;fastWindows=0;},sample(milliseconds){
  // Ignore tab switches/debugger stalls. Change quality slowly, with hysteresis.
  if(milliseconds<=0||milliseconds>200)return false;
  total+=milliseconds;samples++;if(total<2000)return false;
  const average=total/samples;total=0;samples=0;const previous=scale;
  if(average>23){scale=Math.max(.65,scale*.9);fastWindows=0;}
  else if(average<17.5){if(++fastWindows>=4){scale=Math.min(1,scale+.05);fastWindows=0;}}
  else fastWindows=0;
  return Math.abs(scale-previous)>.001;
 }};
}
