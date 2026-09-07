(function(){
const CACHE_KEY='rainbowMagicLearningV2';
const cfg=()=>window.RAINBOW_CONFIG||{};
let client=null,learnerId=null,sessionId=null,ready=false,remote=false,syncTimer=null;
function uuid(){return crypto?.randomUUID?crypto.randomUUID():'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)});}
function clone(v){return JSON.parse(JSON.stringify(v||{}));}
function mergeRemote(local,remoteData){if(!remoteData)return local;const out={...local};out.theme=remoteData.profile?.preferred_themes?.[0]||local.theme;out.skills={...(local.skills||{}),...(remoteData.legacySkills||{})};out.evidence={...(local.evidence||{}),...(remoteData.evidence||{})};out.questHistory=[...(local.questHistory||[]),...(remoteData.questHistory||[])].slice(-250);return out;}
async function init(){
 const c=cfg();
 if(!c.supabaseUrl||!c.supabaseAnonKey||!window.supabase?.createClient){ready=true;return {remote:false,reason:'not_configured'};}
 client=window.supabase.createClient(c.supabaseUrl,c.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const {data:{session}}=await client.auth.getSession();
 remote=!!session;ready=true;
 if(remote)await ensureProfile();
 return {remote};
}
async function signIn(email){if(!client)await init();if(!client)throw new Error('Backend not configured');return client.auth.signInWithOtp({email,options:{emailRedirectTo:location.href}});}
async function signOut(){if(client)await client.auth.signOut();remote=false;learnerId=null;sessionId=null;}
async function ensureProfile(){
 const {data:{user}}=await client.auth.getUser();if(!user)return null;
 let {data,error}=await client.from('learner_profiles').select('*').eq('parent_user_id',user.id).order('created_at',{ascending:true}).limit(1).maybeSingle();
 if(error)throw error;
 if(!data){const ins=await client.from('learner_profiles').insert({parent_user_id:user.id,display_name:'Learner',birth_year_or_age:'5',current_grade_level:'Pre-K / Kindergarten',preferred_themes:['unicorn'],typical_session_length:20,curriculum_version:window.RainbowCurriculum?.version||'2026.09.07-v1'}).select('*').single();if(ins.error)throw ins.error;data=ins.data;}
 learnerId=data.learner_id;return data;
}
async function hydrate(localData){
 if(!remote||!learnerId)return localData;
 const [profile,skills,attempts]=await Promise.all([
   client.from('learner_profiles').select('*').eq('learner_id',learnerId).single(),
   client.from('learner_skill_progress').select('*').eq('learner_id',learnerId),
   client.from('learning_attempts').select('*').eq('learner_id',learnerId).order('timestamp',{ascending:true}).limit(500)
 ]);
 if(profile.error||skills.error||attempts.error)throw profile.error||skills.error||attempts.error;
 const legacySkills={},evidence={},questHistory=[];
 (skills.data||[]).forEach(s=>{const legacyName=Object.entries(window.RainbowCurriculum?.aliases||{}).find(([,id])=>id===s.skill_id)?.[0]||s.skill_name;legacySkills[`${s.domain}::${legacyName}`]=s.mastery_state.split('_').map(w=>w[0]+w.slice(1).toLowerCase()).join(' ');});
 (attempts.data||[]).forEach(a=>{const legacyName=Object.entries(window.RainbowCurriculum?.aliases||{}).find(([,id])=>id===a.skill_id)?.[0]||a.skill_id;const key=`${a.domain}::${legacyName}`;const score=a.result==='CORRECT'?1:(a.result==='PARTIAL' ? .65 : .3);(evidence[key]||(evidence[key]=[])).push({date:a.timestamp?.slice(0,10),score,activityId:a.activity_id});questHistory.push({date:a.timestamp?.slice(0,10),activityId:a.activity_id,score:a.result==='CORRECT'?1:.4,interaction_type:a.interaction_type,hints:a.hint_level_used,attempts:a.number_of_attempts});});
 return mergeRemote(localData,{profile:profile.data,legacySkills,evidence,questHistory});
}
async function beginSession(data){if(!remote||!learnerId||sessionId)return sessionId;const r=await client.from('learning_sessions').insert({learner_id:learnerId,theme:data.theme,curriculum_version:window.RainbowCurriculum?.version||'2026.09.07-v1'}).select('session_id').single();if(!r.error)sessionId=r.data.session_id;return sessionId;}
function stateFor(skillId,data){const alias=Object.entries(window.RainbowCurriculum?.aliases||{}).find(([,id])=>id===skillId)?.[0];if(!alias)return 'NOT_INTRODUCED';const raw=data.skills?.[`${window.RainbowCurriculum.byId[skillId]?.domain}::${alias}`]||'Not Introduced';return window.RainbowCurriculum.normalizeState(raw);}
async function syncSkills(data){if(!remote||!learnerId)return;const rows=[];(window.RainbowCurriculum?.skills||[]).forEach(s=>{const state=stateFor(s.skill_id,data);if(state==='NOT_INTRODUCED'&&!Object.values(window.RainbowCurriculum?.aliases||{}).includes(s.skill_id))return;const alias=Object.entries(window.RainbowCurriculum.aliases).find(([,id])=>id===s.skill_id)?.[0];const ev=alias?(data.evidence?.[`${s.domain}::${alias}`]||[]):[];const recent=ev.slice(-10),avg=recent.length?recent.reduce((n,x)=>n+(+x.score||0),0)/recent.length:0;rows.push({learner_id:learnerId,domain:s.domain,subdomain:s.stage,skill_id:s.skill_id,skill_name:s.title,skill_level:s.difficulty_level,mastery_state:state,mastery_score:avg,confidence_score:Math.min(1,recent.length/5),attempt_count:recent.length,last_practiced_at:recent.length?`${recent[recent.length-1].date}T12:00:00Z`:null,difficulty_level:s.difficulty_level});});if(rows.length)await client.from('learner_skill_progress').upsert(rows,{onConflict:'learner_id,skill_id'});}
async function appendAttempt(evt,activity){if(!remote||!learnerId||!evt||!activity)return;await beginSession(window.data||{});const skillId=window.RainbowCurriculum?.aliases?.[activity.skill]||`${activity.domain}.${String(activity.skill).toLowerCase().replace(/[^a-z0-9]+/g,'_')}`;const result=evt.type==='success'?'CORRECT':evt.type==='not_yet'?'INCORRECT':'PARTIAL';await client.from('learning_attempts').upsert({attempt_id:evt.event_id||uuid(),learner_id:learnerId,session_id:sessionId,activity_id:activity.id,domain:activity.domain,skill_id:skillId,interaction_type:activity.interaction_type||activity.type||'offline_activity',difficulty:activity.difficulty||1,question_or_task_id:activity.id,result,hint_level_used:evt.hintLevel||0,number_of_attempts:evt.attempts||1,response_time_ms:evt.elapsed?evt.elapsed*1000:null,completed:evt.type==='success'||evt.type==='not_yet',timestamp:evt.timestamp||new Date().toISOString(),curriculum_version:window.RainbowCurriculum?.version||'2026.09.07-v1'},{onConflict:'attempt_id'});}
async function syncSnapshot(data){if(!remote||!learnerId)return;await client.from('learner_profiles').update({preferred_themes:[data.theme||'unicorn'],last_activity_at:new Date().toISOString(),curriculum_version:window.RainbowCurriculum?.version||'2026.09.07-v1'}).eq('learner_id',learnerId);await syncSkills(data);}
function queueSync(data){clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncSnapshot(clone(data)).catch(console.warn),600);}
function backendStatus(){return {ready,remote,learnerId,sessionId,configured:!!(cfg().supabaseUrl&&cfg().supabaseAnonKey)};}
window.RainbowPersistence={init,hydrate,signIn,signOut,ensureProfile,beginSession,appendAttempt,queueSync,syncSnapshot,backendStatus,uuid,CACHE_KEY};
})();