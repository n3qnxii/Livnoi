const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const STORAGE='livnoi_v2_state';
const levels=['A1','A2','B1','B2','C1'];
const levelIndex=l=>levels.indexOf(l);
const shuffle=a=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x};
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const defaultState={level:'A2',language:'mixed',speed:'normal',xp:0,streak:1,total:0,correct:0,bestCombo:0,bestScores:{vocab:0,grammar:0},music:true,sfx:true,powerSound:true,history:[],focusSessions:[]};
let state={...defaultState,...JSON.parse(localStorage.getItem(STORAGE)||'{}')};
state.bestScores={...defaultState.bestScores,...(state.bestScores||{})};
state.focusSessions=Array.isArray(state.focusSessions)?state.focusSessions:[];
state.focusSessions.forEach(s=>{if(s.status==='running')s.status='paused'});
const save=()=>{localStorage.setItem(STORAGE,JSON.stringify(state));renderDashboard()};

const GRAMMAR=window.GRAMMAR_BANK||[];
const poolExact=(items,l)=>items.filter(x=>x.level===l);

function showView(name){$$('.view').forEach(v=>v.classList.remove('active'));$('#'+name+'View')?.classList.add('active');$$('.nav').forEach(n=>n.classList.toggle('active',n.dataset.view===name));if(name==='focus'){renderFlight();if(currentStoryIndex<0)randomStory()}if(name==='progress')renderFocusProgress();window.scrollTo({top:0,behavior:'smooth'})}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
$$('[data-game]').forEach(b=>b.addEventListener('click',()=>b.dataset.game==='crossword'?startCrossword():launchBattle(b.dataset.game)));

function renderDashboard(){
 const acc=state.total?Math.round(state.correct/state.total*100):0;
 $('#xpTop').textContent=state.xp;$('#homeXp').textContent=state.xp;$('#homeAccuracy').textContent=acc+'%';$('#homeStreak').textContent=state.streak;
 $('#progressXp').textContent=state.xp;$('#progressAccuracy').textContent=acc+'%';
 $('#homeLevel').textContent=state.level+(levelIndex(state.level)>=2?' Challenger':' Explorer');
 $$('#levelPicker button').forEach(b=>b.classList.toggle('active',b.dataset.level===state.level));
 $$('#languagePicker button').forEach(b=>b.classList.toggle('active',b.dataset.language===state.language));
 $$('#speedPicker button').forEach(b=>b.classList.toggle('active',b.dataset.speed===state.speed));
 const eng=$('#languagePicker [data-language="english"]'); if(eng)eng.disabled=levelIndex(state.level)<2;
 $('#languageNote').textContent=levelIndex(state.level)<2?'English-only becomes available from B1.':'English-only mode is available at your level.';
 updateAudioToggles();renderHistory();renderFocusProgress();
}
function renderHistory(){
 const box=$('#historyList'); if(!box)return;
 const game=state.history.slice(0,8).map(h=>({time:h.date,html:`<div class="history-item"><span>${h.mode}</span><b>${h.score} XP</b></div>`}));
 const flights=state.focusSessions.slice(-8).map(f=>({time:f.startedAt,html:`<div class="history-item flight-history"><span>${f.fromCode||'MEL'} → ${f.code||''} ${f.city||'Focus flight'} · ${f.seat||'--'}</span><b>${formatDuration(f.focusedSeconds||0)} · ${f.status}</b></div>`}));
 const rows=[...game,...flights].sort((a,b)=>b.time-a.time).slice(0,10);
 box.innerHTML=rows.length?rows.map(x=>x.html).join(''):'<div class="history-empty">Play a mission or complete a focus flight to start your log.</div>';
}
$$('#levelPicker button').forEach(b=>b.onclick=()=>{state.level=b.dataset.level;if(levelIndex(state.level)<2&&state.language==='english')state.language='mixed';save();randomStory()});
$$('#languagePicker button').forEach(b=>b.onclick=()=>{if(b.disabled)return;state.language=b.dataset.language;save()});
$$('#speedPicker button').forEach(b=>b.onclick=()=>{state.speed=b.dataset.speed;save()});
$('#resetProgress').onclick=()=>{if(!confirm('Reset all LIVNOI scores, best scores, focus flights and progress on this device?'))return;state={...defaultState,level:state.level,language:state.language,speed:state.speed,music:state.music,sfx:state.sfx,powerSound:state.powerSound,bestScores:{vocab:0,grammar:0},history:[],focusSessions:[]};localStorage.removeItem(STORAGE);save();toast('All scores and focus flights reset')};

let audioCtx=null,musicTimer=null;
function ctx(){if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}
function tone(freq=440,dur=.08,type='sine',gain=.04){if(!state.sfx)return;const c=ctx(),o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(gain,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+dur);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+dur)}
function powerTone(hero=true){if(!state.sfx||!state.powerSound)return;[hero?420:180,hero?620:140,hero?840:110].forEach((f,i)=>setTimeout(()=>tone(f,.13,'sawtooth',.035),i*55))}
function startMusic(){stopMusic();if(!state.music)return;let i=0;const notes=[110,138.6,164.8,138.6,123.5,155.6,185,155.6];musicTimer=setInterval(()=>{if(!state.music)return;const c=ctx(),o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=notes[i++%notes.length];g.gain.value=.012;o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+.24)},300)}
function stopMusic(){if(musicTimer){clearInterval(musicTimer);musicTimer=null}}
function updateAudioToggles(){[['musicToggle','music'],['sfxToggle','sfx'],['powerToggle','powerSound']].forEach(([id,k])=>{const b=$('#'+id);if(!b)return;b.textContent=state[k]?'ON':'OFF';b.classList.toggle('on',state[k])});if($('#quickSound'))$('#quickSound').textContent=state.sfx?'SND':'MUTE';if($('#pauseSound'))$('#pauseSound').textContent=state.sfx?'Sound ON':'Sound OFF'}
[['musicToggle','music'],['sfxToggle','sfx'],['powerToggle','powerSound']].forEach(([id,k])=>{$('#'+id).onclick=()=>{state[k]=!state[k];save();if(k==='music'&&state.music&&!$('#battleScreen').classList.contains('hidden'))startMusic();if(k==='music'&&!state.music)stopMusic()}});


