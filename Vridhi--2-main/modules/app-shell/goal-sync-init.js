(function(){
  document.addEventListener('input',function(e){if(e.target.id!=='goalcr')return;const v=parseFloat(e.target.value);if(!(v>0)||!isFinite(v))return;
  S.goal=Math.max(1,Math.min(1e12,Math.round(v*1e7)));save();dupd()});
  document.addEventListener('change',function(e){if(e.target.id!=='goalcr')return;const v=parseFloat(e.target.value);if(!(v>0)||!isFinite(v))e.target.value=+(S.goal/1e7).toFixed(4)});
  document.addEventListener('click',function(e){const b=e.target.closest&&e.target.closest('[data-gp]');if(!b)return;
  S.goal=Math.round(parseFloat(b.dataset.gp)*1e7);save();const i=document.getElementById('goalcr');if(i)i.value=+b.dataset.gp;dupd()});
  const o=window.render;window.render=function(){const r=o.apply(this,arguments);if(window.dzFill)dzFill();return r};
})();
