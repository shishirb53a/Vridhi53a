(function(){
var PGS='auto';try{PGS=localStorage.getItem('fwt2-pgs')||'auto'}catch(e){}var PGO=[['auto','Auto'],['10','10'],['25','25'],['50','50'],['100','100'],['all','All']];
var FIT={pg:{},sp:'family',hg:null,fo:false},M=document.getElementById('m'),busy=false,raf=0,lastUi=[],lastVh=[];
function tab(){var b=document.querySelector('nav button[aria-current=page]'),t=b?b.textContent.trim():'';return t==='Settings'&&typeof UI!=='undefined'&&SET.includes(UI.tab)?UI.tab:t}   /* Help and Users now sit under the Settings nav item, so report the real page */
function over(){return document.documentElement.scrollHeight-innerHeight}
function hts(e){if(e.tagName==='TR')return e.offsetHeight||0;var c=getComputedStyle(e);return e.getBoundingClientRect().height+(parseFloat(c.marginTop)||0)+(parseFloat(c.marginBottom)||0)}
function escHtml(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function clearTrackedUi(){for(var i=0;i<lastUi.length;i++){var el=lastUi[i];if(el&&el.parentNode)el.parentNode.removeChild(el)}lastUi.length=0}
function clearTrackedVh(){for(var i=0;i<lastVh.length;i++){var el=lastVh[i];if(el&&el.classList)el.classList.remove('vh')}lastVh.length=0}
function setVh(el,hide){if(!el||!el.classList)return;if(hide){if(!el.classList.contains('vh')){el.classList.add('vh');lastVh.push(el)}}else if(el.classList.contains('vh'))el.classList.remove('vh')}
function rmPagerKey(safeKey){for(var i=lastUi.length-1;i>=0;i--){var el=lastUi[i];if(el&&el.classList&&el.classList.contains('vpg')&&el.dataset&&el.dataset.k===safeKey){if(el.parentNode)el.parentNode.removeChild(el);lastUi.splice(i,1)}}}
function pager(key,cont,cur,np,label){var safeKey=String(key||'').replace(/[^a-zA-Z0-9_-]/g,'');rmPagerKey(safeKey);var d=document.createElement('div');d.className='vpg';d.dataset.k=safeKey;
d.innerHTML='<button type="button" data-pg="-1" aria-label="Previous"'+(cur<=0?' disabled':'')+'>&#8249;</button><span>'+escHtml(label||('Page '+(cur+1)+' of '+np))+'</span><button type="button" data-pg="1" aria-label="Next"'+(cur>=np-1?' disabled':'')+'>&#8250;</button>'+(safeKey.indexOf('help')===0?'':'<label class="vps">Rows <select data-pgs aria-label="Rows per page">'+PGO.map(function(o){return'<option value="'+o[0]+'"'+(o[0]===PGS?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select></label>');
cont.insertAdjacentElement('afterend',d);lastUi.push(d)}
function measureHeights(items){
 var n=items.length,H=new Array(n),cardMargin=-1;
 for(var i=0;i<n;i++){
  var e=items[i];
  if(e.tagName==='TR'){H[i]=e.offsetHeight||0;continue}
  if(cardMargin<0){var c=getComputedStyle(e);cardMargin=(parseFloat(c.marginTop)||0)+(parseFloat(c.marginBottom)||0)}
  H[i]=(e.offsetHeight||e.getBoundingClientRect().height)+cardMargin;
 }
 return H;
}
function fitList(key,cont,items){if(!cont||!items.length)return;
if(PGS!=='auto'){var n=PGS==='all'?items.length:+PGS,np=Math.max(1,Math.ceil(items.length/n)),c=Math.min(FIT.pg[key]||0,np-1);FIT.pg[key]=c;for(var pi=0;pi<items.length;pi++)setVh(items[pi],pi<c*n||pi>=(c+1)*n);pager(key,cont,c,np,(PGS==='all'?'':'Page '+(c+1)+' of '+np+' \u00b7 ')+items.length+' items');return}
var o=over();if(o<=0)return;
var H=measureHeights(items),mn=H[0]||1,sum=0;
for(var hi=0;hi<H.length;hi++){if(H[hi]<mn)mn=H[hi];sum+=H[hi]}
var budget=sum-o-50,tries=0,prevEnd=-1,prevLen=-1;
for(;;){budget=Math.max(budget,mn);var pages=[],acc=0,st=0;
for(var i=0;i<H.length;i++){var h=H[i];if(acc+h>budget&&i>st){pages.push([st,i]);st=i;acc=0}acc+=h}
pages.push([st,H.length]);
var cur=Math.min(FIT.pg[key]||0,pages.length-1);FIT.pg[key]=cur;
var pStart=pages[cur][0],pEnd=pages[cur][1];
if(pEnd===prevEnd&&pages.length===prevLen)break;
prevEnd=pEnd;prevLen=pages.length;
for(var j=0;j<items.length;j++)setVh(items[j],j<pStart||j>=pEnd);
pager(key,cont,cur,pages.length,'Page '+(cur+1)+' of '+pages.length+' \u00b7 '+items.length+' items');
var ex=over();if(ex<=0||tries++>4||budget<=mn)break;budget-=ex+2}}
function directTable(c){if(!c)return null;var ch=c.children;if(ch&&ch.length){for(var i=0;i<ch.length;i++){if(ch[i].tagName==='TABLE')return ch[i]}}return c.querySelector('table')}
function directRc(c){if(!c)return null;var ch=c.children;if(ch&&ch.length){for(var i=0;i<ch.length;i++){if(ch[i].classList&&ch[i].classList.contains('rc'))return ch[i]}}return c.querySelector('.rc')}
function rowsOf(c){if(!c)return[];var tb=directTable(c);
if(tb&&tb.offsetParent!==null){
 var rs=tb.rows||tb.querySelectorAll('tr'),out=[];
 for(var i=0;i<rs.length;i++){
  var r=rs[i];
  if(r.classList&&(r.classList.contains('t')||r.classList.contains('vr-skip')))continue;
  var c0=r.cells&&r.cells[0];
  if(c0&&c0.tagName==='TH')continue;
  out.push(r);
 }
 return out;
}
var rc=directRc(c);
if(rc&&rc.offsetParent===null&&!c.querySelector('.hcard'))return[];
if(rc&&rc.children&&rc.children.length){
 var cOut0=[],cs=rc.children;
 for(var ci0=0;ci0<cs.length;ci0++){
  var e0=cs[ci0];
  if(e0.classList&&e0.classList.contains('yc')&&e0.offsetParent!==null)cOut0.push(e0);
 }
 return cOut0;
}
var fam=!!c.closest('#m>.card:not(.hp-card)')&&tab()==='Settings';
var cards=c.querySelectorAll('.hcard,.yc'),cOut=[];
for(var ci=0;ci<cards.length;ci++){
 var e=cards[ci];
 if(e.offsetParent!==null&&(fam||e.classList.contains('yc')||e.querySelector('.kv')))cOut.push(e);
}
return cOut}
function modeOf(c){var tb=directTable(c);return tb&&tb.offsetParent!==null?'t':'c'}
function lst(key,c){fitList(key+modeOf(c),c,rowsOf(c))}
function subbar(before,items,cur,attr){var safeAttr=String(attr||'data-v').replace(/[^a-zA-Z0-9_-]/g,'');var d=document.createElement('div');d.className='vsub';d.setAttribute('role','group');
d.innerHTML=items.map(function(t,i){return'<button type="button" '+safeAttr+'="'+i+'" aria-pressed="'+(i===cur)+'">'+escHtml(t)+'</button>'}).join('');before.parentNode.insertBefore(d,before);lastUi.push(d)}
var SP=[['family','Family'],['general','General'],['columns','Columns'],['look','Look'],['font','Fonts'],['backup','Backup']];
function settingsFit(){var all0=[].slice.call(M.querySelectorAll(':scope>.card')),cards=all0.filter(function(c){return c.id!=='rcset'&&c.id!=='vr-snc'});all0.forEach(function(c){if(c.id==='rcset')c.dataset.fp='columns';else if(c.id==='vr-snc')c.dataset.fp='backup'});
cards.forEach(function(c,ci){var all=c.dataset.fp;if(ci===0)c.dataset.fp='family';else if(ci===1)c.dataset.fp='general';else if(ci===2){c.dataset.fp='look font backup';var n=-1;
[].forEach.call(c.children,function(e){if(e.tagName==='H2')return;if(e.classList.contains('sub2'))n++;
if(e.id==='se'){e.dataset.fp='*';return}
e.dataset.fp=n<=0?'look':n<=2?'font':'backup'})}});
var pane=FIT.sp;M.querySelectorAll('[data-fp]').forEach(function(e){var ps=e.dataset.fp.split(' ');setVh(e,!(ps.indexOf('*')>=0||ps.indexOf(pane)>=0))});
var first=cards[0];if(first)subbar(first,SP.map(function(x){return x[1]}),SP.map(function(x){return x[0]}).indexOf(pane),'data-vsp');
if(pane==='family')lst('fam',M.querySelector('#fr'))}
function helpFit(){var hl=M.querySelector('#hl');if(!hl)return;var cards=[].slice.call(hl.querySelectorAll(':scope>.card'));if(!cards.length)return;
var names=cards.map(function(c){return(c.querySelector('h2')||{}).textContent||''}),qe=document.getElementById('hq'),q=qe&&qe.value.trim();
var g=FIT.hg==null?0:Math.min(FIT.hg,cards.length-1);if(q)g=-1;hl.classList.toggle('vs',g<0);
var items=[];cards.forEach(function(c,i){var on=g<0||i===g;setVh(c,!on);if(on)[].forEach.call(c.querySelectorAll('details.hi'),function(d){items.push(d)})});
subbar(hl,names,g,'data-vhg');
if(!items.length)return;var key='help'+g,cur=Math.min(FIT.pg[key]||0,items.length-1);FIT.pg[key]=cur;
items.forEach(function(d,i){d.open=i===cur;setVh(d,i!==cur);d.querySelectorAll('p,li,div').forEach(function(x){x.style.fontSize='';x.style.lineHeight=''})});
pager(key,hl,cur,items.length,'Topic '+(cur+1)+' of '+items.length);
var cd=items[cur],fs=parseFloat(getComputedStyle(cd.querySelector('p')||cd).fontSize)||13;
for(var z=0;z<10&&over()>0&&fs>10;z++){fs-=.5;cd.querySelectorAll('p,li,div').forEach(function(x){x.style.fontSize=fs+'px';x.style.lineHeight='1.32'})}}
function reportsFit(){
if(typeof innerWidth==='number'&&innerWidth<=768&&(document.getElementById('ap-mob-host')||M.querySelector('.ap-wrap')))return;
var rr=document.getElementById('rr'),card=rr&&rr.closest('.card');
if(card){card.classList.toggle('vf-open',FIT.fo);var h=card.querySelector('.rph2');
if(h&&innerWidth<=720){var b=document.createElement('button');b.type='button';b.className='vflt';b.dataset.vflt='1';b.textContent=FIT.fo?'Hide filters':'Filters';h.insertBefore(b,h.lastElementChild);lastUi.push(b)}}
lst('rep',rr)}
function run(){busy=true;try{var t=tab();if(document.documentElement.dataset.vt!==t)document.documentElement.dataset.vt=t;
clearTrackedUi();clearTrackedVh();
if(t!=='Holdings'&&t!=='Reports'&&t!=='Users'&&t!=='Settings'&&t!=='Help')return;
if(t==='Holdings')lst('hold',document.getElementById('hr')||M.querySelector('#hr'));
else if(t==='Reports')reportsFit();
else if(t==='Users'){var u=M.querySelector('.ut');if(u){var tw=u.querySelector('.tw');fitList('usr',tw,[].slice.call(u.querySelectorAll('tbody tr')))}}
else if(t==='Settings')settingsFit();
else if(t==='Help')helpFit()}finally{obs.takeRecords();busy=false}}
function allNodesMatch(list,sel){if(!list||!list.length)return true;for(var j=0;j<list.length;j++){var n=list[j];if(!n||n.nodeType!==1||!n.matches||!n.matches(sel))return false}return true}
function isNoise(recs){if(!Array.isArray(recs)||!recs.length)return false;
var IGN='.vpg,.vsub,.vflt,.nb,.rtg,.vr-i,.vr-tdy,#rp-max,#rp-pdf,#ap-mob-host,.vr-aph,#fzs,.msd-p,.kv';
for(var i=0;i<recs.length;i++){var r=recs[i],t=r.target&&r.target.nodeType===3?r.target.parentElement:r.target;
if(t&&t.closest&&t.closest(IGN))continue;
if(r.type==='childList'&&((r.addedNodes&&r.addedNodes.length)||(r.removedNodes&&r.removedNodes.length))&&allNodesMatch(r.addedNodes,IGN)&&allNodesMatch(r.removedNodes,IGN))continue;
return false}return true}
function sched(recs){if(busy||window.__vrStashingRr||isNoise(recs))return;cancelAnimationFrame(raf);raf=requestAnimationFrame(run)}
var obs=new MutationObserver(sched);obs.observe(M,{childList:true,subtree:true});
addEventListener('resize',function(){sched()});
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('.vpg button,.vsub button,.vflt');if(!t)return;
var k=t.closest('.vpg');if(k){FIT.pg[k.dataset.k]=(FIT.pg[k.dataset.k]||0)+(+t.dataset.pg);e.stopPropagation();run();return}
if(t.dataset.vsp!=null){FIT.sp=SP[+t.dataset.vsp][0];e.stopPropagation();run();return}
if(t.dataset.vhg!=null){FIT.hg=+t.dataset.vhg;e.stopPropagation();run();return}
if(t.dataset.vflt){FIT.fo=!FIT.fo;e.stopPropagation();run()}},true);
document.addEventListener('input',function(e){if(e.target&&(e.target.id==='q'||e.target.id==='rq'||e.target.id==='fq'||e.target.id==='hq')){var k=e.target.id;Object.keys(FIT.pg).forEach(function(x){FIT.pg[x]=0})}},true);
document.addEventListener('change',function(e){var t=e.target;if(t&&t.dataset&&t.dataset.pgs!=null){PGS=t.value;try{localStorage.setItem('fwt2-pgs',PGS)}catch(x){}FIT.pg={};run()}},true);
run()})();