let launchTimer=null;
function runGameLoader(onDone,duration=1450){
  const overlay=$('#gameLoadingOverlay'),fill=$('#gameLoadFill'),runner=$('#runnerBeast'),pct=$('#gameLoadPercent');
  if(!overlay){onDone?.();return}
  clearInterval(launchTimer);overlay.classList.remove('hidden');overlay.setAttribute('aria-hidden','false');
  let p=0;fill.style.width='0%';runner.style.left='-16px';pct.textContent='0%';
  const started=performance.now();
  launchTimer=setInterval(()=>{
    const t=Math.min(1,(performance.now()-started)/duration);
    p=Math.round((1-Math.pow(1-t,2.2))*100);
    fill.style.width=p+'%';runner.style.left=`calc(${p}% - 16px)`;pct.textContent=p+'%';
    if(t>=1){clearInterval(launchTimer);launchTimer=null;setTimeout(()=>{overlay.classList.add('hidden');overlay.setAttribute('aria-hidden','true');onDone?.()},120)}
  },40);
}
function launchBattle(mode){
  // Grammar opens instantly. The animated loading screen is reserved for site entry + Vocabulary.
  if(mode==='grammar')return startBattle(mode);
  runGameLoader(()=>startBattle(mode),1450);
}

const VOCAB_SECONDS=7, GRAMMAR_SECONDS=10;
let battle={};
function battleSeconds(mode){return mode==='grammar'?GRAMMAR_SECONDS:VOCAB_SECONDS}
function startBattle(mode){const seconds=battleSeconds(mode);battle={mode,round:0,villainHp:100,combo:1,score:0,timeLeft:seconds,maxTime:seconds,timer:null,current:null,locked:false,paused:false,hints:3,queue:[],qIndex:0,synQueue:[],synIndex:0,grammarQueue:[],grammarIndex:0,enemyShots:new Set()};$('#battleScreen').classList.remove('hidden');$('#battleScreen').setAttribute('aria-hidden','false');$('#resultOverlay').classList.add('hidden');$('#pauseOverlay').classList.add('hidden');$('#battleMode').textContent=mode==='vocab'?'VOCABULARY · WORD SURVIVAL':'GRAMMAR · POWER SENTENCE';$('#friendBubble').classList.add('hidden');updateAudioToggles();startMusic();updateBattleUI();nextQuestion()}
function endBattle(saveRun=true){clearInterval(battle.timer);stopMusic();$('#battleScreen').classList.add('hidden');$('#battleScreen').setAttribute('aria-hidden','true');$('#pauseOverlay').classList.add('hidden');if(saveRun&&battle.round>0)saveGameRun()}
function saveGameRun(){if(battle.saved)return;battle.saved=true;state.xp+=battle.score;state.bestScores[battle.mode]=Math.max(state.bestScores[battle.mode]||0,battle.score);state.history.unshift({mode:battle.mode==='vocab'?'Vocabulary':'Grammar',score:battle.score,date:Date.now()});state.history=state.history.slice(0,30);save()}
function sceneForScore(score){return score>=80?'storm':score>=65?'sunset':score>=50?'airport':score>=30?'ring':'mall'}
function updateScene(){const a=$('#arena');['mall','ring','airport','sunset','storm'].forEach(x=>a.classList.remove('scene-'+x));a.classList.add('scene-'+sceneForScore(battle.score))}
function updateBattleUI(){
  $('#battleScore').textContent=battle.score;
  $('#comboText').textContent='COMBO ×'+battle.combo;
  $('#battleLevel').textContent=`${state.level} · ENDLESS · ${battle.round} Q`;
  $('#hintCount').textContent=battle.hints;
  $('#pauseHint').textContent=`Use hint (${battle.hints})`;
  updateScene();
}
function nextQuestion(){
 if(battle.villainHp<=0){$('#friendBubble').textContent='FRIEND UNLOCKED!';$('#friendBubble').classList.remove('hidden');battle.locked=true;setTimeout(()=>{$('#friendBubble').classList.add('hidden');battle.villainHp=100;battle.locked=false;updateBattleUI();nextQuestion()},650);return}
 battle.round++;battle.locked=false;resetHeroAfterDeath();resetVillainApproach();$('#battleFeedback').className='battle-feedback hidden';$('#answers').innerHTML='';$('#battleHint').textContent=battle.mode==='grammar'?'10 seconds — build the sentence before the beast reaches you.':'Answer before the beast reaches your hero.';
 battle.current=battle.mode==='vocab'?makeVocabQuestion():makeGrammarQuestion();
 const qDir=$('#questionDirection');const qEl=$('#battleQuestion');qEl.textContent=battle.current.q;qEl.classList.toggle('thai-text',/[\u0E00-\u0E7F]/.test(battle.current.q));qDir.textContent=battle.current.dir;qDir.classList.remove('danger-label','syn-label');
 if(battle.current.kind==='antonym')qDir.classList.add('danger-label');
 if(battle.current.kind==='synonym')qDir.classList.add('syn-label');
 renderAnswers(battle.current.options,battle.current.a);battle.timeLeft=battle.maxTime=battleSeconds(battle.mode);battle.enemyShots=new Set();updateBattleUI();startQuestionTimer()
}
function naturalWordPool(level){return poolExact(WORDS,level).filter(w=>w.en===w.root)}
function nextTranslationWord(){const pool=naturalWordPool(state.level);if(!battle.queue.length||battle.qIndex>=battle.queue.length){battle.queue=shuffle(pool);battle.qIndex=0}return battle.queue[battle.qIndex++]}
function nextSynWord(){const pool=poolExact(SYNONYM_BANK,state.level);if(!battle.synQueue.length||battle.synIndex>=battle.synQueue.length){battle.synQueue=shuffle(pool);battle.synIndex=0}return battle.synQueue[battle.synIndex++]}
function makeVocabQuestion(){
 const synPool=poolExact(SYNONYM_BANK,state.level); const roll=Math.random();
 if(synPool.length && roll<.32){const item=nextSynWord();const correct=pick(item.synonyms);let wrong=pick(item.antonyms.length?item.antonyms:shuffle(synPool.filter(x=>x.word!==item.word)).flatMap(x=>x.synonyms));return{q:item.word,a:correct,options:shuffle([correct,wrong]),dir:'SYNONYM · SAME MEANING',kind:'synonym',hint:`${item.word} ≈ ${item.synonyms.join(', ')}`}}
 if(synPool.length && roll>=.32 && roll<.46){const item=nextSynWord();const correct=pick(item.antonyms);if(!correct)return makeVocabQuestion();let wrong=pick(item.synonyms);return{q:item.word,a:correct,options:shuffle([correct,wrong]),dir:'ANTONYM · OPPOSITE WORD',kind:'antonym',hint:`Opposite of ${item.word}: ${item.antonyms.join(', ')}`}}
 const pool=naturalWordPool(state.level),word=nextTranslationWord();let englishOnly=state.language==='english'&&levelIndex(state.level)>=2,reverse=!englishOnly&&Math.random()<.5,q,answer,dir,distractors;
 if(englishOnly){q=word.clue;answer=word.en;dir='WORD GUESS · ENGLISH ONLY';distractors=shuffle(pool.filter(x=>x.en!==word.en&&x.root!==word.root)).slice(0,1).map(x=>x.en)}else if(reverse){q=word.th;answer=word.en;dir='TH → EN · WORD SURVIVAL';distractors=shuffle(pool.filter(x=>x.en!==word.en&&x.root!==word.root)).slice(0,1).map(x=>x.en)}else{q=word.en;answer=word.th;dir='EN → TH · WORD SURVIVAL';distractors=shuffle(pool.filter(x=>x.en!==word.en&&x.root!==word.root)).slice(0,1).map(x=>x.th)}
 return{q,a:answer,options:shuffle([answer,...distractors]),dir,kind:'translation',hint:`${word.en} = ${word.th}`}
}
function makeGrammarQuestion(){const exact=poolExact(GRAMMAR,state.level),pool=exact.length?exact:GRAMMAR.filter(x=>levelIndex(x.level)<=levelIndex(state.level));if(!battle.grammarQueue.length||battle.grammarIndex>=battle.grammarQueue.length){battle.grammarQueue=shuffle(pool);battle.grammarIndex=0}const item=battle.grammarQueue[battle.grammarIndex++],wrong=shuffle(item.options.filter(x=>x!==item.a))[0];return{q:item.q,a:item.a,options:shuffle([item.a,wrong]),dir:'GRAMMAR · '+item.level+' · '+String(item.category||'practice').toUpperCase(),kind:'grammar',hint:item.hint}}
function renderAnswers(options,answer){options.forEach(opt=>{const b=document.createElement('button');b.className='answer-btn';b.textContent=opt;if(/[\u0E00-\u0E7F]/.test(opt))b.classList.add('thai-text');b.onclick=()=>submitAnswer(opt,b,answer);$('#answers').appendChild(b)})}
function resetVillainApproach(){
  const villain=$('#villain');
  if(!villain)return;
  villain.style.setProperty('--approach','0');
  villain.classList.remove('at-hero','charge');
}
function spawnEnemyProjectile(){
  const arena=$('#arena'); if(!arena||battle.paused||battle.locked)return;
  const orb=document.createElement('span');orb.className='enemy-projectile';arena.appendChild(orb);
  tone(150,.055,'sawtooth',.012);
  setTimeout(()=>orb.remove(),560);
}
function moveVillainByTime(){
  const villain=$('#villain'), arena=$('#arena');
  if(!villain||!arena)return;
  const progress=clamp(1-(battle.timeLeft/battle.maxTime),0,1);
  villain.style.setProperty('--approach',progress.toFixed(3));
  villain.classList.toggle('near',progress>.58);
  villain.classList.toggle('danger',progress>.82);
  // The beast fires warning energy while advancing. The final contact at 0 ends the run.
  [[.34,'a'],[.62,'b'],[.82,'c']].forEach(([mark,key])=>{if(progress>=mark&&!battle.enemyShots.has(key)){battle.enemyShots.add(key);spawnEnemyProjectile()}});
}
function resetHeroAfterDeath(){
  const hero=$('#heroCharacter'),ghost=$('#heroGhost');
  if(hero){hero.classList.remove('fallen');}
  if(ghost){ghost.classList.remove('rise');}
}
function heroDeathAnimation(){
  const hero=$('#heroCharacter'),villain=$('#villain'),ghost=$('#heroGhost');
  if(villain){villain.style.setProperty('--approach','1');villain.classList.add('at-hero');}
  if(hero)hero.classList.add('fallen');
  setTimeout(()=>{if(ghost)ghost.classList.add('rise')},180);
}
function startQuestionTimer(){
  clearInterval(battle.timer);
  let last=performance.now();
  $('#timerText').textContent=battle.timeLeft.toFixed(1);
  $('#timerFill').style.width='100%';
  resetVillainApproach();
  battle.timer=setInterval(()=>{
    if(battle.paused){last=performance.now();return}
    const now=performance.now();
    battle.timeLeft=Math.max(0,battle.timeLeft-(now-last)/1000);
    last=now;
    $('#timerText').textContent=battle.timeLeft.toFixed(1);
    $('#timerFill').style.width=(battle.timeLeft/battle.maxTime*100)+'%';
    moveVillainByTime();
    if(battle.timeLeft<=0){clearInterval(battle.timer);timeoutAnswer()}
  },50)
}
function timeoutAnswer(){
  if(battle.locked)return;
  battle.locked=true;
  state.total++;
  battle.combo=1;
  heroDeathAnimation();
  showFeedback(false,'Too late — the beast reached you!');
  updateBattleUI();
  setTimeout(finishRound,1250)
}
function submitAnswer(opt,button,answer){
  if(battle.locked||battle.paused)return;
  battle.locked=true;
  clearInterval(battle.timer);
  state.total++;
  const correct=opt===answer;
  $$('.answer-btn').forEach(b=>{b.disabled=true;if(b.textContent===answer)b.classList.add('correct')});
  if(correct){
    state.correct++;
    button.classList.add('correct');
    const speedBonus=Math.max(0,Math.ceil(battle.timeLeft/2));
    const gain=5+(battle.combo-1)+speedBonus;
    battle.score+=gain;
    battle.villainHp=Math.max(0,battle.villainHp-(16+Math.min(10,battle.combo*2)));
    battle.combo++;
    state.bestCombo=Math.max(state.bestCombo,battle.combo-1);
    attackAnimation(true);
    showFeedback(true,`+${gain}`);
    setTimeout(nextQuestion,620);
  }else{
    button.classList.add('wrong');
    battle.combo=1;
    const villain=$('#villain');
    if(villain){villain.classList.add('charge');villain.style.setProperty('--approach','.9');}
    attackAnimation(false);
    showFeedback(false,`Wrong — correct answer: ${answer}`);
    updateBattleUI();
    // One mistake ends the run: the beast's shot defeats the hero immediately.
    setTimeout(heroDeathAnimation,180);
    setTimeout(finishRound,1250);
  }
  updateBattleUI();
}
function attackAnimation(heroWins){powerTone(heroWins);const shot=$('#energyShot'),target=heroWins?$('#villain'):$('#heroCharacter');shot.className='energy-shot '+(heroWins?'fire':'backfire');target.classList.add('hit');$('#arena').classList.add('screen-shake');setTimeout(()=>{$('#arena').classList.remove('screen-shake');shot.className='energy-shot';target.classList.remove('hit');$('#villain').classList.remove('advance','charge')},520)}
function showFeedback(good,text){tone(good?720:160,.1,good?'sine':'square',.03);const f=$('#battleFeedback');f.textContent=text;f.className='battle-feedback '+(good?'good':'bad')}
function finishRound(){
 clearInterval(battle.timer);battle.locked=true;stopMusic();
 const oldBest=state.bestScores[battle.mode]||0,isNewBest=battle.score>oldBest;
 saveGameRun();
 const best=state.bestScores[battle.mode]||battle.score;
 $('#resultLabel').textContent=isNewBest?'NEW RECORD':'RUN OVER';
 $('#resultTitle').textContent=isNewBest?'You broke your record!':'Your hero needs a recharge';
 $('#resultScore').textContent=battle.score;
 $('#resultBest').textContent='BEST '+best;
 const badge=$('#resultRecord');badge.classList.toggle('hidden',!isNewBest);badge.textContent='NEW BEST!';
 $('#resultMotivation').textContent=isNewBest?`New target: beat ${best} on your next run.`:`Only ${Math.max(1,best-battle.score+1)} more point${best-battle.score+1===1?'':'s'} to set a new best.`;
 $('#resultOverlay').classList.remove('hidden')
}
function useHint(){if(battle.locked||battle.paused||battle.hints<=0)return;const buttons=$$('.answer-btn').filter(b=>!b.disabled&&b.textContent!==battle.current.a);shuffle(buttons).slice(0,1).forEach(b=>{b.disabled=true;b.style.opacity='.22'});battle.hints--;tone(520,.12,'triangle',.025);updateBattleUI()}
$('#useHint').onclick=useHint;$('#pauseHint').onclick=()=>{useHint();closePause()};
function openPause(){if(battle.locked)return;battle.paused=true;$('#pauseOverlay').classList.remove('hidden');updateAudioToggles()}
function closePause(){battle.paused=false;$('#pauseOverlay').classList.add('hidden')}
$('#pauseBattle').onclick=openPause;$('#resumeBattle').onclick=closePause;$('#quickSound').onclick=()=>{state.sfx=!state.sfx;save()};$('#pauseSound').onclick=()=>{state.sfx=!state.sfx;save()};$('#restartBattle').onclick=()=>{const m=battle.mode;endBattle(false);startBattle(m)};$('#leaveBattle').onclick=()=>{endBattle(true);showView('home')};$('#resultAgain').onclick=()=>{const m=battle.mode;$('#resultOverlay').classList.add('hidden');endBattle(false);startBattle(m)};$('#resultHome').onclick=()=>{$('#resultOverlay').classList.add('hidden');endBattle(false);showView('home')};$('#exitBattle').onclick=openPause;

