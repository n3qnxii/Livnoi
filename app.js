const state = JSON.parse(localStorage.getItem('livnoiState') || 'null') || {
  xp:120, streak:3, hearts:3, combo:1, correct:7, total:9, words:18, focusMinutes:0, levelProgress:62
};
const save = ()=>localStorage.setItem('livnoiState', JSON.stringify(state));

const vocabQuestions = [
  {level:'A1', word:'arrive', prompt:'What does “arrive” mean?', options:['to reach a place','to forget something','to become smaller','to speak quietly'], answer:0, note:'Arrive = to reach a place. Example: We arrive at school at 8.'},
  {level:'A1', word:'advice', prompt:'What is “advice”?', options:['a suggestion about what someone should do','a type of ticket','a difficult journey','a loud sound'], answer:0, note:'Advice is an opinion or suggestion that may help someone decide what to do.'},
  {level:'A2', word:'improve', prompt:'What does “improve” mean?', options:['to become or make something better','to hide something','to repeat exactly','to stop suddenly'], answer:0, note:'Improve = become better. Example: Practice can improve your English.'},
  {level:'A2', word:'borrow', prompt:'If you “borrow” a book, what do you do?', options:['take it for a time and return it later','buy it forever','throw it away','write a new one'], answer:0, note:'Borrow means take and use something for a time, then return it.'},
  {level:'B1', word:'recover', prompt:'What does “recover” usually mean?', options:['to become well or normal again','to arrive too early','to explain in detail','to choose at random'], answer:0, note:'Recover = return to a normal or healthy condition.'},
  {level:'B1', word:'effort', prompt:'What is an “effort”?', options:['an attempt that uses energy','a place to sleep','a kind of payment','a strong smell'], answer:0, note:'Effort means physical or mental energy used to do something.'}
];

const grammarQuestions = [
  {level:'A1', prompt:'Choose the correct sentence.', options:['She goes to class every day.','She go to class every day.','She going to class every day.','She gone to class every day.'], answer:0, note:'With he/she/it in the present simple, the verb usually takes -s.'},
  {level:'A2', prompt:'Choose the best sentence.', options:['I have lived here for two years.','I live here since two years.','I am live here for two years.','I lived here since two years.'], answer:0, note:'Use present perfect with “for” for a period continuing until now.'},
  {level:'B1', prompt:'Which sentence is correct?', options:['If it rains, we will stay home.','If it will rain, we stay home.','If it rains, we stayed home.','If it rain, we will staying home.'], answer:0, note:'First conditional: If + present simple, will + base verb.'}
];

let rescue = {type:'vocab', index:0, time:12, timer:null, answered:false};
let focus = {seconds:15*60, timer:null, selected:15, wakeLock:null};

function renderStats(){
  document.getElementById('xpValue').textContent = state.xp;
  document.getElementById('streakValue').textContent = state.streak;
  document.getElementById('progressXP').textContent = state.xp;
  document.getElementById('accuracyValue').textContent = Math.round((state.correct/Math.max(1,state.total))*100)+'%';
  document.getElementById('wordsValue').textContent = state.words;
  document.getElementById('focusValue').textContent = state.focusMinutes+'m';
  document.getElementById('levelProgressText').textContent = state.levelProgress+'%';
  document.getElementById('levelProgressBar').style.width = state.levelProgress+'%';
}

function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById(name+'View').classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{showView(b.dataset.go); setTimeout(()=>openLesson(b.dataset.skill),50)}));
document.querySelectorAll('.skill-card').forEach(b=>b.addEventListener('click',()=>openLesson(b.dataset.skill)));

function openLesson(skill){
  const panel = document.getElementById('lessonPanel');
  panel.classList.remove('hidden');
  const content = {
    vocab:['🧠 Vocabulary Rescue','Race the timer and save the patient by choosing the right meaning.'],
    grammar:['🧩 Grammar Mission','Fix English sentences before the monitor hits zero.'],
    listen:['🎧 Listening Mission','Hear a word, then choose what you heard.'],
    speak:['🎙️ Speaking Lab','Say a sentence aloud and let your browser check what it hears.'],
    read:['📖 Reading Story','Read a short story, then answer one comprehension question.'],
    write:['✍️ Writing Builder','Write a short sentence using the target word.']
  }[skill];
  panel.innerHTML = `<h3>${content[0]}</h3><p>${content[1]}</p><button class="primary-btn" id="launchLesson">Start now</button>`;
  document.getElementById('launchLesson').onclick=()=> launchSkill(skill);
  panel.scrollIntoView({behavior:'smooth',block:'center'});
}

