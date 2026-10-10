# Pianist

A browser piano learning app with USB MIDI, duration-based falling notes, and three beginner melodies.

## Run locally

From this folder, run `python3 -m http.server 3000` (Windows: `py -m http.server 3000`) and open `http://localhost:3000` in Chrome or Edge. `npm start` runs the same server. No dependency installation is needed. Run `npm test` with Node.js 18+ to verify the lesson engine and song arrangements.

## Learn a song

Use **Songs** to choose a melody. **Flow is the default**. Play the first highlighted key to start immediately; there is no start button or count-in.

The complete keyboard stays visible in the practice viewport. Each falling bar sits above its key, and its length represents how long to hold it. Play when the bar's bottom reaches the keys; release when its tail reaches them. The pressed key and matching bar brighten together, a meter on the key shows progress through the hold, and timing feedback appears beside the key.

- **Flow:** the song follows the tempo even when notes are missed. Each note has its own onset and release tracking, so a slightly early next note can overlap the previous hold. Onset tolerance is at most 200 ms and scales down at faster tempos. Hold tolerance is at most 120 ms and scales down for short notes.
- **Wait:** the song pauses for the correct note, advances while held, and waits for release. Short holds retry the same note.
- **Hear melody:** hear a synthesized reference and watch the keys. Stop it or play a key to return to practice. Preview scores are discarded.
- Use a connected piano, hold/slide across on-screen keys with mouse or touch, or hold computer keys **A S D F G H J K**.
- Changing song, tempo, or mode resets progress. Pause, opening the songbook, or leaving the window cues the earliest unfinished note while preserving scored notes; play it to continue.
- After completion, play the first note again to repeat.

Song onsets follow the exact beat grid. Beginner articulation makes each note sound for 90% of its written duration, leaving the remaining 10% within that beat rather than adding extra time. Twinkle includes its full 12-bar melody; Ode to Joy includes the 8-bar opening theme with dotted rhythms; Mary Had a Little Lamb includes its complete 8-bar melody. These are simplified monophonic arrangements, without accompaniment.

## MIDI

Connect a USB MIDI piano, click **Connect piano**, and grant MIDI permission. Web MIDI needs HTTPS or localhost in Chrome/Edge. MIDI note-off and zero-velocity note-on release keys. The physical piano supplies its own sound; computer and on-screen keys use a synthesized tone. Sustain pedal messages are not interpreted. Physical MIDI hardware still needs validation with your instrument.

Progress is session-only. Accuracy measures correct holds against missed notes and incorrect attempts; it is not a complete musical performance assessment.
