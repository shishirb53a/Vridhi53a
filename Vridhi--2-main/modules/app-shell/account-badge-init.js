/* build 152: the header Client switcher is first drawn once every script has loaded, so it is never empty on the first screen */
window.addEventListener('load',function(){try{if(window.fhpBar)window.fhpBar()}catch(e){}});
/* initial letter shown in the round account badge on phones (the full email stays in the tooltip) */
(function(){var w=document.getElementById('who');if(!w)return;function ini(){var t=(w.textContent||'').replace(/[^\p{L}\p{N}@._-]+/gu,' ').trim();w.dataset.ini=(t.charAt(0)||'?').toUpperCase();w.title=t?'Signed in as '+t:'Signed in'}ini();try{new MutationObserver(ini).observe(w,{childList:true,characterData:true,subtree:true})}catch(e){}})();
(function(){var so=document.getElementById('so');if(so){so.title='Sign out';so.setAttribute('aria-label','Sign out')}})();
