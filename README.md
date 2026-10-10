# Pianist

A beginner piano practice app for Chrome and Edge. Connect a USB MIDI piano, choose a guided melody, and receive immediate note feedback. An on-screen keyboard and computer keys A–K let you practice without hardware.

## Development

Run `npm start` from this directory, then open `http://localhost:3000` in Chrome or Edge. Python 3 is required for the static development server. No package installation is needed. Run `npm test` to test the lesson engine (Node.js 18 or newer).

MIDI requires HTTPS or localhost and browser permission. Connect your piano before clicking **Connect piano**. Standard MIDI note-on messages advance the lesson; note-off and zero-velocity messages are ignored. MIDI supplies note data, so your physical piano provides sound. On-screen keys use synthesized audio.

Falling notes align with the piano keys and pause at the play line until the correct note is played. Upcoming notes preview the next steps. Input during the short descent is ignored, and wrong notes do not advance the song. Reduced-motion preferences skip the descent animation. This guided wait mode checks note order without enforcing rhythm. It includes three melodies, session accuracy, and best streak. Progress resets when selecting a song or restarting; it is not persisted. Hardware MIDI should be tested on a computer with a connected instrument.
