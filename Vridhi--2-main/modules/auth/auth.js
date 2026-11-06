
/* Production build: real sign-in and cloud storage with Supabase (https://supabase.com).
   This replaces the in-page sign-in and the claude.ai storage. Settings come from config.js. */
(function(){
window.VR_PROD=true;
var C=window.VR_CFG||{},URL0=String(C.supabaseUrl||'').replace(/\/+$/,''),KEY=String(C.anonKey||''),SK='vr-sb';
var cfgOk=/^https:\/\/[^\s\/]+$/i.test(URL0)&&KEY.length>20&&!/YOUR-PROJECT/i.test(URL0)||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(URL0)&&KEY.length>5;
function ses(){try{return JSON.parse(sessionStorage.getItem(SK))}catch(e){return null}}
function put(o){try{sessionStorage.setItem(SK,JSON.stringify(o));if(localStorage.getItem('vr-rm')==='1')localStorage.setItem('vr-sb-remember',JSON.stringify(o))}catch(e){}}
function wipeAuth(){try{sessionStorage.removeItem('fs-auth');sessionStorage.removeItem('fs-user');sessionStorage.removeItem(SK);sessionStorage.removeItem('vr-idle-until');localStorage.removeItem('vr-rm');localStorage.removeItem('vr-sb-remember')}catch(e){}}
function forceLock(){wipeAuth();location.reload()}
/* the local copy of plans belongs to ONE login: a different login on this browser never sees it, and it is never uploaded under another login */
function wipeLocal(){try{Object.keys(localStorage).filter(function(k){return /^(fwt|fs-users)/.test(k)}).forEach(function(k){localStorage.removeItem(k)})}catch(e){}}
try{var s0=ses();if(cfgOk&&s0&&s0.uid&&localStorage.getItem('vr-owner')!==s0.uid){wipeLocal();localStorage.setItem('vr-owner',s0.uid)}}catch(e){}
/* a page that says "signed in" without a real session is locked again */
try{if(sessionStorage.getItem('fs-auth')==='1'&&!(ses()&&ses().rt)){wipeAuth();document.documentElement.classList.add('lk')}}catch(e){}
function fromTok(j){return{at:j.access_token,rt:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1000,uid:j.user&&j.user.id,email:j.user&&j.user.email}}
var refreshing=null;
/* Remember me with several tabs: Supabase refresh tokens work once, so a tab must adopt a newer token saved by another tab instead of refreshing with its own stale copy */
function fresher(s){try{if(localStorage.getItem('vr-rm')!=='1')return null;var r=JSON.parse(localStorage.getItem('vr-sb-remember'));return r&&r.rt&&s&&r.uid===s.uid&&r.rt!==s.rt&&r.exp>s.exp?r:null}catch(e){return null}}
async function token(){var s=ses();if(!s)throw{code:'unauthenticated'};var fr=fresher(s);if(fr){put(fr);s=fr}if(s.exp-60000>Date.now())return s;
 if(!refreshing)refreshing=(async function(){try{var r=await fetch(URL0+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.rt})});var j=await r.json();if(!r.ok||!j.access_token)throw{code:'unauthenticated'};var n=fromTok(j);if(!n.uid)n.uid=s.uid;if(!n.email)n.email=s.email;put(n);return n}catch(e){var g=fresher(s);if(g){put(g);return g}forceLock();throw{code:'unauthenticated'}}finally{refreshing=null}})();
 return refreshing}
async function rest(path,opt){opt=opt||{};var s=await token(),r=await fetch(URL0+'/rest/v1/'+path,{method:opt.method||'GET',headers:Object.assign({apikey:KEY,Authorization:'Bearer '+s.at,'Content-Type':'application/json'},opt.headers||{}),body:opt.body});
 if(!r.ok){var e=new Error('http '+r.status);e.code=(r.status===401||r.status===403)?'permission_denied':'unavailable';throw e}return r}
