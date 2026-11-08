(function(){
var state={items:null,error:'',message:'',busy:false,loading:false,updatedAt:0,file:null};
function h(value){return String(value==null?'':value).replace(/[&<>"']/g,function(char){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]})}
function canManage(){return !!(window.VR_ACCESS&&!window.VR_ACCESS.error&&(window.VR_ACCESS.permissions||[]).includes('manage_database_backups'))}
function date(value){var parsed=new Date(value);return isNaN(parsed)?'Unknown date':parsed.toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function size(value){var bytes=Number(value)||0;if(bytes<1024)return bytes+' B';var units=['KB','MB','GB','TB'],unit=-1;do{bytes/=1024;unit++}while(bytes>=1024&&unit<units.length-1);return bytes.toFixed(1)+' '+units[unit]}
function disabled(){return state.busy||state.loading?' disabled':''}
function listMarkup(){
 if(state.items===null)return '<p class="mu">Loading database backups...</p>';
 if(!state.items.length)return '<p class="mu">No database backups yet.</p>';
 return '<ul class="vr-db-backup-list">'+state.items.map(function(item){return '<li><div><b>'+h(date(item.createdAt))+'</b><div class="mu">'+h(item.filename)+' · '+h(size(item.size))+' · '+(item.source==='uploaded'?'Uploaded':'Created')+'</div></div><div class="acts"><button type="button" data-dbb="download" data-id="'+h(item.id)+'"'+disabled()+'>Download</button><button type="button" class="d" data-dbb="restore" data-id="'+h(item.id)+'"'+disabled()+'>Restore</button></div></li>'}).join('')+'</ul>';
}
function result(){return (state.error?'<p class="er" role="alert">'+h(state.error)+'</p>':'')+(state.message?'<p class="mu" role="status">'+h(state.message)+'</p>':'')+'<div id="vr-db-backup-list">'+listMarkup()+'</div>'}
function panel(){
 if(!canManage())return '';
 var configured=!!(window.VR_CFG&&window.VR_CFG.databaseBackupUrl);
 if(!configured)return '<section class="card" id="vr-db-backups"><h2>Database backups</h2><p class="mu">The native PostgreSQL backup service is not configured. Set <code>databaseBackupUrl</code> in config.js after deploying it.</p></section>';
 return '<section class="card" id="vr-db-backups"><h2>Database backups</h2><p class="mu">Full PostgreSQL backups include database objects and records, plus global roles. Restoring replaces database objects and can affect every user.</p><div class="acts"><button type="button" class="p" data-dbb="create"'+disabled()+'>Create full backup</button><button type="button" data-dbb="refresh"'+disabled()+'>Refresh history</button></div><div class="sub2">Upload an existing backup</div><div class="acts"><label>Backup file <input id="vr-db-backup-file" type="file" accept=".tar.gz,.tgz,application/gzip"></label><button type="button" data-dbb="upload"'+(disabled()||!state.file?' disabled':'')+'>Upload to history</button></div>'+(state.file?'<p class="mu">Selected: '+h(state.file.name)+' ('+h(size(state.file.size))+')</p>':'')+'<div id="vr-db-backup-result">'+result()+'</div></section>';
}
function paint(){var root=document.getElementById('vr-db-backups');if(root)root.outerHTML=panel()}
async function refresh(){var result=await window.VRSB.databaseBackups.list();state.items=result.backups||[];state.updatedAt=Date.now();state.error=''}
async function load(){if(state.loading||!window.VRSB||!canManage()||!(window.VR_CFG&&window.VR_CFG.databaseBackupUrl))return;state.loading=true;try{await refresh()}catch(error){state.error=String(error&&error.message||'Could not load backup history.')}finally{state.loading=false;paint()}}
async function run(action){state.busy=true;state.error='';state.message='';paint();try{await action()}catch(error){state.error=String(error&&error.message||'The backup operation failed.')}finally{state.busy=false;paint()}}
document.addEventListener('change',function(event){if(event.target&&event.target.id==='vr-db-backup-file'){state.file=event.target.files&&event.target.files[0]||null;paint()}});
document.addEventListener('click',function(event){var button=event.target.closest&&event.target.closest('[data-dbb]');if(!button||!document.getElementById('vr-db-backups')||state.busy)return;var action=button.dataset.dbb,id=button.dataset.id;
 if(action==='refresh')return run(refresh);
 if(action==='create'){if(!confirm('Create a full database backup, including global roles? This can take several minutes.'))return;return run(async function(){var result=await window.VRSB.databaseBackups.create();state.message='Full database backup created.';await refresh();if(result.backup)state.items.sort(function(a,b){return new Date(b.createdAt)-new Date(a.createdAt)})})}
 if(action==='upload'){if(!state.file)return;var file=state.file;if(!confirm('Add '+file.name+' to backup history? It will not be restored until you choose Restore.'))return;return run(async function(){await window.VRSB.databaseBackups.upload(file);state.file=null;state.message='Backup uploaded to history.';await refresh()})}
 if(action==='download')return run(async function(){var result=await window.VRSB.databaseBackups.download(id),link=document.createElement('a'),objectUrl=URL.createObjectURL(result.blob);link.href=objectUrl;link.download=result.filename;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(objectUrl);state.message='Backup download started.'});
 if(action==='restore'){if(!confirm('Restore this full database backup? This replaces database objects and records for every account. This action cannot be undone.'))return;return run(async function(){await window.VRSB.databaseBackups.restore(id);state.message='Database restore completed.'})}
});
window.VRDatabaseBackups={render:function(){if(state.items===null&&!state.loading&&canManage())setTimeout(load,0);else if(Date.now()-state.updatedAt>30000&&!state.loading&&canManage())setTimeout(load,0);return panel()}};
})();