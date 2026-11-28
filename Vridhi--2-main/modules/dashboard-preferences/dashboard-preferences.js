document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-ab]');if(b){UI.ab=b.dataset.ab;dupd()}});
(function(){
const DASH=[['hero','Summary header'],['status','Retirement readiness'],['plan','Plan simulation'],['insights','Timeline & insights'],['alloc','Asset allocation']];
const T={Dashboard:{k:'fwt3-order',s:DASH,n:'dashboard'},
Holdings:{k:'fwt3-order-holdings',n:'holdings',s:[['hdr','Page header'],['table','Holdings list']]},
Reports:{k:'fwt3-order-reports',n:'reports',s:[['hdr','Header & report type'],['table','Report table']]},
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
const gp=rest.filter(e=>e.x.classList&&e.x.classList.contains('gpb')),rest2=rest.filter(e=>!gp.includes(e));const ordered=gp.concat(known,rest2);let idx=0,same=true;for(let ci=0;ci<m.children.length;ci++){if(m.children[ci]===bar)continue;if(m.children[ci]!==(ordered[idx]&&ordered[idx].x)){same=false;break}idx++}if(!same||idx!==ordered.length)ordered.forEach(e=>m.appendChild(e.x))};/* the Goal Planner sub-tab bar always stays on top */
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
const inj=()=>{if(document.getElementById('fzs'))return;const s=document.getElementById('rsf');if(s){const f=document.createElement('select');f.id='fzs';f.setAttribute('aria-label','Freeze columns');f.innerHTML='<option value="0">Freeze: none</option><option value="2">Freeze: Year</option><option value="3">Freeze: Year + Ages</option>';f.value=v;s.after(f)}};
const mEl=document.getElementById('m');
if(mEl)new MutationObserver(inj).observe(mEl,{childList:true,subtree:true});else new MutationObserver(inj).observe(document.documentElement,{childList:true,subtree:true});inj();
document.addEventListener('change',e=>{if(e.target.id==='fzs')set(e.target.value)});})();
(function(){
const FN=[['inter','Inter','Clean & modern'],['poppins','Poppins','Friendly & round'],['nunito','Nunito Sans','Soft & readable'],['plex','IBM Plex Sans','Corporate'],['lora','Lora','Elegant serif'],['system','System','Your device font']];
const FF={inter:'Inter',poppins:'Poppins',nunito:'Nunito Sans',plex:'IBM Plex Sans',lora:'Lora',system:'-apple-system,Segoe UI'};
const PR=[['Forest Green','green','light','inter','#10291f','#16845d'],['Royal Purple','purple','light','poppins','#2e1065','#9333ea'],['Sunset Orange','orange','light','nunito','#431407','#ea580c'],['Rosewood','rose','light','lora','#4c0519','#e11d48'],['Graphite Dark','grey','dark','plex','#111827','#64748b'],['Golden Paper','yellow','light','lora','#3b2f05','#ca8a04']];
[['purple','Purple','#2e1065','#7e22ce'],['rose','Rose','#4c0519','#be123c']].forEach(p=>{if(!PALS.some(x=>x[0]===p[0]))PALS.push(p)});
const K='fwt2-look',D={font:'inter',size:'m',dens:'cosy',rad:'std'};let L=Object.assign({},D);try{Object.assign(L,JSON.parse(localStorage.getItem(K))||{})}catch(e){}
const ap=()=>{const r=document.documentElement.dataset;r.font=L.font;r.size=L.size;r.dens=L.dens==='cosy'?'':L.dens;r.rad=L.rad==='std'?'':L.rad;try{localStorage.setItem(K,JSON.stringify(L))}catch(e){}};ap();window.vrLookSet=(k,v)=>{L[k]=v;ap()};window.vrLookReset=()=>{L=Object.assign({},D);ap()};
const sg=(k,t,o)=>'<div><div class="mu" style="margin-bottom:6px">'+t+'</div><div class="seg" role="group" aria-label="'+t+'">'+o.map(([v,n])=>'<button type="button" data-lk="'+k+':'+v+'" aria-pressed="'+(L[k]===v)+'">'+n+'</button>').join('')+'</div></div>';
window.lookUI=()=>''+'<div class="sub2">Font</div><div class="fonts" role="group" aria-label="Font">'+FN.map(f=>'<button type="button" class="fb" data-lk="font:'+f[0]+'" aria-pressed="'+(L.font===f[0])+'"><span style="font-family:'+FF[f[0]]+',sans-serif">Aa 123</span>'+f[1]+'<br><small>'+f[2]+'</small></button>').join('')+'</div>'
+'<div class="sgs">'+sg('rad','Corners',[['sharp','Sharp'],['std','Default'],['round','Round']])+'</div>';
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('[data-look],[data-lk]');if(!a)return;
if(a.dataset.look!=null){const p=PR[+a.dataset.look];S.palette=p[1];S.cc=null;S.theme=p[2];L.font=p[3];save();theme();ap();render();toast(p[0]+' look applied');return}
const[k,v]=a.dataset.lk.split(':');if(k==='reset'){L=Object.assign({},D)}else L[k]=v;ap();render()});
})();
(function(){
var K='vr-ui',D={uth:'mono',ubt:'filled',ush:'round',uin:'outlined',utd:'normal',uhd:'plain',utz:'off',utl:'on',utc:'on',ufn:'system',utx:'default',uic:'on',uwt:'normal',utcol:''},U=Object.assign({},D);
try{Object.assign(U,JSON.parse(localStorage.getItem(K))||{})}catch(e){}
if(U.utx==='navy')U.utx='forest';
function isHex(v){return typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)}
U.utcol=isHex(U.utcol)?U.utcol.toLowerCase():'';
var O={ufn:['Font',[['system','System'],['inter','Inter'],['serif','Serif'],['humanist','Humanist'],['mono','Monospace']]],
utx:['Text colour',[['default','Default'],['charcoal','Charcoal'],['forest','Forest']]],
uwt:['Text weight',[['normal','Normal'],['medium','Medium'],['semibold','Semibold'],['bold','Bold']]],
ubt:['Button style',[['filled','Filled'],['soft','Soft'],['outline','Outline']]],
ush:['Corner shape',[['sharp','Sharp'],['round','Rounded'],['pill','Pill']]],
uin:['Input style',[['outlined','Outlined'],['filled','Filled'],['underline','Underline']]],
uhd:['Table header',[['plain','Plain'],['tint','Tinted'],['line','Underlined']]],
utz:['Striped rows',[['off','Off'],['on','On']]],
utl:['Row lines',[['on','On'],['off','Off']]],
utc:['Column lines',[['on','On'],['off','Off']]],
uic:['Icons',[['on','On'],['off','Off']]]};
var TC_SW=[['#14392b','Forest'],['#1e3a5f','Navy'],['#0f766e','Teal'],['#334155','Slate'],['#4338ca','Indigo'],['#6d28d9','Plum'],['#92400e','Amber'],['#9f1239','Burgundy']];
var TC_VARS=['--tbl-raw','--tbl-hd-bg','--tbl-hd-tx','--tbl-hd-mu','--tbl-hd-tint-bg','--tbl-hd-tint-tx','--tbl-hd-line','--tbl-tint','--tbl-bg','--tbl-stripe','--tbl-hover','--tbl-tot-bg','--tbl-bd','--tbl-bd-strong'];
var CHK='<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>';
function ch(c){c=c.replace('#','');return[0,2,4].map(function(i){return parseInt(c.substr(i,2),16)})}
function toHex(rgb){return'#'+rgb.map(function(v){return Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')}).join('')}
function mix(a,b,t){var x=ch(a),y=ch(b);return toHex([0,1,2].map(function(i){return x[i]+(y[i]-x[i])*t}))}
function lum(c){var rgb=ch(c).map(function(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2]}
function cr(a,b){var l1=lum(a),l2=lum(b);return(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05)}
function isDark(){var root=document.documentElement,a=root.getAttribute('data-theme');return a==='dark'||(!a&&typeof window!=='undefined'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)}
function ensureContrast(bg,minRatio){
  var light='#f8fafc',dark='#0f172a',target=minRatio||4.8,cur=bg,n=0;
  var pick=function(c){var cl=cr(c,light),cd=cr(c,dark);return cl>=cd?{tx:light,ratio:cl,dir:'#000000'}:{tx:dark,ratio:cd,dir:'#ffffff'}};
  var res=pick(cur);
  while(res.ratio<target&&n++<30){cur=mix(cur,res.dir,0.08);res=pick(cur)}
  var mu=mix(res.tx,cur,0.16);
  if(cr(cur,mu)<4.5)mu=res.tx;
  return{bg:cur,tx:res.tx,mu:mu,ratio:res.ratio};
}
function computeTablePalette(rawHex,dark){
  var c=rawHex.toLowerCase(),l=lum(c);
  var hdSeed=c;
  if(dark){
    if(l>0.40)hdSeed=mix(c,'#162030',0.56);
    else if(l>0.22)hdSeed=mix(c,'#162030',0.34);
    else if(l<0.03)hdSeed=mix(c,'#e2e8f0',0.18);
    else if(l<0.07)hdSeed=mix(c,'#ffffff',0.08);
  }
  var hd=ensureContrast(hdSeed,4.8);
  var tint=dark?(l<0.06?mix(c,'#cbd5e1',0.32):hd.bg):(l>0.85?mix(c,'#334155',0.28):c);
  var cardRef=dark?'#141c2e':'#ffffff';
  var tintHdBg=mix(cardRef,tint,dark?0.26:0.16);
  var tintHd=ensureContrast(tintHdBg,4.8);
  var hdLine=tint,ln=0;
  while(cr(hdLine,cardRef)<3.2&&ln++<30)hdLine=mix(hdLine,dark?'#f8fafc':'#0f172a',0.1);
  return{
    '--tbl-raw':c,
    '--tbl-hd-bg':hd.bg,
    '--tbl-hd-tx':hd.tx,
    '--tbl-hd-mu':hd.mu,
    '--tbl-hd-tint-bg':tintHd.bg,
    '--tbl-hd-tint-tx':tintHd.tx,
    '--tbl-hd-line':hdLine,
    '--tbl-tint':tint,
    '--tbl-bg':dark?'color-mix(in srgb, '+tint+' 8%, var(--card))':'color-mix(in srgb, '+tint+' 4%, var(--card))',
    '--tbl-stripe':dark?'color-mix(in srgb, '+tint+' 16%, var(--card))':'color-mix(in srgb, '+tint+' 10%, var(--card))',
    '--tbl-hover':dark?'color-mix(in srgb, '+tint+' 22%, var(--card))':'color-mix(in srgb, '+tint+' 14%, var(--card))',
    '--tbl-tot-bg':dark?'color-mix(in srgb, '+tint+' 18%, var(--card))':'color-mix(in srgb, '+tint+' 12%, var(--card))',
    '--tbl-bd':dark?'color-mix(in srgb, '+tint+' 30%, var(--bd))':'color-mix(in srgb, '+tint+' 26%, var(--bd))',
    '--tbl-bd-strong':dark?'color-mix(in srgb, '+tint+' 48%, var(--bd))':'color-mix(in srgb, '+tint+' 44%, var(--bd))',
    contrast:hd.ratio
  };
}
function applyTableColor(){
  var root=document.documentElement;
  if(isHex(U.utcol)){
    var pal=computeTablePalette(U.utcol,isDark());
    root.dataset.utcol='custom';
    TC_VARS.forEach(function(k){root.style.setProperty(k,pal[k])});
  }else{
    delete root.dataset.utcol;
    TC_VARS.forEach(function(k){root.style.removeProperty(k)});
  }
}
function syncTableColorUI(){
  var cur=isHex(U.utcol)?U.utcol:'';
  var inp=document.getElementById('u_utcol');
  var val=document.getElementById('u_utcol_val');
  var pick=document.querySelector('.uip-tc-pick');
  var rst=document.querySelector('[data-utcol-reset]');
  var pre=TC_SW.some(function(s){return s[0]===cur});
  if(inp)inp.value=cur||'#14392b';
  if(val)val.textContent=cur||'Default';
  if(pick)pick.classList.toggle('on',Boolean(cur&&!pre));
  if(rst)rst.disabled=!cur;
  document.querySelectorAll('[data-utcol-preset]').forEach(function(b){
    b.setAttribute('aria-checked',String(b.dataset.utcolPreset===cur));
  });
}
function ap(){
  var r=document.documentElement.dataset;
  Object.keys(U).forEach(function(k){if(k!=='utcol')r[k]=U[k]});
  applyTableColor();
  try{localStorage.setItem(K,JSON.stringify(U))}catch(e){}
}
ap();
window.vrUISet=function(k,v){if(k==='utcol'){U.utcol=isHex(v)?v.toLowerCase():''}else{U[k]=v}ap()};
window.vrUIReset=function(){U=Object.assign({},D);ap()};
window.vrTableColor={
  get:function(){return U.utcol||''},
  set:function(v){U.utcol=isHex(v)?v.toLowerCase():'';ap();syncTableColorUI()},
  reset:function(){U.utcol='';ap();syncTableColorUI()},
  apply:applyTableColor,
  compute:computeTablePalette
};
try{new MutationObserver(applyTableColor).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme','data-minimal-theme']})}catch(e){}
try{if(window.matchMedia)window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',applyTableColor)}catch(e){}
function tableColorUI(){
  var cur=isHex(U.utcol)?U.utcol:'',seed=cur||'#14392b',pre=TC_SW.some(function(s){return s[0]===cur});
  var minNote=document.documentElement.hasAttribute('data-minimal-theme')?' The Minimal theme is monochrome, so pick another theme to see your colour.':'';
  return'<div class="uip-tc">'
    +'<div class="uip-tc-hd"><label for="u_utcol">Table Colour</label>'
    +'<button type="button" class="uip-tc-reset" data-utcol-reset="1" aria-label="Reset table colour to default"'+(cur?'':' disabled')+'>Reset to default</button></div>'
    +'<div class="uip-tc-bar" role="radiogroup" aria-label="Table Colour presets">'
    +TC_SW.map(function(s){return'<button type="button" class="uip-tc-sw" role="radio" aria-checked="'+(s[0]===cur)+'" aria-label="'+s[1]+'" title="'+s[1]+'" data-utcol-preset="'+s[0]+'" style="--sw:'+s[0]+'">'+CHK+'</button>'}).join('')
    +'<label class="uip-tc-pick'+(cur&&!pre?' on':'')+'" title="Pick any table colour"><input type="color" id="u_utcol" data-ui-color="utcol" value="'+seed+'" aria-label="Table Colour"><span>Custom</span><code id="u_utcol_val">'+(cur||'Default')+'</code></label>'
    +'</div>'
    +'<div class="uip-tc-prev" aria-label="Live table colour preview"><table class="uip-tc-tbl"><thead><tr><th>Holding</th><th>Value</th><th>ROI</th></tr></thead><tbody><tr><td>Index Fund</td><td>₹12.5 L</td><td>11.5%</td></tr><tr><td>PPF Account</td><td>₹8.4 L</td><td>7.1%</td></tr><tr class="t"><td>Total</td><td>₹20.9 L</td><td>9.7%</td></tr></tbody></table></div>'
    +'<p class="uip-tc-note">Applies consistently across tables and adapts automatically for Light and Dark mode.'+minNote+'</p>'
    +'</div>';
}
var L0=window.lookUI;
window.lookUI=function(){return'<div class="uip">'+Object.keys(O).map(function(k){return'<div><label for="u_'+k+'">'+O[k][0]+'</label><select id="u_'+k+'" data-ui="'+k+'">'+O[k][1].map(function(o){return'<option value="'+o[0]+'"'+(U[k]===o[0]?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select></div>'}).join('')+tableColorUI()+'</div>'+(L0?L0():'')};
document.addEventListener('input',function(e){var t=e.target;if(!t||!t.dataset||t.dataset.uiColor!=='utcol')return;e.stopPropagation();U.utcol=isHex(t.value)?t.value.toLowerCase():'';ap();syncTableColorUI()},true);
document.addEventListener('change',function(e){var t=e.target;if(t&&t.dataset&&t.dataset.ui){e.stopPropagation();U[t.dataset.ui]=t.value;ap();return}if(t&&t.dataset&&t.dataset.uiColor==='utcol'){e.stopPropagation();U.utcol=isHex(t.value)?t.value.toLowerCase():'';ap();syncTableColorUI();if(window.toast)toast('Table colour applied')}},true);
document.addEventListener('click',function(e){
  var p=e.target.closest&&e.target.closest('[data-utcol-preset]');
  if(p){e.stopPropagation();U.utcol=isHex(p.dataset.utcolPreset)?p.dataset.utcolPreset.toLowerCase():'';ap();syncTableColorUI();if(window.toast)toast('Table colour applied');return}
  var r=e.target.closest&&e.target.closest('[data-utcol-reset]');
  if(r&&!r.disabled){e.stopPropagation();U.utcol='';ap();syncTableColorUI();if(window.toast)toast('Table colour reset to default');return}
  var b=e.target.closest&&e.target.closest('[data-uireset]');if(!b)return;e.stopPropagation();U=Object.assign({},D);ap();if(window.render)window.render()
},true);
})();