const DESTINATIONS=[
{fromCode:'MEL',fromCity:'Melbourne',fromTz:'Australia/Melbourne',city:'Tokyo',code:'NRT',country:'Japan',distance:8190,hours:10.25,tz:'Asia/Tokyo',near:['Japan','Philippines','South Korea','Taiwan']},
{fromCode:'MEL',fromCity:'Melbourne',fromTz:'Australia/Melbourne',city:'London',code:'LHR',country:'United Kingdom',distance:16900,hours:22,tz:'Europe/London',near:['United Kingdom','France','Belgium','Netherlands']},
{fromCode:'MEL',fromCity:'Melbourne',fromTz:'Australia/Melbourne',city:'Seoul',code:'ICN',country:'South Korea',distance:8560,hours:11,tz:'Asia/Seoul',near:['South Korea','Japan','China','Taiwan']},
{fromCode:'MEL',fromCity:'Melbourne',fromTz:'Australia/Melbourne',city:'Bangkok',code:'BKK',country:'Thailand',distance:7350,hours:9.3,tz:'Asia/Bangkok',near:['Thailand','Malaysia','Cambodia','Vietnam']},
{fromCode:'MEL',fromCity:'Melbourne',fromTz:'Australia/Melbourne',city:'Paris',code:'CDG',country:'France',distance:16780,hours:21.5,tz:'Europe/Paris',near:['France','Belgium','Germany','Switzerland']},
{fromCode:'MEL',fromCity:'Melbourne',fromTz:'Australia/Melbourne',city:'Singapore',code:'SIN',country:'Singapore',distance:6030,hours:7.7,tz:'Asia/Singapore',near:['Singapore','Malaysia','Indonesia','Thailand']},
{fromCode:'MEL',fromCity:'Melbourne',fromTz:'Australia/Melbourne',city:'Auckland',code:'AKL',country:'New Zealand',distance:2620,hours:3.6,tz:'Pacific/Auckland',near:['New Zealand','Australia','Fiji','Tonga']},
{fromCode:'MEL',fromCity:'Melbourne',fromTz:'Australia/Melbourne',city:'Dubai',code:'DXB',country:'UAE',distance:11650,hours:14,tz:'Asia/Dubai',near:['UAE','Oman','Saudi Arabia','Qatar']},
{fromCode:'BKK',fromCity:'Bangkok',fromTz:'Asia/Bangkok',city:'Chiang Mai',code:'CNX',country:'Thailand',distance:584,hours:1.0,tz:'Asia/Bangkok',near:['Bangkok','Ayutthaya','Sukhothai','Chiang Mai']},
{fromCode:'BKK',fromCity:'Bangkok',fromTz:'Asia/Bangkok',city:'Udon Thani',code:'UTH',country:'Thailand',distance:466,hours:1.0,tz:'Asia/Bangkok',near:['Bangkok','Nakhon Ratchasima','Khon Kaen','Udon Thani']},
{fromCode:'BKK',fromCity:'Bangkok',fromTz:'Asia/Bangkok',city:'Khon Kaen',code:'KKC',country:'Thailand',distance:380,hours:1.0,tz:'Asia/Bangkok',near:['Bangkok','Nakhon Ratchasima','Khon Kaen','Udon Thani']},
{fromCode:'BKK',fromCity:'Bangkok',fromTz:'Asia/Bangkok',city:'Phuket',code:'HKT',country:'Thailand',distance:674,hours:1.25,tz:'Asia/Bangkok',near:['Bangkok','Prachuap Khiri Khan','Surat Thani','Phuket']}
];
let currentFlight=DESTINATIONS[0],ticketBought=false,selectedSeat='',flightNo='LN 218';
const fmtTime=(date,tz,seconds=false)=>new Intl.DateTimeFormat('en-AU',{timeZone:tz,hour:'2-digit',minute:'2-digit',...(seconds?{second:'2-digit'}:{}),hour12:false}).format(date);
const hoursLabel=h=>`${Math.floor(h)}h ${String(Math.round((h%1)*60)).padStart(2,'0')}m`;
function randomFlight(){const opts=DESTINATIONS.filter(x=>x.code!==currentFlight.code);currentFlight=pick(opts.length?opts:DESTINATIONS);ticketBought=false;selectedSeat='';flightNo='LN '+Math.floor(100+Math.random()*899);$('#seatSelect').classList.add('hidden');$('#ifeScreen').classList.add('hidden');syncFocusToFlight(true);renderFlight();$('#ticketStatus').textContent='Destination selected. Buy your virtual focus ticket.';randomStory()}
function renderFlight(){
 $('#flightFromCode').textContent=currentFlight.fromCode;$('#flightFromCity').textContent=currentFlight.fromCity;$('#flightCode').textContent=currentFlight.code;$('#flightCity').textContent=currentFlight.city;$('#flightNumber').textContent=flightNo;$('#routeDistance').textContent=currentFlight.distance.toLocaleString()+' km';$('#routeHours').textContent=hoursLabel(currentFlight.hours);const eta=new Date(Date.now()+currentFlight.hours*3600e3);$('#routeEta').textContent=fmtTime(eta,currentFlight.tz);$('#fromLocalLabel').textContent=currentFlight.fromCode+' LOCAL NOW';$('#toLocalLabel').textContent=currentFlight.code+' LOCAL NOW';$('#mapFromCode').textContent=currentFlight.fromCode;$('#mapDestCode').textContent=currentFlight.code;$('#nearbyCountries').innerHTML=currentFlight.near.map(x=>`<span>${x}</span>`).join('');if($('#focusRouteLabel'))$('#focusRouteLabel').textContent=`${currentFlight.fromCode} → ${currentFlight.code} · ${hoursLabel(currentFlight.hours)}`;updateFlightScreen()
}
$('#randomFlight').onclick=randomFlight;
$('#buyTicket').onclick=()=>{ticketBought=true;selectedSeat='';$('#ticketStatus').textContent=`BOARDING PASS READY · ${currentFlight.fromCode} → ${currentFlight.code} · Choose your seat.`;$('#seatSelect').classList.remove('hidden');$('#ifeScreen').classList.add('hidden');buildSeatMap();tone(620,.13,'triangle',.025);randomStory();setTimeout(()=>$('#seatSelect').scrollIntoView({behavior:'smooth',block:'start'}),80)};
function buildSeatMap(){const box=$('#seatMap');box.innerHTML='';const occupied=new Set(['1B','2C','4A','5D','6B']);for(let r=1;r<=6;r++){['A','B','C','D'].forEach((l,i)=>{const seat=r+l,b=document.createElement('button');b.className='seat '+(occupied.has(seat)?'occupied':'');b.textContent=seat;b.disabled=occupied.has(seat);if(selectedSeat===seat)b.classList.add('selected');b.onclick=()=>{selectedSeat=seat;buildSeatMap();$('#seatCurrent').textContent='Seat '+seat;$('#enterSeat').disabled=false;tone(520,.08,'triangle',.02)};box.appendChild(b);if(i===1){const aisle=document.createElement('span');aisle.className='aisle-gap';box.appendChild(aisle)}})}}
$('#enterSeat').onclick=()=>{if(!selectedSeat)return;syncFocusToFlight(true);$('#seatSelect').classList.add('hidden');$('#ifeScreen').classList.remove('hidden');$('#ifeSeat').textContent='SEAT '+selectedSeat;renderFlight();randomStory();tone(700,.12,'sine',.025);setTimeout(()=>$('#ifeScreen').scrollIntoView({behavior:'smooth',block:'start'}),80)};

