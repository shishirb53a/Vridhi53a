(function(){
function isMaximizedReport(){
  if(typeof document==='undefined'||!document.getElementById)return false;
  var m=document.getElementById('m');
  return !!(m&&m.classList&&m.classList.contains('vr-rmax'));
}
window.repSel=function(){const A=S.assets,n=A.length,ids=UI.rsel;
if(!ids){const all=new Array(n);for(let i=0;i<n;i++)all[i]=i;return{all:true,min:false,none:false,idx:all}}
const map=Object.create(null);for(let i=0;i<ids.length;i++)map[String(ids[i])]=1;
const idx=[];for(let i=0;i<n;i++){if(map[String(A[i].id)])idx.push(i)}
if(idx.length===n)return{all:true,min:false,none:false,idx:idx};
if(!idx.length)return{all:false,min:false,none:true,idx:[]};
return{all:false,min:true,none:false,idx:idx}};
window.repNone=function(){return'<div class="em">Please select at least one investment.</div>'};
window.rsPanel=function(){const A=S.assets,n=A.length,SEL=repSel();
const selSet=Object.create(null);for(let i=0;i<SEL.idx.length;i++)selSet[SEL.idx[i]]=1;
const catTot=Object.create(null),catOn=Object.create(null);
for(let i=0;i<n;i++){const c=A[i].cat;catTot[c]=(catTot[c]||0)+1;if(selSet[i])catOn[c]=(catOn[c]||0)+1}
const msg=SEL.all?'All investments shown. Pick one or more to see only those.':SEL.none?'No investment selected.':SEL.idx.length+' of '+n+' selected, showing only their values.';
const cbParts=[];
for(let i=0;i<CATS.length;i++){const c=CATS[i];if(catTot[c]>0){const on=catOn[c]===catTot[c];cbParts.push('<button type="button" class="lgb" data-rcat="'+esc(c)+'" aria-pressed="'+on+'"><b>'+esc(c)+'</b><span class="mu">'+catTot[c]+'</span></button>')}}
const hbParts=new Array(n);
for(let i=0;i<n;i++){const x=A[i],on=!!selSet[i];hbParts[i]='<button type="button" class="lgb" data-rsel="'+esc(String(x.id))+'" aria-pressed="'+on+'" title="'+escn(x.name)+' · '+(x.ret*100).toFixed(2)+'%'+(x.type||!(x.add>0)?'':' · '+f(x.add)+' / year')+'"><i style="background:'+COL[i%10]+'"></i><b>'+escn(x.name)+'</b><span class="mu">'+(x.ret*100).toFixed(2)+'%</span></button>'}
return'<div class="rsel" role="group" aria-label="Choose which investments to show"><div class="rsh"><b class="rpft">Filter Asset Classes</b><span class="sr-only">'+msg+'</span><span class="rsa"><button type="button" data-rsel="all">Select All</button><button type="button" data-rsel="none">Clear</button></span></div>'
+'<div class="lg">'+cbParts.join('')+'</div><div class="rsh" style="margin:12px 0 8px"><b class="rpft">Filter Holdings</b></div>'
+'<div class="lg">'+hbParts.join('')+'</div></div>'};
window.selDI=function(r,mon,idx,rows){const A=S.assets;let dep=0;
if(mon){for(let k=0;k<idx.length;k++){const i=idx[k];dep+=(r.ad?r.ad[i]:0)}let c=0,any=false;for(let k=0;k<idx.length;k++){const i=idx[k];if(r.v[i]!=null&&r.pv&&r.pv[i]!=null){c+=r.v[i]-r.pv[i];any=true}}return[dep,any?c-dep:null]}
if(r.a>1){
  const D0=window.__vrReportCalcCache&&window.__vrReportCalcCache.state===S?window.__vrReportCalcCache.value:null;
  const mt=D0&&D0._meta;
  if(mt&&mt.len===A.length&&r.a<=mt.N&&mt.fyAdd[r.a]){
    const fa=mt.fyAdd[r.a];
    for(let k=0;k<idx.length;k++)dep+=fa[idx[k]]||0;
  }else{
    for(let k=0;k<idx.length;k++){const x=A[idx[k]];if(!x||x.type==='gratuity')continue;const fv=fyInfo(x,S,r.a);if(fv.act)dep+=(fv.yp?x.add:0)+(x.madd||0)*fv.n}
  }
}
if(r.a<=1)return[dep,null];
const prev=rows[r.a-2];if(!prev)return[dep,null];
let t1=0,any1=false,t0=0,any0=false;
for(let k=0;k<idx.length;k++){const i=idx[k],v1=r.v[i],v0=prev.v[i];if(v1!=null){any1=true;t1+=v1}if(v0!=null){any0=true;t0+=v0}}
return[dep,any1&&any0?t1-t0-dep:null]};
window.repMin=function(rows,o,mode){const A=S.assets,idx=repSel().idx,nIdx=idx.length,q=UI.rq.trim().toLowerCase(),multi=nIdx>0,YR=!!o.yr,Ms=S.members,kids=Ms.map(function(m,i){return m.role==='Child'?i:-1}).filter(function(i){return i>=0}),N=rows.length;
const D0=YR&&(window.__vrReportCalcCache&&window.__vrReportCalcCache.state===S?window.__vrReportCalcCache.value:(window.vrReportCalc?window.vrReportCalc():null));
const mt=D0&&D0._meta&&D0._meta.len===A.length&&D0._meta.N===N?D0._meta:null;
const pc=function(x){return x==null?'—':(x*100).toFixed(2)+'%'};
/* Single-pass precomputed row metrics cache keyed by row index r.a */
const rowCache=new Array(N+2);
function getRowM(r){
  let m=rowCache[r.a];if(m)return m;
  let any=false,tot=0,retSum=0;
  for(let k=0;k<nIdx;k++){const i=idx[k],v=r.v[i];if(v!=null){any=true;tot+=v;retSum+=v*A[i].ret}}
  const stV=any?tot:null,rateV=stV>0?retSum/stV:null;
  let chgV=null,depDi=0,intV=null;
  if(YR){
    if(r.a>1){
      const prev=rows[r.a-2];
      let pAny=false,pTot=0;
      if(prev){for(let k=0;k<nIdx;k++){const v0=prev.v[idx[k]];if(v0!=null){pAny=true;pTot+=v0}}}
      const prevSt=pAny?pTot:null;
      chgV=stV-prevSt;
      if(mt&&mt.fyAdd[r.a]){
        const fa=mt.fyAdd[r.a];
        for(let k=0;k<nIdx;k++)depDi+=fa[idx[k]]||0;
      }else{
        for(let k=0;k<nIdx;k++){const x=A[idx[k]];if(!x||x.type==='gratuity')continue;const fv=fyInfo(x,S,r.a);if(fv.act)depDi+=(fv.yp?x.add:0)+(x.madd||0)*fv.n}
      }
      intV=(stV!=null&&prevSt!=null)?(stV-prevSt-depDi):null;
    }
  }else{
    const di=window.selDI(r,true,idx,rows);
    depDi=di[0];intV=di[1];
  }
  let addV=0;
  if(YR){
    if(r.a>=2){
      if(mt&&mt.depShowRow[r.a]){
        const dr=mt.depShowRow[r.a];
        for(let k=0;k<nIdx;k++)addV+=dr[idx[k]]||0;
      }else addV=depShow(r.a,idx,N);
    }
  }else addV=depDi;
  const am=allMat(idx,r,!YR);
  const yInStr=intV==null?'—':(am?'-':rf(intV));
  const miVal=YR?RCOLS.annualMonthlyIncome(intV,r.pay,am):null;
  const mInStr=YR?(miVal==null?(intV==null?'—':'-'):rf(miVal)):'';
  m={r:r,st:stV,rate:rateV,chg:chgV,add:addV,intV:intV,am:am,yIn:yInStr,mIn:mInStr,lab:o.lab(r)};
  rowCache[r.a]=m;
  return m;
}
const ok=['a','year'].concat(YR?['age'].concat(kids.map(function(k){return's'+k})):[],idx.map(function(i){return'v'+i}),(multi?['tot','roi','add','int'].concat(YR?['chg','hi']:[]):[]).concat(YR?['int','mi']:[]));const rk=ok.indexOf(UI.rk)>-1?UI.rk:'a';
const key=function(r){if(rk==='a'||rk==='year'||rk[0]==='s')return r.a;if(rk==='age')return r.age[0];if(rk[0]==='v')return r.v[+rk.slice(1)];const m=getRowM(r);return rk==='tot'||rk==='hi'?m.st:rk==='roi'?(m.rate==null?-1:m.rate):rk==='chg'?m.chg:rk==='add'?m.add:(rk==='int'||rk==='mi')?(m.intV==null?-1e18:m.intV):r.a};
const L=q?rows.filter(function(r){const m=getRowM(r);return[r.a,m.lab].concat(idx.map(function(i){return f(r.v[i])}),multi?[f(m.st),pc(m.rate)]:[],YR?[r.age.join(' '),r.st.join(' ')]:[]).join(' ').toLowerCase().indexOf(q)>-1}):rows.slice();
if(rk!=='a'||UI.rd<0)L.sort(function(x,y){const a=key(x),b=key(y);return(a>b?1:a<b?-1:0)*UI.rd});
if(!L.length)return'<div class="em">No '+o.noun+' match your search.</div>';
const th=function(k,t){return'<th class="'+(k!=='year'&&k!=='hi'&&k[0]!=='s'?'rt-num':'')+'" aria-sort="'+(rk===k?(UI.rd>0?'ascending':'descending'):'none')+'"><button data-rk="'+k+'">'+t+(rk===k?(UI.rd>0?' ▲':' ▼'):'')+'</button></th>'};
const hasPol=YR&&VRPolicy.hasPayouts('goal');
const isMax=isMaximizedReport();
const isDesk=typeof window!=='undefined'&&typeof window.innerWidth==='number'&&window.innerWidth>1040;
const skipRc=mode==='table'?true:mode==='rc'?false:(!!window.__apSkipRc||isMax||isDesk);
const skipTbl=mode==='rc'?true:mode==='table'?false:(!YR&&!isMax&&typeof window!=='undefined'&&typeof window.innerWidth==='number'&&window.innerWidth<=1040);
let cellCache=null;
if(YR&&D0){
  let rc0=D0._repCache;
  if(!rc0){rc0={cellInner:new Array(N+1),vAll:new Array(N+1),hay:new Array(N+1),hin:new Array(N+1),roiT:new Array(N+1)};Object.defineProperty(D0,'_repCache',{value:rc0,enumerable:false,configurable:true})}
  cellCache=rc0.cellInner;
}
const escA=new Array(A.length);
for(let k=0;k<nIdx;k++){const i=idx[k];escA[i]=escn(A[i].name)}
const nL=L.length;
const trParts=skipTbl?null:new Array(nL);
const rcParts=skipRc?null:new Array(nL);
const lazyKvMap=skipRc?null:Object.create(null);
for(let li=0;li<nL;li++){
  const r=L[li],m=getRowM(r),cls=(o.hl(r)?'a':'')+(UI.sel===r.a?' sel':'');
  const stRf=multi?rf(m.st):'';
  const ratePc=multi?pc(m.rate):'';
  const addRf=multi?rf(m.add):'';
  const polT=hasPol?polTiTxt(m.intV,m.am,r.pay):'';
  if(!skipTbl){
    let kCells='';
    if(YR){for(let ki=0;ki<kids.length;ki++)kCells+='<td class="l">'+sh(r.st[kids[ki]])+'</td>'}
    let vCells='';
    if(cellCache){
      let ciArr=cellCache[r.a];
      if(!ciArr){ciArr=new Array(A.length);cellCache[r.a]=ciArr}
      for(let k=0;k<nIdx;k++){
        const ix=idx[k];
        let ci=ciArr[ix];
        if(ci===undefined){const val=r.v[ix];ci='title="'+rf(val)+'">'+lk(val)+'</td>';ciArr[ix]=ci}
        vCells+='<td class="rt-num" '+ci;
      }
    }else{
      for(let k=0;k<nIdx;k++){const val=r.v[idx[k]];vCells+='<td class="rt-num" title="'+rf(val)+'">'+lk(val)+'</td>'}
    }
    trParts[li]='<tr data-r="'+r.a+'" class="'+cls+'" tabindex="0" aria-selected="'+(UI.sel===r.a)+'"><td class="rt-num">'+r.a+'</td><td class="nw">'+m.lab+'</td>'+(YR?'<td class="nw rt-num">'+r.age.join(' / ')+'</td>'+kCells:'')+vCells+(YR?'<td class="nw">'+m.yIn+'</td><td class="nw">'+m.mIn+'</td>'+(hasPol?'<td class="nw">'+(r.pay>0?rf(r.pay):'—')+'</td><td class="nw"><b>'+polT+'</b></td>':''):'')+(multi?(YR?'<td class="nw" title="'+stRf+'"><b>'+stRf+'</b></td>':'<td title="'+stRf+'"><b>'+lk(m.st)+'</b></td>')+'<td><b>'+(m.am?'-':ratePc)+'</b></td><td class="nw">'+addRf+'</td>'+(YR?'':'<td class="nw">'+m.yIn+'</td>')+(YR?'<td>'+(r.a>1?lk(m.chg):'—')+'</td><td class="l">'+hin(m.st)+'</td>':''):'')+'</tr>';
  }
  if(!skipRc){
    lazyKvMap[r.a]=function(){
      let kvAssets='';
      for(let k=0;k<nIdx;k++){const i=idx[k];kvAssets+='<span>'+escA[i]+'</span><b>'+rf(r.v[i])+'</b>'}
      return kvAssets+(YR?'<span>Yearly income</span><b>'+m.yIn+'</b><span>Monthly income</span><b>'+m.mIn+'</b>'+(hasPol?'<span>Policy payouts</span><b>'+(r.pay>0?rf(r.pay):'—')+'</b><span>Total income</span><b>'+polT+'</b>':''):'')+(multi?'<span>'+(YR?'Year end balance':'Month end balance')+'</span><b>'+stRf+'</b><span>Blended ROI</span><b>'+ratePc+'</b><span>Amount deposited</span><b>'+addRf+'</b>'+(YR?'':'<span>Interest earned</span><b>'+m.yIn+'</b>')+(YR?'<span>Yearly change</span><b>'+(r.a>1?rf(m.chg):'—')+'</b>':''):'');
    };
    rcParts[li]='<details class="yc '+cls+'" data-r="'+r.a+'"><summary><b>'+m.lab+'</b><br>'+(multi?'<span class="mu">'+(YR?'Year end balance':'Month end balance')+'</span> <b>'+stRf+'</b> · <span class="mu">ROI</span> <b>'+ratePc+'</b>':'<span class="mu">'+escA[idx[0]]+'</span> <b>'+rf(r.v[idx[0]])+'</b>')+'</summary><div class="kv" data-lazy-kv="min"></div></details>';
  }
}
if(!skipRc)window.__vrMinLazyKv={view:YR?'year':'month',map:lazyKvMap};
const tbl=skipTbl?'':'<table class="rt rs"><tr>'+th('a','S.No')+th('year',o.label)+(YR?th('age','Ages<br><span class="rt-sub">'+Ms.map(function(m){return escn(m.name)}).join(' / ')+'</span>')+kids.map(function(k){return th('s'+k,escn(Ms[k].name)+'<br>stage')}).join(''):'')+idx.map(function(i){return th('v'+i,escA[i])}).join('')+(YR?th('int','Yearly<br>income (₹)')+th('mi','Monthly<br>income (₹)')+(hasPol?th('pay','Policy<br>payouts (₹)')+th('ti','Total<br>income (₹)'):''):'')+(multi?th('tot',YR?'Year end<br>balance (₹)':'Month end<br>balance (₹)')+th('roi','Blended<br>ROI')+th('add','Amount<br>Deposited (₹)')+(YR?'':th('int','Interest<br>Earned (₹)'))+(YR?th('chg','Change')+th('hi','Total (हिन्दी)'):''):'')+'</tr>\n'+trParts.join('')+'</table>';
if(skipRc)return tbl;
return tbl+(tbl?'\n':'')+'<div class="rc">'+rcParts.join('')+'</div>'};
window.repSelCSV=function(){const yl=function(r){return'1 Apr '+r.year};const q=function(v){return'"'+String(v).replace(/"/g,'""')+'"'},mon=UI.rv==='month',A=S.assets,idx=repSel().idx,multi=idx.length>0,D0=mon?monthData():(window.vrReportCalc?window.vrReportCalc():calc(S)),rows=D0.rows,hasPol=!mon&&VRPolicy.hasPayouts('goal');
const st=function(r){var any=false,t=0;for(let k=0;k<idx.length;k++){const v=r.v[idx[k]];if(v!=null){any=true;t+=v}}return any?t:null};
const rate=function(r,t){if(!(t>0))return'';let rs=0;for(let k=0;k<idx.length;k++)rs+=r.v[idx[k]]*A[idx[k]].ret;return(rs/t*100).toFixed(2)};
return[['S.No',mon?'Month':'As on'].concat(idx.map(function(i){return A[i].name}),(multi?[mon?'Month end balance':'Year end balance','Blended ROI %','Amount deposited','Interest earned'].concat(mon?[]:['Monthly income']):(mon?[]:['Yearly income','Monthly income']),hasPol?['Policy payouts','Total income']:[])).map(q).join(',')].concat(rows.map(function(r){const di=window.selDI(r,mon,idx,rows),si=di[1],mi=mon?null:RCOLS.annualMonthlyIncome(si,r.pay,allMat(idx,r,false)),stV=st(r),base=[r.a,mon?q(r.label):q(yl(r))].concat(idx.map(function(i){return r.v[i]==null?'—':Math.round(r.v[i])}),multi?[stV==null?'—':Math.round(stV),stV==null?'—':rate(r,stV),Math.round(mon?di[0]:depShow(r.a,idx,rows.length)),si==null?'—':Math.round(si)].concat(mon?[]:[mi==null?(si==null?'—':'-'):Math.round(mi)]):(mon?[]:[si==null?'—':Math.round(si),mi==null?(si==null?'—':'-'):Math.round(mi)]));if(hasPol)base.push(Math.round(r.pay||0),Math.round(polTiVal(si,r.pay)));return base.join(',')})).join('\n')};
/* Surgical in-place filter update for Monthly Projection and Interest & Income reports (avoids full page re-render) */
window.vrUpdateReportFilters=function(focusAttr,focusVal){
  if(typeof UI==='undefined'||UI.tab!=='Reports'||(UI.rv!=='month'&&UI.rv!=='int'))return false;
  if(typeof document==='undefined'||!document.getElementById)return false;
  if(document.querySelector&&document.querySelector('#m .ap-wrap'))return false;
  const rr=document.getElementById('rr');
  if(!rr||typeof window.repRows!=='function')return false;
  rr.innerHTML=window.repRows();
  if(rr.dataset&&typeof window.vrRrDomKey==='function'){rr.dataset.vrDomRv=UI.rv;rr.dataset.vrDomKey=window.vrRrDomKey(UI.rv)}
  if(UI.rv==='int'&&typeof window.intTiles==='function'&&document.querySelector){
    const rpk=document.querySelector('#m .rpk');
    if(rpk){const tmp=document.createElement('div');tmp.innerHTML=window.intTiles();if(tmp.firstElementChild&&rpk.parentNode)rpk.parentNode.replaceChild(tmp.firstElementChild,rpk)}
  }
  if(window.RCOLS&&typeof window.RCOLS.apply==='function')window.RCOLS.apply(rr,UI.rv);
  if(typeof window.vrMarkRetired==='function')window.vrMarkRetired(rr);
  if(typeof window.vrReportFit==='function')window.vrReportFit(false);
  if(focusAttr&&focusVal&&document.querySelectorAll){
    const n=Array.prototype.filter.call(document.querySelectorAll('['+focusAttr+']'),function(x){return x.getAttribute(focusAttr)===focusVal})[0];
    if(n&&typeof n.focus==='function')n.focus();
  }
  return true;
};
document.addEventListener('click',function(e){const b=e.target&&e.target.closest&&e.target.closest('[data-rsel]');if(!b)return;
const v=b.dataset.rsel,A=S.assets,cur=repSel();
UI.rcl=null;
if(v==='all')UI.rsel=null;
else if(v==='none')UI.rsel=[];
else if(cur.all)UI.rsel=[v];
else{const s=(UI.rsel||[]).map(String),k=s.indexOf(v);if(k>-1)s.splice(k,1);else s.push(v);UI.rsel=(s.length===A.length||s.length===0)?null:s}
if(typeof window.vrUpdateAnnualFilters==='function'&&window.vrUpdateAnnualFilters('data-rsel',v))return;
if(window.vrUpdateReportFilters('data-rsel',v))return;
render();const rr=document.getElementById('rr');if(rr){rr.scrollLeft=0;rr.scrollTop=0}const n=document.querySelector('[data-rsel="'+v+'"]');if(n)n.focus()});
document.addEventListener('click',function(e){const b=e.target&&e.target.closest&&e.target.closest('[data-rcat]');if(!b)return;
const c=b.dataset.rcat,A=S.assets,cur=repSel(),ids=A.filter(function(x){return x.cat===c}).map(function(x){return String(x.id)});let s;
if(cur.all)s=ids.slice();else{s=(UI.rsel||[]).map(String);const sMap=Object.create(null);for(let i=0;i<s.length;i++)sMap[s[i]]=1;const idMap=Object.create(null);let on=true;for(let i=0;i<ids.length;i++){idMap[ids[i]]=1;if(!sMap[ids[i]])on=false}s=on?s.filter(function(i){return !idMap[i]}):s.concat(ids.filter(function(i){return !sMap[i]}))}
{const wasAll=cur.all,rc=UI.rcl;UI.rcl=wasAll?[c]:(rc?(rc.indexOf(c)>-1?rc.filter(function(z){return z!==c}):rc.concat([c])):null)}
UI.rsel=(s.length===A.length||s.length===0)?null:s;
if(typeof window.vrUpdateAnnualFilters==='function'&&window.vrUpdateAnnualFilters('data-rcat',c))return;
if(window.vrUpdateReportFilters('data-rcat',c))return;
render();const rr=document.getElementById('rr');if(rr){rr.scrollLeft=0;rr.scrollTop=0}const nb=Array.prototype.find.call(document.querySelectorAll('[data-rcat]'),function(x){return x.dataset.rcat===c});if(nb)nb.focus()});
document.addEventListener('toggle',function(e){
  const d=e.target;
  if(!d||d.tagName!=='DETAILS'||!d.open||!d.classList||!d.classList.contains('yc'))return;
  const kv=d.querySelector&&d.querySelector('.kv[data-lazy-kv="min"]');
  if(!kv||!window.__vrMinLazyKv||!window.__vrMinLazyKv.map)return;
  const fn=window.__vrMinLazyKv.map[+d.dataset.r];
  if(!fn)return;
  delete kv.dataset.lazyKv;
  kv.innerHTML=fn();
  if(window.RCOLS&&typeof window.RCOLS.applyCard==='function')window.RCOLS.applyCard(d,window.__vrMinLazyKv.view||'month');
},true);
})();