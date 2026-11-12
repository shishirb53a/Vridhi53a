(function(){
var TABS=[['plan','Plan'],['reports','Reports'],['appearance','Appearance'],['data','Data & backup']];
var cur='plan';
function settings(ctx){const S=ctx.state,LANGS=ctx.languages,family=ctx.family,reportColumns=ctx.reportColumns,snapshots=ctx.snapshots,colourTheme=ctx.colourTheme,appearance=ctx.appearance;const n=(id,l,v,ex='')=>`<div><label for="${id}">${l}</label><input id="${id}" type="number" value="${v}" ${ex}></div>`;
if(!TABS.some(t=>t[0]===cur))cur='plan';
const panel=(k,h)=>`<div class="stp" id="stp-${k}" role="tabpanel" aria-labelledby="stt-${k}" ${k===cur?'':'hidden'}>${h}</div>`;
const tabs=`<div class="stabs" role="tablist" aria-label="Settings categories">${TABS.map(t=>`<button type="button" role="tab" id="stt-${t[0]}" data-stab="${t[0]}" aria-selected="${t[0]===cur}" aria-controls="stp-${t[0]}" tabindex="${t[0]===cur?0:-1}">${t[1]}</button>`).join('')}</div>`;
const plan=`${family}
<div class="card"><h2>General assumptions</h2><div class="r">${n('st','Starting year',S.start)}${n('en','End year',S.end)}</div><p class="mu">Forecast covers ${S.end-S.start+1} years: ${S.start}–${S.end}, your age ${S.members[0].age} to ${S.members[0].age+S.end-S.start}. The end year can be at most 60 years after the start, and your age cannot pass 100.</p>
</div>`;
const reports=`${reportColumns()}
${snapshots()}`;
const look=`<div class="card"><h2>Appearance</h2><div class="r"><div><label for="th">Display mode</label><select id="th">${['system','light','dark'].map(t=>`<option ${t===S.theme?'selected':''}>${t}</option>`).join('')}</select></div><div><label for="lsel">Language</label><select id="lsel">${LANGS.map(l=>`<option value="${l[0]}" ${l[0]===S.lang?'selected':''}>${l[1]}</option>`).join('')}</select></div></div>
<div class="sub2">Colour theme</div>${colourTheme()}
${appearance()}</div>`;
const data=`${window.VRDatabaseBackups?window.VRDatabaseBackups.render():''}<div class="card"><h2>Backup</h2><p class="mu">Export a copy of your data to a file, or import one you saved earlier.</p><div class="acts"><button id="ex">Export backup</button><button id="im">Import backup</button></div></div>
<div class="card stdz"><h2>Danger zone</h2><p class="mu">These actions replace or erase your data. Export a backup first.</p><div class="acts"><button class="d" id="rs">Reset to sample data</button><button class="d" id="clr">Clear all data</button></div><div id="se" class="er" role="alert"></div></div>`;
return`<div class="rph"><div><h1>Settings</h1></div></div>${tabs}${panel('plan',plan)}${panel('reports',reports)}${panel('appearance',look)}${panel('data',data)}`}
function show(k,focus){if(!TABS.some(t=>t[0]===k))return;cur=k;
document.querySelectorAll('[data-stab]').forEach(function(b){var on=b.dataset.stab===k;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;if(on&&focus)b.focus()});
document.querySelectorAll('.stp').forEach(function(p){p.hidden=p.id!=='stp-'+k})}
if(typeof document!=='undefined'){document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-stab]');if(b)show(b.dataset.stab)});
document.addEventListener('keydown',function(e){var b=e.target.closest&&e.target.closest('[data-stab]');if(!b)return;var i=TABS.findIndex(function(t){return t[0]===b.dataset.stab}),j=-1;
if(e.key==='ArrowRight')j=(i+1)%TABS.length;else if(e.key==='ArrowLeft')j=(i-1+TABS.length)%TABS.length;else if(e.key==='Home')j=0;else if(e.key==='End')j=TABS.length-1;
if(j>=0){e.preventDefault();show(TABS[j][0],true)}})}
window.VRSettings={render:settings};
})();
