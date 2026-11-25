(function(){var M={'family':'users','general assumptions':'sliders','appearance & backup':'palette','users':'users','year-by-year plan':'table','year by year status':'cal'};
function tag(){document.querySelectorAll('h1,h2').forEach(function(h){if(h.closest('dialog'))return;var k=M[h.textContent.trim().toLowerCase()];if(k){if(h.dataset.hic!==k)h.dataset.hic=k}else if(h.dataset.hic)delete h.dataset.hic})}
var t=0;function q(){clearTimeout(t);t=setTimeout(tag,60)}
new MutationObserver(q).observe(document.body,{childList:true,subtree:true});tag()})();