const STORY_SEEDS={
A1:[['A Window Seat','Mia has a window seat on a plane to {city}. She sees white clouds below. A flight attendant gives her water. Mia opens a small book and reads until the plane begins to land.','window|หน้าต่าง,cloud|เมฆ,land|ลงจอด'],['The Blue Backpack','Tom carries a blue backpack to the airport. He checks his ticket twice and finds Gate 12. On the plane, he puts the bag under his seat and smiles. His trip to {city} is starting.','backpack|กระเป๋าเป้,gate|ประตูขึ้นเครื่อง,seat|ที่นั่ง'],['First Flight','Lina is taking her first flight to {city}. She feels nervous, but the crew is friendly. When the plane moves into the sky, she looks outside and feels excited.','nervous|กังวล,crew|ลูกเรือ,excited|ตื่นเต้น']],
A2:[['The Wrong Gate','Kai is flying to {city}, but he waits at the wrong gate for twenty minutes. He notices the city name on the screen is different. He checks his boarding pass, walks quickly to the correct gate, and arrives just in time.','wrong|ผิด,notice|สังเกต,correct|ถูกต้อง'],['A Seat Change','On the flight to {city}, Emma is sitting beside a family. A child wants to sit near the window, so Emma agrees to change seats. The family thanks her, and she gets a quiet aisle seat instead.','beside|ข้าง ๆ,agree|ตกลง,aisle|ทางเดิน'],['Airport Breakfast','Noah arrives early for his flight to {city}. He has enough time for breakfast. He checks the departure board and leaves the café when boarding begins.','enough|เพียงพอ,departure|การออกเดินทาง,boarding|การขึ้นเครื่อง']],
B1:[['The Unexpected Upgrade','Mara expects an ordinary flight to {city}, but the airline changes her seat because the plane is full. She receives more space and a quieter place to read. The surprise reminds her that travel rarely follows a perfect plan.','ordinary|ธรรมดา,upgrade|อัปเกรด,rarely|แทบไม่'],['A Delay With a Purpose','Leo’s flight to {city} is delayed for two hours. At first he feels annoyed, but he decides to explore the terminal. He discovers a small exhibition about aviation history and enjoys the unexpected break.','annoyed|รำคาญ,terminal|อาคารผู้โดยสาร,aviation|การบิน'],['The View From Above','On the way to {city}, Priya watches the coastline disappear beneath the clouds. The view makes her think about how differently distance can change perspective.','coastline|แนวชายฝั่ง,beneath|ด้านล่าง,perspective|มุมมอง']],
B2:[['The Productive Layover','A six-hour layover on the way to {city} initially feels inconvenient. Instead of scrolling on her phone, Mei divides the time between reading, walking, eating, and reviewing vocabulary. The structured break leaves her surprisingly refreshed.','layover|ช่วงต่อเครื่อง,structured|เป็นระบบ,refreshed|สดชื่น'],['A Conversation at 35,000 Feet','During a flight to {city}, Omar speaks with a passenger who works in a completely different industry. Their conversation shifts from travel to technology and education, showing how an ordinary seat assignment can create an unexpected exchange of ideas.','industry|อุตสาหกรรม,shift|เปลี่ยน,exchange|การแลกเปลี่ยน'],['The Flexible Itinerary','Heavy weather forces Lina to change her route to {city}. Although the disruption is frustrating, she compares several alternatives and chooses a connection that gives her enough time to rest.','itinerary|แผนการเดินทาง,disruption|การหยุดชะงัก,reinforce|ตอกย้ำ']],
C1:[['The Psychology of Departure','As the aircraft leaves for {city}, Elena notices how departure creates a temporary distance from everyday routines. The physical separation seems to make reflection easier, as though altitude itself has altered the scale of her concerns.','temporary|ชั่วคราว,reflection|การใคร่ครวญ,alter|เปลี่ยนแปลง'],['A Controlled Disconnection','On a long flight to {city}, Marcus deliberately keeps his phone in airplane mode even when onboard Wi-Fi becomes available. The absence of constant notifications gradually creates a rare sense of uninterrupted attention.','deliberately|โดยตั้งใจ,absence|การไม่มี,uninterrupted|ไม่ถูกรบกวน'],['Distance and Perspective','Looking down during a flight to {city}, Arun reflects on how distance can transform perception. Problems that felt overwhelming on the ground have not disappeared, but they temporarily seem less absolute and more open to interpretation.','perception|การรับรู้,overwhelming|ท่วมท้น,interpretation|การตีความ']]
};
const FOCUS_STORIES=[];Object.entries(STORY_SEEDS).forEach(([level,seeds])=>{for(let i=0;i<30;i++){const seed=seeds[i%seeds.length],dest=DESTINATIONS[i%DESTINATIONS.length],title=i<seeds.length?seed[0]:`${seed[0]} · ${dest.city} ${Math.floor(i/seeds.length)+1}`,full=seed[1].replaceAll('{city}',dest.city),sentences=full.match(/[^.!?]+[.!?]+/g)||[full],vocab=seed[2].split(',').map(x=>x.split('|'));FOCUS_STORIES.push({level,title,mins:levelIndex(level)<2?'1–2 min read':'2–3 min read',text:sentences,vocab})}});
let currentStoryIndex=-1;
function storyPool(){return FOCUS_STORIES.map((x,i)=>({...x,_i:i})).filter(x=>x.level===state.level)}
function renderStory(story){if(!story)return;currentStoryIndex=story._i??FOCUS_STORIES.indexOf(story);$('#storyLevel').textContent=story.level;$('#shortStoryTitle').textContent=story.title;$('#shortStoryMeta').textContent=`${story.level} · ${story.mins} · Flight to ${currentFlight.city}`;$('#shortStoryText').innerHTML=story.text.map(x=>`<p>${x}</p>`).join('');$('#storyVocab').innerHTML=story.vocab.map(([en,th])=>`<span class="story-chip"><b>${en}</b> · ${th}</span>`).join('')}
function randomStory(){const pool=storyPool(),opts=pool.filter(x=>x._i!==currentStoryIndex);renderStory(pick(opts.length?opts:pool))}
function nextStory(){const pool=storyPool();let pos=pool.findIndex(x=>x._i===currentStoryIndex);renderStory(pool[(pos+1+pool.length)%pool.length])}
$('#nextStory').onclick=nextStory;$('#randomStory').onclick=randomStory;

