(function(){
const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function monthStateSig(s){if(!s)return'';var g=s.grat||{};
var as=(s.assets||[]).map(function(x){return[x.id,x.type||'',x.value,x.add,x.madd||0,x.ret,x.yrs,x.cmp||'',x.icr,x.amon||4,x.edate||'',x.mfrom||'',x.mto||'',x.yfrom||'',x.yto||'',x.mat||0].join(',')}).join(';');
var hasPolData=(s.policies&&s.policies.length)||s.polClients;
var pol=hasPolData&&typeof VRPolicy!=='undefined'&&VRPolicy&&VRPolicy.forState?JSON.stringify(VRPolicy.forState(s,'goal')):'';
return[s.start,s.end,s.ret,g.basic,g.svc,g.rem,g.cap,as,pol,(s.members||[]).map(function(m){return m.age+':'+m.role+':'+m.cls+':'+m.college}).join('|')].join('#')}
function isMaximizedMode(){
  if(typeof document==='undefined'||!document.getElementById)return false;
  var m=document.getElementById('m');
  return !!(m&&m.classList&&m.classList.contains('vr-rmax'));
}
function isDesktopWide(){
  return typeof window!=='undefined'&&typeof window.innerWidth==='number'&&window.innerWidth>1040;
}
function isCompactMinimized(isMax){
  return !isMax&&typeof window!=='undefined'&&typeof window.innerWidth==='number'&&window.innerWidth<=1040;
}
window.monthData=function(state){
const state0=state||S,D=(state0===S&&window.vrReportCalc?window.vrReportCalc():calc(state0)),A=state0.assets,nA=A.length;
const mSig=monthStateSig(state0),mcCache=window.__vrMonthDataCache;
if(mcCache&&mcCache.D===D&&mcCache.sig===mSig)return mcCache.value;
const hasPolData=!!((state0.policies&&state0.policies.length)||state0.polClients)&&typeof VRPolicy!=='undefined'&&VRPolicy&&typeof VRPolicy.monthPayout==='function';
const mtList=new Array(nA),amkList=new Array(nA);
for(let i=0;i<nA;i++){mtList[i]=matOf(A[i],state0);amkList[i]=FYM(A[i].amon||4);}
const rows=[];
for(let a=2;a<=D.rows.length;a++){
  const p=D.rows[a-2],c=D.rows[a-1],fy=state0.start+a-2;
  const fi=new Array(nA),ekList=new Array(nA),mcmY=new Array(nA),mcnt=new Array(nA);
  for(let i=0;i<nA;i++){
    const x=A[i];
    if(x.type==='gratuity'){fi[i]=null;ekList[i]=-1;mcmY[i]=null;mcnt[i]=0;continue;}
    const q=fyInfo(x,state0,a);
    fi[i]=q;ekList[i]=FYM(q.e.mo);mcnt[i]=0;
    mcmY[i]=(x.cmp==='monthly'&&a>=q.e.a0)?mcm(p.v[i],x,q):null;
  }
  let last=p.v.slice();
  for(let m=1;m<=12;m++){
    const t=m/12,cm=(m+2)%12,cy=m<=9?fy:fy+1;
    const v=new Array(nA),dep=new Array(nA),ad=new Array(nA);
    let hasLive=false,totSum=0,pvSum=0,addSum=0;
    for(let i=0;i<nA;i++){
      const x=A[i],s=p.v[i],e=c.v[i],q=fi[i],mt=mtList[i],amk=amkList[i];
      if(q&&q.ms[m-1])mcnt[i]++;
      const on=!q||a>q.e.a0||(a===q.e.a0&&m-1>=ekList[i]);
      let val;
      if(!on){
        val=null;
      }else if(x.type==='gratuity'&&a-1<=state0.grat.rem){
        val=s+(e-s)*t;
      }else if(mt&&a>mt.row){
        val=s;
      }else if(mt&&a===mt.row&&m-1>=mt.km){
        val=e;
      }else if(x.cmp==='monthly'&&x.type!=='gratuity'){
        val=(!q||a<q.e.a0)?s:mcmY[i][m-1];
      }else if((x.icr||x.cmp==='oa')&&x.type!=='gratuity'){
        if(m===12)val=e;
        else if(!q||a<q.e.a0)val=s;
        else{let z=s;if(q.act){z+=(x.madd||0)*mcnt[i];if(q.yp&&amk<m)z+=x.add;}val=z;}
      }else if(q&&x.type!=='gratuity'&&a<q.e.a0){
        val=s;
      }else if(q&&x.type!=='gratuity'&&q.first&&q.days<365&&m<12){
        const ek=ekList[i];
        if(m<=ek)val=s;
        else{let z=s*(1+x.ret*q.days/365*(m-ek)/(12-ek));if(q.act){z+=(x.madd||0)*mcnt[i];if(q.yp&&amk<m)z+=x.add;}val=z;}
      }else{
        val=(mt&&a===mt.row&&s>0&&e>0)?s*Math.pow(e/s,Math.min(1,m/(mt.km+mt.d/mt.dim))):s*Math.pow(1+x.ret,t)+(e-s*(1+x.ret))*t;
      }
      v[i]=val;
      if(val!=null){hasLive=true;totSum+=val;pvSum+=last[i];last[i]=val;}
      const mAdd=q&&q.act?(q.ms[m-1]?(x.madd||0):0):0;
      const yAdd=q&&q.act&&q.yp&&amk===m-1?x.add:0;
      dep[i]=!!(q&&q.act&&(q.ms[m-1]||(q.yp&&amk===m-1)));
      ad[i]=mAdd+yAdd;
      addSum+=ad[i];
    }
    const tot=hasLive?Math.round(totSum):null,pv=hasLive?Math.round(pvSum):0;
    rows.push({a:(a-2)*12+m,year:c.year,mi:m-1,calYear:cy,calMonth:cm+1,label:MN[cm]+' '+cy,age:c.age,st:c.st,v:v,dep:dep,ad:ad,pv:last.slice(),tot:tot,chg:tot==null?null:tot-pv,add:addSum,pay:hasPolData?VRPolicy.monthPayout(state0,a,m-1):0});
  }
}
const res={rows:rows,D:D};
window.__vrMonthDataCache={D:D,sig:mSig,value:res};
return res};
window.RV_VIEWS=[['year','Annual Portfolio Projection'],['month','Monthly Portfolio Projection'],['int','Interest and income'],['sav','Savings schedule'],['ent','Holdings register'],['vdate','Value on Date'],['hold','Holdings']];
function getMonthCache(md,A,Ms){
  let rc=md._repCache;
  if(!rc||rc.nA!==A.length||rc.nM!==Ms.length){
    const n=md.rows.length;
    rc={
      nA:A.length,nM:Ms.length,
      vAll:new Array(n+1),
      meta:new Array(n+1),
      hay:new Array(n+1),
      escA:A.map(function(x){return escn(x.name)}),
      escM:Ms.map(function(m){return escn(m.name)}),
      htmlKey:'',htmlVal:''
    };
    try{Object.defineProperty(md,'_repCache',{value:rc,enumerable:false,configurable:true})}catch(e){md._repCache=rc}
  }
  return rc;
}
function getRowMeta(rc,r,allIdx,hasPol,needHin){
  let m=rc.meta[r.a];
  if(!m||m.hasPol!==hasPol){
    const am=r.chg!=null&&allMat(allIdx,r,true),intV=r.chg==null?null:r.chg-r.add;
    m={
      hasPol:hasPol,
      fyT:fyl(r.year),
      roiT:rowRoiTxt(r),
      hinT:needHin?hin(r.tot):null,
      rfTot:rf(r.tot),
      rfAdd:rf(r.add),
      lkChg:lk(r.chg),
      intStr:r.chg==null?'—':(am?'-':rf(intV)),
      tiStr:hasPol?polTiTxt(intV,am,r.pay):''
    };
    rc.meta[r.a]=m;
  }else if(needHin&&m.hinT===null){
    m.hinT=hin(r.tot);
  }
  return m;
}
function buildMonthCardKv(r,rc,A,Ms,hasPol,m){
  let out='';
  for(let k=0;k<Ms.length;k++){
    const mem=Ms[k];
    out+='<span>'+rc.escM[k]+'</span><b>Age '+r.age[k]+(mem.role==='Child'?' · '+sh(r.st[k]):'')+'</b>';
  }
  for(let i=0;i<A.length;i++){
    const ax=A[i],v=r.v[i];
    out+='<span>'+rc.escA[i]+'</span><b>'+(ax.cmp==='oa'&&ax.type!=='gratuity'&&v!=null&&r.dep&&!r.dep[i]?'-':rf(v))+'</b>';
  }
  out+='<span>Blended ROI</span><b>'+m.roiT+'</b><span>Amount deposited</span><b>'+m.rfAdd+'</b><span>Interest earned</span><b>'+m.intStr+'</b>'+(hasPol?'<span>Policy payout</span><b>'+(r.pay>0?rf(r.pay):'—')+'</b><span>Total income</span><b>'+m.tiStr+'</b>':'')+'<span>Monthly change</span><b>'+rf(r.chg)+'</b>';
  return out;
}
window.repMRows=function(mode){const S0=repSel();if(S0.none)return window.repNone();if(S0.min){const m0=monthData(),ry0=m0.D.rows[m0.D.ri].year;return window.repMin(m0.rows,{label:'Month',noun:'months',lab:r=>r.label,hl:r=>r.year===ry0&&r.mi===11},mode)}
const md=monthData(),D=md.D,A=S.assets,nA=A.length,Ms=S.members,q=UI.rq.trim().toLowerCase(),ry=D.rows[D.ri].year,nf=nA===1||(UI.rcl&&UI.rcl.length===1),hasPol=VRPolicy.hasPayouts('goal');
const isMax=isMaximizedMode();
const skipRc=mode==='table'?true:mode==='rc'?false:(isMax||isDesktopWide());
const skipTbl=mode==='rc'?true:mode==='table'?false:isCompactMinimized(isMax);
const hasRC=typeof RCOLS!=='undefined'&&RCOLS&&typeof RCOLS.vis==='function';
const showA=!hasRC||RCOLS.vis('month','a');
const showFy=!nf&&(!hasRC||RCOLS.vis('month','fy'));
const showAge=!hasRC||RCOLS.vis('month','age');
const kids=[];for(let i=0;i<Ms.length;i++){if(Ms[i].role==='Child')kids.push(i)}
const showS=kids.length>0&&(!hasRC||RCOLS.vis('month','s'));
const showRoi=!hasRC||RCOLS.vis('month','roi');
const showAdd=!hasRC||RCOLS.vis('month','add');
const showInt=!hasRC||RCOLS.vis('month','int');
const showPay=hasPol&&(!hasRC||RCOLS.vis('month','pay'));
const showTi=hasPol&&(!hasRC||RCOLS.vis('month','ti'));
const showChg=!hasRC||RCOLS.vis('month','chg');
const showHi=!hasRC||RCOLS.vis('month','hi');
const colMask=(showA?1:0)|(showFy?2:0)|(showAge?4:0)|(showS?8:0)|(showRoi?16:0)|(showAdd?32:0)|(showInt?64:0)|(showPay?128:0)|(showTi?256:0)|(showChg?512:0)|(showHi?1024:0);
const rc=getMonthCache(md,A,Ms);
const cacheKey=[q,UI.rk,UI.rd,UI.sel,nf?'1':'0',hasPol?'1':'0',skipRc?'1':'0',skipTbl?'1':'0',colMask].join('|');
if(rc.htmlKey===cacheKey&&rc.htmlVal)return rc.htmlVal;
const allIdx=new Array(nA);for(let i=0;i<nA;i++)allIdx[i]=i;
const key=function(r,k){return k==='a'||k==='year'||k==='fy'||k[0]==='s'?r.a:k==='age'?r.age[0]:k==='tot'||k==='hi'?r.tot:k==='roi'?(rowRoi(r)||0):k==='chg'?r.chg:k==='add'?r.add:k==='pay'?r.pay:k==='ti'?polTiVal(r.chg==null?null:r.chg-r.add,r.pay):k==='int'?(r.chg==null?-1e18:r.chg-r.add):r.v[+k.slice(1)]};
const L=q?md.rows.filter(function(r){
  let hay=rc.hay[r.a];
  if(hay===undefined){
    const m=getRowMeta(rc,r,allIdx,hasPol,true);
    hay=[r.a,r.label,m.fyT,r.age.join(' '),r.st.join(' '),r.tot,f(r.tot),m.hinT,m.roiT].concat(r.v.map(f)).join(' ').toLowerCase();
    rc.hay[r.a]=hay;
  }
  return hay.indexOf(q)>-1;
}):md.rows.slice();
if(UI.rk!=='a'||UI.rd<0)L.sort(function(x,y){const a=key(x,UI.rk),b=key(y,UI.rk);return(a>b?1:a<b?-1:0)*UI.rd});
if(!L.length)return'<div class="em">No months match your search.</div>';
const nL=L.length;
let tbl='';
if(!skipTbl){
  const th=function(k,t){return'<th class="'+(k!=='fy'&&k!=='year'&&k!=='hi'&&k[0]!=='s'?'rt-num':'')+'" aria-sort="'+(UI.rk===k?(UI.rd>0?'ascending':'descending'):'none')+'"><button data-rk="'+k+'">'+t+(UI.rk===k?(UI.rd>0?' ▲':' ▼'):'')+'</button></th>'};
  const ageHd=showAge?rc.escM.join(' / '):'';
  let kidTh='';if(showS){for(let ki=0;ki<kids.length;ki++)kidTh+=th('s'+kids[ki],rc.escM[kids[ki]]+'<br>stage')}
  let assetTh='';for(let i=0;i<nA;i++)assetTh+=th('v'+i,rc.escA[i]);
  const trParts=new Array(nL);
  for(let li=0;li<nL;li++){
    const r=L[li],m=getRowMeta(rc,r,allIdx,hasPol,showHi);
    let vCells=rc.vAll[r.a];
    if(vCells===undefined){
      let vs='';
      for(let i=0;i<nA;i++){
        const v=r.v[i];
        if(A[i].cmp==='oa'&&A[i].type!=='gratuity'&&v!=null&&r.dep&&!r.dep[i])vs+='<td>-</td>';
        else vs+='<td title="'+rf(v)+'">'+lk(v)+'</td>';
      }
      rc.vAll[r.a]=vs;
      vCells=vs;
    }
    let kCells='';
    if(showS){for(let ki=0;ki<kids.length;ki++)kCells+='<td class="l">'+sh(r.st[kids[ki]])+'</td>'}
    const cls=(r.year===ry&&r.mi===11?'a':'')+(UI.sel===r.a?' sel':'');
    trParts[li]='<tr data-r="'+r.a+'" class="'+cls+'" tabindex="0" aria-selected="'+(UI.sel===r.a)+'">'
      +(showA?'<td class="rt-num">'+r.a+'</td>':'')
      +(showFy?'<td class="nw">'+m.fyT+'</td>':'')
      +'<td class="nw">'+r.label+'</td>'
      +(showAge?'<td class="nw rt-num">'+r.age.join(' / ')+'</td>':'')
      +kCells+vCells
      +'<td class="nw" title="'+m.rfTot+'"><b>'+m.rfTot+'</b></td>'
      +(showRoi?'<td><b>'+m.roiT+'</b></td>':'')
      +(showAdd?'<td class="nw" title="'+m.rfAdd+'">'+m.rfAdd+'</td>':'')
      +(showInt?'<td class="nw">'+m.intStr+'</td>':'')
      +(showPay?'<td class="nw">'+(r.pay>0?rf(r.pay):'—')+'</td>':'')
      +(showTi?'<td class="nw"><b>'+m.tiStr+'</b></td>':'')
      +(showChg?'<td>'+m.lkChg+'</td>':'')
      +(showHi?'<td class="l">'+m.hinT+'</td>':'')
      +'</tr>';
  }
  tbl='<table class="rt"><tr>'
    +(showA?th('a','S.No'):'')
    +(showFy?th('fy','Financial<br>Year'):'')
    +th('year','Month')
    +(showAge?th('age','Ages<br><span class="rt-sub">'+ageHd+'</span>'):'')
    +kidTh+assetTh
    +th('tot','Month end<br>balance (₹)')
    +(showRoi?th('roi','Blended<br>ROI'):'')
    +(showAdd?th('add','Amount<br>Deposited (₹)'):'')
    +(showInt?th('int','Interest<br>Earned (₹)'):'')
    +(showPay?th('pay','Policy<br>payout (₹)'):'')
    +(showTi?th('ti','Total<br>income (₹)'):'')
    +(showChg?th('chg','Change'):'')
    +(showHi?th('hi','Total (हिन्दी)'):'')
    +'</tr>'+trParts.join('')+'</table>';
}
let out=tbl;
if(!skipRc){
  const rcParts=new Array(nL);
  for(let li=0;li<nL;li++){
    const r=L[li],m=getRowMeta(rc,r,allIdx,hasPol,showHi);
    const cls=(r.year===ry&&r.mi===11?'a':'')+(UI.sel===r.a?' sel':'');
    rcParts[li]='<details class="yc '+cls+'" data-r="'+r.a+'"><summary><b>'+r.label+'</b>'+(nf?'':' · '+m.fyT)+' · Age '+r.age[0]+'<br><span class="mu">Month end balance</span> <b>'+m.rfTot+'</b>'+(showHi?'<div class="mu">'+m.hinT+'</div>':'')+'</summary><div class="kv" data-lazy-kv="month"></div></details>';
  }
  out=tbl+'<div class="rc">'+rcParts.join('')+'</div>';
}
if(!mode){rc.htmlKey=cacheKey;rc.htmlVal=out}
return out;
};
window.monthCSV=function(){const q=function(v){return'"'+String(v).replace(/"/g,'""')+'"'},md=monthData(),A=S.assets,Ms=S.members,kids=Ms.map(function(m,i){return m.role==='Child'?i:-1}).filter(function(i){return i>=0});
return[['S.No','Month','Year'].concat(Ms.map(function(m){return'Age ('+m.name+')'}),kids.map(function(k){return Ms[k].name+' Stage'}),A.map(function(x){return x.name}),['Month end balance','Blended ROI %','Amount deposited','Interest earned'].concat(VRPolicy.hasPayouts('goal')?['Policy payout','Total income']:[],['Monthly change','Total (Hindi)'])).map(q).join(',')].concat(md.rows.map(function(r){return[r.a,r.label.split(' ')[0],r.label.split(' ')[1]].concat(r.age,kids.map(function(k){return q(r.st[k])}),r.v.map(function(x,i){return x==null?'—':(A[i].cmp==='oa'&&A[i].type!=='gratuity'&&r.dep&&!r.dep[i]?'-':Math.round(x))}),[r.tot==null?'—':r.tot,r.tot==null?'—':rowRoiPct(r),Math.round(r.add),r.chg==null?'—':Math.round(r.chg-r.add)].concat(VRPolicy.hasPayouts('goal')?[Math.round(r.pay),Math.round(polTiVal(r.chg==null?null:r.chg-r.add,r.pay))]:[],[r.chg==null?'—':r.chg,q(hin(r.tot))])).join(',')})).join('\n')};
document.addEventListener('toggle',function(e){
  const d=e.target;
  if(!d||d.tagName!=='DETAILS'||!d.open||!d.classList||!d.classList.contains('yc'))return;
  const kv=d.querySelector&&d.querySelector('.kv[data-lazy-kv="month"]');
  if(!kv)return;
  const ra=+d.dataset.r;
  const md=monthData(),r=md.rows[ra-1];
  if(!r)return;
  const A=S.assets,Ms=S.members,hasPol=VRPolicy.hasPayouts('goal'),rc=getMonthCache(md,A,Ms);
  const allIdx=A.map(function(_,i){return i});
  const m=getRowMeta(rc,r,allIdx,hasPol,false);
  delete kv.dataset.lazyKv;
  kv.innerHTML=buildMonthCardKv(r,rc,A,Ms,hasPol,m);
  if(window.RCOLS&&typeof window.RCOLS.applyCard==='function')window.RCOLS.applyCard(d,'month');
},true);
if(typeof window!=='undefined'&&window.addEventListener){
  window.addEventListener('resize',function(){
    if(typeof UI==='undefined'||UI.tab!=='Reports'||(UI.rv!=='month'&&UI.rv!=='int'))return;
    const rr=document.getElementById('rr');
    if(!rr||typeof window.repRows!=='function')return;
    const wide=isDesktopWide();
    let hasTbl=false,hasRc=false;
    const ch=rr.children;
    for(let i=0;i<ch.length;i++){
      if(ch[i].tagName==='TABLE'&&ch[i].classList&&ch[i].classList.contains('rt'))hasTbl=true;
      else if(ch[i].classList&&ch[i].classList.contains('rc'))hasRc=true;
    }
    if(wide&&!hasTbl){
      const h=window.repRows('table');
      if(h)rr.insertAdjacentHTML('afterbegin',h);
      if(window.RCOLS&&typeof window.RCOLS.apply==='function')window.RCOLS.apply(rr,UI.rv);
      if(typeof window.vrMarkRetired==='function')window.vrMarkRetired(false);
    }else if(!wide&&!isMaximizedMode()&&!hasRc){
      const h=window.repRows('rc');
      if(h)rr.insertAdjacentHTML('beforeend',h);
      if(window.RCOLS&&typeof window.RCOLS.apply==='function')window.RCOLS.apply(rr,UI.rv);
      if(typeof window.vrMarkRetired==='function')window.vrMarkRetired(false);
    }
  });
}
document.addEventListener('click',function(e){const tab=e.target.closest&&e.target.closest('[data-rv]');if(!tab)return;
const views=['year','month','int','sav','ent','vdate','hold'];if(views.indexOf(tab.dataset.rv)<0)return;
if(tab.dataset.rv==='hold'){UI.tab='Holdings';render();return}
UI.tab='Reports';UI.rv=tab.dataset.rv;UI.sel=null;UI.rk='a';UI.rd=1;UI.rq='';render()});

})();