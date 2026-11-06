(function(){
function settings(ctx){const S=ctx.state,LANGS=ctx.languages,family=ctx.family,reportColumns=ctx.reportColumns,snapshots=ctx.snapshots,colourTheme=ctx.colourTheme,appearance=ctx.appearance;const n=(id,l,v,ex='')=>`<div><label for="${id}">${l}</label><input id="${id}" type="number" value="${v}" ${ex}></div>`;
return`<div class="rph"><div><h1>Settings</h1></div></div>${family}
<div class="card"><h2>General assumptions</h2><div class="r">${n('st','Starting year',S.start)}${n('en','End year',S.end)}</div><p class="mu">Forecast covers ${S.end-S.start+1} years: ${S.start}–${S.end}, your age ${S.members[0].age} to ${S.members[0].age+S.end-S.start}. The end year can be at most 60 years after the start, and your age cannot pass 100.</p>
</div>
${reportColumns()}
${snapshots()}
<div class="card"><h2>Appearance & backup</h2><div class="r"><div><label for="th">Display mode</label><select id="th">${['system','light','dark'].map(t=>`<option ${t===S.theme?'selected':''}>${t}</option>`).join('')}</select></div><div><label for="lsel">Language</label><select id="lsel">${LANGS.map(l=>`<option value="${l[0]}" ${l[0]===S.lang?'selected':''}>${l[1]}</option>`).join('')}</select></div></div>
<div class="sub2">Colour theme</div>${colourTheme()}
${appearance()}<div class="sub2">Backup</div><div class="acts"><button id="ex">Export backup</button><button id="im">Import backup</button></div>
<div class="sub2">Danger zone</div><div class="acts"><button class="d" id="rs">Reset to sample data</button><button class="d" id="clr">Clear all data</button></div><div id="se" class="er" role="alert"></div></div>`}
window.VRSettings={render:settings};
})();