let focusSeconds=Math.round(currentFlight.hours*3600),focusTotalSeconds=Math.round(currentFlight.hours*3600),focusTimer=null,wakeLock=null,activeFocusId=null;
function syncFocusToFlight(force=false){if(focusTimer&&!force)return;focusTotalSeconds=Math.max(60,Math.round(currentFlight.hours*3600));focusSeconds=focusTotalSeconds;activeFocusId=null;renderFocus();updateFlightScreen()}
function renderFocus(){const h=Math.floor(focusSeconds/3600),m=Math.floor((focusSeconds%3600)/60),s=focusSeconds%60;$('#focusTimer').textContent=h>0?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function currentSession(){return state.focusSessions.find(x=>x.id===activeFocusId)}
function startNewFocusSession(){const s={id:Date.now(),startedAt:Date.now(),endedAt:null,fromCode:currentFlight.fromCode,fromCity:currentFlight.fromCity,city:currentFlight.city,code:currentFlight.code,country:currentFlight.country,seat:selectedSeat,plannedSeconds:focusTotalSeconds,focusedSeconds:0,status:'running'};state.focusSessions.push(s);activeFocusId=s.id;save();return s}
function persistFocus(status){const s=currentSession();if(!s)return;s.status=status;s.focusedSeconds=focusTotalSeconds-focusSeconds;s.endedAt=Date.now();save()}
$('#focusStart').onclick=async()=>{if(!ticketBought||!selectedSeat||$('#ifeScreen').classList.contains('hidden')){toast('Buy a ticket and choose your seat first');return}if(focusTimer){clearInterval(focusTimer);focusTimer=null;persistFocus('paused');$('#focusStart').textContent='Resume focus flight';$('#focusStatus').textContent='Flight paused. Your time is saved.';if(wakeLock)try{await wakeLock.release()}catch(e){};return}let s=currentSession();if(!s||s.status==='completed'||s.city!==currentFlight.city||s.fromCode!==currentFlight.fromCode||s.plannedSeconds!==focusTotalSeconds){s=startNewFocusSession()}else{s.status='running';s.endedAt=null;save()}try{if('wakeLock'in navigator)wakeLock=await navigator.wakeLock.request('screen')}catch(e){}$('#focusStart').textContent='Pause';$('#focusStatus').textContent=`AIRPLANE MODE · ${currentFlight.fromCode} → ${currentFlight.code} · ${selectedSeat}`;focusTimer=setInterval(()=>{focusSeconds=Math.max(0,focusSeconds-1);const sess=currentSession();if(sess)sess.focusedSeconds=focusTotalSeconds-focusSeconds;renderFocus();updateFlightScreen();if(focusSeconds%15===0)localStorage.setItem(STORAGE,JSON.stringify(state));if(focusSeconds<=0){clearInterval(focusTimer);focusTimer=null;persistFocus('completed');$('#focusStart').textContent='Start another focus flight';$('#focusStatus').textContent='Flight complete. Welcome to '+currentFlight.city+'.';tone(880,.3,'sine',.03);renderFocusProgress()}},1000)};
function updateFlightScreen(){if(!currentFlight)return;const now=new Date(),progress=focusTotalSeconds?clamp((focusTotalSeconds-focusSeconds)/focusTotalSeconds,0,1):0;$('#routeProgressFill').style.width=(progress*100)+'%';$('#distanceRemaining').textContent=Math.round(currentFlight.distance*(1-progress)).toLocaleString()+' km';$('#planeOnGlobe').style.left=(12+progress*72)+'%';$('#localTimeNow').textContent=fmtTime(now,currentFlight.fromTz||'Australia/Melbourne');$('#destLocalTime').textContent=fmtTime(now,currentFlight.tz);if($('#fromLocalNow'))$('#fromLocalNow').textContent=fmtTime(now,currentFlight.fromTz||'Australia/Melbourne',true);if($('#toLocalNow'))$('#toLocalNow').textContent=fmtTime(now,currentFlight.tz,true)}
setInterval(()=>{if(currentFlight)updateFlightScreen()},1000);

function formatDuration(sec){sec=Math.max(0,Math.round(sec||0));const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60);return h?`${h}h ${m}m`:`${m}m`}
function renderFocusProgress(){if(!$('#focusCalendar'))return;const sessions=state.focusSessions,total=sessions.reduce((a,s)=>a+(s.focusedSeconds||0),0),done=sessions.filter(s=>s.status==='completed').length;$('#progressFocusTime').textContent=formatDuration(total);$('#progressFlights').textContent=done;const now=new Date(),year=now.getFullYear(),month=now.getMonth();$('#calendarTitle').textContent=now.toLocaleDateString('en-AU',{month:'long',year:'numeric'});const cal=$('#focusCalendar');cal.innerHTML=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>`<div class="cal-week">${x}</div>`).join('');const first=new Date(year,month,1),offset=(first.getDay()+6)%7,days=new Date(year,month+1,0).getDate();for(let i=0;i<offset;i++)cal.insertAdjacentHTML('beforeend','<div class="cal-day empty"></div>');for(let d=1;d<=days;d++){const ds=sessions.filter(s=>{const t=new Date(s.startedAt);return t.getFullYear()===year&&t.getMonth()===month&&t.getDate()===d});const status=ds.some(x=>x.status==='completed')?'done':ds.length?'paused':'';const mins=Math.round(ds.reduce((a,x)=>a+(x.focusedSeconds||0),0)/60);const b=document.createElement('button');b.className='cal-day '+status;b.innerHTML=`<b>${d}</b>${ds.length?`<small>${mins}m</small>`:''}`;b.onclick=()=>renderDayDetail(year,month,d,ds);cal.appendChild(b)}}
function renderDayDetail(y,m,d,sessions){const box=$('#dayDetail'),date=new Date(y,m,d).toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long'});if(!sessions.length){box.innerHTML=`<b>${date}</b><p>No focus flight recorded.</p>`;return}box.innerHTML=`<b>${date}</b>`+sessions.sort((a,b)=>a.startedAt-b.startedAt).map(s=>`<div class="day-flight"><span>${new Date(s.startedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} · ${s.fromCode||'MEL'} → ${s.code} ${s.city}</span><strong>${formatDuration(s.focusedSeconds)} · ${s.status}</strong></div>`).join('')}

const CROSSWORD_THAI={brother:'พี่/น้องชาย',sister:'พี่/น้องสาว',child:'เด็ก',change:'เปลี่ยน',result:'ผล',amount:'จำนวน',behavior:'พฤติกรรม',choice:'ทางเลือก',effect:'ผลกระทบ',goal:'เป้าหมาย',solution:'วิธีแก้',approach:'แนวทาง',issue:'ประเด็น',purpose:'จุดประสงค์',outcome:'ผลลัพธ์',scope:'ขอบเขต'};
function naturalThaiCrossword(w){return CROSSWORD_THAI[w.en]||String(w.th||'').replace(/^(ของฉัน|ของคุณ)\s*/,'').trim()}
function crosswordPool(){return naturalWordPool(state.level).filter(w=>w.en.length>=3&&w.en.length<=8&&!/\s/.test(w.en))}
function startCrossword(){const pool=crosswordPool();$('#crosswordScreen').classList.remove('hidden');$('#crosswordLevel').textContent=state.level+' · NATURAL THAI WORD GRID';buildCrossword(shuffle(pool).slice(0,4))}
$('#exitCrossword').onclick=()=>$('#crosswordScreen').classList.add('hidden');$('#newCrossword').onclick=()=>buildCrossword(shuffle(crosswordPool()).slice(0,4));
function buildCrossword(words){const size=9,grid=Array.from({length:size},()=>Array(size).fill(null)),placements=placeWords(words,size);placements.forEach((p,idx)=>{[...p.word.en.toUpperCase()].forEach((ch,i)=>{const r=p.r+(p.d==='v'?i:0),c=p.c+(p.d==='h'?i:0);if(r<size&&c<size){grid[r][c]=grid[r][c]||{ch,nums:[]};grid[r][c].ch=ch;if(i===0)grid[r][c].nums.push(idx+1)}})});const box=$('#crosswordGrid');box.innerHTML='';grid.flat().forEach(cell=>{const d=document.createElement('div');d.className='cw-cell '+(!cell?'block':'');if(cell){if(cell.nums?.length){const n=document.createElement('span');n.className='num';n.textContent=cell.nums[0];d.appendChild(n)}const inp=document.createElement('input');inp.maxLength=1;inp.dataset.answer=cell.ch;inp.autocomplete='off';inp.inputMode='text';inp.oninput=()=>{inp.value=inp.value.toUpperCase().replace(/[^A-Z]/g,'');checkCrossword()};d.appendChild(inp)}box.appendChild(d)});$('#crosswordClueList').innerHTML=placements.map((p,i)=>`<div class="clue"><b>${i+1}.</b> ${state.language==='english'&&levelIndex(state.level)>=2?p.word.clue:naturalThaiCrossword(p.word)}</div>`).join('');$('#crosswordScore').textContent='0'}
function placeWords(words,size){return words.map((word,idx)=>{const len=word.en.length,d=idx%2===0?'h':'v';let r=(idx*2+1)%Math.max(1,size-(d==='v'?len:1)),c=(idx*2+1)%Math.max(1,size-(d==='h'?len:1));r=Math.min(r,size-(d==='v'?len:1));c=Math.min(c,size-(d==='h'?len:1));return{word,r,c,d}})}
function checkCrossword(){const inputs=$$('#crosswordGrid input');let filled=0,good=0;inputs.forEach(i=>{if(i.value)filled++;if(i.value===i.dataset.answer)good++});$('#crosswordScore').textContent=good;if(filled===inputs.length&&good===inputs.length){state.xp+=40;state.history.unshift({mode:'Crossword',score:40,date:Date.now()});save();toast('Crossword complete +40 XP')}}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),1700)}
if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}))}
renderDashboard();renderFocus();randomFlight();randomStory();

// First-entry loader: runs once on page open. Grammar/Crossword skip mission loading.
setTimeout(()=>runGameLoader(()=>{},1050),40);
