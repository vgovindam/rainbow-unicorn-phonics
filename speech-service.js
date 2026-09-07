(function(){
'use strict';
const cache=new Map();
let current=null,lastText='';
const profiles={
  sakhi:{rate:.86,pitch:1.06},
  ice:{rate:.82,pitch:1.02},
  ocean:{rate:.88,pitch:1.08},
  book:{rate:.80,pitch:1.0},
  luna:{rate:.9,pitch:1.1}
};
const phonemeFallback={
  m:'mmmm',s:'ssss',f:'ffff',n:'nnnn',l:'llll',r:'rrrr',
  t:'t',p:'p',k:'k',b:'b',d:'d',g:'g',
  a:'aaa, as in apple',i:'ih, as in insect',o:'ah, as in octopus',e:'eh, as in egg',u:'uh, as in umbrella'
};
function stopSpeech(){try{speechSynthesis.cancel();}catch(_){} if(current instanceof Audio){try{current.pause();current.currentTime=0;}catch(_){}} current=null;}
function browserSpeak(text,profile='sakhi'){
  if(!text||!('speechSynthesis' in window))return Promise.resolve(false);
  stopSpeech();lastText=text;
  return new Promise(resolve=>{
    const u=new SpeechSynthesisUtterance(text),p=profiles[profile]||profiles.sakhi;
    u.lang='en-US';u.rate=p.rate;u.pitch=p.pitch;u.volume=1;
    const voices=speechSynthesis.getVoices();
    const preferred=voices.find(v=>/samantha|ava|allison|victoria|serena|karen|female/i.test(v.name)&&/^en/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang));
    if(preferred)u.voice=preferred;
    u.onend=()=>{current=null;resolve(true)};u.onerror=()=>{current=null;resolve(false)};
    current=u;speechSynthesis.speak(u);
  });
}
function getStoredAccessToken(){
  try{
    const cfg=window.RAINBOW_CONFIG||{};
    const ref=(cfg.supabaseUrl||'').match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1];
    if(!ref)return '';
    const raw=localStorage.getItem(`sb-${ref}-auth-token`);
    if(!raw)return '';
    const parsed=JSON.parse(raw);
    return parsed?.access_token||parsed?.currentSession?.access_token||'';
  }catch(_){return '';}
}
async function fetchNeural(text,kind,profile){
  const cfg=window.RAINBOW_CONFIG||{};
  if(!cfg.ttsEndpoint)return null;
  const token=getStoredAccessToken();
  if(!token)return null;
  const key=`${profile}|${kind}|${text}`;if(cache.has(key))return cache.get(key);
  const r=await fetch(cfg.ttsEndpoint,{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${token}`,'apikey':cfg.supabaseAnonKey||''},body:JSON.stringify({text,kind,profile})});
  if(!r.ok)throw new Error(`TTS service unavailable (${r.status})`);
  const blob=await r.blob(),url=URL.createObjectURL(blob);cache.set(key,url);return url;
}
async function speak(text,{kind='instruction',profile='sakhi'}={}){
  stopSpeech();lastText=text;
  try{
    const url=await fetchNeural(text,kind,profile);
    if(url){const a=new Audio(url);current=a;await a.play();return true;}
  }catch(e){console.warn('Neural TTS fallback',e);}
  return browserSpeak(text,profile);
}
async function speakPhoneme(id){
  const clean=String(id||'').replace(/^phoneme_/,'');
  const assets=window.SAKHI_PHONEME_AUDIO||{};
  if(assets[id]||assets[clean]){
    stopSpeech();const a=new Audio(assets[id]||assets[clean]);current=a;await a.play();return true;
  }
  return speak(phonemeFallback[clean]||clean,{kind:'phoneme',profile:'sakhi'});
}
function repeatSpeech(){return lastText?speak(lastText):Promise.resolve(false);}
function pause(){if(current instanceof Audio)current.pause();else try{speechSynthesis.pause();}catch(_){}}
function resume(){if(current instanceof Audio)current.play();else try{speechSynthesis.resume();}catch(_){}}
window.SpeechService={
 speakInstruction:(t,p='sakhi')=>speak(t,{kind:'instruction',profile:p}),
 speakCharacter:(t,p='sakhi')=>speak(t,{kind:'character',profile:p}),
 speakPhoneme,
 speakWord:(t,p='sakhi')=>speak(t,{kind:'word',profile:p}),
 speakStory:(t,p='book')=>speak(t,{kind:'story',profile:p}),
 speakFeedback:(t,p='sakhi')=>speak(t,{kind:'feedback',profile:p}),
 stopSpeech,repeatSpeech,pause,resume,speak
};
})();
