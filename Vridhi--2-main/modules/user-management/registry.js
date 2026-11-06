(function(){
var H='034192f0fc725ae459399f4ad51d1fc59bb5865efe0557ff469c7054b7595716';
function sha256(str){var K=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]),b=unescape(encodeURIComponent(str)),n=b.length,len=((n+9+63)>>6)<<4,w=new Uint32Array(len),i,j,t;
for(i=0;i<n;i++)w[i>>2]|=b.charCodeAt(i)<<(24-(i&3)*8);w[n>>2]|=0x80<<(24-(n&3)*8);w[len-1]=n*8;
var h=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]),W=new Uint32Array(64),R=function(x,k){return(x>>>k)|(x<<(32-k))};
for(j=0;j<len;j+=16){for(t=0;t<16;t++)W[t]=w[j+t];
for(t=16;t<64;t++){var s0=R(W[t-15],7)^R(W[t-15],18)^(W[t-15]>>>3),s1=R(W[t-2],17)^R(W[t-2],19)^(W[t-2]>>>10);W[t]=(W[t-16]+s0+W[t-7]+s1)|0}
var a=h[0],b2=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],hh=h[7];
for(t=0;t<64;t++){var S1=R(e,6)^R(e,11)^R(e,25),ch=(e&f)^(~e&g),t1=(hh+S1+ch+K[t]+W[t])|0,S0=R(a,2)^R(a,13)^R(a,22),mj=(a&b2)^(a&c)^(b2&c),t2=(S0+mj)|0;hh=g;g=f;f=e;e=(d+t1)|0;d=c;c=b2;b2=a;a=(t1+t2)|0}
h[0]=(h[0]+a)|0;h[1]=(h[1]+b2)|0;h[2]=(h[2]+c)|0;h[3]=(h[3]+d)|0;h[4]=(h[4]+e)|0;h[5]=(h[5]+f)|0;h[6]=(h[6]+g)|0;h[7]=(h[7]+hh)|0}
return Array.prototype.map.call(h,function(x){return('00000000'+(x>>>0).toString(16)).slice(-8)}).join('')}
window.__sha=sha256;
var RK='fs-users',reg=null,SEED1='82fc2ef6b0e4637257ad482f8b8e647e54cc14b9e38452cd2fc4553381570875';
function rseed(){return{t:0,del:{},users:{sjain:{n:'Admin',e:'',r:'admin',s:'active',h:H,c:'2026-10-07',m:0},sjain1:{n:'sjain1',e:'',r:'user',s:'active',h:SEED1,c:'2026-10-07',m:0}}}}
/* merge two registries by user: newest record wins (ties go to b); deletions are kept as timestamps so they also propagate */
function rmerge(a,b){var o={t:Math.max(a.t||0,b.t||0),del:{},users:{}},nm={};[a,b].forEach(function(r){Object.keys(r.users||{}).forEach(function(k){nm[k]=1});Object.keys(r.del||{}).forEach(function(k){nm[k]=1})});
Object.keys(nm).forEach(function(k){var x=(a.users||{})[k],y=(b.users||{})[k],best=x;if(y&&(!x||(y.m||0)>=(x.m||0)))best=y;var d=Math.max((a.del||{})[k]||0,(b.del||{})[k]||0);if(d)o.del[k]=d;if(best&&(!d||(best.m||0)>d))o.users[k]=best});
if(!o.users.sjain)o.users.sjain=rseed().users.sjain;return o}
function rsave(){try{localStorage.setItem(RK,JSON.stringify(reg))}catch(e){}}
function rget(){if(!reg){var j=null;try{j=JSON.parse(localStorage.getItem(RK))}catch(e){}reg=rmerge(rseed(),j&&j.users?j:{users:{}})}return reg}
function rdb(){try{if(window.claude&&claude.use)return Promise.resolve(claude.use('db')).then(function(d){return d||null},function(){return null})}catch(e){}return Promise.resolve(null)}
function rpush(){return rdb().then(function(db){if(!db)return false;return db.doc('directory/users').set({json:JSON.stringify(reg),t:reg.t}).then(function(){return true},function(){return false})}).catch(function(){return false})}
function rset(r){r.t=Date.now();reg=r;rsave();return rpush().then(function(ok){window.FSREG.cloud=ok;return ok})}
function radopt(x){if(!x||!x.users)return false;var before=JSON.stringify(rget());reg=rmerge(rget(),x);rsave();return JSON.stringify(reg)!==before}
function rpull(){return rdb().then(function(db){window.FSREG.dbOk=!!db;if(!db)return;return db.doc('directory/users').get().then(function(sn){if(sn&&sn.exists)radopt(JSON.parse((sn.data()||{}).json))})}).catch(function(){})}
function rfile(){try{if(window.fetch&&/^https?:/.test(location.protocol))return fetch('users.json?'+Date.now(),{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(j){if(j&&j.users)radopt(j)}).catch(function(){})}catch(e){}return Promise.resolve()}
window.FSREG={get:rget,set:rset,adopt:radopt,hash:function(u,pw){return sha256('finsight|'+u+'|'+pw)},H:H,dbOk:null,cloud:null};
var ready=window.FSREG.ready=Promise.race([Promise.all([rpull(),rfile()]),new Promise(function(r){setTimeout(r,3000)})]);
var root=document.documentElement,f=document.getElementById('lgf'),u=document.getElementById('lu'),p=document.getElementById('lp'),er=document.getElementById('le'),tg=document.getElementById('lt'),so=document.getElementById('so'),bad=0,until=0;
/* "Remember me": remembers the email and keeps the sign-in session on this device (see the head script). The password itself is never stored. Sign out clears it. */
function vrRemember(un,pw){var done=Promise.resolve();try{var c=document.getElementById('lsv'),on=!!(c&&c.checked);if(on){localStorage.setItem('vr-lastuser',un);localStorage.setItem('vr-rm','1');var o=sessionStorage.getItem('vr-sb');if(o)localStorage.setItem('vr-sb-remember',o);if(pw&&window.PasswordCredential&&navigator.credentials&&navigator.credentials.store)done=Promise.race([navigator.credentials.store(new PasswordCredential({id:un,password:pw,name:un})),new Promise(function(r){setTimeout(r,1500)})]).catch(function(){})}else{localStorage.removeItem('vr-lastuser');localStorage.removeItem('vr-rm');localStorage.removeItem('vr-sb-remember')}}catch(e){}return done}
try{var svU=localStorage.getItem('vr-lastuser'),svC=document.getElementById('lsv');if(svC)svC.checked=!!svU;if(svU&&!u.value)u.value=svU;
if(svU&&window.PasswordCredential&&navigator.credentials&&navigator.credentials.get)navigator.credentials.get({password:true,mediation:'silent'}).then(function(c){if(c&&c.password&&(!u.value||c.id===u.value)&&!p.value){if(!u.value)u.value=c.id;p.value=c.password}}).catch(function(){})}catch(e){}
function lock(){if(window.VRSB){window.VRSB.signOut();return}try{sessionStorage.removeItem('fs-auth');sessionStorage.removeItem('fs-user')}catch(e){}if(window.__UK){location.reload();return}p.value='';u.value='';er.textContent='';root.classList.add('lk');setTimeout(function(){u.focus()},50)}
function unlock(nu){try{sessionStorage.setItem('fs-auth','1');if(nu)sessionStorage.setItem('fs-user',nu);else sessionStorage.removeItem('fs-user')}catch(e){}if((nu||'')!==(window.__UK||'')){location.reload();return}p.value='';er.textContent='';root.classList.remove('lk');window.scrollTo(0,0)}
(function(){var m=/^#invite=(.*)$/.exec(location.hash||'');if(!m)return;try{var j=JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g,'+').replace(/_/g,'/')))));
var un=String(j.u||'').toLowerCase();if(!/^[a-z0-9][a-z0-9._ -]{1,18}[a-z0-9]$/.test(un)||/ {2}/.test(un)||un==='sjain'||!/^[0-9a-f]{64}$/.test(j.h||''))throw 0;
var ex=rget().users[un];if(ex&&ex.r==='admin')throw 0;var rec={n:String(j.n||un).slice(0,40),e:'',r:'user',s:'active',h:j.h,c:String(j.c||'').slice(0,10),m:Date.now()},o={users:{},del:{}};o.users[un]=rec;radopt(o);
try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}u.value=un;er.textContent='User “'+un+'” is ready on this device. Enter the password you were given.'}catch(e){er.textContent='This invite link is not valid.'}})();
f.addEventListener('submit',function(ev){ev.preventDefault();var now=Date.now();
if(now<until){er.textContent='Too many attempts. Try again in '+Math.ceil((until-now)/1000)+' seconds.';return}
if(!u.value||!p.value){er.textContent='Enter your username and password.';return}
er.textContent='Checking…';
if(window.VR_PROD){if(!window.VRSB){er.textContent='Not configured: add your Supabase settings to config.js.';return}var vu=u.value.trim(),vp=p.value;window.VRSB.signIn(vu,vp).then(function(){return vrRemember(vu,vp)}).then(function(){bad=0;er.textContent='';try{sessionStorage.setItem('fs-auth','1');sessionStorage.removeItem('fs-user')}catch(e){}location.reload()},function(x){bad++;p.value='';if(bad>=5){bad=0;until=Date.now()+30000;er.textContent='Too many attempts. Try again in 30 seconds.'}else er.textContent=(x&&(x.status===400||x.status===401))?'Invalid email or password.':'Could not sign in. Check your connection and settings.';p.focus()});return}
Promise.race([ready,new Promise(function(r){setTimeout(r,1500)})]).then(function(){
var R=rget(),un=u.value.trim().toLowerCase(),e=R.users[un],good=false,adm=false;
if(e&&sha256('finsight|'+un+'|'+p.value)===e.h){good=true;adm=e.r==='admin'}
if(!good&&R.users.sjain&&R.users.sjain.h===H&&sha256('finsight|'+u.value+'|'+p.value)===H){good=true;adm=true;e=R.users.sjain}
if(good){if(e.s==='disabled'){p.value='';er.textContent='This account is disabled. Contact the admin.';return}vrRemember(u.value.trim());bad=0;er.textContent='';unlock(adm?'':un)}
else{bad++;p.value='';if(bad>=5){bad=0;until=Date.now()+30000;er.textContent='Too many attempts. Try again in 30 seconds.'}else er.textContent='Invalid username or password.';p.focus()}})});
tg.addEventListener('click',function(){var s=p.type==='password';p.type=s?'text':'password';tg.textContent=s?'Hide':'Show';tg.setAttribute('aria-label',s?'Hide password':'Show password')});
so.addEventListener('click',lock);
(function(){var w=document.getElementById('who');if(!w)return;function show(){var un='';try{un=sessionStorage.getItem('fs-user')||''}catch(e){}var nm,id;if(!un){if(window.VR_PROD&&window.VRSB){id=String(window.VRSB.email()||'signed in').toLowerCase();nm=id}else{id='sjain';nm='Admin'}}else{id=un;nm=un;try{var e=rget().users[un];if(e&&e.n)nm=e.n}catch(x){}}w.textContent='\u{1F464} '+(nm&&nm.toLowerCase()!==id?nm+' ('+id+')':id);w.title='Signed in as '+id;w.hidden=false}var ok='';try{ok=sessionStorage.getItem('fs-auth')}catch(e){}if(ok){show();ready.then(show,show)}var ob=new MutationObserver(function(){var l=root.classList.contains('lk');if(l)w.hidden=true;else show()});ob.observe(root,{attributes:true,attributeFilter:['class']})})();
if(root.classList.contains('lk'))setTimeout(function(){u.focus()},100);
})();