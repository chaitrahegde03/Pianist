// Reference tempos are choices for these arrangements, not universal tempos for every performance.
const twinkleA = [60,60,67,67,69,69,67,65,65,64,64,62,62,60];
const twinkleB = [67,67,65,65,64,64,62,67,67,65,65,64,64,62];
const twinkleRhythm = [1,1,1,1,1,1,2,1,1,1,1,1,1,2];
export const songs = [
  {id:'twinkle',title:'Twinkle, Twinkle', subtitle:'Complete melody · 12 bars', icon:'✦', bpm:112,
    notes:[...twinkleA,...twinkleB,...twinkleA], beats:[...twinkleRhythm,...twinkleRhythm,...twinkleRhythm]},
  {id:'ode-to-joy',title:'Ode to Joy', subtitle:'Beethoven’s theme · 8 bars', icon:'♫', bpm:108,
    notes:[64,64,65,67,67,65,64,62,60,60,62,64,64,62,62,64,64,65,67,67,65,64,62,60,60,62,64,62,60,60],
    beats:[1,1,1,1,1,1,1,1,1,1,1,1,1.5,.5,2,1,1,1,1,1,1,1,1,1,1,1,1,1.5,.5,2]},
  {id:'mary',title:'Mary Had a Little Lamb', subtitle:'Complete melody · 8 bars', icon:'☀', bpm:120,
    notes:[64,62,60,62,64,64,64,62,62,62,64,67,67,64,62,60,62,64,64,64,64,62,62,64,62,60],
    beats:[1,1,1,1,1,1,2,1,1,2,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,4]}
];
export function noteName(note) { return ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][note % 12] + (Math.floor(note / 12) - 1); }
export function createSession(song, mode = 'flow', bpm = song.bpm) {
  if(!Number.isFinite(bpm)||bpm<=0)throw new Error('BPM must be positive');
  const beat = 60 / bpm, window = Math.min(.2, beat * .35);
  let cursor = 1.5;
  const events = song.notes.map((note, i) => {
    const length = song.beats[i] * beat;
    const event = {note, start:cursor, duration:length * .9, length, status:'pending', hitAt:null, releaseAt:null, result:null};
    cursor += length;
    return event;
  });
  let time=0, mistakes=0, message='Follow the notes.', feedback=null;
  const heldNotes=new Map();
  const index=()=>{const i=events.findIndex(e=>e.result===null);return i===-1?events.length:i;};
  const coverage=e=>e.hitAt===null?0:Math.max(0,Math.min(e.releaseAt ?? time,e.start+e.duration)-Math.max(e.hitAt,e.start));
  // Judge the attack and release separately against the visible bar. An accepted
  // late attack must still be able to succeed by holding through its tail.
  const onsetWindow=e=>Math.min(window,e.duration*.25);
  const sufficient=e=>e.hitAt!==null && (e.releaseAt ?? time)>=e.start+e.duration-Math.min(.12,e.duration*.2)-1e-8;
  function candidate(note){
    const expected=events[index()];
    if(!expected || heldNotes.has(note))return;
    if(mode==='wait')return note===expected.note && expected.hitAt===null && time>=expected.start-onsetWindow(expected)-1e-8 ? expected : undefined;
    return events.filter(e=>e.note===note && e.result===null && e.hitAt===null && Math.abs(time-e.start)<=onsetWindow(e)+1e-8)
      .sort((a,b)=>Math.abs(time-a.start)-Math.abs(time-b.start))[0];
  }
  function notify(note,label,kind){feedback={note,label,kind,at:time};message=label;}
  function settle(e,ok){if(e.result!==null)return;e.result=ok?'correct':'missed';e.status=e.result;}
  return {
    events, beat,
    canPlay(note){return !!candidate(note);},
    cue(){
      const i=index();if(i===events.length)return;
      time=events[i].start;heldNotes.clear();
      for(const e of events)if(e.result===null){e.hitAt=null;e.releaseAt=null;e.status='pending';}
      feedback=null;
    },
    update(dt){
      const i=index();if(i===events.length)return;
      if(mode==='flow'){
        time+=Math.max(0,dt);
        for(const e of events)if(e.result===null && time>=e.start+e.duration+window){const ok=sufficient(e);settle(e,ok);if(!ok)notify(e.note,e.hitAt===null?'Missed':'Too short','miss');}
      }else{
        const e=events[i];
        if(heldNotes.get(e.note)===e){time=Math.min(e.start+e.duration,time+Math.max(0,dt));message=time>=e.start+e.duration?'Release':'Hold';}
        else if(time<e.start)time=Math.min(e.start,time+Math.max(0,dt));
        else message=`Play ${noteName(e.note)}`;
      }
    },
    down(note){
      if(index()===events.length || heldNotes.has(note))return;
      const e=candidate(note);
      if(!e){mistakes++;notify(note,events.some(e=>e.note===note && e.result===null)?'Off beat':'Wrong key','miss');return;}
      e.hitAt=time;e.releaseAt=null;e.status='holding';heldNotes.set(note,e);
      const offset=time-e.start;notify(note,mode==='wait' || Math.abs(offset)<.07?'On time':offset<0?'Early':'Late','hit');
    },
    up(note){
      const e=heldNotes.get(note);if(!e)return;
      heldNotes.delete(note);e.releaseAt=time;
      if(e.result!==null)return;
      if(sufficient(e)){
        if(mode==='wait')time=e.start+e.duration;
        settle(e,true);notify(note,'Nice hold','hit');
      }else if(mode==='wait'){
        time=e.start;e.hitAt=null;e.releaseAt=null;e.status='pending';mistakes++;notify(note,'Hold longer','miss');
      }else{e.status='short';notify(note,'Too short','miss');}
    },
    get state(){
      const i=index(), correct=events.filter(e=>e.result==='correct').length, missed=events.filter(e=>e.result==='missed').length;
      let streak=0,best=0;for(const e of events){if(e.result===null)break;streak=e.result==='correct'?streak+1:0;best=Math.max(best,streak);}
      const holding=[...heldNotes.values()].filter(e=>e.result===null);
      return {time,index:i,correct,missed,best,mistakes,expected:events[i],complete:i===events.length,message,feedback,holding,
        held:events[i]?coverage(events[i]):0,hit:holding.length>0,released:holding.length===0,
        accuracy:correct+missed+mistakes?Math.round(correct/(correct+missed+mistakes)*100):null};
    }
  };
}

// Show only complete octave groups that contain the piece's pitches.
export function keyboardRange(notes) {
  if(!notes.length || notes.some(n=>!Number.isInteger(n)||n<0||n>127))throw new Error('Expected MIDI notes between 0 and 127');
  const start=Math.floor(Math.min(...notes)/12)*12;
  const end=Math.min(127,Math.floor(Math.max(...notes)/12)*12+11);
  const whites=[];
  for(let note=start;note<=end;note++)if([0,2,4,5,7,9,11].includes(note%12))whites.push(note);
  return {start,end,whites};
}
export function keyGeometry(note, whites) {
  const i=whites.indexOf(note);
  return {center:i<0?whites.filter(n=>n<note).length/whites.length:(i+.5)/whites.length,
    width:(i<0?.58:1)/whites.length,black:i<0};
}
