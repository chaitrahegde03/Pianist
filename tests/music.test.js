import test from 'node:test';
import assert from 'node:assert/strict';
import {createPractice, noteName, songs} from '../music.js';
test('wrong notes preserve position and reduce accuracy; completion ignores further input',()=>{const p=createPractice([60,62]);assert.equal(p.play(61),'wrong');assert.equal(p.state.index,0);assert.equal(p.play(60),'correct');assert.equal(p.play(62),'complete');assert.equal(p.state.accuracy,67);assert.equal(p.state.best,2);assert.equal(p.play(60),'complete');assert.equal(p.state.attempts,3);});
test('all guided songs can be completed with the displayed notes',()=>{for(const song of songs){const p=createPractice(song.notes);for(const note of song.notes)p.play(note);assert.equal(p.state.index,song.notes.length);assert.equal(p.state.accuracy,100);assert.equal(p.state.expected,undefined);}});
test('MIDI note labels follow standard octave numbering',()=>{assert.equal(noteName(60),'C4');assert.equal(noteName(61),'C♯4');assert.equal(noteName(72),'C5');});
