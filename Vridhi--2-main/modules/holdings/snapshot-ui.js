(function(){
var st={list:null,err:'',msg:'',loading:false,busy:false,t:0,label:'',from:'',to:'',q:'',open:null,od:null,filtered:false};
function h(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function money(v){var n=+v;return isFinite(n)?'\u20b9 '+n.toLocaleString('en-IN',{maximumFractionDigits:0}):'\u2014'}
function dt(s){var x=new Date(s);return isNaN(x)?'\u2014':x.toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function errMsg(e){var m=String(e&&e.message||'');if(/\b404\b/.test(m))return 'Snapshots are not set up yet. Run the latest supabase/schema.sql in Supabase (see DEPLOY.md), then reload.';if(e&&e.code==='permission_denied')return 'Not allowed. Sign out and sign in again, or run the latest supabase/schema.sql.';return m&&!/^http /.test(m)?m:'Something went wrong. Check your connection and try again.'}
function ymd(s,end){var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');if(!m)return null;var d=end?new Date(+m[1],m[2]-1,+m[3],23,59,59,999):new Date(+m[1],m[2]-1,+m[3],0,0,0,0);return isNaN(d)?null:d.toISOString()}
function query(){var f={from:ymd(st.from,false),to:ymd(st.to,true),q:st.q};if(f.from&&f.to&&f.from>f.to)throw new Error('The From date is after the To date.');st.filtered=!!(f.from||f.to||st.q.trim());return f}
async function refresh(){var f=query();st.list=await window.VRSB.snap.list(f);st.err='';st.t=Date.now()}
async function load(){if(st.loading||!window.VRSB)return;st.loading=true;try{await refresh()}catch(e){st.err=errMsg(e);st.t=Date.now();if(st.list===null)st.list=[]}finally{st.loading=false}paint()}
async function run(fn){st.busy=true;st.err='';st.msg='';paint();try{await fn()}catch(e){st.err=errMsg(e)}st.busy=false;paint()}
function holdTable(d){var A=(d&&d.assets)||[];if(!A.length)return '<p class="mu" style="margin:8px 0 0">This snapshot has no holdings.</p>';
 return '<table class="vr-sn-t"><thead><tr><th>Holding</th><th class="vr-r">Value</th></tr></thead><tbody>'+A.map(function(x){return '<tr><td>'+h(x.name)+'<div class="mu" style="font-size:11px">'+h(x.cat)+'</div></td><td class="vr-r">'+(x.type==='gratuity'?'\u2014':money(x.value))+'</td></tr>'}).join('')+'</tbody></table>'}
function top(){
 var top='<h2>Holding snapshots</h2><p class="mu" style="margin:2px 0 0">Save a dated copy of your current holdings in the database. Search copies by date and restore any of them later. Restoring first saves your current holdings, so nothing is lost.</p>'
  +'<div class="vr-sn-g"><label>Name for this snapshot (optional)<input id="vr-sn-lb" type="text" maxlength="60" placeholder="e.g. Before March rebalance" autocomplete="off" value="'+h(st.label)+'"></label><div class="vr-sn-b m0"><button type="button" class="p" data-sn="save">Save snapshot now</button></div></div>'
  +'<div class="sub2">Find a snapshot</div><div class="vr-sn-g"><div class="vr-sn-2"><label>From date<input id="vr-sn-fr" type="date" value="'+h(st.from)+'"></label><label>To date<input id="vr-sn-to" type="date" value="'+h(st.to)+'"></label></div><label>Name contains<input id="vr-sn-q" type="text" maxlength="60" autocomplete="off" value="'+h(st.q)+'"></label><div class="vr-sn-b m0"><button type="button" class="p" data-sn="search">Search</button><button type="button" data-sn="clear">Clear</button></div></div>';
 return top}
function res(){var dis=st.busy?' disabled':'';
 var note=(st.err?'<p class="er" role="alert">'+h(st.err)+'</p>':'')+(st.msg?'<p class="vr-ok" role="status">'+h(st.msg)+'</p>':'');
 if(st.list===null)return note+'<p class="mu">Loading\u2026</p>';
 var L=st.list.map(function(r){var o=st.open===r.id;
  return '<li class="vr-sn-i"><b>'+h(dt(r.created_at))+'</b>'+(r.label?' \u00b7 '+h(r.label):'')+'<div class="mu" style="margin-top:2px">'+(r.plan?'Plan: '+h(r.plan)+' \u00b7 ':'')+h(r.holdings_count)+' holding'+(+r.holdings_count===1?'':'s')+' \u00b7 Total '+h(money(r.total_value))+'</div>'
   +'<div class="vr-sn-b"><button type="button" data-sn="view" data-id="'+h(r.id)+'"'+dis+'>'+(o?'Hide holdings':'View holdings')+'</button><button type="button" class="p" data-sn="restore" data-id="'+h(r.id)+'"'+dis+'>Restore</button><button type="button" class="d" data-sn="del" data-id="'+h(r.id)+'"'+dis+'>Delete</button></div>'+(o&&st.od?holdTable(st.od):'')+'</li>'}).join('');
 var cnt=st.list.length,sum='<p class="mu" style="margin:12px 0 0">'+(cnt?cnt+' snapshot'+(cnt===1?'':'s')+(st.filtered?' match your search':'')+(cnt>=200?' (showing the latest 200)':'')+'.':(st.filtered?'No snapshots match your search.':'No snapshots yet. Press \u201cSave snapshot now\u201d to save the first one.'))+'</p>';
 return note+sum+(cnt?'<ul class="vr-sn-l">'+L+'</ul>':'')}
function body(){return top()+'<div id="vr-sn-r">'+res()+'</div>'}
function setv(id,v){var e=document.getElementById(id);if(e)e.value=v}
function paint(){var r=document.getElementById('vr-sn-r');if(r){r.innerHTML=res();return}var el=document.getElementById('vr-sn');if(el)el.innerHTML=body()}
document.addEventListener('input',function(e){var t=e.target;if(!t||!t.id||t.id.indexOf('vr-sn-')!==0)return;if(t.id==='vr-sn-lb')st.label=t.value;else if(t.id==='vr-sn-fr')st.from=t.value;else if(t.id==='vr-sn-to')st.to=t.value;else if(t.id==='vr-sn-q')st.q=t.value});
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target&&e.target.id==='vr-sn-q'&&!st.busy){e.preventDefault();run(refresh)}});
document.addEventListener('click',function(ev){var b=ev.target.closest&&ev.target.closest('[data-sn]');if(!b||!document.getElementById('vr-sn'))return;var a=b.dataset.sn,id=b.dataset.id;if(st.busy)return;
 if(a==='save'){var g=window.vrHoldings.get();if(!g.count){st.err='There are no holdings to save yet.';st.msg='';return paint()}
  return run(async function(){await window.VRSB.snap.create({label:st.label.trim(),plan:g.plan,count:g.count,total:g.total,data:g.data});st.label='';setv('vr-sn-lb','');st.msg='Snapshot saved ('+g.count+' holding'+(g.count===1?'':'s')+').';await refresh()})}
 if(a==='search')return run(refresh);
 if(a==='clear'){st.from=st.to=st.q='';setv('vr-sn-fr','');setv('vr-sn-to','');setv('vr-sn-q','');st.open=null;st.od=null;return run(refresh)}
 if(a==='view'){if(st.open===id){st.open=null;st.od=null;return paint()}
  return run(async function(){var r=await window.VRSB.snap.get(id);st.open=id;st.od=r.data})}
 if(a==='restore'){var row=(st.list||[]).filter(function(r){return r.id===id})[0],cur=window.vrHoldings.get(),when=row?dt(row.created_at):'this date';
  var msg='Restore the holdings saved on '+when+(row&&row.label?' ('+row.label+')':'')+'?\n\nYour current '+cur.count+' holding'+(cur.count===1?'':'s')+' will be replaced.'+(cur.count?' A snapshot of your current holdings is saved first, so you can come back to them.':'')+((row&&row.plan&&cur.plan&&row.plan!==cur.plan)?'\n\nNote: this copy was saved from the plan \u201c'+row.plan+'\u201d. You are now in \u201c'+cur.plan+'\u201d and its holdings will be replaced.':'');
  if(!confirm(msg))return;
  return run(async function(){var r=await window.VRSB.snap.get(id);if(!r.data||!Array.isArray(r.data.assets))throw new Error('This snapshot has no holdings.');
   if(cur.count)await window.VRSB.snap.create({label:('Auto: before restoring '+when).slice(0,120),plan:cur.plan,count:cur.count,total:cur.total,data:cur.data});
   window.vrHoldings.apply(r.data);st.open=null;st.od=null;st.msg='Holdings restored from '+when+'. Press Undo in the message at the bottom, or restore the \u201cAuto: before restoring\u201d snapshot to go back.';await refresh()})}
 if(a==='del'){if(!confirm('Delete this snapshot permanently? Your current holdings are not affected.'))return;
  return run(async function(){await window.VRSB.snap.remove(id);if(st.open===id){st.open=null;st.od=null}st.msg='Snapshot deleted.';await refresh()})}
});
window.snapUI=function(){if(!window.VRSB||!window.VRSB.snap||!window.vrHoldings)return '';
 if(!st.loading&&(st.list===null||Date.now()-st.t>5000))setTimeout(load,0);
 return '<div class="card vr-sn" id="vr-snc"><div id="vr-sn">'+body()+'</div></div>'};
})();