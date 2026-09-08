const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const source = name => fs.readFileSync(path.join(root, name), 'utf8');

function storage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return { getItem:k=>values.get(k) ?? null, setItem:(k,v)=>values.set(k,String(v)), removeItem:k=>values.delete(k) };
}

function speechContext({ token = true, fallback = false, fetchImpl } = {}) {
  const events = [];
  const local = storage(token ? {'sb-okzmrlrijovbuatjcgqi-auth-token':JSON.stringify({access_token:'test-token'})} : {});
  let browserCalls = 0;
  class Audio { constructor(url){this.url=url;this.paused=false;} play(){return Promise.resolve();} pause(){this.paused=true;} }
  class Utterance {}
  const window = {
    RAINBOW_CONFIG:{supabaseUrl:'https://okzmrlrijovbuatjcgqi.supabase.co',supabaseAnonKey:'public',ttsEndpoint:'https://example.test/tts',ttsProvider:'elevenlabs',allowBrowserTtsFallback:fallback},
    SakhiEvents:{emit:(type,detail)=>events.push({type,detail})},
    speechSynthesis:{cancel(){},speak(u){browserCalls++;queueMicrotask(()=>u.onend?.());}},
    SpeechSynthesisUtterance:Utterance
  };
  Object.assign(window,{window,localStorage:local,Audio,fetch:fetchImpl||(()=>{throw new Error('unexpected fetch')}),URL:{createObjectURL:()=> 'blob:test'}});
  const context=vm.createContext({...window,window,localStorage:local,Audio,SpeechSynthesisUtterance:Utterance,AbortController,DOMException,URL:window.URL,Blob,fetch:window.fetch,setTimeout,clearTimeout,console});
  vm.runInContext(source('speech-service.js'),context);
  return {context,events,get browserCalls(){return browserCalls;}};
}

test('SpeechService uses authenticated neural audio without browser TTS', async () => {
  let requests=0;
  const h=speechContext({fetchImpl:async(url,options)=>{requests++;assert.match(options.headers.authorization,/Bearer test-token/);return {ok:true,headers:{get:()=> 'audio/mpeg'},blob:async()=>({size:10})};}});
  assert.equal(await h.context.window.SpeechService.speakInstruction('Hello'),true);
  assert.equal(requests,1);
  assert.equal(h.browserCalls,0);
  assert.ok(h.events.some(e=>e.type==='AUDIO_PROVIDER_USED'&&e.detail.provider==='elevenlabs'));
});

test('SpeechService does not silently use robotic fallback', async () => {
  const h=speechContext({token:false,fallback:false});
  assert.equal(await h.context.window.SpeechService.speakInstruction('Hello'),false);
  assert.equal(h.browserCalls,0);
  assert.ok(h.events.some(e=>e.type==='AUDIO_PROVIDER_FAILED'));
  assert.ok(h.events.some(e=>e.type==='NO_AUDIO_AVAILABLE'));
});

test('Browser TTS runs only when explicitly enabled', async () => {
  const h=speechContext({token:false,fallback:true});
  assert.equal(await h.context.window.SpeechService.speakInstruction('Hello'),true);
  assert.equal(h.browserCalls,1);
  assert.ok(h.events.some(e=>e.type==='FALLBACK_TTS_USED'));
});

test('Parent passcode is hashed and parent sessions expire', async () => {
  const session=storage();
  const document={readyState:'loading',addEventListener(){},getElementById(){return null},querySelector(){return null},querySelectorAll(){return []},body:{appendChild(){}}};
  const window={RAINBOW_CONFIG:{parentSessionMinutes:15},SakhiEvents:{emit(){}},go(){},sessionStorage:session,crypto:webcrypto,document};
  const context=vm.createContext({window,document,sessionStorage:session,crypto:webcrypto,TextEncoder,setTimeout,console,Date});
  vm.runInContext(source('sakhi-shell.js'),context);
  assert.equal(await window.SakhiParent.verifyPasscode('071621'),true);
  assert.equal(await window.SakhiParent.verifyPasscode('123456'),false);
  session.setItem('sakhiParentUnlocked','1');session.setItem('sakhiParentUnlockedAt',String(Date.now()-16*60000));
  assert.equal(window.SakhiParent.parentUnlocked(),false);
});

test('Curriculum gates advancement on prerequisites', () => {
  const window={};
  vm.runInNewContext(source('curriculum.js'),{window});
  const c=window.RainbowCurriculum;
  assert.equal(c.ready('reading.cvc_decode.short_a',{}),false);
  const states={'reading.letter_sounds':'MASTERED','reading.short_vowels':'MOSTLY_MASTERED','reading.oral_blending':'MASTERED'};
  assert.equal(c.ready('reading.cvc_decode.short_a',states),true);
  assert.ok(c.nextCandidates(states).some(x=>x.skill_id==='reading.cvc_decode.short_a'));
});

