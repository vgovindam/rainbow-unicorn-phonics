(function(){
function startFirst(predicate){const a=(window.activities||[]).find(predicate);if(!a)return false;go('quest');setTimeout(()=>openStructuredActivity(a,'activityRunner','freeplay'),50);return true;}
window.startWordPlay=function(){return startFirst(a=>a.domain==='reading'&&a.interaction_type==='word_builder')||startFirst(a=>a.domain==='reading')};
window.startNumberPlay=function(){return startFirst(a=>a.domain==='math'&&['number_manipulative','pattern_builder','sort','drag_drop'].includes(a.interaction_type))||startFirst(a=>a.domain==='math')};
window.startMemoryPlay=function(){return startFirst(a=>a.interaction_type==='memory')};
function wire(){const zone=document.getElementById('kidStartZone');if(!zone)return;const buttons=[...zone.querySelectorAll('.kid-mode')];buttons.forEach(b=>{const label=b.querySelector('b')?.textContent||'';if(label==='Build Words')b.onclick=()=>startWordPlay();if(label==='Play With Numbers')b.onclick=()=>startNumberPlay();});}
const oldAdd=window.addKidStart;window.addEventListener('load',()=>setTimeout(wire,80));setTimeout(wire,100);
})();