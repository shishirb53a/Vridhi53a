(function(){
/* Goal Planner clients (build 84): S.gpp = { active, profiles: { id: { name, d: {members,start,end,ret,retP,hor,goal,link,grat,assets}, created } } }.
   The top-level fields of S stay the ACTIVE person's (a mirror), so every Goal Planner view and calculation is unchanged;
   save() copies them into the active profile and switching copies a profile back into S. */
const MAXP=12,KEYS=GPP_KEYS;
const slug=n=>String(n).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,24)||'client';
const nm=n=>String(n==null?'':n).replace(/\s+/g,' ').trim().slice(0,30);
const snap=s=>{const o={};for(const k of KEYS)o[k]=JSON.parse(JSON.stringify(s[k]));return o};
const defName=()=>{try{const m=S.members&&S.members[0],n=m&&nm(m.name);if(n&&n.toLowerCase()!=='self')return n}catch(e){}return'My portfolio'};
let drawerOpen=false,drawerCloseTimer=0;
function translate(key){return typeof tr==='function'?tr(key):key}
function ensure(){
  if(typeof S==='undefined'||!S)return null;
  let P=S.gpp;
  if(!P||!P.profiles||!Object.keys(P.profiles).length){const n=defName(),id=slug(n);P=S.gpp={active:id,profiles:{[id]:{name:n,d:snap(S),created:Date.now()}}}}
  if(!Object.prototype.hasOwnProperty.call(P.profiles,P.active))P.active=Object.keys(P.profiles)[0];
  return P}
window.gppSync=function(){const P=S&&S.gpp;if(P&&P.profiles&&P.profiles[P.active])P.profiles[P.active].d=snap(S)};
const list=()=>{const P=ensure();return P?Object.keys(P.profiles).map(id=>Object.assign({id,active:id===P.active},P.profiles[id])):[]};
const taken=(n,P,ex)=>Object.keys(P.profiles).some(id=>id!==ex&&P.profiles[id].name.toLowerCase()===n.toLowerCase());
const uid=(n,P)=>{const b=slug(n);let id=b,i=2;while(id in Object.prototype||Object.prototype.hasOwnProperty.call(P.profiles,id))id=b.slice(0,20)+'-'+i++;return id};
const fresh=n=>{const d=DEF();return{members:[MB(1,n,'Self',d.members[0].age)],start:d.start,end:d.end,ret:d.ret,retP:d.retP,hor:d.hor,goal:d.goal,link:false,grat:{basic:0,svc:0,rem:0,cap:0},policies:[],assets:[]}};

function sw(id,tab){
  const P=ensure();if(!P||!Object.prototype.hasOwnProperty.call(P.profiles,id))return false;
  window.gppSync();P.active=id;Object.assign(S,JSON.parse(JSON.stringify(P.profiles[id].d)));
  UI.q='';UI.cat='All';UI.sel=null;UI.rq='';UI.rsel=undefined;UI.rcl=undefined;
  if(tab)UI.tab=tab;save();render();return true}
function add(name){
  const P=ensure(),n=nm(name);if(!P)return'Could not add the person.';if(!n)return'Enter a name.';
  if(Object.keys(P.profiles).length>=MAXP)return'You can keep up to '+MAXP+' people.';
  if(taken(n,P))return'A person with this name already exists.';
  const id=uid(n,P);window.gppSync();P.profiles[id]={name:n,d:fresh(n),created:Date.now()};sw(id,'Holdings');return''}
function ren(id,name){const P=ensure(),n=nm(name);if(!P||!P.profiles[id])return'Could not rename.';if(!n)return'Enter a name.';if(taken(n,P,id))return'A person with this name already exists.';P.profiles[id].name=n;save();render();return''}
function dup(id){const P=ensure();if(!P||!P.profiles[id]||Object.keys(P.profiles).length>=MAXP)return null;window.gppSync();const src=P.profiles[id];let n=nm(src.name+' (copy)'),i=2;while(taken(n,P))n=nm(src.name).slice(0,24)+' (copy '+i+++')';P.profiles[uid(n,P)]={name:n,d:JSON.parse(JSON.stringify(src.d)),created:Date.now()};save();render();return n}
function del(id){const P=ensure();if(!P||!P.profiles[id]||Object.keys(P.profiles).length<2)return null;window.gppSync();const snapP=P.profiles[id],was=P.active===id;delete P.profiles[id];if(was)sw(Object.keys(P.profiles)[0]);else{save();render()}return{id,snap:snapP,was}}
function restore(x){const P=ensure();if(!P||!x||P.profiles[x.id])return;P.profiles[x.id]=x.snap;if(x.was)sw(x.id);else{save();render()}}

window.gppBarHTML=function(top){
  const clients=list(),active=clients.find(p=>p.active),label=active?active.name:translate('Add your first client');
  if(!top)return'';
  let portal=document.getElementById('gpp-drawer-portal');
  if(!portal){portal=document.createElement('div');portal.id='gpp-drawer-portal';document.body.appendChild(portal)}
  portal.innerHTML=window.gppDrawerHTML();
  return'<span class="fhp-l">'+esc(translate('Client'))+'</span><button type="button" class="client-trigger gpp-client-trigger" id="gpp-sel" data-gpp-drawer-trigger aria-expanded="'+drawerOpen+'" aria-controls="gpp-drawer" title="'+esc(label)+'"><span class="client-trigger-value">'+esc(label)+'</span><svg class="client-chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m3 6 5 5 5-5"/></svg></button>'
};
window.gppHeroInner=function(){const P=ensure();if(!P)return'';const p=P.profiles[P.active],m=S.members&&S.members[0],M0=typeof cr==='function'?cr:null,nm=String(p.name||'').trim();if(!nm)return'';
  const bits=[];if(m&&Number.isFinite(+m.age))bits.push('Age '+(+m.age));if(Number.isFinite(+S.ret))bits.push('retiring at '+(+S.ret));if(Number.isFinite(+S.goal)&&M0)bits.push('goal '+String(M0(+S.goal)).replace('\u20b9 ','\u20b9'));
  const ini=nm.split(/\s+/).filter(Boolean).slice(0,2).map(w=>Array.from(w)[0].toUpperCase()).join('');
  return'<div class="dz-who"><span class="fhp-av sm" aria-hidden="true">'+esc(ini)+'</span><div class="fhp-ht"><span class="fhp-eb">Goal plan prepared for</span><div class="dz-nr"><h2 class="fhp-nm sm">'+esc(nm)+'</h2>'+(bits.length?'<span class="fhp-sub">'+bits.join(' \u00b7 ')+'</span>':'')+'</div></div></div>'};
window.gppMBar=function(){return''};
window.gppHoldingList=function(){/* read-only: every Goal Planner client with today's value of each holding (the same numbers as Current Corpus on the Goal Planner summary) */
  const P=ensure();if(!P)return[];window.gppSync();
  return Object.keys(P.profiles).map(function(id){const p=P.profiles[id];let items=[];
    try{const d=JSON.parse(JSON.stringify(p.d)),D=calc(d);items=(d.assets||[]).map(function(x,i){return{id:String(x.id),name:String(x.name||'Holding'),cat:String(x.cat||''),val:Math.round(+D.rows[0].v[i]||0),ca:String(x.ca||''),ma:String(x.ma||'')}})}catch(e){items=[]}
    return{id:id,name:p.name,active:id===P.active,items:items}})};

function metrics(p){
  if(!p.d.assets.length)return null;
  const keep=snap(S);
  try{Object.assign(S,JSON.parse(JSON.stringify(p.d)));const c=ctx();let sv=0,fy='';/* savings per year = yearly + monthly additions in the first financial year, same rule as Reports > Annual Savings Schedule */let sn=0,s1=0,f1='',f2='';try{const D=calc(S),lab=i=>'FY '+(S.start+i-1)+'-'+String(S.start+i).slice(2);let tot=0;for(let i=1;i<D.rows.length;i++){const v=D.rows[i].add||0;if(v>0){tot+=v;sn++;if(sn===1){s1=Math.round(v);f1=lab(i)}f2=lab(i)}}sv=sn?Math.round(tot/sn):0;fy=f1&&f1+' to '+f2}catch(e){sv=0}/* Monthly income at retirement = the Dashboard's 'Income at Retirement' (D.incT / 12); expected return = value-weighted average of the holdings' own return rates */let inc=0,er=0;try{const D2=c.D;inc=Math.round((D2.incT||0)/12);const L=S.assets.filter(x=>x.type!=='gratuity'),tv=L.reduce((q,x)=>q+(+x.value||0),0);er=tv>0?L.reduce((q,x)=>q+(+x.value||0)*(+x.ret||0),0)/tv*100:(L.length?L.reduce((q,x)=>q+(+x.ret||0),0)/L.length*100:0)}catch(e){inc=0;er=0}return{today:c.r0.tot,atRet:c.rr.tot,goal:c.G,yr:c.yr,tm:c.tm,ret:S.ret,sav:sv,fy:fy,sn:sn,s1:s1,inc:inc,er:er}}
  catch(e){return null}
  finally{Object.assign(S,keep)}}
window.gppActiveName=function(){const P=ensure();return P&&P.profiles[P.active]?String(P.profiles[P.active].name||''):''};
window.gppReportTitle=function(title){const name=window.gppActiveName();return esc(translate(title))+(name?' · '+esc(name):'')};
/* ---- Option 2: side-by-side comparison table (transient UI state only; nothing new is stored) ---- */
const MINC=2,MAXC=5;
let cmpSel=[],cmpMode=false,detOpen={},cmpQuery='';
const money=x=>{const M0=typeof cr==='function'?cr:(v=>'\u20b9'+Math.round(v).toLocaleString('en-IN'));return String(M0(x)).replace('\u20b9 ','\u20b9')};
const pc1=x=>(Math.round(x*10)/10).toFixed(1).replace(/\.0$/,'')+'%';
/* one row of numbers per client, all from metrics() -> the same engine the Dashboard and Reports use */
function rowData(p){const m=metrics(p),goal=+(p.d.goal||0),has=!!m,atRet=has?m.atRet:0,pct=goal>0?atRet/goal*100:0;
  return{p:p,m:m,has:has,goal:goal,today:has?m.today:0,atRet:atRet,pct:pct,gap:has?atRet-goal:null,sav:has?m.sav:0,er:has?m.er:null,inc:has?m.inc:null,ret:has?m.ret:null,ok:has&&atRet>=goal}}
function statusOf(r){return r.has?translate(r.ok?'On track':'Behind goal'):translate('No holdings')}
function bestId(rows){let b=null;rows.forEach(r=>{if(!r.has)return;if(!b||r.pct>b.pct+1e-9||(Math.abs(r.pct-b.pct)<=1e-9&&r.atRet>b.atRet))b=r});return b?b.p.id:null}
function pruneSel(){const ids=list().map(x=>x.id);cmpSel=cmpSel.filter(id=>ids.indexOf(id)>-1)}
function bar(pct,ok){const w=Math.max(0,Math.min(100,pct));return'<div class="gpp-progress'+(ok?' is-ok':'')+'" role="progressbar" aria-label="'+esc(translate('Goal progress'))+'" aria-valuenow="'+Math.round(w)+'" aria-valuemin="0" aria-valuemax="100"><span style="width:'+w+'%"></span></div>'}
function menuHTML(p){const reason=p.active?translate("You can't delete the active client"):list().length<2?translate("You can't delete the only client"):'';
  return'<details class="gpp-kebab"><summary aria-label="'+esc(translate('Client actions'))+'" title="'+esc(translate('Client actions'))+'"><span aria-hidden="true">\u22ee</span></summary><div class="gpp-menu" role="menu"><button type="button" role="menuitem" data-gpp="switch:'+esc(p.id)+'">'+esc(translate('Open plan'))+'</button><button type="button" role="menuitem" data-gpp="dup:'+esc(p.id)+'">'+esc(translate('Duplicate'))+'</button></div></details>'}
function actionsHTML(p){const reason=p.active?translate("You can't delete the active client"):list().length<2?translate("You can't delete the only client"):'',open=!!detOpen[p.id];
  return'<div class="gpp-acts"><button type="button" class="gpp-act" data-gpp="det:'+esc(p.id)+'" aria-expanded="'+open+'">'+esc(translate('Details'))+'</button><button type="button" class="gpp-act" data-gpp="ren:'+esc(p.id)+'">'+esc(translate('Edit'))+'</button><button type="button" class="gpp-act gpp-act-del" data-gpp="del:'+esc(p.id)+'"'+(reason?' disabled title="'+esc(reason)+'" aria-describedby="gpp-delete-reason-'+esc(p.id)+'"':'')+'>'+esc(translate('Delete'))+'</button>'+(reason?'<span class="gpp-sr" id="gpp-delete-reason-'+esc(p.id)+'">'+esc(reason)+'</span>':'')+menuHTML(p)+'</div>'}
function detailHTML(r){const p=r.p,m=r.m,M=money,members=p.d.members.length,holdings=p.d.assets.length;
  const reached=m?(m.tm==null?translate('Not within plan'):(Math.floor(m.tm/12)?Math.floor(m.tm/12)+' '+translate('yr')+' ':'')+(m.tm%12)+' '+translate('mo')):'\u2014';
  const savingsTitle=m&&m.fy?translate('Average of')+' '+m.sn+' '+translate('saving years')+' ('+m.fy+'). '+translate('First year')+' '+M(m.s1):'';
  const c=(k,v,t)=>'<div'+(t?' title="'+esc(t)+'"':'')+'><small>'+esc(translate(k))+'</small><b>'+esc(v)+'</b></div>';
  return'<div class="gpp-detail-grid">'+c('Holdings',holdings+' '+translate(holdings===1?'holding':'holdings'))+c('Members',members+' '+translate(members===1?'member':'members'))+c('Worth today',M(r.today))+c('At retirement',m?M(m.atRet)+' ('+translate('age')+' '+m.ret+')':'\u2014')+c('Goal',M(r.goal))+c(r.ok?'Ahead by':'Short by',m?M(Math.abs(r.gap)):'\u2014')+c('Goal reached in',reached)+c('Savings per year',m&&m.sav>0?M(m.sav):'\u2014',savingsTitle)+'</div>'+(!m?'<p class="gpp-no-holdings">'+esc(translate('No holdings yet. Open the plan to add one.'))+'</p>':'')}
function tableHTML(rows,best){
  const maxed=cmpSel.length>=MAXC;
  const body=rows.map(function(r){const p=r.p,sel=cmpSel.indexOf(p.id)>-1,dis=!sel&&maxed,lab=translate('Select')+' '+p.name,open=!!detOpen[p.id];
    const name='<button type="button" class="gpp-client-select" data-gpp="switch:'+esc(p.id)+'" aria-label="'+esc(translate('Switch')+' '+p.name)+'" title="'+esc(p.name)+'">'+esc(p.name)+'</button>'+(p.active?'<span class="fhp-chip fhp-act">'+esc(translate('Active'))+'</span>':'')+(p.id===best?'<span class="gpp-best-tag" title="'+esc(translate('Best performing plan'))+'">\u2605 '+esc(translate('Best'))+'</span>':'');
    const st='<span class="gpp-status'+(r.has?(r.ok?' is-ok':' is-bad'):'')+'">'+esc(statusOf(r))+'</span>';
    return'<tr class="gpp-row'+(p.active?' is-active':'')+(sel?' is-selected':'')+'" data-gpp-card="'+esc(p.id)+'" data-gpp-card-name="'+esc(p.name.toLowerCase())+'">'
      +'<td class="gpp-c-sel" data-label=""><input type="checkbox" class="gpp-chk" data-gpp-sel="'+esc(p.id)+'" aria-label="'+esc(lab)+'"'+(sel?' checked':'')+(dis?' disabled title="'+esc(translate('You can compare up to 5 plans'))+'"':'')+'></td>'
      +'<td class="gpp-c-name" data-label="'+esc(translate('Plan Name'))+'">'+name+'</td>'
      +'<td data-label="'+esc(translate('Status'))+'">'+st+'</td>'
      +'<td class="num" data-label="'+esc(translate('Current Corpus'))+'">'+esc(money(r.today))+'</td>'
      +'<td class="num" data-label="'+esc(translate('Target Corpus'))+'">'+esc(money(r.goal))+'</td>'
      +'<td class="gpp-c-prog" data-label="'+esc(translate('Progress'))+' (%)"><div class="gpp-prog-wrap"><span class="gpp-pct">'+esc(pc1(r.pct))+'</span>'+bar(r.pct,r.ok)+'</div></td>'
      +'<td class="gpp-c-act" data-label="">'+actionsHTML(p)+'</td></tr>'
      +(open?'<tr class="gpp-detail-row" data-gpp-card-detail="'+esc(p.id)+'"><td colspan="7">'+detailHTML(r)+'</td></tr>':'')}).join('');
  return'<div class="gpp-table-wrap"><table class="gpp-table" data-gpp-table><caption class="gpp-sr">'+esc(translate('Clients and plans'))+'</caption><thead><tr><th class="gpp-c-sel" scope="col"><span class="gpp-sr">'+esc(translate('Select'))+'</span></th><th scope="col">'+esc(translate('Plan Name'))+'</th><th scope="col">'+esc(translate('Status'))+'</th><th scope="col" class="num">'+esc(translate('Current Corpus'))+'</th><th scope="col" class="num">'+esc(translate('Target Corpus'))+'</th><th scope="col">'+esc(translate('Progress'))+' (%)</th><th scope="col">'+esc(translate('Actions'))+'</th></tr></thead><tbody>'+body+'</tbody></table></div>'}
/* comparison: [label, value text, numeric for best-of, direction (1 = higher is better, -1 = lower, 0 = no ranking)] */
function cmpDefs(){return[
  ['Current Corpus',r=>money(r.today),r=>r.today,1],
  ['Target Corpus',r=>money(r.goal),r=>r.goal,0],
  ['Corpus Gap',r=>r.has?(r.ok?'+':'\u2212')+money(Math.abs(r.gap)).replace('\u20b9','\u20b9'):'\u2014',r=>r.has?r.gap:null,1,r=>r.has?(r.ok?translate('Surplus'):translate('Shortfall')):''],
  ['Achievement %',r=>pc1(r.pct),r=>r.pct,1],
  ['Annual Savings',r=>r.sav>0?money(r.sav):'\u2014',r=>r.sav,0],
  ['Expected Returns',r=>r.er==null?'\u2014':pc1(r.er)+' p.a.',r=>r.er,1],
  ['Projected Corpus',r=>r.has?money(r.atRet):'\u2014',r=>r.has?r.atRet:null,1],
  ['Monthly Income',r=>r.inc==null?'\u2014':money(r.inc),r=>r.inc,1],
  ['Retirement Age',r=>r.ret==null?'\u2014':String(r.ret),r=>r.ret,0]]}
function compareHTML(rows){
  const sel=cmpSel.map(id=>rows.find(r=>r.p.id===id)).filter(Boolean);
  if(sel.length<MINC){cmpMode=false;return''}
  const best=bestId(sel),bestRow=sel.find(r=>r.p.id===best);
  const defs=cmpDefs();
  const head=sel.map(r=>'<th scope="col" class="'+(r.p.id===best?'is-best':'')+'"><span class="gpp-cmp-name">'+esc(r.p.name)+'</span>'+(r.p.id===best?'<span class="gpp-best-tag">\u2605 '+esc(translate('Best performing'))+'</span>':'')+'<span class="gpp-status'+(r.has?(r.ok?' is-ok':' is-bad'):'')+'">'+esc(statusOf(r))+'</span></th>').join('');
  const rowsH=defs.map(function(d){const vals=sel.map(r=>d[2](r)),ok=vals.filter(v=>v!=null&&isFinite(v)),top=d[3]&&ok.length>1?Math.max.apply(null,ok):null,tie=top!=null&&ok.every(v=>Math.abs(v-top)<1e-9);
    return'<tr><th scope="row">'+esc(translate(d[0]))+'</th>'+sel.map(function(r,i){const v=vals[i],isTop=top!=null&&!tie&&v!=null&&Math.abs(v-top)<1e-9,sub=d[4]?d[4](r):'';
      const cls=(r.p.id===best?'is-best-col ':'')+(isTop?'is-top ':'')+(d[0]==='Corpus Gap'&&r.has?(r.ok?'is-pos ':'is-neg '):'');
      let inner=esc(d[1](r));if(d[0]==='Achievement %'&&r.has)inner+=bar(r.pct,r.ok);
      return'<td class="'+cls+'" data-label="'+esc(r.p.name)+'"><b>'+inner+'</b>'+(sub?'<small>'+esc(sub)+'</small>':'')+(isTop?'<span class="gpp-top-mark" title="'+esc(translate('Best value in this row'))+'">\u2605</span>':'')+'</td>'}).join('')+'</tr>'}).join('');
  return'<section class="gpp-compare" data-gpp-compare aria-label="'+esc(translate('Plan comparison'))+'"><div class="gpp-cmp-bar"><button type="button" class="gpp-act" data-gpp="cmpback">\u2190 '+esc(translate('Back to clients'))+'</button><h3>'+esc(translate('Compare plans'))+' <span class="gpp-count">'+sel.length+'</span></h3>'+(window.rptInfo?window.rptInfo('\u2605 '+translate('marks the best value in each row')+'. '+translate('Achievement % = projected corpus at retirement \u00f7 target corpus. Corpus gap = projected corpus \u2212 target. Monthly income = yearly interest at retirement \u00f7 12. Expected returns = holdings\' return rates weighted by current value.'),translate('About this comparison')):'')+'</div>'
    +(bestRow?'<div class="gpp-best-banner" role="status"><span class="gpp-best-ico" aria-hidden="true">\u2605</span><div><b>'+esc(bestRow.p.name)+'</b> '+esc(translate('is the best performing plan'))+' \u2014 '+esc(pc1(bestRow.pct))+' '+esc(translate('of target'))+', '+esc(translate('projected corpus'))+' '+esc(money(bestRow.atRet))+'.</div></div>':'')
    +'<div class="gpp-table-wrap"><table class="gpp-cmp-table" data-gpp-cmp-table><thead><tr><th scope="col" class="gpp-cmp-corner">'+esc(translate('Metric'))+'</th>'+head+'</tr></thead><tbody>'+rowsH+'</tbody></table></div>'
    +'</section>'}
function toolbarHTML(n,total){
  const ready=n>=MINC,hint=n<MINC?translate('Select 2\u20135 plans to compare'):n>MAXC?'':n+' '+translate('selected');
  return'<div class="gpp-toolbar"><label class="gpp-search"><span>'+esc(translate('Search clients'))+'</span><input type="search" data-gpp-search aria-label="'+esc(translate('Search clients'))+'" value="'+esc(cmpQuery)+'"></label><div class="gpp-tb-right"><span class="gpp-sel-hint" aria-live="polite">'+esc(hint)+'</span>'+(n?'<button type="button" class="gpp-act" data-gpp="cmpclear">'+esc(translate('Clear'))+'</button>':'')+'<button type="button" class="gpp-compare-btn" data-gpp="compare"'+(ready?'':' disabled')+'>'+esc(translate('Compare'))+(n?' ('+n+')':'')+'</button></div></div>'}
window.gppDrawerHTML=function(){
  const L=list(),rows=L.map(rowData),best=bestId(rows);pruneSel();
  if(!L.length)drawerOpen=true;
  const showCmp=cmpMode&&cmpSel.length>=MINC;if(!showCmp)cmpMode=false;
  const main=showCmp?compareHTML(rows):(L.length?toolbarHTML(cmpSel.length,L.length)+tableHTML(rows,best)+'<p class="gpp-none" data-gpp-none hidden>'+esc(translate('No clients match your search.'))+'</p>':'<p class="gpp-empty">'+esc(translate('Add your first client'))+'</p>');
  return'<div class="gpp-overlay" id="gpp-drawer-overlay" data-gpp-overlay'+(drawerOpen?'':' hidden')+'><section class="gpp-drawer gpp-drawer-wide" id="gpp-drawer" role="dialog" aria-modal="true" aria-labelledby="gpp-drawer-title" tabindex="-1"><header class="gpp-drawer-header"><h2 id="gpp-drawer-title">'+esc(translate('Clients'))+'</h2><button type="button" class="gpp-close" data-gpp-close aria-label="'+esc(translate('Close'))+'">\u00d7</button></header><div class="gpp-client-list" data-gpp-client-list>'+main+'</div><footer class="gpp-drawer-footer"><button type="button" class="gpp-add-client" data-gpp="add"><span aria-hidden="true">+</span>'+esc(translate('Add client'))+'</button></footer></section></div>'};

function nameDialog(mode,id){const P=ensure(),cur=mode==='ren'&&P.profiles[id]?P.profiles[id].name:'';dg.className='';
  dg.innerHTML='<h2>'+(mode==='ren'?translate('Rename'):translate('Add client'))+'</h2><form id="gpp-f" novalidate data-mode="'+mode+'" data-id="'+esc(id||'')+'"><p class="fh-note">'+(mode==='ren'?translate('Change the name shown in the client list.'):translate('Opens a new plan for this client with no holdings yet.'))+'</p><label for="gpp-n">'+translate('Name')+'</label><input id="gpp-n" maxlength="30" autocomplete="off" placeholder="e.g. Deepak" value="'+esc(cur)+'"><div class="fh-err" id="gpp-e" role="alert"></div><div class="tb"><button type="button" id="gpp-x">'+translate('Cancel')+'</button><button type="submit" class="p">'+(mode==='ren'?translate('Save'):translate('Create'))+'</button></div></form>';
  dg.showModal();const i=document.getElementById('gpp-n');if(i){i.focus();i.select()}}
let gppAddReturnFocus=null;
dg.addEventListener('close',()=>{
  if(!gppAddReturnFocus)return;
  const id=gppAddReturnFocus;gppAddReturnFocus=null;
  const trigger=document.getElementById(id);if(trigger)trigger.focus();
});
document.addEventListener('submit',e=>{const f=e.target&&e.target.id==='gpp-f'?e.target:null;if(!f)return;e.preventDefault();
  const name=document.getElementById('gpp-n').value,err=f.dataset.mode==='ren'?ren(f.dataset.id,name):add(name);
  if(err){document.getElementById('gpp-e').textContent=err;return}dg.close();toast(f.dataset.mode==='ren'?'Renamed':nm(name)+' added')});
document.addEventListener('keydown',e=>{
  const overlay=document.getElementById('gpp-drawer-overlay');if(!overlay||overlay.hidden)return;
  const dialog=document.getElementById('gpp-drawer');if(!dialog)return;
  if(e.key==='Escape'){const om=document.querySelector&&document.querySelector('details.gpp-kebab[open]');if(om){e.preventDefault();const sm=om.querySelector('summary');om.removeAttribute('open');if(sm)sm.focus();return}e.preventDefault();closeDrawer(true);return}
  if(e.key!=='Tab')return;
  const focusable=Array.from(dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),summary')).filter(x=>!x.closest('details:not([open])'));
  if(!focusable.length){e.preventDefault();dialog.focus();return}
  const first=focusable[0],last=focusable[focusable.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});
function closeDrawer(returnFocus,immediate){drawerOpen=false;const overlay=document.getElementById('gpp-drawer-overlay');if(overlay){const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;overlay.classList&&overlay.classList.toggle('gpp-closing',!immediate&&!reduced);if(immediate||reduced){overlay.hidden=true}else{clearTimeout(drawerCloseTimer);drawerCloseTimer=setTimeout(()=>{if(!drawerOpen){overlay.hidden=true;overlay.classList&&overlay.classList.remove('gpp-closing')}},180)}}const trigger=document.getElementById('gpp-sel');if(trigger){trigger.setAttribute('aria-expanded','false');if(returnFocus)trigger.focus()}}
function openDrawer(){clearTimeout(drawerCloseTimer);drawerOpen=true;const overlay=document.getElementById('gpp-drawer-overlay');if(overlay){overlay.classList&&overlay.classList.remove('gpp-closing');overlay.hidden=false}const trigger=document.getElementById('gpp-sel');if(trigger)trigger.setAttribute('aria-expanded','true');const target=document.querySelector('[data-gpp-search]')||document.querySelector('.gpp-close');if(target)target.focus()}
document.addEventListener('click',e=>{
  if(e.target.closest){const kb=e.target.closest('details.gpp-kebab');if(!kb||e.target.closest('.gpp-menu button'))gppCloseMenus(null)}
  const trigger=e.target.closest&&e.target.closest('[data-gpp-drawer-trigger]');if(trigger){if(drawerOpen)closeDrawer(false);else openDrawer();return}
  if(e.target&&e.target.matches&&e.target.matches('[data-gpp-overlay]')){closeDrawer(true);return}
  if(e.target.closest&&e.target.closest('[data-gpp-close]')){closeDrawer(true);return}
  const card=e.target.closest&&e.target.closest('[data-gpp-card]');
  if(card&&!(e.target.closest('button,summary,details,input,label,.gpp-c-sel,.gpp-c-act'))){const id=card.dataset.gppCard;drawerOpen=false;if(sw(id)){const t=document.getElementById('gpp-sel');if(t){t.setAttribute('aria-expanded','false');t.focus()}toast(translate('Switched to')+' '+ensure().profiles[id].name)}return}
  if(e.target&&e.target.id==='gpp-x'){dg.close();return}
  const b=e.target.closest&&e.target.closest('[data-gpp]');if(!b)return;
  const [act,id]=b.dataset.gpp.split(':'),P=ensure();if(!P)return;
  if(act==='add'){
    if(Object.keys(P.profiles).length>=MAXP){toast('Maximum 12 family members');return}
    gppAddReturnFocus='gpp-sel';drawerOpen=false;closeDrawer(false,true);nameDialog('add')
  }
  else if(act==='compare'){if(cmpSel.length>=MINC&&cmpSel.length<=MAXC){cmpMode=true;redrawDrawer()}else toast(translate('Select 2\u20135 plans to compare'))}
  else if(act==='cmpback'){cmpMode=false;redrawDrawer()}
  else if(act==='cmpclear'){cmpSel=[];cmpMode=false;redrawDrawer()}
  else if(act==='det'){detOpen[id]=!detOpen[id];redrawDrawer()}
  else if(act==='ren'){gppAddReturnFocus='gpp-sel';drawerOpen=false;closeDrawer(false,true);nameDialog('ren',id)}
  else if(act==='switch'){drawerOpen=false;if(sw(id)){const t=document.getElementById('gpp-sel');if(t){t.setAttribute('aria-expanded','false');t.focus()}toast(translate('Switched to')+' '+P.profiles[id].name)}}
  else if(act==='dup'){const n=dup(id);if(n)toast('Duplicated as '+n)}
  else if(act==='del'){if(Object.keys(P.profiles).length<2){toast('Keep at least one person');return}
    confirmBox('Delete \u201c'+P.profiles[id].name+'\u201d and their saved holdings? This cannot be undone.',()=>{const x=del(id);if(x)toast('Deleted '+x.snap.name,()=>restore(x))})}});
function redrawDrawer(){const portal=document.getElementById('gpp-drawer-portal');if(!portal)return;const list0=portal.querySelector('[data-gpp-client-list]'),top=list0?list0.scrollTop:0;portal.innerHTML=window.gppDrawerHTML();const l=portal.querySelector('[data-gpp-client-list]');if(l)l.scrollTop=top;applyFilter()}
function applyFilter(){const q=cmpQuery.trim().toLowerCase();let shown=0;document.querySelectorAll('[data-gpp-card]').forEach(row=>{const hit=row.dataset.gppCardName.includes(q);row.hidden=!hit;if(hit)shown++;const d=document.querySelector('[data-gpp-card-detail="'+row.dataset.gppCard+'"]');if(d)d.hidden=!hit});const n=document.querySelector('[data-gpp-none]');if(n)n.hidden=shown>0||!q}
document.addEventListener('change',e=>{const c=e.target&&e.target.matches&&e.target.matches('[data-gpp-sel]')?e.target:null;if(!c)return;const id=c.dataset.gppSel,at=cmpSel.indexOf(id);
  if(c.checked){if(at<0){if(cmpSel.length>=MAXC){c.checked=false;toast(translate('You can compare up to 5 plans'));return}cmpSel.push(id)}}else if(at>-1)cmpSel.splice(at,1);
  redrawDrawer();const again=document.querySelector('[data-gpp-sel="'+id+'"]');if(again)again.focus()});
document.addEventListener('input',e=>{if(!e.target.matches||!e.target.matches('[data-gpp-search]'))return;cmpQuery=e.target.value;applyFilter()});
/* Row action menu (⋮): the plans table scrolls sideways (overflow-x:auto), which also clips anything that hangs below the last row.
   The open menu is therefore positioned against the viewport (fixed) and flips upward when there is no room below. */
function gppPlaceMenu(d){const sum=d.querySelector('summary'),menu=d.querySelector('.gpp-menu');if(!sum||!menu)return;
  menu.style.visibility='hidden';menu.style.position='fixed';menu.style.right='auto';menu.style.left='0px';menu.style.top='0px';
  const r=sum.getBoundingClientRect(),w=menu.offsetWidth,h=menu.offsetHeight,vw=window.innerWidth||document.documentElement.clientWidth,vh=window.innerHeight||document.documentElement.clientHeight;
  let top=r.bottom+4;if(top+h>vh-8&&r.top-4-h>=8)top=r.top-4-h;top=Math.max(8,Math.min(top,vh-h-8));
  let left=r.right-w;left=Math.max(8,Math.min(left,vw-w-8));
  menu.style.top=top+'px';menu.style.left=left+'px';menu.style.visibility=''}
function gppCloseMenus(except){document.querySelectorAll('details.gpp-kebab[open]').forEach(d=>{if(d!==except)d.removeAttribute('open')})}
document.addEventListener('toggle',e=>{const d=e.target;if(!d||!d.matches||!d.matches('details.gpp-kebab'))return;if(d.open){gppCloseMenus(d);gppPlaceMenu(d)}},true);
function gppRepositionMenu(){const o=document.querySelector('details.gpp-kebab[open]');if(o)gppPlaceMenu(o)}
if(typeof window.addEventListener==='function')window.addEventListener('resize',gppRepositionMenu);
document.addEventListener('scroll',gppRepositionMenu,true);
window.gppCompareState=function(){return{selected:cmpSel.slice(),comparing:cmpMode}};
if(UI.rv==null||UI.rv==='clients')UI.rv='year';
})();