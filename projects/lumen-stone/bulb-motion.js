import * as THREE from './vendor/three.module.js';
import {DEFAULT_MOTION_SETTINGS,surfaceHeight} from './physics.mjs';
export const BULB_SHAPES=[{z:0,r:.72,mass:1},{z:1.25,r:.3,mass:.24}];
const LENGTH=1.25,AXIS=new THREE.Vector3(0,0,1);
export class BulbMotion{
 constructor(x=0,z=0){this.settings={...DEFAULT_MOTION_SETTINGS};this.onImpact=()=>{};this.onCapImpact=()=>{};this.home={x,z};this.head=new THREE.Vector3();this.cap=new THREE.Vector3();this.headVelocity=new THREE.Vector3();this.capVelocity=new THREE.Vector3();this.grip=new THREE.Vector3();this.quaternion=new THREE.Quaternion();this.reset({x,z});}
 get x(){return this.head.x;}set x(value){this.translate(value-this.head.x,0);}
 get z(){return this.head.z;}set z(value){this.translate(0,value-this.head.z);}
 translate(dx,dz){const floorBefore=this.floor(this.x,this.z);this.head.x+=dx;this.cap.x+=dx;this.head.z+=dz;this.cap.z+=dz;if(!this.held){const dy=this.floor(this.x,this.z)-floorBefore;this.head.y+=dy;this.cap.y+=dy;}this.groundAnchor=null;this.headAnchor=null;this.resting=false;}
 nudge(dx,dz){if(this.groundAnchor)this.orbitSpeed+=(dx*Math.cos(this.orbitAngle)-dz*Math.sin(this.orbitAngle))*.3;else{this.headVelocity.x+=dx*.3;this.headVelocity.z+=dz*.3;}this.resting=false;}
 get vx(){return this.headVelocity.x;}set vx(v){this.headVelocity.x=this.capVelocity.x=v;this.resting=false;}
 get vz(){return this.headVelocity.z;}set vz(v){this.headVelocity.z=this.capVelocity.z=v;this.resting=false;}
 get vy(){return this.headVelocity.y;}set vy(v){this.headVelocity.y=v;}
 floor(x,z){return surfaceHeight(x,z,this.home,this.settings.wellRadius);}
 get lift(){return Math.max(0,Math.min(this.head.y-.72-this.floor(this.head.x,this.head.z),this.cap.y-.3-this.floor(this.cap.x,this.cap.z)));}
 get landingPhase(){return this.held?(this.erecting?'erecting':'held'):this.groundAnchor?'turning':this.headAnchor?'tipping':'falling';}
 get swingAngle(){const offset=this.head.clone().sub(this.cap);return THREE.MathUtils.radToDeg(Math.atan2(Math.hypot(offset.x,offset.z),-offset.y));}
 get support(){return this.head.y-this.floor(this.x,this.z)-this.lift;}
 reset(home){this.erecting=null;this.home={...home};const tilt=Math.asin((.72-.3)/LENGTH),direction=new THREE.Vector3(Math.sin(-.5)*Math.cos(tilt),-Math.sin(tilt),Math.cos(-.5)*Math.cos(tilt));this.head.set(home.x,.72+this.floor(home.x,home.z),home.z);this.cap.copy(this.head).addScaledVector(direction,LENGTH);for(let i=0;i<12;i++){this.cap.y=.3+this.floor(this.cap.x,this.cap.z);const horizontal=Math.sqrt(Math.max(.01,LENGTH*LENGTH-(this.cap.y-this.head.y)**2));this.cap.x=this.head.x+Math.sin(-.5)*horizontal;this.cap.z=this.head.z+Math.cos(-.5)*horizontal;}this.headVelocity.set(0,0,0);this.capVelocity.set(0,0,0);this.held=false;this.releaseFreeFall=false;this.pickupAge=0;this.liftVelocity=0;this.groundAnchor=null;this.headAnchor=null;this.swingLimitEngaged=false;this.landingArmed=false;this.capImpactArmed=false;this.roll=0;this.resting=false;this.updatePose();}
 beginGrab(gripX=this.cap.x,gripZ=this.cap.z){this.dragVelocity=new THREE.Vector2();this.dragInputAge=Infinity;const headHit=Math.hypot(gripX-this.head.x,gripZ-this.head.z)<Math.hypot(gripX-this.cap.x,gripZ-this.cap.z);this.erecting=headHit?{age:0,head:this.head.clone(),pointer:new THREE.Vector2(gripX,gripZ),axis:this.cap.clone().sub(this.head).normalize(),clearance:this.head.y-this.floor(this.head.x,this.head.z)-.72}:null;this.captureOffset=new THREE.Vector2(this.cap.x-gripX,this.cap.z-gripZ);this.pickupAge=0;this.liftVelocity=0;this.releaseFreeFall=false;this.headVelocity.set(0,0,0);this.capVelocity.set(0,0,0);this.orbitSpeed=0;this.held=true;this.groundAnchor=null;this.headAnchor=null;this.swingLimitEngaged=false;this.resting=false;this.landingArmed=true;this.capImpactArmed=true;this.grip.copy(this.cap);this.setGrip(gripX,gripZ);}
 setGrip(x,z,dt){if(this.held&&dt>0){const input=new THREE.Vector2(x-this.grip.x,z-this.grip.z).divideScalar(dt).clampLength(0,12);this.dragVelocity.lerp(input,1-Math.exp(-dt/.045));this.dragInputAge=0;}this.grip.x=x;this.grip.z=z;this.grip.y=this.floor(x,z)+3.25;}
 endGrab(){
  this.erecting=null;
  // Release the hand constraint without applying a new pose or inheriting the lifting impulse.
  const vy=Math.min(0,(this.headVelocity.y+.24*this.capVelocity.y)/1.24);
  const toss=(this.dragVelocity||new THREE.Vector2()).clone();if((this.dragInputAge??Infinity)>.12||toss.length()<.15)toss.set(0,0);else toss.multiplyScalar(this.settings.throwStrength*Math.exp(-(this.dragInputAge||0)/.06)).clampLength(0,this.settings.maxThrowSpeed);
  this.headVelocity.set(toss.x,vy,toss.y);this.capVelocity.copy(this.headVelocity);
  this.groundAnchor=null;this.headAnchor=null;this.held=false;this.releaseFreeFall=true;
  this.landingArmed=true;this.capImpactArmed=true;this.resting=false;
 }
 capContact(speed){if(!this.capImpactArmed)return;this.capImpactArmed=false;if(speed>.3)this.onCapImpact(speed);}
 normal(p){const e=.015;return new THREE.Vector3((this.floor(p.x-e,p.z)-this.floor(p.x+e,p.z))/(2*e),1,(this.floor(p.x,p.z-e)-this.floor(p.x,p.z+e))/(2*e)).normalize();}
 step(dt,home,bounds){if(home.x!==this.home.x||home.z!==this.home.z||this.lastWellRadius!==this.settings.wellRadius)this.resting=false;this.lastWellRadius=this.settings.wellRadius;this.home={...home};const steps=Math.max(1,Math.ceil(dt*120)),h=dt/steps;for(let i=0;i<steps;i++)this.integrate(h,bounds);this.updatePose();}
 integrate(dt,bounds){
  if(this.held&&this.erecting){this.integrateErect(dt);return;}
  if(this.groundAnchor&&!this.held){this.integrateOrbit(dt,bounds);return;}
  if(this.resting&&!this.held)return;
  if(this.releaseFreeFall&&!this.held){this.integrateFreeFall(dt,bounds);return;}
  if(this.held)this.dragInputAge=(this.dragInputAge??Infinity)+dt;
  const oldHead=this.head.clone(),oldCap=this.cap.clone(),p=this.settings;
  if(this.held){
   this.pickupAge+=dt;if(this.swingLimitEngaged)this.swingLimitAge+=dt;
   const previousGripVelocity=this.capVelocity.clone(),follow=1-Math.exp(-p.gripFollow*dt);
   const capture=1-THREE.MathUtils.smootherstep(this.pickupAge,0,p.pickupTransition),targetX=this.grip.x+(this.captureOffset?.x||0)*capture,targetZ=this.grip.z+(this.captureOffset?.y||0)*capture;
   this.cap.x=THREE.MathUtils.lerp(this.cap.x,targetX,follow);this.cap.z=THREE.MathUtils.lerp(this.cap.z,targetZ,follow);const liftAcceleration=THREE.MathUtils.clamp(p.liftSpeed*p.liftSpeed*(this.grip.y-this.cap.y)-2*p.liftSpeed*this.liftVelocity,-30,30);this.liftVelocity=THREE.MathUtils.clamp(this.liftVelocity+liftAcceleration*dt,-5,5);this.cap.y+=this.liftVelocity*dt;
   const gripVelocity=this.cap.clone().sub(oldCap).divideScalar(dt),change=gripVelocity.clone().sub(previousGripVelocity),inertia=p.dragInertia;
   if(this.pickupAge<.3)change.clampLength(0,120*dt);
   this.headVelocity.x+=change.x*(1-inertia);this.headVelocity.z+=change.z*(1-inertia);
   this.headVelocity.y-=p.swingGravity*dt;
   const radial=this.head.clone().sub(this.cap).normalize(),relative=this.headVelocity.clone().sub(gripVelocity);relative.addScaledVector(radial,-relative.dot(radial));
   this.headVelocity.addScaledVector(relative,-(1-Math.exp(-(p.swingDamping+10*Math.exp(-this.pickupAge*6))*dt)));this.head.addScaledVector(this.headVelocity,dt);
  }
  else{
   for(const velocity of [this.headVelocity,this.capVelocity]){velocity.y-=15*dt;const speed=Math.hypot(velocity.x,velocity.z);if(speed>p.maxSpeed){velocity.x*=p.maxSpeed/speed;velocity.z*=p.maxSpeed/speed;}}
   this.head.addScaledVector(this.headVelocity,dt);this.cap.addScaledVector(this.capVelocity,dt);
  }
  const incoming=[this.headVelocity.clone(),this.capVelocity.clone()],points=[this.head,this.cap],velocities=[this.headVelocity,this.capVelocity],touch=[false,false];
  // Position-based rigid distance constraint; the grip is a kinematic endpoint when held.
  for(let iteration=0;iteration<18;iteration++){
   const delta=this.cap.clone().sub(this.head),distance=delta.length(),wHead=this.headAnchor?delta.y*delta.y/Math.max(distance*distance,1e-8):1,wCap=this.held?0:this.groundAnchor?(delta.y*delta.y/Math.max(distance*distance,1e-8))/.24:1/.24;
   if(distance>1e-8){const error=(distance-LENGTH)/distance;if(this.headAnchor)this.head.y+=delta.y*error/Math.max(wHead+wCap,1e-8);else this.head.addScaledVector(delta,error*wHead/Math.max(wHead+wCap,1e-8));if(!this.held){if(this.groundAnchor)this.cap.y-=delta.y*error*(1/.24)/(wHead+wCap);else this.cap.addScaledVector(delta,-error*wCap/(wHead+wCap));}}
   if(!this.held&&this.headAnchor){this.head.x=this.headAnchor.x;this.head.z=this.headAnchor.y;}
   if(!this.held&&this.groundAnchor){this.cap.x=this.groundAnchor.x;this.cap.z=this.groundAnchor.y;}
   if(this.held){
    const maxAngle=THREE.MathUtils.degToRad(this.settings.maxSwingAngle??45),offset=this.head.clone().sub(this.cap),horizontal=Math.hypot(offset.x,offset.z),angle=Math.atan2(horizontal,-offset.y);
    // Let the head leave the floor before engaging the suspension cone.
    if(!this.swingLimitEngaged&&this.cap.y>=this.floor(this.cap.x,this.cap.z)+.72+LENGTH+.02){this.swingLimitEngaged=true;this.swingLimitAge=0;this.initialSwingLimit=Math.max(angle,maxAngle);}
    const blend=THREE.MathUtils.smoothstep(this.swingLimitAge||0,0,.45),limit=this.swingLimitEngaged?THREE.MathUtils.lerp(this.initialSwingLimit,maxAngle,blend):maxAngle;this.effectiveSwingAngle=limit;
    if(this.swingLimitEngaged&&angle>limit){const length=LENGTH*Math.sin(limit);if(horizontal>1e-8){offset.x*=length/horizontal;offset.z*=length/horizontal;}else{offset.x=length;offset.z=0;}offset.y=-LENGTH*Math.cos(limit);this.head.copy(this.cap).add(offset);}
   }
   for(let i=0;i<2;i++){
    if(this.held&&i===1)continue;const point=points[i],radius=BULB_SHAPES[i].r,penetration=this.floor(point.x,point.z)+radius-point.y;
    if(penetration>0){const n=this.normal(point);point.addScaledVector(n,penetration/n.y);touch[i]=true;}
    for(const key of ['x','z'])point[key]=THREE.MathUtils.clamp(point[key],-bounds[key]+radius,bounds[key]-radius);
   }
  }
  if(!this.held&&!this.groundAnchor){
   if(touch[0]&&!this.headAnchor)this.headAnchor=new THREE.Vector2(this.head.x,this.head.z);
   if(touch[1]){this.groundAnchor=new THREE.Vector2(this.cap.x,this.cap.z);this.headAnchor=null;this.startOrbitPending=true;}
  }
  this.headVelocity.copy(this.head).sub(oldHead).divideScalar(dt);this.capVelocity.copy(this.cap).sub(oldCap).divideScalar(dt);
  if(this.held&&this.swingLimitEngaged){const maxAngle=this.effectiveSwingAngle??THREE.MathUtils.degToRad(this.settings.maxSwingAngle??45),offset=this.head.clone().sub(this.cap),horizontal=Math.hypot(offset.x,offset.z);if(horizontal>1e-8&&this.swingAngle>=THREE.MathUtils.radToDeg(maxAngle)-.05){const outward=new THREE.Vector3(offset.x/horizontal*Math.cos(maxAngle),Math.sin(maxAngle),offset.z/horizontal*Math.cos(maxAngle)),relative=this.headVelocity.clone().sub(this.capVelocity),speed=relative.dot(outward);if(speed>0)this.headVelocity.addScaledVector(outward,-speed);}}
  if(!this.held){
   let impact=0;
   if(touch[1])this.capContact(Math.max(0,-incoming[1].dot(this.normal(this.cap))));
   for(let i=0;i<2;i++)if(touch[i]){
    const n=this.normal(points[i]),velocity=velocities[i],vn=incoming[i].dot(n);impact=Math.max(impact,-vn);
    const normalSpeed=velocity.dot(n);if(normalSpeed<0)velocity.addScaledVector(n,-normalSpeed);
    if(vn<-.8)velocity.addScaledVector(n,-vn*p.restitution);
    // The cap grips the stone; the round glass has much lower rolling resistance.
    const tangent=velocity.clone().addScaledVector(n,-velocity.dot(n));
    if(i===1){const axis=this.cap.clone().sub(this.head);axis.addScaledVector(n,-axis.dot(n)).normalize();const along=axis.multiplyScalar(tangent.dot(axis)),sideways=tangent.clone().sub(along);velocity.addScaledVector(along,-(1-Math.exp(-7*dt))).addScaledVector(sideways,-(1-Math.exp(-24*dt)));}
    else velocity.addScaledVector(tangent,-(1-Math.exp(-.18*dt)));
   }
   if(this.landingArmed&&impact>.5){this.landingArmed=false;if(touch[0])this.onImpact(impact);
    // A slightly uneven first contact converts a small part of the impact into rocking.
    // Without it, a perfectly upright two-sphere model can balance forever on one point.
    const axis=this.cap.clone().sub(this.head).normalize();if(this.headAnchor&&Math.abs(axis.y)>.65){const direction=new THREE.Vector2(axis.x,axis.z);if(direction.length()<.05)direction.set(Math.sin(-.5),Math.cos(-.5));direction.normalize();const kick=Math.min(.6,impact*.1);this.capVelocity.x+=direction.x*kick;this.capVelocity.z+=direction.y*kick;}
   }
   if(this.headAnchor){this.headVelocity.x=this.headVelocity.z=0;}
   if(this.groundAnchor){this.capVelocity.x=this.capVelocity.z=0;this.headVelocity.multiplyScalar(Math.exp(-.25*dt));}
   const heading=Math.atan2(this.head.x-this.cap.x,this.head.z-this.cap.z),target=Math.atan2(this.home.x-this.cap.x,this.home.z-this.cap.z);this.turnError=Math.atan2(Math.sin(target-heading),Math.cos(target-heading));
   if(this.groundAnchor&&touch.some(Boolean)&&Math.abs(this.turnError)<.008&&this.headVelocity.length()<.018&&this.capVelocity.length()<.025){this.headVelocity.set(0,0,0);this.capVelocity.set(0,0,0);this.resting=true;}else this.resting=false;
  }
  const direction=this.cap.clone().sub(this.head).normalize(),travel=this.head.clone().sub(oldHead),cross=new THREE.Vector3(direction.z,0,-direction.x).normalize();
  if(!this.held&&touch[0])this.roll+=travel.dot(cross)/.72;
  if(this.startOrbitPending){this.startOrbitPending=false;this.startOrbit();}
 }

