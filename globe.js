const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d'),panel=document.querySelector('.person'),link=document.querySelector('#connector'),status=document.querySelector('#status');
let W,H,R,cx,cy,paintOffset=0,points=[],lon=30,lat=5,start=performance.now(),active=false,drag=null,moved=false,zoom=1,selected={lon:113.2644,lat:23.1291,name:'广州'},ready=false;const rad=Math.PI/180,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let themeInk='20,20,20',themeLine='#111',themeOutline='#aaa';
function setTheme(theme){if(!['light','dark','crt'].includes(theme))theme='light';document.documentElement.dataset.theme=theme;themeInk=theme==='crt'?'130,255,139':theme==='dark'?'220,225,232':'20,20,20';themeLine=theme==='crt'?'#82ff8b':theme==='dark'?'#e1e5eb':'#111';themeOutline=theme==='crt'?'#376e3e':theme==='dark'?'#69717d':'#aaa';document.querySelector('#theme-select').value=theme;if(document.querySelector('#theme-menu')){document.querySelector('#theme-menu summary').textContent={light:'浅色',dark:'黑夜',crt:'复古 CRT'}[theme];document.querySelectorAll('[data-theme-choice]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.themeChoice===theme)))}try{localStorage.setItem('honda-theme',theme)}catch{}}
document.querySelector('#theme-select').onchange=e=>setTheme(e.target.value);
let savedTheme='light';try{savedTheme=localStorage.getItem('honda-theme')||'light'}catch{}setTheme(savedTheme);

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
const defaults={"anchorX":0.42,"anchorY":0.58,"density":12.45,"height":0.04,"outline":false,"scale":1.88,"shape":"cone","sharpness":9.5,"twinkle":true,"twinkleMode":"independent","twinklePeriod":4,"twinkleStrength":1,"width":2,"x":0.15,"y":1.56};
let settings={...defaults};
function layout(){R=Math.max(W*.57,H*.74)*settings.scale;cx=W*settings.x;cy=H*settings.y}
function mountain(distance){const d=distance/settings.width;if(settings.shape==='gaussian')return Math.exp(-d*d*settings.sharpness);if(settings.shape==='cone')return Math.pow(Math.max(0,1-d),settings.sharpness);return Math.exp(-d*settings.sharpness)}
function resize(){W=canvas.clientWidth;H=document.querySelector('.scene').clientHeight;paintOffset=document.querySelector('header').getBoundingClientRect().height;const d=Math.min(devicePixelRatio,2);canvas.width=W*d;canvas.height=(H+paintOffset)*d;ctx.setTransform(d,0,0,d,0,paintOffset*d);layout()}addEventListener('resize',resize);resize();
// Aim the raised point at the lower-left intersection of the thirds grid.
function arrivalRotation(){
 const x=(W*settings.anchorX-cx)/R,y=(cy-H*settings.anchorY-R*settings.height)/R;
 const z=Math.sqrt(Math.max(.001,1-x*x-y*y));
 const tilt=Math.asin(clamp(Math.sin(selected.lat*rad)/Math.hypot(y,z),-1,1))-Math.atan2(y,z);
 const delta=Math.atan2(x,z*Math.cos(tilt)-y*Math.sin(tilt));
 return {lon:selected.lon-delta/rad,lat:tilt/rad};
}
function project(lo,la){const a=(lo-lon)*rad,b=la*rad,t=lat*rad,x=Math.cos(b)*Math.sin(a),y=Math.sin(b)*Math.cos(t)-Math.cos(b)*Math.cos(a)*Math.sin(t),z=Math.sin(b)*Math.sin(t)+Math.cos(b)*Math.cos(a)*Math.cos(t);return {x:cx+x*R,y:cy-y*R,z}}
function inside(x,y,r){let hit=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit}return hit}
let seed=771;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
async function load(){try{const response=await fetch('world.json');if(!response.ok)throw Error('数据尚未载入');const world=await response.json();points=[];seed=771;for(const f of world.features){if(f.properties.NAME==='Antarctica')continue;const polys=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;let area=0;for(const p of polys){const ring=p[0];for(let i=0;i<ring.length-1;i++){let dl=(ring[i+1][0]-ring[i][0])*rad;if(Math.abs(dl)>Math.PI)dl-=Math.sign(dl)*2*Math.PI;area+=dl*(2+Math.sin(ring[i][1]*rad)+Math.sin(ring[i+1][1]*rad))}}area=Math.abs(area)*6371*6371/2;const density=(f.properties.POP_EST||0)/Math.max(area,1);const chance=clamp(.12+Math.log1p(density)/7,.12,1);for(const p of polys){const ring=p[0],xs=ring.map(v=>v[0]),ys=ring.map(v=>v[1]);for(let y=Math.min(...ys);y<Math.max(...ys);y+=.135){const step=.135/Math.max(.22,Math.cos(y*rad));for(let x=Math.min(...xs);x<Math.max(...xs);x+=step){if(random()>chance)continue;const lo=x+random()*step,la=y+random()*.135;if(inside(lo,la,ring)&&!p.slice(1).some(h=>inside(lo,la,h)))points.push([lo,la,random()])}}}}ready=true;start=performance.now()-(reduced?5000:0);status.textContent='拖动探索地图';requestAnimationFrame(draw)}catch(e){status.textContent='地图数据未加载，请刷新重试';document.querySelector('#retry').hidden=false}}
function hash(value){const n=Math.sin(value*127.1+311.7)*43758.5453;return n-Math.floor(n)}
function twinkleOpacity(point,now){
 if(!settings.twinkle||reduced)return 1;
 const id=point[2]*100000+point[0]*97+point[1]*131;
 const phase=hash(id+3),speed=.65+hash(id+7)*.9;
 const clock=now/1000/settings.twinklePeriod*speed+phase*13;
 const tick=Math.floor(clock),fraction=clock-tick;
 let dim;
 switch(settings.twinkleMode){
 case 'wave':dim=.5+.5*Math.sin(now/1000*2*Math.PI/settings.twinklePeriod+point[2]*Math.PI*2+point[0]*.17+point[1]*.11);break;
 case 'step':dim=hash(id+tick*19);break;
 case 'random':{const a=hash(id+tick*19),b=hash(id+(tick+1)*19);dim=a+(b-a)*ease(fraction);break}
 case 'sparse':{const flash=hash(id+tick*19)>.82?Math.pow(Math.sin(Math.PI*fraction),4):0;dim=.85*(1-flash);break}
 default:dim=.5+.5*Math.sin(clock*2*Math.PI);
 }
 return 1-settings.twinkleStrength*dim;
}
let introductionOpen=true;
const coordinateButton=document.querySelector('.coordinate-toggle');
function toggleIntroduction(open=!introductionOpen){introductionOpen=open;coordinateButton.setAttribute('aria-expanded',String(open))}
document.querySelector('.window-close').onclick=()=>{toggleIntroduction(false);coordinateButton.focus()};coordinateButton.onclick=()=>toggleIntroduction();
document.querySelector('nav a:last-child').addEventListener('click',()=>{toggleIntroduction(true);replay()});
let targetLon=lon,targetLat=lat,velocityLon=0,velocityLat=0,lastFrame=0,lastPointerTime=0;
function draw(now){const dt=Math.min((now-(lastFrame||now))/1000,.05);lastFrame=now;if(active){if(!drag){targetLon+=velocityLon*dt;targetLat=clamp(targetLat+velocityLat*dt,-80,80);const decay=Math.exp(-6*dt);velocityLon*=decay;velocityLat*=decay;if(Math.abs(targetLat)>=80)velocityLat=0}const follow=reduced?1:1-Math.exp(-18*dt);lon+=(targetLon-lon)*follow;lat+=(targetLat-lat)*follow}ctx.clearRect(0,-paintOffset,W,H+paintOffset);let t=(now-start)/1000;if(!active){const u=ease(t/2.4);const arrival=arrivalRotation();lon=30+(arrival.lon-30)*u;lat=5+(arrival.lat-5)*u}const lift=reduced?1:ease((t-2.3)/1.2),reveal=reduced?1:ease((t-3.5)/.8);if(settings.outline){ctx.strokeStyle=themeOutline;ctx.lineWidth=.7;ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.stroke()}const target=project(selected.lon,selected.lat);for(const p of points){if(p[2]>settings.density/23.25)continue;const q=project(p[0],p[1]);if(q.z<0)continue;let dl=(p[0]-selected.lon+540)%360-180;const distance=Math.hypot(dl*Math.cos(selected.lat*rad),p[1]-selected.lat);const height=mountain(distance)*R*settings.height*lift;q.y-=height;if(q.x<0||q.x>W||q.y < -paintOffset||q.y>H)continue;const shimmer=twinkleOpacity(p,now);ctx.fillStyle=`rgba(${themeInk},${(.22+.65*q.z)*shimmer})`;ctx.beginPath();ctx.arc(q.x,q.y,.65+q.z*.55,0,7);ctx.fill()}const py=target.y-R*settings.height*lift;const visible=target.z>0&&target.x>0&&target.x<W&&py>0&&py<H;if(visible){ctx.strokeStyle=themeLine;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(target.x,target.y);ctx.lineTo(target.x,py);ctx.stroke();ctx.fillStyle=themeLine;ctx.beginPath();ctx.arc(target.x,py,4.2,0,7);ctx.fill();ctx.beginPath();ctx.arc(target.x,py,9,0,7);ctx.stroke()}coordinateButton.hidden=!visible||reveal<.95;coordinateButton.style.left=target.x+'px';coordinateButton.style.top=py+'px';const showIntro=visible&&introductionOpen;panel.setAttribute('aria-hidden',String(!showIntro));panel.style.opacity=showIntro?reveal:0;panel.style.pointerEvents=showIntro&&reveal>.95?'auto':'none';panel.inert=!showIntro||reveal<.95;const box=panel.getBoundingClientRect(),bounds=document.querySelector('.scene').getBoundingClientRect(),ex=box.left-bounds.left,ey=box.top-bounds.top+box.height*.55;link.setAttribute('viewBox',`0 0 ${W} ${H}`);link.innerHTML=showIntro?`<path d="M ${target.x} ${py} L ${target.x+35} ${py-28} L ${ex-24} ${ey} L ${ex} ${ey}" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:${1-reveal}"/>`:'';requestAnimationFrame(draw)}
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{if(e.button!==0&&e.button!==2)return;e.preventDefault();active=true;targetLon=lon;targetLat=lat;velocityLon=velocityLat=0;lastPointerTime=performance.now();drag={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,lon,lat};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const now=performance.now(),dt=Math.max(.008,(now-lastPointerTime)/1000);const dx=e.clientX-drag.x,dy=e.clientY-drag.y;targetLon=drag.lon-dx*.14;targetLat=clamp(drag.lat+dy*.12,-80,80);velocityLon=clamp(velocityLon*.4-(e.clientX-drag.lastX)*.14/dt*.6,-180,180);velocityLat=clamp(velocityLat*.4+(e.clientY-drag.lastY)*.12/dt*.6,-120,120);drag.lastX=e.clientX;drag.lastY=e.clientY;lastPointerTime=now});
canvas.addEventListener('pointerup',()=>{if(performance.now()-lastPointerTime>100||reduced)velocityLon=velocityLat=0;drag=null});
canvas.addEventListener('pointercancel',()=>{drag=null;velocityLon=velocityLat=0});
canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();if(!active){targetLon=lon;targetLat=lat}active=true;velocityLon=velocityLat=0;targetLon+=e.key==='ArrowLeft'?-5:e.key==='ArrowRight'?5:0;targetLat=clamp(targetLat+(e.key==='ArrowUp'?5:e.key==='ArrowDown'?-5:0),-80,80)});
function replay(){toggleIntroduction(true);drag=null;velocityLon=velocityLat=0;active=false;start=performance.now();if(reduced)start-=5000}document.querySelector('#replay').onclick=replay;document.querySelector('#retry').onclick=load;document.querySelector('#location').onchange=e=>{const [lo,la]=e.target.value.split(',').map(Number);selected={lon:lo,lat:la,name:e.target.selectedOptions[0].textContent};document.querySelector('#city').textContent=selected.name;document.querySelector('#coordinates').textContent=`${la.toFixed(4)}° N / ${lo.toFixed(4)}° E`;replay()};document.querySelector('#custom').onsubmit=e=>{e.preventDefault();const data=new FormData(e.target);selected={lon:Number(data.get('longitude')),lat:Number(data.get('latitude')),name:'所选位置'};document.querySelector('#city').textContent=selected.name;document.querySelector('#coordinates').textContent=`${selected.lat.toFixed(4)}° / ${selected.lon.toFixed(4)}°`;replay()};load();