function launchSkill(skill){
  if(skill==='vocab' || skill==='grammar') return openRescue(skill);
  if(skill==='listen') return listeningMission();
  if(skill==='speak') return speakingMission();
  if(skill==='read'){showView('focus'); return toast('Reading story opened 📖')}
  if(skill==='write') return writingMission();
}

function openRescue(type='vocab'){
  rescue.type=type; rescue.index=0; state.hearts=3; state.combo=1;
  document.getElementById('rescueModal').classList.remove('hidden');
  document.getElementById('rescueModal').setAttribute('aria-hidden','false');
  renderQuestion();
}
function closeRescue(){clearInterval(rescue.timer); document.getElementById('rescueModal').classList.add('hidden')}
document.getElementById('startRescueBtn').onclick=()=>openRescue('vocab');
document.getElementById('closeRescueBtn').onclick=closeRescue;

document.getElementById('nextQuestionBtn').onclick=()=>{
  const bank = rescue.type==='grammar'?grammarQuestions:vocabQuestions;
  rescue.index=(rescue.index+1)%bank.length; renderQuestion();
};

function renderQuestion(){
  clearInterval(rescue.timer); rescue.answered=false; rescue.time=12;
  const bank = rescue.type==='grammar'?grammarQuestions:vocabQuestions;
  const q=bank[rescue.index];
  document.getElementById('rescueLevel').textContent=`${q.level} ${rescue.type==='grammar'?'Grammar':'Vocabulary'}`;
  document.getElementById('questionTitle').textContent=q.prompt;
  document.getElementById('questionHint').textContent='Answer before the rescue timer reaches zero.';
  document.getElementById('feedbackBox').classList.add('hidden');
  document.getElementById('nextQuestionBtn').classList.add('hidden');
  document.getElementById('patientHealth').textContent='❤️'.repeat(Math.max(0,state.hearts))+'🖤'.repeat(Math.max(0,3-state.hearts));
  document.getElementById('comboValue').textContent='×'+state.combo;
  const grid=document.getElementById('answerGrid'); grid.innerHTML='';
  q.options.forEach((opt,i)=>{const b=document.createElement('button');b.className='answer-btn';b.textContent=opt;b.onclick=()=>answer(i,b);grid.appendChild(b)});
  startRescueTimer();
}
function startRescueTimer(){
  const el=document.getElementById('rescueTimer'); const ring=el.parentElement; el.textContent=rescue.time; ring.classList.remove('danger');
  rescue.timer=setInterval(()=>{ rescue.time--; el.textContent=rescue.time; if(rescue.time<=4) ring.classList.add('danger'); if(rescue.time<=0){clearInterval(rescue.timer); timeoutAnswer();}},1000)
}
function answer(index,btn){
  if(rescue.answered)return; rescue.answered=true; clearInterval(rescue.timer);
  const bank=rescue.type==='grammar'?grammarQuestions:vocabQuestions; const q=bank[rescue.index]; state.total++;
  document.querySelectorAll('.answer-btn').forEach((b,i)=>{b.disabled=true;if(i===q.answer)b.classList.add('correct')});
  if(index===q.answer){btn.classList.add('correct'); const gain=10+Math.max(0,rescue.time)*2+(state.combo-1)*3; state.xp+=gain; state.correct++; state.combo=Math.min(9,state.combo+1); state.levelProgress=Math.min(100,state.levelProgress+2); if(rescue.type==='vocab') state.words++; feedback(`✅ Rescue successful! +${gain} XP`,q.note)}
  else {btn.classList.add('wrong'); state.hearts--; state.combo=1; feedback('💔 Not quite. The patient lost one heart.',q.note)}
  finishQuestion();
}
function timeoutAnswer(){ if(rescue.answered)return; rescue.answered=true; state.total++; state.hearts--; state.combo=1; const bank=rescue.type==='grammar'?grammarQuestions:vocabQuestions; const q=bank[rescue.index]; document.querySelectorAll('.answer-btn').forEach((b,i)=>{b.disabled=true;if(i===q.answer)b.classList.add('correct')}); feedback('⏱️ Time ran out — rescue missed.',q.note); finishQuestion(); }
function feedback(title,note){const box=document.getElementById('feedbackBox');box.innerHTML=`<b>${title}</b><br>${note}`;box.classList.remove('hidden')}
function finishQuestion(){ save(); renderStats(); document.getElementById('patientHealth').textContent='❤️'.repeat(Math.max(0,state.hearts))+'🖤'.repeat(Math.max(0,3-state.hearts)); document.getElementById('comboValue').textContent='×'+state.combo; const next=document.getElementById('nextQuestionBtn'); next.textContent=state.hearts<=0?'Restart rescue':'Next mission'; next.classList.remove('hidden'); if(state.hearts<=0){next.onclick=()=>{state.hearts=3;state.combo=1;rescue.index=0;document.getElementById('nextQuestionBtn').onclick=()=>{const bank=rescue.type==='grammar'?grammarQuestions:vocabQuestions;rescue.index=(rescue.index+1)%bank.length;renderQuestion()};renderQuestion()}} }

