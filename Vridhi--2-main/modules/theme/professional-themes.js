(function(){
var T=[
["default","Default","Original colours",null,null],
["boardroom","Boardroom","Cool steel and navy",{bg:"#eef1f6",card:"#ffffff",tx:"#0f1b2d",mu:"#46556b",bd:"#d5dbe5"},{bg:"#0c1220",card:"#141c2e",tx:"#e6ebf5",mu:"#aab6cc",bd:"#26324a"}],
["bank","Private Bank","Warm ivory, calm",{bg:"#f7f4ee",card:"#fffdf9",tx:"#2a241b",mu:"#5e5446",bd:"#e4dccd",hl:"#fbefc7",hl2:"#e0efdc"},{bg:"#16130f",card:"#201c16",tx:"#efe8dc",mu:"#bfb5a3",bd:"#352f25"}],
["evergreen","Evergreen","Soft green wealth tone",{bg:"#f1f6f3",card:"#ffffff",tx:"#11261c",mu:"#42584c",bd:"#d6e3db"},{bg:"#0d1612",card:"#15211b",tx:"#e5f0ea",mu:"#a9c0b3",bd:"#243529"}],
["mono","Slate Mono","Neutral greyscale",{bg:"#f3f4f6",card:"#ffffff",tx:"#111827",mu:"#4b5563",bd:"#e5e7eb"},{bg:"#0f1115",card:"#181b21",tx:"#eceef2",mu:"#b0b6c2",bd:"#2a2e37"}],
["contrast","High Contrast","Maximum legibility",{bg:"#ffffff",card:"#ffffff",tx:"#000000",mu:"#2b3340",bd:"#7a8494",hl:"#ffe680",hl2:"#bfe8c9"},{bg:"#000000",card:"#0b0b0b",tx:"#ffffff",mu:"#dde3ee",bd:"#7b8494"}]
],K="vr-pro",r=document.documentElement,used={},LG={boardroom:["#0b1220","#13233f"],bank:["#241c14","#4a3a26"],evergreen:["#0a2218","#14402f"],mono:["#0f1216","#2b303a"],contrast:["#000000","#1c1c1c"]};
function get(){try{return localStorage.getItem(K)||"default"}catch(e){return"default"}}
function dark(){var a=r.getAttribute("data-theme");return a==="dark"||(!a&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches)}
function sp(n,v){r.style.setProperty(n,v);if(document.body)document.body.style.setProperty(n,v)}function rp(n){r.style.removeProperty(n);if(document.body)document.body.style.removeProperty(n)}
function apply(){Object.keys(used).forEach(function(k){rp("--"+k)});used={};var k=get(),x=T.filter(function(z){return z[0]===k})[0];if(!x||!x[3])return;var v=dark()?x[4]:x[3];Object.keys(v).forEach(function(n){sp("--"+n,v[n]);used[n]=1});var g=LG[k];if(g){sp("--lg1",g[0]);sp("--lg2",g[1]);used.lg1=1;used.lg2=1}}
function ui(){var c=get();return '<div class="sub2">Professional themes</div><p class="mu">Surface colours for the whole app. Works with light, dark and your accent colour.</p><div class="pro-g" role="radiogroup" aria-label="Professional themes">'+T.map(function(x){var L=x[3]||{bg:"#f5f6f8",card:"#fff",tx:"#1b2430"},D=x[4]||{bg:"#11151b",card:"#1a2029",tx:"#e8ecf2"};
function h(p){return '<i style="background:'+p.bg+'"><b style="background:'+p.card+';border:1px solid '+(p.bd||"rgba(128,128,128,.3)")+'"></b><u style="background:'+p.tx+'"></u></i>'}
return '<div class="pro-i" role="radio" tabindex="0" data-pro="'+x[0]+'" aria-checked="'+(x[0]===c)+'"><div class="pro-pv">'+h(L)+h(D)+'</div><div class="pro-n">'+x[1]+'</div><div class="pro-d">'+x[2]+'</div></div>'}).join("")+'</div>'}
function pick(el){var k=el.getAttribute("data-pro");try{localStorage.setItem(K,k)}catch(e){}apply();document.querySelectorAll(".pro-i").forEach(function(n){n.setAttribute("aria-checked",String(n===el))})}
window.vrPro={T:T,get:get,set:function(k){try{localStorage.setItem(K,k)}catch(e){}apply();document.querySelectorAll(".pro-i").forEach(function(n){n.setAttribute("aria-checked",String(n.getAttribute("data-pro")===k))})}};
document.addEventListener("click",function(e){var el=e.target.closest&&e.target.closest(".pro-i");if(el)pick(el)});
document.addEventListener("keydown",function(e){if((e.key==="Enter"||e.key===" ")&&e.target.classList&&e.target.classList.contains("pro-i")){e.preventDefault();pick(e.target)}});
var o=window.lookUI;window.lookUI=function(){return(o?o.apply(this,arguments):"")+ui()};
try{new MutationObserver(apply).observe(r,{attributes:true,attributeFilter:["data-theme"]})}catch(e){}
try{matchMedia("(prefers-color-scheme: dark)").addEventListener("change",apply)}catch(e){}
apply()})();