const visual=document.querySelector('#visual');
function syncControls(){for(const input of visual.querySelectorAll('[data-param]')){const key=input.dataset.param;if(input.type==='checkbox')input.checked=settings[key];else input.value=settings[key];const output=input.parentElement.querySelector('output');if(output)output.value=Number(settings[key]).toFixed(2)}}
visual.addEventListener('input',e=>{const key=e.target.dataset.param;if(!key)return;settings[key]=e.target.type==='checkbox'?e.target.checked:e.target.tagName==='SELECT'?e.target.value:Number(e.target.value);layout();if(key==='anchorX'||key==='anchorY'){active=false;start=performance.now()-5000}syncControls()});
document.querySelector('#reset-visual').onclick=()=>{settings={...defaults};layout();syncControls();replay()};syncControls();

const categoryNames={animation:'动画',game:'游戏',heritage:'数字遗产',prototype:'Prototypes'};
document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{
 const category=button.dataset.category;
 document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 document.querySelector('#animation-work').hidden=category!=='animation';
 document.querySelector('#prototype-work').hidden=category!=='prototype';
 document.querySelector('#category-empty').hidden=category==='animation'||category==='prototype';
 document.querySelector('#category-message').textContent=categoryNames[category]+'作品待加入。';
}));

const marginInput=document.querySelector('#gallery-margin');
function setGalleryMargin(value){document.querySelector('#gallery').style.setProperty('--gallery-margin',value+'vw');marginInput.value=value;document.querySelector('#gallery-margin-value').value=value+'%'}
marginInput.addEventListener('input',()=>setGalleryMargin(marginInput.value));
function resetGalleryMargin(){document.querySelector('#gallery').style.removeProperty('--gallery-margin');const value=matchMedia('(max-width:700px)').matches?6:7;marginInput.value=value;document.querySelector('#gallery-margin-value').value=value+'%'}
document.querySelector('#reset-gallery').onclick=resetGalleryMargin;
resetGalleryMargin();

