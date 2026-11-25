(function(){
  const sel='.er,.ue,#le,#fe,#se,#cerr';
  const ob=new MutationObserver(ms=>{if(LANG()==='en')return;ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType!==3||!n.parentElement||!n.parentElement.matches(sel))return;const t=n.nodeValue,r=tr(t,1);if(r!==t)n.nodeValue=r}))});
  ob.observe(document.body,{childList:true,subtree:true});
})();
holdRows=trw(holdRows);window.VRHelp.body=trw(window.VRHelp.body);pageBar=trw(pageBar);window.repRows=trw(window.repRows);window.ageTiles=trw(window.ageTiles);
/* BUILD INFO: bump BUILD_NO (and date) on every build */
(function(){var txt=window.VR_BUILD_TXT||'';window.FS_BUILD=txt;
function set(){['bv','lgv'].forEach(function(id){var e=document.getElementById(id);if(e)e.textContent=txt})}
set();document.addEventListener('DOMContentLoaded',set)})();
