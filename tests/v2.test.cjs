const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');

test('v2 shell loads only the consolidated runtime',()=>{
  const html=read('index.html');
  assert.match(html,/sakhi-v2\.css/);
  assert.match(html,/sakhi-v2\.js/);
  assert.doesNotMatch(html,/interaction-engine\.js|visuals\.js|adaptive-engine\.js|app\.js/);
});

test('activity selection explicitly scrolls and focuses the workspace',()=>{
  const js=read('sakhi-v2.js');
  assert.match(js,/activityWorkspace/);
  assert.match(js,/scrollIntoView\(\{behavior:/);
  assert.match(js,/w\.focus\(\{preventScroll:true\}\)/);
});

test('v2 uses crisp vector scenes instead of the raster storybook atlas',()=>{
  const js=read('sakhi-v2.js');
  assert.match(js,/<svg viewBox=/);
  assert.doesNotMatch(js,/sakhi-storybook-atlas|phonics-ms-atlas/);
});

test('magical typography has separate display and readable UI fonts',()=>{
  const css=read('sakhi-v2.css');
  assert.match(css,/Berkshire\+Swash/);
  assert.match(css,/Fredoka/);
  assert.match(css,/Nunito/);
});

test('audio has one reusable player and overlap cancellation',()=>{
  const html=read('index.html'),js=read('sakhi-v2.js');
  assert.equal((html.match(/<audio /g)||[]).length,1);
  assert.match(js,/function stopAudio\(\)/);
  assert.match(js,/audio\.pause\(\)/);
  assert.match(js,/audioAbort\?\.abort\(\)/);
});

test('pure phoneme recordings are separate from narration',()=>{
  const js=read('sakhi-v2.js');
  for(const x of ["t:'T.wav'","p:'P.wav'","m:'M.wav'","s:'S.wav'","a:'A-short.wav'"])assert.match(js,new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(js,/function speakPhoneme/);
});

test('parent overview leads with goal, why and next',()=>{
  const js=read('sakhi-v2.js');
  assert.match(js,/TODAY'S PRIMARY DEVELOPMENT GOAL/);
  assert.match(js,/Why today\?/);
  assert.match(js,/After this:/);
  assert.match(js,/Cloud progress/);
});

test('current curriculum declares 48 implemented skills',()=>{
  const js=read('sakhi-v2.js');
  const ids=[...js.matchAll(/\['((?:reading|math|language|logic|science|writing)\.[a-z0-9_]+)'\s*,\s*'(?:reading|math|language|logic|science|writing)'/g)].map(x=>x[1]);
  assert.equal(new Set(ids).size,48);
  for(const id of new Set(ids))assert.ok(js.includes(`case'${id}'`),`missing activity factory for ${id}`);
});

test('rewards are completion driven rather than manually toggled',()=>{
  const js=read('sakhi-v2.js');
  assert.match(js,/meaningful_activity_completion/);
  assert.doesNotMatch(js,/rewards\[.*\]=!rewards/);
});

test('PWA update flow waits for the user before skipWaiting',()=>{
  const sw=read('sw.js'),js=read('sakhi-v2.js');
  assert.match(sw,/SKIP_WAITING/);
  const installBody=sw.match(/self\.addEventListener\('install'[\s\S]*?\n\}\);/)?.[0]||'';
  assert.doesNotMatch(installBody,/skipWaiting\(\)/);
  assert.match(js,/showUpdate/);
  assert.match(js,/postMessage\(\{type:'SKIP_WAITING'\}\)/);
});
