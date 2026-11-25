(function(){
document.documentElement.setAttribute('data-skin','enterprise');
/* Purge legacy persistent auth tokens from localStorage; sessions stay scoped to the active tab only. */
try{localStorage.removeItem('vr-sb-remember');localStorage.removeItem('vr-rm')}catch(e){}
try{if(sessionStorage.getItem('fs-auth')!=='1')document.documentElement.classList.add('lk')}catch(e){document.documentElement.classList.add('lk')}
})();
