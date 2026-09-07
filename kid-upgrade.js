(function(){
'use strict';

const KID_AUDIO={
  m:{label:'m',sound:'mmmm',word:'moon'},s:{label:'s',sound:'ssss',word:'sun'},t:{label:'t',sound:'t',word:'top'},p:{label:'p',sound:'p',word:'pig'},a:{label:'a',sound:'aaa',word:'apple'},
  n:{label:'n',sound:'nnnn',word:'nest'},f:{label:'f',sound:'ffff',word:'fish'},l:{label:'l',sound:'llll',word:'leaf'},h:{label:'h',sound:'hhh',word:'hat'},r:{label:'r',sound:'rrrr',word:'rainbow'}
};
const DIRECT_SCENES={
  unicorn:'./assets/hq/fairy-castle-rainbow.jpg',
  ice:'./assets/hq/anna-elsa-ballroom.jpg',
  mermaid:'./assets/hq/ariel-underwater.jpg',
  library:'./assets/hq/snow-white-forest.jpg',
  tower:'./assets/hq/aurora-castle-garden.jpg',
  fairy:'./assets/hq/tinker-bell-moon.jpg',
  space:'./assets/hq/cotton-candy-castle.jpg',
  reading:'./assets/hq/belle-gold-sparkles.jpg',
  math:'./assets/hq/cotton-candy-castle.jpg',
  language:'./assets/hq/princess-friendship-garden.jpg',
  science:'./assets/hq/ariel-underwater.jpg',
  sel:'./assets/hq/tiana-prince-dance.jpg',
  logic:'./assets/hq/cinderella-fairy-godmother.jpg',
  memory:'./assets/hq/anna-elsa-ballroom.jpg'
};

function safeSpeak(text){
  if(!('speechSynthesis' in window)||!text)return;
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);u.rate=.78;u.pitch=1.08;u.lang='en-US';speechSynthesis.speak(u);
}
function playLetterSound(k){
  const x=KID_AUDIO[k];if(!x)return;
  const phrase=k==='t'||k==='p'?`Listen to the sound. ${k}. ${k}. ${k}. ${x.word}.`:`Listen. ${x.sound}. ${x.word} starts with ${x.sound}.`;
  safeSpeak(phrase);
  document.querySelectorAll('.sound-orb').forEach(b=>b.classList.toggle('playing',b.dataset.sound===k));
  setTimeout(()=>document.querySelectorAll('.sound-orb').forEach(b=>b.classList.remove('playing')),700);
}
window.playLetterSound=playLetterSound;

function addKidStart(){
 const home=document.getElementById('home');if(!home||document.getElementById('kidStartZone'))return;
 const zone=document.createElement('section');zone.id='kidStartZone';zone.className='kid-start-zone';
 zone.innerHTML=`
   <div class="kid-welcome">
     <div><span class="kid-label">FOR KIDS</span><h2>Pick a way to play ✨</h2><p>Touch, move, listen, build, and discover.</p></div>
     <div class="kid-stars">⭐ ✦ ⭐</div>
   </div>
   <div class="kid-mode-grid">
     <button class="kid-mode quest-mode" onclick="go('quest')"><span>✨</span><b>Today's Adventure</b><small>5 different missions</small></button>
     <button class="kid-mode sound-mode" onclick="document.getElementById('soundPlay').scrollIntoView({behavior:'smooth'})"><span>🔊</span><b>Sound Garden</b><small>Tap letters and listen</small></button>
     <button class="kid-mode build-mode" onclick="openDomain('reading')"><span>🔤</span><b>Build Words</b><small>Move letters into place</small></button>
     <button class="kid-mode number-mode" onclick="openDomain('math')"><span>💎</span><b>Play With Numbers</b><small>Count, move, make</small></button>
   </div>
   <div id="soundPlay" class="sound-play-card">
     <div class="sound-head"><div><span class="kid-label">SOUND GARDEN</span><h3>Tap a letter to hear it</h3></div><button class="sound-all" type="button">🔊 Play 5</button></div>
     <div class="sound-orbs">${['m','s','t','p','a','n','f','l','h','r'].map(k=>`<button type="button" class="sound-orb" data-sound="${k}" aria-label="Hear ${k} sound"><b>${k}</b><small>${KID_AUDIO[k].word}</small><span>🔊</span></button>`).join('')}</div>
   </div>`;
 home.prepend(zone);
 zone.querySelectorAll('.sound-orb').forEach(b=>b.addEventListener('click',()=>playLetterSound(b.dataset.sound)));
 zone.querySelector('.sound-all').addEventListener('click',async()=>{for(const k of ['m','s','t','p','a']){playLetterSound(k);await new Promise(r=>setTimeout(r,1200));}});
}

function imageForActivity(a){return DIRECT_SCENES[a?.domain]||DIRECT_SCENES[(typeof data!=='undefined'&&data.theme)||'unicorn']||DIRECT_SCENES.unicorn;}
function patchHero(){
 const hero=document.querySelector('.hero-visual');if(!hero)return;
 hero.innerHTML=`<img class="hq-hero-img" src="${DIRECT_SCENES[(typeof data!=='undefined'&&data.theme)||'unicorn']}" alt="Magical learning world"><div class="hq-stars">✦ ⭐ ✦</div>`;
}

if(typeof data!=='undefined'){
 data.retryHistory=data.retryHistory||[];
 data.skillInsights=data.skillInsights||{};
 data.version=data.version||3;
 persist(false);
}

const originalSetTheme=window.setTheme;
window.setTheme=function(t){if(originalSetTheme)originalSetTheme(t);const img=document.querySelector('.hq-hero-img');if(img)img.src=DIRECT_SCENES[t]||DIRECT_SCENES.unicorn;};

window.handleRetry=function(allowHint=true){
 const r=interactionRuntime,a=r.activity;
 document.getElementById('structuredFeedback').textContent='🌈 '+a.retry_feedback;
 recordInteractionEvent('retry');
 if(r.attempts>=2&&allowHint&&r.hintLevel<2)showHint();
 if(r.attempts>=3){r.hintLevel=3;document.getElementById('structuredHint').textContent='💡 '+a.hint_3;applyStrongScaffold();}
};

window.renderWordBuilder=function(a,m){
 const st=runtimeState();st.order=[];st.tileIds=[];
 m.innerHTML=`
 <div class="kid-task-scene"><img src="${imageForActivity(a)}" alt="${esc(a.title)} scene"><span>${esc(a.character_prompt||'Build the word!')}</span></div>
 <div class="word-build-stage">
   <div class="word-slots kid-word-slots">${a.targets.map((_,i)=>`<button type="button" class="word-slot kid-slot" data-slot="${i}" aria-label="Letter slot ${i+1}">_</button>`).join('')}</div>
   <div class="letter-bank kid-letter-bank">${shuffle(a.items).map(i=>`<div class="letter-piece-wrap"><button type="button" draggable="true" class="letter-tile movable-letter" data-id="${esc(i.id)}" data-value="${esc(i.value)}"><b>${esc(i.value)}</b></button><button type="button" class="tile-sound" data-value="${esc(i.value)}">🔊</button></div>`).join('')}</div>
   <p class="tap-fallback">Drag a letter into a box — or tap letters in order.</p>
   <button class="big-action" type="button" onclick="checkWord()">⭐ Check My Word</button>
 </div>`;
 function sync(){m.querySelectorAll('.kid-slot').forEach((s,i)=>s.textContent=st.order[i]||'_');m.querySelectorAll('.movable-letter').forEach(t=>t.classList.toggle('used',st.tileIds.includes(t.dataset.id)));}
 function place(id,value,slotIndex=null){
   if(st.tileIds.includes(id))return;
   if(slotIndex==null){slotIndex=st.order.length;}
   if(slotIndex>=a.targets.length)return;
   while(st.order.length<slotIndex)st.order.push(null);
   if(st.order[slotIndex]){const oldIndex=slotIndex;st.order.splice(oldIndex,1);st.tileIds.splice(oldIndex,1);}
   st.order[slotIndex]=value;st.tileIds[slotIndex]=id;sync();safeSpeak(value);
 }
 m.querySelectorAll('.movable-letter').forEach(t=>{
   t.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',JSON.stringify({id:t.dataset.id,value:t.dataset.value}));});
   t.addEventListener('click',()=>place(t.dataset.id,t.dataset.value));
 });
 m.querySelectorAll('.kid-slot').forEach(s=>{
   s.addEventListener('dragover',e=>e.preventDefault());
   s.addEventListener('drop',e=>{e.preventDefault();try{const x=JSON.parse(e.dataTransfer.getData('text/plain'));place(x.id,x.value,+s.dataset.slot);}catch(_){}});
   s.addEventListener('click',()=>{const idx=+s.dataset.slot;if(st.order[idx]){st.order.splice(idx,1);st.tileIds.splice(idx,1);sync();}});
 });
 m.querySelectorAll('.tile-sound').forEach(b=>b.addEventListener('click',()=>safeSpeak(`Sound: ${b.dataset.value}`)));
 sync();
};

const oldOpenStructured=window.openStructuredActivity;
window.openStructuredActivity=function(a,containerId,source){
 oldOpenStructured(a,containerId,source);
 setTimeout(()=>{
   const host=document.getElementById(containerId);if(!host)return;
   const mission=host.querySelector('.child-mission');if(!mission)return;
   if(!mission.querySelector('.kid-scene-strip')){
     const guide=mission.querySelector('.character-guide');
     const strip=document.createElement('div');strip.className='kid-scene-strip';strip.innerHTML=`<img src="${imageForActivity(a)}" alt="${esc(a.title)}"><span>${esc(a.character||'Magic Guide')}</span>`;
     guide?.after(strip);
   }
   const tools=mission.querySelector('.child-tools');
   if(tools&&!tools.querySelector('.start-over')){const b=document.createElement('button');b.className='child-tool start-over';b.textContent='↻ Start Over';b.onclick=()=>restartCurrentMission(false);tools.appendChild(b);}
   safeSpeak(a.spoken_instruction);
 },30);
};

window.restartCurrentMission=function(record=true){
 if(!interactionRuntime)return;const r=interactionRuntime,a=r.activity,container=r.containerId,source=r.source;
 if(record){data.retryHistory.push({date:todayKey(),activityId:a.id,skill:a.skill,domain:a.domain,previousAttempts:r.attempts,hints:r.hintLevel});data.retryHistory=data.retryHistory.slice(-120);persist(false);}
 openStructuredActivity(a,container,source);
};

function nextQuestMission(){
 if(!interactionRuntime)return closeStructuredActivity();
 const current=interactionRuntime.activity.id,ids=data.quest||[],i=ids.indexOf(current),next=ids.slice(i+1).find(id=>data.questResults[id]==null);
 if(next){closeStructuredActivity();setTimeout(()=>runActivity(next),100);}else{closeStructuredActivity();go('quest');}
}
window.nextQuestMission=nextQuestMission;

const oldFinishSuccess=window.finishSuccess;
window.finishSuccess=function(forcedScore=null){
 const snapshot=interactionRuntime?{activity:interactionRuntime.activity,containerId:interactionRuntime.containerId,source:interactionRuntime.source}:null;
 oldFinishSuccess(forcedScore);
 if(!snapshot)return;
 setTimeout(()=>{
   const f=document.getElementById('structuredFeedback');if(!f||f.querySelector('.after-mission-actions'))return;
   const actions=document.createElement('div');actions.className='after-mission-actions';actions.innerHTML=`<button type="button" class="retry-mission">↻ Play Again</button>${snapshot.source==='quest'?'<button type="button" class="next-mission">Next Adventure →</button>':''}`;
   f.appendChild(actions);
   actions.querySelector('.retry-mission').onclick=()=>restartCurrentMission(true);
   const next=actions.querySelector('.next-mission');if(next)next.onclick=nextQuestMission;
 },40);
};

window.makeQuest=function(){
 const day=Math.floor(Date.now()/86400000),rotation=['language','logic','science','memory','sel','executive','knowledge'],active=['writing','fine','gross','life','creativity'];
 const yesterday=new Set((data.questHistory||[]).filter(x=>{const d=new Date(x.date+'T00:00:00');return Math.floor((Date.now()-d)/86400000)<=1}).map(x=>x.activityId));
 const requested=['reading','reading','math',rotation[day%rotation.length],active[day%active.length]],usedTypes=new Set(),picked=[];
 requested.forEach(domain=>{
   let candidates=activitiesFor(domain).filter(a=>!picked.includes(a.id));
   candidates.sort((a,b)=>{
     const rank=s=>s==='Review Needed'?0:s==='Learning'?1:s==='Developing'?2:s==='Introduced'?3:s==='Not Introduced'?4:s==='Mostly Mastered'?5:6;
     const repeatA=yesterday.has(a.id)?2:0,repeatB=yesterday.has(b.id)?2:0;
     const typeA=usedTypes.has(a.interaction_type)?1:0,typeB=usedTypes.has(b.interaction_type)?1:0;
     return rank(getStatus(a.domain,a.skill))-rank(getStatus(b.domain,b.skill))||repeatA-repeatB||typeA-typeB||a.difficulty-b.difficulty;
   });
   const pick=candidates[0];if(pick){picked.push(pick.id);usedTypes.add(pick.interaction_type);}
 });
 data.quest=picked;data.questDate=todayKey();data.questResults={};persist(false);renderQuest();
};

function renderCoachInsights(){
 const parent=document.getElementById('parent');if(!parent)return;
 let box=document.getElementById('smartCoach');if(!box){box=document.createElement('div');box.id='smartCoach';box.className='card smart-coach';const anchor=parent.querySelector('.grid');anchor?.after(box);}
 const histories=data.questHistory||[];
 const bySkill={};
 histories.forEach(h=>{const a=activities.find(x=>x.id===h.activityId);if(!a)return;const k=skillKey(a.domain,a.skill);(bySkill[k]||(bySkill[k]=[])).push({...h,a});});
 const insights=Object.entries(bySkill).map(([k,arr])=>{const last=arr.slice(-5),avg=last.reduce((n,x)=>n+(x.score||0),0)/last.length;const attempts=last.reduce((n,x)=>n+(x.attempts||1),0)/last.length;const hints=last.reduce((n,x)=>n+(x.hints||0),0)/last.length;const a=last.at(-1).a;let level='ready',title='Ready to stretch',advice='Keep the skill, change the game, and raise difficulty slightly.';if(avg<.58||hints>=2){level='support';title='Needs scaffolded practice';advice='Repeat this skill with fewer choices, stronger sound cues, and manipulatives.';}else if(avg<.82||attempts>1.7){level='practice';title='Practice for independence';advice='Use another interaction format before increasing difficulty.';}return{a,avg,attempts,hints,level,title,advice};}).sort((a,b)=>a.avg-b.avg).slice(0,4);
 box.innerHTML=`<div class="smart-coach-head"><div><span class="badge adult">🧠 Learning Coach</span><h3>What the app suggests next</h3></div><small>Based on attempts, hints and success — not just stars.</small></div>${insights.length?`<div class="insight-grid">${insights.map(x=>`<div class="insight-card ${x.level}"><span>${esc(x.a.skill)}</span><b>${x.title}</b><small>${Math.round(x.avg*100)}% recent success · ${x.attempts.toFixed(1)} attempts avg · ${x.hints.toFixed(1)} hints avg</small><p>${x.advice}</p><button type="button" onclick="runLearningActivity('${x.a.id}');go('learn')">Practice this skill</button></div>`).join('')}</div>`:'<p class="muted">Complete a few interactive missions and recommendations will appear here.</p>'}`;
}

const oldGo=window.go;
window.go=function(id){oldGo(id);if(id==='parent')setTimeout(renderCoachInsights,40);};

function childPolish(){
 document.body.classList.add('kid-v3');
 addKidStart();patchHero();
 document.querySelectorAll('#home .card p').forEach(p=>{if(p.textContent.length>180)p.classList.add('adult-detail');});
 const q=document.querySelector('#questSummary');if(q)q.textContent='Tap a mission. Listen. Touch. Move. Try again. Earn a shiny star!';
 renderCoachInsights();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',childPolish);else childPolish();
})();
