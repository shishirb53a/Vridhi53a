window.fdt=function(t){if(!t)return'—';var d=new Date(t);return isNaN(d)?'—':d.toLocaleString(LANG()==='hi'?'hi-IN':'en-IN',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'})};
window.fdd=function(t){if(!t)return'';var d=new Date(t);return isNaN(d)?'':d.toLocaleDateString(LANG()==='hi'?'hi-IN':'en-IN',{day:'numeric',month:'short',year:'numeric'})};
window.ymdLoc=function(t){var d=new Date(t);if(isNaN(d))return'';var p=function(n){return String(n).padStart(2,'0')};return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())};
window.stampTxt=function(x){return(x.ca?'Added '+fdt(x.ca):'Entry date not set')+(x.ma?' · Last edited '+fdt(x.ma):'')};
