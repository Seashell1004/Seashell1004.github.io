// Object-space rough stone: granular surface, no veins, poles or UV seams.
export function roughenStoneGeometry(geometry){
 const hash=(x,y,z)=>{let n=Math.imul(x,73856093)^Math.imul(y,19349663)^Math.imul(z,83492791);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
 const noise=(x,y,z)=>{const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),f=[x-ix,y-iy,z-iz].map(v=>v*v*(3-2*v));let result=0;for(let a=0;a<2;a++)for(let b=0;b<2;b++)for(let c=0;c<2;c++)result+=hash(ix+a,iy+b,iz+c)*(a?f[0]:1-f[0])*(b?f[1]:1-f[1])*(c?f[2]:1-f[2]);return result;};
 const p=geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),scale=1+(noise(x*8+13,y*8+7,z*8+23)-.5)*.035+(noise(x*19,y*19,z*19)-.5)*.012;p.setXYZ(i,x*scale,y*scale,z*scale);}geometry.computeVertexNormals();return geometry;
}
export function createRoughStoneMaterial(THREE){
 const material=new THREE.MeshStandardMaterial({color:'#fff4e3',emissive:'#ffe2b3',emissiveIntensity:1.35,roughness:.82,metalness:0,dithering:true});
 material.onBeforeCompile=shader=>{
 shader.vertexShader='varying vec3 vStonePosition;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStonePosition = position;');
 shader.fragmentShader=`varying vec3 vStonePosition;
 float stoneHash(vec3 p){p=fract(p*.3183099+vec3(.11,.17,.23));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
 float stoneNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(stoneHash(i),stoneHash(i+vec3(1,0,0)),f.x),mix(stoneHash(i+vec3(0,1,0)),stoneHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(stoneHash(i+vec3(0,0,1)),stoneHash(i+vec3(1,0,1)),f.x),mix(stoneHash(i+vec3(0,1,1)),stoneHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
 float stoneFbm(vec3 p){return .52*stoneNoise(p)+.26*stoneNoise(p*2.03+8.1)+.13*stoneNoise(p*4.11+16.7)+.065*stoneNoise(p*8.27);}
 vec2 marbleSample(vec3 p){float broad=stoneFbm(p*3.1+4.7);float grain=stoneNoise(p*19.);float fine=stoneNoise(p*51.+17.3);float pores=smoothstep(.69,.89,stoneNoise(p*27.+9.2));return vec2(pores,broad*.38+grain*.44+fine*.18);}
 `+shader.fragmentShader;
 shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec2 marble=marbleSample(vStonePosition);
 float marbleShade=clamp(.22+marble.y*.96-marble.x*.21,.16,.95);
 diffuseColor.rgb*=marbleShade;`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 totalEmissiveRadiance*=marbleShade;`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 roughnessFactor=clamp(.9+marble.y*.1,.9,1.);`);
 shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 float marbleHeight=marble.y*.55-marble.x*.16;
 vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition);
 vec3 r1=cross(sy,normal),r2=cross(normal,sx);float det=dot(sx,r1);
 vec3 surfaceGradient=sign(det)*(dFdx(marbleHeight)*r1+dFdy(marbleHeight)*r2);
 normal=normalize(abs(det)*normal-.085*surfaceGradient);`);
 };
 material.customProgramCacheKey=()=> 'object-space-rough-stone-v1';
 return material;
}
