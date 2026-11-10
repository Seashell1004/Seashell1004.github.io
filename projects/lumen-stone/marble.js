// Object-space 3D marble: no UV coordinates, polar compression, or seam.
export function createMarbleMaterial(THREE){
 const material=new THREE.MeshStandardMaterial({color:'#fff4e3',emissive:'#ffe2b3',emissiveIntensity:1.35,roughness:.82,metalness:0,dithering:true});
 material.onBeforeCompile=shader=>{
 shader.vertexShader='varying vec3 vStonePosition;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStonePosition = position;');
 shader.fragmentShader=`varying vec3 vStonePosition;
 float stoneHash(vec3 p){p=fract(p*.3183099+vec3(.11,.17,.23));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
 float stoneNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(stoneHash(i),stoneHash(i+vec3(1,0,0)),f.x),mix(stoneHash(i+vec3(0,1,0)),stoneHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(stoneHash(i+vec3(0,0,1)),stoneHash(i+vec3(1,0,1)),f.x),mix(stoneHash(i+vec3(0,1,1)),stoneHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float stoneFbm(vec3 p){return .52*stoneNoise(p)+.26*stoneNoise(p*2.03+8.1)+.13*stoneNoise(p*4.11+16.7)+.065*stoneNoise(p*8.27);}
 vec2 marbleSample(vec3 p){p*=1.85;vec3 warp=vec3(stoneFbm(p+3.7),stoneFbm(p+13.2),stoneFbm(p+29.1));vec3 q=p+2.3*warp;float flow=q.x*.85+q.y*.42+q.z*.66+stoneFbm(q*1.4)*2.;float seam=abs(sin(flow*3.6));float vein=1.-smoothstep(.06,.42,seam);float branch=(1.-smoothstep(.025,.14,abs(sin(flow*8.2+stoneFbm(q*3.)*3.))))*.23;float cloud=stoneFbm(q*.85);return vec2(clamp(vein+branch,0.,1.),cloud);}
 `+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 marble=marbleSample(vStonePosition);
 float marbleShade=mix(.84+marble.y*.16,.12+marble.y*.1,marble.x*.92);
 diffuseColor.rgb*=marbleShade;`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 totalEmissiveRadiance*=marbleShade;`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 roughnessFactor=clamp(.77+marble.y*.14+marble.x*.04,.7,.96);`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 float marbleHeight=marble.y*.12-marble.x*.022;
 vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition);
 vec3 r1=cross(sy,normal),r2=cross(normal,sx);float det=dot(sx,r1);
 vec3 surfaceGradient=sign(det)*(dFdx(marbleHeight)*r1+dFdy(marbleHeight)*r2);
 normal=normalize(abs(det)*normal-.022*surfaceGradient);`);
 };
 material.customProgramCacheKey=()=> 'object-space-marble-v1';
 return material;
}