const editableText=[
 ['brand','品牌名称','.brand-name'],['headline','首页主标题','h1'],['subtitle','首页副标题','.opening p'],['window-label','介绍窗口标题','.window-top span:first-child'],['person-name','介绍名称','.person h2'],['bio','个人介绍','.person p'],['city-label','地点名称','#city'],['coordinates-label','坐标文字','#coordinates'],['work-link','进入作品链接','.view'],['scroll-hint','向下提示','.down'],['work-title','作品页标题','.work-head h2'],['category-animation','分类：动画','[data-category="animation"]'],['category-game','分类：游戏','[data-category="game"]'],['category-heritage','分类：数字遗产','[data-category="heritage"]'],['category-prototype','分类：Prototypes','[data-category="prototype"]'],['project-title','项目名称','.work-info h3'],['project-type','项目类型','.work-info p'],['project-link','观看作品链接','.work-info a'],['footer','页脚文字','footer>span'],['nav-work','导航：作品','nav a:first-child'],['nav-about','导航：关于','nav a:last-child']
].map(([id,label,selector])=>{const element=document.querySelector(selector);return {id,label,element,initialHTML:element.innerHTML,initialStyle:element.getAttribute("style")}});
let textOverrides={};try{textOverrides=JSON.parse(localStorage.getItem('honda-text-settings')||'{}')}catch{}
const fonts={'inherit':'跟随页面','"Bauhaus 93", "PingFang SC", sans-serif':'Bauhaus 93','Arial, "PingFang SC", sans-serif':'无衬线 / 黑体','"Helvetica Neue", "PingFang SC", sans-serif':'Helvetica Neue','Georgia, "Songti SC", serif':'衬线 / 宋体','"Courier New", monospace':'等宽字体','"Kaiti SC", "STKaiti", serif':'楷体'};
function applyText(item,setting){if(setting.content!==undefined){item.element.textContent=setting.content;item.element.style.whiteSpace='pre-line'}if(setting.size)item.element.style.fontSize=setting.size+'px';if(setting.font)item.element.style.fontFamily=setting.font}
for(const item of editableText)if(textOverrides[item.id])applyText(item,textOverrides[item.id]);
function saveText(){try{localStorage.setItem('honda-text-settings',JSON.stringify(textOverrides))}catch{}}
for(const body of document.querySelectorAll('.text-body')){
 body.innerHTML='<label>选择文字<select class="text-target"></select></label><label>文字内容<textarea class="text-content"></textarea></label><label>字号（px）<input class="text-size" type="number" min="8" max="200" step="1"></label><label>字体<select class="text-font"></select></label><button class="text-reset" type="button">恢复这处文字</button><small>修改实时生效，并保存在当前浏览器。视频内文字由 Bilibili 提供。</small>';
 const target=body.querySelector('.text-target'),content=body.querySelector('.text-content'),size=body.querySelector('.text-size'),font=body.querySelector('.text-font');
 for(const item of editableText){const option=document.createElement('option');option.value=item.id;option.textContent=item.label;target.append(option)}
 for(const [value,label]of Object.entries(fonts)){const option=document.createElement('option');option.value=value;option.textContent=label;font.append(option)}
 function current(){return editableText.find(item=>item.id===target.value)}
 function sync(){const item=current();content.value=item.element.innerText;size.value=Math.round(parseFloat(getComputedStyle(item.element).fontSize));font.value=textOverrides[item.id]?.font||'inherit'}
 target.onchange=sync;
 content.oninput=()=>{const item=current();const setting=textOverrides[item.id]??={};setting.content=content.value;applyText(item,setting);saveText()};
 size.oninput=()=>{const value=Number(size.value);if(value<8||value>200)return;const item=current();const setting=textOverrides[item.id]??={};setting.size=value;applyText(item,setting);saveText()};
 font.onchange=()=>{const item=current();const setting=textOverrides[item.id]??={};setting.font=font.value;applyText(item,setting);saveText()};
 body.querySelector('.text-reset').onclick=()=>{const item=current();item.element.innerHTML=item.initialHTML;if(item.initialStyle===null)item.element.removeAttribute('style');else item.element.setAttribute('style',item.initialStyle);delete textOverrides[item.id];saveText();sync()};sync();
}

