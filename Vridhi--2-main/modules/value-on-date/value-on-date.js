(function () {
'use strict';
var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'],
SHORT=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
ST={client:'',date:'',query:'',sort:'val',direction:-1,open:false,focusDate:'',viewYear:0,viewMonth:0,snapshots:{},loading:{},errors:{},models:{}},
DATE_KEY='vr-value-on-date';
function escape(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function parseDate(s){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');if(!m)return null;var y=+m[1],mo=+m[2],d=+m[3];return new Date(Date.UTC(y,mo-1,d)).getUTCMonth()===mo-1?{year:y,month:mo,day:d}:null}
function daysInMonth(y,m){return new Date(Date.UTC(y,m,0)).getUTCDate()}
function addDays(s,n){var p=parseDate(s);if(!p)return'';var d=new Date(Date.UTC(p.year,p.month-1,p.day+n));return isoDate(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate())}
function isoDate(y,m,d){return String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')}
function today(){var d=new Date();return isoDate(d.getFullYear(),d.getMonth()+1,d.getDate())}
function displayDate(s){if(typeof fdd==='function')return fdd(s+'T12:00:00');var p=parseDate(s);return p?MONTHS[p.month-1]+' '+p.day+', '+p.year:s}
function dateValue(rows,index,date,assets){
 var p=parseDate(date);if(!p)return null;
 var at=rows.findIndex(function(r){return r.calYear===p.year&&r.calMonth===p.month});
 if(at<0){var found=rows.findIndex(function(r){return r.label===SHORT[p.month-1]+' '+p.year});at=found}
 if(at<0)return null;
 var row=rows[at],value=row.v[index];if(value==null||!isFinite(+value))return null;
 value=+value;if(p.day===1)return value;
 var next=rows[at+1],target;
 if(next&&next.v[index]!=null&&isFinite(+next.v[index]))target=+next.v[index]-(+(next.ad&&next.ad[index])||0);
 else target=value*Math.pow(1+(+(assets[index]&&assets[index].ret)||0)/12,1);
 var fraction=(p.day-1)/daysInMonth(p.year,p.month);
 if(value>0&&target>0)return value*Math.pow(target/value,fraction);
 return value+(target-value)*fraction
}
function planList(){
 if(typeof S==='undefined'||!S)return[];
 if(window.gppClientList)window.gppClientList();
 if(window.gppSync)window.gppSync();
 var g=S.gpp;
 if(g&&g.profiles)return Object.keys(g.profiles).map(function(id){var p=g.profiles[id];return{id:id,name:String(p.name||id),active:id===g.active,state:p.d||{}}});
 return[{id:'current',name:window.gppActiveName?window.gppActiveName():'My portfolio',active:true,state:S}]
}
function selectedPlans(){
 var list=planList();if(ST.client==='all')return list;
 return list.filter(function(p){return p.id===ST.client})
}
function rangePlan(plans){
 return plans.filter(function(p){return p.id===ST.client})[0]||plans.filter(function(p){return p.active})[0]||plans[0]
}
function bounds(state){var start=+state.start,end=+state.end;return{min:isoDate(start,4,1),max:isoDate(end,3,31)}}
function inRange(date,state){var b=bounds(state);return date>=b.min&&date<=b.max}
function clamp(date,state){var b=bounds(state);return date<b.min?b.min:date>b.max?b.max:date}
function ensureState(){
 var list=planList();if(!list.length)return;
 if(!ST.client)ST.client=(list.filter(function(p){return p.active})[0]||list[0]).id;
 if(!list.some(function(p){return p.id===ST.client}))ST.client=(list.filter(function(p){return p.active})[0]||list[0]).id;
 var active=list.filter(function(p){return p.id===ST.client})[0]||list[0],stored='';
 try{stored=sessionStorage.getItem(DATE_KEY)||''}catch(e){}
 if(!ST.date){var wanted=stored&&parseDate(stored)?stored:today();ST.date=clamp(wanted,active.state)}
 if(!parseDate(ST.date))ST.date=clamp(today(),active.state);
 var dp=parseDate(ST.date);ST.viewYear=dp.year;ST.viewMonth=dp.month;
 if(!ST.focusDate)ST.focusDate=ST.date
}
function snapshotKey(plan,date){return plan.id+'|'+date}
function endOfDate(date){var p=parseDate(date);return p?new Date(p.year,p.month-1,p.day,23,59,59,999).toISOString():''}
function ensureSnapshots(plans,date){
 if(date>today()||!window.VRSB||!window.VRSB.snap||!window.VRSB.snap.values)return;
 plans.forEach(function(plan){
  var key=snapshotKey(plan,date);
  if(Object.prototype.hasOwnProperty.call(ST.snapshots,key)||ST.loading[key]||ST.errors[key])return;
  ST.loading[key]=true;
  window.VRSB.snap.values(plan.name,endOfDate(date)).then(function(rows){
   if(!Array.isArray(rows))throw new Error('Snapshot service returned an invalid response.');
   ST.snapshots[key]=rows;delete ST.loading[key]
  }).catch(function(e){delete ST.loading[key];ST.errors[key]=String(e&&e.message||'Could not load snapshots.')})
   .finally(function(){drawBody()})
 })
}
function nearestSnapshot(list,date,asset){
 var id=String(asset.id),best=null,bestAt='';
 list.forEach(function(snapshot){
  var day=typeof ymdLoc==='function'?ymdLoc(snapshot.created_at):String(snapshot.created_at||'').slice(0,10);
  if(!day||day>date||!snapshot.data||!Array.isArray(snapshot.data.assets))return;
  var found=snapshot.data.assets.find(function(x){return String(x.id)===id&&x.value!=null&&isFinite(+x.value)});
  if(found&&(!best||String(snapshot.created_at)>bestAt)){best={value:+found.value,date:day};bestAt=String(snapshot.created_at)}
 });
 return best
}
function snapshotBasis(snapshot){return snapshot?'Snapshot '+displayDate(snapshot.date):'Projected'}
function snapshotFor(plan,date,asset,asOf){return nearestSnapshot(ST.snapshots[snapshotKey(plan,asOf||date)]||[],date,asset)}
function policyState(plan){
 var globalState=typeof S==='undefined'?{}:S;
 return Object.assign({},plan.state,{gpp:{active:plan.id},polClients:globalState.polClients||plan.state.polClients,polGp:globalState.polGp!==false})
}
function model(plan){
 var signature=JSON.stringify(plan.state),cached=ST.models[plan.id];
 if(cached&&cached.signature===signature)return cached;
 var copy=JSON.parse(signature||'{}');
 var md=window.monthData(copy),next={signature:signature,rows:md.rows||[],assets:plan.state.assets||[],result:md};
 ST.models[plan.id]=next;return next
}
function planRows(plan,date,allowSnapshots,snapshotAsOf,selectedIds){
 var state=plan.state||{},assets=state.assets||[],selectedAssets=selectedIds?assets.filter(function(asset){return selectedIds.indexOf(String(asset.id))>-1}):assets,
 b=bounds(state),rows=[],excluded=0,notDated=0,mod=model(plan);
 if(date<b.min||date>b.max)return{rows:rows,excluded:0,notDated:0,total:selectedAssets.length,outside:true,policy:0,policyOn:false};
 assets.forEach(function(asset,index){
  if(selectedIds&&selectedIds.indexOf(String(asset.id))<0)return;
  var ca=asset.ca?((typeof ymdLoc==='function'?ymdLoc(asset.ca):String(asset.ca).slice(0,10))):'';
  if(ca&&ca>date){excluded++;return}
  if(!ca)notDated++;
  var val=dateValue(mod.rows,index,date,mod.assets),snap=allowSnapshots?snapshotFor(plan,date,asset,snapshotAsOf):null,basis=snapshotBasis(snap),
  entered=!snap&&date<=today()&&String(asset.edate||'').slice(0,10)===date&&val!=null&&Math.abs(+val-(+asset.value||0))<.5;
  if(snap)val=snap.value;
  else if(entered)basis='Entered'
  if(val==null)val=0;
  rows.push({client:plan.name,name:String(asset.name||'Holding'),cat:String(asset.cat||''),value:+val||0,basis:basis,id:String(asset.id),asset:asset})
 });
 var ps=policyState(plan),policyOn=!!(window.VRPolicy&&VRPolicy.hasPayouts('goal',ps)),policy=policyOn&&window.VRPolicy.receivedByDate?window.VRPolicy.receivedByDate(ps,date):0;
 return{rows:rows,excluded:excluded,notDated:notDated,total:selectedAssets.length,outside:false,policy:policy,policyOn:policyOn}
}
function compute(date,plans,allowSnapshots,snapshotAsOf,selectedIds){
 var rows=[],excluded=0,notDated=0,total=0,outside=0,policy=0,policyOn=false;
 plans.forEach(function(plan){
  var result=planRows(plan,date,allowSnapshots,snapshotAsOf,selectedIds);total+=result.total;
  if(result.outside){outside++;return}
  rows=rows.concat(result.rows);excluded+=result.excluded;notDated+=result.notDated;policy+=result.policy;
  policyOn=policyOn||result.policyOn
 });
 if(policyOn&&!selectedIds)rows.push({client:'',name:'Policy payouts received',cat:'Policy payout',value:policy,basis:date>today()?'Projected':'Entered',id:'policy',policy:true});
 var sum=rows.reduce(function(n,r){return n+r.value},0),basisRows=rows.filter(function(r){return!r.policy}),actualCount=basisRows.filter(function(r){return r.basis!=='Projected'}).length,
 snapCount=basisRows.filter(function(r){return/^Snapshot /.test(r.basis)}).length,
 basis=actualCount===basisRows.length&&basisRows.length?'Actual':actualCount?'Mixed':'Projected';
 if(date>today())basis='Projected';
 return{rows:rows,total:sum,holdings:rows.filter(function(r){return!r.policy}).length,allHoldings:total,excluded:excluded,notDated:notDated,outside:outside,policyOn:policyOn,basis:basis,snapCount:snapCount}
}
function csvCell(value){var s=String(value==null?'':value);return/[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function percent(value,total){return total?value/total*100:0}
function filtered(data){
 var q=ST.query.trim().toLowerCase(),rows=data.rows.filter(function(r){return!q||[r.client,r.name,r.cat,r.value,formatMoney(r.value),r.basis].join(' ').toLowerCase().indexOf(q)>-1});
 var keys={name:function(r){return r.name.toLowerCase()},cat:function(r){return r.cat.toLowerCase()},val:function(r){return r.value},pct:function(r){return percent(r.value,data.total)},basis:function(r){return r.basis.toLowerCase()}},key=keys[ST.sort]||keys.val;
 rows.sort(function(a,b){var x=key(a),y=key(b);return(x>y?1:x<y?-1:0)*ST.direction});
 return rows
}
function formatMoney(value){return typeof rf==='function'?rf(value):'₹ '+Math.round(+value||0).toLocaleString('en-IN')}
function selectedIds(){
 var selection=window.repSel();
 return selection.all?null:selection.idx.map(function(i){return String(S.assets[i].id)})
}
function snapshotMessage(plans,date){
 if(date>today()||!window.VRSB||!window.VRSB.snap||!window.VRSB.snap.values)return'';
 var selected=plans.filter(function(p){return ST.loading[snapshotKey(p,date)]}),failed=plans.map(function(p){return ST.errors[snapshotKey(p,date)]}).filter(Boolean);
 if(failed.length)return'<p class="er vod-alert" role="alert">Could not load holding snapshots: '+escape(failed[0])+' Values without a loaded snapshot use the projection engine.</p>';
 return selected.length?'<p class="mu vod-alert" role="status">Loading saved holding snapshots…</p>':''
}
function bodyHTML(plans){
 if(window.repSel().none)return window.repNone();
 var date=ST.date,actual=date<=today(),needsSnapshots=actual&&window.VRSB&&window.VRSB.snap&&window.VRSB.snap.values,
 ids=selectedIds(),selected=compute(date,plans,!!needsSnapshots,date,ids),p=parseDate(date),fyStart=isoDate(p.year-(p.month<4?1:0),4,1),fy=compute(fyStart,plans,!!needsSnapshots,date,ids),
 changes=selected.total-fy.total,rows=filtered(selected),tiles='<div class="rsum vod-summary" aria-label="Value on Date summary"><div><span class="mu">Total value on '+escape(displayDate(date))+'</span><b>'+formatMoney(selected.total)+'</b></div><div><span class="mu">Change since FY '+String(parseDate(fyStart).year)+' start</span><b>'+formatMoney(changes)+'</b></div><div><span class="mu">Holdings counted</span><b>'+selected.holdings+' of '+selected.allHoldings+'</b></div><div><span class="mu">Basis</span><b>'+escape(selected.basis)+'</b></div></div>',
 message=snapshotMessage(plans,date),note=(selected.excluded?'<p class="mu vod-note">'+selected.excluded+' holding'+(selected.excluded===1?' was':'s were')+' added after this date and not counted.</p>':'')+
 (selected.notDated?'<p class="mu vod-note">'+selected.notDated+' holding'+(selected.notDated===1?' has':'s have')+' no entry date and '+(selected.notDated===1?'is':'are')+' treated as present from the plan start.</p>':'')+
 (selected.outside?'<p class="er vod-alert" role="alert">'+selected.outside+' client plan'+(selected.outside===1?' is':'s are')+' outside its allowed date range and '+(selected.outside===1?'is':'are')+' not included.</p>':'');
 var datePlan=rangePlan(plans);
 if(datePlan&&(date<bounds(datePlan.state).min||date>bounds(datePlan.state).max))
  return tiles+message+'<div class="em">This date is outside the plan range. Choose a date between '+escape(displayDate(bounds(datePlan.state).min))+' and '+escape(displayDate(bounds(datePlan.state).max))+'.</div>';
 if(!selected.allHoldings)return tiles+message+'<div class="em">No holdings in this plan yet.</div>';
 if(!rows.length)return tiles+message+note+'<div class="em">No holdings existed on this date.</div>';
 var header=[['name','Holding'],['cat','Category'],['val','Value on date'],['pct','% of total'],['basis','Basis']],
 th=header.map(function(h){return'<th data-vod-col="'+h[0]+'" aria-sort="'+(ST.sort===h[0]?(ST.direction>0?'ascending':'descending'):'none')+'"><button type="button" data-vod-sort="'+h[0]+'" data-rk="'+h[0]+'">'+h[1]+(ST.sort===h[0]?(ST.direction>0?' ▲':' ▼'):'')+'</button></th>'}).join(''),
 tableRows=rows.map(function(r){return'<tr><td>'+escape(r.name)+'</td><td>'+escape(r.cat)+'</td><td class="vod-n">'+formatMoney(r.value)+'</td><td class="vod-n">'+percent(r.value,selected.total).toFixed(2)+'%</td><td>'+escape(r.basis)+'</td></tr>'}).join(''),
 total='<tr class="vr-tot"><td><b>Total</b></td><td></td><td class="vod-n"><b>'+formatMoney(selected.total)+'</b></td><td class="vod-n"><b>'+(selected.total? '100.00':'0.00')+'%</b></td><td></td></tr>',
 cards=rows.map(function(r){return'<details class="vr-scd"><summary><b>'+escape(r.name)+'</b><span>'+(columnVisible('cat')?escape(r.cat):'')+(r.client?' · '+escape(r.client):'')+'</span><em>'+formatMoney(r.value)+'</em></summary><dl>'+(columnVisible('cat')?'<dt>Category</dt><dd>'+escape(r.cat)+'</dd>':'')+'<dt>Value on date</dt><dd>'+formatMoney(r.value)+'</dd>'+(columnVisible('pct')?'<dt>Share of total</dt><dd>'+percent(r.value,selected.total).toFixed(2)+'%</dd>':'')+(columnVisible('basis')?'<dt>Basis</dt><dd>'+escape(r.basis)+'</dd>':'')+'</dl></details>'}).join(''),
 rowsInTable=tableRows+total;
 window.__vodFiltered=rows;
 return tiles+message+note+'<div class="mw vod-mw"><table class="rt vod-table" aria-label="Value on Date holdings"><thead><tr>'+th+'</tr></thead><tbody>'+rowsInTable+'</tbody></table><div class="vod-cards">'+cards+'<details class="vr-scd vod-total"><summary><b>Total</b><span>Portfolio value</span><em>'+formatMoney(selected.total)+'</em></summary><dl><dt>Holdings counted</dt><dd>'+selected.holdings+' of '+selected.allHoldings+'</dd><dt>Total value</dt><dd>'+formatMoney(selected.total)+'</dd></dl></details></div></div>'
}
function columnVisible(key){return !window.RCOLS||!window.RCOLS.vis||window.RCOLS.vis('vdate',key)}
function calendarMarkup(plans){
 var plan=rangePlan(plans),range=bounds((plan||{state:{start:0,end:0}}).state),
 offset=(new Date(Date.UTC(ST.viewYear,ST.viewMonth-1,1)).getUTCDay()+6)%7,days=daysInMonth(ST.viewYear,ST.viewMonth),
 prev=isoDate(ST.viewMonth===1?ST.viewYear-1:ST.viewYear,ST.viewMonth===1?12:ST.viewMonth-1,1),
 next=isoDate(ST.viewMonth===12?ST.viewYear+1:ST.viewYear,ST.viewMonth===12?1:ST.viewMonth+1,1),
 months=MONTHS.map(function(m,i){var ok=!(isoDate(ST.viewYear,i+1,daysInMonth(ST.viewYear,i+1))<range.min||isoDate(ST.viewYear,i+1,1)>range.max);return'<option value="'+(i+1)+'"'+(ST.viewMonth===i+1?' selected':'')+(ok?'':' disabled')+'>'+m+'</option>'}).join(''),
 years='';for(var y=+String(range.min).slice(0,4);y<=+String(range.max).slice(0,4);y++)years+='<option value="'+y+'"'+(ST.viewYear===y?' selected':'')+'>'+y+'</option>';
 var cells=[];for(var i=0;i<offset;i++)cells.push('<span class="vod-blank" aria-hidden="true"></span>');
 for(var d=1;d<=days;d++){var date=isoDate(ST.viewYear,ST.viewMonth,d),allowed=date>=range.min&&date<=range.max;
  cells.push('<button type="button" class="vod-day'+(date===ST.date?' is-selected':'')+(date===today()?' is-today':'')+'" data-vod="day" data-date="'+date+'" tabindex="'+(date===ST.focusDate?0:-1)+'"'+(allowed?'':' disabled')+' aria-pressed="'+(date===ST.date)+'" aria-label="'+escape(displayDate(date))+'">'+d+'</button>')}
 var quickToday=today(),fyYear=parseDate(quickToday).year-(parseDate(quickToday).month<4?1:0),quick=[['today','Today',quickToday],['fy-start','FY start',isoDate(fyYear,4,1)],['fy-end','FY end',isoDate(fyYear+1,3,31)],['retirement','Retirement date',isoDate((+plan.state.start)+Math.max(0,(+plan.state.ret)-(+((plan.state.members||[])[0]||{}).age)),4,1)]];
 return'<div class="vod-popover" id="vod-calendar" role="dialog" aria-label="Choose report date"'+(ST.open?'':' hidden')+'><div class="vod-cal-top"><button type="button" data-vod="prev" aria-label="Previous month"'+(prev<range.min.slice(0,7)+'-01'?' disabled':'')+'>‹</button><label><span class="sr-only">Month</span><select id="vod-month" aria-label="Month">'+months+'</select></label><label><span class="sr-only">Year</span><select id="vod-year" aria-label="Year">'+years+'</select></label><button type="button" data-vod="next" aria-label="Next month"'+(next>range.max.slice(0,7)+'-01'?' disabled':'')+'>›</button></div><div class="vod-week" aria-hidden="true">'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(function(x){return'<span>'+x+'</span>'}).join('')+'</div><div class="vod-days">'+cells.join('')+'</div><div class="vod-quick">'+quick.map(function(q){return'<button type="button" data-vod="quick" data-date="'+q[2]+'"'+(q[2]<range.min||q[2]>range.max?' disabled':'')+'>'+q[1]+'</button>'}).join('')+'</div></div>'
}
function reportMarkup(plans){
 var selected=rangePlan(plans),
 clientOpts='<option value="all"'+(ST.client==='all'?' selected':'')+'>All clients</option>'+planList().map(function(p){return'<option value="'+escape(p.id)+'"'+(ST.client===p.id?' selected':'')+'>'+escape(p.name)+(p.active?' (current)':'')+'</option>'}).join('');
 setTimeout(function(){drawBody()},0);
 return'<div class="card vod-page"><div class="rph2" data-rpx><div class="rpt"><h2>Value on Date</h2>'+(window.rptInfo?window.rptInfo('Portfolio value on a selected date. Future dates use the Monthly Portfolio Projection engine. On or before today, the nearest saved holding snapshot on or before that date is used when available; otherwise the projection engine is used. A holding added after the date is excluded. Daily values between monthly projection rows are accrued from the engine values; the first of each month matches the Monthly Portfolio Projection report.','About this report'):'')+'</div>'+(window.rptCsv?window.rptCsv('csv'):'<button type="button" id="csv">Copy as CSV</button>')+'</div><div class="tb vod-toolbar"><label class="vod-select-label" for="vod-client">Client</label><select id="vod-client" aria-label="Client">'+clientOpts+'</select><div class="vod-date-wrap"><span class="vod-select-label">Date</span><button type="button" class="vod-date" data-vod="toggle" aria-haspopup="dialog" aria-label="Choose report date, '+escape(displayDate(ST.date))+'" aria-expanded="'+ST.open+'">'+escape(displayDate(ST.date))+' <span aria-hidden="true">▾</span></button>'+calendarMarkup(plans)+'</div></div>'+window.rsDrops()+'<div class="tb vod-tools"><input id="vod-q" type="search" aria-label="Search holdings" placeholder="Search holding, category, basis…" value="'+escape(ST.query)+'"></div><div id="rr"><div id="vod-body">'+bodyHTML(plans)+'</div></div></div>'
}
function drawBody(){
 var p=document.getElementById('vod-body');if(!p)return;
 var plans=selectedPlans();if(!window.repSel().none)ensureSnapshots(plans,ST.date);p.innerHTML=bodyHTML(plans);
 if(window.RCOLS&&document.getElementById('rr'))window.RCOLS.apply(document.getElementById('rr'),'vdate')
}
function setDate(date){
 var parsed=parseDate(date),plan=rangePlan(selectedPlans());if(!parsed||!plan||!inRange(date,plan.state))return false;
 ST.date=date;ST.focusDate=date;ST.viewYear=parsed.year;ST.viewMonth=parsed.month;ST.open=false;
 try{sessionStorage.setItem(DATE_KEY,date)}catch(e){}
 drawBody();paintCalendar(false);var button=document.querySelector('.vod-date');if(button)button.focus();
 return true
}
function updateDateButton(){
 var button=document.querySelector('.vod-date');if(!button)return;
 button.setAttribute('aria-label','Choose report date, '+displayDate(ST.date));
 button.setAttribute('aria-expanded',String(ST.open));
 button.innerHTML=escape(displayDate(ST.date))+' <span aria-hidden="true">▾</span>'
}
function paintCalendar(focus){
 var plans=selectedPlans(),host=document.getElementById('vod-calendar');if(!host)return;
 host.outerHTML=calendarMarkup(plans);
 updateDateButton();
 if(focus){var day=document.querySelector('#vod-calendar [data-date="'+ST.focusDate+'"]');if(day)day.focus()}
}
function setMonth(y,m,focus){
 var plan=rangePlan(selectedPlans());if(!plan)return;
 var date=isoDate(y,m,Math.min(parseDate(ST.focusDate||ST.date).day,daysInMonth(y,m)));
 if(date<bounds(plan.state).min)date=bounds(plan.state).min;
 if(date>bounds(plan.state).max)date=bounds(plan.state).max;
 var p=parseDate(date);ST.viewYear=p.year;ST.viewMonth=p.month;ST.focusDate=date;paintCalendar(focus!==false)
}
function csvForRows(rows,total){
 var q=csvCell,out=[['Holding','Category','Value on date','% of total','Basis'].map(q).join(',')];
 rows.forEach(function(r){out.push([r.name,r.cat,Math.round(r.value),percent(r.value,total).toFixed(2)+'%',r.basis].map(q).join(','))});
 out.push(['Total','',Math.round(total),total?'100.00%':'0.00%',''].map(q).join(','));
 return out.join('\r\n')
}
function reportRowsCsv(){var data=compute(ST.date,selectedPlans(),ST.date<=today(),ST.date,selectedIds());return csvForRows(filtered(data),data.total)}
window.valueOnDateCSV=reportRowsCsv;
window.VRValueDate={parseDate:parseDate,daysInMonth:daysInMonth,addDays:addDays,dateValue:dateValue,nearestSnapshot:nearestSnapshot,snapshotBasis:snapshotBasis,csvForRows:csvForRows,compute:compute,csvCell:csvCell};
window.repValueOnDate=function(){ensureState();var plans=selectedPlans();if(!window.repSel().none)ensureSnapshots(plans,ST.date);return reportMarkup(plans)};
document.addEventListener('change',function(e){
 var t=e.target;if(!t||!t.id)return;
 if(t.id==='vod-client'){
  ST.client=t.value;var selected=rangePlan(selectedPlans()),date=selected?clamp(ST.date,selected.state):ST.date;ST.date=date;
  try{sessionStorage.setItem(DATE_KEY,date)}catch(x){}
  drawBody();paintCalendar(false)
 }else if(t.id==='vod-month'){setMonth(ST.viewYear,+t.value,false);var month=document.getElementById('vod-month');if(month)month.focus()}
 else if(t.id==='vod-year'){setMonth(+t.value,ST.viewMonth,false);var year=document.getElementById('vod-year');if(year)year.focus()}
});
document.addEventListener('input',function(e){if(e.target&&e.target.id==='vod-q'){ST.query=e.target.value;drawBody()}});
document.addEventListener('click',function(e){
 var csv=e.target.closest&&e.target.closest('#csv');
 if(csv&&typeof UI!=='undefined'&&UI.rv==='vdate'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(window.repSel().none){toast('Please select at least one investment.');return}text('Value on Date CSV',reportRowsCsv())}
},true);
document.addEventListener('click',function(e){
 var sort=e.target.closest&&e.target.closest('[data-vod-sort]');
 if(sort){var key=sort.dataset.vodSort;ST.direction=ST.sort===key?-ST.direction:1;ST.sort=key;drawBody();return}
 var t=e.target.closest&&e.target.closest('[data-vod]');if(!t){if(ST.open&&!e.target.closest('.vod-date-wrap')){ST.open=false;var cal=document.getElementById('vod-calendar'),b=document.querySelector('.vod-date');if(cal)cal.hidden=true;if(b)b.setAttribute('aria-expanded','false')}return}
 var action=t.dataset.vod;
 if(action==='toggle'){ST.open=!ST.open;var cal=document.getElementById('vod-calendar');if(cal)cal.hidden=!ST.open;t.setAttribute('aria-expanded',String(ST.open));if(ST.open){ST.focusDate=ST.date;setTimeout(function(){var b=document.querySelector('#vod-calendar [data-date="'+ST.date+'"]');if(b)b.focus()},0)}}
 else if(action==='day'||action==='quick'){setDate(t.dataset.date)}
 else if(action==='prev'||action==='next'){var step=action==='prev'?-1:1,idx=ST.viewYear*12+ST.viewMonth-1+step;setMonth(Math.floor(idx/12),idx%12+1,true)}
});
document.addEventListener('keydown',function(e){
 var cal=e.target.closest&&e.target.closest('#vod-calendar');if(!cal||!ST.open)return;
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();ST.open=false;var p=document.getElementById('vod-calendar'),b=document.querySelector('.vod-date');if(p)p.hidden=true;if(b){b.setAttribute('aria-expanded','false');b.focus()}return}
 var target=e.target.closest('[data-vod="day"]');
 if(target&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].indexOf(e.key)>-1){
  e.preventDefault();var offset=e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:e.key==='ArrowUp'?-7:7,
  candidate=addDays(ST.focusDate||target.dataset.date,offset),plan=rangePlan(selectedPlans());
  if(plan)candidate=clamp(candidate,plan.state);
  ST.focusDate=candidate;var p=parseDate(candidate);ST.viewYear=p.year;ST.viewMonth=p.month;paintCalendar(true)
 }else if(target&&(e.key==='Enter'||e.key===' ')){e.preventDefault();setDate(ST.focusDate||target.dataset.date)}
},true);
})();
