(function(){
document.documentElement.setAttribute('data-skin','enterprise');
try{var m=localStorage.getItem('vr-theme-mode');if(m==='light'||m==='dark')document.documentElement.setAttribute('data-theme',m)}catch(e){}
/* Purge legacy persistent auth tokens from localStorage; sessions stay scoped to the active tab only. */
try{localStorage.removeItem('vr-sb-remember');localStorage.removeItem('vr-rm')}catch(e){}
try{if(sessionStorage.getItem('fs-auth')!=='1')document.documentElement.classList.add('lk')}catch(e){document.documentElement.classList.add('lk')}
})();
