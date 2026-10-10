export const songs = [
  { title: 'Twinkle, Twinkle', subtitle: 'A familiar first melody', icon: '✦', notes: [60,60,67,67,69,69,67,65,65,64,64,62,62,60], description: 'Follow the glowing notes. Take your time — this is your practice space.' },
  { title: 'Ode to Joy', subtitle: 'A little Beethoven', icon: '♫', notes: [64,64,65,67,67,65,64,62,60,60,62,64,64,62,62], description: 'Bring a timeless melody to life, one confident note at a time.' },
  { title: 'Mary Had a Little Lamb', subtitle: 'Build your confidence', icon: '☀', notes: [64,62,60,62,64,64,64,62,62,62,64,67,67], description: 'Practice moving between neighboring notes with this gentle classic.' }
];
export function noteName(note) { return ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][note % 12] + (Math.floor(note / 12) - 1); }
export function createPractice(notes) {
  let index = 0, attempts = 0, streak = 0, best = 0;
  return {
    play(note) { if (index === notes.length) return 'complete'; attempts++; if (note !== notes[index]) { streak = 0; return 'wrong'; } index++; best = Math.max(best, ++streak); return index === notes.length ? 'complete' : 'correct'; },
    get state() { return { index, attempts, best, expected: notes[index], accuracy: attempts ? Math.round(index / attempts * 100) : null }; }
  };
}

// Beginner arrangements: beat lengths describe the sounding duration of each note.
const rhythms = [[1,1,1,1,1,1,2,1,1,1,1,1,1,2], [1,1,1,1,1,1,1,1,1,1,1,1,1.5,.5,2], [1,1,1,1,1,1,2,1,1,2,1,1,2]];
songs.forEach((song, i) => { song.beats = rhythms[i]; song.bpm = 90; });
export function createSession(song, mode = 'wait', bpm = song.bpm) {
  const beat = 60 / bpm;
  let cursor = 1.5;
  const events = song.notes.map((note, i) => { const e = {note, start:cursor, duration:song.beats[i]*beat, status:'pending'}; cursor += e.duration + beat * .18; return e; });
  let time = 0, index = 0, hit = false, held = 0, released = false, correct = 0, missed = 0, streak = 0, best = 0, mistakes = 0, message = 'Follow the bars. Hold until the tail reaches the line.';
  function advance(ok) { events[index].status = ok ? 'correct' : 'missed'; if(ok){correct++;best=Math.max(best,++streak);}else{missed++;streak=0;} index++;hit=false;held=0;released=false; }
  return {
    events,
    cue() {
      if(index===events.length)return;
      time=events[index].start;hit=false;held=0;released=false;events[index].status='pending';
    },
    update(dt) {
      if(index===events.length)return;
      const e=events[index];
      if(mode==='wait') {
        if(time<e.start)time=Math.min(e.start,time+dt);
        else if(hit && !released){time=Math.min(e.start+e.duration,time+dt);held=time-e.start;message=time>=e.start+e.duration?'Release the key.':'Hold the key…';}
        else if(!hit)message=`Play ${noteName(e.note)} and hold.`;
      } else {
        time+=dt;
        if(hit && !released)held+=dt;
        while(index<events.length && time>=events[index].start+events[index].duration+.08){const ok=hit && held>=events[index].duration-.18;advance(ok);message=ok?'Good hold!':'Missed or too short. Keep going.';}
      }
    },
    down(note) {
      if(index===events.length)return;
      const e=events[index];
      if(note!==e.note){mistakes++;streak=0;message=`Try ${noteName(e.note)}.`;return;}
      if(hit)return;
      if(mode==='wait' && time<e.start-.001){message='Wait for the bar to reach the line.';return;}
      if(mode==='flow' && Math.abs(time-e.start)>.2){message='Follow the timing at the line.';return;}
      hit=true;released=false;held=0;e.status='holding';message='Hold the key…';
    },
    up(note) {
      if(index===events.length || note!==events[index].note || !hit || released)return;
      released=true;
      const e=events[index];
      if(mode==='wait') {
        if(held>=e.duration-.08){time=e.start+e.duration;advance(true);message='Good hold! Follow the next bar.';}
        else{hit=false;held=0;time=e.start;e.status='pending';mistakes++;streak=0;message='Released too soon. Try again and hold to the tail.';}
      } else {
        e.status='released';
        if(held>=e.duration-.18 && time>=e.start+e.duration-.08){advance(true);message='Good hold!';}
        else message='Released too soon. Keep following the song.';
      }
    },
    get state(){return {time,index,correct,missed,best,mistakes,held,hit,released,expected:events[index],complete:index===events.length,message,accuracy:correct+missed+mistakes ? Math.round(correct/(correct+missed+mistakes)*100):null};}
  };
}
