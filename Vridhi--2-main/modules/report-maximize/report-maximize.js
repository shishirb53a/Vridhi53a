
/* Reports open full size, with a Maximize / Restore button. One remembered choice for all of them:
   Goal Planner > Reports (every tab), the holding report pop-up, and the Retirement Planner report pop-up. */
(function(){
var KEY='vr-rep-max',pref=true,raf=0;
try{pref=localStorage.getItem(KEY)!=='0'}catch(e){}
var IC={max:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',min:'<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'};
function icon(k){return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+IC[k]+'</svg>'}
function paint(btn,full){var st=full?'1':'0';if(btn.dataset.s===st)return;btn.dataset.s=st;btn.setAttribute('aria-pressed',full?'true':'false');var t=full?'Restore':'Maximize';btn.title=t+' report';btn.setAttribute('aria-label',t+' report');btn.innerHTML=icon(full?'min':'max')+(btn.id==='rp-max'?'':'<span>'+t+'</span>')}
function mk(id,cls){var b=document.createElement('button');b.type='button';b.id=id;b.className=cls;return b}
function syncRetirement(){
 var d=document.getElementById('dg'),sum=document.getElementById('fh-s-summary'),ms=document.getElementById('fh-s-milestones'),add=document.getElementById('fh-sx-add'),
 rep=!!(d&&sum&&ms&&(!sum.hidden||!ms.hidden)),btn=document.getElementById('fh-max');
 if(d)d.classList.toggle('fh-full',rep&&pref);
 if(!add)return;
 if(!btn){var ed=document.getElementById('fh-hedit');btn=mk('fh-max',(ed&&ed.className)||add.className);var hx=document.getElementById('fh-hx');if(hx&&hx.parentNode)hx.parentNode.insertBefore(btn,hx);else add.insertAdjacentElement('afterend',btn)}
 btn.hidden=!rep;paint(btn,rep&&pref)}
function syncPage(){
 var m=document.getElementById('m'),host=m&&m.querySelector('[data-rpx]'),btn=document.getElementById('rp-max');
 if(!m)return;
 if(!host){m.classList.remove('vr-rmax');return}
 if(btn&&!host.contains(btn)){btn.remove();btn=null}
 if(!btn){btn=mk('rp-max','rp-max');host.appendChild(btn)}
 m.classList.toggle('vr-rmax',pref);
 var bg=getComputedStyle(document.body).backgroundColor;if(m.style.getPropertyValue('--vr-bg')!==bg)m.style.setProperty('--vr-bg',bg);
 paint(btn,pref)}
function syncPopup(){
 var d=document.getElementById('hydlg');if(!d)return;
 d.classList.toggle('hy-full',d.open&&pref);if(!d.open)return;
 var x=d.querySelector('[data-hyx]'),btn=document.getElementById('hy-max');if(!x)return;
 if(!btn||!d.contains(btn)){if(btn)btn.remove();btn=mk('hy-max','hy-max');x.insertAdjacentElement('beforebegin',btn)}
 paint(btn,pref)}
function sync(){raf=0;syncRetirement();syncPage();syncPopup()}
function queue(){if(!raf)raf=requestAnimationFrame(sync)}
function toggle(){pref=!pref;try{localStorage.setItem(KEY,pref?'1':'0')}catch(x){}sync()}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#fh-max,#rp-max,#hy-max');if(!b)return;e.preventDefault();e.stopPropagation();toggle()},true);
document.addEventListener('keydown',function(e){if(e.key!=='Escape'||!pref)return;var m=document.getElementById('m');
 if(!m||!m.classList.contains('vr-rmax')||document.querySelector('dialog[open]')||document.querySelector('.msd-p:not([hidden])'))return;
 e.preventDefault();toggle()});
new MutationObserver(queue).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','open']});
document.addEventListener('close',queue,true);queue();
})();
