(function(){
const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function monthStateSig(s){if(!s)return'';var g=s.grat||{};
var as=(s.assets||[]).map(function(x){return[x.id,x.type||'',x.value,x.add,x.madd||0,x.ret,x.yrs,x.cmp||'',x.icr,x.amon||4,x.edate||'',x.mfrom||'',x.mto||'',x.yfrom||'',x.yto||'',x.mat||0].join(',')}).join(';');
var pol=typeof VRPolicy!=='undefined'&&VRPolicy&&VRPolicy.forState?JSON.stringify(VRPolicy.forState(s,'goal')):'';
return[s.start,s.end,s.ret,g.basic,g.svc,g.rem,g.cap,as,pol,(s.members||[]).map(function(m){return m.age+':'+m.role+':'+m.cls+':'+m.college}).join('|')].join('#')}
window.monthData=function(state){
const state0=state||S,D=(state0===S&&window.vrReportCalc?window.vrReportCalc():calc(state0)),A=state0.assets,nA=A.length;
const mSig=monthStateSig(state0),mcCache=window.__vrMonthDataCache;
if(mcCache&&mcCache.D===D&&mcCache.sig===mSig)return mcCache.value;
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
    rows.push({a:(a-2)*12+m,year:c.year,mi:m-1,calYear:cy,calMonth:cm+1,label:MN[cm]+' '+cy,age:c.age,st:c.st,v:v,dep:dep,ad:ad,pv:last.slice(),tot:tot,chg:tot==null?null:tot-pv,add:addSum,pay:VRPolicy.monthPayout(state0,a,m-1)});
  }
}
const res={rows:rows,D:D};
window.__vrMonthDataCache={D:D,sig:mSig,value:res};
return res};
window.RV_VIEWS=[['year','Annual Portfolio Projection'],['month','Monthly Portfolio Projection'],['int','Interest and income'],['sav','Savings schedule'],['ent','Holdings register'],['vdate','Value on Date'],['hold','Holdings']];
window.repMRows=function(){const S0=repSel();if(S0.none)return window.repNone();if(S0.min){const m0=monthData(),ry0=m0.D.rows[m0.D.ri].year;return window.repMin(m0.rows,{label:'Month',noun:'months',lab:r=>r.label,hl:r=>r.year===ry0&&r.mi===11})}const md=monthData(),D=md.D,A=S.assets,allIdx=A.map(function(_,i){return i}),Ms=S.members,kids=Ms.map(function(m,i){return m.role==='Child'?i:-1}).filter(function(i){return i>=0}),q=UI.rq.trim().toLowerCase(),ry=D.rows[D.ri].year,nf=A.length===1||(UI.rcl&&UI.rcl.length===1),hasPol=VRPolicy.hasPayouts('goal');
const key=function(r,k){return k==='a'||k==='year'||k==='fy'||k[0]==='s'?r.a:k==='age'?r.age[0]:k==='tot'||k==='hi'?r.tot:k==='roi'?(rowRoi(r)||0):k==='chg'?r.chg:k==='add'?r.add:k==='pay'?r.pay:k==='ti'?polTiVal(r.chg==null?null:r.chg-r.add,r.pay):k==='int'?(r.chg==null?-1e18:r.chg-r.add):r.v[+k.slice(1)]};
const L=q?md.rows.filter(function(r){return[r.a,r.label,fyl(r.year),r.age.join(' '),r.st.join(' '),r.tot,f(r.tot),hin(r.tot),rowRoiTxt(r)].concat(r.v.map(f)).join(' ').toLowerCase().indexOf(q)>-1}):md.rows.slice();
L.sort(function(x,y){const a=key(x,UI.rk),b=key(y,UI.rk);return(a>b?1:a<b?-1:0)*UI.rd});
if(!L.length)return'<div class="em">No months match your search.</div>';
const th=function(k,t){return'<th class="'+(k!=='fy'&&k!=='year'&&k!=='hi'&&k[0]!=='s'?'rt-num':'')+'" aria-sort="'+(UI.rk===k?(UI.rd>0?'ascending':'descending'):'none')+'"><button data-rk="'+k+'">'+t+(UI.rk===k?(UI.rd>0?' ▲':' ▼'):'')+'</button></th>'};
const at=function(r){return'data-r="'+r.a+'" class="'+(r.year===ry&&r.mi===11?'a':'')+(UI.sel===r.a?' sel':'')+'"'};
const ageHd=Ms.map(function(m){return escn(m.name)}).join(' / ');
const metaL=L.map(function(r){
  var fyT=nf?'':fyl(r.year),roiT=rowRoiTxt(r),hinT=hin(r.tot),am=r.chg!=null&&allMat(allIdx,r,true),intV=r.chg==null?null:r.chg-r.add;
  var intStr=r.chg==null?'—':(am?'-':rf(intV)),tiStr=hasPol?polTiTxt(intV,am,r.pay):'';
  return{r:r,fyT:fyT,roiT:roiT,hinT:hinT,intStr:intStr,tiStr:tiStr};
});
return'<table class="rt"><tr>'+th('a','S.No')+(nf?'':th('fy','Financial<br>Year'))+th('year','Month')+th('age','Ages<br><span class="rt-sub">'+ageHd+'</span>')+kids.map(function(k){return th('s'+k,escn(Ms[k].name)+'<br>stage')}).join('')+A.map(function(x,i){return th('v'+i,escn(x.name))}).join('')+th('tot','Month end<br>balance (₹)')+th('roi','Blended<br>ROI')+th('add','Amount<br>Deposited (₹)')+th('int','Interest<br>Earned (₹)')+(hasPol?th('pay','Policy<br>payout (₹)')+th('ti','Total<br>income (₹)'):'')+th('chg','Change')+th('hi','Total (हिन्दी)')+'</tr>'
+metaL.map(function(x){var r=x.r;return'<tr '+at(r)+' tabindex="0" aria-selected="'+(UI.sel===r.a)+'"><td class="rt-num">'+r.a+'</td>'+(nf?'':'<td class="nw">'+x.fyT+'</td>')+'<td class="nw">'+r.label+'</td><td class="nw rt-num">'+r.age.join(' / ')+'</td>'+kids.map(function(k){return'<td class="l">'+sh(r.st[k])+'</td>'}).join('')+r.v.map(function(v,i){if(A[i].cmp==='oa'&&A[i].type!=='gratuity'&&v!=null&&r.dep&&!r.dep[i])return'<td>-</td>';return'<td title="'+rf(v)+'">'+lk(v)+'</td>'}).join('')+'<td class="nw" title="'+rf(r.tot)+'"><b>'+rf(r.tot)+'</b></td><td><b>'+x.roiT+'</b></td><td class="nw" title="'+rf(r.add)+'">'+rf(r.add)+'</td><td class="nw">'+x.intStr+'</td>'+(hasPol?'<td class="nw">'+(r.pay>0?rf(r.pay):'—')+'</td><td class="nw"><b>'+x.tiStr+'</b></td>':'')+'<td>'+lk(r.chg)+'</td><td class="l">'+x.hinT+'</td></tr>'}).join('')+'</table>'
+'<div class="rc">'+metaL.map(function(x){var r=x.r;return'<details class="yc '+(r.year===ry&&r.mi===11?'a':'')+(UI.sel===r.a?' sel':'')+'" data-r="'+r.a+'"><summary><b>'+r.label+'</b>'+(nf?'':' · '+x.fyT)+' · Age '+r.age[0]+'<br><span class="mu">Month end balance</span> <b>'+rf(r.tot)+'</b><div class="mu">'+x.hinT+'</div></summary><div class="kv">'+Ms.map(function(m,k){return'<span>'+escn(m.name)+'</span><b>Age '+r.age[k]+(m.role==='Child'?' · '+sh(r.st[k]):'')+'</b>'}).join('')+A.map(function(ax,i){return'<span>'+escn(ax.name)+'</span><b>'+(ax.cmp==='oa'&&ax.type!=='gratuity'&&r.v[i]!=null&&r.dep&&!r.dep[i]?'-':rf(r.v[i]))+'</b>'}).join('')+'<span>Blended ROI</span><b>'+x.roiT+'</b><span>Amount deposited</span><b>'+rf(r.add)+'</b><span>Interest earned</span><b>'+x.intStr+'</b>'+(hasPol?'<span>Policy payout</span><b>'+(r.pay>0?rf(r.pay):'—')+'</b><span>Total income</span><b>'+x.tiStr+'</b>':'')+'<span>Monthly change</span><b>'+rf(r.chg)+'</b></div></details>'}).join('')+'</div>'
};
window.monthCSV=function(){const q=function(v){return'"'+String(v).replace(/"/g,'""')+'"'},md=monthData(),A=S.assets,Ms=S.members,kids=Ms.map(function(m,i){return m.role==='Child'?i:-1}).filter(function(i){return i>=0});
return[['S.No','Month','Year'].concat(Ms.map(function(m){return'Age ('+m.name+')'}),kids.map(function(k){return Ms[k].name+' Stage'}),A.map(function(x){return x.name}),['Month end balance','Blended ROI %','Amount deposited','Interest earned'].concat(VRPolicy.hasPayouts('goal')?['Policy payout','Total income']:[],['Monthly change','Total (Hindi)'])).map(q).join(',')].concat(md.rows.map(function(r){return[r.a,r.label.split(' ')[0],r.label.split(' ')[1]].concat(r.age,kids.map(function(k){return q(r.st[k])}),r.v.map(function(x,i){return x==null?'—':(A[i].cmp==='oa'&&A[i].type!=='gratuity'&&r.dep&&!r.dep[i]?'-':Math.round(x))}),[r.tot==null?'—':r.tot,r.tot==null?'—':rowRoiPct(r),Math.round(r.add),r.chg==null?'—':Math.round(r.chg-r.add)].concat(VRPolicy.hasPayouts('goal')?[Math.round(r.pay),Math.round(polTiVal(r.chg==null?null:r.chg-r.add,r.pay))]:[],[r.chg==null?'—':r.chg,q(hin(r.tot))])).join(',')})).join('\n')};
document.addEventListener('click',function(e){const tab=e.target.closest&&e.target.closest('[data-rv]');if(!tab)return;
const views=['year','month','int','sav','ent','vdate','hold'];if(views.indexOf(tab.dataset.rv)<0)return;
if(tab.dataset.rv==='hold'){UI.tab='Holdings';render();return}
UI.tab='Reports';UI.rv=tab.dataset.rv;UI.sel=null;UI.rk='a';UI.rd=1;UI.rq='';render()});

})();