const logoDefaults={size:89,fit:'contain',src:'logo-custom-default.png'};
let logoSettings={...logoDefaults};
try{logoSettings={...logoSettings,...JSON.parse(localStorage.getItem('honda-logo-settings')||'{}')}}catch{}
function applyLogo(){const region=document.querySelector('.logo-region'),image=document.querySelector('#brand-logo');region.style.setProperty('--logo-size',logoSettings.size+'px');region.style.setProperty('--logo-fit',logoSettings.fit);image.src=logoSettings.src;image.alt=logoSettings.src==='logo-default.svg'?'点线面 Logo':'HONDA TEC Logo';document.querySelectorAll('.logo-size').forEach(e=>e.value=logoSettings.size);document.querySelectorAll('.logo-size-value').forEach(e=>e.value=logoSettings.size+' px');document.querySelectorAll('.logo-fit').forEach(e=>e.value=logoSettings.fit)}
function persistLogo(){try{localStorage.setItem('honda-logo-settings',JSON.stringify(logoSettings));document.querySelectorAll('.logo-status').forEach(e=>e.textContent='已保存')}catch{document.querySelectorAll('.logo-status').forEach(e=>e.textContent='图片过大，未能保存；请上传更小的图片。')}}
for(const body of document.querySelectorAll('.image-body')){
 body.querySelector('.logo-size').oninput=e=>{logoSettings.size=Number(e.target.value);applyLogo();persistLogo()};
 body.querySelector('.logo-fit').onchange=e=>{logoSettings.fit=e.target.value;applyLogo();persistLogo()};
 body.querySelector('.logo-upload').onchange=e=>{const file=e.target.files[0];if(!file)return;if(!file.type.startsWith('image/')){body.querySelector('.logo-status').textContent='请选择图片文件。';return}if(file.size>4*1024*1024){body.querySelector('.logo-status').textContent='请使用小于 4 MB 的图片。';return}const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{logoSettings.src=reader.result;applyLogo();persistLogo()};img.onerror=()=>body.querySelector('.logo-status').textContent='无法读取图片，请换一个文件。';img.src=reader.result};reader.readAsDataURL(file)};
 body.querySelector('.logo-reset').onclick=()=>{logoSettings={size:64,fit:'contain',src:'logo-default.svg'};applyLogo();persistLogo();document.querySelectorAll('.logo-upload').forEach(e=>e.value='')};
}applyLogo();

