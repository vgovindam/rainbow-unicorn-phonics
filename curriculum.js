(function(){
const version='2026.09.07-v1';
const S=[];
function add(id,domain,stage,title,prerequisites=[],next=[],level=1,review=[]){S.push({skill_id:id,domain,stage,title,prerequisites,recommended_next:next,difficulty_level:level,review_dependencies:review.length?review:prerequisites});}
// Reading R0-R10
add('reading.letter_sounds','reading','R0','Letter sounds',[],['reading.short_vowels','reading.beginning_sounds'],1);
add('reading.short_vowels','reading','R0','Short vowels',['reading.letter_sounds'],['reading.oral_blending','reading.medial_vowels'],1);
add('reading.beginning_sounds','reading','R0','Beginning sounds',['reading.letter_sounds'],['reading.ending_sounds','reading.oral_blending'],1);
add('reading.ending_sounds','reading','R0','Ending sounds',['reading.beginning_sounds'],['reading.segmentation'],1);
add('reading.rhyming','reading','R0','Rhyming',[],['reading.sound_matching'],1);
add('reading.oral_blending','reading','R1','Oral blending',['reading.letter_sounds'],['reading.cvc_decode.short_a','reading.segmentation'],2);
add('reading.segmentation','reading','R1','Oral segmentation',['reading.beginning_sounds','reading.ending_sounds'],['reading.cvc_encode.short_a'],2);
add('reading.medial_vowels','reading','R1','Middle vowel sounds',['reading.short_vowels'],['reading.cvc_decode.short_a','reading.cvc_decode.short_i'],2);
add('reading.sound_matching','reading','R1','Sound matching',['reading.rhyming','reading.beginning_sounds'],['reading.cvc_decode.short_a'],2);
add('reading.cvc_decode.short_a','reading','R2','Read short-a CVC words',['reading.letter_sounds','reading.short_vowels','reading.oral_blending'],['reading.cvc_decode.short_i','reading.cvc_encode.short_a'],2);
add('reading.cvc_decode.short_i','reading','R2','Read short-i CVC words',['reading.cvc_decode.short_a'],['reading.cvc_decode.mixed','reading.cvc_encode.short_i'],2);
add('reading.cvc_decode.mixed','reading','R2','Read mixed short-vowel CVC words',['reading.cvc_decode.short_a','reading.cvc_decode.short_i','reading.medial_vowels'],['reading.cvc_encode.mixed','reading.cvc_fluency'],3);
add('reading.cvc_encode.short_a','reading','R3','Spell short-a CVC words',['reading.segmentation','reading.cvc_decode.short_a'],['reading.cvc_encode.short_i','reading.cvc_encode.mixed'],3);
add('reading.cvc_encode.short_i','reading','R3','Spell short-i CVC words',['reading.segmentation','reading.cvc_decode.short_i'],['reading.cvc_encode.mixed'],3);
add('reading.cvc_encode.mixed','reading','R3','Spell mixed CVC words',['reading.cvc_encode.short_a','reading.cvc_encode.short_i'],['reading.cvc_fluency','reading.digraphs.sh'],3);
add('reading.cvc_fluency','reading','R4','CVC fluency',['reading.cvc_decode.mixed'],['reading.short_phrases','reading.digraphs.sh'],3);
add('reading.short_phrases','reading','R4','Read short decodable phrases',['reading.cvc_fluency'],['reading.simple_sentences'],3);
['sh','ch','th','wh','ck'].forEach((d,i)=>add(`reading.digraphs.${d}`,'reading','R5',`Digraph ${d}`,i?['reading.digraphs.sh']:['reading.cvc_decode.mixed','reading.cvc_encode.mixed'],i===4?['reading.blends.intro']:[`reading.digraphs.${['ch','th','wh','ck'][i]}`].filter(Boolean),3));
add('reading.blends.intro','reading','R6','Consonant blends',['reading.digraphs.ck','reading.cvc_fluency'],['reading.simple_sentences'],4);
add('reading.simple_sentences','reading','R7','Decodable sentences',['reading.short_phrases','reading.blends.intro'],['reading.decodable_stories'],4);
add('reading.decodable_stories','reading','R8','Decodable stories',['reading.simple_sentences'],['reading.advanced.silent_e','language.retelling'],4);
add('reading.advanced.silent_e','reading','R9','Silent-e words',['reading.decodable_stories'],['reading.advanced.long_vowels'],4);
add('reading.advanced.long_vowels','reading','R9','Long vowels',['reading.advanced.silent_e'],['reading.advanced.vowel_teams'],4);
add('reading.advanced.vowel_teams','reading','R9','Vowel teams',['reading.advanced.long_vowels'],['reading.advanced.r_controlled'],5);
add('reading.advanced.r_controlled','reading','R9','R-controlled vowels',['reading.advanced.vowel_teams'],['reading.meaning.comprehension'],5);
add('reading.meaning.comprehension','reading','R10','Reading for meaning',['reading.decodable_stories'],['language.main_idea','language.inference'],4);
// Math M0-M14
const math=[['M0','number_check','Number recognition and counting check'],['M1','one_to_one','One-to-one correspondence'],['M2','quantity','Quantities and number sense'],['M3','compare','More / less / equal'],['M4','compose','Number composition'],['M5','addition_objects','Addition using objects'],['M6','subtraction_objects','Subtraction using objects'],['M7','number_bonds','Number bonds'],['M8','mental_foundations','Mental math foundations'],['M9','patterns','Patterns and sequences'],['M10','measurement','Measurement'],['M11','geometry','Geometry and spatial reasoning'],['M12','time_money','Time and money foundations'],['M13','place_value','Early place value'],['M14','multi_step','Multi-step reasoning']];
math.forEach((x,i)=>add(`math.${x[1]}`,'math',x[0],x[2],i?[`math.${math[i-1][1]}`]:[],i<math.length-1?[`math.${math[i+1][1]}`]:[],Math.min(5,1+Math.floor(i/3))));
// Writing W0-W8
const writing=[['W0','fine_motor','Fine motor readiness'],['W1','letter_formation','Letter formation review'],['W2','number_formation','Number formation'],['W3','cvc_words','Write simple CVC words'],['W4','picture_labels','Label pictures'],['W5','sentence_completion','Complete simple sentences'],['W6','independent_sentence','Write one independent sentence'],['W7','connected_sentences','Write two connected sentences'],['W8','story_creation','Create a simple story']];
writing.forEach((x,i)=>add(`writing.${x[1]}`,'writing',x[0],x[2],i?[`writing.${writing[i-1][1]}`]:[],i<writing.length-1?[`writing.${writing[i+1][1]}`]:[],Math.min(5,1+Math.floor(i/2))));
// Language / comprehension L0-L10 independent of decoding
const lang=[['L0','listening','Listening comprehension'],['L1','wh','Who / what / where'],['L2','sequence','Story sequence'],['L3','retelling','Retelling'],['L4','prediction','Prediction'],['L5','cause_effect','Cause and effect'],['L6','feelings','Character feelings'],['L7','inference','Simple inference'],['L8','main_idea','Main idea'],['L9','details','Supporting details'],['L10','summarization','Summarization']];
lang.forEach((x,i)=>add(`language.${x[1]}`,'language',x[0],x[2],i?[`language.${lang[i-1][1]}`]:[],i<lang.length-1?[`language.${lang[i+1][1]}`]:[],Math.min(5,1+Math.floor(i/3))));
// Logic progression
['sorting','classification','patterns','visual_matching','sequencing','odd_one_out','mazes','analogies','cause_effect','multi_step','spatial_reasoning','deduction','coding_sequences'].forEach((n,i,arr)=>add(`logic.${n}`,'logic',`G${i}`,n.replaceAll('_',' '),i?[`logic.${arr[i-1]}`]:[],i<arr.length-1?[`logic.${arr[i+1]}`]:[],Math.min(5,1+Math.floor(i/3))));
// Science progression
['living_nonliving','animals','habitats','plants','human_body','weather','seasons','materials','floating_sinking','magnets','light','sound','earth','day_night','space','forces','simple_machines','environment'].forEach((n,i,arr)=>add(`science.${n}`,'science',`S${i}`,n.replaceAll('_',' '),i?[`science.${arr[Math.max(0,i-1)]}`]:[],i<arr.length-1?[`science.${arr[i+1]}`]:[],Math.min(5,1+Math.floor(i/4))));
const byId=Object.fromEntries(S.map(s=>[s.skill_id,s]));
const aliases={
 'Letter sounds':'reading.letter_sounds','Short vowels':'reading.short_vowels','Beginning sounds':'reading.beginning_sounds','Ending sounds':'reading.ending_sounds','Oral blending':'reading.oral_blending','Phoneme segmentation':'reading.segmentation','CVC decoding':'reading.cvc_decode.short_a','CVC encoding':'reading.cvc_encode.short_a','Digraphs':'reading.digraphs.sh','Blends':'reading.blends.intro','Sentence reading':'reading.simple_sentences','Reading fluency':'reading.cvc_fluency','Comprehension':'reading.meaning.comprehension',
 'One-to-one correspondence':'math.one_to_one','Quantity comparison':'math.compare','Number composition':'math.compose','Number bonds':'math.number_bonds','Addition with objects':'math.addition_objects','Subtraction with objects':'math.subtraction_objects','Patterns':'math.patterns','Measurement & comparison':'math.measurement',
 'Listening comprehension':'language.listening','Story sequencing':'language.sequence','Retelling':'language.retelling','Predicting':'language.prediction','Simple inference':'language.inference',
 'Picture labeling':'writing.picture_labels','Letter formation':'writing.letter_formation','Number formation':'writing.number_formation'
};
function normalizeState(s){return String(s||'NOT_INTRODUCED').toUpperCase().replaceAll(' ','_');}
function fromLegacy(data){const out={};Object.entries(data?.skills||{}).forEach(([k,v])=>{const skill=k.split('::').slice(1).join('::');const id=aliases[skill];if(id)out[id]=normalizeState(v)});return out;}
function ready(skillId,states){const s=byId[skillId];if(!s)return false;return s.prerequisites.every(p=>['MOSTLY_MASTERED','MASTERED'].includes(normalizeState(states[p])));}
function nextCandidates(states){return S.filter(s=>!['MASTERED','MOSTLY_MASTERED'].includes(normalizeState(states[s.skill_id]))&&ready(s.skill_id,states));}
window.RainbowCurriculum={version,skills:S,byId,aliases,fromLegacy,ready,nextCandidates,normalizeState};
})();