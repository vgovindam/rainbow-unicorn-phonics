// Spaced-review and mastery refinements loaded after app.js.
function reviewIntervalDays(status){return {'Introduced':0,'Learning':1,'Developing':3,'Mostly Mastered':7,'Mastered':21,'Review Needed':0}[status] ?? null}
function dateDaysAgo(date){if(!date)return Infinity;const then=new Date(date+'T12:00:00');const now=new Date();return Math.floor((now-then)/86400000)}
function isActivityDue(a){const k=skillKey(a.domain,a.skill),arr=data.evidence[k]||[];if(!arr.length)return false;const interval=reviewIntervalDays(getStatus(a.domain,a.skill));return interval!=null&&dateDaysAgo(arr[arr.length-1].date)>=interval}
function chooseActivity(domain,offset=0){
  const list=activitiesFor(domain);if(!list.length)return null;
  const due=list.filter(isActivityDue).sort((a,b)=>{const aa=data.evidence[skillKey(a.domain,a.skill)]||[],bb=data.evidence[skillKey(b.domain,b.skill)]||[];return (aa.at(-1)?.date||'').localeCompare(bb.at(-1)?.date||'')});
  if(due.length)return due[offset%due.length];
  const review=list.find(a=>getStatus(a.domain,a.skill)==='Review Needed');if(review)return review;
  const unmastered=list.filter(a=>getStatus(a.domain,a.skill)!=='Mastered');
  const pool=unmastered.length?unmastered:list;
  const completed=Object.keys(data.evidence).reduce((n,k)=>n+(k.startsWith(domain+'::')?(data.evidence[k]||[]).length:0),0);
  return pool[(completed+offset)%pool.length];
}
function deriveStatus(current,arr){
  if(!arr.length)return 'Not Introduced';
  const recent=arr.slice(-7),avg=recent.reduce((n,x)=>n+x.score,0)/recent.length;
  const dates=new Set(recent.map(x=>x.date)).size,formats=new Set(recent.map(x=>x.activityId)).size;
  if(current==='Mastered'&&recent.slice(-2).some(x=>x.score<.5))return 'Review Needed';
  if(recent.length>=5&&dates>=2&&avg>=.85&&(formats>=2||recent.length>=6))return 'Mastered';
  if(recent.length>=4&&avg>=.8)return 'Mostly Mastered';
  if(recent.length>=3&&avg>=.7)return 'Developing';
  if(recent.length>=2&&avg>=.55)return 'Learning';
  return 'Introduced';
}
// Add format variety for foundational reading and math so mastery can be shown across different task types.
activities.push(
{id:'read-blend-toy',domain:'reading',skill:'Oral blending',icon:'🚂',title:'Sound Train Blend',minutes:4,type:'coach',objective:'Blend 2–3 spoken phonemes using movement across sound stations.',reason:'A second activity format checks whether blending transfers beyond multiple-choice tapping.',prompt:'Place 3 blocks in a row. Move a toy along them while saying /s/ /a/ /t/, then ask: “What word did the train make?”',success:'Blends 3 of 4 examples with little prompting.',materials:'3 blocks + small toy.',parent:'Keep sounds connected and avoid adding “uh.”',extension:'Let her move the toy and lead the sounds.'},
{id:'math-compose-picture',domain:'math',skill:'Number composition',icon:'🌟',title:'Split the Star Number',minutes:4,type:'coach',objective:'Show one number as two parts using a drawing or objects.',reason:'Changing representation checks whether number-part understanding transfers beyond one manipulative setup.',prompt:'Draw 5 stars. Circle some in one group and the rest in another. How many and how many make 5?',success:'Finds 3 valid part-part-whole combinations for 5.',materials:'Paper + crayon or 5 counters.',parent:'Ask her to explain the two parts aloud.',extension:'Repeat with 6.'}
);
// Rebuild today's quest after scheduler loads only when there is no progress yet, so a started session is never changed underneath the child.
if(data.quest&&Object.keys(data.questResults||{}).length===0){makeQuest()}
