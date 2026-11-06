(function(){
function $(i){return document.getElementById(i)}function v(i){var x=$(i);return x?x.value:''}
function close(){var m=$('vr-cpm');if(m)m.remove();document.removeEventListener('keydown',esc)}
function esc(e){if(e.key==='Escape')close()}
var RULE={min:8,max:10};
async function open(){if($('vr-cpm')||!window.VRSB)return;var adv=null;try{adv=await window.VRSB.isAdviser()}catch(x){}RULE=adv===true?{min:14,max:72}:{min:8,max:72};if($('vr-cpm'))return;var m=document.createElement('div');m.id='vr-cpm';
 m.innerHTML='<div class="bx" role="dialog" aria-modal="true" aria-labelledby="vr-cpt"><h2 id="vr-cpt">Change password</h2><p class="mu" style="margin:0">'+(adv===true?'Use 14 or more characters.':'Use 8 or more characters.')+' Your other signed-in devices will be signed out.</p><label>Current password<input id="vr-cp0" type="password" autocomplete="current-password"></label><label>New password<input id="vr-cp1" type="password" maxlength="'+RULE.max+'" autocomplete="new-password"></label><label>Confirm new password<input id="vr-cp2" type="password" maxlength="'+RULE.max+'" autocomplete="new-password"></label><label style="display:flex;gap:8px;align-items:center;margin-top:10px"><input id="vr-cps" type="checkbox"> Show passwords</label><p id="vr-cpe" class="er" role="alert"></p><div class="ac"><button type="button" id="vr-cpx">Cancel</button><button type="button" class="p" id="vr-cpv">Save password</button></div></div>';
 document.body.appendChild(m);document.addEventListener('keydown',esc);
 m.addEventListener('click',function(e){if(e.target===m)close()});
 $('vr-cpx').addEventListener('click',close);$('vr-cpv').addEventListener('click',save);
 $('vr-cps').addEventListener('change',function(e){['vr-cp0','vr-cp1','vr-cp2'].forEach(function(i){$(i).type=e.target.checked?'text':'password'})});
 $('vr-cp0').focus()}
async function save(){var a=v('vr-cp0'),b=v('vr-cp1'),c=v('vr-cp2'),er=$('vr-cpe'),bt=$('vr-cpv');
 if(!a){er.textContent='Enter your current password.';return}
 if(b.length<RULE.min){er.textContent='New password must be at least '+RULE.min+' characters.';return}
 if(b.length>RULE.max){er.textContent='New password must be at most '+RULE.max+' characters.';return}
 if(b!==c){er.textContent='The two new passwords do not match.';return}
 if(b===a){er.textContent='New password must be different from the current one.';return}
 bt.disabled=true;er.textContent='';
 try{await window.VRSB.changePassword(a,b);var bx=document.querySelector('#vr-cpm .bx');bx.innerHTML='<h2>Password changed</h2><p class="mu">Use the new password next time you sign in. Your other devices have been signed out.</p><div class="ac"><button type="button" class="p" id="vr-cpd">Done</button></div>';$('vr-cpd').addEventListener('click',close);$('vr-cpd').focus()}
 catch(e){er.textContent=(e&&e.message)||'Could not change the password.';bt.disabled=false;if(e&&e.code==='wrong'){$('vr-cp0').select()}}}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('#vr-cp');if(b)open()});
})();