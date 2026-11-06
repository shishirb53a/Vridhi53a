(function(){var T=[['status','Status'],['plan','Plan'],['insights','Insights'],['alloc','Allocation']],cur='status',K={'executive status':'rt-status','projection intelligence':'rt-insights','family milestones':'rt-insights','funding breakdown':'rt-alloc'};
function ensure(){var d=document.getElementById('dsh');if(!d||!d.classList.contains('fh-dsh')||!d.querySelector(':scope>.dz-hero'))return;
[].forEach.call(d.querySelectorAll(':scope>.dz-card'),function(c){var e=c.querySelector('.dz-ey'),k=e&&K[e.textContent.trim().toLowerCase()];if(k&&!c.classList.contains(k))c.classList.add(k)});
var b=d.querySelector(':scope>.rtabs');
if(!b){b=document.createElement('div');b.className='rtabs';b.setAttribute('role','group');b.setAttribute('aria-label','Retirement report sections');
b.innerHTML=T.map(function(t){return'<button type="button" data-rtab="'+t[0]+'" aria-pressed="false">'+t[1]+'</button>'}).join('');
var h=d.querySelector(':scope>.dz-hero');d.insertBefore(b,h?h.nextSibling:d.firstChild)}
if(d.dataset.rt!==cur)d.dataset.rt=cur;b.querySelectorAll('button').forEach(function(x){var on=String(x.dataset.rtab===cur);if(x.getAttribute('aria-pressed')!==on)x.setAttribute('aria-pressed',on)})}
document.addEventListener('click',function(e){var x=e.target.closest&&e.target.closest('.rtabs button');if(!x)return;e.stopPropagation();cur=x.dataset.rtab;ensure()},true);
var m=document.getElementById('m');if(m)new MutationObserver(ensure).observe(m,{childList:true});ensure()})();