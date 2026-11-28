/* usability: numeric keypad on mobile, select-all on focus */
(function(){
  const fixInput=i=>{if(!i.inputMode)i.inputMode=(i.step&&i.step!=='1'&&i.step!=='any')||i.step==='any'?'decimal':'numeric'};
  const fix=r=>{if(!r)return;if(r.tagName==='INPUT'){if(r.type==='number')fixInput(r);return}if(r.querySelectorAll)r.querySelectorAll('input[type=number]').forEach(fixInput)};
  document.addEventListener('focusin',e=>{const t=e.target;if(t&&t.matches&&t.matches('input[type=number],input[type=text]')&&!t.closest('.tb'))setTimeout(()=>{try{if(document.activeElement===t)t.select()}catch(_){}},0)});
  new MutationObserver(recs=>{for(let i=0;i<recs.length;i++){const an=recs[i].addedNodes;if(!an||!an.length)continue;for(let j=0;j<an.length;j++){const n=an[j];if(n.nodeType!==1)continue;const tg=n.tagName;if(tg==='SPAN'||tg==='TD'||tg==='TH'||tg==='TR')continue;fix(n)}}}).observe(document.documentElement,{childList:true,subtree:true});
  fix(document);
})();
(function(){
  let w=null,x=0,y=0,sl=0,st=0,mv=false;
  document.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button!==0)return;const t=e.target.closest&&e.target.closest('table.rt');if(!t||e.target.closest('button,a,input,select'))return;w=t.parentElement;x=e.clientX;y=e.clientY;sl=w.scrollLeft;st=w.scrollTop;mv=false});
  document.addEventListener('pointermove',e=>{if(!w)return;const dx=e.clientX-x,dy=e.clientY-y;if(!mv&&Math.abs(dx)+Math.abs(dy)>5){mv=true;w.classList.add('drag');w.style.cursor='grabbing'}if(mv){w.scrollLeft=sl-dx;w.scrollTop=st-dy}});
  const end=()=>{if(w){w.classList.remove('drag');w.style.cursor=''}w=null};
  document.addEventListener('pointerup',end);
  document.addEventListener('pointercancel',end);
  document.addEventListener('click',e=>{if(mv){e.stopPropagation();e.preventDefault();mv=false}},true);
})();