test('Mastery requires repeated evidence across days and formats', () => {
  const local=storage();
  const document={readyState:'loading',addEventListener(){},querySelectorAll(){return[]},getElementById(){return null},body:{dataset:{}}};
  const window={window:null,localStorage:local,document,RainbowPersistence:null};window.window=window;
  const context=vm.createContext({window,document,localStorage:local,navigator:{},console,Date,Math,JSON,Object,Array,Set,Map,String,Number,Boolean,clearTimeout,setTimeout});
  vm.runInContext(source('app.js'),context);
  const derive=window.SakhiMastery.deriveStatus;
  assert.equal(derive('Not Introduced',[{date:'2026-09-01',score:1,activityId:'one'}]),'Introduced');
  assert.notEqual(derive('Developing',Array.from({length:5},()=>({date:'2026-09-01',score:1,activityId:'one'}))),'Mastered');
  assert.equal(derive('Developing',[{date:'2026-09-01',score:1,activityId:'one'},{date:'2026-09-01',score:.9,activityId:'two'},{date:'2026-09-02',score:1,activityId:'one'},{date:'2026-09-02',score:.9,activityId:'two'},{date:'2026-09-03',score:1,activityId:'one'}]),'Mastered');
  assert.equal(derive('Mastered',[{date:'2026-09-03',score:.3,activityId:'one'},{date:'2026-09-04',score:.4,activityId:'two'}]),'Review Needed');
});

test('Persistence always records a pending snapshot before remote sync', () => {
  const local=storage();
  const window={RAINBOW_CONFIG:{},localStorage:local,crypto:webcrypto};
  const context=vm.createContext({window,localStorage:local,crypto:webcrypto,console,Date,Math,JSON,Object,Array,Set,Map,String,Number,Boolean,clearTimeout,setTimeout});
  vm.runInContext(source('persistence.js'),context);
  window.RainbowPersistence.queueSync({theme:'unicorn',skills:{reading:'Learning'}});
  const pending=JSON.parse(local.getItem(window.RainbowPersistence.PENDING_KEY));
  assert.equal(pending.theme,'unicorn');
  assert.equal(pending.skills.reading,'Learning');
});

test('Active source has one controlled browser-TTS boundary and no missing HQ assets', () => {
  const html=source('index.html');
  const active=[...html.matchAll(/<script src="\.\/(.+?\.js)(?:\?[^\"]+)?"/g)].map(x=>x[1]);
  const direct=[];
  for(const file of active){const text=source(file);if(/speechSynthesis\.speak|new SpeechSynthesisUtterance/.test(text))direct.push(file);assert.doesNotMatch(text,/assets\/hq/);}
  assert.deepEqual(direct,['speech-service.js']);
  assert.doesNotMatch(html,/kid-upgrade/);
});

test('Every production script is syntactically valid', () => {
  const html=source('index.html');
  const active=[...html.matchAll(/<script src="\.\/(.+?\.js)(?:\?[^\"]+)?"/g)].map(x=>x[1]);
  for(const file of active)new vm.Script(source(file),{filename:file});
});

test('Authoritative interaction engine owns every navigation renderer', () => {
  const engine=source('interaction-engine.js');
  for(const name of ['renderDomains','openDomain','renderQuest','ensureQuest','runActivity','runLearningActivity'])assert.match(engine,new RegExp(`function ${name}\\(`));
  assert.match(source('app.js'),/const art=document\.getElementById\('heroArt'\);if\(art\)/);
  assert.match(engine,/querySelectorAll\(`\[data-placed=.*?forEach\(chip=>chip\.remove\(\)\)/s);
});

test('Child home and parent tools are structurally separated', () => {
  const html=source('index.html');
  const homeStart=html.indexOf('<section id="home"');
  const questStart=html.indexOf('<section id="quest"');
  const heroStart=html.indexOf('<section class="hero glass">');
  const parentStart=html.indexOf('<section id="parent"');
  const home=html.slice(homeStart,questStart);
  assert.ok(homeStart>=0&&heroStart>homeStart&&heroStart<questStart,'hero must belong only to Home');
  assert.doesNotMatch(home,/Adult Zone|Session guardrails|Reading baseline breakdown|Learning principles/);
  assert.ok(parentStart>questStart,'parent dashboard must be a separate view');
  assert.match(html,/data-parent-content="overview"/);
  assert.match(html,/data-parent-content="settings"/);
  assert.doesNotMatch(source('sakhi-shell.js'),/simplifyHome|sakhi-secondary-content/);
});

test('Child navigation exposes only four child destinations', () => {
  const html=source('index.html');
  const desktop=html.match(/<nav class="nav"[\s\S]*?<\/nav>/)[0];
  const mobile=html.match(/<nav class="bottom"[\s\S]*?<\/nav>/)[0];
  assert.doesNotMatch(desktop,/data-go="baseline"/);
  assert.doesNotMatch(mobile,/data-go="baseline"|data-go="parent"/);
  assert.equal((mobile.match(/data-go=/g)||[]).length,4);
});

test('Revision 15 consistently versions production assets and cache', () => {
  const html=source('index.html');
  assert.match(html,/name="sakhi-revision" content="15"/);
  for(const match of html.matchAll(/(?:src|href)="\.\/[^"?]+\?v=(\d+)"/g))assert.equal(match[1],'15');
  assert.match(source('sw.js'),/sakhi-magic-learning-v15/);
  assert.doesNotMatch(source('sw.js'),/\?v=14/);
});
