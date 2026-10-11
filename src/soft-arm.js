// Cubic B-spline sampling: continuous tangents, with the two end positions retained.
// The contact projection runs after sampling so smoothing cannot bury the skin.
export function sampleSoftArm(nodes, out, project) {
 const n=nodes.length-1;
 const start=nodes[0].map((v,k)=>2*v-nodes[1][k]),end=nodes[n].map((v,k)=>2*v-nodes[n-1][k]);
 for(let j=0;j<out.length;j++) {
  const x=j/(out.length-1)*n,i=Math.min(n-1,Math.floor(x)),t=x-i;
  const a=i===0?start:nodes[i-1],b=nodes[i],c=nodes[i+1],d=i+2>n?end:nodes[i+2];
  const weights=[(1-t)**3/6,(3*t**3-6*t*t+4)/6,(-3*t**3+3*t*t+3*t+1)/6,t**3/6];
  const p=[0,0,0];for(let k=0;k<3;k++)p[k]=a[k]*weights[0]+b[k]*weights[1]+c[k]*weights[2]+d[k]*weights[3];
  project?.(p,j/(out.length-1));out[j].set(...p);
 }
}
