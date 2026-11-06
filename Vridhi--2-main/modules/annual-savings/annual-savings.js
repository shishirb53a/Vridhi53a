
/* Reports > Annual Savings Schedule: what you put in each financial year (Apr-Mar), by category. No interest, no balances.
   Uses the same filters, search and sort as the other reports (asset class, holding, search box, sort, click a heading). */
(function(){
function fyLab(y){return 'FY '+y+'-'+String(y+1).slice(2)}
function data(){
 var SEL=repSel(),D=calc(S),A=S.assets,R=D.rows,cats=[],out=[];
 for(var a=2;a<=R.length;a++){
  var y=S.start+a-2,by={},tot=0;
  SEL.idx.forEach(function(i){var x=A[i];if(x.type==='gratuity')return;var k=fyInfo(x,S,a),v=k.act?(k.yp?x.add:0)+(x.madd||0)*k.n:0;if(v>0){by[x.cat]=(by[x.cat]||0)+v;tot+=v;if(cats.indexOf(x.cat)<0)cats.push(x.cat)}});
  out.push({a:a,fy:fyLab(y),age:R[a-1].age.join(' / '),a0:R[a-1].age[0],by:by,tot:tot,ret:a-1===D.ri,chk:R[a-1].add}); /* age = age at the END of the financial year, same as Annual Portfolio Projection and the 'At retirement (age N)' figure */
 }
 var ord=CATS||[];cats.sort(function(p,q){var i=ord.indexOf(p),j=ord.indexOf(q);return(i<0?99:i)-(j<0?99:j)});
 if(window.RCOLS&&RCOLS.catOrder)cats=RCOLS.catOrder(cats);
 return {sel:SEL,rows:out,cats:cats,ri:D.ri}
}
function keyOk(k,cats){return k==='a'||k==='fy'||k==='age'||k==='tot'||(k.slice(0,2)==='c:'&&cats.indexOf(k.slice(2))>-1)}
function view(){
 var d=data(),rk=keyOk(UI.rk,d.cats)?UI.rk:'a',q=(UI.rq||'').trim().toLowerCase(),
 key=function(o){return rk==='a'||rk==='fy'?o.a:rk==='age'?o.a0:rk==='tot'?o.tot:(o.by[rk.slice(2)]||0)},
 L=d.rows.filter(function(o){return!q||[o.a-1,o.fy,o.age].concat(d.cats.map(function(c){return o.by[c]?f(o.by[c]):''}),[f(o.tot)]).join(' ').toLowerCase().indexOf(q)>-1});
 L.sort(function(x,y){var a=key(x),b=key(y);return(a>b?1:a<b?-1:0)*UI.rd});
 d.L=L;d.rk=rk;return d}
var m=function(n){return n>0?rf(n):'—'};
window.repSavRows=function(){
 var d=view();if(d.sel.none)return window.repNone();
 var cats=d.cats,rk=d.rk;
 if(!cats.length)return '<div class="em">No savings for the selected holdings. Pick holdings that have a yearly or monthly addition.</div>';
 if(!d.L.length)return '<div class="em">No years match your search.</div>';
 var all=d.rows.reduce(function(q,o){return q+o.tot},0),ct=cats.map(function(c){return d.rows.reduce(function(q,o){return q+(o.by[c]||0)},0)}),
 th=function(k,t){return '<th aria-sort="'+(rk===k?(UI.rd>0?'ascending':'descending'):'none')+'"><button data-rk="'+k+'">'+t+(rk===k?(UI.rd>0?' ▲':' ▼'):'')+'</button></th>'},
 head='<tr>'+th('a','S.No')+th('fy','Financial year')+th('age','Age<br>'+S.members.map(function(x){return escn(x.name)}).join(' / '))+cats.map(function(c){return th('c:'+c,escn(c))}).join('')+th('tot','Total saved<br>in the year')+'</tr>',
 body=d.L.map(function(o){return '<tr class="'+(o.ret?'vr-ret':'')+'"><td>'+(o.a-1)+'</td><td>'+o.fy+'</td><td>'+(o.ret?'<span class="rtg">Retired</span> ':'')+o.age+'</td>'+cats.map(function(c){return '<td>'+m(o.by[c])+'</td>'}).join('')+'<td><b>'+m(o.tot)+'</b></td></tr>'}).join('')+
  '<tr class="vr-tot"><td></td><td><b>Total, all years</b></td><td></td>'+ct.map(function(n){return '<td><b>'+m(n)+'</b></td>'}).join('')+'<td><b>'+rf(all)+'</b></td></tr>',
 cards='<div class="vr-sc">'+d.L.map(function(o){return '<details class="vr-scd'+(o.ret?' vr-ret':'')+'"><summary><b>'+o.fy+'</b><span>Age '+o.age+'</span><em>'+(o.tot>0?'Saved '+rf(o.tot):'No savings')+'</em></summary>'+(o.tot>0?'<dl>'+cats.filter(function(c){return o.by[c]>0}).map(function(c){return '<dt>'+escn(c)+'</dt><dd>'+rf(o.by[c])+'</dd>'}).join('')+'</dl>':'')+(o.ret?'<p class="rtg">Retirement year</p>':'')+'</details>'}).join('')+
  '<div class="vr-scd vr-tc"><b>Total, all years</b><dl>'+cats.map(function(c,i){return '<dt>'+escn(c)+'</dt><dd>'+m(ct[i])+'</dd>'}).join('')+'<dt><b>All categories</b></dt><dd><b>'+rf(all)+'</b></dd></dl></div></div>';
 return '<table class="rt rs" aria-label="Annual savings schedule">'+head+body+'</table>'+cards};
window.repSav=function(){
 var d=view(),A=S.assets,cats=d.cats,
 head='',
 so=[['a','S.No'],['fy','Financial year'],['age','Age']].concat(cats.map(function(c){return ['c:'+c,c]}),[['tot','Total saved in the year']]);
 var upto=d.rows.filter(function(o){return o.a-1<=d.ri}),tillRet=upto.reduce(function(q,o){return q+o.tot},0),all=d.rows.reduce(function(q,o){return q+o.tot},0),sy=d.rows.filter(function(o){return o.tot>0}),first=sy[0],last=sy[sy.length-1],avg=sy.length?all/sy.length:0,
 sum=(d.sel.none||!cats.length)?'':'<div class="rsum" aria-label="Savings summary"><div><span class="mu">Saved till retirement</span><b>'+rf(tillRet)+'</b></div><div><span class="mu">Saved in the whole plan</span><b>'+rf(all)+'</b></div><div><span class="mu">Saving years</span><b>'+sy.length+'</b><span class="mu">'+(first?first.fy+' to '+last.fy:'')+'</span></div><div><span class="mu">Average per saving year</span><b>'+rf(avg)+'</b></div></div>';
 return head+'<div class="card vr-savpg"><div class="rph2" data-rpx><div class="rpt"><h2>Annual Savings Schedule</h2>'+(window.rptInfo||function(){return''})('Money you put in each financial year (April to March), by category. Interest is not included. · Category = the category you gave each holding · savings are yearly plus monthly additions · totals match the Amount deposited column in Annual Portfolio Projection · Age = age at the end of the financial year · Retired = the year you reach your retirement age · click a heading to sort','About this table')+'</div>'+(window.rptCsv?window.rptCsv('savcsv'):'<button id="savcsv" type="button">Copy as CSV</button>')+'</div>'+window.rsDrops()+sum+
  '<div class="tb"><input id="rq" type="search" placeholder="Search year, age, amount…" aria-label="Search savings" value="'+esc(UI.rq)+'"><select id="rsf" aria-label="Sort by">'+so.map(function(p){return '<option value="'+esc(p[0])+'"'+(d.rk===p[0]?' selected':'')+'>Sort: '+esc(p[1])+'</option>'}).join('')+'</select><button id="rsd" aria-label="Toggle sort direction">'+(UI.rd>0?'▲':'▼')+'</button></div>'+
  '<div id="rr" class="mw">'+window.repSavRows()+'</div></div>'};
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#savcsv');if(!b)return;
 var d=view(),q=function(v){v=String(v==null?'':v);return /[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v},
 lines=[['Financial year','Age'].concat(d.cats,['Total saved in the year']).map(q).join(',')].concat(d.L.map(function(o){return [o.fy,o.age].concat(d.cats.map(function(c){return Math.round(o.by[c]||0)}),[Math.round(o.tot)]).map(q).join(',')}));
 lines.push(['Total, all years',''].concat(d.cats.map(function(c){return Math.round(d.rows.reduce(function(s,o){return s+(o.by[c]||0)},0))}),[Math.round(d.rows.reduce(function(s,o){return s+o.tot},0))]).map(q).join(','));
 var txt=lines.join('\r\n'),done=function(){var t=b.textContent;b.textContent='Copied';setTimeout(function(){b.textContent=t},1500)};
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(done,function(){fb()});else fb();
 function fb(){var t=document.createElement('textarea');t.value=txt;t.style.cssText='position:fixed;opacity:0';document.body.appendChild(t);t.select();try{document.execCommand('copy');done()}catch(x){}t.remove()}});
window.repSavData=function(){var d=view();return d};
})();