 integrateErect(dt){
  this.dragInputAge=(this.dragInputAge??Infinity)+dt;const stage=this.erecting,oldHead=this.head.clone(),oldCap=this.cap.clone();stage.age+=dt;
  const blend=THREE.MathUtils.smootherstep(stage.age,0,this.settings.pickupTransition),follow=1-Math.exp(-this.settings.gripFollow*dt);
  const tx=this.grip.x+(stage.head.x-stage.pointer.x)*(1-blend),tz=this.grip.z+(stage.head.z-stage.pointer.y)*(1-blend);
  this.head.x=THREE.MathUtils.lerp(this.head.x,tx,follow);this.head.z=THREE.MathUtils.lerp(this.head.z,tz,follow);
  this.head.y=this.floor(this.head.x,this.head.z)+.72+stage.clearance;
  // Rotate the handle about the head; no horizontal tug on the glass during pickup.
  const rotation=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),stage.axis);
  rotation.slerp(new THREE.Quaternion(),blend);
  const axis=new THREE.Vector3(0,1,0).applyQuaternion(rotation);
  this.cap.copy(this.head).addScaledVector(axis,LENGTH);
  this.headVelocity.copy(this.head).sub(oldHead).divideScalar(dt);this.capVelocity.copy(this.cap).sub(oldCap).divideScalar(dt);
  if(blend>=1){
   this.erecting=null;this.captureOffset.set(0,0);this.pickupAge=0;this.liftVelocity=0;
   this.capVelocity.copy(this.headVelocity);this.swingLimitEngaged=false;
  }
 }

 integrateFreeFall(dt,bounds){
  const gravity=15,points=[this.head,this.cap],velocity=this.headVelocity.clone(),v=velocity.y;
  let wallTime=Infinity,wallAxes=[];
  for(let i=0;i<2;i++)for(const axis of ['x','z']){
   const speed=velocity[axis];if(Math.abs(speed)<1e-10)continue;
   const limit=bounds[axis]-BULB_SHAPES[i].r,target=Math.sign(speed)*limit,t=(target-points[i][axis])/speed;
   if(t>=-1e-8){if(t<wallTime-1e-8){wallTime=Math.max(0,t);wallAxes=[axis];}else if(Math.abs(t-wallTime)<1e-8)wallAxes.push(axis);}
  }
  const horizon=Math.min(dt,wallTime);let hitTime=Infinity,hitIndex=0;
  for(let i=0;i<2;i++){
   const point=points[i],radius=BULB_SHAPES[i].r,clearance=t=>point.y+v*t-.5*gravity*t*t-this.floor(point.x+velocity.x*t,point.z+velocity.z*t)-radius;
   let time=Infinity;
   if(clearance(0)<=1e-9)time=0;
   else if(clearance(horizon)<=0){let low=0,high=horizon;for(let j=0;j<28;j++){const mid=(low+high)/2;if(clearance(mid)>0)low=mid;else high=mid;}time=high;}
   if(time<hitTime){hitTime=time;hitIndex=i;}
  }
  const elapsed=Math.min(horizon,hitTime),dy=v*elapsed-.5*gravity*elapsed*elapsed;
  for(const point of points){point.x+=velocity.x*elapsed;point.z+=velocity.z*elapsed;point.y+=dy;}
  this.headVelocity.set(velocity.x,v-gravity*elapsed,velocity.z);this.capVelocity.copy(this.headVelocity);
  if(hitTime>horizon){
   if(wallTime<=dt){for(const axis of new Set(wallAxes)){this.headVelocity[axis]*=-.25;this.capVelocity[axis]=this.headVelocity[axis];}const remaining=dt-elapsed;if(remaining>1e-7)this.integrateFreeFall(remaining,bounds);}
   return;
  }
  const impact=Math.max(0,-this.headVelocity.y);this.releaseFreeFall=false;
  const point=points[hitIndex];point.y=this.floor(point.x,point.z)+BULB_SHAPES[hitIndex].r;
  if(hitIndex===0){
   this.headAnchor=new THREE.Vector2(this.head.x,this.head.z);
   const axis=this.cap.clone().sub(this.head).normalize(),relative=this.capVelocity.clone();
   this.headVelocity.set(0,impact*this.settings.restitution,0);
   relative.sub(this.headVelocity);relative.addScaledVector(axis,-relative.dot(axis));this.capVelocity.copy(this.headVelocity).add(relative);
   // Minute contact irregularity prevents a perfectly vertical, numerically balanced cap.
   if(Math.hypot(axis.x,axis.z)<.03){this.capVelocity.x+=Math.sin(-.5)*.12;this.capVelocity.z+=Math.cos(-.5)*.12;}
  }else{this.capContact(impact);this.groundAnchor=new THREE.Vector2(this.cap.x,this.cap.z);this.startOrbit();}
  if(this.landingArmed&&impact>.5){this.landingArmed=false;if(hitIndex===0)this.onImpact(impact);}
  const remainder=dt-elapsed;if(remainder>1e-7)this.integrate(remainder,bounds);
 }

 startOrbit(resetSpeed=true){
  const scale=this.settings.orbitRadiusScale,dx=this.cap.x-this.head.x,dz=this.cap.z-this.head.z;
  this.groundAnchor=new THREE.Vector2(this.head.x+scale*dx,this.head.z+scale*dz);
  this.orbitBaseRadius=Math.max(.05,Math.hypot(dx,dz));this.orbitRadius=this.orbitBaseRadius*scale;
  this.orbitAngle=Math.atan2(-dx,-dz);this.orbitScale=scale;
  if(resetSpeed)this.orbitSpeed=0;
  this.tangentAcceleration=0;this.netAcceleration=0;this.headVelocity.set(0,0,0);this.capVelocity.set(0,0,0);this.resting=false;
 }
 applyOrbitPose(){
  const s=this.settings.orbitRadiusScale,ux=Math.sin(this.orbitAngle),uz=Math.cos(this.orbitAngle),o=this.groundAnchor;
  let r=this.orbitBaseRadius;
  // Preserve the actual two-sphere geometry while extending the virtual pivot beyond the cap.
  for(let i=0;i<10;i++){
   const hx=o.x+s*r*ux,hz=o.y+s*r*uz,cx=o.x+(s-1)*r*ux,cz=o.y+(s-1)*r*uz;
   const dy=this.floor(hx,hz)+.72-this.floor(cx,cz)-.3;
   r=Math.sqrt(Math.max(.04,LENGTH*LENGTH-dy*dy));
  }
  this.orbitBaseRadius=r;this.orbitRadius=s*r;
  this.head.set(o.x+s*r*ux,0,o.y+s*r*uz);this.head.y=this.floor(this.head.x,this.head.z)+.72;
  this.cap.set(o.x+(s-1)*r*ux,0,o.y+(s-1)*r*uz);this.cap.y=this.floor(this.cap.x,this.cap.z)+.3;
 }
 integrateOrbit(dt,bounds){
  if(this.orbitScale!==this.settings.orbitRadiusScale)this.startOrbit(false);
  if(this.resting)return;
  const oldHead=this.head.clone(),oldCap=this.cap.clone(),oldAngle=this.orbitAngle;
  const tx=Math.cos(this.orbitAngle),tz=-Math.sin(this.orbitAngle),dx=this.home.x-this.head.x,dz=this.home.z-this.head.z,d=Math.hypot(dx,dz);
  // Project a constant-magnitude acceleration toward home onto the instantaneous circle tangent.
  this.tangentAcceleration=d>1e-8?this.settings.orbitAcceleration*(dx*tx+dz*tz)/d:0;
  this.netAcceleration=this.tangentAcceleration-this.settings.orbitDamping*this.orbitSpeed;
  this.orbitSpeed=THREE.MathUtils.clamp(this.orbitSpeed+this.netAcceleration*dt,-this.settings.maxSpeed,this.settings.maxSpeed);
  this.orbitAngle+=this.orbitSpeed/this.orbitRadius*dt;
  this.applyOrbitPose();
  if([this.head,this.cap].some((p,i)=>Math.abs(p.x)+BULB_SHAPES[i].r>bounds.x||Math.abs(p.z)+BULB_SHAPES[i].r>bounds.z)){
   this.orbitAngle=oldAngle;this.orbitSpeed*=-.15;this.applyOrbitPose();
  }
  this.headVelocity.copy(this.head).sub(oldHead).divideScalar(dt);this.capVelocity.copy(this.cap).sub(oldCap).divideScalar(dt);
  const target=Math.atan2(this.home.x-this.groundAnchor.x,this.home.z-this.groundAnchor.y);
  this.turnError=Math.atan2(Math.sin(target-this.orbitAngle),Math.cos(target-this.orbitAngle));
  const travel=this.head.distanceTo(oldHead);this.roll+=Math.sign(this.orbitSpeed)*travel/.72;
  if(Math.abs(this.turnError)<.004&&Math.abs(this.orbitSpeed)<.008){
   this.orbitSpeed=0;this.headVelocity.set(0,0,0);this.capVelocity.set(0,0,0);this.resting=true;
  }
 }

 updatePose(){const axis=this.cap.clone().sub(this.head).normalize();this.quaternion.setFromUnitVectors(AXIS,axis).multiply(new THREE.Quaternion().setFromAxisAngle(AXIS,this.roll));this.tilt=Math.asin(THREE.MathUtils.clamp(-axis.y,-1,1));}
}
