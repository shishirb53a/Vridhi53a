/* usability: numeric keypad on mobile, select-all on focus */
(function(){
  const fix=r=>r.querySelectorAll&&r.querySelectorAll('input[type=number]').forEach(i=>{if(!i.inputMode)i.inputMode=(i.step&&i.step!=='1'&&i.step!=='any')||i.step==='any'?'decimal':'numeric'});
  document.addEventListener('focusin',e=>{const t=e.target;if(t&&t.matches&&t.matches('input[type=number],input[type=text]')&&!t.closest('.tb'))setTimeout(()=>{try{if(document.activeElement===t)t.select()}catch(_){}},0)});
  new MutationObserver(()=>fix(document)).observe(document.documentElement,{childList:true,subtree:true});
  fix(document);
})();
(function(){
  let w=null,x0=0,s0=0,mv=0;
  document.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button)return;const c=e.target.closest&&e.target.closest('table.rt');if(!c||e.target.closest('button,input,select,a'))return;w=c.parentElement;x0=e.clientX;s0=w.scrollLeft;mv=0});
  document.addEventListener('pointermove',e=>{if(!w)return;const d=e.clientX-x0;if(Math.abs(d)>5)mv=1;if(mv){w.scrollLeft=s0-d;w.style.cursor='grabbing'}});
  const up=()=>{if(w)w.style.cursor='';w=null};
  document.addEventListener('pointerup',up);
  document.addEventListener('pointercancel',up);
  document.addEventListener('click',e=>{if(mv){e.stopPropagation();e.preventDefault();mv=0}},true);
})();
(function(){
  let w=null,x=0,y=0,sl=0,st=0,mv=false;
  document.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;const t=e.target.closest&&e.target.closest('table.rt');if(!t||e.target.closest('button,a,input,select'))return;w=t.parentElement;x=e.clientX;y=e.clientY;sl=w.scrollLeft;st=w.scrollTop;mv=false});
  document.addEventListener('pointermove',e=>{if(!w)return;const dx=e.clientX-x,dy=e.clientY-y;if(!mv&&Math.abs(dx)+Math.abs(dy)>5){mv=true;w.classList.add('drag')}if(mv){w.scrollLeft=sl-dx;w.scrollTop=st-dy}});
  const end=()=>{if(w)w.classList.remove('drag');w=null};
  document.addEventListener('pointerup',end);
  document.addEventListener('pointercancel',end);
  document.addEventListener('click',e=>{if(mv){e.stopPropagation();e.preventDefault();mv=false}},true);
})();
