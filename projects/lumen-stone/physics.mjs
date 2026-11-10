export const RADIUS=.8;
export const RETURN_ACCELERATION=.42;
export const MAX_ROLL_SPEED=.92;
export const DEFAULT_MOTION_SETTINGS={returnAcceleration:RETURN_ACCELERATION,maxSpeed:MAX_ROLL_SPEED,wellRadius:1,stiffness:5.2,dampingRatio:.22,restitution:.19,maxSwingAngle:45,gripFollow:50,pickupTransition:.45,liftSpeed:8,dragInertia:.35,throwStrength:.55,maxThrowSpeed:4,swingDamping:4.5,swingGravity:18,orbitAcceleration:.8,orbitDamping:.35,orbitRadiusScale:1.5};
export function surfaceHeight(x,z,home,radius=1){const d2=(x-home.x)**2+(z-home.z)**2;return -.23*Math.exp(-d2/(1.3*radius*radius));}
export class StoneMotion {
 constructor(x=0,z=0){this.x=x;this.z=z;this.vx=0;this.vz=0;this.lift=0;this.vy=0;this.held=false;this.landingArmed=true;this.onImpact=()=>{};this.settings={...DEFAULT_MOTION_SETTINGS};}
 reset(home){Object.assign(this,{x:home.x,z:home.z,vx:0,vz:0,lift:0,vy:0,held:false,landingArmed:true});}
 step(dt,home,bounds){const steps=Math.ceil(dt*120),h=dt/steps;for(let i=0;i<steps;i++)this.integrate(h,home,bounds);}
 integrate(dt,home,bounds){if(this.held){this.lift+=(1.35-this.lift)*(1-Math.exp(-14*dt));this.vy=0;this.landingArmed=true;return;}
 if(this.lift>0||this.vy!==0){this.vy-=15*dt;this.lift+=this.vy*dt;if(this.lift<=0){const impact=-this.vy;this.lift=0;this.vy=impact>.75?impact*this.settings.restitution:0;if(this.landingArmed&&impact>.3){this.landingArmed=false;this.onImpact(impact);}}}
 const grounded=this.lift<.015&&this.vy<.1;
 if(grounded){const p=this.settings,dx=this.x-home.x,dz=this.z-home.z,d=Math.hypot(dx,dz),t=Math.max(0,Math.min(1,(d/p.wellRadius-.65)/.75)),well=1-t*t*(3-2*t);
 // Outside: fixed downhill acceleration. Inside: position force plus velocity damping.
 // This is integrated motion, not a scripted sine animation or target-velocity brake.
 const restoring=(1-well)*p.returnAcceleration/Math.max(d,.000001)+well*p.stiffness;
 const damping=well*2*p.dampingRatio*Math.sqrt(p.stiffness)+(1-well)*.12;
 this.vx+=(-restoring*dx-damping*this.vx)*dt;this.vz+=(-restoring*dz-damping*this.vz)*dt;}
 const speed=Math.hypot(this.vx,this.vz),cap=this.settings.maxSpeed;if(speed>cap){this.vx*=cap/speed;this.vz*=cap/speed;}this.x+=this.vx*dt;this.z+=this.vz*dt;
 for(const [p,v,limit]of[['x','vx',bounds.x],['z','vz',bounds.z]])if(Math.abs(this[p])>limit){this[p]=Math.sign(this[p])*limit;const speed=Math.abs(this[v]);this[v]*=-.5;if(speed>.6&&grounded)this.onImpact(speed*.4);}
 if(grounded&&Math.hypot(this.x-home.x,this.z-home.z)<.006&&Math.hypot(this.vx,this.vz)<.012){this.x=home.x;this.z=home.z;this.vx=this.vz=0;}
 }
}
