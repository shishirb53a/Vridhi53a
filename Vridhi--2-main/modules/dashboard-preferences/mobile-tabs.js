(function(){var T=[['status','Status'],['plan','Plan'],['insights','Insights'],['alloc','Allocation']],cur='status';
function ensure(){var d=document.getElementById('dsh');if(!d)return;var b=d.querySelector(':scope>.mtabs');
if(!b){b=document.createElement('div');b.className='mtabs';b.setAttribute('role','group');b.setAttribute('aria-label','Summary sections');
b.innerHTML=T.map(function(t){return'<button type="button" data-mtab="'+t[0]+'" aria-pressed="false">'+t[1]+'</button>'}).join('');
var h=d.querySelector(':scope>.dz-hero');d.insertBefore(b,h?h.nextSibling:d.firstChild)}
d.dataset.mt=cur;b.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',String(x.dataset.mtab===cur))})}
document.addEventListener('click',function(e){var x=e.target.closest&&e.target.closest('.mtabs button');if(!x)return;e.stopPropagation();cur=x.dataset.mtab;ensure()},true);
var m=document.getElementById('m');if(m)new MutationObserver(ensure).observe(m,{childList:true});ensure()})();