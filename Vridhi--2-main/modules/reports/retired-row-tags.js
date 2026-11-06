(function(){
const obs=new MutationObserver(function(){mark(false)});
function mark(scroll){obs.disconnect();try{const m=document.getElementById('m');if(!m||UI.tab!=='Reports')return;
m.querySelectorAll('.agsel').forEach(function(e){e.classList.remove('agsel');e.removeAttribute('aria-current')});
/* one Retired tag per retirement row, in the period cell (As on / Month / Financial year), found by its column key so it never depends on which columns are showing */
m.querySelectorAll('#rr table').forEach(function(t){var hs=t.rows[0]?Array.prototype.map.call(t.rows[0].cells,function(c){var b=c.querySelector('button[data-rk]');return b?b.dataset.rk:''}):[],ci=hs.indexOf('year');if(ci<0)return;Array.prototype.forEach.call(t.querySelectorAll('tr.a:not(.t)'),function(r){var c=r.cells[ci];if(c&&!c.querySelector('.rtg'))c.insertAdjacentHTML('beforeend','<span class="rtg">Retired</span>')})});
m.querySelectorAll('.rc details.a summary b:not(:has(.rtg))').forEach(function(c){c.insertAdjacentHTML('beforeend','<span class="rtg">Retired</span>')});
const a=UI.age==null?48:UI.age,rows=calc(S).rows,j=rows.findIndex(function(r){return r.age[0]===a});if(j<0)return;
let keys=[];if(UI.rv==='month'){if(j>=1)for(let k=(j-1)*12+1;k<=j*12;k++)keys.push(k)}else if(UI.rv==='int'){if(j>=1)keys=[j]}else keys=[j+1];
const hit=[];keys.forEach(function(k){m.querySelectorAll('#rr [data-r="'+k+'"]').forEach(function(e){e.classList.add('agsel');e.setAttribute('aria-current','true');hit.push(e)})});
const t=hit.find(function(e){return e.tagName==='TR'&&e.offsetParent})||null;
if(scroll&&t){const sc=document.getElementById('rr');if(sc&&sc.scrollHeight>sc.clientHeight)sc.scrollTop+=t.getBoundingClientRect().top-sc.getBoundingClientRect().top-96}
}finally{const m=document.getElementById('m');if(m)obs.observe(m,{childList:true,subtree:true})}}
document.addEventListener('input',function(e){if(e.target.id==='agr')mark(true)});
const r1=window.render;window.render=function(){const r=r1.apply(this,arguments);mark(false);return r};
mark(false);
})();