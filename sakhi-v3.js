(()=> {
'use strict';

const BUILD='2026.09.09-v3.0';
const CURRICULUM_VERSION='2026.09.09-v2';
const STATE_KEY='sakhi.v3.state';
const LEGACY_KEYS=['sakhi.v2.state','rainbowMagicLearningV2'];
const PARENT_PASS='071621';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`;
const today=()=>new Date().toISOString().slice(0,10);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

const THEMES={
  reading:{id:'reading',world:'Unicorn Rainbow Meadow',label:'Reading & Phonics',guide:'Sakhi Unicorn',image:'./assets/magic/reading-unicorn.svg',palette:['#fff0fb','#ecdfff','#d9f2ff','#ff69b4'],atlas:'0% 0%',icon:'🌈'},
  math:{id:'math',world:'Royal Castle Academy',label:'Math & Number Sense',guide:'Gem Princess',image:'./assets/magic/math-princess.svg',palette:['#fff2fa','#f5e3ff','#fff1bf','#a65dde'],atlas:'60% 0%',icon:'👑'},
  logic:{id:'logic',world:'Ice Princess Palace',label:'Logic & Problem Solving',guide:'Snow Princess',image:'./assets/magic/logic-fairy.svg',palette:['#eaf8ff','#dff1ff','#eee7ff','#5aa9e6'],atlas:'20% 0%',icon:'❄️'},
  science:{id:'science',world:'Mermaid Lagoon',label:'Science & Curiosity',guide:'Coral Mermaid',image:'./assets/magic/science-mermaid.svg',palette:['#e4ffff','#d7f6ff','#e9dcff','#2db7c4'],atlas:'40% 0%',icon:'🧜‍♀️'},
  language:{id:'language',world:'Enchanted Forest Friends',label:'Stories & Comprehension',guide:'Book Princess',image:'./assets/magic/story-princess.svg',palette:['#f1ffe9','#fff0dc','#ffe5f1','#65ad73'],atlas:'80% 0%',icon:'🌳'},
  writing:{id:'writing',world:'Pixie Art Garden',label:'Writing & Creativity',guide:'Lantern Princess',image:'./assets/magic/writing-princess.svg',palette:['#fff0f7','#f4e8ff','#e8fff4','#e887b9'],atlas:'100% 0%',icon:'🧚‍♀️'}
};

const PATHS={
 reading:[
  ['reading.letter_sounds','Letter sounds',1],['reading.short_vowels','Short vowels',1],['reading.blend_segment','Blend & segment sounds',2],
  ['reading.cvc_mixed','Read mixed CVC words',2],['reading.cvc_encode','Spell mixed CVC words',3],['reading.digraphs','Digraphs',3],
  ['reading.blends','Consonant blends',3],['reading.sentences','Read short sentences',4],['reading.stories','Read decodable stories',4],
  ['reading.fluency','Reading fluency',4],['reading.advanced','Long vowels & vowel teams',5]],
 math:[
  ['math.number_sense','Quantities to 10',1],['math.compose_to_10','Make numbers in different ways',2],['math.addition','Addition with objects',2],
  ['math.subtraction','Subtraction with objects',2],['math.number_bonds','Number bonds to 10',3],['math.missing_parts','Missing-part problems',3],
  ['math.patterns','Number patterns',2],['math.geometry','Shapes & spatial reasoning',2],['math.measurement','Compare & measure',3],['math.place_value','Early place value',4]],
 logic:[
  ['logic.classify','Sort by meaningful rules',1],['logic.patterns','Multi-step patterns',2],['logic.sequence','Put steps in order',2],
  ['logic.spatial','Visual-spatial puzzles',3],['logic.deduction','Simple deduction',3],['logic.coding','Early coding sequences',3]],
 science:[
  ['science.observe','Observe carefully',1],['science.habitats','Animals & habitats',2],['science.float_sink','Float & sink',2],
  ['science.weather','Weather & seasons',2],['science.plants','Plants & growth',2],['science.magnets','Magnets',3],
  ['science.light_sound','Light & sound',3],['science.space','Day, night & space',3]],
 language:[
  ['language.listening','Listening comprehension',1],['language.sequence','Story sequencing',2],['language.retell','Retell beginning-middle-end',2],
  ['language.prediction','Prediction',2],['language.cause_effect','Cause & effect',3],['language.inference','Simple inference',3],
  ['language.vocabulary','Vocabulary in context',2],['language.main_idea','Main idea & details',4]],
 writing:[
  ['writing.letter_formation','Letter formation',1],['writing.cvc_words','Write/build CVC words',2],['writing.labels','Label pictures',2],
  ['writing.sentence','Build a simple sentence',3],['writing.story','Create a short story',4]]
};
const SKILLS=Object.fromEntries(Object.entries(PATHS).flatMap(([domain,list])=>list.map(([id,title,difficulty])=>[id,{id,title,difficulty,domain}])));

function emptyState(){
  return {
    build:BUILD,
    profile:{name:'My Learner',age:5},
    settings:{sessionLength:20,audio:true,autoAdvance:true,bedtimeStory:true},
    progress:{}, attempts:[], sessions:[],
    rewards:{MAGIC_STAR:0,UNICORN_GEM:0,COURAGE_HEART:0},
    currentPlan:null,currentIndex:0,currentSession:null,
    cloud:{connected:false,userId:null,learnerId:null,email:null},
    migration:{v3:true}
  };
}
function mergeState(base,extra){
  return {
    ...base,...extra,
    profile:{...base.profile,...(extra?.profile||{})},
    settings:{...base.settings,...(extra?.settings||{})},
    progress:extra?.progress||base.progress,
    attempts:Array.isArray(extra?.attempts)?extra.attempts:base.attempts,
    sessions:Array.isArray(extra?.sessions)?extra.sessions:base.sessions,
    rewards:{...base.rewards,...(extra?.rewards||{})},
    cloud:{...base.cloud,...(extra?.cloud||{})},
    migration:{...base.migration,...(extra?.migration||{})}
  };
}
function migrateLegacy(){
  let s;
  try{s=JSON.parse(localStorage.getItem(STATE_KEY)||'null')}catch(_){}
  if(s)return mergeState(emptyState(),s);
  const base=emptyState();
  for(const key of LEGACY_KEYS){
    let old;try{old=JSON.parse(localStorage.getItem(key)||'null')}catch(_){}
    if(!old)continue;
    localStorage.setItem(`sakhi.v3.backup.${key}`,JSON.stringify(old));
    if(old.rewards)base.rewards={...base.rewards,...old.rewards};
    if(Number(old.shinyStars))base.rewards.MAGIC_STAR=Number(old.shinyStars);
    if(old.progress&&typeof old.progress==='object'){
      for(const [id,v] of Object.entries(old.progress)){
        if(SKILLS[id]) base.progress[id]=typeof v==='object'?v:{mastery:String(v).toUpperCase().replace(/\s+/g,'_'),attempts:1,correct:0};
      }
    }
    if(old.skills&&typeof old.skills==='object'){
      const map={'CVC decoding':'reading.cvc_mixed','Oral blending':'reading.blend_segment','Short vowels':'reading.short_vowels','Letter sounds':'reading.letter_sounds','Patterns':'logic.patterns','Addition':'math.addition'};
      for(const [k,v] of Object.entries(old.skills)){
        const name=k.includes('::')?k.split('::').pop():k; const id=map[name];
        if(id&&!base.progress[id])base.progress[id]={mastery:String(v).toUpperCase().replace(/\s+/g,'_'),attempts:1,correct:0};
      }
    }
    if(Array.isArray(old.sessionHistory))base.sessions=old.sessionHistory.slice(-100);
    break;
  }
  return base;
}
let state=migrateLegacy();
function save(){state.build=BUILD;localStorage.setItem(STATE_KEY,JSON.stringify(state));renderChrome();}

const sb=window.supabase&&window.RAINBOW_CONFIG
  ? window.supabase.createClient(window.RAINBOW_CONFIG.supabaseUrl,window.RAINBOW_CONFIG.supabaseAnonKey)
  : null;

async function initCloud(){
  if(!sb)return;
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session){state.cloud.connected=false;save();return;}
    state.cloud.connected=true;state.cloud.userId=session.user.id;state.cloud.email=session.user.email||null;
    const {data:profiles}=await sb.from('learner_profiles').select('learner_id,display_name').eq('parent_user_id',session.user.id).limit(1);
    if(profiles?.[0]){
      state.cloud.learnerId=profiles[0].learner_id;
      state.profile.name=profiles[0].display_name||state.profile.name;
      await hydrateCloud();
    }
    save();
  }catch(err){console.warn('Cloud init',err);state.cloud.connected=false;save()}
}
async function hydrateCloud(){
  if(!sb||!state.cloud.learnerId)return;
  try{
    const {data,error}=await sb.rpc('get_learner_snapshot',{p_learner_id:state.cloud.learnerId});
    if(error)throw error;
    for(const p of data?.skill_progress||[]){
      state.progress[p.skill_id]={mastery:p.mastery_state,attempts:p.attempt_count||0,correct:p.independent_correct_count||0,last:p.last_practiced_at,score:Number(p.mastery_score||0)};
    }
    const balances=data?.reward_balances||{};
    for(const k of Object.keys(state.rewards))if(balances[k]!=null)state.rewards[k]=Number(balances[k])||0;
    if(Array.isArray(data?.sessions))state.sessions=data.sessions.slice(-100);
  }catch(err){console.warn('Cloud hydrate',err)}
}

const audio=$('#sakhiAudio');
let audioSeq=0,audioAbort=null,audioUnlocked=false,lastSpoken='';
const audioCache=new Map();
const PHONEMES={m:'M.wav',s:'S.wav',t:'T.wav',p:'P.wav',n:'N.wav',k:'K.wav',b:'B.wav',d:'D.wav',g:'G.wav',f:'F.wav',l:'L.wav',r:'R.wav',h:'H.wav',a:'A-short.wav',e:'E-short.wav',i:'I-short.wav',o:'O-short.wav',u:'U-short.wav'};
const PHONEME_BASE='https://raw.githubusercontent.com/mitmedialab/word-tree/230116336ee4381787e7089493a8ae2ef4cf0c55/WordTree/Assets/Resources/Audio/Phonemes/';
function stopAudio(){audioSeq++;audioAbort?.abort();audioAbort=null;try{audio.pause();audio.currentTime=0}catch(_){}audio.removeAttribute('src')}
async function unlockAudio(){
  if(audioUnlocked)return true;
  try{
    audio.src='data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA';
    await audio.play();audio.pause();audio.currentTime=0;audioUnlocked=true;return true;
  }catch(_){return false}
}
async function ttsUrl(text,kind='instruction'){
  const key=`${kind}|${text}`;if(audioCache.has(key))return audioCache.get(key);
  const c=window.RAINBOW_CONFIG||{};if(!c.ttsEndpoint)return null;
  audioAbort?.abort();const controller=new AbortController();audioAbort=controller;
  const res=await fetch(c.ttsEndpoint,{method:'POST',signal:controller.signal,headers:{'content-type':'application/json',apikey:c.supabaseAnonKey||''},body:JSON.stringify({text,kind,profile:kind==='story'?'book':'sakhi'})});
  if(!res.ok)throw new Error(`Narration ${res.status}`);
  const blob=await res.blob();const url=URL.createObjectURL(blob);audioCache.set(key,url);return url;
}
async function speak(text,kind='instruction'){
  if(!state.settings.audio||!text)return false;stopAudio();const seq=audioSeq;lastSpoken=text;
  try{const url=await ttsUrl(text,kind);if(!url||seq!==audioSeq)return false;audio.src=url;await audio.play();return true}
  catch(err){console.warn('Sakhi audio',err);showToast('🔊 Tap Hear again if your device muted Sakhi.');return false}
}
async function speakPhoneme(id){
  if(!state.settings.audio||!PHONEMES[id])return false;stopAudio();
  try{audio.src=PHONEME_BASE+PHONEMES[id];await audio.play();return true}catch(err){console.warn('phoneme',id,err);return false}
}
function prefetchSpeech(text,kind='instruction'){if(!text)return;setTimeout(()=>ttsUrl(text,kind).catch(()=>{}),150)}

function progressFor(id){return state.progress[id]||{mastery:'NOT_INTRODUCED',attempts:0,correct:0,score:0}}
function currentSkill(domain){
  const path=PATHS[domain]||[];
  const baseline=domain==='reading'?3:domain==='math'?1:domain==='language'?1:domain==='logic'?1:domain==='science'?1:domain==='writing'?1:0;
  for(let i=baseline;i<path.length;i++){
    const p=progressFor(path[i][0]);
    if(!['MASTERED'].includes(p.mastery))return SKILLS[path[i][0]];
  }
  return SKILLS[path[path.length-1][0]];
}
function rotateDomains(){
  const day=Math.floor(Date.now()/86400000);
  const secondary=[['logic','science'],['language','writing'],['science','language'],['writing','logic']][day%4];
  return ['reading','math',...secondary];
}
function buildPlan(force=false){
  if(!force&&state.currentPlan?.date===today()&&state.currentPlan.items?.length)return state.currentPlan;
  const domains=rotateDomains();
  const items=domains.map((domain,i)=>{
    const skill=currentSkill(domain),theme=THEMES[domain],a=makeActivity(skill,i);
    return {...a,order:i+1,domain,theme};
  });
  state.currentPlan={id:`plan-${today()}`,date:today(),items,createdAt:new Date().toISOString()};
  state.currentIndex=0;save();return state.currentPlan;
}

function makeActivity(skill,seed=0){
  const id=`${skill.id}.${today()}.${seed}`;
  const common={id,skillId:skill.id,skillTitle:skill.title,difficulty:skill.difficulty,minutes:4,interaction:'choice'};
  if(skill.domain==='reading'){
    if(skill.id==='reading.cvc_mixed')return {...common,title:'Unicorn Reading Meadow — Read the Word',instruction:'Touch the word “map”.',spoken:'Find the word map. Touch each sound if you need to.',choices:['map','mat','sun'],answer:'map',phoneme:null};
    if(skill.id==='reading.cvc_encode')return {...common,title:'Unicorn Reading Meadow — Build the Word',instruction:'Build “sun”.',spoken:'Listen: sun. Choose the letters in order.',interaction:'builder',tokens:['s','u','n','m','a'],answer:'sun'};
    if(skill.id==='reading.digraphs')return {...common,title:'Unicorn Reading Meadow — Digraph Magic',instruction:'Which word starts with “sh”?',spoken:'Which word starts with the sh sound?',choices:['ship','chip','sun'],answer:'ship'};
    if(skill.id==='reading.blends')return {...common,title:'Unicorn Reading Meadow — Blend Bridge',instruction:'Which word starts with “st”?',spoken:'Which word starts with st?',choices:['star','car','ship'],answer:'star'};
    if(skill.id==='reading.sentences')return {...common,title:'Unicorn Reading Meadow — Sentence Trail',instruction:'Which sentence matches?',spoken:'Choose the sentence that says the cat can run.',choices:['The cat can run.','The dog is big.','I see a sun.'],answer:'The cat can run.'};
    if(skill.id==='reading.stories'||skill.id==='reading.fluency'||skill.id==='reading.advanced')return {...common,title:'Unicorn Reading Meadow — Story Spark',instruction:'Read and choose what happened.',spoken:'Read this: Mia had a red kite. The wind made it fly high. What flew high?',story:'Mia had a red kite. The wind made it fly high.',choices:['The kite','The hat','The dog'],answer:'The kite'};
    if(skill.id==='reading.short_vowels')return {...common,title:'Unicorn Reading Meadow — Short Vowel Magic',instruction:'Which word has short “a”?',spoken:'Which word has the short a sound?',choices:['map','sit','sun'],answer:'map',phoneme:'a'};
    if(skill.id==='reading.blend_segment')return {...common,title:'Unicorn Reading Meadow — Sound Steps',instruction:'How many sounds in “map”?',spoken:'Say map slowly. How many tiny sounds do you hear?',choices:['2','3','4'],answer:'3'};
    return {...common,title:'Unicorn Reading Meadow — Sound Quest',instruction:'Which word starts with /m/?',spoken:'Which word starts with the m sound?',choices:['moon','sun','fish'],answer:'moon',phoneme:'m'};
  }
  if(skill.domain==='math'){
    if(skill.id==='math.compose_to_10')return {...common,title:'Royal Math Quest — Make 7',instruction:'Which two parts make 7?',spoken:'Which two numbers make seven?',choices:['3 + 4','2 + 3','5 + 1'],answer:'3 + 4'};
    if(skill.id==='math.addition')return {...common,title:'Royal Math Quest — Gem Addition',instruction:'2 gems + 3 gems = ?',spoken:'Two gems plus three gems. How many altogether?',choices:['4','5','6'],answer:'5'};
    if(skill.id==='math.subtraction')return {...common,title:'Royal Math Quest — Gem Take-Away',instruction:'5 gems − 2 gems = ?',spoken:'You have five gems. Two roll away. How many are left?',choices:['2','3','4'],answer:'3'};
    if(skill.id==='math.number_bonds'||skill.id==='math.missing_parts')return {...common,title:'Royal Math Quest — Missing Jewel',instruction:'4 + ? = 8',spoken:'Four plus what makes eight?',choices:['2','3','4'],answer:'4'};
    if(skill.id==='math.geometry')return {...common,title:'Royal Math Quest — Shape Castle',instruction:'Which shape has 3 sides?',spoken:'Which shape has three sides?',choices:['Triangle','Square','Circle'],answer:'Triangle'};
    if(skill.id==='math.measurement')return {...common,title:'Royal Math Quest — Measure the Magic',instruction:'Which is longer?',spoken:'A ribbon is nine blocks long. Another is six. Which is longer?',choices:['9 blocks','6 blocks','Same'],answer:'9 blocks'};
    if(skill.id==='math.place_value')return {...common,title:'Royal Math Quest — Tens & Ones',instruction:'14 has how many tens?',spoken:'Fourteen has how many tens?',choices:['1','4','14'],answer:'1'};
    return {...common,title:'Royal Math Quest — Number Magic',instruction:'Which group has more?',spoken:'Which is more, eight gems or five gems?',choices:['8 gems','5 gems','Same'],answer:'8 gems'};
  }
  if(skill.domain==='logic'){
    if(skill.id==='logic.patterns')return {...common,title:'Ice Princess Pattern Play — What Comes Next?',instruction:'❄️ ⭐ ❄️ ⭐ ?',spoken:'Snowflake, star, snowflake, star. What comes next?',choices:['❄️','⭐','🌙'],answer:'❄️'};
    if(skill.id==='logic.sequence'||skill.id==='logic.coding')return {...common,title:'Ice Princess Palace — Put It in Order',instruction:'What comes first?',spoken:'To build a snow friend, what should happen first?',choices:['Roll the snow','Add the scarf','Wave goodbye'],answer:'Roll the snow'};
    if(skill.id==='logic.deduction')return {...common,title:'Ice Princess Palace — Mystery Clue',instruction:'All birds have wings. Pip is a bird. Pip has…',spoken:'All birds have wings. Pip is a bird. What must Pip have?',choices:['Wings','Fins','Wheels'],answer:'Wings'};
    return {...common,title:'Ice Princess Palace — Sort the Magic',instruction:'Which does not belong?',spoken:'Which one does not belong with the others?',choices:['mittens','coat','banana'],answer:'banana'};
  }
  if(skill.domain==='science'){
    if(skill.id==='science.habitats')return {...common,title:'Mermaid Lagoon — Habitat Match',instruction:'Where does a fish live?',spoken:'Where does a fish live?',choices:['Ocean','Desert','Tree'],answer:'Ocean'};
    if(skill.id==='science.float_sink')return {...common,title:'Mermaid Science Lab — Float or Sink',instruction:'What will a leaf usually do?',spoken:'Predict first. Will a dry leaf usually float or sink?',choices:['Float','Sink','Disappear'],answer:'Float'};
    if(skill.id==='science.weather')return {...common,title:'Mermaid Lagoon — Weather Watch',instruction:'Which weather needs an umbrella?',spoken:'Which weather usually needs an umbrella?',choices:['Rain','Sun','Snowman'],answer:'Rain'};
    if(skill.id==='science.plants')return {...common,title:'Mermaid Lagoon — Growing Garden',instruction:'What helps a plant grow?',spoken:'What helps a plant grow?',choices:['Water and light','A toy car','A pillow'],answer:'Water and light'};
    if(skill.id==='science.magnets')return {...common,title:'Mermaid Science Lab — Magnet Magic',instruction:'What can a magnet pull?',spoken:'Which thing can a magnet pull?',choices:['Metal paper clip','Wood block','Cotton ball'],answer:'Metal paper clip'};
    if(skill.id==='science.space')return {...common,title:'Mermaid Lagoon — Sky Explorer',instruction:'What do we often see at night?',spoken:'What do we often see in the night sky?',choices:['Moon','Rainbow every night','Lunchbox'],answer:'Moon'};
    return {...common,title:'Mermaid Science Lab — Observe Closely',instruction:'Which is a living thing?',spoken:'Which one is a living thing?',choices:['Tree','Rock','Cup'],answer:'Tree'};
  }
  if(skill.domain==='language'){
    if(skill.id==='language.sequence')return {...common,title:'Forest Story Adventure — What Happens Next?',instruction:'First wash. Then dry. What comes after washing?',spoken:'First we wash our hands. Then what comes next?',choices:['Dry them','Put on shoes','Go to sleep'],answer:'Dry them'};
    if(skill.id==='language.retell')return {...common,title:'Forest Story Adventure — Retell the Tale',instruction:'What happened last?',spoken:'A bunny found a seed, planted it, and a flower grew. What happened last?',choices:['A flower grew','It found a seed','It planted the seed'],answer:'A flower grew'};
    if(skill.id==='language.prediction')return {...common,title:'Forest Story Adventure — Predict the Ending',instruction:'Clouds are dark. What may happen?',spoken:'The clouds are dark and windy. What might happen next?',choices:['It may rain','The moon turns green','A fish drives'],answer:'It may rain'};
    if(skill.id==='language.inference')return {...common,title:'Forest Story Adventure — Feelings Detective',instruction:'Lina dropped her ice cream and frowned. She feels…',spoken:'Lina dropped her ice cream and frowned. How does she probably feel?',choices:['Sad','Excited','Sleepy'],answer:'Sad'};
    if(skill.id==='language.vocabulary')return {...common,title:'Forest Story Adventure — Word Treasure',instruction:'“Tiny” means…',spoken:'What does tiny mean?',choices:['Very small','Very loud','Very fast'],answer:'Very small'};
    return {...common,title:'Forest Story Adventure — Listen & Think',instruction:'Who helped the bird?',spoken:'A little deer saw a bird with a hurt wing. The deer brought a leaf for shade. Who helped the bird?',choices:['The deer','The cloud','The boat'],answer:'The deer'};
  }
  if(skill.domain==='writing'){
    if(skill.id==='writing.cvc_words')return {...common,title:'Pixie Writing Garden — Build the Word',instruction:'Build “map”.',spoken:'Build the word map.',interaction:'builder',tokens:['m','a','p','s','t'],answer:'map'};
    if(skill.id==='writing.labels')return {...common,title:'Pixie Writing Garden — Label the Picture',instruction:'Which word labels the sun?',spoken:'Which word labels a picture of the sun?',choices:['sun','sit','map'],answer:'sun'};
    if(skill.id==='writing.sentence')return {...common,title:'Pixie Writing Garden — Build a Sentence',instruction:'Choose the complete sentence.',spoken:'Choose the complete sentence.',choices:['I see a cat.','cat see','the'],answer:'I see a cat.'};
    if(skill.id==='writing.story')return {...common,title:'Pixie Writing Garden — Story Creator',instruction:'Pick a strong beginning.',spoken:'Choose a beginning for a little story.',choices:['One morning, a tiny unicorn found a glowing key.','blue','and'],answer:'One morning, a tiny unicorn found a glowing key.'};
    return {...common,title:'Pixie Writing Garden — Letter Trail',instruction:'Which letter makes /s/?',spoken:'Which letter makes the s sound?',choices:['s','m','t'],answer:'s',phoneme:'s'};
  }
  return {...common,title:skill.title,instruction:'Choose the best answer.',spoken:'Choose the best answer.',choices:['Yes','No'],answer:'Yes'};
}

let currentActivity=null,builderValue='',activityStartedAt=0,attemptsThisActivity=0,hintsThisActivity=0;

function setView(name){
  $$('.view').forEach(v=>v.classList.toggle('active',v.dataset.view===name));
  $$('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));
  document.body.dataset.view=name;window.scrollTo({top:0,behavior:'instant'});
  if(name==='home')renderHome();
  if(name==='adventure')renderAdventure();
  if(name==='rewards')renderRewards();
  if(name==='parents')renderParents();
}
function renderChrome(){
  $('#starsCount').textContent=state.rewards.MAGIC_STAR||0;
  $('#gemsCount').textContent=state.rewards.UNICORN_GEM||0;
  const sync=$('#syncBadge');if(sync)sync.textContent=state.cloud.connected?'☁️ Cloud connected':'💻 This device';
}
function themeCard(domain){
  const t=THEMES[domain],skill=currentSkill(domain),p=progressFor(skill.id);
  return `<button class="kingdom-card" data-open-domain="${domain}" style="--atlas-pos:${t.atlas}">
    <div class="kingdom-art atlas-art"></div>
    <div class="kingdom-copy"><span class="kingdom-icon">${t.icon}</span><b>${esc(t.world)}</b><small>${esc(t.label)}</small>
    <em>${esc(skill.title)} · ${prettyMastery(p.mastery)}</em></div><span class="card-arrow">›</span></button>`;
}
function prettyMastery(m){return String(m||'NOT_INTRODUCED').toLowerCase().replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
function renderHome(){
  const plan=buildPlan();
  const primary=plan.items[0],next=plan.items[1];
  $('#homeHeroArt').innerHTML=`<img src="./assets/magic/reading-unicorn.svg" alt="Sakhi unicorn in a magical rainbow world">`;
  $('#homeGoal').textContent=`Today: ${primary.skillTitle}`;
  $('#homeWhy').textContent=`Sakhi starts with ${primary.theme.label.toLowerCase()} because it is the next useful step in her current learning path.`;
  $('#homeKingdoms').innerHTML=Object.keys(THEMES).map(themeCard).join('');
  $('#homeNext').textContent=`Next after reading: ${next.skillTitle}`;
}
function renderAdventure(){
  const plan=buildPlan();
  $('#trail').innerHTML=plan.items.map((a,i)=>`<button class="trail-stop ${i<state.currentIndex?'done':''} ${i===state.currentIndex?'current':''}" data-plan-index="${i}">
    <span>${i<state.currentIndex?'✓':a.theme.icon}</span><div><b>${esc(a.theme.world)}</b><small>${esc(a.skillTitle)}</small></div><em>${i+1}</em>
  </button>`).join('');
  $('#adventureIntro').innerHTML=`<b>Today’s Magical Trail</b><span>${plan.items.map(x=>x.theme.label.split(' & ')[0]).join(' → ')} → Rewards</span>`;
}
async function startAdventure(index=0){
  await unlockAudio();
  buildPlan();
  state.currentIndex=clamp(index,0,state.currentPlan.items.length-1);
  if(!state.currentSession||state.currentSession.date!==today()){
    state.currentSession={id:uid(),date:today(),startedAt:Date.now(),completed:0,activityIds:[]};
    if(state.cloud.connected&&state.cloud.learnerId)await startCloudSession();
  }
  save();openActivity(state.currentIndex);
}
async function startCloudSession(){
  if(!sb||!state.cloud.learnerId||!state.currentSession)return;
  try{
    const {data,error}=await sb.rpc('start_learning_session',{
      p_learner_id:state.cloud.learnerId,p_session_id:state.currentSession.id,p_planned_duration:Number(state.settings.sessionLength)||20,
      p_theme_id:'sakhi-unicorn',p_curriculum_version:CURRICULUM_VERSION
    });
    if(error)throw error;state.currentSession.id=data.session_id;
  }catch(err){console.warn('start session',err)}
}
function applyTheme(domain){
  const t=THEMES[domain];
  document.documentElement.style.setProperty('--theme-a',t.palette[0]);
  document.documentElement.style.setProperty('--theme-b',t.palette[1]);
  document.documentElement.style.setProperty('--theme-c',t.palette[2]);
  document.documentElement.style.setProperty('--theme-accent',t.palette[3]);
  document.body.dataset.theme=domain;
}
function openActivity(index){
  const plan=buildPlan();const a=plan.items[index];if(!a)return showRewardsAfterSession();
  currentActivity=a;builderValue='';attemptsThisActivity=0;hintsThisActivity=0;activityStartedAt=performance.now();
  state.currentIndex=index;save();applyTheme(a.domain);setView('activity');
  $('#activityWorld').textContent=a.theme.world;
  $('#activityType').textContent=`${a.theme.label} · ${a.skillTitle}`;
  $('#activityTitle').textContent=a.title;
  $('#activityInstruction').textContent=a.instruction;
  $('#activityGuide').src=a.theme.image;$('#activityGuide').alt=a.theme.guide;
  $('#activityProgress').textContent=`${index+1} of ${plan.items.length}`;
  $('#activityBack').hidden=true;
  renderInteraction(a);
  prefetchSpeech(a.spoken);
  const next=plan.items[index+1];if(next)prefetchSpeech(next.spoken);
  setTimeout(()=>speak(a.spoken),150);
}
function renderInteraction(a){
  const host=$('#interactionArea');
  const story=a.story?`<div class="story-strip">${esc(a.story)}</div>`:'';
  if(a.interaction==='builder'){
    host.innerHTML=`${story}<div class="builder-answer" id="builderAnswer" aria-live="polite">_ _ _</div>
      <div class="token-row">${a.tokens.map(x=>`<button class="token" data-token="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <div class="builder-actions"><button class="soft-btn" id="builderReset">Start over</button><button class="magic-btn" id="builderCheck">Check word</button></div>`;
    $$('.token',host).forEach(b=>b.onclick=()=>{builderValue+=b.dataset.token;$('#builderAnswer').textContent=builderValue.split('').join(' ');attemptsThisActivity++});
    $('#builderReset').onclick=()=>{builderValue='';$('#builderAnswer').textContent='_ _ _'};
    $('#builderCheck').onclick=()=>submitAnswer(builderValue);
  }else{
    host.innerHTML=`${story}<div class="choice-grid">${a.choices.map(c=>`<button class="choice-card" data-answer="${esc(c)}">${esc(c)}</button>`).join('')}</div>`;
    $$('.choice-card',host).forEach(b=>b.onclick=()=>submitAnswer(b.dataset.answer,b));
  }
  $('#hearAgain').onclick=()=>speak(a.spoken);
  $('#hintBtn').onclick=()=>{hintsThisActivity++;showToast(hintFor(a));speak(hintFor(a),'feedback')};
  $('#phonemeBtn').hidden=!a.phoneme;if(a.phoneme)$('#phonemeBtn').onclick=()=>speakPhoneme(a.phoneme);
}
function hintFor(a){
  if(a.domain==='reading')return 'Touch or say each sound slowly, then blend it together.';
  if(a.domain==='math')return 'Use the parts you know. You can count or make the number with your fingers.';
  if(a.domain==='logic')return 'Look for the rule that repeats or the clue that must be true.';
  if(a.domain==='science')return 'Think about what you have seen happen in real life.';
  if(a.domain==='language')return 'Think about what happened first and what the clues tell you.';
  return 'Say the word slowly and listen for each sound.';
}
async function submitAnswer(answer,button){
  attemptsThisActivity++;
  const correct=String(answer)===String(currentActivity.answer);
  if(button){button.classList.add(correct?'correct':'wrong');setTimeout(()=>button.classList.remove('wrong'),500)}
  if(!correct){
    showToast('💛 Good try! Use the hint and try again.');speak('Good try. Look closely and try once more.','feedback');return;
  }
  $$('.choice-card').forEach(b=>b.disabled=true);
  await finishActivity(true);
}
function updateLocalMastery(a,correct=true){
  const p=progressFor(a.skillId),attempts=(p.attempts||0)+1,good=(p.correct||0)+(correct?1:0);
  const ratio=good/attempts;let mastery='LEARNING';
  if(attempts>=6&&ratio>=.9)mastery='MASTERED';
  else if(attempts>=4&&ratio>=.8)mastery='MOSTLY_MASTERED';
  else if(attempts>=2&&ratio>=.65)mastery='DEVELOPING';
  state.progress[a.skillId]={mastery,attempts,correct:good,score:ratio,last:new Date().toISOString()};
}
async function finishActivity(correct){
  const a=currentActivity,responseMs=Math.round(performance.now()-activityStartedAt);
  updateLocalMastery(a,correct);
  state.rewards.MAGIC_STAR=(state.rewards.MAGIC_STAR||0)+1;
  state.attempts.push({id:uid(),date:today(),activityId:a.id,skillId:a.skillId,domain:a.domain,correct,hints:hintsThisActivity,attempts:attemptsThisActivity,responseMs});
  state.attempts=state.attempts.slice(-500);
  if(state.currentSession){
    if(!state.currentSession.activityIds.includes(a.id)){state.currentSession.activityIds.push(a.id);state.currentSession.completed=state.currentSession.activityIds.length}
  }
  save();
  if(state.cloud.connected&&state.cloud.learnerId)await saveCloudActivity(a,responseMs);
  showCompletion(a);
}
async function saveCloudActivity(a,responseMs){
  if(!sb||!state.currentSession)return;
  const attemptId=uid(),key=`${state.cloud.learnerId}:${state.currentSession.id}:${a.id}`;
  try{
    const {data,error}=await sb.rpc('complete_learning_activity_v2',{
      p_attempt_id:attemptId,p_learner_id:state.cloud.learnerId,p_session_id:state.currentSession.id,
      p_activity_id:a.id,p_domain:a.domain,p_skill_id:a.skillId,p_interaction_type:a.interaction,
      p_difficulty:a.difficulty,p_result:'CORRECT',p_hint_level:hintsThisActivity,p_attempts:Math.max(1,attemptsThisActivity),
      p_response_time_ms:responseMs,p_reward_type:'MAGIC_STAR',p_reward_amount:1,p_idempotency_key:key,p_curriculum_version:CURRICULUM_VERSION
    });
    if(error)throw error;
    if(data?.mastery_state)state.progress[a.skillId]={...progressFor(a.skillId),mastery:data.mastery_state,score:Number(data.mastery_score||0)};
    save();
  }catch(err){console.warn('Cloud activity save queued locally',err);showToast('☁️ Saved on this device; cloud will retry next time.')}
}
function showCompletion(a){
  $('#completionTitle').textContent='✨ Beautiful work!';
  $('#completionText').textContent=`You completed ${a.skillTitle} and earned a Magic Star.`;
  $('#completionOverlay').classList.add('show');
  speak(`Beautiful work! You finished ${a.skillTitle}.`,'feedback');
  $('#nextActivity').onclick=()=>{ $('#completionOverlay').classList.remove('show'); const next=state.currentIndex+1; if(next<state.currentPlan.items.length)openActivity(next); else showRewardsAfterSession(); };
  if(state.settings.autoAdvance)setTimeout(()=>$('#nextActivity')?.click(),1800);
}
async function showRewardsAfterSession(){
  stopAudio();
  if(state.currentSession){
    state.rewards.UNICORN_GEM=(state.rewards.UNICORN_GEM||0)+1;
    const summary=state.currentPlan.items.map(x=>x.skillTitle);
    state.sessions.push({id:state.currentSession.id,date:today(),completed:state.currentSession.completed,skills:summary,endedAt:new Date().toISOString()});
    state.sessions=state.sessions.slice(-100);
    if(state.cloud.connected&&state.cloud.learnerId&&sb){
      try{
        await sb.rpc('award_session_reward_v2',{p_learner_id:state.cloud.learnerId,p_session_id:state.currentSession.id,p_activity_id:'daily_adventure'});
        await sb.rpc('complete_learning_session',{p_learner_id:state.cloud.learnerId,p_session_id:state.currentSession.id});
      }catch(err){console.warn('complete cloud session',err)}
    }
    state.currentSession=null;state.currentIndex=0;save();
  }
  setView('rewards');renderRewards(true);speak('You completed today’s magical adventure! Look at everything you earned.','feedback');
}
function renderRewards(completed=false){
  $('#rewardStars').textContent=state.rewards.MAGIC_STAR||0;
  $('#rewardGems').textContent=state.rewards.UNICORN_GEM||0;
  $('#rewardHearts').textContent=state.rewards.COURAGE_HEART||0;
  const recent=state.currentPlan?.items||[];
  $('#rewardSummary').innerHTML=completed
   ? `<h2>🌈 Adventure complete!</h2><p>You practiced ${recent.map(x=>esc(x.theme.label.split(' & ')[0])).join(', ')}.</p>`
   : `<h2>Your Magic Collection</h2><p>Every star represents real learning and effort.</p>`;
  $('#bedtimeBtn').hidden=!state.settings.bedtimeStory;
}
function bedtimeStory(){
  const items=state.currentPlan?.items||[];
  const learned=items.map(x=>x.skillTitle);
  return `Once upon a quiet evening, Princess Mira and Luna the Unicorn followed a silver trail through the Rainbow Meadow.\n\nThey carried four tiny clues from the day: ${learned.slice(0,4).join(', ')}.\n\nAt the Royal Castle, Mira used careful thinking to solve a number riddle, and Luna listened closely to the sounds in a secret word.\n\nNext they crossed the Ice Princess bridge, where every snowflake followed a pattern. “Slow eyes and a brave try,” whispered Snowbell, “can solve a tricky puzzle.”\n\nFar below, Coral the Mermaid waved from Mermaid Lagoon. Together they observed the water, made a prediction, and checked what really happened.\n\nWhen the moon rose, the friends returned to the meadow. They did not need to know everything at once. They had learned a little more, helped one another, and kept going when something was hard.\n\nLuna curled beside Mira beneath a rainbow-colored blanket. “Tomorrow has more magic,” she whispered.\n\nThe stars blinked softly above them, and the whole kingdom grew quiet. Good night, little learner.`;
}
function openBedtime(){
  setView('story');const text=bedtimeStory();$('#storyText').textContent=text;$('#storyTitle').textContent='🌙 Tonight’s Sakhi Story';
  $('#readStory').onclick=()=>speak(text,'story');$('#stopStory').onclick=stopAudio;
}

function renderParents(){
  const plan=buildPlan();const first=plan.items[0];
  $('#parentSync').textContent=state.cloud.connected?`Cloud connected${state.cloud.email?' · '+state.cloud.email:''}`:'This device only — connect cloud to keep history across devices.';
  $('#todayGoal').textContent=first.skillTitle;
  $('#whyToday').textContent=`This is the first not-yet-mastered skill in the current ${THEMES[first.domain].label.toLowerCase()} path. Foundational skills are compressed instead of repeated once mastered.`;
  $('#whatNext').textContent=plan.items[1]?.skillTitle||'Adaptive review';
  const domainRows=Object.keys(PATHS).map(domain=>{
    const skill=currentSkill(domain),p=progressFor(skill.id),idx=PATHS[domain].findIndex(x=>x[0]===skill.id);
    return `<div class="parent-domain"><span>${THEMES[domain].icon}</span><div><b>${esc(THEMES[domain].label)}</b><small>Current: ${esc(skill.title)}</small><em>${prettyMastery(p.mastery)} · Step ${idx+1}/${PATHS[domain].length}</em></div></div>`;
  }).join('');
  $('#domainProgress').innerHTML=domainRows;
  const rec=[...state.attempts].slice(-12).reverse();
  $('#historyList').innerHTML=rec.length?rec.map(a=>`<li><b>${esc(SKILLS[a.skillId]?.title||a.skillId)}</b><span>${a.correct?'Independent success':'Practice'}${a.hints?' · hint used':''}</span></li>`).join(''):'<li>No recorded activities yet.</li>';
  $('#parentSettings').innerHTML=`<label>Session length <select id="sessionLength"><option>15</option><option>20</option><option>25</option></select> min</label>
    <label><input type="checkbox" id="audioSetting" ${state.settings.audio?'checked':''}> Sakhi voice</label>
    <label><input type="checkbox" id="advanceSetting" ${state.settings.autoAdvance?'checked':''}> Move to the next activity automatically</label>
    <label><input type="checkbox" id="storySetting" ${state.settings.bedtimeStory?'checked':''}> Offer bedtime story after rewards</label>
    <button class="soft-btn" id="soundTest">🔊 Test Sakhi sound</button>
    <small>Build ${BUILD}</small>`;
  $('#sessionLength').value=String(state.settings.sessionLength);
  $('#sessionLength').onchange=e=>{state.settings.sessionLength=Number(e.target.value);save()};
  $('#audioSetting').onchange=e=>{state.settings.audio=e.target.checked;save()};
  $('#advanceSetting').onchange=e=>{state.settings.autoAdvance=e.target.checked;save()};
  $('#storySetting').onchange=e=>{state.settings.bedtimeStory=e.target.checked;save()};
  $('#soundTest').onclick=async()=>{await unlockAudio();speak("Hi! I'm Sakhi. Ready for a magical learning adventure?")};
}

function showParentGate(){
  const pass=prompt('Parents only — enter passcode');
  if(pass!==PARENT_PASS)return showToast('Incorrect parent passcode.');
  setView('parents');
}
function showToast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>t.classList.remove('show'),2600)}

