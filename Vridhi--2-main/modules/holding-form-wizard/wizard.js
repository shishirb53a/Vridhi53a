(function(){
var N=['Details','Contribution','Interest','Preview','Notes'];
function pvFill(f){var box=f.querySelector('#pvin');if(!box)return;
function g(id){var e=f.querySelector('#'+id);return e?e.value:''}
function money(v){var n=+v;return v!==''&&isFinite(n)?'\u20b9 '+n.toLocaleString('en-IN'):'\u2014'}
var MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function mon(v){var m=/^(\d{4})-(\d{2})/.exec(v||'');return m?MN[+m[2]-1]+' '+m[1]:'\u2014'}
function day(v){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(v||'');return m?(+m[3])+' '+MN[+m[2]-1]+' '+m[1]:'\u2014'}
function lab(n){var c=f.querySelector('input[name='+n+']:checked'),l=c&&c.closest('label'),b=l&&l.querySelector('b');return c?(b?b.textContent:(l?l.textContent.trim():c.value)):''}
var R=[],fc=f.querySelector('#fc');
R.push(['Name',g('fn').trim()||'\u2014']);
R.push(['Category',fc&&fc.selectedOptions[0]?fc.selectedOptions[0].textContent.trim():'\u2014']);
if(f.querySelector('#fv')){R.push(['Current investment',money(g('fv'))]);R.push(['Balance as of',day(g('fd'))])}
if(f.querySelector('#fr'))R.push(['Expected return',g('fr')!==''?g('fr')+'% p.a.':'\u2014']);
if(g('fmat')!=='')R.push(['Maturity year',g('fmat')]);
var fk=f.querySelector('input[name=fk]:checked');
if(fk){var yr=fk.value==='yearly';R.push(['Contribution',lab('fk')||(yr?'Yearly':'Monthly')]);
if(!yr){R.push(['Monthly addition',money(g('fo'))]);R.push(['Addition from',mon(g('fmf'))]);R.push(['Addition until',mon(g('fmt'))])}
else{R.push(['Yearly addition',money(g('fa'))]);var fs=f.querySelector('#famsel'),fo=fs&&fs.selectedOptions[0];R.push(['Paid in month',fo?(fo.title||fo.textContent):'\u2014']);R.push(['Addition from',g('fyf')||'\u2014']);R.push(['Addition until',g('fyt')||'\u2014'])}}
var cm=lab('fcm');if(cm)R.push(['Interest calculation',cm]);
box.textContent='';R.forEach(function(r){var d=document.createElement('div');d.className='pvi';var a=document.createElement('span'),b=document.createElement('b');a.textContent=r[0];b.textContent=r[1];d.appendChild(a);d.appendChild(b);box.appendChild(d)})}
function go(f,s){f.setAttribute('data-wz',s);if(s===4)pvFill(f);[].forEach.call(f.querySelectorAll('[data-wzs]'),function(b){var on=+b.getAttribute('data-wzs')===s;b.setAttribute('aria-selected',on?'true':'false');b.tabIndex=on?0:-1})}
function build(f){var ns=f.querySelector('#ntx'),nsec=ns&&ns.closest('.hs'),hs=[].slice.call(f.querySelectorAll('.hs')).filter(function(e){return e!==nsec}),n=hs.length;if(n<3){f.setAttribute('data-wz','0');return}
hs.forEach(function(e,i){e.setAttribute('data-ws',n>=4?(i<2?1:i===2?2:3):i+1)});
var hp=f.querySelector('#hp');if(hp)hp.setAttribute('data-ws','3');if(nsec)nsec.setAttribute('data-ws','5');
var fr=f.querySelector('#fr'),gs=fr&&fr.closest('.hs');
if(gs&&gs.getAttribute('data-ws')==='3'){var sec=document.createElement('section');sec.className='hs';sec.setAttribute('data-ws','1');sec.innerHTML='<h3>Growth Assumptions</h3><div class="hg"></div>';var hg=sec.lastChild,fm=f.querySelector('#fmat');[fr.closest('.hf1'),fm&&fm.closest('.hf1')].forEach(function(e){if(e)hg.appendChild(e)});hs[2].insertAdjacentElement('beforebegin',sec);var h=gs.querySelector('h3');if(gs.querySelector('.cmp')){if(h)h.textContent='Interest Calculation'}else gs.setAttribute('data-ws','0')}
var bar=document.createElement('div');bar.className='wzt';bar.setAttribute('role','tablist');bar.setAttribute('aria-label','Steps');
bar.innerHTML=N.map(function(t,i){return'<button type="button" role="tab" data-wzs="'+(i+1)+'"><span class="wzn">'+(i+1)+'. </span>'+t+'</button>'}).join('');
var h2=f.querySelector('h2');if(h2)h2.insertAdjacentElement('afterend',bar);else f.insertBefore(bar,f.firstChild);
if(h2&&hs[0]&&hs[0].querySelector('#fn')){hs[0].classList.add('hs-top');hs[0].removeAttribute('data-ws');h2.insertAdjacentElement('afterend',hs[0])}
[].forEach.call(f.querySelectorAll('.hs'),function(e){var h=e.querySelector('h3'),t=h&&h.textContent.trim();if(t==='Current Investment'||t==='Growth Assumptions'||t==='Contribution')e.classList.add('hs-nl')});
[['fyf','Yearly Addition From'],['fyt','Yearly Addition Until']].forEach(function(p){var l=f.querySelector('label[for='+p[0]+']');if(l)l.textContent=p[1]});
var lv=f.querySelector('label[for=fv]');if(lv)lv.textContent='Current Investment (\u20b9)';
var tb=f.querySelector('.tb');if(tb){var sv=tb.querySelector('button.p')||null,b=document.createElement('button');b.type='button';b.textContent='Back';b.setAttribute('data-wzb','');var x=document.createElement('button');x.type='button';x.className='p';x.textContent='Next';x.setAttribute('data-wzn','');tb.insertBefore(b,sv);tb.insertBefore(x,sv)}
var mch=f.querySelector('#hy .mch');
if(mch&&!f.querySelector('#famsel')){var rs=[].slice.call(mch.querySelectorAll('input[name=fam]')),sl=document.createElement('select');sl.id='famsel';sl.setAttribute('aria-labelledby','faml');
rs.forEach(function(r){var o=document.createElement('option'),lb=r.closest('label');o.value=r.value;o.textContent=((lb&&lb.title)||r.value).slice(0,3);o.title=(lb&&lb.title)||'';o.selected=r.checked;sl.appendChild(o)});
mch.insertAdjacentElement('afterend',sl);mch.setAttribute('data-wzh','');
sl.addEventListener('change',function(){var r=rs.filter(function(x){return x.value===sl.value})[0];if(r)r.click()});
f.addEventListener('change',function(e){if(e.target&&e.target.name==='fam')sl.value=e.target.value})}
var hp4=f.querySelector('#hp');
if(hp4){var s4=document.createElement('section');s4.className='hs hs-pv';s4.setAttribute('data-ws','4');
s4.innerHTML='<h3>Preview</h3><div class="pvh">Details you entered</div><div class="pvin" id="pvin"></div><div class="pvh">Projected values</div>';
hp4.insertAdjacentElement('beforebegin',s4);hp4.removeAttribute('data-ws');s4.appendChild(hp4)}
go(f,1)}
var q=0;new MutationObserver(function(){if(q)return;q=requestAnimationFrame(function(){q=0;var f=document.querySelector('dialog form#fm:not([data-wz])');if(f)build(f)})}).observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-wzs],[data-wzb],[data-wzn]');if(!t)return;var f=t.closest('form');if(!f)return;var s=+f.getAttribute('data-wz')||1;if(t.hasAttribute('data-wzs'))s=+t.getAttribute('data-wzs');else if(t.hasAttribute('data-wzb'))s=Math.max(1,s-1);else s=Math.min(5,s+1);go(f,s);e.preventDefault()},false);
document.addEventListener('submit',function(e){var f=e.target;if(!f||f.id!=='fm'||f.getAttribute('data-wz')==='0')return;setTimeout(function(){var er=document.getElementById('fe'),bad=f.querySelector(':invalid,[aria-invalid=true]');if(er&&er.textContent.trim()&&bad){var p=bad.closest('[data-ws]');if(p)go(f,+p.getAttribute('data-ws'))}},0)},true);
})();