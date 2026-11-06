document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-ab]');if(b){UI.ab=b.dataset.ab;dupd()}});
(function(){
const DASH=[['hero','Summary header'],['status','Retirement readiness'],['plan','Plan simulation'],['insights','Timeline & insights'],['alloc','Asset allocation']];
const T={Dashboard:{k:'fwt3-order',s:DASH,n:'dashboard'},
Holdings:{k:'fwt3-order-holdings',n:'holdings',s:[['hdr','Page header'],['table','Holdings list']]},
Reports:{k:'fwt3-order-reports',n:'reports',s:[['hdr','Header & report type'],['table','Report table']]},
Settings:{k:'fwt3-order-settings',n:'settings',s:[['hdr','Page header'],['family','Family'],['general','General assumptions'],['appearance','Appearance & backup']]},
Help:{k:'fwt3-order-help',n:'help',s:[['hdr','Page header'],['docs','Help & documentation'],['topics','Topics'],['tips','Tips']]}};
const O={};const ids=t=>T[t].s.map(s=>s[0]);
const get=t=>{if(O[t])return O[t];let o=ids(t).slice();try{const a=JSON.parse(localStorage.getItem(T[t].k));if(Array.isArray(a))o=a.filter(k=>ids(t).includes(k)).concat(ids(t).filter(k=>!a.includes(k)))}catch(e){}return O[t]=o};
const st=document.createElement('style');document.head.appendChild(st);
const sig=(t,c)=>{const cl=c.className||'',h=(c.querySelector('h1,h2,h3')||{}).textContent||'';
if(cl.includes('ordbar'))return null;if(c.id==='agk')return'kpi';if(cl.includes('agebar'))return'age';
if(t==='Holdings')return cl.includes('hp-head')?'hdr':cl.includes('hp-kpi')?'summary':cl.includes('card')?'table':null;
if(t==='Reports')return cl.includes('rph')?'hdr':cl.includes('rsel')?'filter':cl.includes('card')?'table':null;
if(t==='Settings')return cl.includes('rph')?'hdr':/^Family/.test(h)?'family':/^General/.test(h)?'general':/^Appearance/.test(h)?'appearance':null;
if(t==='Help')return cl.includes('pb')?'hdr':cl.includes('card')?'docs':c.id==='hl'?'topics':cl.includes('mu')?'tips':null;return null};
const apply=()=>{const t=UI.tab,c=T[t];if(!c)return;const o=get(t);try{localStorage.setItem(c.k,JSON.stringify(o))}catch(e){}
if(t==='Dashboard'){st.textContent=o.map((k,i)=>'#dsh>[data-sec="'+k+'"],#dsh #d2>[data-sec="'+k+'"]{order:'+i+'}').join('');return}
st.textContent='';const m=document.getElementById('m');if(!m)return;
let bar=m.querySelector(':scope>.ordbar');if(!bar){bar=document.createElement('div');bar.className='ordbar';bar.innerHTML=tr('<button type="button" id="ordb">Reorder sections</button>',1);m.insertBefore(bar,m.firstChild)}
const els=[...m.children].filter(x=>x!==bar).map(x=>({x,k:sig(t,x)}));const rank=k=>k==null?-1:o.indexOf(k);
const known=els.filter(e=>e.k!=null).sort((a,b)=>rank(a.k)-rank(b.k)),rest=els.filter(e=>e.k==null);
const gp=rest.filter(e=>e.x.classList&&e.x.classList.contains('gpb')),rest2=rest.filter(e=>!gp.includes(e));gp.concat(known,rest2).forEach(e=>m.appendChild(e.x))};/* the Goal Planner sub-tab bar always stays on top */
const nm=()=>Object.fromEntries(T[UI.tab].s);
const html=()=>{const t=UI.tab,o=get(t),n=nm();return'<h2>Reorder '+T[t].n+' sections</h2><p class="mu">Use the arrows to move a section up or down. Your order is remembered on this device.</p><ul class="ordl">'+o.map((k,i)=>'<li><span class="ix">'+(i+1)+'</span><span class="n">'+n[k]+'</span><button type="button" data-mv="'+k+':-1" aria-label="Move '+n[k]+' up"'+(i?'':' disabled')+'>▲</button><button type="button" data-mv="'+k+':1" aria-label="Move '+n[k]+' down"'+(i<o.length-1?'':' disabled')+'>▼</button></li>').join('')+'</ul><div class="tb"><button type="button" data-mv="reset">Reset to default</button><button type="button" class="p" data-mv="done">Done</button></div>'};
const r0=window.render;window.render=function(){const r=r0.apply(this,arguments);apply();return r};
apply();
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#ordb,[data-mv]');if(!b||!T[UI.tab])return;
if(b.id==='ordb'){dg.innerHTML=tr(html(),1);dg.showModal();return}
const v=b.dataset.mv,t=UI.tab;if(v==='done'){dg.close();return}
let o=get(t);if(v==='reset')O[t]=ids(t).slice();else{const[k,d]=v.split(':'),i=o.indexOf(k),j=i+ +d;if(j<0||j>=o.length)return;o.splice(i,1);o.splice(j,0,k)}
apply();dg.innerHTML=tr(html(),1);const f=dg.querySelector('[data-mv="'+v+'"]:not(:disabled)')||dg.querySelector('[data-mv="done"]');if(f)f.focus()});
})();
(function(){const K='fwt2-fz';let v='2';try{v=localStorage.getItem(K)||'2'}catch(e){}
const set=x=>{v=x;document.body.dataset.fz=x;try{localStorage.setItem(K,x)}catch(e){}};set(['0','2','3'].includes(v)?v:'2');
const inj=()=>{const s=document.getElementById('rsf');if(s&&!document.getElementById('fzs')){const f=document.createElement('select');f.id='fzs';f.setAttribute('aria-label','Freeze columns');f.innerHTML='<option value="0">Freeze: none</option><option value="2">Freeze: Year</option><option value="3">Freeze: Year + Ages</option>';f.value=v;s.after(f)}};
new MutationObserver(inj).observe(document.documentElement,{childList:true,subtree:true});inj();
document.addEventListener('change',e=>{if(e.target.id==='fzs')set(e.target.value)});})();
(function(){
const FN=[['inter','Inter','Clean & modern'],['poppins','Poppins','Friendly & round'],['nunito','Nunito Sans','Soft & readable'],['plex','IBM Plex Sans','Corporate'],['lora','Lora','Elegant serif'],['system','System','Your device font']];
const FF={inter:'Inter',poppins:'Poppins',nunito:'Nunito Sans',plex:'IBM Plex Sans',lora:'Lora',system:'-apple-system,Segoe UI'};
const PR=[['Emerald Classic','green','light','inter','#052e2b','#0f766e'],['Midnight Blue','blue','dark','inter','#0b1b4a','#2563eb'],['Royal Purple','purple','light','poppins','#2e1065','#9333ea'],['Executive Navy','indigo','light','plex','#1e1b4b','#4f46e5'],['Sunset Orange','orange','light','nunito','#431407','#ea580c'],['Rosewood','rose','light','lora','#4c0519','#e11d48'],['Graphite Dark','grey','dark','plex','#111827','#64748b'],['Golden Paper','yellow','light','lora','#3b2f05','#ca8a04']];
[['blue','Blue','#0b1b4a','#1d4ed8'],['indigo','Indigo','#1e1b4b','#4338ca'],['purple','Purple','#2e1065','#7e22ce'],['rose','Rose','#4c0519','#be123c']].forEach(p=>{if(!PALS.some(x=>x[0]===p[0]))PALS.push(p)});
const K='fwt2-look',D={font:'inter',size:'m',dens:'cosy',rad:'std'};let L=Object.assign({},D);try{Object.assign(L,JSON.parse(localStorage.getItem(K))||{})}catch(e){}
const ap=()=>{const r=document.documentElement.dataset;r.font=L.font;r.size=L.size;r.dens=L.dens==='cosy'?'':L.dens;r.rad=L.rad==='std'?'':L.rad;try{localStorage.setItem(K,JSON.stringify(L))}catch(e){}};ap();
const sg=(k,t,o)=>'<div><div class="mu" style="margin-bottom:6px">'+t+'</div><div class="seg" role="group" aria-label="'+t+'">'+o.map(([v,n])=>'<button type="button" data-lk="'+k+':'+v+'" aria-pressed="'+(L[k]===v)+'">'+n+'</button>').join('')+'</div></div>';
window.lookUI=()=>''+'<div class="sub2">Font</div><div class="fonts" role="group" aria-label="Font">'+FN.map(f=>'<button type="button" class="fb" data-lk="font:'+f[0]+'" aria-pressed="'+(L.font===f[0])+'"><span style="font-family:'+FF[f[0]]+',sans-serif">Aa 123</span>'+f[1]+'<br><small>'+f[2]+'</small></button>').join('')+'</div>'
+'<div class="sub2">Comfort</div><div class="sgs">'+sg('size','Text size',[['s','A−'],['m','A'],['l','A+'],['xl','A++']])+sg('dens','Table spacing',[['compact','Compact'],['cosy','Normal'],['roomy','Roomy']])+sg('rad','Corners',[['sharp','Sharp'],['std','Default'],['round','Round']])+'</div>'
+'<div style="margin-top:12px"><button type="button" data-lk="reset:1">Reset look</button></div>';
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('[data-look],[data-lk]');if(!a)return;
if(a.dataset.look!=null){const p=PR[+a.dataset.look];S.palette=p[1];S.cc=null;S.theme=p[2];L.font=p[3];save();theme();ap();render();toast(p[0]+' look applied');return}
const[k,v]=a.dataset.lk.split(':');if(k==='reset'){L=Object.assign({},D)}else L[k]=v;ap();render()});
})();
(function(){var K='vr-ui',D={uth:'mono',ubt:'filled',ush:'round',uin:'outlined',utd:'normal',uhd:'plain',utz:'off',utl:'on',utc:'on',ufn:'system',utx:'default',uic:'on'},U=Object.assign({},D);
try{Object.assign(U,JSON.parse(localStorage.getItem(K))||{})}catch(e){}
var O={uth:['Colour theme',[['mono','Mono'],['ocean','Ocean'],['emerald','Emerald'],['indigo','Indigo'],['amber','Amber']]],
ufn:['Font',[['system','System'],['inter','Inter'],['serif','Serif'],['humanist','Humanist'],['mono','Monospace']]],
utx:['Text colour',[['default','Default'],['charcoal','Charcoal'],['navy','Navy'],['forest','Forest']]],
ubt:['Button style',[['filled','Filled'],['soft','Soft'],['outline','Outline']]],
ush:['Corner shape',[['sharp','Sharp'],['round','Rounded'],['pill','Pill']]],
uin:['Input style',[['outlined','Outlined'],['filled','Filled'],['underline','Underline']]],
utd:['Table density',[['compact','Compact'],['normal','Normal'],['comfy','Comfortable']]],
uhd:['Table header',[['plain','Plain'],['tint','Tinted'],['line','Underlined']]],
utz:['Striped rows',[['off','Off'],['on','On']]],
utl:['Row lines',[['on','On'],['off','Off']]],
utc:['Column lines',[['on','On'],['off','Off']]],
uic:['Icons',[['on','On'],['off','Off']]]};
function ap(){var r=document.documentElement.dataset;Object.keys(U).forEach(function(k){r[k]=U[k]});try{localStorage.setItem(K,JSON.stringify(U))}catch(e){}}
ap();var L0=window.lookUI;
window.lookUI=function(){return'<div class="uip">'+Object.keys(O).map(function(k){return'<div><label for="u_'+k+'">'+O[k][0]+'</label><select id="u_'+k+'" data-ui="'+k+'">'+O[k][1].map(function(o){return'<option value="'+o[0]+'"'+(U[k]===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select></div>'}).join('')+'</div><div style="margin:8px 0 12px"><button type="button" data-uireset="1">Reset appearance</button></div>'+(L0?L0():'')};
document.addEventListener('change',function(e){var t=e.target;if(t&&t.dataset&&t.dataset.ui){e.stopPropagation();U[t.dataset.ui]=t.value;ap()}},true);
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-uireset]');if(!b)return;e.stopPropagation();U=Object.assign({},D);ap();if(window.render)window.render()},true);
})();