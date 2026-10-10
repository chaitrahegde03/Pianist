import {songs, noteName, createSession} from './music.js';
const $ = id => document.getElementById(id);
const white=[60,62,64,65,67,69,71,72], letters=['A','S','D','F','G','H','J','K'];
let selected=0, mode='wait', session, running=false, last=0, midi, audio;
let bars=[], rollHeight=380, lastUI=0, renderedTime=0, retryFrom=0, retryAt=0;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function text(id,value){const el=$(id), next=String(value);if(el.textContent!==next)el.textContent=next;}
function sync(now=performance.now()){if(running){session.update(Math.max(0,(now-last)/1000));last=now;}}
function motion(now){
  const s=session.state;
  if(s.time<renderedTime-.01 && !retryAt){retryFrom=renderedTime;retryAt=now;}
  const fraction=reducedMotion.matches?1:Math.min(1,(now-retryAt)/180);
  const visualTime=retryAt?retryFrom+(s.time-retryFrom)*(1-(1-fraction)**3):s.time;
  if(retryAt && fraction===1)retryAt=0;
  renderedTime=visualTime;
  for(let i=0;i<bars.length;i++){
    const e=session.events[i], bottom=rollHeight+(visualTime-e.start)*100;
    const visible=bottom>=-10 && bottom-e.duration*100<=rollHeight+30;
    if(bars[i].hidden===visible)bars[i].hidden=!visible;
    if(visible)bars[i].style.transform=`translate3d(0,${bottom-e.duration*100}px,0)`;
  }
}
const keys=new Map(), active=new Map(), voices=new Map();
function render(){
  const s=session.state;
  text('count',`${s.index} / ${session.events.length} notes`);
  $('progress').style.transform=`scaleX(${s.index/session.events.length})`;
  text('correct',s.correct);text('accuracy',s.accuracy===null?'—':`${s.accuracy}%`);text('streak',s.best);
  text('next-note',s.complete?'Complete ✓':`${noteName(s.expected.note)} · ${Math.max(0,s.expected.duration-s.held).toFixed(1)}s`);
  text('feedback',s.complete?`${s.correct} correct holds · ${s.missed} missed notes`:!running?'Press Start practice when you’re ready.':s.message);
  $('complete-overlay').hidden=!s.complete;
  text('transport',s.complete?'Play again':running?'Pause':'Start practice');
  text('roll-status',s.complete?'Complete ✓':!running?'Ready when you are':s.time<session.events[0].start?`Get ready · ${Math.ceil(session.events[0].start-s.time)}`:mode==='wait'&&s.time>=s.expected.start?(s.hit?'Hold → release':'Waiting for your key'):'Follow the bars ↓');
  $('piano-scene').classList.toggle('is-holding',running && s.hit && !s.released);
  for(const [note,b] of keys)b.classList.toggle('target',$('guide').checked && running && !s.complete && s.time>=s.expected.start-.2 && note===s.expected.note);
  for(let i=0;i<bars.length;i++){
    const e=session.events[i], name=`falling-note ${e.status} ${i===s.index?'active-note':''}`;
    if(bars[i].className!==name)bars[i].className=name;
  }
}

function reset(){
  running=false; releaseAll();retryAt=0;renderedTime=0;session=createSession(songs[selected],mode,Number($('tempo').value));
  $('song-title').textContent=songs[selected].title;
  $('song-description').textContent='Longer bars mean longer holds. Play at the line; release at the tail.';
  $('notes').replaceChildren(...session.events.map(e=>{const el=document.createElement('div');el.textContent=noteName(e.note);el.className='falling-note';el.style.left=`${(white.indexOf(e.note)+.12)/8*100}%`;el.style.width=`${.76/8*100}%`;el.style.height=`${e.duration*100}px`;return el;}));
  [...$('songs').children].forEach((b,i)=>{b.classList.toggle('selected',i===selected);b.setAttribute('aria-pressed',i===selected);});bars=[...$('notes').children];rollHeight=$('notes').clientHeight;motion(performance.now());render();
}
function startSound(note){try{
  audio??=new AudioContext();audio.resume();
  const osc=audio.createOscillator(),gain=audio.createGain(),filter=audio.createBiquadFilter();
  const real=new Float32Array(9),imag=new Float32Array([0,1,.32,.16,.09,.045,.025,.012,.008]);
  osc.setPeriodicWave(audio.createPeriodicWave(real,imag));osc.frequency.value=440*2**((note-69)/12);
  filter.type='lowpass';filter.frequency.value=2600;filter.Q.value=.5;
  gain.gain.setValueAtTime(0,audio.currentTime);gain.gain.linearRampToValueAtTime(.16,audio.currentTime+.012);gain.gain.setTargetAtTime(.055,audio.currentTime+.025,.28);
  osc.connect(filter);filter.connect(gain);gain.connect(audio.destination);osc.start();voices.set(note,{osc,gain,filter});
}catch{}}
function stopSound(note){const v=voices.get(note);if(!v)return;v.gain.gain.cancelAndHoldAtTime(audio.currentTime);v.gain.gain.setTargetAtTime(.0001,audio.currentTime,.045);v.osc.stop(audio.currentTime+.3);v.osc.onended=()=>{v.osc.disconnect();v.gain.disconnect();v.filter.disconnect();};voices.delete(note);}