const settingsPanels=[...document.querySelectorAll('.frame-panel,.image-panel,.text-panel,#visual,#work-visual,.controls details,#theme-menu')];
function closeSettings(except){settingsPanels.forEach(p=>{if(p!==except)p.open=false})}
settingsPanels.forEach(p=>p.addEventListener('toggle',()=>{if(p.open)closeSettings(p)}));
document.addEventListener('pointerdown',e=>{if(!settingsPanels.some(p=>p.contains(e.target)))closeSettings()});
document.querySelectorAll('a[href="#"],a[href="#work"]').forEach(a=>a.addEventListener('click',()=>closeSettings()));

document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(document.querySelector('#prototype-dialog').open)return;if(settingsPanels.some(p=>p.open))closeSettings();else toggleIntroduction(false)}});

const frameDefaults={introX:73,introY:40,headerHeight:110,headerMargin:2.5,headerPadding:0,headerGap:20,glass:false,glassBlur:24,glassOpacity:35};
let frameSettings={...frameDefaults};try{frameSettings={...frameSettings,...JSON.parse(localStorage.getItem('honda-frame-settings')||'{}')}}catch{}
try{const previous=JSON.parse(localStorage.getItem('honda-frame-settings')||'{}');if(!('glass' in previous)){frameSettings.glass=!!(previous.introGlass||previous.sidebarGlass||previous.headerGlass);frameSettings.glassBlur=previous.introBlur??24;frameSettings.glassOpacity=previous.introOpacity??35}}catch{}
function applyFrame(){const root=document.documentElement;root.style.setProperty('--glass-blur',frameSettings.glassBlur+'px');root.style.setProperty('--glass-opacity',frameSettings.glassOpacity/100);root.classList.toggle('unified-glass',!!frameSettings.glass);for(const [key,css,unit]of [['introX','--intro-x','%'],['introY','--intro-y','%'],['headerHeight','--header-height','px'],['headerMargin','--header-margin','vw'],['headerPadding','--header-padding','px'],['headerGap','--header-gap','px']])root.style.setProperty(css,frameSettings[key]+unit);document.querySelectorAll('[data-frame]').forEach(input=>{if(input.type==='checkbox')input.checked=!!frameSettings[input.dataset.frame];else{input.value=frameSettings[input.dataset.frame];input.parentElement.querySelector('output').value=input.value}});resize()}
function saveFrame(){try{localStorage.setItem('honda-frame-settings',JSON.stringify(frameSettings))}catch{}}
document.querySelectorAll('[data-frame]').forEach(input=>input.addEventListener('input',()=>{frameSettings[input.dataset.frame]=input.type==='checkbox'?input.checked:Number(input.value);if(input.dataset.frame==='glassBlur'||input.dataset.frame==='glassOpacity')frameSettings.glass=true;applyFrame();saveFrame()}));
document.querySelectorAll('.frame-reset').forEach(button=>button.onclick=()=>{frameSettings={...frameDefaults};applyFrame();saveFrame();cursorSettings={...cursorDefaults};applyCursor();lensSettings={...lensDefaults};applyLens()});
new ResizeObserver(entries=>{document.documentElement.style.setProperty('--measured-header-height',entries[0].target.getBoundingClientRect().height+'px');resize()}).observe(document.querySelector('header'));
applyFrame();

