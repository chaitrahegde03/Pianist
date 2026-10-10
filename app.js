import {songs, noteName, createSession} from './music.js';
const $=id=>document.getElementById(id);
const white=[60,62,64,65,67,69,71,72],letters=['A','S','D','F','G','H','J','K'];
let selected=0,mode='flow',session,running=false,last=0,midi,audio,demo=false;
let bars=[],rollHeight=380,lastUI=0,renderedTime=0,retryFrom=0,retryAt=0,lastFeedback=null;
const keys=new Map(),active=new Map(),voices=new Map(),demoNotes=new Set();
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function text(id,value){const e=$(id),s=String(value);if(e.textContent!==s)e.textContent=s;}
function sync(now=performance.now()){if(running){session.update(Math.max(0,(now-last)/1000));last=now;}}
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
    b.classList.toggle('target',$('guide').checked&&!s.complete&&s.time>=s.expected.start-.2&&s.expected.note===note);
  }
  $('piano-scene').classList.toggle('is-holding',s.holding.length>0||demoNotes.size>0);
}
function render(){
  const s=session.state;
  document.querySelector('.stats').style.visibility=demo?'hidden':'visible';
  text('count',demo?'LISTENING':`${s.correct+s.missed} / ${session.events.length} notes`);
  $('progress').style.transform=`scaleX(${(s.correct+s.missed)/session.events.length})`;
  text('correct',s.correct);text('accuracy',s.accuracy===null?'—':`${s.accuracy}%`);text('streak',s.best);
  text('feedback',demo?'Listen to the melody. The highlighted keys show each note.':s.complete?'Song complete. Play the first note to repeat.':!running?`Play ${noteName(s.expected.note)} to ${s.index?'continue':'begin'}.`:mode==='wait'?'Hold to the tail. Release to move on.':'Follow the beat. Keep playing.');
  text('roll-status',demo?'MELODY PREVIEW':s.complete?'COMPLETE':!running?`PLAY ${noteName(s.expected.note)} TO BEGIN`:mode==='wait'&&!s.hit?'WAITING FOR YOUR KEY':'');
  $('complete-overlay').hidden=!s.complete||demo;
  text('complete-summary',`${s.correct} correct holds · ${s.missed} missed notes`);
  $('transport').hidden=!running||demo;
  text('listen',demo?'■ Stop melody':'♫ Hear melody');
  for(let i=0;i<bars.length;i++){
    const e=session.events[i],name=`falling-note ${e.status} ${i===s.index?'active-note':''}`;
    if(bars[i].className!==name)bars[i].className=name;
  }
  if(s.feedback&&s.feedback!==lastFeedback&&!demo){
    lastFeedback=s.feedback;
    const el=document.createElement('div'),index=white.indexOf(s.feedback.note);
    el.className=`note-feedback ${s.feedback.kind}`;el.textContent=s.feedback.label;
    el.style.left=`${(index<0?white.filter(n=>n<s.feedback.note).length:index+.5)/8*100}%`;
    $('key-feedback').replaceChildren(el);setTimeout(()=>el.remove(),900);
  }
}
function stopDemo(){demo=false;for(const note of demoNotes)stopSound(note);demoNotes.clear();}
function reset(){
  running=false;releaseAll();stopDemo();retryAt=0;lastFeedback=null;$('key-feedback').replaceChildren();
  session=createSession(songs[selected],mode,Number($('tempo').value));session.cue();renderedTime=session.state.time;
  text('song-title',songs[selected].title);
  $('notes').replaceChildren(...session.events.map(e=>{
    const el=document.createElement('div');el.innerHTML=`<span>${noteName(e.note)}</span>`;el.className='falling-note';
    el.style.left=`${(white.indexOf(e.note)+.24)/8*100}%`;el.style.width=`${.52/8*100}%`;el.style.height=`${e.duration*100}px`;return el;
  }));
  [...$('songs').children].forEach((b,i)=>{b.classList.toggle('selected',i===selected);b.setAttribute('aria-pressed',i===selected);});
  bars=[...$('notes').children];rollHeight=$('notes').clientHeight;motion(performance.now());render();
}
function startSound(note){try{
  if(voices.has(note))stopSound(note);audio??=new AudioContext();audio.resume();
  const osc=audio.createOscillator(),gain=audio.createGain(),filter=audio.createBiquadFilter();
  osc.setPeriodicWave(audio.createPeriodicWave(new Float32Array(9),new Float32Array([0,1,.32,.16,.09,.045,.025,.012,.008])));
  osc.frequency.value=440*2**((note-69)/12);filter.type='lowpass';filter.frequency.value=2600;filter.Q.value=.5;
  gain.gain.setValueAtTime(0,audio.currentTime);gain.gain.linearRampToValueAtTime(.16,audio.currentTime+.012);gain.gain.setTargetAtTime(.055,audio.currentTime+.025,.28);
  osc.connect(filter);filter.connect(gain);gain.connect(audio.destination);osc.start();voices.set(note,{osc,gain,filter});
}catch{}}
function stopSound(note){const v=voices.get(note);if(!v)return;v.gain.gain.cancelAndHoldAtTime(audio.currentTime);v.gain.gain.setTargetAtTime(.0001,audio.currentTime,.045);v.osc.stop(audio.currentTime+.3);v.osc.onended=()=>{v.osc.disconnect();v.gain.disconnect();v.filter.disconnect();};voices.delete(note);}
function down(note,source,sound=false){
  sync();if(demo)reset();
  if(session.state.complete&&note===songs[selected].notes[0])reset();
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
  b.onclick=()=>{selected=i;reset();closeLibrary();};$('songs').append(b);
}
for(let note=60;note<=72;note++){
  const b=document.createElement('button'),isWhite=white.includes(note);b.className=`key ${isWhite?'white':'black'}`;b.dataset.note=note;b.setAttribute('aria-label',`Play ${noteName(note)}`);
  b.innerHTML=`<span>${noteName(note)}${isWhite?`<small>${letters[white.indexOf(note)]}</small>`:''}</span><i class="hold-meter" aria-hidden="true"></i>`;
  if(!isWhite)b.style.left=`${white.filter(n=>n<note).length/8*100}%`;
  b.onpointerdown=e=>{e.preventDefault();b.focus();b.setPointerCapture(e.pointerId);down(note,`pointer-${e.pointerId}`,true);};
  b.onpointermove=e=>{if(!b.hasPointerCapture(e.pointerId))return;const source=`pointer-${e.pointerId}`,target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.key'),next=target?Number(target.dataset.note):undefined;for(const [held,sources]of [...active])if(sources.has(source)&&held!==next)up(held,source);if(next!==undefined)down(next,source,true);};
  b.onpointerup=b.onpointercancel=b.onlostpointercapture=e=>{for(const [held]of [...active])up(held,`pointer-${e.pointerId}`);};
  b.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();down(note,'button',true);}};
  b.onkeyup=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();up(note,'button');}};keys.set(note,b);$('keyboard').append(b);
}
document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||$('library').open||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const i=letters.indexOf(e.key.toUpperCase());if(i!==-1){e.preventDefault();down(white[i],'computer',true);}});
document.addEventListener('keyup',e=>{const i=letters.indexOf(e.key.toUpperCase());if(i!==-1)up(white[i],'computer');});
function pause(){releaseAll();running=false;stopDemo();session.cue();retryAt=0;renderedTime=session.state.time;motion(performance.now());render();}
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
$('transport').onclick=pause;$('restart').onclick=reset;$('tempo').onchange=reset;$('guide').onchange=()=>{motion(performance.now());render();};
$('wait-mode').onclick=()=>setMode('wait');$('flow-mode').onclick=()=>setMode('flow');
$('library-toggle').onclick=()=>{pause();$('library').showModal();$('library-toggle').setAttribute('aria-expanded','true');};
$('library-close').onclick=closeLibrary;$('library').addEventListener('close',()=>{$('library-toggle').setAttribute('aria-expanded','false');});
$('library').addEventListener('click',e=>{if(e.target===$('library')){const r=$('library').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeLibrary();}});
$('listen').onclick=()=>{if(demo){reset();return;}reset();demo=true;session=createSession(songs[selected],'flow',Number($('tempo').value));session.cue();running=true;last=performance.now();render();};
function playDemo(){
  const time=session.state.time;
  for(const e of session.events){if(e.hitAt===null&&time>=e.start&&time<e.start+e.duration){session.down(e.note);startSound(e.note);demoNotes.add(e.note);}if(e.hitAt!==null&&e.releaseAt===null&&time>=e.start+e.duration){session.up(e.note);stopSound(e.note);demoNotes.delete(e.note);}}
}
function bindDevices(){const names=[];for(const input of midi.inputs.values()){
  const source=`midi-${input.id}`;input.onmidimessage=({data})=>{const type=data[0]&0xf0;if(type===0x90&&data[2]>0)down(data[1],source);else if(type===0x80||(type===0x90&&data[2]===0))up(data[1],source);};
  if(input.state==='connected')names.push(input.name||'MIDI piano');else for(const [note]of active)up(note,source);
}text('connection',names.length?`● ${names.join(', ')}`:'No MIDI piano found');text('connect',names.length?'✓ Piano connected':'Check MIDI devices');}
$('connect').onclick=async()=>{if(!navigator.requestMIDIAccess){text('connection','MIDI needs Chrome/Edge and HTTPS or localhost');return;}try{midi??=await navigator.requestMIDIAccess({sysex:false});midi.onstatechange=bindDevices;bindDevices();}catch{text('connection','Allow MIDI in browser settings and retry');}};
function frame(now){
  if(running){sync(now);if(demo)playDemo();if(session.state.complete){running=false;if(demo){reset();}else releaseAll();render();}}
  motion(now);if(now-lastUI>=80){render();lastUI=now;}last=now;requestAnimationFrame(frame);
}
new ResizeObserver(()=>{rollHeight=$('notes').clientHeight;motion(performance.now());}).observe($('notes'));
setMode('flow');requestAnimationFrame(frame);
