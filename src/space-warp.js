import * as T from 'three';
// Local screen-space refraction anchored to world space, without animated UV jitter.
export function spaceWarpShader(){return {
 uniforms:{tDiffuse:{value:null},center:{value:new T.Vector2(.5,.5)},radius:{value:0},aspect:{value:1},amount:{value:0},chargeCenter:{value:new T.Vector2(.5,.5)},chargeRadius:{value:0},chargeAmount:{value:0}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`uniform sampler2D tDiffuse;
 uniform vec2 center,chargeCenter;uniform float radius,aspect,amount,chargeRadius,chargeAmount;varying vec2 vUv;
 void main(){
  vec2 metric=vec2(aspect,1.);vec2 delta=(vUv-center)*metric;float d=length(delta);
  float r=max(radius,.00001);float x=d/r;
  // Stretch passing stars into arcs, fading smoothly back to untouched space.
  float field=(1.-smoothstep(1.1,5.5,x))*smoothstep(.65,1.05,x);
  float bend=amount*r*.48*field/max(x,.85);
  vec2 offset=-delta/max(d,.00001)*bend;
  vec2 cd=(vUv-chargeCenter)*metric;float cr=max(chargeRadius,.00001),cx=length(cd)/cr;
  float envelope=1.-smoothstep(.2,1.8,cx);
  offset-=cd*chargeAmount*.055*envelope;
  vec2 uv=clamp(vUv+offset/metric,vec2(.001),vec2(.999));
  vec4 color=texture2D(tDiffuse,uv);
  float feather=max(r*.06,fwidth(d));float mask=smoothstep(r-feather,r+feather,d);
  color.rgb*=mix(1.,mask,amount);gl_FragColor=color;
 }`
};}