for(const settingsPanel of settingsPanels){const body=settingsPanel.querySelector('.frame-body,.image-body,.text-body,.visual-body,.work-visual-body');if(!body)continue;const close=document.createElement('button');close.type='button';close.className='settings-close';close.textContent='×';close.setAttribute('aria-label','关闭'+settingsPanel.querySelector('summary').textContent);close.onclick=()=>{settingsPanel.open=false;settingsPanel.querySelector('summary').focus()};body.prepend(close)}

const proposal=document.querySelector('#prototype-dialog');let proposalSlides=[],proposalIndex=0;
function renderProposal(){const area=document.querySelector('#proposal-slide');area.replaceChildren();for(const [index,text]of proposalSlides[proposalIndex].entries()){const el=document.createElement(index===1?'h2':'p');el.textContent=text;area.append(el)}document.querySelector('#proposal-count').textContent=(proposalIndex+1)+' / '+proposalSlides.length;document.querySelector('#proposal-prev').disabled=proposalIndex===0;document.querySelector('#proposal-next').disabled=proposalIndex===proposalSlides.length-1}
document.querySelector('#open-prototype').onclick=async()=>{try{if(!proposalSlides.length){const r=await fetch('projects/what-if/slides.json');if(!r.ok)throw Error();proposalSlides=await r.json()}proposalIndex=0;renderProposal();closeSettings();proposal.showModal()}catch{document.querySelector('#open-prototype').textContent='加载失败，请重试'}};
document.querySelector('#close-prototype').onclick=()=>proposal.close();proposal.addEventListener('click',e=>{if(e.target===proposal){const r=proposal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)proposal.close()}});
document.querySelector('#proposal-prev').onclick=()=>{if(proposalIndex>0){proposalIndex--;renderProposal()}};document.querySelector('#proposal-next').onclick=()=>{if(proposalIndex<proposalSlides.length-1){proposalIndex++;renderProposal()}};


