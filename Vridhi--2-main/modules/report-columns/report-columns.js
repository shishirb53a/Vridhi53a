/* Report columns: three tiers per report (fixed / defaultVisible / optional). One saved choice per report type, shared by Reports, the holding popup and Settings. */
(function(){
var CFG={
year:{fixed:['year','v','tot'],defaultVisible:['age','int','mi','pay','ti','roi','add'],optional:['a','chg','hi','s']},
month:{fixed:['year','v','tot'],defaultVisible:['age','roi','add','int','pay','ti'],optional:['a','chg','hi','fy','s']},
int:{fixed:['year','open','close'],defaultVisible:['add','v','int','mi','roi'],optional:['a','age']}};
var LAB={
year:{year:'Year (as on)',v:"Holding\u2019s value (\u20b9 L)",tot:'Year end balance',age:'Ages',int:'Yearly income',mi:'Monthly income',pay:'Policy payouts',ti:'Total income',roi:'Blended ROI',add:'Amount deposited',a:'S.No',chg:'Change (\u20b9 L)',hi:'Total (\u0939\u093f\u0928\u094d\u0926\u0940)',s:'Child stage columns'},
month:{year:'Month',v:"Holding\u2019s value (\u20b9 L)",tot:'Month end balance',age:'Ages',roi:'Blended ROI',add:'Amount deposited',int:'Interest earned',pay:'Policy payout',ti:'Total income',a:'S.No',chg:'Change (\u20b9 L)',hi:'Total (\u0939\u093f\u0928\u094d\u0926\u0940)',fy:'Financial year',s:'Child stage columns'},
int:{year:'Financial year',open:'Opening balance',close:'Closing balance',add:'Additions',v:"Holding\u2019s interest",int:'Interest earned',mi:'Monthly income',roi:'Yield on opening',a:'S.No',age:'Age'}};
var NAME={year:'Annual Portfolio Projection',month:'Monthly Portfolio Projection',int:'Interest & Income Statement'};
var CL={year:{'Blended ROI':'roi','Yearly income':'int','Monthly income':'mi','Policy payouts':'pay','Total income':'ti','Amount deposited':'add','Yearly change':'chg'},
month:{'Blended ROI':'roi','Amount deposited':'add','Interest earned':'int','Policy payout':'pay','Total income':'ti','Monthly change':'chg'},
int:{'Opening balance':'open','Additions':'add','Interest earned':'int','Monthly income':'mi','Yield on opening':'roi','Closing balance':'close'}};
var CK='fwt4-cols'+(window.__UK?'-'+window.__UK:''),P={};
try{P=JSON.parse(localStorage.getItem(CK)||'{}')||{}}catch(e){P={}}
/* Column ORDER, chosen in Settings > Report columns. DEFORD = the movable columns left to right as the report draws them;
   PIN = the leading identification columns that stay put (they are the frozen columns when you scroll). */
var DEFORD={year:['v','int','mi','pay','ti','tot','roi','add','chg','hi'],month:['v','tot','roi','add','int','pay','ti','chg','hi'],int:['add','v','int','mi','roi','close']};
var HZPIN='When',CKO=CK+'-ord',O={};
try{O=JSON.parse(localStorage.getItem(CKO)||'{}')||{}}catch(e){O={}}
function persistO(){try{localStorage.setItem(CKO,JSON.stringify(O))}catch(e){}}
function effAll(v){var base=DEFORD[v],sv=(O[v]||[]).filter(function(g){return base.indexOf(g)>-1});return sv.concat(base.filter(function(g){return sv.indexOf(g)<0}))}
function effShown(v){return effAll(v).filter(function(g){return hasPol(g)})}
function moveTo(o,g,t){var i=o.indexOf(g),j=o.indexOf(t);if(i<0||j<0)return o;o.splice(j,0,o.splice(i,1)[0]);return o}
function move(v,g,d){var sh=effShown(v),k=sh.indexOf(g),t=sh[k+d];if(k<0||!t)return;O[v]=moveTo(effAll(v),g,t);persistO()}
function sortBy(arr,saved,key){return arr.slice().sort(function(p,q){var i=saved.indexOf(key(p)),j=saved.indexOf(key(q));if(i<0&&j<0)return 0;if(i<0)return 1;if(j<0)return-1;return i-j})}
function catOrder(arr){return sortBy(arr,O.sav||[],function(x){return x})}
function catsBase(){var out=[];(S.assets||[]).forEach(function(x){if(x.type!=='gratuity'&&out.indexOf(x.cat)<0)out.push(x.cat)});var ord=(typeof CATS!=='undefined'&&CATS)||[];out.sort(function(p,q){var i=ord.indexOf(p),j=ord.indexOf(q);return(i<0?99:i)-(j<0?99:j)});return catOrder(out)}
function hzOrder(g){var o=O.hz;if(!o||!o.length)return g;var pin=g.filter(function(x){return x.title===HZPIN}),rest=g.filter(function(x){return x.title!==HZPIN});return pin.concat(sortBy(rest,o,function(x){return x.title}))}
function hzTitles(){var t=window.hzGroupTitles&&window.hzGroupTitles();return t?t.filter(function(x){return x!==HZPIN}):null}
var view=function(){return UI.rv||'year'};
function persist(){try{localStorage.setItem(CK,JSON.stringify(P))}catch(e){}}
function grp(k){return/^v\d+$/.test(k)?'v':/^s\d+$/.test(k)?'s':k}
function tier(v,g){var c=CFG[v];if(!c)return'other';return c.fixed.indexOf(g)>-1?'fixed':c.defaultVisible.indexOf(g)>-1?'dv':c.optional.indexOf(g)>-1?'opt':'other'}
function vis(v,k){var g=grp(k),t=tier(v,g);if(t==='fixed'||t==='other')return true;var o=P[v]&&P[v][g];return typeof o==='boolean'?o:t==='dv'}
function setPref(v,g,on){var t=tier(v,g);if(t==='fixed'||t==='other')return;P[v]=P[v]||{};if(on===(t==='dv'))delete P[v][g];else P[v][g]=on;if(!Object.keys(P[v]).length)delete P[v];persist()}
function reset(v){delete P[v];delete O[v];persist();persistO()}
function showAll(v){P[v]={};CFG[v].defaultVisible.concat(CFG[v].optional).forEach(function(g){setPref(v,g,true)});persist()}
function hasPol(g){if(g!=='pay'&&g!=='ti')return true;var v=view(),pref=P[v]&&P[v][g];return !!((window.VRPolicy&&VRPolicy.hasPayouts('goal'))||pref===true)}
function annualMonthlyIncome(interest,pay,allm){var p=vis('year','pay')&&pay>0?pay:0;if(interest==null&&!p||allm&&!p)return null;return((allm?0:(interest||0))+p)/12}
function groups(v){var c=CFG[v];return c.fixed.concat(c.defaultVisible,c.optional).filter(hasPol)}
/* put the movable column groups in the chosen order. Pinned columns keep their place; movable groups swap among the slots movable groups already occupy. */
function reorderBlocks(blocks,v){var mv=DEFORD[v],slots=blocks.filter(function(b){return b.g&&mv.indexOf(b.g)>-1});if(slots.length<2)return null;
var o=effAll(v),sorted=slots.slice().sort(function(a,b){return o.indexOf(a.g)-o.indexOf(b.g)});if(sorted.every(function(b,i){return b===slots[i]}))return null;
var si=0;return blocks.map(function(b){return b.g&&mv.indexOf(b.g)>-1?sorted[si++]:b})}
function blocksOf(keys){var bl=[];keys.forEach(function(g,i){var l=bl[bl.length-1];if(l&&g&&l.g===g)l.idx.push(i);else bl.push({g:g,idx:[i]})});return bl}
function reorderTable(t,v){if(!DEFORD[v])return;var n=t.rows[0]?t.rows[0].cells.length:0;if(!n)return;
var ks=Array.prototype.map.call(t.rows[0].cells,function(c){var b=c.querySelector('button[data-rk]');return b?grp(b.dataset.rk):''});
var seq=reorderBlocks(blocksOf(ks),v);if(!seq)return;var perm=[];seq.forEach(function(b){b.idx.forEach(function(i){perm.push(i)})});
Array.prototype.forEach.call(t.rows,function(r){if(r.cells.length!==n)return;var cs=Array.prototype.slice.call(r.cells);perm.forEach(function(i){r.appendChild(cs[i])})})}
function pairKey(v,lab,val){var k=CL[v][lab]||null;if(!k&&v==='int'&&/ interest$/.test(lab))k='v';if(!k&&v!=='int'&&/^Age\b/.test(val))k='age';
if(!k&&v!=='int'&&(S.assets||[]).some(function(a){return a.name===lab}))k='v';return k}
function reorderCard(d,v){if(!DEFORD[v])return;var kv=d.querySelector('.kv');if(!kv)return;var ch=Array.prototype.slice.call(kv.children),pr=[];
for(var i=0;i<ch.length-1;i+=2)pr.push({sp:ch[i],bv:ch[i+1],k:pairKey(v,ch[i].textContent.trim(),ch[i+1].textContent.trim())});
var seq=reorderBlocks(blocksOf(pr.map(function(x){return x.k})),v);if(!seq)return;
seq.forEach(function(b){b.idx.forEach(function(i){kv.appendChild(pr[i].sp);kv.appendChild(pr[i].bv)})})}
/* remove hidden columns from a report table and its phone cards (idempotent per rendered table) */
function apply(root,v){
if(!root||!CFG[v])return;
var t=root.querySelector('table.rt');
if(t&&!t.dataset.rc){t.dataset.rc=v;
var hs=t.rows[0]?Array.prototype.map.call(t.rows[0].cells,function(c){var b=c.querySelector('button[data-rk]');return b?b.dataset.rk:''}):[];
var rm=[];hs.forEach(function(k,i){if(k&&!vis(v,k))rm.push(i)});
if(rm.length)Array.prototype.forEach.call(t.rows,function(r){for(var j=rm.length-1;j>=0;j--){var c=r.cells[rm[j]];if(c)r.removeChild(c)}});
t.classList.toggle('nsn',!(hs[0]==='a'&&vis(v,'a')));reorderTable(t,v)}
var rc=root.querySelector('.rc');
if(rc&&!rc.dataset.rc){rc.dataset.rc=v;
rc.querySelectorAll('details.yc').forEach(function(d){
var kv=d.querySelector('.kv');
if(kv){var ch=Array.prototype.slice.call(kv.children);
for(var i=0;i<ch.length-1;i+=2){var sp=ch[i],bv=ch[i+1],lab=sp.textContent.trim(),val=bv.textContent.trim(),k=CL[v][lab]||null;
if(!k&&v==='int'&&/ interest$/.test(lab))k='v';
if(!k&&v!=='int'&&/^Age\b/.test(val))k='age';
if(k==='age'){var parts=val.split(' \u00b7 '),aOn=vis(v,'age'),sOn=vis(v,'s');
if(!aOn&&(!sOn||parts.length<2)){sp.remove();bv.remove()}else if(!aOn)bv.textContent=parts.slice(1).join(' \u00b7 ');else if(!sOn&&parts.length>1)bv.textContent=parts[0]}
else if(k&&!vis(v,k)){sp.remove();bv.remove()}}}
var sm=d.querySelector('summary>div.mu');
if(sm&&(v==='int'?!vis(v,'mi'):!vis(v,'hi')))sm.remove();reorderCard(d,v)})}}
/* Columns dropdown on the Reports tab */
function fillDrop(dd,v){
var list=dd.querySelector('.msd-l'),lab=LAB[v];if(!list||!lab)return;
list.innerHTML=groups(v).filter(function(g){return DEFORD[v].indexOf(g)<0}).concat(effShown(v)).map(function(g){var t=tier(v,g);
return t==='fixed'?'<label class="msd-i"><input type="checkbox" checked disabled><span>'+esc(lab[g])+'</span><em>Fixed \ud83d\udd12</em></label>'
:'<label class="msd-i"><input type="checkbox" data-rck="'+g+'"'+(vis(v,g)?' checked':'')+'><span>'+esc(lab[g])+'</span><em>'+(t==='dv'?'Default':'Optional')+'</em></label>'}).join('');
var a=dd.querySelector('.msd-a');if(a)a.innerHTML='<button type="button" data-msda="cols:reset">Reset to default</button><button type="button" data-msda="cols:all">Show all</button>';
var all=groups(v),n=all.filter(function(g){return vis(v,g)}).length,b=dd.querySelector('.msd-b b');
if(b)b.textContent=!P[v]&&!O[v]?'Default columns':n===all.length?'All columns ('+n+')':n+' of '+all.length+' shown'}
var last=null;
function refresh(){var v=view(),dd=document.querySelector('.msd[data-msd="cols"]');if(dd)fillDrop(dd,v);
var host=document.getElementById('rr');if(!host)return;apply(host,v);last=host.querySelector('table.rt')}
window.__colsAct=function(a){var v=view();if(a==='all')showAll(v);else reset(v);UI.msd='cols';render();var n=document.querySelector('[data-msda="cols:'+a+'"]');if(n)n.focus()};
document.addEventListener('change',function(e){var t=e.target;if(!t.dataset)return;
if(t.dataset.rck!=null){setPref(view(),t.dataset.rck,t.checked);var g=t.dataset.rck;UI.msd='cols';render();var n=document.querySelector('[data-rck="'+g+'"]');if(n)n.focus();return}
if(t.dataset.rcs){var p=t.dataset.rcs.split(':');setPref(p[0],p[1],t.checked);var st=document.querySelector('[data-rcst="'+p[0]+'"]');if(st)st.textContent=P[p[0]]?'Customised':'Default'}});
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-rcreset]');if(!b)return;reset(b.dataset.rcreset);render()});
/* Settings > Report columns */
function mvBtns(key,name,i,n){var q=esc(name);return'<span class="rcs-mv"><button type="button" data-rcmv="'+esc(key+':'+name+':-1')+'"'+(i===0?' disabled':'')+' aria-label="Move '+q+' up" title="Move up">\u25b2</button><button type="button" data-rcmv="'+esc(key+':'+name+':1')+'"'+(i===n-1?' disabled':'')+' aria-label="Move '+q+' down" title="Move down">\u25bc</button></span>'}
function colRow(v,g,i,n){var t=tier(v,g),lab=LAB[v][g],mov=DEFORD[v].indexOf(g)>-1;
return'<div class="rcs-r">'+(mov?mvBtns(v,g,i,n):'<span class="rcs-mv rcs-pin" title="Stays at the left">\u21e4</span>')
+'<label class="rcs-i">'+(t==='fixed'?'<input type="checkbox" checked disabled>':'<input type="checkbox" data-rcs="'+v+':'+g+'"'+(vis(v,g)?' checked':'')+'>')+'<span>'+esc(lab)+'</span><em>'+(t==='fixed'?'always shown':t==='dv'?'on by default':'off by default')+'</em></label></div>'}
function listRows(key,names){return names.map(function(x,i){return'<div class="rcs-r">'+mvBtns(key,x,i,names.length)+'<span class="rcs-i"><span>'+esc(x)+'</span></span></div>'}).join('')}
window.rcolsUI=function(){
var h='<div class="card" id="rcset"><h2>Report columns</h2><p class="mu">Choose which columns the reports and the holding pop-up show, and put them in the order you like with the \u25b2 \u25bc buttons. The columns marked \u21e4 (S.No, Year, Ages) stay at the left because they stay frozen when you scroll. Saved on this device.</p>';
h+=Object.keys(CFG).map(function(v){var lab=LAB[v],pin=groups(v).filter(function(g){return DEFORD[v].indexOf(g)<0}),mv=effShown(v);
return'<div class="sub2">'+NAME[v]+' <span class="mu" data-rcst="'+v+'">'+(P[v]||O[v]?'Customised':'Default')+'</span></div>'
+'<div class="rcs-l">'+pin.map(function(g){return colRow(v,g,0,1)}).join('')+mv.map(function(g,i){return colRow(v,g,i,mv.length)}).join('')+'</div>'
+'<div class="acts"><button type="button" data-rcreset="'+v+'">Reset '+NAME[v].toLowerCase()+' to default</button></div>'}).join('');
var cs=catsBase();
h+='<div class="sub2">Annual Savings Schedule <span class="mu">'+(O.sav?'Customised':'Default')+'</span></div>'
+(cs.length>1?'<p class="mu">Order of the category columns.</p><div class="rcs-l">'+listRows('sav',cs)+'</div><div class="acts"><button type="button" data-rcreset="sav">Reset annual savings schedule to default</button></div>':'<p class="mu">Add holdings in two or more categories to arrange the savings columns.</p>');
var hz=hzTitles();
h+='<div class="sub2">Retirement Planner: Year-by-year plan <span class="mu">'+(O.hz?'Customised':'Default')+'</span></div>'
+(hz&&hz.length>1?'<p class="mu">Order of the column groups. \u201c'+HZPIN+'\u201d (S.No, Year, Age) stays first.</p><div class="rcs-l">'+listRows('hz',hz)+'</div><div class="acts"><button type="button" data-rcreset="hz">Reset year-by-year plan to default</button></div>':'<p class="mu">Complete a retirement plan to arrange the columns of its year-by-year table.</p>');
return h+'</div>'};
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-rcmv]');if(!b||b.disabled)return;
var s0=b.dataset.rcmv,i=s0.indexOf(':'),j=s0.lastIndexOf(':'),v=s0.slice(0,i),g=s0.slice(i+1,j),d=+s0.slice(j+1);
if(v==='sav'||v==='hz'){var cur=v==='sav'?catsBase():(hzTitles()||[]),t=cur[cur.indexOf(g)+d];if(!t)return;O[v]=moveTo(cur.slice(),g,t);persistO()}else move(v,g,d);
render();var all=[].slice.call(document.querySelectorAll('[data-rcmv]')),n=all.filter(function(x){return x.dataset.rcmv===s0&&!x.disabled})[0]||all.filter(function(x){return x.dataset.rcmv===s0.slice(0,j+1)+(-d)})[0];if(n)n.focus()});
window.RCOLS={apply:apply,vis:vis,annualMonthlyIncome:annualMonthlyIncome,cfg:CFG,catOrder:catOrder,hzOrder:hzOrder};
var r1=window.render;window.render=function(){var r=r1.apply(this,arguments);refresh();return r};
var m=document.getElementById('m');
if(m)new MutationObserver(function(){var t=document.querySelector('#rr>table.rt');if(t&&t!==last)refresh()}).observe(m,{childList:true,subtree:true});
})();