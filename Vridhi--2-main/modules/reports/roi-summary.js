(function(){
window.rowRoi=function(r){const A=S.assets,t=r.v.reduce(function(s,x){return s+(x||0)},0);return t>0?r.v.reduce(function(s,x,i){return s+(x||0)*A[i].ret},0)/t:null};
window.rowRoiTxt=function(r){const x=rowRoi(r);return x==null?'—':(x*100).toFixed(2)+'%'};
window.rowRoiPct=function(r){const x=rowRoi(r);return x==null?'':(x*100).toFixed(2)};
window.rsTiles=function(){if(UI.rv==='int')return window.intTiles();const SEL=repSel(),A=S.assets,idx=SEL.idx,D=calc(S),R=D.rows;
const st=function(r){return idx.reduce(function(s,i){return s+r.v[i]},0)};
const rate=function(r){const t=st(r);return t>0?idx.reduce(function(s,i){return s+r.v[i]*A[i].ret},0)/t:null};
const pc=function(x){return x==null?'—':(x*100).toFixed(2)+'%'};
const a0=R[0],b0=R[D.ri],c0=R[R.length-1];
const card=function(l,r,sub){return'<div class="rpk-c"><div class="rpk-l">'+l+'</div><div class="rpk-v">'+(SEL.none?'—':rf(st(r)))+'</div><div class="rpk-s">'+(SEL.none?'No asset class selected':sub)+'</div></div>'};
return'<div class="rpk" role="group" aria-label="Forecast summary">'+card('Starting portfolio ('+a0.year+')',a0,'Blended ROI: '+pc(rate(a0)))+card('Retirement target ('+b0.year+')',b0,'Age: '+b0.age.join(' / '))+card('Projected corpus ('+c0.year+')',c0,'Blended ROI: '+pc(rate(c0)))+'</div>'};
})();