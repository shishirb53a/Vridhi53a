
/* Reports > Holdings Entry Register: when each holding was added, for every Goal Planner client.
   Read-only. It uses the plan data that is already saved to the database (field "ca" on each holding),
   the same data the optional SQL view public.vr_holdings_added exposes. */
(function(){
var ST={c:'',r:'all',q:'',k:'ca',d:-1},CA=null,DAY=864e5;
function ts(s){var t=s?new Date(s).getTime():NaN;return isNaN(t)?null:t}
function fyStart(){var n=new Date(),y=n.getMonth()>=3?n.getFullYear():n.getFullYear()-1;return new Date(y,3,1).getTime()}
function load(){
 var L=(window.gppHoldingList&&window.gppHoldingList())||[],all=[];
 L.forEach(function(c){c.items.forEach(function(x){all.push({cid:c.id,client:c.name,active:c.active,name:x.name,cat:x.cat,val:x.val,ca:x.ca||'',ma:x.ma||'',t:ts(x.ca),tm:ts(x.ma)})})});
 return{L:L,all:all}
}
function pick(){
 var d=CA||(CA=load()),now=Date.now(),
 base=d.all.filter(function(o){return!ST.c||o.cid===ST.c}),
 inR=function(o){var r=ST.r;if(r==='all')return true;if(r==='unset')return o.t==null;if(o.t==null)return false;if(r==='30')return now-o.t<=30*DAY;if(r==='90')return now-o.t<=90*DAY;if(r==='fy')return o.t>=fyStart();return true},
 q=(ST.q||'').trim().toLowerCase(),
 L=base.filter(inR).filter(function(o){return!q||[o.client,o.name,o.cat,o.t==null?'not set':fdd(o.ca),f(o.val)].join(' ').toLowerCase().indexOf(q)>-1}),
 key=function(o){return ST.k==='ca'?o.t:ST.k==='ma'?o.tm:ST.k==='val'?o.val:String(o[ST.k]||'').toLowerCase()};
 L.sort(function(x,y){var a=key(x),b=key(y);if(a==null&&b==null)return x.name<y.name?-1:1;if(a==null)return 1;if(b==null)return -1;return(a>b?1:a<b?-1:0)*ST.d});
 return{d:d,base:base,L:L,now:now}
}
var dt=function(o){return o.t==null?'<span class="mu">Not set</span>':esc(fdd(o.ca))};
function bodyHTML(p){
 var L=p.L,base=p.base,n=base.length,dated=base.filter(function(o){return o.t!=null}).length,
 last30=base.filter(function(o){return o.t!=null&&p.now-o.t<=30*DAY}).length,
 sum=L.reduce(function(q,o){return q+o.val},0),
 tiles='<div class="rsum" aria-label="Entry date summary"><div><span class="mu">Holdings'+(ST.c?' (this client)':' (all clients)')+'</span><b>'+n+'</b></div><div><span class="mu">With an entry date</span><b>'+dated+'</b></div><div><span class="mu">Entry date not set</span><b>'+(n-dated)+'</b></div><div><span class="mu">Added in the last 30 days</span><b>'+last30+'</b></div><div><span class="mu">Value of holdings shown</span><b>'+rf(sum)+'</b></div></div>';
 if(!L.length)return tiles+'<div class="em">No holdings match your filters.</div>';
 var th=function(k,t,r){return'<th'+(r?' class="ent-n"':'')+' aria-sort="'+(ST.k===k?(ST.d>0?'ascending':'descending'):'none')+'"><button type="button" data-ek="'+k+'">'+t+(ST.k===k?(ST.d>0?' ▲':' ▼'):'')+'</button></th>'},
 head='<tr>'+th('ca','Entry date')+th('client','Client')+th('name','Holding')+th('cat','Category')+th('val','Current value',1)+th('ma','Last edited',1)+'</tr>',
 rows=L.map(function(o){return'<tr><td>'+dt(o)+'</td><td>'+esc(o.client)+'</td><td>'+esc(o.name)+'</td><td>'+esc(o.cat)+'</td><td class="ent-n">'+rf(o.val)+'</td><td class="ent-n">'+(o.tm==null?'—':esc(fdd(o.ma)))+'</td></tr>'}).join('')+'<tr class="vr-tot"><td></td><td></td><td><b>Total shown ('+L.length+')</b></td><td></td><td class="ent-n"><b>'+rf(sum)+'</b></td><td></td></tr>',
 cards='<div class="ent-cards">'+L.map(function(o){return'<details class="vr-scd"><summary><b>'+esc(o.name)+'</b><span>'+esc(o.client)+' · '+(o.t==null?'Entry date not set':'Added '+esc(fdd(o.ca)))+'</span><em>'+rf(o.val)+'</em></summary><dl><dt>Entry date</dt><dd>'+dt(o)+'</dd><dt>Client</dt><dd>'+esc(o.client)+'</dd><dt>Category</dt><dd>'+esc(o.cat)+'</dd><dt>Last edited</dt><dd>'+(o.tm==null?'—':esc(fdd(o.ma)))+'</dd></dl></details>'}).join('')+'</div>';
 return tiles+'<div class="mw"><table class="rt ent-t" aria-label="Holdings by entry date">'+head+rows+'</table>'+cards+'</div>'
}
window.repEnt=function(){
 CA=load();var p=pick(),d=p.d,
 head='';
 if(!d.all.length)return head+'<div class="card"><div class="em">No holdings yet. Add a holding and its entry date will appear here.</div></div>';
 var so=[['ca','Entry date'],['client','Client'],['name','Holding'],['cat','Category'],['val','Current value'],['ma','Last edited']],
 rg=[['all','Added: any time'],['30','Added: last 30 days'],['90','Added: last 90 days'],['fy','Added: this financial year'],['unset','Entry date not set']];
 return head+'<div class="card vr-entpg"><div class="rph2" data-rpx><div class="rpt"><h2>Holdings Entry Register</h2>'+(window.rptInfo||function(){return''})('When each holding was added, across all your clients. Holdings added before dates were tracked show “Not set”: open the holding and choose its Entry date. · Entry date = the date you added the holding (set it in Add/Edit holding → Entry date) · “Not set” = added before dates were tracked · click a heading to sort · the same data is in the optional database view vr_holdings_added','About this table')+'</div>'+(window.rptCsv?window.rptCsv('entcsv'):'<button id="entcsv" type="button">Copy as CSV</button>')+'</div>'+
  '<div class="tb"><select id="entc" aria-label="Client"><option value="">All clients</option>'+d.L.map(function(c){return'<option value="'+esc(c.id)+'"'+(ST.c===c.id?' selected':'')+'>'+esc(c.name)+(c.active?' (current)':'')+'</option>'}).join('')+'</select>'+
  '<select id="entr" aria-label="Added in">'+rg.map(function(r){return'<option value="'+r[0]+'"'+(ST.r===r[0]?' selected':'')+'>'+r[1]+'</option>'}).join('')+'</select></div>'+
  '<div class="tb"><input id="entq" type="search" placeholder="Search holding, client, category…" aria-label="Search holdings" value="'+esc(ST.q)+'"><select id="ents" aria-label="Sort by">'+so.map(function(r){return'<option value="'+r[0]+'"'+(ST.k===r[0]?' selected':'')+'>Sort: '+r[1]+'</option>'}).join('')+'</select><button id="entd" type="button" aria-label="Toggle sort direction">'+(ST.d>0?'▲':'▼')+'</button></div>'+
  '<div id="ent-body">'+bodyHTML(p)+'</div></div>'
};
document.addEventListener('change',function(e){var t=e.target;if(!t||!t.id)return;
 if(t.id==='entc'){ST.c=t.value;render()}
 else if(t.id==='entr'){ST.r=t.value;render()}
 else if(t.id==='ents'){ST.k=t.value;ST.d=(t.value==='ca'||t.value==='val'||t.value==='ma')?-1:1;render()}});
document.addEventListener('input',function(e){var t=e.target;if(t&&t.id==='entq'){ST.q=t.value;var b=document.getElementById('ent-body');if(b)b.innerHTML=bodyHTML(pick())}});
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-ek],#entd,#entcsv');if(!t)return;
 if(t.id==='entd'){ST.d=-ST.d;render();return}
 if(t.dataset&&t.dataset.ek){var k=t.dataset.ek;if(ST.k===k)ST.d=-ST.d;else{ST.k=k;ST.d=(k==='ca'||k==='val'||k==='ma')?-1:1}render();return}
 if(t.id==='entcsv'){var p=pick(),q=function(v){v=String(v==null?'':v);return/[",\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v},
  lines=[['Entry date','Client','Holding','Category','Current value','Last edited'].map(q).join(',')].concat(p.L.map(function(o){return[o.t==null?'':ymdLoc(o.ca),o.client,o.name,o.cat,Math.round(o.val),o.tm==null?'':ymdLoc(o.ma)].map(q).join(',')})),
  txt=lines.join('\r\n'),done=function(){var s=t.textContent;t.textContent='Copied';setTimeout(function(){t.textContent=s},1500)};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(done,function(){fb()});else fb();
  function fb(){var a=document.createElement('textarea');a.value=txt;a.style.cssText='position:fixed;opacity:0';document.body.appendChild(a);a.select();try{document.execCommand('copy');done()}catch(x){}a.remove()}}});
window.repEntData=function(){return pick()};
})();
