(function(){
let names=[],editing=null,fromForm=false,created=null,pend=null;
window.syncCats=function(){if(typeof S==='undefined'||!S)return;S.cats=cleanCats(S.cats);S.hide=cleanHide(S.hide);applyCats(S.cats,S.hide);
names.forEach(function(n){delete CC[n]});names=[];
S.cats.forEach(function(c){CC[c.n]=c.c;names.push(c.n)})};
const used=function(n){return S.assets.filter(function(x){return x.cat===n}).length};
function dlg(){let d=document.getElementById('catdlg');if(d)return d;
d=document.createElement('dialog');d.id='catdlg';d.className='cdlg';document.body.appendChild(d);
d.addEventListener('close',function(){const fc=document.getElementById('fc');
if(fc&&dg.open){const keep=created||fc.dataset.last||CATS[0];fc.innerHTML=CATS.map(function(c){return catOpt(c)}).join('')+'<option value="__new">＋ New category…</option>';fc.value=CATS.indexOf(keep)>-1?keep:CATS[0];fc.dataset.last=fc.value}
else if(!dg.open)render();
fromForm=false;created=null;editing=null;pend=null});
d.addEventListener('click',function(e){const b=e.target.closest&&e.target.closest('button');if(!b)return;
if(b.id==='cclose'){const ci=document.getElementById('cin');if(!editing&&ci&&ci.value.trim()){save1();if(document.getElementById('cerr').textContent)return}d.close()}
else if(b.id==='cadd')save1();
else if(b.id==='ccancel'){editing=null;draw()}
else if(b.dataset.cx){editing=b.dataset.cx;draw()}
else if(b.dataset.cd){pend=b.dataset.cd;editing=null;draw()}
else if(b.id==='cdok')del(pend);
else if(b.id==='cdno'){pend=null;draw()}
else if(b.dataset.cr)restore(b.dataset.cr)});
d.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.id==='cin'){e.preventDefault();save1()}});
return d}
function err(t){const e=document.getElementById('cerr');if(e)e.textContent=t}
function save1(){const n=document.getElementById('cin').value.trim().replace(/\s+/g,' '),col=document.getElementById('cic').value;
if(!n)return err('Please enter a category name.');
if(n.length>24)return err('Category name can have at most 24 characters.');
const hid=(S.hide||[]).find(function(h){return h.toLowerCase()===n.toLowerCase()});
if(hid&&!editing){S.hide=S.hide.filter(function(h){return h!==hid});created=hid;toast('Category restored');save();syncCats();draw();return}
const dup=CATS.some(function(c){return c.toLowerCase()===n.toLowerCase()&&c!==editing})||(editing&&CATS0.some(function(c){return c.toLowerCase()===n.toLowerCase()}));
if(dup)return err('A category named "'+n+'" already exists.');
if(editing){const c=S.cats.find(function(x){return x.n===editing});if(!c)return;
S.assets.forEach(function(x){if(x.cat===editing)x.cat=n});if(UI.cat===editing)UI.cat=n;if(UI.hc)UI.hc=UI.hc.map(function(c){return c===editing?n:c});
c.n=n;c.c=col;toast('Category updated')}
else{if(S.cats.length>=30)return err('You can add up to 30 categories.');S.cats.push({n:n,c:col});created=n;toast('Category added')}
editing=null;save();syncCats();draw()}
function del(n){if(!n)return;const k=used(n),u=undoer(),custom=S.cats.some(function(c){return c.n===n});
S.assets.forEach(function(x){if(x.cat===n)x.cat='Other'});
if(custom)S.cats=S.cats.filter(function(c){return c.n!==n});else S.hide=(S.hide||[]).filter(function(h){return h!==n}).concat(n);
if(UI.cat===n)UI.cat='All';if(UI.hc)UI.hc=UI.hc.filter(function(c){return c!==n});
pend=null;save();syncCats();draw();toast('Category deleted'+(k?' · '+k+' holding'+(k>1?'s':'')+' moved to Other':''),u)}
function restore(n){S.hide=(S.hide||[]).filter(function(h){return h!==n});save();syncCats();draw();toast('Category restored')}
function draw(){const d=dlg(),ed=editing?S.cats.find(function(c){return c.n===editing}):null;
d.innerHTML='<h2>Manage categories</h2><p class="mu">Delete any category except Other. Holdings in a deleted category move to Other. Categories appear when you add or edit a holding, in the category filter and in Asset allocation.</p>'
+(pend?'<div class="cdq" role="alert"><b>Delete "'+esc(pend)+'"?</b> '+(used(pend)?used(pend)+' holding'+(used(pend)>1?'s':'')+' will be moved to "Other".':'No holdings use it.')+'<div class="tb"><button type="button" class="d" id="cdok">Yes, delete</button><button type="button" id="cdno">Cancel</button></div></div>':'')
+'<ul class="cl">'+CATS0.slice(0,-1).map(function(n){return row(n,'b')}).join('')+S.cats.map(function(c){return row(c.n,'c')}).join('')+row('Other','o')+'</ul>'
+'<h3>'+(ed?'Edit category':'Add a category')+'</h3><div class="ccf"><input id="cin" maxlength="24" placeholder="Category name, e.g. Real estate" aria-label="Category name" value="'+esc(ed?ed.n:'')+'"><input id="cic" type="color" value="'+(ed?ed.c:'#7c3aed')+'" aria-label="Colour"></div>'
+'<div id="cerr" class="er" role="alert"></div><div class="tb"><button type="button" class="p" id="cadd">'+(ed?'Save changes':'Add category')+'</button>'+(ed?'<button type="button" id="ccancel">Cancel edit</button>':'')+'<button type="button" id="cclose">Done</button></div>'}
function row(n,kind){const k=used(n),h=kind==='b'&&(S.hide||[]).indexOf(n)>-1,cnt=k+' holding'+(k===1?'':'s');
if(h)return'<li><span class="cdot" style="background:'+CC[n]+';opacity:.4" aria-hidden="true"></span><b style="opacity:.55;text-decoration:line-through">'+esc(n)+'</b><span class="mu">deleted</span><span class="ca"><button type="button" data-cr="'+esc(n)+'">Restore</button></span></li>';
return'<li><span class="cdot" style="background:'+CC[n]+'" aria-hidden="true"></span><b>'+esc(n)+'</b><span class="mu">'+(kind==='o'?'built-in · '+cnt:cnt)+'</span>'+(kind==='o'?'':'<span class="ca">'+(kind==='c'?'<button type="button" data-cx="'+esc(n)+'">Edit</button>':'')+'<button type="button" class="cdb" data-cd="'+esc(n)+'" aria-label="Delete '+esc(n)+'">Delete</button></span>')+'</li>'}
function openCats(ff){fromForm=!!ff;created=null;editing=null;pend=null;draw();const d=dlg();if(!d.open)d.showModal();const i=document.getElementById('cin');if(i)i.focus()}
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('#mcat'))openCats(false)});
document.addEventListener('focusin',function(e){if(e.target.id==='fc'&&e.target.value!=='__new')e.target.dataset.last=e.target.value});
document.addEventListener('change',function(e){if(e.target.id==='fc'){if(e.target.value==='__new'){e.target.value=e.target.dataset.last||CATS[0];openCats(true)}else e.target.dataset.last=e.target.value}});
syncCats();
})();