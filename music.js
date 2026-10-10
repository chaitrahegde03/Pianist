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