// A smooth radial displacement field bends the scene like a convex CRT faceplate.
const lensMap=document.createElement('canvas');lensMap.width=lensMap.height=192;
const lensContext=lensMap.getContext('2d'),lensPixels=lensContext.createImageData(192,192);
for(let y=0;y<192;y++)for(let x=0;x<192;x++){const nx=x/191*2-1,ny=y/191*2-1,r=(nx*nx+ny*ny)/2,index=(y*192+x)*4;lensPixels.data[index]=128+nx*r*100;lensPixels.data[index+1]=128+ny*r*100;lensPixels.data[index+2]=128;lensPixels.data[index+3]=255}
lensContext.putImageData(lensPixels,0,0);const lensData= lensMap.toDataURL();document.querySelector('#crt-displacement-image').setAttribute('href',lensData);document.querySelector('#crt-displacement-image').setAttributeNS('http://www.w3.org/1999/xlink','xlink:href',lensData);
const lensDefaults={enabled:true,strength:60,vignette:90,rimInset:0,rimWidth:2,rimOpacity:100};
let lensSettings={...lensDefaults};try{lensSettings={...lensSettings,...JSON.parse(localStorage.getItem('honda-crt-lens')||'{}')}}catch{}
function applyLens(){for(const [key,name,unit]of [['rimInset','inset','px'],['rimWidth','width','px'],['rimOpacity','opacity','']]){document.documentElement.style.setProperty('--crt-rim-'+name,unit?lensSettings[key]+unit:lensSettings[key]/100);document.querySelectorAll('.crt-rim-'+name).forEach(e=>e.value=lensSettings[key]);document.querySelectorAll('.crt-rim-'+name+'-value').forEach(e=>e.value=lensSettings[key])}document.documentElement.classList.toggle('crt-lens-on',lensSettings.enabled);document.querySelector('#crt-displacement').setAttribute('scale',lensSettings.strength);document.documentElement.style.setProperty('--crt-vignette',lensSettings.vignette/100);document.querySelectorAll('.crt-lens-enabled').forEach(e=>e.checked=lensSettings.enabled);document.querySelectorAll('.crt-lens-strength').forEach(e=>e.value=lensSettings.strength);document.querySelectorAll('.crt-lens-value').forEach(e=>e.value=lensSettings.strength);document.querySelectorAll('.crt-vignette').forEach(e=>e.value=lensSettings.vignette);document.querySelectorAll('.crt-vignette-value').forEach(e=>e.value=lensSettings.vignette);try{localStorage.setItem('honda-crt-lens',JSON.stringify(lensSettings))}catch{}}
document.querySelectorAll('.crt-lens-enabled').forEach(e=>e.onchange=()=>{lensSettings.enabled=e.checked;applyLens()});document.querySelectorAll('.crt-lens-strength').forEach(e=>e.oninput=()=>{lensSettings.strength=Number(e.value);applyLens()});document.querySelectorAll('.crt-vignette').forEach(e=>e.oninput=()=>{lensSettings.vignette=Number(e.value);applyLens()});applyLens();

// The filter belongs to a fixed viewport; scrolling never changes its geometry.
function syncLensViewport(){const width=window.innerWidth,height=window.innerHeight;const filter=document.querySelector('#crt-lens-filter'),map=document.querySelector('#crt-displacement-image');filter.setAttribute('filterUnits','userSpaceOnUse');filter.setAttribute('primitiveUnits','userSpaceOnUse');for(const [key,value]of Object.entries({x:-80,y:-80,width:width+160,height:height+160}))filter.setAttribute(key,value);for(const [key,value]of Object.entries({x:0,y:0,width,height}))map.setAttribute(key,value)}
window.addEventListener('resize',syncLensViewport);syncLensViewport();

for(const [key,name]of [['rimInset','inset'],['rimWidth','width'],['rimOpacity','opacity']])document.querySelectorAll('.crt-rim-'+name).forEach(input=>input.oninput=()=>{lensSettings[key]=Number(input.value);applyLens()});

