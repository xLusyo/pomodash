import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeTimerSound } from '../src/scripts/timer-sound-controller.ts';
import { createTimerSound } from '../src/lib/timer-sound.ts';
import { TIMER_SOUND_STORAGE_KEY } from '../src/lib/timer-sound-storage.ts';
import { mockTimerAudio } from './helpers/timer-audio.ts';
import { mockTimerDom, settleAudio } from './helpers/timer-dom.ts';

function setup(t: Parameters<typeof mockTimerDom>[0], failSave = false) {
  const dom = mockTimerDom(t);
  const audio = mockTimerAudio(t);
  let raw = JSON.stringify(createTimerSound());
  const storage = {
    getItem: (key: string) => key === TIMER_SOUND_STORAGE_KEY ? raw : null,
    setItem: (_key: string, value: string) => { if (failSave) throw new Error('quota'); raw = value; },
  };
  const controller = initializeTimerSound(storage);
  const dialog = dom.element('#timer-settings');
  function open() { controller.open(); dialog.showModal(); }
  function select(value: string) { const select = dom.element('[data-timer-sound]'); select.value = value; select.change(); }
  function upload(file: File) { const input = dom.element('[data-sound-file]'); input.files = [file]; input.change(); }
  return { ...dom, audio, controller, dialog, open, select, upload, saved: () => JSON.parse(raw) };
}

test('sound changes remain drafts until save; completion uses the saved selection', async t => {
  const app = setup(t);
  app.open();
  app.select('bell');
  app.controller.complete();
  await settleAudio();
  assert.deepEqual(app.audio.sources.map(source => source.frequency.value), [659.25, 830.61, 987.77]);
  app.dialog.close();
  app.open();
  assert.equal(app.element('[data-timer-sound]').value, 'chime');
  app.select('bell');
  assert.equal(app.controller.save(), true);
  assert.equal(app.saved().selected, 'bell');
  app.dialog.close();
  app.controller.complete();
  await settleAudio();
  assert.deepEqual(app.audio.sources.slice(3).map(source => source.frequency.value), [523.25, 1046.5]);
});

test('preview stops on selection, close, and completion; Off disables preview and completion stays silent', async t => {
  const app = setup(t);
  app.open();
  const preview = app.element('[data-preview-sound]');
  preview.click();
  await settleAudio();
  assert.equal(preview.textContent, 'Stop preview');
  app.select('digital');
  assert.equal(preview.textContent, 'Preview sound');
  assert.ok(app.audio.sources.every(source => source.stops.includes(undefined)));
  preview.click();
  await settleAudio();
  app.controller.complete();
  await settleAudio();
  assert.equal(preview.textContent, 'Preview sound');
  assert.ok(app.audio.sources.slice(3, 6).every(source => source.stops.includes(undefined)));
  preview.click();
  await settleAudio();
  app.dialog.close();
  assert.equal(preview.textContent, 'Preview sound');
  app.open();
  app.select('off');
  assert.equal(preview.disabled, true);
  app.controller.save();
  const previous = app.audio.sources.length;
  app.controller.complete();
  await settleAudio();
  assert.equal(app.audio.sources.length, previous);
});

test('custom uploads can be saved, replaced, and removed without persisting drafts', async t => {
  const app = setup(t);
  app.open();
  app.upload(new File(['RIFF'], 'first.wav', { type: 'audio/wav' }));
  assert.equal(app.element('[data-save-timer]').disabled, true);
  assert.equal(app.controller.save(), false);
  await settleAudio();
  assert.equal(app.element('[data-sound-filename]').textContent, 'first.wav');
  assert.equal(app.element('[data-timer-sound]').value, 'custom');
  app.controller.save();
  assert.equal(app.saved().custom.name, 'first.wav');
  app.upload(new File(['another'], 'next.mp3', { type: 'audio/mpeg' }));
  await settleAudio();
  assert.equal(app.element('[data-sound-filename]').textContent, 'next.mp3');
  app.dialog.close();
  app.open();
  assert.equal(app.element('[data-sound-filename]').textContent, 'first.wav');
  app.element('[data-remove-sound]').click();
  assert.equal(app.element('[data-timer-sound]').value, 'chime');
  app.controller.save();
  assert.equal(app.saved().custom, null);
});

test('a late upload cannot overwrite a closed or reopened settings dialog', async t => {
  const app = setup(t);
  let resolve!: (buffer: { duration: number }) => void;
  app.audio.deferDecode(() => new Promise(done => { resolve = done; }));
  app.open();
  app.upload(new File(['RIFF'], 'late.wav', { type: 'audio/wav' }));
  await settleAudio();
  app.dialog.close();
  app.open();
  app.select('digital');
  resolve({ duration: 2 });
  await settleAudio();
  assert.equal(app.element('[data-timer-sound]').value, 'digital');
  assert.equal(app.element('[data-sound-filename]').textContent, 'No custom audio selected.');
  assert.equal(app.element('[data-save-timer]').disabled, false);
});

test('upload and quota errors keep previous saved settings and actionable feedback', async t => {
  t.mock.method(console, 'error', () => {});
  const app = setup(t, true);
  app.open();
  app.upload(new File(['bad'], 'bad.txt', { type: 'text/plain' }));
  await settleAudio();
  assert.match(app.element('[data-sound-message]').textContent, /MP3, WAV, or OGG/);
  app.select('bell');
  assert.equal(app.controller.save(), false);
  assert.equal(app.saved().selected, 'chime');
  assert.equal(app.dialog.open, true);
  assert.match(app.element('[data-sound-message]').textContent, /could not be saved/);
});