function down(note,source,sound=false){sync();let sources=active.get(note);if(sources?.has(source))return;if(!sources){sources=new Set();active.set(note,sources);if(sound)startSound(note);if(running)session.down(note);}sources.add(source);keys.get(note)?.classList.add('pressed');render();}
function up(note,source){sync();const sources=active.get(note);if(!sources || !sources.delete(source))return;if(sources.size)return;active.delete(note);keys.get(note)?.classList.remove('pressed');stopSound(note);if(running)session.up(note);render();}
function releaseAll(){for(const [note,sources] of [...active])for(const source of [...sources])up(note,source);}
function setMode(value){mode=value;$('wait-mode').setAttribute('aria-pressed',mode==='wait');$('flow-mode').setAttribute('aria-pressed',mode==='flow');$('mode-badge').textContent=`${mode.toUpperCase()} MODE`;$('mode-help').textContent=mode==='wait'?'Wait mode pauses for the correct key. Hold to the end of the bar, then release.':'Flow mode keeps the tempo. Missed notes pass by — keep playing.';reset();}
for(const [i,song] of songs.entries()){const b=document.createElement('button');b.className='song';b.innerHTML=`<span class="song-icon">${song.icon}</span><span><b>${song.title}</b><small>${song.subtitle}</small></span><span>↗</span>`;b.onclick=()=>{selected=i;reset();};$('songs').append(b);}
for(let note=60;note<=72;note++){const b=document.createElement('button'),isWhite=white.includes(note);b.className=`key ${isWhite?'white':'black'}`;b.setAttribute('aria-label',`Play ${noteName(note)}`);b.innerHTML=`<span>${noteName(note)}${isWhite?`<small>${letters[white.indexOf(note)]}</small>`:''}</span>`;if(!isWhite)b.style.left=`${white.filter(n=>n<note).length/8*100}%`;b.onpointerdown=e=>{e.preventDefault();b.focus();b.setPointerCapture(e.pointerId);down(note,`pointer-${e.pointerId}`,true);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=e=>up(note,`pointer-${e.pointerId}`);b.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();down(note,'button',true);}};b.onkeyup=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();up(note,'button');}};keys.set(note,b);$('keyboard').append(b);}
document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const i=letters.indexOf(e.key.toUpperCase());if(i!==-1){e.preventDefault();down(white[i],'computer',true);}});
document.addEventListener('keyup',e=>{const i=letters.indexOf(e.key.toUpperCase());if(i!==-1)up(white[i],'computer');});
window.addEventListener('blur',()=>{releaseAll();running=false;render();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseAll();running=false;render();}});
$('transport').onclick=()=>{if(session.state.complete)reset();if(running){releaseAll();running=false;}else{releaseAll();running=true;last=performance.now();}render();};
$('focus').onclick=()=>{const focused=document.body.classList.toggle('focus-practice');$('focus').setAttribute('aria-pressed',focused);text('focus',focused?'Exit focus':'Focus view');rollHeight=$('notes').clientHeight;motion(performance.now());};
document.addEventListener('keydown',e=>{if(e.key==='Escape' && document.body.classList.contains('focus-practice'))$('focus').click();});
$('restart').onclick=reset;$('tempo').onchange=reset;$('guide').onchange=render;$('wait-mode').onclick=()=>setMode('wait');$('flow-mode').onclick=()=>setMode('flow');
function bindDevices(){const names=[];for(const input of midi.inputs.values()){const source=`midi-${input.id}`;input.onmidimessage=({data})=>{const type=data[0]&0xf0;if(type===0x90&&data[2]>0)down(data[1],source);else if(type===0x80||(type===0x90&&data[2]===0))up(data[1],source);};if(input.state==='connected')names.push(input.name||'MIDI piano');else for(const [note]of active)up(note,source);} $('connection').textContent=names.length?`● Connected · ${names.join(', ')}`:'No MIDI piano found. Check your cable.';$('connect').textContent=names.length?'✓ Piano connected':'Check MIDI devices';}
$('connect').onclick=async()=>{if(!navigator.requestMIDIAccess){$('connection').textContent='Use Chrome or Edge on HTTPS or localhost for MIDI.';return;}try{midi??=await navigator.requestMIDIAccess({sysex:false});midi.onstatechange=bindDevices;bindDevices();}catch{$('connection').textContent='MIDI access unavailable. Allow MIDI in browser settings and retry.';}};
function frame(now){
  if(running){sync(now);if(session.state.complete){running=false;releaseAll();render();}}
  motion(now);
  if(now-lastUI>=80){render();lastUI=now;}
  last=now;requestAnimationFrame(frame);
}
new ResizeObserver(()=>{rollHeight=$('notes').clientHeight;motion(performance.now());}).observe($('notes'));
reset();requestAnimationFrame(frame);
