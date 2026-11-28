/* Reports: multi-select dropdowns for asset class and holding */
(function(){
UI.msd=null;
const ids=function(){const A=S.assets,out=new Array(A.length);for(let i=0;i<A.length;i++)out[i]=String(A[i].id);return out};
const selIds=function(){const c=repSel();return c.all?ids():(UI.rsel||[]).map(String)};
const selMapOf=function(arr){const m=Object.create(null);for(let i=0;i<arr.length;i++)m[String(arr[i])]=1;return m};
const setSel=function(a){
  const A=S.assets,n=A.length,want=selMapOf(a),kept=[],catSeen=Object.create(null),rcl=[];
  for(let i=0;i<n;i++){
    const id=String(A[i].id);
    if(want[id]){kept.push(id);const c=A[i].cat;if(!catSeen[c]){catSeen[c]=1;rcl.push(c)}}
  }
  UI.rsel=kept.length===n?null:kept;
  UI.rcl=rcl;
};
const computeDropStats=function(){
  const A=S.assets,n=A.length,sel=selIds(),sMap=selMapOf(sel);
  const catTot=Object.create(null),catOn=Object.create(null);
  let selCount=0,firstSelName='';
  for(let i=0;i<n;i++){
    const x=A[i],c=x.cat,id=String(x.id);
    catTot[c]=(catTot[c]||0)+1;
    if(sMap[id]){catOn[c]=(catOn[c]||0)+1;selCount++;if(selCount===1)firstSelName=x.name}
  }
  const cs=[],con=[];
  for(let i=0;i<CATS.length;i++){
    const c=CATS[i];
    if(catTot[c]>0){cs.push(c);if(catOn[c]===catTot[c])con.push(c)}
  }
  return{A:A,n:n,sMap:sMap,catTot:catTot,catOn:catOn,cs:cs,con:con,selCount:selCount,firstSelName:firstSelName};
};
const chev='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
window.rsDrops=function(){
  const st=computeDropStats(),A=st.A;if(!st.n)return'';
  const dd=function(k,title,val,body){const o=UI.msd===k;return'<div class="msd" data-msd="'+k+'"><span class="msd-t">'+title+'</span><button type="button" class="msd-b" data-msdb="'+k+'" aria-haspopup="true" aria-expanded="'+o+'"><b>'+val+'</b>'+chev+'</button><div class="msd-p"'+(o?'':' hidden')+' role="group" aria-label="'+title+'"><div class="msd-a"><button type="button" data-msda="'+k+':all">Select all</button><button type="button" data-msda="'+k+':none">Clear</button></div><div class="msd-l">'+body+'</div></div></div>'};
  const cbParts=new Array(st.cs.length);
  for(let i=0;i<st.cs.length;i++){
    const c=st.cs[i],on=st.catOn[c]===st.catTot[c];
    cbParts[i]='<label class="msd-i"><input type="checkbox" data-rcls="'+esc(c)+'"'+(on?' checked':'')+'><i style="background:'+(CC[c]||'var(--mu)')+'"></i><span>'+esc(c)+'</span><em>'+st.catTot[c]+'</em></label>';
  }
  const hbParts=new Array(st.n);
  for(let i=0;i<st.n;i++){
    const x=A[i],id=String(x.id);
    hbParts[i]='<label class="msd-i"><input type="checkbox" data-rh="'+esc(id)+'"'+(st.sMap[id]?' checked':'')+'><i style="background:'+(CC[x.cat]||'var(--mu)')+'"></i><span>'+escn(x.name)+'</span><em>'+esc(x.cat)+'</em></label>';
  }
  const clsVal=st.con.length===st.cs.length?'All asset classes':st.con.length===0?'None selected':st.con.length===1?esc(st.con[0]):st.con.length+' of '+st.cs.length+' selected';
  const holdVal=st.selCount===st.n?'All holdings':st.selCount===0?'None selected':st.selCount===1?escn(st.firstSelName):st.selCount+' of '+st.n+' selected';
  return'<div class="msds">'+dd('cls','Asset class',clsVal,cbParts.join(''))+dd('hold','Holding',holdVal,hbParts.join(''))+dd('cols','Columns','All columns','')+'</div>';
};
const sync=function(){document.querySelectorAll('.msd').forEach(function(d){const o=UI.msd===d.dataset.msd,p=d.querySelector('.msd-p'),b=d.querySelector('.msd-b');if(p)p.hidden=!o;if(b)b.setAttribute('aria-expanded',String(o))})};
/* Paint checkbox ticks and dropdown summary text synchronously (<0.2ms) before heavy report work runs */
const syncDropdownLabelsFast=function(){
  if(typeof document==='undefined'||typeof document.querySelector!=='function')return;
  const clsDd=document.querySelector('.msd[data-msd="cls"]'),holdDd=document.querySelector('.msd[data-msd="hold"]');
  if(!clsDd&&!holdDd)return;
  const st=computeDropStats();if(!st.n)return;
  if(clsDd){
    const b=clsDd.querySelector('.msd-b b');
    const lbl=st.con.length===st.cs.length?'All asset classes':st.con.length===0?'None selected':st.con.length===1?st.con[0]:st.con.length+' of '+st.cs.length+' selected';
    if(b&&b.textContent!==lbl)b.textContent=lbl;
    const cbs=clsDd.querySelectorAll('input[data-rcls]');
    for(let i=0;i<cbs.length;i++){const c=cbs[i].dataset.rcls,on=st.catOn[c]===st.catTot[c];if(cbs[i].checked!==on)cbs[i].checked=on}
  }
  if(holdDd){
    const b=holdDd.querySelector('.msd-b b');
    const lbl=st.selCount===st.n?'All holdings':st.selCount===0?'None selected':st.selCount===1?(st.firstSelName||''):st.selCount+' of '+st.n+' selected';
    if(b&&b.textContent!==lbl)b.textContent=lbl;
    const cbs=holdDd.querySelectorAll('input[data-rh]');
    for(let i=0;i<cbs.length;i++){const on=!!st.sMap[cbs[i].dataset.rh];if(cbs[i].checked!==on)cbs[i].checked=on}
  }
};
let pendingRaf=0,pendingAttr='',pendingVal='';
const cancelPendingFilter=function(){
  if(pendingRaf){
    if(typeof cancelAnimationFrame==='function')cancelAnimationFrame(pendingRaf);
    pendingRaf=0;
  }
};
const applyFilterUpdate=function(attr,val){
  if(typeof window.vrUpdateAnnualFilters==='function'&&window.vrUpdateAnnualFilters(attr,val))return;
  if(typeof window.vrUpdateReportFilters==='function'&&window.vrUpdateReportFilters(attr,val))return;
  render();
  if(attr&&typeof document!=='undefined'&&typeof document.querySelectorAll==='function'){
    const n=Array.prototype.filter.call(document.querySelectorAll('['+attr+']'),function(x){return x.getAttribute(attr)===val})[0];
    if(n&&typeof n.focus==='function')n.focus();
  }
};
const flushFilterUpdate=function(){
  if(!pendingRaf)return;
  cancelPendingFilter();
  const a=pendingAttr,v=pendingVal;
  pendingAttr='';pendingVal='';
  applyFilterUpdate(a,v);
};
const scheduleFilterUpdate=function(attr,val){
  syncDropdownLabelsFast();
  pendingAttr=attr;pendingVal=val;
  if(typeof requestAnimationFrame!=='function'){
    pendingAttr='';pendingVal='';
    applyFilterUpdate(attr,val);
    return;
  }
  if(pendingRaf)cancelAnimationFrame(pendingRaf);
  pendingRaf=requestAnimationFrame(function(){
    pendingRaf=0;
    const a=pendingAttr,v=pendingVal;
    pendingAttr='';pendingVal='';
    applyFilterUpdate(a,v);
  });
};
window.vrFlushFilterUpdate=flushFilterUpdate;
document.addEventListener('click',function(e){const t=e.target;if(!t||!t.closest)return;
const b=t.closest('[data-msdb]');if(b){const k=b.dataset.msdb;UI.msd=UI.msd===k?null:k;sync();return}
const a=t.closest('[data-msda]');if(a){const p=a.dataset.msda.split(':');if(p[0]==='cols'){window.__colsAct(p[1]);return}if(p[1]==='all'){UI.rsel=null;UI.rcl=null}else setSel([]);UI.msd=p[0];scheduleFilterUpdate('data-msda',a.dataset.msda);return}
if(UI.msd&&!t.closest('.msd')){UI.msd=null;sync()}});
document.addEventListener('change',function(e){const t=e.target;if(!t||!t.dataset)return;
if(t.dataset.rcls!=null){
  const c=t.dataset.rcls,A=S.assets,curMap=selMapOf(selIds()),next=[];
  for(let i=0;i<A.length;i++){
    const id=String(A[i].id);
    if(A[i].cat===c){if(t.checked)next.push(id)}
    else if(curMap[id])next.push(id);
  }
  setSel(next);scheduleFilterUpdate('data-rcls',c);
}else if(t.dataset.rh!=null){
  const idTarget=String(t.dataset.rh),A=S.assets,curMap=selMapOf(selIds()),next=[];
  if(t.checked)curMap[idTarget]=1;else delete curMap[idTarget];
  for(let i=0;i<A.length;i++){const id=String(A[i].id);if(curMap[id])next.push(id)}
  setSel(next);scheduleFilterUpdate('data-rh',idTarget);
}});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&UI.msd){UI.msd=null;sync()}});
const r0=window.render;window.render=function(){cancelPendingFilter();if(UI.tab!=='Reports')UI.msd=null;return r0.apply(this,arguments)};
})();