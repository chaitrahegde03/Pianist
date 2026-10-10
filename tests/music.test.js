import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession, noteName, songs} from '../music.js';
const fixture={notes:[60,62],beats:[1,2],bpm:60};
test('MIDI octave labels',()=>{assert.equal(noteName(60),'C4');assert.equal(noteName(61),'C♯4');assert.equal(noteName(72),'C5');});
test('onsets follow the exact beat grid and articulation does not stretch tempo',()=>{const s=createSession(fixture,'flow',120);assert.equal(s.events[1].start-s.events[0].start,.5);assert.deepEqual(s.events.map(e=>e.duration),[.45,.9]);assert.deepEqual(s.events.map(e=>e.length),[.5,1]);});
test('complete arrangements contain expected phrases and bar lengths',()=>{
  assert.deepEqual(songs.map(s=>s.beats.reduce((a,b)=>a+b,0)),[48,32,32]);
  assert.deepEqual(songs[0].notes.slice(14,28),[67,67,65,65,64,64,62,67,67,65,65,64,64,62]);
  assert.deepEqual(songs[0].notes.slice(28),songs[0].notes.slice(0,14));
  assert.deepEqual(songs[1].beats.slice(12,15),[1.5,.5,2]);
  assert.equal(songs[2].notes.at(-1),60);assert.equal(songs[2].beats.at(-1),4);
  for(const song of songs)assert.equal(song.notes.length,song.beats.length);
});
test('wait mode freezes and requires hold plus release; short release retries',()=>{const s=createSession(fixture,'wait');s.cue();s.update(10);assert.equal(s.state.time,1.5);s.down(60);s.update(.2);s.up(60);assert.equal(s.state.index,0);assert.equal(s.state.feedback.label,'Hold longer');s.down(60);s.update(2);assert.equal(s.state.index,0);assert.equal(s.state.time,2.4);s.up(60);assert.equal(s.state.index,1);s.update(10);s.down(62);s.update(2);s.up(62);assert.equal(s.state.correct,2);assert.equal(s.state.complete,true);});
test('flow completes without input and counts every missed note',()=>{const s=createSession(fixture);s.cue();s.update(20);assert.equal(s.state.complete,true);assert.equal(s.state.missed,2);});
test('flow tracks a slightly early next note independently of previous held note',()=>{const s=createSession({notes:[60,62],beats:[1,1],bpm:120});s.cue();s.down(60);s.update(.4);s.down(62);assert.equal(s.events[1].status,'holding');assert.equal(s.state.holding.length,2);assert.equal(s.state.feedback.label,'Early');s.up(60);assert.equal(s.state.correct,1);s.update(.55);s.up(62);assert.equal(s.state.correct,2);assert.equal(s.state.missed,0);assert.equal(s.state.complete,true);});
test('release goes to the note that was pressed even after index moves',()=>{const s=createSession({notes:[60,62],beats:[1,1],bpm:120});s.cue();s.down(60);s.update(.6);s.down(62);s.update(.04);assert.equal(s.state.correct,1);s.up(60);assert.equal(s.events[1].releaseAt,null);s.update(.31);s.up(62);assert.equal(s.state.correct,2);assert.equal(s.state.missed,0);});
test('accepted late attacks can succeed at the bar tail or after a full hold',()=>{
  for(const bpm of [60,120,180])for(const beats of [.5,1,2,4])for(const fullHold of [false,true]){
    const s=createSession({notes:[60],beats:[beats],bpm});s.cue();
    const e=s.events[0],late=Math.min(.2,60/bpm*.35,e.duration*.25)*.9;
    s.update(late);assert.equal(s.canPlay(60),true);s.down(60);
    s.update(fullHold?e.duration:e.duration-late);s.up(60);s.update(1);
    assert.equal(s.state.correct,1,`${bpm} BPM, ${beats} beats, full hold ${fullHold}`);
    assert.equal(s.state.missed,0);
  }
});
test('an accepted late press still needs a sustained hold, not a tap',()=>{
  for(const bpm of [60,120,180])for(const beats of [.5,1,2,4]){
    const s=createSession({notes:[60],beats:[beats],bpm});s.cue();const e=s.events[0];
    s.update(Math.min(.2,60/bpm*.35,e.duration*.25));s.down(60);s.update(.01);s.up(60);s.update(10);
    assert.equal(s.state.correct,0);assert.equal(s.state.missed,1);
  }
});
test('Wait accepts the next highlighted key before its onset and advances without losing elapsed time',()=>{
  const s=createSession({notes:[60,62],beats:[1,1],bpm:120},'wait');s.cue();s.down(60);s.update(.45);s.up(60);
  assert.equal(s.canPlay(62),true);s.down(62);assert.equal(s.events[1].status,'holding');
  const before=s.state.time;s.update(.1);assert.ok(Math.abs(s.state.time-before-.1)<1e-8);
  s.update(.4);s.up(62);assert.equal(s.state.correct,2);assert.equal(s.state.mistakes,0);
});
test('the playable cue matches input acceptance on short notes and overlapping pitches',()=>{
  const piece={notes:[60,62,64],beats:[1,.5,1],bpm:120};
  for(const mode of ['flow','wait']){
    const s=createSession(piece,mode);s.cue();s.down(60);assert.equal(s.canPlay(60),false);
    s.update(.36);s.up(60);assert.equal(s.canPlay(62),mode==='wait');
    s.update(.09);assert.equal(s.canPlay(62),true);s.down(62);assert.equal(s.events[1].status,'holding');
    assert.equal(s.canPlay(62),false);
  }
});
test('short releases and wrong notes produce feedback and reduce accuracy',()=>{const s=createSession(fixture);s.cue();s.down(61);assert.equal(s.state.feedback.label,'Wrong key');s.down(60);s.update(.1);s.up(60);assert.equal(s.state.feedback.label,'Too short');s.update(20);assert.equal(s.state.missed,2);assert.equal(s.state.accuracy,0);});
test('cue preserves scored notes and clears unfinished holds',()=>{const s=createSession(fixture);s.cue();s.down(60);s.update(.9);s.up(60);s.update(.1);s.down(62);s.cue();assert.equal(s.state.correct,1);assert.equal(s.state.time,s.events[1].start);assert.equal(s.state.holding.length,0);assert.equal(s.events[1].hitAt,null);});
test('each complete melody is playable on its intended tempo without accumulated drift',()=>{for(const song of songs){const s=createSession(song);s.cue();for(const e of s.events){s.update(Math.max(0,e.start-s.state.time));s.down(e.note);s.update(e.duration);s.up(e.note);}assert.equal(s.state.correct,song.notes.length);assert.equal(s.state.missed,0);assert.equal(s.state.complete,true);const last=s.events.at(-1);assert.ok(Math.abs(last.start+last.length-(1.5+song.beats.reduce((a,b)=>a+b,0)*60/song.bpm))<1e-8);}});
import {keyboardRange,keyGeometry} from '../music.js';
import {lessons} from '../lessons.js';
test('song keyboard shows C-to-B groups covering exact MIDI pitches',()=>{for(const song of songs){const r=keyboardRange(song.notes);assert.equal(r.start,60);assert.equal(r.end,71);assert.equal(r.whites.length,7);assert.ok(song.notes.every(n=>n>=r.start&&n<=r.end));}const upper=keyboardRange([72,74,79]);assert.equal(upper.start,72);assert.equal(upper.end,83);assert.equal(upper.whites[0],72);});
test('crossing octave boundaries expands only the necessary groups',()=>{const r=keyboardRange([59,60,72]);assert.equal(r.start,48);assert.equal(r.end,83);assert.equal(r.whites.length,21);assert.equal(keyboardRange([60,72]).whites.length,14);assert.throws(()=>keyboardRange([]));assert.throws(()=>keyboardRange([128]));});
test('white and black note centers align with dynamic keyboard geometry',()=>{const one=keyboardRange([60,69]);assert.equal(keyGeometry(60,one.whites).center,.5/7);assert.equal(keyGeometry(61,one.whites).center,1/7);const two=keyboardRange([60,79]);assert.equal(keyGeometry(72,two.whites).center,7.5/14);assert.equal(keyGeometry(73,two.whites).center,8/14);});
test('lesson exercises have valid rhythms and complete at their prescribed settings',()=>{assert.equal(lessons.filter(l=>!l.optional).length,5);for(const lesson of lessons){assert.equal(lesson.practice.notes.length,lesson.practice.beats.length);assert.ok(lesson.practice.beats.every(b=>b>0));const s=createSession(lesson.practice,lesson.mode,lesson.bpm);s.cue();for(const e of s.events){s.update(Math.max(0,e.start-s.state.time));s.down(e.note);s.update(e.duration);s.up(e.note);}assert.equal(s.state.correct,lesson.practice.notes.length);assert.equal(s.state.complete,true);}assert.equal(keyboardRange(lessons.at(-1).practice.notes).whites.length,14);});
