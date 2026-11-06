(function(){var L=[["enterprise","Enterprise","Flat, compact, data-first"],["modern","Modern","Soft cards, pill tabs, roomy"],["compact","Compact","Dense, more data per screen"],["classic","Classic","Original flat look"]],r=document.documentElement,pp=document.getElementById("lk-pp"),bt=document.getElementById("lk-bt"),nm=document.getElementById("lk-nm");
function cur(){return r.getAttribute("data-skin")||"enterprise"}
function paint(){var c=cur();nm.textContent=(L.filter(function(x){return x[0]===c})[0]||L[0])[1];pp.innerHTML=L.map(function(x){return '<button type="button" role="radio" data-k="'+x[0]+'" aria-checked="'+(x[0]===c)+'">'+x[1]+'<small>'+x[2]+'</small></button>'}).join("")}
function open(o){pp.hidden=!o;bt.setAttribute("aria-expanded",String(o))}
bt.addEventListener("click",function(e){e.stopPropagation();open(pp.hidden)});
pp.addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;r.setAttribute("data-skin",b.dataset.k);try{localStorage.setItem("vr-skin",b.dataset.k)}catch(x){}paint();open(false)});
document.addEventListener("click",function(e){if(!e.target.closest("#lk-sw"))open(false)});
document.addEventListener("keydown",function(e){if(e.key==="Escape"){open(false);bt.focus()}});
paint()})();