function doc(path){var enc=encodeURIComponent(path),seen=null;
 async function read(){var s=await token(),r=await rest('app_docs?user_id=eq.'+s.uid+'&path=eq.'+enc+'&select=data,updated_at&limit=1'),a=await r.json();return a[0]||null}
 function snap(row){return{exists:!!row,data:function(){return row?row.data:undefined},metadata:{hasPendingWrites:false}}}
 return{
  get:async function(){var row=await read();seen=row&&row.updated_at;return snap(row)},
  set:async function(obj){var s=await token(),t=new Date().toISOString();await rest('app_docs?on_conflict=user_id,path',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:s.uid,path:path,data:obj,updated_at:t})});seen=t},
  onSnapshot:function(cb,err){var stop=false;async function tick(){if(stop||document.hidden)return;try{var row=await read();if(row&&row.updated_at!==seen){seen=row.updated_at;cb(snap(row))}}catch(e){if(err)err(e)}}
   var iv=setInterval(tick,Number(C.pollSeconds||20)*1000),vis=function(){if(!document.hidden)tick()};document.addEventListener('visibilitychange',vis);
   return function(){stop=true;clearInterval(iv);document.removeEventListener('visibilitychange',vis)}}}}
var dbApi={doc:doc},userApi={id:async function(){var s=ses();return s?s.uid:null}};
window.claude={use:async function(n){return n==='db'?dbApi:n==='user'?userApi:null}};
async function signIn(email,pw){var r=await fetch(URL0+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email:email,password:pw})}),j={};try{j=await r.json()}catch(e){}
 if(!r.ok||!j.access_token){var e=new Error('Sign in failed');e.status=r.status;throw e}put(fromTok(j))}
function signOut(){var s=ses();
 /* clear the local copy of client data only when everything has reached the database */
 try{if(/^Synced/.test(window.__st||'')){wipeLocal();localStorage.removeItem('vr-owner')}}catch(e){}
 wipeAuth();
 try{if(s)fetch(URL0+'/auth/v1/logout',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+s.at},keepalive:true}).catch(function(){})}catch(e){}
 location.reload()}
/* User and role administration stays on the Edge Function; its service-role key never reaches the browser. */
async function usersCall(body){var s=await token(),r=await fetch(URL0+'/functions/v1/'+(C.usersFunction||'manage-users'),{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+s.at,'Content-Type':'application/json'},body:JSON.stringify(body)}),j={};try{j=await r.json()}catch(e){}
 if(!r.ok){var e=new Error(j&&j.error||('Request failed ('+r.status+')'));e.status=r.status;throw e}return j}
var accessRequest=null;
function access(force){if(!ses())return Promise.resolve(null);if(!force&&window.VR_ACCESS&&!window.VR_ACCESS.error)return Promise.resolve(window.VR_ACCESS);
 if(!accessRequest)accessRequest=usersCall({action:'context'}).then(function(j){window.VR_ACCESS=j;window.VR_ADV=(j.permissions||[]).indexOf('manage_users')>=0;document.documentElement.classList.toggle('vr-read-only',(j.permissions||[]).indexOf('write_data')<0);document.dispatchEvent(new CustomEvent('vr:accesschange'));return j},function(e){window.VR_ACCESS={error:(e&&e.message)||'Could not load account permissions.'};window.VR_ADV=null;document.dispatchEvent(new CustomEvent('vr:accesschange'));throw e}).finally(function(){accessRequest=null});
 return accessRequest}
function isAdviser(){return access().then(function(j){return j?window.VR_ADV:null},function(){return null})}
/* change the signed-in user's own password: the current password is checked first, then every other device is signed out */
async function changePassword(cur,nw){var s=await token();
 var r=await fetch(URL0+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email:s.email,password:cur})}),j={};try{j=await r.json()}catch(x){}
 if(!r.ok||!j.access_token){var w=new Error('Current password is not correct.');w.code='wrong';throw w}
 try{await fetch(URL0+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+j.access_token}})}catch(x){}
 var u=await fetch(URL0+'/auth/v1/user',{method:'PUT',headers:{apikey:KEY,Authorization:'Bearer '+s.at,'Content-Type':'application/json'},body:JSON.stringify({password:nw})}),k={};try{k=await u.json()}catch(x){}
 if(!u.ok){var c=k&&(k.error_code||k.code),m=c==='same_password'?'New password must be different from the current one.':c==='weak_password'?'That password is too easy to guess. Use a longer, less common one.':(u.status===401||u.status===403)?'For safety, sign out, sign in again, then retry.':'Could not change the password. Check your connection and try again.';var e=new Error(m);e.status=u.status;e.code=c;throw e}
 try{await fetch(URL0+'/auth/v1/logout?scope=others',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+s.at}})}catch(x){}}
