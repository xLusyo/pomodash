import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeSettings } from '../src/scripts/settings-controller.ts';
import { createTimerSound } from '../src/lib/timer-sound.ts';
import { TIMER_SOUND_STORAGE_KEY } from '../src/lib/timer-sound-storage.ts';
import { APPEARANCE_STORAGE_KEY } from '../src/lib/appearance-storage.ts';
import { initializeTimer } from '../src/scripts/timer-controller.ts';
import { createTimer, resetTimer } from '../src/lib/timer.ts';
import type { TimerMode } from '../src/lib/types.ts';
import { mockTimerAudio } from './helpers/timer-audio.ts';
import { settleAudio } from './helpers/timer-dom.ts';
import { mockSettingsDom } from './helpers/settings-dom.ts';

function setup(t: Parameters<typeof mockSettingsDom>[0], failSave = false) {
  const dom = mockSettingsDom(t);
  const audio = mockTimerAudio(t);
  const values = new Map([[TIMER_SOUND_STORAGE_KEY, JSON.stringify(createTimerSound())]]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { if (failSave && key === TIMER_SOUND_STORAGE_KEY) throw new Error('quota'); values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
  const controller = initializeSettings(storage as Storage);
  const dialog = dom.element('#appearance-settings');
  function open() { dom.element('[data-open-appearance]').click(); }
  function save() { dom.element('#appearance-form').dispatchEvent(new Event('submit', { cancelable: true })); return !dialog.open; }
  function select(value: string) { const select = dom.element('[data-timer-sound]'); select.value = value; select.change(); }
  function upload(file: File) { const input = dom.element('[data-sound-file]'); input.files = [file]; input.change(); }
  return { ...dom, audio, controller, dialog, open, save, select, upload, values, saved: () => JSON.parse(values.get(TIMER_SOUND_STORAGE_KEY)!) };
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
  assert.equal(app.save(), true);
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
  app.save();
  const previous = app.audio.sources.length;
  app.controller.complete();
  await settleAudio();
  assert.equal(app.audio.sources.length, previous);
});

test('custom uploads can be saved, replaced, and removed without persisting drafts', async t => {
  const app = setup(t);
  app.open();
  app.upload(new File(['RIFF'], 'first.wav', { type: 'audio/wav' }));
  assert.equal(app.element('[data-save-appearance]').disabled, true);
  assert.equal(app.save(), false);
  await settleAudio();
  assert.equal(app.element('[data-sound-filename]').textContent, 'first.wav');
  assert.equal(app.element('[data-timer-sound]').value, 'custom');
  app.save();
  assert.equal(app.saved().custom.name, 'first.wav');
  app.open();
  app.upload(new File(['another'], 'next.mp3', { type: 'audio/mpeg' }));
  await settleAudio();
  assert.equal(app.element('[data-sound-filename]').textContent, 'next.mp3');
  app.dialog.close();
  app.open();
  assert.equal(app.element('[data-sound-filename]').textContent, 'first.wav');
  app.element('[data-remove-sound]').click();
  assert.equal(app.element('[data-timer-sound]').value, 'chime');
  app.save();
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
  assert.equal(app.element('[data-save-appearance]').disabled, false);
});

test('upload and quota errors keep previous saved settings and actionable feedback', async t => {
  t.mock.method(console, 'error', () => {});
  const app = setup(t, true);
  app.open();
  app.upload(new File(['bad'], 'bad.txt', { type: 'text/plain' }));
  await settleAudio();
  assert.match(app.element('[data-sound-message]').textContent, /MP3, WAV, or OGG/);
  app.select('bell');
  assert.equal(app.save(), false);
  assert.equal(app.saved().selected, 'chime');
  assert.equal(app.dialog.open, true);
  assert.match(app.element('[data-appearance-message]').textContent, /could not be saved/);
});

test('shared save commits appearance and sound while cancellation restores both', t => {
  const app = setup(t);
  app.open();
  app.chooseAppearance('fontPreset', 'modern');
  app.select('bell');
  app.tabs[3].click();
  app.tabs[1].click();
  app.tabs[3].click();
  assert.equal(app.element('[data-timer-sound]').value, 'bell');
  app.dialog.close();
  assert.equal(app.properties.get('--font-body'), "'Avenir Next', Avenir, 'Segoe UI', sans-serif");
  app.open();
  assert.equal(app.element('[data-timer-sound]').value, 'chime');
  app.chooseAppearance('fontPreset', 'modern');
  app.select('bell');
  assert.equal(app.save(), true);
  assert.equal(JSON.parse(app.values.get(APPEARANCE_STORAGE_KEY)!).fontPreset, 'modern');
  assert.equal(app.saved().selected, 'bell');
  app.open();
  app.element('[data-reset-appearance]').click();
  assert.equal(app.element('[data-timer-sound]').value, 'bell');
  app.dialog.close();
  assert.equal(app.properties.get('--font-body'), 'system-ui, sans-serif');
});

test('a failed shared save keeps drafts open and playback on the previous saved tone', async t => {
  t.mock.method(console, 'error', () => {});
  const app = setup(t, true);
  app.open();
  app.chooseAppearance('accentPreset', 'ocean');
  app.select('bell');
  assert.equal(app.save(), false);
  assert.equal(app.values.has(APPEARANCE_STORAGE_KEY), false);
  assert.equal(app.element('[data-timer-sound]').value, 'bell');
  app.controller.complete();
  await settleAudio();
  assert.deepEqual(app.audio.sources.map(source => source.frequency.value), [659.25, 830.61, 987.77]);
  app.dialog.close();
  assert.equal(app.properties.get('--accent'), '#b75c43');
  app.open();
  assert.equal(app.element('[data-timer-sound]').value, 'chime');
});

test('all four tabs support arrow keys, Home, and End', t => {
  const app = setup(t);
  function key(index: number, key: string) {
    app.tabs[index].dispatchEvent(Object.assign(new Event('keydown'), { key }));
  }
  key(0, 'End');
  assert.equal(app.tabs[3].getAttribute('aria-selected'), 'true');
  assert.deepEqual(app.panels.map(panel => panel.hidden), [true, true, true, false]);
  key(3, 'ArrowRight');
  assert.equal(app.tabs[0].getAttribute('aria-selected'), 'true');
  key(0, 'ArrowLeft');
  assert.equal(app.tabs[3].getAttribute('aria-selected'), 'true');
  key(3, 'Home');
  assert.equal(app.tabs[0].getAttribute('aria-selected'), 'true');
});

for (const mode of ['focus', 'shortBreak', 'longBreak'] as TimerMode[]) {
  test(`saving a tone leaves a running ${mode} intact and completion uses the new saved tone`, async t => {
    const app = setup(t);
    let now = 1000;
    t.mock.method(Date, 'now', () => now);
    let timer = resetTimer(createTimer(), mode);
    initializeTimer({ sound: app.controller, read: () => timer, update: next => { timer = next; }, isVisible: () => true });
    app.element('[data-toggle-timer]').click();
    const running = timer;
    app.open();
    app.select('bell');
    assert.equal(app.save(), true);
    assert.equal(timer, running);
    now = timer.endsAt!;
    app.tick();
    app.tick();
    await settleAudio();
    assert.deepEqual(app.audio.sources.map(source => source.frequency.value), [523.25, 1046.5]);
  });
}

test('shared Save stays disabled until both uploads finish, regardless of completion order', async t => {
  const app = setup(t);
  let finishSound!: (buffer: { duration: number }) => void;
  let finishWallpaper!: () => void;
  app.audio.deferDecode(() => new Promise(resolve => { finishSound = resolve; }));
  class TestImage {
    src = '';
    naturalWidth = 100;
    naturalHeight = 100;
    decode() { return new Promise<void>(resolve => { finishWallpaper = resolve; }); }
  }
  const previousImage = Object.getOwnPropertyDescriptor(globalThis, 'Image');
  Object.defineProperty(globalThis, 'Image', { value: TestImage, configurable: true });
  t.after(() => {
    if (previousImage) Object.defineProperty(globalThis, 'Image', previousImage);
    else Reflect.deleteProperty(globalThis, 'Image');
  });
  Object.assign(app.document, { createElement: () => ({
    width: 0, height: 0, getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:image/webp;base64,UklGRg==',
  }) });
  for (const first of ['sound', 'wallpaper']) {
    app.open();
    app.upload(new File([first], 'tone.wav', { type: 'audio/wav' }));
    const wallpaper = app.element('[data-wallpaper-file]');
    wallpaper.files = [new File(['image'], 'wallpaper.png', { type: 'image/png' })];
    wallpaper.change();
    await settleAudio();
    assert.equal(app.save(), false);
    if (first === 'sound') finishSound({ duration: 1 });
    else finishWallpaper();
    await settleAudio();
    app.select('digital');
    assert.equal(app.element('[data-save-appearance]').disabled, true);
    if (first === 'sound') finishWallpaper();
    else finishSound({ duration: 1 });
    await settleAudio();
    assert.equal(app.element('[data-save-appearance]').disabled, false);
    assert.equal(app.save(), true);
  }
});
