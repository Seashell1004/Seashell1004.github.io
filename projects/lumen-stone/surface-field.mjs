// Continuous world-coordinate field: no tile wrapping or boundary modulo.
function hash(x,y){let n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;}
export function sampleStoneField(x,z){const broad=noise(x*.72+19,z*.72+31),grain=noise(x*15+7,z*15+13),fine=noise(x*43+91,z*43+51),pore=Math.max(0,(fine-.77)/.23);return {height:broad*.42+grain*.2+fine*.065+noise(x*90+137,z*90+97)*.03-pore*.09,shade:24+broad*11+grain*9+fine*4-pore*10,roughness:Math.min(1,.94+fine*.06),metalness:0};}

// World-unit derivatives shared by floor and unfolded walls.
export function sampleStoneGradient(x,z){const e=.008;return [(sampleStoneField(x+e,z).height-sampleStoneField(x-e,z).height)/(2*e),(sampleStoneField(x,z+e).height-sampleStoneField(x,z-e).height)/(2*e)];}
