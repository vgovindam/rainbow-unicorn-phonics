(function(){
const P=window.RainbowPersistence;
if(!P)return;
function rerender(){try{renderAssessment();renderLesson();renderDomains();renderSkillTracker();renderRewards();renderBreakdown();ensureQuest();updateStats();if(typeof renderNextFocus==='function')renderNextFocus();}catch(e){console.warn('rerender',e)}}
async function boot(){
 renderFamilySync();
 try{
  const s=await P.init();
  if(s.remote){
    const hydrated=await P.hydrate(data);
    Object.keys(data).forEach(k=>delete data[k]);Object.assign(data,hydrated);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(data));rerender();
    await P.syncSnapshot(data);
  }
  renderFamilySync();
 }catch(e){console.warn('Family sync unavailable',e);renderFamilySync(String(e.message||e));}
}
const oldPersist=window.persist;
window.persist=function(show=true){oldPersist(show);P.queueSync(data)};
if(typeof recordInteractionEvent==='function'){
 const oldRecord=window.recordInteractionEvent;
 window.recordInteractionEvent=function(type,extra={}){
   const r=typeof interactionRuntime!=='undefined'?interactionRuntime:null;
   oldRecord(type,extra);
   if(r&&['success','not_yet'].includes(type)){
     const evt={event_id:P.uuid(),type,attempts:r.attempts,hintLevel:r.hintLevel,elapsed:Math.round((Date.now()-r.startedAt)/1000),timestamp:new Date().toISOString(),...extra};
     P.appendAttempt(evt,r.activity).catch(console.warn);
   }
 };
}
function renderFamilySync(error=''){
 const parent=document.getElementById('parent');if(!parent)return;
 let card=document.getElementById('familySyncCard');if(!card){card=document.createElement('div');card.id='familySyncCard';card.className='card family-sync';const lockRow=parent.querySelector('.parent-lock-row');(lockRow||parent.querySelector('.section-title'))?.after(card)}
 const st=P.backendStatus();
 if(!st.configured){card.innerHTML=`<h3>☁️ Family Progress Sync</h3><p>Local progress is safe on this device. Cross-device sync is not configured yet.</p><div class="family-sync-status">Supabase connection details are missing.</div>`;return;}
 if(st.remote){card.innerHTML=`<h3>☁️ Family Progress Sync</h3><p><b>Connected.</b> Progress is synced to the permanent learner profile and can be resumed on another authenticated device.</p><div class="family-sync-row"><button class="btn soft" id="syncNowBtn">Sync now</button><button class="btn soft" id="signOutSyncBtn">Disconnect this device</button></div><div class="family-sync-status">Browser storage remains a cache; Supabase is the permanent source of truth.</div>`;card.querySelector('#syncNowBtn').onclick=()=>P.syncSnapshot(data).then(()=>toast()).catch(e=>alert(e.message));card.querySelector('#signOutSyncBtn').onclick=()=>P.signOut().then(()=>location.reload());return;}
 card.innerHTML=`<h3>☁️ Family Progress Sync</h3><p>Use one parent email to connect each family device. After the first sign-in, the browser keeps the Supabase session so the child does not see a login screen during normal use.</p><div class="family-sync-row"><input id="familySyncEmail" type="email" autocomplete="email" placeholder="Parent email"><button class="btn primary" id="familySyncBtn">Send sign-in link</button></div><div class="family-sync-status">${error?`Sync error: ${error}`:'Your child\'s existing local progress will be migrated forward after sign-in; it will not be reset.'}</div>`;
 card.querySelector('#familySyncBtn').onclick=async()=>{const email=card.querySelector('#familySyncEmail').value.trim();if(!email)return alert('Enter the parent email.');try{card.querySelector('.family-sync-status').textContent='Sending secure sign-in link…';const result=await P.signIn(email);if(result?.error)throw result.error;card.querySelector('.family-sync-status').textContent='Check the parent email on this device and open the secure sign-in link.'}catch(e){card.querySelector('.family-sync-status').textContent='Could not send sign-in link: '+(e.message||e)}};
}
window.addEventListener('load',boot,{once:true});
if(document.readyState==='complete')boot();
})();