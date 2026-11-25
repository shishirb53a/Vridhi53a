
/* Reports open full size, with a Maximize / Restore button. One remembered choice for all of them:
   Goal Planner > Reports (every tab), Retirement Planner (Year-by-year plan and Summary/Milestones pop-up),
   Policies > Reports, and the holding report pop-up.
   When maximized, all visible report columns are fitted into a single-page width without horizontal scrolling. */
(function(){
var KEY='vr-rep-max',pref=true,raf=0,fitTimer=0,fitting=false;
var FIT_SEL='table.rt,table.vp-t,table.sx-t';
try{pref=localStorage.getItem(KEY)!=='0'}catch(e){}
var IC={max:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',min:'<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'};
function icon(k){return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+IC[k]+'</svg>'}
function paint(btn,full){var st=full?'1':'0';if(btn.dataset.s===st)return;btn.dataset.s=st;btn.setAttribute('aria-pressed',full?'true':'false');var t=full?'Restore':'Maximize';btn.title=t+' report';btn.setAttribute('aria-label',t+' report');btn.innerHTML=icon(full?'min':'max')+(btn.id==='rp-max'?'':'<span>'+t+'</span>')}
function mk(id,cls){var b=document.createElement('button');b.type='button';b.id=id;b.className=cls;return b}

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

function syncRetirement(){
 var d=document.getElementById('dg'),sum=document.getElementById('fh-s-summary'),ms=document.getElementById('fh-s-milestones'),add=document.getElementById('fh-sx-add'),
 rep=!!(d&&sum&&ms&&(!sum.hidden||!ms.hidden)),btn=document.getElementById('fh-max');
 if(d){d.classList.toggle('fh-full',rep&&pref);fitContainer(d,rep&&pref)}
 if(!add)return;
 if(!btn){var ed=document.getElementById('fh-hedit');btn=mk('fh-max',(ed&&ed.className)||add.className);var hx=document.getElementById('fh-hx');if(hx&&hx.parentNode)hx.parentNode.insertBefore(btn,hx);else add.insertAdjacentElement('afterend',btn)}
 btn.hidden=!rep;paint(btn,rep&&pref)}
function syncPage(){
 var m=document.getElementById('m'),host=m&&m.querySelector('[data-rpx]'),btn=document.getElementById('rp-max');
 if(!m)return;
 if(!host){m.classList.remove('vr-rmax');clearContainer(m);return}
 if(btn&&!host.contains(btn)){btn.remove();btn=null}
 if(!btn){btn=mk('rp-max','rp-max');host.appendChild(btn)}
 m.classList.toggle('vr-rmax',pref);
 var bg=getComputedStyle(document.body).backgroundColor;if(m.style.getPropertyValue('--vr-bg')!==bg)m.style.setProperty('--vr-bg',bg);
 paint(btn,pref);
 fitContainer(m,pref)}
function syncPopup(){
 var d=document.getElementById('hydlg');if(!d)return;
 d.classList.toggle('hy-full',d.open&&pref);if(!d.open){clearContainer(d);return}
 var x=d.querySelector('[data-hyx]'),btn=document.getElementById('hy-max');if(!x)return;
 if(!btn||!d.contains(btn)){if(btn)btn.remove();btn=mk('hy-max','hy-max');x.insertAdjacentElement('beforebegin',btn)}
 paint(btn,pref);
 fitContainer(d,pref)}
function sync(){raf=0;syncRetirement();syncPage();syncPopup();if(pref)scheduleFit(70)}
function queue(){if(!raf)raf=requestAnimationFrame(sync)}
function toggle(){pref=!pref;try{localStorage.setItem(KEY,pref?'1':'0')}catch(x){}sync()}
document.addEventListener('click',function(e){
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
}
queue();
})();
