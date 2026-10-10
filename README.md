# Pianist

Piano learning app for Chrome and Edge, with USB MIDI input, falling-note guidance, and three beginner melodies.

## Run locally

From this folder, run `python3 -m http.server 3000` (Windows: `py -m http.server 3000`), then open `http://localhost:3000`. Alternatively, `npm start` runs the same server. No dependency installation is required. Run `npm test` with Node.js 18+ to test the lesson engines.

## Practice

Choose a song, select **Wait mode** or **Flow mode**, choose a tempo, and press **Start practice**. Changing the song, mode, or tempo resets the session.

- Each bar's length represents the note's sounding duration. Play when its bottom reaches the line and hold until its top (tail) reaches the line. A two-beat note is twice as long as a one-beat note.
- **Wait mode** freezes at the note onset until the correct key is pressed. It moves while you hold, then waits for release. Releasing early resets that note for a retry.
- **Flow mode** keeps moving at the selected tempo, even if you miss a note. Notes must start within 200 ms of the line and be held for their duration (180 ms tolerance). Short or missed notes reduce accuracy.
- Use your digital piano, hold an on-screen key with a mouse/touch, or hold computer keys **A S D F G H J K**. Audio from on-screen and computer keys is sustained until release.
- **Focus view** expands the piano roll and hides the songbook and page chrome. Press Escape to exit.
- Notes move with the animation clock; feedback updates separately to keep the lane stable. Short-hold retries rewind gently, with that transition disabled for reduced-motion preferences.
- Pause preserves your position. Releasing an unfinished note during pause can require a retry. Switching tabs or losing window focus pauses practice and releases active keys.

Connect your piano before clicking **Connect piano** and grant browser MIDI permission. MIDI requires HTTPS or localhost. MIDI note-off and zero-velocity note-on release keys. Your physical piano supplies its own sound. Sustain pedal messages are not currently interpreted.

The included melodies use simple beginner rhythm arrangements with small articulation gaps; this is not a full sheet-music score. Session progress is not persisted. Accuracy counts successful holds against missed notes and incorrect/short attempts, not a comprehensive musical performance score. Physical MIDI hardware still needs testing with your instrument.
