(function(){
const pc=function(x){return x==null?'—':(x*100).toFixed(2)+'%'};
window.intData=function(){const D=window.vrReportCalc?window.vrReportCalc():calc(S),ic=window.__vrIntDataCache;
if(ic&&ic.D===D&&ic.len===(S.assets?S.assets.length:0))return ic.value;
const R=D.rows,A=S.assets,nA=A.length,mt=D._meta&&D._meta.len===nA&&D._meta.N===R.length?D._meta:null,out=[];
for(let a=2;a<=R.length;a++){const o=R[a-2],c=R[a-1];
const fa=mt&&mt.fyAdd[a];
const ad=new Array(nA),it=new Array(nA);
for(let i=0;i<nA;i++){
  let adV=0;
  if(fa){adV=fa[i]}
  else{const x=A[i];if(x.type!=='gratuity'){const k=fyInfo(x,S,a);adV=k.act?((k.yp?x.add:0)+(x.madd||0)*k.n):0}}
  ad[i]=adV;
  it[i]=c.v[i]-o.v[i]-adV;
}
out.push({a:a-1,fy:'FY '+o.year+'-'+String(c.year).slice(-2),age:c.age,o:o,c:c,   /* age at the END of the financial year, like the Annual and Monthly Portfolio Projection reports, so the Retired row shows the retirement age */ad:ad,it:it,pay:c.pay||0,payL:c.payL||0})}
const res={rows:out,D:D};window.__vrIntDataCache={D:D,len:nA,value:res};return res};
window.intCalc=function(r,idx){const s=function(v){return idx.reduce(function(t,i){return t+v[i]},0)};
const open=s(r.o.v),close=s(r.c.v),add=s(r.ad),intr=s(r.it);return{open:open,close:close,add:add,intr:intr,mi:intr/12,yl:(function(){var b=idx.reduce(function(t,i){return t+r.o.v[i]+(S.assets[i]&&S.assets[i].cmp==='oa'?r.ad[i]:0)},0);return b>0?intr/b:null})()}};
window.repISort=function(){const A=S.assets,idx=repSel().idx;
return[['a','S.No'],['year','Financial year'],['age','Age'],['open','Opening balance'],['add','Additions']].concat(idx.filter(function(i){return !/pf\s*-?\s*post|pf\s*post\s*office/i.test(A[i].name)}).map(function(i){return['v'+i,A[i].name+' interest']}),[['int','Interest earned'],['mi','Monthly income'],['roi','Yield on opening'],['close','Year end balance']])};
window.repIRows=function(mode){const SEL=repSel();if(SEL.none)return window.repNone();
const idx=SEL.idx,A=S.assets,visIdx=idx.filter(function(i){return !/pf\s*-?\s*post|pf\s*post\s*office/i.test(A[i].name)}),q=UI.rq.trim().toLowerCase(),md=intData(),ri=md.D.ri;
const isMax=typeof document!=='undefined'&&document.getElementById&&(function(){var m=document.getElementById('m');return !!(m&&m.classList&&m.classList.contains('vr-rmax'))})();
const isDesk=typeof window!=='undefined'&&typeof window.innerWidth==='number'&&window.innerWidth>1040;
const skipRc=mode==='table'?true:mode==='rc'?false:(isMax||isDesk);
const skipTbl=mode==='rc'?true:mode==='table'?false:(!isMax&&typeof window!=='undefined'&&typeof window.innerWidth==='number'&&window.innerWidth<=1040);
const cacheKey=[idx.join(','),q,UI.rk,UI.rd,UI.sel,skipRc?'1':'0',skipTbl?'1':'0'].join('|');
if(!mode&&md._htmlKey===cacheKey&&md._htmlVal)return md._htmlVal;
const rows=md.rows.map(function(r){return Object.assign({m:intCalc(r,idx)},r)});
const key=function(r,k){return k==='a'||k==='year'?r.a:k==='age'?r.age[0]:k==='open'?r.m.open:k==='add'?r.m.add:k==='int'?r.m.intr:k==='mi'?r.m.mi:k==='pay'?r.pay:k==='ti'?(r.m.intr+r.pay):k==='close'?r.m.close:k==='roi'?(r.m.yl==null?-1:r.m.yl):k[0]==='v'?r.it[+k.slice(1)]:r.a};
const L=q?rows.filter(function(r){return[r.a,r.fy,r.age.join(' '),f(r.m.open),f(r.m.add),f(r.m.intr),f(r.m.mi),f(r.m.close),pc(r.m.yl)].join(' ').toLowerCase().indexOf(q)>-1}):rows.slice();
if(UI.rk!=='a'||UI.rd<0)L.sort(function(x,y){const a=key(x,UI.rk),b=key(y,UI.rk);return(a>b?1:a<b?-1:0)*UI.rd});
if(!L.length)return'<div class="em">No years match your search.</div>';
const cls=function(r){return(r.a===ri?'a':'')+(UI.sel===r.a?' sel':'')};
let tbl='';
if(!skipTbl){
  const th=function(k,t){return'<th class="'+(k!=='year'?'rt-num':'')+'" aria-sort="'+(UI.rk===k?(UI.rd>0?'ascending':'descending'):'none')+'"><button data-rk="'+k+'">'+t+(UI.rk===k?(UI.rd>0?' ▲':' ▼'):'')+'</button></th>'};
  const tot=L.reduce(function(t,r){t.add+=r.m.add;t.intr+=r.m.intr;t.pay+=r.pay;idx.forEach(function(i){t.it[i]=(t.it[i]||0)+r.it[i]});return t},{add:0,intr:0,pay:0,it:{}});
  const hdCols=visIdx.map(function(i){return th('v'+i,escn(A[i].name)+'<br><span class="rt-sub">Interest</span>')}).join('');
  tbl='<table class="rt rs"><tr>'+th('a','S.No')+th('year','Financial<br>year')+th('age','Age<br>(end)')+th('open','Opening')+th('add',"Add'ns")
  +hdCols+th('int','Interest<br>earned (₹)')+th('mi','Monthly<br>income (₹)')+th('roi','Yield on<br>opening')+th('close','Year end<br>balance')+'</tr>\n'
  +L.map(function(r){return'<tr data-r="'+r.a+'" class="'+cls(r)+'" tabindex="0" aria-selected="'+(UI.sel===r.a)+'"><td class="rt-num">'+r.a+'</td><td class="nw">'+r.fy+'</td><td class="nw rt-num">'+r.age.join(' / ')+'</td><td title="'+rf(r.m.open)+'">'+lk(r.m.open)+'</td><td>'+lk(r.m.add)+'</td>'
  +visIdx.map(function(i){return matDone(A[i],r,2)?'<td>-</td>':'<td title="'+rf(r.it[i])+'">'+lk(r.it[i])+'</td>'}).join('')+(allMat(idx,r,2)?'<td class="nw"><b>-</b></td><td class="nw"><b>-</b></td><td>-</td>':'<td class="nw"><b>'+rf(r.m.intr)+'</b></td><td class="nw"><b>'+rf(r.m.mi)+'</b></td><td>'+pc(r.m.yl)+'</td>')+'<td class="rt-num" title="'+rf(r.m.close)+'">'+lk(r.m.close)+'</td></tr>'}).join('')
  +'<tr class="itot"><td></td><td class="nw"><b>Total</b></td><td></td><td></td><td><b>'+lk(tot.add)+'</b></td>'+visIdx.map(function(i){return'<td><b>'+lk(tot.it[i])+'</b></td>'}).join('')+'<td class="nw"><b>'+rf(tot.intr)+'</b></td><td class="nw"><b>'+rf(tot.intr/12/L.length)+'</b><div class="mu">avg / month</div></td><td></td><td></td></tr></table>';
}
let out=tbl;
if(!skipRc){
  const escA=Object.create(null);for(let k=0;k<visIdx.length;k++)escA[visIdx[k]]=escn(A[visIdx[k]].name);
  const kvMap=Object.create(null);
  const cards=L.map(function(r){
    kvMap[r.a]=function(){
      return'<span>Opening balance</span><b>'+rf(r.m.open)+'</b><span>Additions</span><b>'+rf(r.m.add)+'</b>'+visIdx.map(function(i){return'<span>'+escA[i]+' interest</span><b>'+(matDone(A[i],r,2)?'-':rf(r.it[i]))+'</b>'}).join('')+'<span>Interest earned</span><b>'+rf(r.m.intr)+'</b><span>Monthly income</span><b>'+rf(r.m.mi)+'</b><span>Yield on opening</span><b>'+pc(r.m.yl)+'</b><span>Year end balance</span><b>'+rf(r.m.close)+'</b>';
    };
    return'<details class="yc '+cls(r)+'" data-r="'+r.a+'"><summary><b>'+r.fy+'</b> · Age '+r.age[0]+'<br><span class="mu">Interest</span> <b>'+rf(r.m.intr)+'</b><div class="mu">Monthly income '+rf(r.m.mi)+'</div></summary><div class="kv" data-lazy-kv="int"></div></details>';
  }).join('');
  window.__vrIntLazyKv=kvMap;
  out=tbl+(tbl?'\n':'')+'<div class="rc">'+cards+'</div>';
}
if(!mode){try{Object.defineProperty(md,'_htmlKey',{value:cacheKey,enumerable:false,configurable:true,writable:true});Object.defineProperty(md,'_htmlVal',{value:out,enumerable:false,configurable:true,writable:true})}catch(e){md._htmlKey=cacheKey;md._htmlVal=out}}
return out};
document.addEventListener('toggle',function(e){
  const d=e.target;
  if(!d||d.tagName!=='DETAILS'||!d.open||!d.classList||!d.classList.contains('yc'))return;
  const kv=d.querySelector&&d.querySelector('.kv[data-lazy-kv="int"]');
  if(!kv||!window.__vrIntLazyKv)return;
  const fn=window.__vrIntLazyKv[+d.dataset.r];
  if(!fn)return;
  delete kv.dataset.lazyKv;
  kv.innerHTML=fn();
  if(window.RCOLS&&typeof window.RCOLS.applyCard==='function')window.RCOLS.applyCard(d,'int');
},true);
window.intTiles=function(){const SEL=repSel(),A=S.assets,idx=SEL.idx,md=intData(),D=md.D,rows=md.rows;if(!rows.length)return'';
const cs=rows.map(function(r){return intCalc(r,idx)}),tot=cs.reduce(function(t,c){return t+c.intr},0),rr=D.rows[D.ri];
const inc=idx.reduce(function(t,i){const mt=matOf(A[i],S);return t+rr.v[i]*(mt&&D.ri+1>=mt.row?0:A[i].ret)},0),last=D.rows[D.rows.length-1];
const card=function(l,v,sub){return'<div class="rpk-c"><div class="rpk-l">'+l+'</div><div class="rpk-v">'+(SEL.none?'—':v)+'</div><div class="rpk-s">'+(SEL.none?'No asset class selected':sub)+'</div></div>'};
return'<div class="rpk" role="group" aria-label="Interest summary">'+card('First-year interest ('+rows[0].fy+')',rf(cs[0].intr),'Monthly income: '+rf(cs[0].mi))
+card('Monthly income at retirement ('+rr.year+')',rf(inc/12),'Yearly: '+rf(inc)+' · Age: '+rr.age.join(' / '))
+card('Total interest till '+last.year,rf(tot),'Avg monthly income: '+rf(tot/12/rows.length))+'</div>'};
window.intCSV=function(){const q=function(v){return'"'+String(v).replace(/"/g,'""')+'"'},A=S.assets,idx=repSel().idx,visIdx=idx.filter(function(i){return !/pf\s*-?\s*post|pf\s*post\s*office/i.test(A[i].name)}),md=intData();
const h=['S.No','Financial year','Age (start)','Opening','Additions'].concat(visIdx.map(function(i){return A[i].name+' interest'}),['Interest earned','Monthly income','Yield on opening %','Year end balance']).map(q).join(',');
return[h].concat(md.rows.map(function(r){const m=intCalc(r,idx);return[r.a,q(r.fy),q(r.age.join(' / ')),Math.round(m.open),Math.round(m.add)].concat(visIdx.map(function(i){return Math.round(r.it[i])}),[Math.round(m.intr),Math.round(m.mi),m.yl==null?'':(m.yl*100).toFixed(2),Math.round(m.close)]).join(',')})).join('\n')};
})();