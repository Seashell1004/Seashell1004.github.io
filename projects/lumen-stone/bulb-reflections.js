import * as THREE from './vendor/three.module.js';
// Capture the actual stone board plus distant soft sources visible only to reflections.
export class BulbReflections {
 constructor(renderer,scene,bulb){
  this.renderer=renderer;this.scene=scene;this.bulb=bulb;this.last=-Infinity;this.dirty=true;this.previous=new THREE.Vector3(Infinity,0,0);
  this.target=new THREE.WebGLCubeRenderTarget(128,{type:THREE.HalfFloatType,generateMipmaps:true,minFilter:THREE.LinearMipmapLinearFilter});
  this.camera=new THREE.CubeCamera(.035,45,this.target);this.camera.layers.enable(1);
  const add=(w,h,position,color)=>{const material=new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide});const card=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);card.position.set(...position);card.lookAt(0,0,0);card.layers.set(1);scene.add(card);};
  add(2,7,[-5,7,-3],new THREE.Color(8,9,11));add(.8,5,[5,5,2],new THREE.Color(5,4.5,3.5));add(5,2,[0,7,6],new THREE.Color(.8,1,1.4));
 }
 invalidate(){this.dirty=true;}
 update(now,force=false){
  const object=this.bulb.group;if(!object.visible||!object.userData.loaded)return;
  const changed=object.position.distanceToSquared(this.previous)>.003;
  if(!force&&this.last!==-Infinity&&((!changed&&!this.dirty)||now-this.last<220))return;
  this.camera.position.copy(object.position);object.visible=false;
  try{this.camera.update(this.renderer,this.scene);this.target.texture.needsPMREMUpdate=true;if(this.last===-Infinity)this.bulb.setEnvironment(this.target.texture);this.last=now;this.dirty=false;this.previous.copy(object.position);}finally{object.visible=true;}
 }
}
