(function(){
var T=[
["ledger","Ledger navy","Clean and trusted",{bg:"#f4f6f9",card:"#ffffff",tx:"#0f1b2d",mu:"#4a586c",bd:"#dfe4ec"},{bg:"#0c1220",card:"#141c2e",tx:"#e6ebf5",mu:"#aab6cc",bd:"#26324a"}],
["bank","Private bank","Warm ivory and green",{bg:"#f6f3ec",card:"#fffefb",tx:"#2a241b",mu:"#5e5446",bd:"#e6dfd0",hl:"#fbefc7",hl2:"#e0efdc"},{bg:"#16130f",card:"#201c16",tx:"#efe8dc",mu:"#bfb5a3",bd:"#352f25"}],
["graphite","Graphite","Charcoal with gold",{bg:"#eef0f4",card:"#ffffff",tx:"#141922",mu:"#4b5565",bd:"#dde1e8"},{bg:"#0f1319",card:"#171c24",tx:"#eef1f6",mu:"#9aa5b8",bd:"#2a313d"}],
["minimal","Minimal","Flat monochrome with no shadows or gradients",{bg:"#ffffff",card:"#ffffff",tx:"#111111",mu:"#444444",bd:"#888888"},{bg:"#000000",card:"#000000",tx:"#ffffff",mu:"#cccccc",bd:"#888888"}]
],K="vr-pro",r=document.documentElement,used={},LG={ledger:["#0b1220","#13233f"],bank:["#241c14","#4a3a26"],graphite:["#0f1216","#2b303a"]},AL={"default":"ledger",boardroom:"ledger",contrast:"ledger",evergreen:"bank",mono:"graphite"};
function get(){var v="ledger";try{v=localStorage.getItem(K)||"ledger"}catch(e){}return AL[v]||v}
function dark(){var a=r.getAttribute("data-theme");return a==="dark"||(!a&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches)}
function sp(n,v){r.style.setProperty(n,v);if(document.body)document.body.style.setProperty(n,v)}function rp(n){r.style.removeProperty(n);if(document.body)document.body.style.removeProperty(n)}
function apply(){Object.keys(used).forEach(function(k){rp("--"+k)});used={};var k=get(),x=T.filter(function(z){return z[0]===k})[0];if(k==="minimal")r.setAttribute("data-minimal-theme","true");else r.removeAttribute("data-minimal-theme");if(!x||!x[3])return;var v=dark()?x[4]:x[3];Object.keys(v).forEach(function(n){sp("--"+n,v[n]);used[n]=1});var g=LG[k];if(g){sp("--lg1",g[0]);sp("--lg2",g[1]);used.lg1=1;used.lg2=1}}
function ui(){var c=get();return '<div class="sub2">Professional themes</div><p class="mu">Surface colours for the whole app. Works with light, dark and your accent colour.</p><div class="pro-g" role="radiogroup" aria-label="Professional themes">'+T.map(function(x){var L=x[3]||{bg:"#f5f6f8",card:"#fff",tx:"#1b2430"},D=x[4]||{bg:"#11151b",card:"#1a2029",tx:"#e8ecf2"};
function h(p){return '<i style="background:'+p.bg+'"><b style="background:'+p.card+';border:1px solid '+(p.bd||"rgba(128,128,128,.3)")+'"></b><u style="background:'+p.tx+'"></u></i>'}
return '<div class="pro-i" role="radio" tabindex="0" data-pro="'+x[0]+'" aria-checked="'+(x[0]===c)+'"><div class="pro-pv">'+h(L)+h(D)+'</div><div class="pro-n">'+x[1]+'</div><div class="pro-d">'+x[2]+'</div></div>'}).join("")+'</div>'}
function pick(el){var k=el.getAttribute("data-pro");try{localStorage.setItem(K,k)}catch(e){}apply();document.querySelectorAll(".pro-i").forEach(function(n){n.setAttribute("aria-checked",String(n===el))})}
window.vrPro={T:T,get:get,set:function(k){try{localStorage.setItem(K,k)}catch(e){}apply();document.querySelectorAll(".pro-i").forEach(function(n){n.setAttribute("aria-checked",String(n.getAttribute("data-pro")===k))})}};
document.addEventListener("click",function(e){var el=e.target.closest&&e.target.closest(".pro-i");if(el)pick(el)});
document.addEventListener("keydown",function(e){if((e.key==="Enter"||e.key===" ")&&e.target.classList&&e.target.classList.contains("pro-i")){e.preventDefault();pick(e.target)}});
try{new MutationObserver(apply).observe(r,{attributes:true,attributeFilter:["data-theme"]})}catch(e){}
try{matchMedia("(prefers-color-scheme: dark)").addEventListener("change",apply)}catch(e){}
apply()})();