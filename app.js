import {songs, noteName, createSession} from './music.js';
const $ = id => document.getElementById(id);
const white=[60,62,64,65,67,69,71,72], letters=['A','S','D','F','G','H','J','K'];
let selected=0, mode='wait', session, running=false, last=0, midi, audio;
const keys=new Map(), active=new Map(), voices=new Map();
function render(){
  const s=session.state;
  $('count').textContent=`${s.index} / ${session.events.length} notes`;
  $('progress').style.width=`${s.index/session.events.length*100}%`;
  $('correct').textContent=s.correct; $('accuracy').textContent=s.accuracy===null?'—':`${s.accuracy}%`; $('streak').textContent=s.best;
  $('next-note').textContent=s.complete?'Complete ✓':`${noteName(s.expected.note)} · ${Math.max(0,s.expected.duration-s.held).toFixed(1)}s`;
  $('feedback').textContent=s.complete?`${s.correct} correct holds · ${s.missed} missed notes` : !running?'Press Start practice when you’re ready.':s.message;
  $('complete-overlay').hidden=!s.complete;
  $('transport').textContent=s.complete?'Play again':running?'Pause':'Start practice';
  $('roll-status').textContent=s.complete?'Complete ✓':!running?'Ready when you are':mode==='wait'&&s.time>=s.expected.start?(s.hit?'Hold → release':'Waiting for your key'):'Follow the bars ↓';
  for(const [note,b] of keys)b.classList.toggle('target',$('guide').checked && running && !s.complete && s.time>=s.expected.start-.2 && note===s.expected.note);
  const floor=$('notes').clientHeight, speed=100;
  for(const [i,el] of [...$('notes').children].entries()){
    const e=session.events[i], bottom=floor+(s.time-e.start)*speed;
    el.style.height=`${e.duration*speed}px`;
    el.style.transform=`translateY(${bottom-e.duration*speed}px)`;
    el.className=`falling-note ${e.status} ${i===s.index?'active-note':''}`;
  }
}
function reset(){
  running=false; releaseAll(); session=createSession(songs[selected],mode,Number($('tempo').value));
  $('song-title').textContent=songs[selected].title;
  $('song-description').textContent='Longer bars mean longer holds. Play at the line; release at the tail.';
  $('notes').replaceChildren(...session.events.map(e=>{const el=document.createElement('div');el.textContent=noteName(e.note);el.className='falling-note';el.style.left=`${(white.indexOf(e.note)+.12)/8*100}%`;el.style.width=`${.76/8*100}%`;return el;}));
  [...$('songs').children].forEach((b,i)=>{b.classList.toggle('selected',i===selected);b.setAttribute('aria-pressed',i===selected);}); render();
}
function startSound(note){try{audio??=new AudioContext();audio.resume();const osc=audio.createOscillator(), gain=audio.createGain();osc.type='triangle';osc.frequency.value=440*2**((note-69)/12);gain.gain.setValueAtTime(.001,audio.currentTime);gain.gain.linearRampToValueAtTime(.13,audio.currentTime+.02);osc.connect(gain);gain.connect(audio.destination);osc.start();voices.set(note,{osc,gain});}catch{}}
function stopSound(note){const v=voices.get(note);if(!v)return;v.gain.gain.cancelScheduledValues(audio.currentTime);v.gain.gain.setTargetAtTime(.001,audio.currentTime,.025);v.osc.stop(audio.currentTime+.15);voices.delete(note);}
function down(note,source,sound=false){let sources=active.get(note);if(sources?.has(source))return;if(!sources){sources=new Set();active.set(note,sources);if(sound)startSound(note);if(running)session.down(note);}sources.add(source);keys.get(note)?.classList.add('pressed');render();}
function up(note,source){const sources=active.get(note);if(!sources || !sources.delete(source))return;if(sources.size)return;active.delete(note);keys.get(note)?.classList.remove('pressed');stopSound(note);if(running)session.up(note);render();}
function releaseAll(){for(const [note,sources] of [...active])for(const source of [...sources])up(note,source);}
function setMode(value){mode=value;$('wait-mode').setAttribute('aria-pressed',mode==='wait');$('flow-mode').setAttribute('aria-pressed',mode==='flow');$('mode-badge').textContent=`${mode.toUpperCase()} MODE`;$('mode-help').textContent=mode==='wait'?'Wait mode pauses for the correct key. Hold to the end of the bar, then release.':'Flow mode keeps the tempo. Missed notes pass by — keep playing.';reset();}
for(const [i,song] of songs.entries()){const b=document.createElement('button');b.className='song';b.innerHTML=`<span class="song-icon">${song.icon}</span><span><b>${song.title}</b><small>${song.subtitle}</small></span><span>↗</span>`;b.onclick=()=>{selected=i;reset();};$('songs').append(b);}
for(let note=60;note<=72;note++){const b=document.createElement('button'),isWhite=white.includes(note);b.className=`key ${isWhite?'white':'black'}`;b.setAttribute('aria-label',`Play ${noteName(note)}`);b.innerHTML=`<span>${noteName(note)}${isWhite?`<small>${letters[white.indexOf(note)]}</small>`:''}</span>`;if(!isWhite)b.style.left=`${white.filter(n=>n<note).length/8*100}%`;b.onpointerdown=e=>{e.preventDefault();b.focus();b.setPointerCapture(e.pointerId);down(note,`pointer-${e.pointerId}`,true);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=e=>up(note,`pointer-${e.pointerId}`);b.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();down(note,'button',true);}};b.onkeyup=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();up(note,'button');}};keys.set(note,b);$('keyboard').append(b);}
document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const i=letters.indexOf(e.key.toUpperCase());if(i!==-1){e.preventDefault();down(white[i],'computer',true);}});
document.addEventListener('keyup',e=>{const i=letters.indexOf(e.key.toUpperCase());if(i!==-1)up(white[i],'computer');});
window.addEventListener('blur',()=>{releaseAll();running=false;render();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseAll();running=false;render();}});
$('transport').onclick=()=>{if(session.state.complete)reset();if(running){releaseAll();running=false;}else{releaseAll();running=true;last=performance.now();}render();};
$('restart').onclick=reset;$('tempo').onchange=reset;$('guide').onchange=render;$('wait-mode').onclick=()=>setMode('wait');$('flow-mode').onclick=()=>setMode('flow');
function bindDevices(){const names=[];for(const input of midi.inputs.values()){const source=`midi-${input.id}`;input.onmidimessage=({data})=>{const type=data[0]&0xf0;if(type===0x90&&data[2]>0)down(data[1],source);else if(type===0x80||(type===0x90&&data[2]===0))up(data[1],source);};if(input.state==='connected')names.push(input.name||'MIDI piano');else for(const [note]of active)up(note,source);} $('connection').textContent=names.length?`● Connected · ${names.join(', ')}`:'No MIDI piano found. Check your cable.';$('connect').textContent=names.length?'✓ Piano connected':'Check MIDI devices';}
$('connect').onclick=async()=>{if(!navigator.requestMIDIAccess){$('connection').textContent='Use Chrome or Edge on HTTPS or localhost for MIDI.';return;}try{midi??=await navigator.requestMIDIAccess({sysex:false});midi.onstatechange=bindDevices;bindDevices();}catch{$('connection').textContent='MIDI access unavailable. Allow MIDI in browser settings and retry.';}};
function frame(now){if(running){session.update((now-last)/1000);if(session.state.complete){running=false;releaseAll();}render();}last=now;requestAnimationFrame(frame);}
reset();requestAnimationFrame(frame);
