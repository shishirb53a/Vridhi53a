(function(){
var C=window.VR_CFG||{},idle=Number(C.idleMinutes===undefined?5:C.idleMinutes),KEY='vr-idle-until',timer=null,expiresAt=0;
function signedIn(){try{return sessionStorage.getItem('fs-auth')==='1'||!!sessionStorage.getItem('vr-sb')}catch(e){return false}}
function clear(){clearTimeout(timer);timer=null;expiresAt=0;try{sessionStorage.removeItem(KEY)}catch(e){}}
function signOut(){clear();if(window.VRSB&&window.VRSB.signOut){window.VRSB.signOut();return}
 try{sessionStorage.removeItem('fs-auth');sessionStorage.removeItem('fs-user');sessionStorage.removeItem('vr-sb');localStorage.removeItem('vr-rm');localStorage.removeItem('vr-sb-remember')}catch(e){}
 location.reload()}
function schedule(){clearTimeout(timer);timer=setTimeout(check,Math.max(0,expiresAt-Date.now()))}
function arm(){if(!(idle>0)||!signedIn()){clearTimeout(timer);timer=null;return}
 expiresAt=Date.now()+idle*60000;try{sessionStorage.setItem(KEY,String(expiresAt))}catch(e){}schedule()}
function check(){if(!(idle>0)||!signedIn()){clear();return}
 if(!expiresAt){var saved=0;try{saved=Number(sessionStorage.getItem(KEY))||0}catch(e){}expiresAt=saved}
 if(!expiresAt){arm();return}
 if(expiresAt<=Date.now()){signOut();return}
 schedule()}
['pointerdown','pointermove','keydown','scroll','touchstart','input','change','wheel'].forEach(function(ev){
 document.addEventListener(ev,arm,{passive:true,capture:true})
});
window.addEventListener('scroll',arm,{passive:true,capture:true});
window.addEventListener('focus',check);
window.addEventListener('pageshow',check);
document.addEventListener('visibilitychange',function(){if(!document.hidden)check()});
if(idle>0&&signedIn())check();
})();
