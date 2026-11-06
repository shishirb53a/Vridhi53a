/* Reports: multi-select dropdowns for asset class and holding */
(function(){
UI.msd=null;
const ids=function(){return S.assets.map(function(x){return String(x.id)})};
const selIds=function(){const c=repSel();return c.all?ids():(UI.rsel||[]).map(String)};
const cats=function(){return CATS.filter(function(c){return S.assets.some(function(x){return x.cat===c})})};
const setSel=function(a){const all=ids();a=all.filter(function(i){return a.indexOf(i)>-1});UI.rsel=a.length===all.length?null:a;
UI.rcl=Array.from(new Set(S.assets.filter(function(x){return a.indexOf(String(x.id))>-1}).map(function(x){return x.cat})))};
const chev='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
window.rsDrops=function(){const A=S.assets;if(!A.length)return'';const sel=selIds(),cs=cats();
const cOn=function(c){return A.every(function(x){return x.cat!==c||sel.indexOf(String(x.id))>-1})},con=cs.filter(cOn);
const dd=function(k,title,val,body){const o=UI.msd===k;return'<div class="msd" data-msd="'+k+'"><span class="msd-t">'+title+'</span><button type="button" class="msd-b" data-msdb="'+k+'" aria-haspopup="true" aria-expanded="'+o+'"><b>'+val+'</b>'+chev+'</button><div class="msd-p"'+(o?'':' hidden')+' role="group" aria-label="'+title+'"><div class="msd-a"><button type="button" data-msda="'+k+':all">Select all</button><button type="button" data-msda="'+k+':none">Clear</button></div><div class="msd-l">'+body+'</div></div></div>'};
const cb=cs.map(function(c){return'<label class="msd-i"><input type="checkbox" data-rcls="'+esc(c)+'"'+(cOn(c)?' checked':'')+'><i style="background:'+(CC[c]||'var(--mu)')+'"></i><span>'+esc(c)+'</span><em>'+A.filter(function(x){return x.cat===c}).length+'</em></label>'}).join('');
const hb=A.map(function(x){return'<label class="msd-i"><input type="checkbox" data-rh="'+esc(String(x.id))+'"'+(sel.indexOf(String(x.id))>-1?' checked':'')+'><i style="background:'+(CC[x.cat]||'var(--mu)')+'"></i><span>'+escn(x.name)+'</span><em>'+esc(x.cat)+'</em></label>'}).join('');
const hn=(A.filter(function(x){return String(x.id)===sel[0]})[0]||{}).name;
return'<div class="msds">'+dd('cls','Asset class',con.length===cs.length?'All asset classes':con.length===0?'None selected':con.length===1?esc(con[0]):con.length+' of '+cs.length+' selected',cb)+dd('hold','Holding',sel.length===A.length?'All holdings':sel.length===0?'None selected':sel.length===1?escn(hn):sel.length+' of '+A.length+' selected',hb)+dd('cols','Columns','All columns','')+'</div>'};
const sync=function(){document.querySelectorAll('.msd').forEach(function(d){const o=UI.msd===d.dataset.msd,p=d.querySelector('.msd-p'),b=d.querySelector('.msd-b');if(p)p.hidden=!o;if(b)b.setAttribute('aria-expanded',String(o))})};
const refocus=function(attr,val){render();const n=Array.prototype.filter.call(document.querySelectorAll('['+attr+']'),function(x){return x.getAttribute(attr)===val})[0];if(n)n.focus()};
document.addEventListener('click',function(e){const t=e.target;if(!t.closest)return;
const b=t.closest('[data-msdb]');if(b){const k=b.dataset.msdb;UI.msd=UI.msd===k?null:k;sync();return}
const a=t.closest('[data-msda]');if(a){const p=a.dataset.msda.split(':');if(p[0]==='cols'){window.__colsAct(p[1]);return}if(p[1]==='all'){UI.rsel=null;UI.rcl=null}else setSel([]);UI.msd=p[0];render();const n=document.querySelector('[data-msda="'+a.dataset.msda+'"]');if(n)n.focus();return}
if(UI.msd&&!t.closest('.msd')){UI.msd=null;sync()}});
document.addEventListener('change',function(e){const t=e.target;if(!t.dataset)return;let cur=selIds();
if(t.dataset.rcls!=null){const c=t.dataset.rcls,cid=S.assets.filter(function(x){return x.cat===c}).map(function(x){return String(x.id)});
cur=t.checked?cur.concat(cid.filter(function(i){return cur.indexOf(i)<0})):cur.filter(function(i){return cid.indexOf(i)<0});setSel(cur);refocus('data-rcls',c)}
else if(t.dataset.rh!=null){const i=t.dataset.rh;cur=t.checked?(cur.indexOf(i)<0?cur.concat([i]):cur):cur.filter(function(z){return z!==i});setSel(cur);refocus('data-rh',i)}});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&UI.msd){UI.msd=null;sync()}});
const r0=window.render;window.render=function(){if(UI.tab!=='Reports')UI.msd=null;return r0.apply(this,arguments)};
})();