import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTimerSound } from '../src/lib/timer-sound.ts';
import { createTimerAudio } from '../src/scripts/timer-audio.ts';
import { mockTimerAudio } from './helpers/timer-audio.ts';

const custom = { name: 'custom.wav', dataUrl: 'data:audio/wav;base64,UklGRg==' };

test('built-in sounds use distinct notes, replace prior playback, and Off stays silent', async t => {
  const mock = mockTimerAudio(t);
  const audio = createTimerAudio();
  await audio.unlock();
  await audio.play(createTimerSound());
  assert.deepEqual(mock.sources.map(source => source.frequency.value), [659.25, 830.61, 987.77]);
  await audio.play({ ...createTimerSound(), selected: 'bell' });
  assert.ok(mock.sources.slice(0, 3).every(source => source.stops.includes(undefined)));
  assert.deepEqual(mock.sources.slice(3).map(source => source.frequency.value), [523.25, 1046.5]);
  await audio.play({ ...createTimerSound(), selected: 'digital' });
  assert.ok(mock.sources.slice(5).every(source => source.type === 'square'));
  await audio.play({ ...createTimerSound(), selected: 'off' });
  assert.equal(mock.sources.length, 8);
  assert.equal(mock.counts().resumes, 1);
});

test('custom playback is cached and capped at 10 seconds, with short clips playing in full', async t => {
  const mock = mockTimerAudio(t);
  const audio = createTimerAudio();
  let ended = 0;
  const settings = { ...createTimerSound(), selected: 'custom' as const, custom };
  await audio.play(settings, () => { ended++; });
  assert.deepEqual(mock.sources[0].starts, [[100, 0, 10]]);
  mock.sources[0].onended!();
  assert.equal(ended, 1);
  await audio.play(settings);
  assert.equal(mock.counts().decodes, 1);
  mock.duration(2);
  await audio.play({ ...settings, custom: { ...custom, dataUrl: 'data:audio/wav;base64,UklGRgAA' } });
  assert.deepEqual(mock.sources[2].starts, [[100, 0, 2]]);
});

test('stopping or replacing pending custom playback prevents stale audio from starting', async t => {
  const mock = mockTimerAudio(t);
  let resolve!: (buffer: { duration: number }) => void;
  mock.deferDecode(() => new Promise(done => { resolve = done; }));
  const audio = createTimerAudio();
  const pending = audio.play({ ...createTimerSound(), selected: 'custom', custom });
  await new Promise(done => setImmediate(done));
  audio.stop();
  resolve({ duration: 20 });
  await pending;
  assert.equal(mock.sources.length, 0);
});

test('uploads are decoded before acceptance and decoding or autoplay failures propagate', async t => {
  const mock = mockTimerAudio(t);
  const audio = createTimerAudio();
  const file = new File(['RIFF'], 'sample.wav', { type: 'audio/wav' });
  assert.deepEqual(await audio.prepare(file), { name: 'sample.wav', dataUrl: 'data:audio/wav;base64,UklGRg==' });
  mock.failDecode();
  await assert.rejects(audio.prepare(new File(['broken'], 'bad.mp3', { type: 'audio/mpeg' })), /could not decode/);
  mock.failResume();
  await assert.rejects(audio.play(createTimerSound()), /blocked/);
});