// Clip final composited layers to the displaced rim, not the original viewport.
function syncScreenAperture(){
 const viewport=document.querySelector('#crt-viewport');
 if(document.documentElement.dataset.theme!=='crt'||!lensSettings.enabled){viewport.style.clipPath='';viewport.style.webkitClipPath='';return}
 const w=innerWidth,h=innerHeight,inset=lensSettings.rimInset;
 const rx=Math.min(Math.max(20,Math.min(w*.03,48)),Math.max(0,(w-2*inset)/2));
 const ry=Math.min(Math.max(24,Math.min(h*.04,50)),Math.max(0,(h-2*inset)/2));
 const corners=[[w-inset-rx,inset+ry,-Math.PI/2],[w-inset-rx,h-inset-ry,0],[inset+rx,h-inset-ry,Math.PI/2],[inset+rx,inset+ry,Math.PI]];
 const points=[];
 // Include straight segments: radial displacement curves even a straight source edge.
 const source=[];
 for(const [cx,cy,a]of corners){for(let j=0;j<=20;j++){const angle=a+j/20*Math.PI/2;source.push([cx+rx*Math.cos(angle),cy+ry*Math.sin(angle)])}}
 for(let i=0;i<source.length;i++){const a=source[i],b=source[(i+1)%source.length],steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/20));for(let j=0;j<steps;j++){const sx=a[0]+(b[0]-a[0])*j/steps,sy=a[1]+(b[1]-a[1])*j/steps;let x=sx,y=sy;for(let k=0;k<8;k++){const nx=Math.max(-1,Math.min(1,x/w*2-1)),ny=Math.max(-1,Math.min(1,y/h*2-1)),r=(nx*nx+ny*ny)/2;x=sx-lensSettings.strength*(.5/255+nx*r*100/255);y=sy-lensSettings.strength*(.5/255+ny*r*100/255)}points.push(x.toFixed(2)+'px '+y.toFixed(2)+'px')}}
 const polygon='polygon('+points.join(',')+')';viewport.style.clipPath=polygon;viewport.style.webkitClipPath=polygon;
}
const originalApplyLens=applyLens;applyLens=function(){originalApplyLens();syncScreenAperture()};
const originalSetTheme=setTheme;setTheme=function(theme){originalSetTheme(theme);syncScreenAperture()};
window.addEventListener('resize',syncScreenAperture);syncScreenAperture();

const cursorDefaults={size:50,width:2,opacity:70,glow:15,hLength:8.5,vLength:3,hWidth:2,vWidth:2,gap:5};
let cursorSettings={...cursorDefaults};try{cursorSettings={...cursorSettings,...JSON.parse(localStorage.getItem('honda-crt-cursor')||'{}')}}catch{}
function applyCursor(){
 for(const key of ['size','width','opacity','glow','hLength','vLength','hWidth','vWidth','gap']){const control=key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());document.querySelectorAll('.crt-cursor-'+control).forEach(e=>e.value=cursorSettings[key]);document.querySelectorAll('.crt-cursor-'+control+'-value').forEach(e=>e.value=cursorSettings[key])}
 const extent=2*(Math.max(cursorSettings.hLength,cursorSettings.vLength)+cursorSettings.gap+2);const size=Math.min(128,Math.max(24,extent*cursorSettings.size/32+cursorSettings.glow*2+12)),center=size/2,k=Math.min(cursorSettings.size/32,(size-12)/extent);
 const gap=cursorSettings.gap,hl=cursorSettings.hLength,vl=cursorSettings.vLength;
 const horizontal=`M${16-gap-hl} 16H${16-gap} M${16+gap} 16H${16+gap+hl}`;
 const vertical=`M16 ${16-gap-vl}V${16-gap} M16 ${16+gap}V${16+gap+vl}`;
 const shapes=`<path d="${horizontal}" stroke-width="${cursorSettings.hWidth/k}"/><path d="${vertical}" stroke-width="${cursorSettings.vWidth/k}"/><circle cx="16" cy="16" r="5" stroke-width="${cursorSettings.width/k}"/>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs><filter id="cursor-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${cursorSettings.glow/3}"/></filter></defs><g opacity="${cursorSettings.opacity/100}"><g transform="translate(${center-16*k} ${center-16*k}) scale(${k})" fill="none" stroke="#82ff8b"><g filter="url(#cursor-glow)" opacity=".65">${shapes}</g>${shapes}<circle cx="16" cy="16" r="1" fill="#82ff8b" stroke="none"/></g></g></svg>`;
 document.documentElement.style.setProperty('--crt-native-cursor',`url("data:image/svg+xml,${encodeURIComponent(svg)}") ${Math.round(center)} ${Math.round(center)}`);
 try{localStorage.setItem('honda-crt-cursor',JSON.stringify(cursorSettings))}catch{}
}
for(const key of ['size','width','opacity','glow','hLength','vLength','hWidth','vWidth','gap']){const control=key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());document.querySelectorAll('.crt-cursor-'+control).forEach(e=>e.oninput=()=>{cursorSettings[key]=Number(e.value);applyCursor()})}applyCursor();

document.querySelectorAll('[data-theme-choice]').forEach(button=>button.onclick=()=>{setTheme(button.dataset.themeChoice);document.querySelector('#theme-menu').open=false;document.querySelector('#theme-menu summary').focus()});
