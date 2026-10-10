import {songs, noteName, createSession, keyboardRange, keyGeometry} from './music.js';
import {lessons} from './lessons.js';
import {createTempoState,formatBpm,playbackSchedule} from './tempo.js';
const $=id=>document.getElementById(id);
let white=[],range;
const letters=['A','S','D','F','G','H','J','K','L',';','Q','W','E','R','T','Y','U','I','O','P','[',']'];
let activeLesson=null,lessonChoice=0,currentView='home',practiceReady=false;
let progress={};
try{const saved=JSON.parse(localStorage.getItem('pianist-lessons-v1')||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))progress=saved;}catch{}
function currentPiece(){return activeLesson?lessons.find(l=>l.id===activeLesson).practice:songs[selected];}
function saveProgress(){try{localStorage.setItem('pianist-lessons-v1',JSON.stringify(progress));}catch{}}
let selected=0,mode='flow',session,running=false,last=0,midi,audio,demo=false;
let bars=[],rollHeight=380,lastUI=0,renderedTime=0,retryFrom=0,retryAt=0,lastFeedback=null;
const keys=new Map(),active=new Map(),voices=new Map(),demoNotes=new Set(),previewVoices=new Set();
const tempo=createTempoState();tempo.activate('song',songs[0].id,songs[0].bpm);
let demoOrigin=0,previewRequest=0;
function updateTempoControls(){
  const t=tempo.value;$('tempo').value=t.percent;
  text('tempo-readout',`${formatBpm(t.bpm)} BPM`);
  text('tempo-reference',`${t.kind==='lesson'?'Lesson base':'Full tempo'} ${formatBpm(t.referenceBpm)} BPM`);
  $('tempo-readout').title=`${t.kind==='lesson'?'Lesson':'Arrangement'} reference: ${formatBpm(t.referenceBpm)} BPM · ${t.percent}% speed`;
  $('listen').title=`Hear the melody at ${formatBpm(t.bpm)} BPM (${t.percent}% speed)`;
}
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function text(id,value){const e=$(id),s=String(value);if(e.textContent!==s)e.textContent=s;}
function sync(now=performance.now()){if(running){
  const dt=demo?Math.max(0,audio.currentTime-demoOrigin-(session.state.time-session.events[0].start)):Math.max(0,(now-last)/1000);
  session.update(dt);last=now;
}}
function motion(now){
  const s=session.state;
  if(s.time<renderedTime-.01&&!retryAt){retryFrom=renderedTime;retryAt=now;}
  const fraction=reducedMotion.matches?1:Math.min(1,(now-retryAt)/180);
  const visualTime=retryAt?retryFrom+(s.time-retryFrom)*(1-(1-fraction)**3):s.time;
  if(retryAt&&fraction===1)retryAt=0;renderedTime=visualTime;
  for(let i=0;i<bars.length;i++){
    const e=session.events[i],bottom=rollHeight+(visualTime-e.start)*100;
    const visible=bottom>=-10&&bottom-e.duration*100<=rollHeight+30;
    if(bars[i].hidden===visible)bars[i].hidden=!visible;
    if(visible)bars[i].style.transform=`translate3d(0,${bottom-e.duration*100}px,0)`;
  }
  const beatPixels=session.beat*100;
  $('beat-grid').style.backgroundImage=`repeating-linear-gradient(to top,transparent 0,transparent ${beatPixels-1}px,#8cc3b51c ${beatPixels-1}px,#8cc3b51c ${beatPixels}px)`;
  $('beat-grid').style.backgroundPositionY=`${(visualTime-session.events[0].start)*100}px`;
  for(const [note,b]of keys){
    const e=s.holding.find(e=>e.note===note),isHeld=!!e;
    b.classList.toggle('matched',isHeld);
    b.querySelector('.hold-meter').style.transform=`scaleX(${e?Math.min(1,Math.max(0,(s.time-e.start)/e.duration)):0})`;
    b.classList.toggle('pressed',active.has(note)||demoNotes.has(note));
    b.classList.toggle('target',$('guide').checked&&session.canPlay(note));
  }
  $('piano-scene').classList.toggle('is-holding',s.holding.length>0||demoNotes.size>0);
}
function render(){
  const s=session.state;
  document.querySelector('.stats').style.visibility=demo?'hidden':'visible';
  text('count',demo?'LISTENING':`${s.correct+s.missed} / ${session.events.length} notes`);
  $('progress').style.transform=`scaleX(${(s.correct+s.missed)/session.events.length})`;
  text('correct',s.correct);text('accuracy',s.accuracy===null?'—':`${s.accuracy}%`);text('streak',s.best);
  text('feedback',demo?`Listen at ${formatBpm(tempo.value.bpm)} BPM · ${tempo.value.percent}% speed.`:s.complete?'Song complete. Play the first note to repeat.':!running?`Play ${noteName(s.expected.note)} to ${s.index?'continue':'begin'}.`:mode==='wait'?'Wait mode pauses between notes. Hold to the tail.':'Follow the beat. Keep playing.');
  text('roll-status',demo?'MELODY PREVIEW':s.complete?'COMPLETE':!running?`PLAY ${noteName(s.expected.note)} TO BEGIN`:mode==='wait'&&!s.hit?'WAITING FOR YOUR KEY':'');
  $('complete-overlay').hidden=!s.complete||demo;
  document.querySelector('#complete-overlay strong').textContent=activeLesson?'Exercise complete':'Song complete';
  text('complete-summary',`${s.correct} correct holds · ${s.missed} missed notes`);
  $('next-lesson').hidden=!activeLesson;
  const passed=s.correct/session.events.length>=.8;
  text('lesson-result',activeLesson?(passed?'Lesson complete. You’re ready for the next step.':'Try again: aim for at least 80% correct holds.'):'');
  $('transport').hidden=!running||demo;
  text('listen',demo?'■ Stop melody':'♫ Hear melody');
  for(let i=0;i<bars.length;i++){
    const e=session.events[i],name=`falling-note ${e.status} ${i===s.index?'active-note':''}`;
    if(bars[i].className!==name)bars[i].className=name;
  }
  if(s.feedback&&s.feedback!==lastFeedback&&!demo){
    lastFeedback=s.feedback;
    const el=document.createElement('div'),position=keyGeometry(s.feedback.note,white);
    el.className=`note-feedback ${s.feedback.kind}`;el.textContent=s.feedback.label;
    el.style.left=`${Math.max(.06,Math.min(.94,position.center))*100}%`;
    $('key-feedback').replaceChildren(el);setTimeout(()=>el.remove(),900);
  }
}
function stopDemo(){
  previewRequest++;demo=false;demoNotes.clear();
  for(const v of previewVoices){try{v.gain.gain.cancelAndHoldAtTime(audio.currentTime);v.gain.gain.setTargetAtTime(.0001,audio.currentTime,.015);v.osc.stop(audio.currentTime+.08);}catch{}}previewVoices.clear();
}
function reset(){
  running=false;releaseAll();stopDemo();retryAt=0;lastFeedback=null;$('key-feedback').replaceChildren();
  session=createSession(currentPiece(),mode,tempo.value.bpm);session.cue();renderedTime=session.state.time;
  updateTempoControls();buildKeyboard();
  text('song-title',currentPiece().title);
  $('notes').replaceChildren(...session.events.map(e=>{
    const el=document.createElement('div');el.innerHTML=`<span>${noteName(e.note)}</span>`;el.className='falling-note';
    const geometry=keyGeometry(e.note,white);
    el.style.left=`${(geometry.center-geometry.width*.26)*100}%`;el.style.width=`${geometry.width*.52*100}%`;el.style.height=`${e.duration*100}px`;return el;
  }));
  [...$('songs').children].forEach((b,i)=>{b.classList.toggle('selected',i===selected);b.setAttribute('aria-pressed',i===selected);});
  bars=[...$('notes').children];rollHeight=$('notes').clientHeight;motion(performance.now());render();
}
function makeVoice(note,at,releaseAt=null){
  const osc=audio.createOscillator(),gain=audio.createGain(),filter=audio.createBiquadFilter();
  osc.setPeriodicWave(audio.createPeriodicWave(new Float32Array(9),new Float32Array([0,1,.32,.16,.09,.045,.025,.012,.008])));
  osc.frequency.value=440*2**((note-69)/12);filter.type='lowpass';filter.frequency.value=2600;filter.Q.value=.5;
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.16,at+.012);gain.gain.setTargetAtTime(.055,at+.025,.28);
  osc.connect(filter);filter.connect(gain);gain.connect(audio.destination);
  const voice={osc,gain,filter};
  osc.onended=()=>{osc.disconnect();gain.disconnect();filter.disconnect();previewVoices.delete(voice);};
  osc.start(at);
  if(releaseAt!==null){gain.gain.setTargetAtTime(.0001,releaseAt,.025);osc.stop(releaseAt+.18);}
  return voice;
}
function startSound(note){try{if(voices.has(note))stopSound(note);audio??=new AudioContext();audio.resume();voices.set(note,makeVoice(note,audio.currentTime));}catch{}}
function stopSound(note){const v=voices.get(note);if(!v)return;v.gain.gain.cancelAndHoldAtTime(audio.currentTime);v.gain.gain.setTargetAtTime(.0001,audio.currentTime,.025);v.osc.stop(audio.currentTime+.18);voices.delete(note);}
function down(note,source,sound=false){
  if(currentView!=='practice')return;
  sync();if(demo)reset();
  if(session.state.complete&&note===currentPiece().notes[0])reset();
  let sources=active.get(note);if(sources?.has(source))return;
  if(!sources){sources=new Set();active.set(note,sources);if(sound)startSound(note);
    if(!running&&note===session.state.expected?.note){session.cue();retryAt=0;renderedTime=session.state.time;running=true;last=performance.now();}
    if(running)session.down(note);
  }
  sources.add(source);motion(performance.now());render();
}
function up(note,source){sync();const sources=active.get(note);if(!sources||!sources.delete(source))return;if(sources.size)return;active.delete(note);stopSound(note);if(running)session.up(note);motion(performance.now());render();}
function releaseAll(){for(const [note,sources]of [...active])for(const source of [...sources])up(note,source);}
function setMode(value){mode=value;$('wait-mode').setAttribute('aria-pressed',mode==='wait');$('flow-mode').setAttribute('aria-pressed',mode==='flow');reset();}
function closeLibrary(){$('library').close();$('library-toggle').setAttribute('aria-expanded','false');}
for(const [i,song]of songs.entries()){
  const b=document.createElement('button');b.className='song';b.innerHTML=`<span class="song-icon">${song.icon}</span><span><b>${song.title}</b><small>${song.subtitle}</small></span><span>→</span>`;
  b.onclick=()=>{selected=i;activeLesson=null;practiceReady=true;tempo.activate('song',song.id,song.bpm);setMode('flow');closeLibrary();navigate('practice');};$('songs').append(b);
}
function buildKeyboard(){
  range=keyboardRange(currentPiece().notes);white=range.whites;
  keys.clear();$('keyboard').replaceChildren();
  $('piano-scene').style.setProperty('--key-step',`${100/white.length}%`);
  text('keyboard-range',`Keyboard ${noteName(range.start)}–${noteName(range.end)} · ${white.length/7} octave ${white.length===7?'group':'groups'}`);
  text('computer-hint',` Computer keys: ${letters.slice(0,white.length).join(' ')}`);
for(let note=range.start;note<=range.end;note++){
  const b=document.createElement('button'),isWhite=white.includes(note),geometry=keyGeometry(note,white);b.className=`key ${isWhite?'white':'black'}`;b.dataset.note=note;b.setAttribute('aria-label',`Play ${noteName(note)}`);
  b.innerHTML=`<span>${noteName(note)}${isWhite?`<small>${letters[white.indexOf(note)]||''}</small>`:''}</span><i class="hold-meter" aria-hidden="true"></i>`;
  b.style.width=`${geometry.width*100}%`;
  if(!isWhite)b.style.left=`${geometry.center*100}%`;
  b.onpointerdown=e=>{e.preventDefault();b.focus();b.setPointerCapture(e.pointerId);down(note,`pointer-${e.pointerId}`,true);};
  b.onpointermove=e=>{if(!b.hasPointerCapture(e.pointerId))return;const source=`pointer-${e.pointerId}`,target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.key'),next=target?Number(target.dataset.note):undefined;for(const [held,sources]of [...active])if(sources.has(source)&&held!==next)up(held,source);if(next!==undefined)down(next,source,true);};
  b.onpointerup=b.onpointercancel=b.onlostpointercapture=e=>{for(const [held]of [...active])up(held,`pointer-${e.pointerId}`);};
  b.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();down(note,'button',true);}};
  b.onkeyup=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();up(note,'button');}};keys.set(note,b);$('keyboard').append(b);
}
}
document.addEventListener('keydown',e=>{if(currentView!=='practice'||e.repeat||e.ctrlKey||e.metaKey||e.altKey||$('library').open||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const i=letters.indexOf(e.key.toUpperCase());if(i!==-1&&white[i]!==undefined){e.preventDefault();down(white[i],'computer',true);}});
document.addEventListener('keyup',e=>{const i=letters.indexOf(e.key.toUpperCase());if(i!==-1&&white[i]!==undefined)up(white[i],'computer');});
function pause(){releaseAll();running=false;stopDemo();session.cue();retryAt=0;renderedTime=session.state.time;motion(performance.now());render();}
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
$('transport').onclick=pause;$('restart').onclick=reset;$('tempo').onchange=()=>{tempo.setSpeed(Number($('tempo').value));reset();};$('guide').onchange=()=>{motion(performance.now());render();};
$('wait-mode').onclick=()=>setMode('wait');$('flow-mode').onclick=()=>setMode('flow');
$('library-toggle').onclick=()=>{pause();$('library').showModal();$('library-toggle').setAttribute('aria-expanded','true');};
$('library-close').onclick=closeLibrary;$('library').addEventListener('close',()=>{$('library-toggle').setAttribute('aria-expanded','false');});
$('library').addEventListener('click',e=>{if(e.target===$('library')){const r=$('library').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeLibrary();}});
$('listen').onclick=async()=>{
  if(demo){reset();return;}
  reset();const request=previewRequest;
  try{
    audio??=new AudioContext();await audio.resume();
    if(request!==previewRequest||currentView!=='practice')return;
    demo=true;session=createSession(currentPiece(),'flow',tempo.value.bpm);session.cue();
    demoOrigin=audio.currentTime+.04;
    for(const event of playbackSchedule(session.events))previewVoices.add(makeVoice(event.note,demoOrigin+event.offset,demoOrigin+event.offset+event.duration));
    running=true;last=performance.now();render();
  }catch{reset();text('feedback','Melody audio could not start. Try Hear melody again.');}
};
function playDemo(){
  if(audio.currentTime<demoOrigin){demoNotes.clear();return;}
  const time=session.state.time;
  demoNotes.clear();
  for(const e of session.events){
    if(e.hitAt===null&&time>=e.start&&time<e.start+e.duration)session.down(e.note);
    if(e.hitAt!==null&&e.releaseAt===null&&time>=e.start+e.duration)session.up(e.note);
    if(time>=e.start&&time<e.start+e.duration)demoNotes.add(e.note);
  }
}
function bindDevices(){const names=[];for(const input of midi.inputs.values()){
  const source=`midi-${input.id}`;input.onmidimessage=({data})=>{const type=data[0]&0xf0;if(type===0x90&&data[2]>0)down(data[1],source);else if(type===0x80||(type===0x90&&data[2]===0))up(data[1],source);};
  if(input.state==='connected')names.push(input.name||'MIDI piano');else for(const [note]of active)up(note,source);
}text('connection',names.length?`● ${names.join(', ')}`:'No MIDI piano found');text('connect',names.length?'✓ Piano connected':'Check MIDI devices');}
$('connect').onclick=async()=>{if(!navigator.requestMIDIAccess){text('connection','MIDI needs Chrome/Edge and HTTPS or localhost');return;}try{midi??=await navigator.requestMIDIAccess({sysex:false});midi.onstatechange=bindDevices;bindDevices();}catch{text('connection','Allow MIDI in browser settings and retry');}};
function frame(now){
  if(currentView!=='practice'){last=now;requestAnimationFrame(frame);return;}
  if(running){sync(now);if(demo)playDemo();if(session.state.complete){running=false;if(demo){reset();}else{releaseAll();recordLesson();}render();}}
  motion(now);if(now-lastUI>=80){render();lastUI=now;}last=now;requestAnimationFrame(frame);
}
new ResizeObserver(()=>{rollHeight=$('notes').clientHeight;motion(performance.now());}).observe($('notes'));

function recordLesson(){
  if(!activeLesson)return;
  const score=Math.round(session.state.correct/session.events.length*100);
  if(score>=80){progress[activeLesson]={completed:true,best:Math.max(score,progress[activeLesson]?.best||0)};saveProgress();renderPlan();}
}
function renderPlan(){
  const core=lessons.filter(l=>!l.optional),done=core.filter(l=>progress[l.id]?.completed).length;
  text('course-count',`${done} / ${core.length}`);
  text('begin-learning',done?'Continue learning →':'Begin learning →');
  $('lesson-plan').replaceChildren(...lessons.map((lesson,i)=>{
    const button=document.createElement('button');button.className=`lesson-card ${progress[lesson.id]?.completed?'completed':''}`;
    button.innerHTML=`<span class="lesson-index">${progress[lesson.id]?.completed?'✓':String(i+1).padStart(2,'0')}</span><span class="lesson-card-copy"><b>${lesson.title}</b><small>${lesson.subtitle}</small></span><span class="lesson-meta">${lesson.optional?'OPTIONAL':lesson.duration}<small>${progress[lesson.id]?.completed?'Completed':lesson.mode==='wait'?'Wait practice':'Flow practice'}</small></span><span class="lesson-arrow">→</span>`;
    button.onclick=()=>{lessonChoice=i;showLesson();navigate('lesson');};return button;
  }));
}
function showLesson(){
  const lesson=lessons[lessonChoice];text('lesson-number',`LESSON ${String(lessonChoice+1).padStart(2,'0')} / ${lesson.duration}`);
  text('lesson-title',lesson.title);text('lesson-goal',lesson.goal);
  $('lesson-steps').replaceChildren(...lesson.steps.map(step=>{const li=document.createElement('li');li.textContent=step;return li;}));
  text('lesson-settings',`${lesson.mode==='wait'?'Wait':'Flow'} mode · ${lesson.bpm} BPM · Complete at least 80% of holds`);
}
function navigate(view){if(location.hash===`#${view}`)showView(view);else location.hash=view;}
function showView(view){
  if(!['home','lessons','lesson','practice'].includes(view))view='home';
  if(view==='practice'&&!practiceReady){navigate('lessons');return;}
  if(currentView==='practice'&&view!=='practice')pause();
  currentView=view;document.body.dataset.view=view;
  for(const name of ['home','lessons','lesson','practice'])$(name+'-page').hidden=name!==view;
  document.querySelectorAll('header nav a').forEach(a=>{if(a.hash===`#${view}`)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(view==='lessons')renderPlan();
  if(view==='lesson')showLesson();
  if(view==='practice'){
    text('practice-context',activeLesson?'LESSON PRACTICE':'SONG PRACTICE');
    text('practice-goal',activeLesson?lessons.find(l=>l.id===activeLesson).goal:'');
    $('practice-back').textContent=activeLesson?'← Lesson plan':'← Lessons';
    rollHeight=$('notes').clientHeight;motion(performance.now());render();
  }else $(view==='home'?'home-title':view==='lesson'?'lesson-title':'lessons-title').focus({preventScroll:true});
  window.scrollTo(0,0);
}
$('lesson-back').onclick=()=>navigate('lessons');
$('practice-back').onclick=()=>navigate('lessons');
$('next-lesson').onclick=()=>navigate('lessons');
$('lesson-start').onclick=()=>{
  const lesson=lessons[lessonChoice];activeLesson=lesson.id;practiceReady=true;tempo.activate('lesson',lesson.id,lesson.bpm);setMode(lesson.mode);navigate('practice');
};
$('course-songs').onclick=()=>{$('library').showModal();$('library-toggle').setAttribute('aria-expanded','true');};
window.addEventListener('hashchange',()=>showView(location.hash.slice(1)||'home'));
renderPlan();showLesson();setMode('flow');showView(location.hash.slice(1)||'home');requestAnimationFrame(frame);