/* holding snapshots: dated copies of the holdings kept in the database (table vr_holding_snapshots, own rows only) */
var SNID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function snapList(f){f=f||{};var s=await token(),p='vr_holding_snapshots?user_id=eq.'+s.uid+'&select=id,label,note,plan,holdings_count,total_value,created_at&order=created_at.desc&limit=200';
 if(f.from)p+='&created_at=gte.'+encodeURIComponent(f.from);
 if(f.to)p+='&created_at=lte.'+encodeURIComponent(f.to);
 var q=String(f.q||'').replace(/[,()*%"'\\]/g,'').trim();
 if(q)p+='&or='+encodeURIComponent('(label.ilike.*'+q+'*,note.ilike.*'+q+'*,plan.ilike.*'+q+'*)');
 var r=await rest(p);return r.json()}
async function snapGet(id){if(!SNID.test(String(id||'')))throw new Error('Bad snapshot id.');var s=await token(),r=await rest('vr_holding_snapshots?id=eq.'+id+'&user_id=eq.'+s.uid+'&select=id,label,plan,created_at,data&limit=1'),a=await r.json();if(!a[0])throw new Error('That snapshot no longer exists.');return a[0]}
async function snapCreate(o){var s=await token(),r=await rest('vr_holding_snapshots?select=id,created_at',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({user_id:s.uid,label:String(o.label||'').slice(0,120),note:String(o.note||'').slice(0,500),plan:String(o.plan||'').slice(0,120),holdings_count:Math.max(0,Math.round(+o.count||0)),total_value:+o.total||0,data:o.data})}),a=await r.json();return a[0]}
async function snapRemove(id){if(!SNID.test(String(id||'')))throw new Error('Bad snapshot id.');var s=await token();await rest('vr_holding_snapshots?id=eq.'+id+'&user_id=eq.'+s.uid,{method:'DELETE',headers:{Prefer:'return=minimal'}})}
/* The Pages workflow generates build-info.js from its monotonically increasing run number. */
window.VR_VERSION='2.8.0.'+window.VR_BUILD_NO;
window.VR_BUILD_TXT='Version '+window.VR_VERSION+' \u00b7 '+window.VR_BUILD_DATE;
document.addEventListener('DOMContentLoaded',function(){var v=window.VR_VERSION,w=document.querySelector('.wm');if(w&&!w.querySelector('.vr-ver'))w.insertAdjacentHTML('beforeend',' <span class="vr-ver" title="'+window.VR_BUILD_TXT+'">v'+v+'</span>');var f=document.getElementById('lgf');if(f&&!document.querySelector('.vr-ver-lg')){var host=f.querySelector('.lform')||f;host.insertAdjacentHTML('beforeend','<p class="vr-ver-lg">'+window.VR_BUILD_TXT+'</p>')}});
window.VRSB=cfgOk?{signIn:signIn,signOut:signOut,configured:true,access:access,isAdviser:isAdviser,users:usersCall,changePassword:changePassword,snap:{list:snapList,get:snapGet,create:snapCreate,remove:snapRemove},email:function(){var s=ses();return s&&s.email||''}}:null;
/* Resolve permissions before the app enables account-specific actions. */
if(cfgOk&&ses()&&ses().rt)access().catch(function(){});
/* sign-in page wording */
document.addEventListener('DOMContentLoaded',function(){var u=document.getElementById('lu'),l=u&&u.parentNode.querySelector('label');if(u){u.type='email';u.setAttribute('autocomplete','username');u.setAttribute('inputmode','email')}if(l)l.textContent='Email'});
})();
