(function(){
window.rpDate=function(){const dt=new Date(),F=function(o){return dt.toLocaleDateString(DLC(),o)};
return'<span class="rpd"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>'+F({weekday:'long'})+', '+F({day:'numeric',month:'short',year:'numeric'})+'</span>'};
document.addEventListener('click',function(e){const b=e.target.closest&&e.target.closest('[data-hc]');if(!b)return;
const v=b.dataset.hc,pres=CATS.slice();
if(v==='__all')UI.hc=null;
else if(v==='__none')UI.hc=[];
else if(!UI.hc)UI.hc=[v];
else{const k=UI.hc.indexOf(v);if(k>-1)UI.hc.splice(k,1);else UI.hc.push(v);if(UI.hc.length===pres.length)UI.hc=null}
render();const n=Array.from(document.querySelectorAll('[data-hc]')).filter(function(x){return x.dataset.hc===v})[0];if(n)n.focus()});
})();