function listeningMission(){
  const q=vocabQuestions[Math.floor(Math.random()*vocabQuestions.length)];
  if('speechSynthesis' in window){ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(q.word); u.lang='en-GB'; u.rate=.85; speechSynthesis.speak(u); toast(`🎧 Listen carefully: tap again if you want to replay “${q.word}”.`); }
  else toast('Listening audio is not supported in this browser.');
}

function speakingMission(){
  const target='I am improving my English every day.';
  const Rec=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Rec) return toast('Speaking check works best in Chrome/Android. iPhone support may vary.');
  const r=new Rec(); r.lang='en-US'; r.interimResults=false; toast(`🎙️ Say: “${target}”`); r.onresult=e=>{const heard=e.results[0][0].transcript; const good=heard.toLowerCase().includes('improving my english'); if(good){state.xp+=20;state.correct++;state.total++;save();renderStats();toast('✅ Nice speaking! +20 XP')} else {state.total++;save();renderStats();toast(`I heard: “${heard}” — try again.`)}}; r.onerror=()=>toast('Microphone check could not start.'); r.start();
}

function writingMission(){
  const panel=document.getElementById('lessonPanel'); panel.innerHTML=`<h3>✍️ Use the word “improve”</h3><p>Write one sentence of at least 5 words.</p><textarea id="writeBox" style="width:100%;min-height:110px;border-radius:15px;border:0;padding:12px;font:inherit"></textarea><button class="primary-btn" id="checkWrite">Check sentence</button>`;
  document.getElementById('checkWrite').onclick=()=>{const t=document.getElementById('writeBox').value.trim(); const okay=t.toLowerCase().includes('improve') && t.split(/\s+/).length>=5; state.total++; if(okay){state.correct++;state.xp+=15;save();renderStats();toast('✅ Great! +15 XP')} else toast('Try a longer sentence and include “improve”.')}
}

function updateFocusDisplay(){const m=Math.floor(focus.seconds/60).toString().padStart(2,'0'),s=(focus.seconds%60).toString().padStart(2,'0');document.getElementById('focusTimer').textContent=`${m}:${s}`}
document.querySelectorAll('.time-chip').forEach(b=>b.onclick=()=>{if(focus.timer)return;document.querySelectorAll('.time-chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');focus.selected=+b.dataset.mins;focus.seconds=focus.selected*60;updateFocusDisplay()});
async function requestWakeLock(){try{if('wakeLock'in navigator){focus.wakeLock=await navigator.wakeLock.request('screen');document.getElementById('wakeStatus').textContent='Screen wake lock is active ✨'}}catch(e){document.getElementById('wakeStatus').textContent='Wake lock was not available. Keep this page open.'}}
document.getElementById('focusStartBtn').onclick=async()=>{
  const btn=document.getElementById('focusStartBtn');
  if(focus.timer){clearInterval(focus.timer);focus.timer=null;btn.textContent='Resume focus session';if(focus.wakeLock){try{await focus.wakeLock.release()}catch{} focus.wakeLock=null}return}
  await requestWakeLock(); btn.textContent='Pause focus session';
  focus.timer=setInterval(()=>{focus.seconds--;updateFocusDisplay();if(focus.seconds<=0){clearInterval(focus.timer);focus.timer=null;state.focusMinutes+=focus.selected;state.xp+=30;save();renderStats();btn.textContent='Start another session';toast('🎯 Focus complete! +30 XP')}},1000)
};

document.getElementById('resetBtn').onclick=()=>{localStorage.removeItem('livnoiState');location.reload()};
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.add('hidden'),3200)}

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}))}
renderStats(); updateFocusDisplay();
