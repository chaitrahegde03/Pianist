import {songs, noteName, createPractice} from './music.js';
const $ = id => document.getElementById(id);
let selected = 0, practice, midi, audio, travelStart = 0, arrived = false;
const travelDuration = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 750;
const white = [60,62,64,65,67,69,71,72], letters = ["A","S","D","F","G","H","J","K"];
const keyButtons = new Map();
function render() {
  const s = practice.state, song = songs[selected];
  $('count').textContent = `${s.index} / ${song.notes.length} notes`;
  $('progress').style.width = `${s.index / song.notes.length * 100}%`;
  $('correct').textContent = s.index; $('accuracy').textContent = s.accuracy === null ? '—' : `${s.accuracy}%`; $('streak').textContent = s.best;
  $('next-note').textContent = s.expected === undefined ? 'Beautifully done! ✦' : `Next: ${noteName(s.expected)}`;
  $('complete-overlay').hidden = s.expected !== undefined;
  for (const [note, button] of keyButtons) button.classList.toggle('target', $('guide').checked && arrived && note === s.expected);
}
function buildRoll() {
  $('notes').replaceChildren(...songs[selected].notes.slice(practice.state.index, practice.state.index + 6).map((note, offset) => {
    const el = document.createElement('div'); el.className = 'falling-note' + (offset === 0 ? ' active-note' : '');
    el.textContent = noteName(note); el.dataset.offset = offset;
    const keyIndex = white.indexOf(note);
    el.style.left = `${(keyIndex + .12) / 8 * 100}%`;
    el.style.width = `${.76 / 8 * 100}%`;
    return el;
  }));
}
function beginTravel() {
  arrived = false; travelStart = performance.now(); buildRoll();
  $('roll-status').textContent = 'Follow the notes ↓';
}
function animateRoll(now) {
  if (practice.state.expected !== undefined) {
    const fraction = travelDuration ? Math.min(1, (now - travelStart) / travelDuration) : 1;
    const floor = $('notes').clientHeight - 46;
    for (const el of $('notes').children) {
      el.style.transform = `translateY(${floor - (1 - fraction) * 100 - Number(el.dataset.offset) * 74}px)`;
    }
    if (fraction === 1 && !arrived) {
      arrived = true; $('roll-status').textContent = 'Waiting for your note';
      $('feedback').textContent = `Play ${noteName(practice.state.expected)}. The song will wait for you.`;
      $('notes').classList.add('waiting'); render();
    }
  }
  requestAnimationFrame(animateRoll);

}
function selectSong(i) { selected = i; practice = createPractice(songs[i].notes); $('song-title').textContent = songs[i].title; $('song-description').textContent = songs[i].description; $('feedback').textContent = 'Follow the note down to the play line.'; $('notes').classList.remove('waiting'); beginTravel(); [...$('songs').children].forEach((b,j) => { b.classList.toggle('selected',i===j); b.setAttribute('aria-pressed',i===j); }); render(); }
function play(note, sound = false) {
  if (sound) { try { audio ??= new AudioContext(); audio.resume(); const osc = audio.createOscillator(), gain = audio.createGain(); osc.type = 'triangle'; osc.frequency.value = 440 * 2 ** ((note-69)/12); gain.gain.setValueAtTime(.18,audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.65); osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime+.65); } catch {} }
  const button = keyButtons.get(note); if (button) { button.classList.add('pressed'); setTimeout(()=>button.classList.remove('pressed'),180); }
  if (!arrived || practice.state.expected === undefined) return;
  const result = practice.play(note); $('feedback').textContent = result === 'wrong' ? `You played ${noteName(note)}. Try ${noteName(practice.state.expected)}.` : result === 'complete' ? 'Song complete! Pick another melody or play again.' : 'Nice! Follow the next note.'; if(result !== 'wrong') { $('notes').classList.remove('waiting'); beginTravel(); } if(result === 'complete') $('roll-status').textContent = 'Complete ✓'; render();
}
songs.forEach((song,i) => { const b = document.createElement('button'); b.className='song'; b.innerHTML = `<span class="song-icon">${song.icon}</span><span><b>${song.title}</b><small>${song.subtitle}</small></span><span>↗</span>`; b.onclick = () => selectSong(i); $('songs').append(b); });
for (let note=60; note<=72; note++) { const b = document.createElement('button'); const isWhite = white.includes(note); b.className = isWhite ? 'key white' : 'key black'; b.setAttribute('aria-label', `Play ${noteName(note)}`); b.innerHTML = `<span>${noteName(note)}${isWhite ? `<small>${letters[white.indexOf(note)]}</small>` : ''}</span>`; if (!isWhite) b.style.left = `${white.filter(n=>n<note).length / 8 * 100}%`; b.onpointerdown = e => { e.preventDefault(); b.focus(); play(note,true); }; b.onclick = e => { if(e.detail===0) play(note,true); }; keyButtons.set(note,b); $('keyboard').append(b); }
document.addEventListener('keydown',e => { if(e.repeat || e.ctrlKey || e.metaKey || e.altKey || ['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return; const i=letters.indexOf(e.key.toUpperCase()); if(i!==-1) { e.preventDefault(); play(white[i],true); } });
$('restart').onclick = () => selectSong(selected); $('guide').onchange=render;
function bindDevices() { let names=[]; for(const input of midi.inputs.values()) { input.onmidimessage = ({data}) => { if((data[0]&0xf0)===0x90 && data[2]>0)play(data[1]); }; if(input.state==='connected')names.push(input.name || 'MIDI piano'); } $('connection').textContent = names.length ? `● Connected · ${names.join(', ')}` : '● No MIDI piano found. Check your cable; on-screen practice is available.'; $('connect').textContent = names.length ? '✓ Piano connected' : 'Check MIDI devices ↗'; }
$('connect').onclick=async()=> { if(!navigator.requestMIDIAccess) { $('connection').textContent='Web MIDI requires Chrome or Edge and HTTPS (or localhost). You can practice on screen.'; return; } try { midi ??= await navigator.requestMIDIAccess({sysex:false}); midi.onstatechange=bindDevices; bindDevices(); } catch { $('connection').textContent='MIDI access was denied or unavailable. Allow MIDI in browser site settings, then try again.'; } };
selectSong(0);
requestAnimationFrame(animateRoll);
