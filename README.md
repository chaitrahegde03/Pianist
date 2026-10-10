# Pianist

A browser piano learning app with USB MIDI, duration-based falling notes, and three beginner melodies.

## Run locally

From this folder, run `python3 -m http.server 3000` (Windows: `py -m http.server 3000`) and open `http://localhost:3000` in Chrome or Edge. `npm start` runs the same server. No dependency installation is needed. Run `npm test` with Node.js 18+ to verify the lesson engine and song arrangements.

## Learning path

The app opens on a landing page. Choose **Begin learning** to see the lesson plan before entering practice or the songbook.

1. **Meet middle C:** locate C4 and play with your right thumb.
2. **Your first five notes:** practice C–G with a relaxed five-finger position.
3. **Give each note its time:** practice one-, two-, and four-beat holds and releases.
4. **Find a steady beat:** follow a short pattern in Flow mode at 60 BPM.
5. **Play your first melody:** play the complete Mary Had a Little Lamb arrangement.
6. **Explore the next octave:** an optional two-octave exercise.

Each lesson includes an explanation and playable exercise. Finish with at least 80% correct holds to mark it complete. Completed lessons and best completion scores are saved in browser local storage; all lessons remain available to revisit. Finger guidance is instructional: MIDI verifies notes and timing, not fingering or posture. The songbook is available from the lesson plan whenever you feel ready; completing all lessons is recommended, not required.

## Learn a song

Use **Open songbook** from the lesson plan, or **Songs** while practicing, to choose a melody. **Flow is the default**. Play the first highlighted key to start immediately; there is no start button or count-in.

The practice keyboard stays visible in the viewport and includes only complete C-to-B octave groups containing the selected piece’s notes. Current songs use C4–B4; the optional two-octave exercise uses C4–B5. Upper/lower pieces display their actual octave pitches, without folding MIDI input into middle C. Black keys, falling bars, and computer shortcuts use the same dynamic range. Each falling bar sits above its key, and its length represents how long to hold it. Play when the bar's bottom reaches the keys; release when its tail reaches them. The pressed key and matching bar brighten together, a meter on the key shows progress through the hold, and timing feedback appears beside the key.

- **Flow:** the song follows the tempo even when notes are missed. Each note has its own onset and release tracking, so a slightly early next note can overlap the previous hold. Onset tolerance is at most 200 ms and scales down at faster tempos. Hold tolerance is at most 120 ms and scales down for short notes.
- **Wait:** the song pauses for the correct note, advances while held, and waits for release. Short holds retry the same note.
- **Hear melody:** hear a synthesized reference and watch the keys. Stop it or play a key to return to practice. Preview scores are discarded.
- Use a connected piano, hold/slide across on-screen keys with mouse or touch, or hold computer keys **A S D F G H J K**.
- Changing song, tempo, or mode resets progress. Pause, opening the songbook, or leaving the window cues the earliest unfinished note while preserving scored notes; play it to continue.
- After completion, play the first note again to repeat.

Song onsets follow the exact beat grid. Beginner articulation makes each note sound for 90% of its written duration, leaving the remaining 10% within that beat rather than adding extra time. Twinkle includes its full 12-bar melody; Ode to Joy includes the 8-bar opening theme with dotted rhythms; Mary Had a Little Lamb includes its complete 8-bar melody. These are simplified monophonic arrangements, without accompaniment.

## Tempo and practice speed

Each arrangement has its own reference tempo: **Twinkle, Twinkle — 112 BPM**, **Ode to Joy — 108 BPM**, **Mary Had a Little Lamb — 120 BPM**. These are chosen tempos for the included arrangements; other performances may use different tempos.

Songbook pieces initially open at **Full · 100%**. Use **Slow · 50%**, **Practice · 75%**, or **Fast · 125%** to change speed. The effective BPM and full reference tempo are both displayed. A 75% Twinkle practice is 84 BPM; a 75% Mary practice is 90 BPM.

Speed choices are isolated by song and by lesson, and remembered within the current visit. A slow lesson does not slow down its songbook version or another song. Mode changes, restart, pause/resume, and melody preview use the same selected tempo. Lesson base tempos remain 60 BPM; choosing a practice percentage scales that lesson base explicitly.

**Hear melody** uses the currently displayed speed. Audio note starts and releases are scheduled in advance on the Web Audio clock, and preview animation follows that clock. Playing manually in Flow mode follows elapsed time at the same effective BPM. Wait mode deliberately pauses for input, so its overall elapsed duration can be longer than the musical tempo suggests.

## MIDI

Connect a USB MIDI piano, click **Connect piano**, and grant MIDI permission. Web MIDI needs HTTPS or localhost in Chrome/Edge. MIDI note-off and zero-velocity note-on release keys. The physical piano supplies its own sound; computer and on-screen keys use a synthesized tone. Sustain pedal messages are not interpreted. Physical MIDI hardware still needs validation with your instrument.

Song practice progress is session-only. Lesson completion and best scores are saved on this browser and device, with no account or cloud sync. Accuracy measures correct holds against missed notes and incorrect attempts; it is not a complete musical performance assessment.
