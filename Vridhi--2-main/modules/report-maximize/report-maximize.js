
/* Reports open full size, with a Maximize / Restore button. One remembered choice for all of them:
   Goal Planner > Reports (every tab), Retirement Planner (Year-by-year plan and Summary/Milestones pop-up),
   Policies > Reports, and the holding report pop-up.
   When maximized, all visible report columns are fitted into a single-page width without horizontal scrolling,
   and an "Export to PDF" button lets users save the report in a clean printable landscape format. */
(function(){
var KEY='vr-rep-max',pref=true,raf=0,fitTimer=0,fitting=false;
var FIT_SEL='table.rt,table.vp-t,table.sx-t';
try{pref=localStorage.getItem(KEY)!=='0'}catch(e){}
var IC={
 max:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
 min:'<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
 pdf:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/>'
};
function icon(k){return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+IC[k]+'</svg>'}
function paint(btn,full){var st=full?'1':'0';if(btn.dataset.s===st)return;btn.dataset.s=st;btn.setAttribute('aria-pressed',full?'true':'false');var t=full?'Restore':'Maximize';btn.title=t+' report';btn.setAttribute('aria-label',t+' report');btn.innerHTML=icon(full?'min':'max')+(btn.id==='rp-max'?'':'<span>'+t+'</span>')}
function paintPdf(btn){if(btn.dataset&&btn.dataset.p==='1')return;if(btn.dataset)btn.dataset.p='1';btn.title='Export report to PDF';btn.setAttribute('aria-label','Export to PDF');btn.innerHTML=icon('pdf')+'<span>Export to PDF</span>'}
function mk(id,cls){var b=document.createElement('button');b.type='button';b.id=id;b.className=cls;return b}
function removeEl(el){if(el&&typeof el.remove==='function')el.remove();else if(el&&el.parentNode&&typeof el.parentNode.removeChild==='function')el.parentNode.removeChild(el)}
function syncPdfBtn(id,cls,parent,anchor,show){
 var btn=document.getElementById(id);
 if(!show||!parent||!anchor||typeof parent.insertBefore!=='function'){if(btn)removeEl(btn);return}
 if(btn&&!parent.contains(btn)){removeEl(btn);btn=null}
 if(!btn){btn=mk(id,cls);parent.insertBefore(btn,anchor)}
 else if(btn.nextSibling!==anchor){parent.insertBefore(btn,anchor)}
 paintPdf(btn);
}

function supportsZoom(el){
 try{if(typeof CSS!=='undefined'&&typeof CSS.supports==='function')return CSS.supports('zoom','0.8')}catch(e){}
 return !!(el&&el.style&&'zoom' in el.style);
}
function resetTable(tbl){
 if(!tbl||!tbl.style)return;
 if(tbl.classList)tbl.classList.remove('vr-fit-tight','vr-fit-ultra','vr-fit-scaled');
 if(tbl.style.removeProperty){
  tbl.style.removeProperty('zoom');
  tbl.style.removeProperty('transform');
  tbl.style.removeProperty('transform-origin');
  tbl.style.removeProperty('width');
 }else{
  tbl.style.zoom='';
  tbl.style.transform='';
  tbl.style.transformOrigin='';
  tbl.style.width='';
 }
 var wrap=tbl.parentElement;
 if(wrap&&wrap.dataset&&wrap.dataset.vrFitH){
  if(wrap.style&&wrap.style.removeProperty)wrap.style.removeProperty('height');
  else if(wrap.style)wrap.style.height='';
  delete wrap.dataset.vrFitH;
 }
 if(tbl.dataset&&tbl.dataset.vrFit)delete tbl.dataset.vrFit;
}
function clearContainer(root){
 if(!root||typeof root.querySelectorAll!=='function')return;
 var tables=root.querySelectorAll(FIT_SEL);
 for(var i=0;i<tables.length;i++)resetTable(tables[i]);
}
function measureWidth(tbl){
 var sw=tbl.scrollWidth||0,ow=tbl.offsetWidth||0;
 return sw>ow?sw:ow;
}
function fitTable(tbl){
 if(!tbl||!tbl.parentElement||!tbl.style)return;
 resetTable(tbl);
 var wrap=tbl.parentElement;
 if(wrap.scrollLeft)wrap.scrollLeft=0;
 var avail=wrap.clientWidth||0;
 if(avail<=0)return;
 var need=measureWidth(tbl);
 if(need<=avail+1){if(tbl.dataset)tbl.dataset.vrFit='1';return}
 if(tbl.classList)tbl.classList.add('vr-fit-tight');
 need=measureWidth(tbl);
 if(need<=avail+1){if(tbl.dataset)tbl.dataset.vrFit='1';return}
 if(tbl.classList)tbl.classList.add('vr-fit-ultra');
 need=measureWidth(tbl);
 if(need<=avail+1){if(tbl.dataset)tbl.dataset.vrFit='1';return}
 var ratio=Math.max(0.35,Math.min(1,Math.floor(((avail-2)/need)*1000)/1000));
 if(tbl.classList)tbl.classList.add('vr-fit-scaled');
 if(supportsZoom(tbl)){
  tbl.style.zoom=String(ratio);
  if(typeof tbl.getBoundingClientRect==='function'){
   var rect=tbl.getBoundingClientRect(),availNow=wrap.clientWidth||avail;
   if(rect&&rect.width>availNow+1&&availNow>0){
    var next=Math.max(0.35,Math.min(ratio,Math.floor(((availNow-2)/rect.width)*ratio*1000)/1000));
    tbl.style.zoom=String(next);
    ratio=next;
   }
  }
 }else{
  tbl.style.width=need+'px';
  tbl.style.transformOrigin='top left';
  tbl.style.transform='scale('+ratio+')';
  var h=tbl.offsetHeight||0;
  if(h>0&&wrap.style){
   wrap.style.height=Math.ceil(h*ratio)+'px';
   if(wrap.dataset)wrap.dataset.vrFitH='1';
  }
 }
 if(tbl.dataset)tbl.dataset.vrFit=String(ratio);
}
function fitContainer(root,active){
 if(!root)return;
 if(!active){clearContainer(root);return}
 if(typeof root.querySelectorAll!=='function')return;
 var tables=root.querySelectorAll(FIT_SEL);
 for(var i=0;i<tables.length;i++)fitTable(tables[i]);
}
function fitAll(){
 if(fitting)return;
 fitting=true;
 try{
  var m=document.getElementById('m');
  if(m)fitContainer(m,!!(m.classList&&m.classList.contains('vr-rmax')));
  var hy=document.getElementById('hydlg');
  if(hy)fitContainer(hy,!!(hy.open&&hy.classList&&hy.classList.contains('hy-full')));
  var dg=document.getElementById('dg');
  if(dg)fitContainer(dg,!!(dg.open&&dg.classList&&dg.classList.contains('fh-full')));
 }finally{
  fitting=false;
 }
}
function scheduleFit(delay){
 if(typeof setTimeout!=='function'){fitAll();return}
 if(typeof clearTimeout==='function')clearTimeout(fitTimer);
 fitTimer=setTimeout(function(){fitTimer=0;fitAll()},delay==null?60:delay);
}

/* ---------- Printable PDF export (landscape A4, fits all visible columns, no window.open) ---------- */
function escHtml(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function notify(msg){try{if(typeof window!=='undefined'&&typeof window.toast==='function')window.toast(msg)}catch(e){}}
function pickAccent(){
 try{
  var cs=getComputedStyle(document.body);
  var raw=String((cs&&cs.getPropertyValue&&cs.getPropertyValue('--acl'))||'').trim();
  if(/^#[0-9a-f]{3,8}$/i.test(raw))return raw;
  raw=String((cs&&cs.getPropertyValue&&cs.getPropertyValue('--ac'))||'').trim();
  if(/^#[0-9a-f]{3,8}$/i.test(raw))return raw;
 }catch(e){}
 return '#14392b';
}
function formatToday(){
 try{return new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
 catch(e){return new Date().toISOString().slice(0,10)}
}
function selectedText(sel){
 if(!sel||!sel.options||sel.selectedIndex<0)return '';
 var opt=sel.options[sel.selectedIndex];
 return opt?String(opt.textContent||'').replace(/\s*\(current\)\s*$/i,'').trim():'';
}
function detectClient(root,meta){
 if(meta&&meta.client)return String(meta.client).trim();
 if(root&&typeof root.querySelector==='function'){
  var localSel=root.querySelector('#vod-client,#vp-client,[data-st="client"]');
  if(localSel){var t=selectedText(localSel);if(t)return t}
 }
 if(typeof document.querySelector==='function'){
  var hdrSel=document.querySelector('#fhp select');
  if(hdrSel){var h=selectedText(hdrSel);if(h)return h}
 }
 try{if(typeof window!=='undefined'&&typeof window.gppActiveName==='function'){var g=window.gppActiveName();if(g)return String(g).trim()}}catch(e){}
 return '';
}
function cleanTextOf(el){
 if(!el)return '';
 if(typeof el.cloneNode==='function'){
  var c=el.cloneNode(true);
  if(typeof c.querySelectorAll==='function'){
   var drop=c.querySelectorAll('.rpi,.rpi-t,.vr-i,[data-st-resize]');
   for(var i=0;i<drop.length;i++)removeEl(drop[i]);
  }
  return String(c.textContent||'').replace(/\s+/g,' ').trim();
 }
 return String(el.textContent||'').replace(/\s+/g,' ').trim();
}
function detectTitle(root,meta){
 if(meta&&meta.title)return String(meta.title).trim();
 if(root&&typeof root.querySelector==='function'){
  var h=root.querySelector('[data-rpx] h2, #hyt, .st-scen-head h2, #fh-ht, h2, h1');
  if(h){var t=cleanTextOf(h);if(t)return t}
 }
 return 'Portfolio Report';
}
function extractSummary(root){
 if(!root||typeof root.querySelector!=='function')return '';
 var items=[];
 var aph=root.querySelector('.vr-aph .vr-sum');
 if(aph&&typeof aph.querySelectorAll==='function'){
  var sp=aph.querySelectorAll(':scope > span:not(.vr-sn)');
  for(var i=0;i<sp.length;i++){var tx=cleanTextOf(sp[i]);if(tx)items.push('<span>'+escHtml(tx)+'</span>')}
 }
 if(!items.length){
  var rsum=root.querySelector('.rsum');
  if(rsum&&typeof rsum.querySelectorAll==='function'){
   var divs=rsum.querySelectorAll(':scope > div');
   for(var j=0;j<divs.length;j++){
    var k=cleanTextOf(divs[j].querySelector('.mu')),v=cleanTextOf(divs[j].querySelector('b'));
    if(k&&v)items.push('<span><small>'+escHtml(k)+'</small> <b>'+escHtml(v)+'</b></span>');
   }
  }
 }
 if(!items.length){
  var hyc=root.querySelector('.hyc');
  if(hyc){var ht=cleanTextOf(hyc);if(ht)items.push('<span>'+escHtml(ht)+'</span>')}
 }
 if(!items.length){
  var sub=root.querySelector('.st-scen-sub');
  if(sub){var st=cleanTextOf(sub);if(st)items.push('<span>'+escHtml(st)+'</span>')}
 }
 return items.length?'<div class="vr-pdf-sum">'+items.join('')+'</div>':'';
}
function isHiddenNode(el){
 if(!el)return false;
 if(el.hidden)return true;
 if(el.classList&&el.classList.contains('vr-skip'))return true;
 if(el.style&&el.style.display==='none')return true;
 try{
  if(typeof getComputedStyle==='function'){
   var cs=getComputedStyle(el);
   if(cs&&cs.display==='none')return true;
  }
 }catch(e){}
 return false;
}
function sanitizeSubtree(node){
 if(!node||typeof node.querySelectorAll!=='function')return;
 var bad=node.querySelectorAll('script,iframe,object,embed,style,.rpi,.rpi-t,.vr-i,[data-st-resize],.st-col-resizer');
 for(var i=0;i<bad.length;i++)removeEl(bad[i]);
 var all=node.querySelectorAll('*');
 for(var j=0;j<all.length;j++){
  var el=all[j];
  if(el.attributes){
   var attrs=[];
   for(var k=0;k<el.attributes.length;k++)attrs.push(el.attributes[k].name);
   for(var m=0;m<attrs.length;m++){
    var nm=attrs[m];
    if(/^on/i.test(nm)||nm==='tabindex'||nm==='aria-sort')el.removeAttribute(nm);
   }
  }
 }
}
function clonePrintableTable(liveTbl){
 if(!liveTbl||typeof liveTbl.cloneNode!=='function')return '';
 var clone=liveTbl.cloneNode(true);
 resetTable(clone);
 if(clone.classList)clone.classList.remove('nsn','st-resized');

 // Match live rows/cells against cloned rows/cells so CSS-hidden rows (vr-skip) and columns (vr-view-hold/inc) are omitted
 var liveRows=liveTbl.querySelectorAll?liveTbl.querySelectorAll('tr'):[];
 var cloneRows=clone.querySelectorAll?clone.querySelectorAll('tr'):[];
 for(var r=cloneRows.length-1;r>=0;r--){
  var lr=liveRows[r],cr=cloneRows[r];
  if(!cr)continue;
  if(lr&&isHiddenNode(lr)){removeEl(cr);continue}
  if(lr&&lr.cells&&cr.cells&&lr.cells.length===cr.cells.length){
   for(var c=cr.cells.length-1;c>=0;c--){
    if(isHiddenNode(lr.cells[c]))removeEl(cr.cells[c]);
   }
  }
 }

 sanitizeSubtree(clone);

 // Unwrap interactive <button> inside <th> while keeping line breaks (<br>) and subtitles (.rt-sub)
 if(typeof clone.querySelectorAll==='function'){
  var thBtns=clone.querySelectorAll('th button');
  for(var b=0;b<thBtns.length;b++){
   var btn=thBtns[b],parent=btn.parentNode;
   if(!parent)continue;
   var span=document.createElement('span');
   span.className='vr-pdf-th';
   span.innerHTML=btn.innerHTML.replace(/\s*[▲▼]\s*$/,'');
   parent.replaceChild(span,btn);
  }
 }

 // Ensure the header row lives in a <thead> so headers repeat cleanly on every printed page
 var hasThead=clone.querySelector&&clone.querySelector('thead');
 if(!hasThead&&clone.querySelector&&typeof document.createElement==='function'){
  var firstRow=clone.querySelector('tr');
  if(firstRow&&firstRow.querySelector&&firstRow.querySelector('th')&&!firstRow.querySelector('td')){
   var thead=document.createElement('thead');
   thead.appendChild(firstRow);
   if(clone.firstChild)clone.insertBefore(thead,clone.firstChild);
   else clone.appendChild(thead);
  }
 }

 return clone.outerHTML||'';
}
function clonePrintablePanel(panel){
 if(!panel||typeof panel.cloneNode!=='function')return '';
 var clone=panel.cloneNode(true);
 sanitizeSubtree(clone);
 if(typeof clone.querySelectorAll==='function'){
  var btns=clone.querySelectorAll('button,.sx-act,.fh-tabs');
  for(var i=0;i<btns.length;i++)removeEl(btns[i]);
 }
 return clone.outerHTML||'';
}
function buildPrintDocument(opts){
 var title=escHtml(opts.title||'Portfolio Report');
 var client=escHtml(opts.client||'');
 var when=escHtml(opts.generatedOn||formatToday());
 var accent=/^#[0-9a-f]{3,8}$/i.test(String(opts.accent||''))?opts.accent:'#14392b';
 var docTitle='Vriddhi - '+title+(client?' - '+client:'');
 var fitScript=opts.isTable?('<script>(function(){function fit(){var w=document.getElementById("vr-pdf-wrap");var t=w&&w.querySelector("table");if(!w||!t)return;t.style.zoom="";t.classList.remove("pdf-tight","pdf-ultra");var avail=w.clientWidth||980;var need=Math.max(t.scrollWidth||0,t.offsetWidth||0);if(need>avail+1){t.classList.add("pdf-tight");need=Math.max(t.scrollWidth||0,t.offsetWidth||0)}if(need>avail+1){t.classList.add("pdf-ultra");need=Math.max(t.scrollWidth||0,t.offsetWidth||0)}if(need>avail+1){var z=Math.max(0.35,Math.min(1,Math.floor(((avail-2)/need)*1000)/1000));t.style.zoom=String(z)}}window.__vrPdfFit=fit;fit()})();</'+'script>'):'';
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+docTitle+'</title><style>'
  +':root{--ac:'+accent+';--tx:#0f172a;--mu:#475569;--bd:#cbd5e1;--soft:#f1f5f9;--card:#ffffff;--ok:#15803d;--er:#dc2626}'
  +'@page{size:A4 landscape;margin:9mm}'
  +'*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
  +'html,body{margin:0;padding:0;background:#fff;color:var(--tx);font:11.5px/1.35 Inter,-apple-system,"Segoe UI",Roboto,Arial,"Noto Sans Devanagari",sans-serif}'
  +'.vr-pdf-page{width:100%;max-width:100%;padding:0}'
  +'.vr-pdf-head{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;padding:0 0 8px;margin:0 0 8px;border-bottom:2px solid var(--ac)}'
  +'.vr-pdf-brand{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--ac);margin:0 0 2px}'
  +'.vr-pdf-head h1{margin:0;font-size:17px;font-weight:800;line-height:1.2;color:var(--tx)}'
  +'.vr-pdf-meta{text-align:right;font-size:10.5px;color:var(--mu);line-height:1.4;white-space:nowrap}'
  +'.vr-pdf-meta b{color:var(--tx)}'
  +'.vr-pdf-sum{display:flex;flex-wrap:wrap;gap:6px 14px;padding:6px 10px;margin:0 0 8px;border:1px solid var(--bd);border-radius:6px;background:var(--soft);font-size:10.5px}'
  +'.vr-pdf-sum small{color:var(--mu);font-weight:600;margin-right:3px}.vr-pdf-sum b{color:var(--tx);font-weight:700}'
  +'#vr-pdf-wrap{width:100%;overflow:hidden}'
  +'table{width:100%;min-width:0!important;max-width:none!important;border-collapse:collapse;table-layout:auto;font-size:10.5px;font-variant-numeric:tabular-nums}'
  +'thead{display:table-header-group}tfoot{display:table-row-group}tr{break-inside:avoid;page-break-inside:avoid}'
  +'th{background:color-mix(in srgb,var(--ac) 14%,#ffffff);color:var(--tx);font-weight:700;text-align:right;vertical-align:bottom;padding:5px 4px;border:1px solid var(--bd);border-bottom:2px solid var(--ac);white-space:normal;overflow-wrap:break-word;line-height:1.18;font-size:10px}'
  +'th:nth-child(-n+3),td:nth-child(-n+3){text-align:left}'
  +'td{padding:4px 4px;border:1px solid var(--bd);text-align:right;vertical-align:top;line-height:1.25;white-space:nowrap;color:var(--tx)}'
  +'td.l,td:last-child,th:last-child,td.hz-w,th.hz-w,table.vp-sumt td{white-space:normal;overflow-wrap:break-word;text-align:left}'
  +'td.l:last-child,td.hz-w{max-width:140px}'
  +'tbody tr:nth-child(even) td{background:#f8fafc}'
  +'tr.sel td,tr.st-sel td{background:color-mix(in srgb,var(--ac) 16%,#ffffff)!important;font-weight:600}'
  +'tr.vr-ret td,tr.st-base td{background:color-mix(in srgb,var(--ac) 10%,#ffffff)}'
  +'tr.vr-tot td,tr.itot td,tr.hz-tot td,tr.t td{background:color-mix(in srgb,var(--ac) 11%,#ffffff)!important;border-top:2px solid var(--ac);font-weight:700}'
  +'.rt-sub{display:block;font-size:8.5px;font-weight:500;color:var(--mu);line-height:1.15}'
  +'.rtg,.vr-tdy,.st-ch,.vp-chip{display:inline-block;padding:0 5px;border-radius:99px;font-size:8.5px;font-weight:700;border:1px solid var(--bd);background:#fff;color:var(--ac);margin-top:2px}'
  +'.rtg,.st-ch.ok,.hz-income,.dz-o{color:var(--ok)}.st-ch.bad,.neg,.hz-expense,.dz-b{color:var(--er)}.dz-w{color:#b45309}.hz-ev{font-style:italic;color:#0f766e}'
  +'.st-mb{display:none}.st-sv{display:flex;align-items:center;justify-content:flex-end;gap:4px}'
  +'table.pdf-tight th{padding:4px 3px;font-size:9.2px}table.pdf-tight td{padding:3.5px 3px;font-size:9.5px}'
  +'table.pdf-ultra th{padding:3px 2px;font-size:8.5px;line-height:1.1}table.pdf-ultra td{padding:2.5px 2px;font-size:8.5px;line-height:1.15}'
  +'table.pdf-ultra td.l:last-child,table.pdf-ultra td.hz-w{max-width:115px}'
  +'.sx-hero,.sx-pill,.sx-b,.pt{border:1px solid var(--bd);border-radius:6px;padding:8px 10px;margin-bottom:8px;break-inside:avoid}'
  +'.sx-pills,.sx-big{display:flex;flex-wrap:wrap;gap:8px}.sx-pill{flex:1 1 120px}.sx-tl{list-style:none;padding:0;margin:0}'
  +'.vr-pdf-foot{margin-top:8px;padding-top:6px;border-top:1px solid var(--bd);display:flex;justify-content:space-between;font-size:9px;color:var(--mu)}'
  +'</style></head><body><div class="vr-pdf-page">'
  +'<header class="vr-pdf-head"><div><div class="vr-pdf-brand">Vriddhi · Wealth &amp; Retirement Planner</div><h1>'+title+'</h1></div>'
  +'<div class="vr-pdf-meta">'+(client?'<div>Client: <b>'+client+'</b></div>':'')+'<div>Generated: <b>'+when+'</b></div></div></header>'
  +(opts.summaryHtml||'')
  +'<div id="vr-pdf-wrap">'+(opts.bodyHtml||'')+'</div>'
  +'<footer class="vr-pdf-foot"><span>Vriddhi · Private Financial Report</span><span>Estimates only, not financial advice · Amounts in ₹</span></footer>'
  +'</div>'+fitScript+'</body></html>';
}
function printHtmlInIframe(htmlDoc){
 if(!document.body||typeof document.body.appendChild!=='function')return false;
 var prev=document.getElementById('vr-pdf-frame');
 if(prev)removeEl(prev);
 var frame=document.createElement('iframe');
 frame.id='vr-pdf-frame';
 frame.setAttribute('aria-hidden','true');
 frame.setAttribute('title','Printable report');
 if(frame.style)frame.style.cssText='position:fixed;left:-10000px;top:0;width:1020px;height:740px;border:0;opacity:0;pointer-events:none';
 document.body.appendChild(frame);
 var cleaned=false;
 function cleanup(){if(cleaned)return;cleaned=true;removeEl(frame)}
 try{
  var win=frame.contentWindow,doc=frame.contentDocument||(win&&win.document);
  if(!win||!doc)throw new Error('Print frame unavailable');
  doc.open();
  doc.write(htmlDoc);
  doc.close();
  var trigger=function(){
   try{
    if(typeof win.__vrPdfFit==='function')win.__vrPdfFit();
    if(typeof win.addEventListener==='function')win.addEventListener('afterprint',cleanup,{once:true});
    if(typeof win.focus==='function')win.focus();
    win.print();
   }catch(err){
    cleanup();
    notify('Could not open print dialog for PDF export.');
   }
   if(typeof setTimeout==='function')setTimeout(cleanup,60000);
  };
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(function(){requestAnimationFrame(trigger)});
  else trigger();
  return true;
 }catch(e){
  cleanup();
  notify('Could not prepare PDF export.');
  return false;
 }
}
function exportReportPDF(root,meta){
 if(!root)return false;
 var opts=meta||{};
 var tbl=null;
 if(typeof root.querySelectorAll==='function'){
  var all=root.querySelectorAll('table.rt,table.vp-t,table.st-t,table.sx-t');
  for(var i=0;i<all.length;i++){if(!isHiddenNode(all[i])){tbl=all[i];break}}
 }
 var bodyHtml='',isTable=false;
 if(root.id==='dg'&&typeof root.querySelector==='function'){
  var sum=root.querySelector('#fh-s-summary:not([hidden])');
  var ms=root.querySelector('#fh-s-milestones:not([hidden])');
  var panel=sum||ms;
  if(panel){bodyHtml=clonePrintablePanel(panel);isTable=false}
 }
 if(!bodyHtml&&tbl){
  bodyHtml=clonePrintableTable(tbl);
  isTable=true;
 }
 if(!bodyHtml){
  notify('No report content available to export.');
  return false;
 }
 var htmlDoc=buildPrintDocument({
  title:detectTitle(root,opts),
  client:detectClient(root,opts),
  generatedOn:formatToday(),
  summaryHtml:extractSummary(root),
  bodyHtml:bodyHtml,
  accent:pickAccent(),
  isTable:isTable
 });
 return printHtmlInIframe(htmlDoc);
}

function syncRetirement(){
 var d=document.getElementById('dg'),sum=document.getElementById('fh-s-summary'),ms=document.getElementById('fh-s-milestones'),add=document.getElementById('fh-sx-add'),
 rep=!!(d&&sum&&ms&&(!sum.hidden||!ms.hidden)),btn=document.getElementById('fh-max');
 if(d){d.classList.toggle('fh-full',rep&&pref);fitContainer(d,rep&&pref)}
 if(!add){syncPdfBtn('fh-pdf','',null,null,false);return}
 if(!btn){var ed=document.getElementById('fh-hedit');btn=mk('fh-max',(ed&&ed.className)||add.className);var hx=document.getElementById('fh-hx');if(hx&&hx.parentNode)hx.parentNode.insertBefore(btn,hx);else add.insertAdjacentElement('afterend',btn)}
 btn.hidden=!rep;paint(btn,rep&&pref);
 syncPdfBtn('fh-pdf',(btn.className?btn.className+' ':'')+'fh-pdf',btn.parentNode,btn,rep&&pref)}
function syncPage(){
 var m=document.getElementById('m'),host=m&&m.querySelector('[data-rpx]'),btn=document.getElementById('rp-max');
 if(!m)return;
 if(!host){m.classList.remove('vr-rmax');clearContainer(m);syncPdfBtn('rp-pdf','',null,null,false);return}
 if(btn&&!host.contains(btn)){btn.remove();btn=null}
 if(!btn){btn=mk('rp-max','rp-max');host.appendChild(btn)}
 m.classList.toggle('vr-rmax',pref);
 var bg=getComputedStyle(document.body).backgroundColor;if(m.style.getPropertyValue('--vr-bg')!==bg)m.style.setProperty('--vr-bg',bg);
 paint(btn,pref);
 syncPdfBtn('rp-pdf','rp-pdf',host,btn,pref);
 fitContainer(m,pref)}
function syncPopup(){
 var d=document.getElementById('hydlg');if(!d)return;
 d.classList.toggle('hy-full',d.open&&pref);if(!d.open){clearContainer(d);syncPdfBtn('hy-pdf','',null,null,false);return}
 var x=d.querySelector('[data-hyx]'),btn=document.getElementById('hy-max');if(!x)return;
 if(!btn||!d.contains(btn)){if(btn)btn.remove();btn=mk('hy-max','hy-max');x.insertAdjacentElement('beforebegin',btn)}
 paint(btn,pref);
 syncPdfBtn('hy-pdf','hy-pdf',btn.parentNode,btn,pref);
 fitContainer(d,pref)}
function sync(){raf=0;syncRetirement();syncPage();syncPopup();if(pref)scheduleFit(70)}
function queue(){if(!raf)raf=requestAnimationFrame(sync)}
function toggle(){pref=!pref;try{localStorage.setItem(KEY,pref?'1':'0')}catch(x){}sync()}
document.addEventListener('click',function(e){
 var pdfBtn=e.target&&e.target.closest&&e.target.closest('#rp-pdf,#hy-pdf,#fh-pdf');
 if(pdfBtn){
  e.preventDefault();e.stopPropagation();
  var targetRoot=pdfBtn.id==='hy-pdf'?document.getElementById('hydlg'):pdfBtn.id==='fh-pdf'?document.getElementById('dg'):document.getElementById('m');
  exportReportPDF(targetRoot);
  return;
 }
 var b=e.target&&e.target.closest&&e.target.closest('#fh-max,#rp-max,#hy-max');
 if(b){e.preventDefault();e.stopPropagation();toggle();return}
 if(pref&&e.target&&e.target.closest&&e.target.closest('[data-aph-cols],[data-aph-years],[data-hzca],[data-msda],[data-vp="rtype"]'))scheduleFit(50);
},true);
document.addEventListener('keydown',function(e){if(e.key!=='Escape'||!pref)return;var m=document.getElementById('m');
 if(!m||!m.classList.contains('vr-rmax')||document.querySelector('dialog[open]')||document.querySelector('.msd-p:not([hidden])'))return;
 e.preventDefault();toggle()});
new MutationObserver(queue).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','open']});
document.addEventListener('close',queue,true);
if(typeof window!=='undefined'){
 if(window.addEventListener)window.addEventListener('resize',function(){if(pref)scheduleFit(40)});
 window.vrReportFit=fitAll;
 window.vrExportReportPDF=exportReportPDF;
 window.__vrPdfBuilder={buildPrintDocument:buildPrintDocument,clonePrintableTable:clonePrintableTable,escHtml:escHtml};
}
queue();
})();