function bind(){
  $$('[data-nav]').forEach(b=>b.onclick=e=>{e.preventDefault();b.dataset.nav==='parents'?showParentGate():setView(b.dataset.nav)});
  $('#startToday').onclick=()=>startAdventure(0);
  $('#startTrail').onclick=()=>startAdventure(state.currentIndex||0);
  $('#newPlan').onclick=()=>{state.currentPlan=null;buildPlan(true);renderAdventure();showToast('✨ Sakhi made a fresh balanced plan.')};
  $('#activityHome').onclick=()=>setView('home');
  $('#rewardHome').onclick=()=>setView('home');
  $('#bedtimeBtn').onclick=openBedtime;
  $('#storyHome').onclick=()=>setView('home');
  $('#completionClose').onclick=()=>$('#completionOverlay').classList.remove('show');
  document.addEventListener('click',e=>{
    const k=e.target.closest('[data-open-domain]');if(k){
      const domain=k.dataset.openDomain,skill=currentSkill(domain);state.currentPlan={id:`practice-${Date.now()}`,date:today(),items:[{...makeActivity(skill,0),domain,theme:THEMES[domain],order:1}],createdAt:new Date().toISOString()};state.currentIndex=0;save();startAdventure(0);
    }
    const stop=e.target.closest('[data-plan-index]');if(stop)startAdventure(Number(stop.dataset.planIndex));
  });
}
function setupUpdate(){
  if(!('serviceWorker'in navigator))return;
  let reloading=false;
  navigator.serviceWorker.register('./sw.js?v=20260909v30').then(reg=>{
    reg.update().catch(()=>{});
    if(reg.waiting)showUpdate(reg);
    reg.addEventListener('updatefound',()=>{const w=reg.installing;w?.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)showUpdate(reg)})});
  }).catch(console.warn);
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)return;reloading=true;location.reload()});
}
function showUpdate(reg){
  const b=$('#updateBanner');b.classList.add('show');
  $('#updateNow').onclick=()=>reg.waiting?.postMessage({type:'SKIP_WAITING'});
  $('#updateLater').onclick=()=>b.classList.remove('show');
}
async function boot(){
  bind();renderChrome();buildPlan();renderHome();renderAdventure();renderRewards();setView('home');setupUpdate();
  await initCloud();renderChrome();renderHome();
}
document.addEventListener('DOMContentLoaded',boot);
})();