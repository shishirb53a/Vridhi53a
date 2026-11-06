(function(){
var dlg=null,cur=null;
var TT={year:'Annual Portfolio Projection',month:'Monthly Portfolio Projection',int:'Interest & Income Statement'};
var HINT={year:'Click a row to highlight it · Retired tag = retirement year · table values in ₹ Lakh (hover for exact amount)',month:'Click a row to highlight it · Retired tag = March (as on 1 Apr) of your retirement year · table values in ₹ Lakh (hover for exact amount)',int:'Interest = closing − opening − additions · monthly income = interest ÷ 12 · values in ₹ Lakh (hover for exact amount)'};
var T=function(t){try{return LANG()==='en'?t:tr(t,1)}catch(e){return t}};
function find(id){for(var i=0;i<S.assets.length;i++)if(String(S.assets[i].id)===String(id))return S.assets[i];return null}
/* the existing year-by-year report, drawn for just this holding and its asset class.
   The report reads its filters from UI, so they are set for one call and then put back. */
function report(a){
var keep={rsel:UI.rsel,rcl:UI.rcl,rv:UI.rv,rq:UI.rq,rk:UI.rk,rd:UI.rd,sel:UI.sel},html;
try{UI.rsel=[String(a.id)];UI.rcl=[a.cat];UI.rv=cur.v;UI.rq='';UI.rk=cur.k;UI.rd=cur.d;UI.sel=cur.sel;html=window.repRows()}
catch(e){html='<div class="em">The report could not be loaded.</div>'}
finally{UI.rsel=keep.rsel;UI.rcl=keep.rcl;UI.rv=keep.rv;UI.rq=keep.rq;UI.rk=keep.rk;UI.rd=keep.rd;UI.sel=keep.sel}
return html}
function draw(){
var a=find(cur.id),b=dlg.querySelector('.hyb');
if(!a){b.innerHTML='<div class="em">'+esc(T('This holding no longer exists.'))+'</div>';return}
dlg.querySelector('#hyt').textContent=a.name+' · '+T(TT[cur.v]);
var tg='<div class="seg hyv" role="group" aria-label="'+esc(T('Report type'))+'">'+[['year','Annual Portfolio Projection'],['month','Monthly Portfolio Projection'],['int','Interest & Income Statement']].map(function(k){return'<button type="button" data-hyv="'+k[0]+'" aria-pressed="'+(cur.v===k[0])+'">'+esc(T(k[1]))+'</button>'}).join('')+'</div>';
b.innerHTML='<div class="hyr">'+tg+(window.rptInfo?window.rptInfo(T(HINT[cur.v])+' · '+T('Choose columns in Settings › Report columns'),T('About this report')):'')+'</div><div class="hy-sc" id="hyrr">'+report(a)+'</div>';
try{window.RCOLS&&RCOLS.apply(document.getElementById('hyrr'),cur.v)}catch(e){}}
function build(){
dlg=document.createElement('dialog');dlg.id='hydlg';dlg.className='hyd';dlg.setAttribute('aria-labelledby','hyt');
dlg.innerHTML='<div class="hyh"><div><h2 id="hyt"></h2><div class="hyc"></div></div><button type="button" data-hyx="1" aria-label="Close">'+esc(T('Close'))+'</button></div><div class="hyb"></div>';
document.body.appendChild(dlg);
dlg.addEventListener('click',function(e){
if(e.target===dlg){dlg.close();return}
var x=e.target.closest('[data-hyx]');if(x){dlg.close();return}
var v=e.target.closest('button[data-hyv]');
if(v){cur.v=v.dataset.hyv;cur.k='a';cur.d=1;cur.sel=null;draw();var vb=dlg.querySelector('button[data-hyv="'+cur.v+'"]');if(vb)vb.focus();return}
var h=e.target.closest('button[data-rk]');
if(h){var k=h.dataset.rk;cur.d=cur.k===k?-cur.d:1;cur.k=k;draw();var n=dlg.querySelector('button[data-rk="'+k+'"]');if(n)n.focus();return}
var r=e.target.closest('[data-r]');if(r&&!e.target.closest('button'))sel(+r.dataset.r)});
dlg.addEventListener('keydown',function(e){var r=e.target.closest&&e.target.closest('tr[data-r]');if(r&&e.target===r&&(e.key==='Enter'||e.key===' ')){e.preventDefault();sel(+r.dataset.r)}});
/* scrolling: keys and wheel scroll the report body wherever focus or the pointer is in the pop-up, table rows included */
dlg.addEventListener('keydown',function(e){var hb=dlg.querySelector('.hyb'),t=e.target,k=e.key;if(!hb||e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)||t.isContentEditable)return;
var d={ArrowDown:48,ArrowUp:-48,PageDown:hb.clientHeight*.9,PageUp:-hb.clientHeight*.9}[k];
if(d!=null){e.preventDefault();hb.scrollBy({top:d})}else if(k==='Home'||k==='End'){e.preventDefault();hb.scrollTo({top:k==='Home'?0:hb.scrollHeight})}});
dlg.addEventListener('wheel',function(e){var hb=dlg.querySelector('.hyb');if(!hb||e.ctrlKey||!e.deltaY)return;e.preventDefault();hb.scrollBy({top:e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?hb.clientHeight:1)})},{passive:false});
dlg.addEventListener('close',function(){dlg.querySelector('.hyb').innerHTML='';cur=null})}
function sel(n){cur.sel=cur.sel===n?null:n;dlg.querySelectorAll('[data-r]').forEach(function(x){var s=+x.dataset.r===cur.sel;x.classList.toggle('sel',s);if(x.tagName==='TR')x.setAttribute('aria-selected',s)})}
function open(id){
var a=find(id);if(!a)return;
if(!dlg)build();
cur={id:String(a.id),v:'year',k:'a',d:1,sel:null};
var col='';try{col=CC[a.cat]||''}catch(e){}
dlg.querySelector('.hyc').innerHTML='<span>'+esc(T('Asset class'))+':</span><span class="pill" style="--c:'+esc(col)+'">'+esc(a.cat)+'</span><span>'+esc(T('Holding'))+':</span><b>'+esc(a.name)+'</b><span>'+(a.ret*100).toFixed(2)+'%</span>';
draw();
if(!dlg.open)dlg.showModal();var hb=dlg.querySelector('.hyb');hb.setAttribute('tabindex','0');hb.setAttribute('role','region');hb.setAttribute('aria-label',T('Report'));hb.focus({preventScroll:true})}
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a.hyl');if(!a)return;e.preventDefault();open(a.dataset.hy)});
})();