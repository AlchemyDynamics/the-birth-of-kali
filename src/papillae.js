import * as T from 'three';
// Chromatophore-like waves: spatially coherent color, with slower independent glow pulses.
export function createPapillaMaterial(skin){
 const material=skin.clone(),uniforms={papillaTime:{value:0},papillaEnergy:{value:0}};
 material.color.setHex(0xb8c8e9);material.roughness=.53;material.clearcoat=.8;material.clearcoatRoughness=.22;
 material.emissive.setHex(0);
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 papillaPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   papillaPosition=position;
   #ifdef USE_INSTANCING
    papillaPosition=(instanceMatrix*vec4(position,1.)).xyz;
   #endif`);
  shader.fragmentShader='uniform float papillaTime;uniform float papillaEnergy;varying vec3 papillaPosition;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 p=papillaPosition;
   float wave=.5+.5*sin(p.y*3.1+p.x*2.3+sin(p.z*4.2+papillaTime*.23)*1.8+papillaTime*.32);
   float patches=.5+.5*sin(p.x*8.3+p.z*6.7+sin(p.y*5.1-papillaTime*.19));
   vec3 pigment=mix(vec3(.055,.075,.25),vec3(.27,.16,.58),smoothstep(.1,.65,wave));
   pigment=mix(pigment,vec3(.14,.65,.92),smoothstep(.55,.94,wave)*patches);
   pigment=mix(pigment,vec3(.65,.83,1.),pow(patches,9.)*.55);
   diffuseColor.rgb*=pigment*2.;`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float pulse=.3+.7*pow(.5+.5*sin(papillaTime*(.65+.18*sin(p.x*3.))+p.y*4.2+p.z*3.7),2.);
   float border=0.;
   #ifdef USE_EMISSIVEMAP
    border=texture2D(emissiveMap,vEmissiveMapUv).b;
   #endif
   totalEmissiveRadiance+=pigment*papillaEnergy*pulse*(.2+.8*patches)*border*3.;`);
 };
 material.customProgramCacheKey=()=> 'organic-textured-borders-v2';
 return {material,uniforms};
}

export function proximityBrightness(distance){
 const t=T.MathUtils.clamp((26-distance)/23,0,1);
 return 1+1.8*t*t*(3-2*t);
}
