(function(){
var IGNORE='.rtg,.nb,.agsel,.vpg,.vsub,.vflt,.vr-i,.vr-tdy,.vr-aph,#fzs,#rp-max,#rp-pdf,#ap-mob-host,.kv';
function allNodesMatch(list,sel){if(!list||!list.length)return true;for(var j=0;j<list.length;j++){var n=list[j];if(!n||n.nodeType!==1||!n.matches||!n.matches(sel))return false}return true}
function shouldRun(recs){
 if(!recs||!recs.length)return true;
 for(var i=0;i<recs.length;i++){
  var r=recs[i],t=r.target&&r.target.nodeType===3?r.target.parentElement:r.target;
  if(t&&t.closest&&t.closest(IGNORE))continue;
  if(r.type==='childList'&&((r.addedNodes&&r.addedNodes.length)||(r.removedNodes&&r.removedNodes.length))&&allNodesMatch(r.addedNodes,IGNORE)&&allNodesMatch(r.removedNodes,IGNORE))continue;
  return true;
 }
 return false;
}
var lastTbl=null,lastRc=null,lastKey='';
function findChild(root,tag,cls){
 if(!root)return null;
 var ch=root.children;
 if(ch&&ch.length){for(var i=0;i<ch.length;i++){var el=ch[i];if((!tag||el.tagName===tag)&&el.classList&&el.classList.contains(cls))return el}}
 return null;
}
function clearAgselIn(tbl,rcEl){
 if(tbl&&tbl.rows){var rs=tbl.rows;for(var i=0;i<rs.length;i++){if(rs[i].classList&&rs[i].classList.contains('agsel')){rs[i].classList.remove('agsel');rs[i].removeAttribute('aria-current')}}}
 if(rcEl&&rcEl.children){var cs=rcEl.children;for(var j=0;j<cs.length;j++){if(cs[j].classList&&cs[j].classList.contains('agsel')){cs[j].classList.remove('agsel');cs[j].removeAttribute('aria-current')}}}
}
const obs=new MutationObserver(function(recs){if(!window.__vrStashingRr&&shouldRun(recs))mark(false)});
function mark(scroll){obs.disconnect();try{const m=document.getElementById('m');if(!m||UI.tab!=='Reports')return;
const rr=document.getElementById('rr');
const tbl=rr?(findChild(rr,'TABLE','rt')||rr.querySelector('table.rt')):null;
const rcEl=rr?(findChild(rr,'DIV','rc')||rr.querySelector('.rc')):null;
const a=UI.age==null?48:UI.age,curKey=(UI.rv||'')+'|'+a;
const tblReady=!tbl||(tbl.dataset.rtgDone==='1'&&tbl.dataset.agselKey===curKey);
const rcReady=!rcEl||(rcEl.dataset.rtgDone==='1'&&rcEl.dataset.agselKey===curKey);
if(!scroll&&tblReady&&rcReady){lastTbl=tbl;lastRc=rcEl;lastKey=curKey;return}
lastTbl=tbl;lastRc=rcEl;lastKey=curKey;
if(tbl||rcEl)clearAgselIn(tbl,rcEl);
else m.querySelectorAll('.agsel').forEach(function(e){e.classList.remove('agsel');e.removeAttribute('aria-current')});
/* one Retired tag per retirement row, in the period cell (As on / Month / Financial year), found by its column key so it never depends on which columns are showing */
if(rr){
 if(tbl&&!tbl.dataset.rtgDone){
  tbl.dataset.rtgDone='1';
  var r0=tbl.rows&&tbl.rows[0],ci=-1;
  if(r0){var hc=r0.cells;for(var i=0;i<hc.length;i++){var b=hc[i].querySelector('button[data-rk]');if(b&&b.dataset.rk==='year'){ci=i;break}}}
  if(ci>=0){
   var rows0=tbl.rows;
   for(var ri=1;ri<rows0.length;ri++){
    var tr=rows0[ri];
    if(tr.classList&&tr.classList.contains('a')&&!tr.classList.contains('t')){
     var c=tr.cells[ci];
     if(c&&!c.querySelector('.rtg'))c.insertAdjacentHTML('beforeend','<span class="rtg">Retired</span>');
    }
   }
  }
 }
 if(rcEl&&!rcEl.dataset.rtgDone){
  rcEl.dataset.rtgDone='1';
  var cards0=rcEl.children;
  for(var ci0=0;ci0<cards0.length;ci0++){
   var d=cards0[ci0];
   if(d.tagName==='DETAILS'&&d.classList&&d.classList.contains('a')){
    var sb=d.querySelector('summary b');
    if(sb&&!sb.querySelector('.rtg'))sb.insertAdjacentHTML('beforeend','<span class="rtg">Retired</span>');
   }
  }
 }
}
const rows=(window.vrReportCalc?window.vrReportCalc():calc(S)).rows,j=rows.findIndex(function(r){return r.age[0]===a});
if(tbl)tbl.dataset.agselKey=curKey;
if(rcEl)rcEl.dataset.agselKey=curKey;
if(j<0)return;
const keySet=Object.create(null);let hasKeys=false;
if(UI.rv==='month'){if(j>=1)for(let k=(j-1)*12+1;k<=j*12;k++){keySet[String(k)]=1;hasKeys=true}}
else if(UI.rv==='int'){if(j>=1){keySet[String(j)]=1;hasKeys=true}}
else{keySet[String(j+1)]=1;hasKeys=true}
if(!hasKeys||!rr)return;
let firstVisTr=null;
if(tbl&&tbl.rows){
 var trs=tbl.rows;
 for(var ti=1;ti<trs.length;ti++){
  var rowEl=trs[ti],dr=rowEl.dataset&&rowEl.dataset.r;
  if(dr&&keySet[dr]){
   rowEl.classList.add('agsel');rowEl.setAttribute('aria-current','true');
   if(!firstVisTr&&rowEl.offsetParent)firstVisTr=rowEl;
  }
 }
}
if(rcEl&&rcEl.children){
 var dts=rcEl.children;
 for(var di=0;di<dts.length;di++){
  var det=dts[di],dr2=det.dataset&&det.dataset.r;
  if(dr2&&keySet[dr2]){det.classList.add('agsel');det.setAttribute('aria-current','true')}
 }
}
if(scroll&&firstVisTr&&rr.scrollHeight>rr.clientHeight){rr.scrollTop+=firstVisTr.getBoundingClientRect().top-rr.getBoundingClientRect().top-96}
}finally{if(obs.takeRecords)obs.takeRecords();const m=document.getElementById('m');if(m)obs.observe(m,{childList:true,subtree:true})}}
window.vrMarkRetired=mark;
document.addEventListener('input',function(e){if(e.target.id==='agr')mark(true)});
const r1=window.render;window.render=function(){const r=r1.apply(this,arguments);mark(false);return r};
mark(false);
})();