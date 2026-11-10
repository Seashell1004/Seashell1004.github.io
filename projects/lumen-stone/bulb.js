import * as THREE from './vendor/three.module.js';
// User-supplied geometry and textures; the emission mask identifies the actual filament.
export function createBulb(){
 const group=new THREE.Group();group.visible=false;
 const loader=new THREE.TextureLoader(),root=new URL('./assets/bulb/',import.meta.url),emitterCenter=new THREE.Vector3();
 const materials={},glowMaterial=new THREE.SpriteMaterial({color:'#ffd49b',transparent:true,opacity:.12,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false});
 let filamentGlow;let color='#ffe2b3',power=1;
 const texture=async(name,srgb=false)=>{const map=await loader.loadAsync(new URL(name+'.jpg',root).href);if(srgb)map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;return map;};
 const ready=Promise.all([fetch(new URL('mesh.json',root)).then(r=>{if(!r.ok)throw Error('Bulb model unavailable');return r.json();}),texture('diff',true),texture('nor_gl'),texture('rough'),texture('metal'),texture('emissive',true)]).then(([parts,map,normalMap,roughnessMap,metalnessMap,emissiveMap])=>{
  materials.glass=new THREE.MeshPhysicalMaterial({color:'#f7fbff',normalMap,normalScale:new THREE.Vector2(.045,.045),roughnessMap,roughness:.16,metalness:0,transmission:1,thickness:.025,ior:1.47,attenuationColor:'#fff5e7',attenuationDistance:20,envMapIntensity:.85,side:THREE.FrontSide,transparent:false,opacity:1});
  materials.base=new THREE.MeshStandardMaterial({map,normalMap,roughnessMap,metalnessMap,metalness:1,roughness:.8,normalScale:new THREE.Vector2(.7,.7),envMapIntensity:.65});
  materials.filament=new THREE.MeshStandardMaterial({color:'#241208',roughness:1,metalness:0,emissiveMap,emissive:color,emissiveIntensity:20*power});
  const mask=document.createElement('canvas');mask.width=emissiveMap.image.width;mask.height=emissiveMap.image.height;
  const ctx=mask.getContext('2d',{willReadFrequently:true});ctx.drawImage(emissiveMap.image,0,0);const pixels=ctx.getImageData(0,0,mask.width,mask.height).data;
  const emissionAt=(u,v)=>{const x=THREE.MathUtils.clamp(Math.floor(u*mask.width),0,mask.width-1),y=THREE.MathUtils.clamp(Math.floor((1-v)*mask.height),0,mask.height-1),i=(y*mask.width+x)*4;return Math.max(pixels[i],pixels[i+1],pixels[i+2]);};
  const make=(part,material)=>{if(!part.position.length)return;const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(part.position,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(part.normal,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(part.uv,2));geo.computeBoundingSphere();const mesh=new THREE.Mesh(geo,material);group.add(mesh);return mesh;};
  parts.forEach((part,index)=>{
   for(let i=0;i<part.position.length;i+=3){part.position[i]*=-24;part.position[i+1]*=24;part.position[i+2]=(.05-part.position[i+2])*24;part.normal[i]*=-1;part.normal[i+2]*=-1;}
   if(index===0){make(part,materials.glass);return;}
   const base={position:[],normal:[],uv:[]},filament={position:[],normal:[],uv:[]};
   for(let i=0;i<part.position.length;i+=9){const j=i/3*2,u=(part.uv[j]+part.uv[j+2]+part.uv[j+4])/3,v=(part.uv[j+1]+part.uv[j+3]+part.uv[j+5])/3,dest=emissionAt(u,v)>60?filament:base;dest.position.push(...part.position.slice(i,i+9));dest.normal.push(...part.normal.slice(i,i+9));dest.uv.push(...part.uv.slice(j,j+6));}
   make(base,materials.base);const wire=make(filament,materials.filament);
   if(wire){wire.geometry.computeBoundingBox();wire.geometry.boundingBox.getCenter(emitterCenter);group.userData.filamentTriangles=filament.position.length/9;}
  });
  // A restrained lens glow follows the filament, without blooming the HTML surface.
  const c=document.createElement('canvas');c.width=c.height=128;const gc=c.getContext('2d'),gradient=gc.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,'#fff9');gradient.addColorStop(.2,'#fff4');gradient.addColorStop(.55,'#fff1');gradient.addColorStop(1,'#fff0');gc.fillStyle=gradient;gc.fillRect(0,0,128,128);
  glowMaterial.map=new THREE.CanvasTexture(c);glowMaterial.needsUpdate=true;filamentGlow=new THREE.Sprite(glowMaterial);filamentGlow.position.copy(emitterCenter);filamentGlow.scale.set(.65,.65,1);filamentGlow.renderOrder=5;group.add(filamentGlow);
  group.userData.loaded=true;
 }).catch(e=>{group.userData.error=e.message;console.error('Bulb model',e);});
 return {group,ready,emitterCenter,materials,setEnvironment(map){for(const material of Object.values(materials)){material.envMap=map;material.needsUpdate=true;}},setColor(value){color=value;materials.filament?.emissive.set(value);glowMaterial.color.set(value);},setStrength(value){power=value;if(materials.filament)materials.filament.emissiveIntensity=20*value;glowMaterial.opacity=.1*Math.sqrt(value);}};
}
