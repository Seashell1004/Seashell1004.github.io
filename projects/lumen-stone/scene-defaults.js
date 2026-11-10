export const SCENE_DEFAULTS={
 '主角亮度':1.95,'距离衰减':1.8,'影响范围':37,
 '视差幅度':6.7,'前后视差':2,'跟随平滑度':.12,'挥手灵敏度':1,'粒子数量':190,'分布范围':1.05,'近景高度':3.5,'随机扰动':.15,
 '阴影柔和度':12,'灯芯阴影强度':0,'支架阴影强度':55,'支架渐变起点':0,'支架渐变终点':82,'支架衰减程度':.2,
 '左右位置':-9.5,'前后位置':-8.5,'光源高度':12.5,'点光亮度':1260,
 '面光左右':-4,'面光前后':-2,'面光高度':14,'面光亮度':2.2,'面光宽度':16.5,'面光高度尺寸':7,
 '石材粗糙度':1,'漫反射强度':2.4
};

const STORAGE_KEY='lumen-stone.scene-defaults.v1';
const BUILTIN={values:SCENE_DEFAULTS,effects:{ao:false,bounce:true,gradient:true,headParallax:true},mode:'bulb',looks:{stone:{color:'#ffe2b3',dust:{density:190,spread:1.05,near:3.5,motion:.15},particles:true},bulb:{color:'#ffae63',dust:{density:570,spread:1,near:5,motion:.55},particles:true}}};
export function applySceneDefaults({getSceneState,loadSceneState}){
 let preset=BUILTIN;try{const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(stored?.version===1&&stored.values&&stored.looks)preset=stored;}catch(e){console.warn('Saved scene defaults unavailable',e);}
 for(const [label,value] of Object.entries({...SCENE_DEFAULTS,...preset.values})){const input=[...document.querySelectorAll('.presencePanel input[aria-label]')].find(e=>e.getAttribute('aria-label')===label);if(input&&Number.isFinite(Number(value))){input.value=value;input.dispatchEvent(new Event('input'));}}
 for(const [effect,value] of Object.entries(preset.effects||{})){const input=document.querySelector(`[data-compare="${effect}"]`);if(input){input.checked=!!value;input.dispatchEvent(new Event('change',{bubbles:true}));}}
 loadSceneState(preset);
 const bar=document.createElement('div');bar.className='saveDefaultsBar';bar.innerHTML='<button type="button">设为默认</button><p role="status" aria-live="polite">保存到当前浏览器，刷新后恢复。</p>';document.querySelector('.inspectorBody').prepend(bar);const button=bar.querySelector('button'),status=bar.querySelector('p');button.onclick=()=>{const values={};for(const input of document.querySelectorAll('.presencePanel input[aria-label]')){const label=input.getAttribute('aria-label');if(input.type==='range')values[label]=Number(input.value);}const effects=Object.fromEntries([...document.querySelectorAll('[data-compare]')].map(e=>[e.dataset.compare,e.checked]));const state=getSceneState();try{localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,values,effects,...state}));status.textContent='已设为默认，下次打开自动恢复。';}catch(e){status.textContent='保存失败：浏览器未允许本地存储。';console.warn(e);}};
}
