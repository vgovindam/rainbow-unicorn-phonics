const fs=require('fs');
const vm=require('vm');
const source=fs.readFileSync('interaction-engine.js','utf8');
const activityStore=[];
const context={
  console,
  activities:activityStore,
  themes:{unicorn:{art:'🦄',title:'Rainbow Unicorn Kingdom'},dragon:{art:'🐉',title:'Dragon Rescue'}},
  data:{theme:'unicorn',interactionEvidence:[],shinyStars:0,quest:[],questResults:{},questHistory:[],skills:{},rewards:{}},
  persist:()=>{},setTheme:()=>{},renderDomains:()=>{},ensureQuest:()=>{},updateStats:()=>{},
  openDomain:()=>{},go:()=>{},domainById:()=>({title:'Domain'}),activitiesFor:()=>[],getStatus:()=> 'Not Introduced',
  slug:s=>s,esc:s=>String(s),todayKey:()=> '2026-01-01',recordEvidence:()=>{},
  document:{getElementById:()=>null,querySelectorAll:()=>[]},window:{},localStorage:{},CSS:{escape:s=>s},
  setTimeout:()=>{},clearTimeout:()=>{},Date,Math,JSON,Object,Array,Set,Map,String,Number,Boolean
};
vm.createContext(context);
vm.runInContext(source,context,{filename:'interaction-engine.js'});

const allowed=new Set(['tap_choice','multi_select','drag_drop','sort','match','memory','sequence','word_builder','number_manipulative','pattern_builder','find_it','trace','story_choice','movement','offline_activity']);
const required=['interaction_type','instruction_text','spoken_instruction','character_prompt','items','targets','correct_answer','distractors','hint_1','hint_2','hint_3','success_feedback','retry_feedback','mastery_signal','difficulty','estimated_minutes'];
if(activityStore.length<12)throw new Error(`Expected a substantial activity library; found ${activityStore.length}`);
for(const a of activityStore){
  if(!allowed.has(a.interaction_type))throw new Error(`${a.id}: invalid interaction_type ${a.interaction_type}`);
  for(const k of required){if(a[k]===undefined||a[k]===null)throw new Error(`${a.id}: missing ${k}`)}
  if(!Array.isArray(a.items)||!Array.isArray(a.targets)||!Array.isArray(a.distractors))throw new Error(`${a.id}: items/targets/distractors must be arrays`);
  if(!['movement','offline_activity'].includes(a.interaction_type)&&a.items.length===0)throw new Error(`${a.id}: child activity has no interactive items`);
  if(a.difficulty<1||a.difficulty>5)throw new Error(`${a.id}: difficulty outside 1–5`);
  if(a.estimated_minutes<=0)throw new Error(`${a.id}: invalid duration`);
  if(/dragon/i.test(`${a.title} ${a.character_prompt} ${a.character||''}`))throw new Error(`${a.id}: dragon content is not allowed`);
}
const formats=new Set(activityStore.map(a=>a.interaction_type));
if(formats.size<10)throw new Error(`Interaction variety too low: ${[...formats].join(', ')}`);
if('dragon' in context.themes)throw new Error('Dragon theme was not removed at runtime');
console.log(`Validated ${activityStore.length} activities across ${formats.size} interaction formats.`);
