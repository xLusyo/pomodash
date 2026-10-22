import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTimerSound, isTimerSoundSettings, MAX_SOUND_BYTES, validateSoundFile } from '../src/lib/timer-sound.ts';
import { loadTimerSound, saveTimerSound, TIMER_SOUND_STORAGE_KEY } from '../src/lib/timer-sound-storage.ts';

const custom = { name: 'bell.wav', dataUrl: 'data:audio/wav;base64,UklGRg==' };

test('timer sound defaults to Chime and custom audio survives an independent JSON round trip', () => {
  const values = new Map([['pomodash.workspace.v1', 'workspace'], ['pomodash.appearance.v1', 'appearance']]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  assert.deepEqual(loadTimerSound(storage), { settings: createTimerSound(), notice: null });
  const settings = { ...createTimerSound(), selected: 'custom' as const, custom };
  assert.equal(saveTimerSound(storage, settings), null);
  assert.deepEqual(loadTimerSound(storage).settings, settings);
  assert.equal(values.get('pomodash.workspace.v1'), 'workspace');
  assert.equal(values.get('pomodash.appearance.v1'), 'appearance');
  assert.ok(values.has(TIMER_SOUND_STORAGE_KEY));
});

test('sound settings reject invalid selections, custom files, and oversized data', () => {
  const valid = createTimerSound();
  for (const selected of ['chime', 'bell', 'digital', 'off']) {
    assert.equal(isTimerSoundSettings({ ...valid, selected }), true);
  }
  const invalid = [null, [], {}, { ...valid, version: 2 }, { ...valid, selected: 'unknown' },
    { ...valid, selected: 'custom' }, { ...valid, custom: {} },
    { ...valid, custom: { ...custom, name: '' } },
    { ...valid, custom: { ...custom, dataUrl: 'https://example.com/audio.mp3' } },
    { ...valid, custom: { ...custom, dataUrl: 'data:text/html;base64,UklGRg==' } },
    { ...valid, custom: { ...custom, dataUrl: 'data:audio/wav;base64,ABC' } },
    { ...valid, custom: { ...custom, dataUrl: 'data:audio/wav;base64,' + 'A'.repeat(1_400_000) } }];
  invalid.forEach(value => assert.equal(isTimerSoundSettings(value), false));
  const atLimit = Buffer.alloc(MAX_SOUND_BYTES).toString('base64');
  const overLimit = Buffer.alloc(MAX_SOUND_BYTES + 1).toString('base64');
  assert.equal(isTimerSoundSettings({ ...valid, custom: { ...custom, dataUrl: `data:audio/wav;base64,${atLimit}` } }), true);
  assert.equal(isTimerSoundSettings({ ...valid, custom: { ...custom, dataUrl: `data:audio/wav;base64,${overLimit}` } }), false);
});

test('malformed or inaccessible sound storage falls back without replacing saved data', t => {
  t.mock.method(console, 'error', () => {});
  for (const raw of ['{broken', JSON.stringify({ ...createTimerSound(), selected: 'custom' })]) {
    let writes = 0;
    const storage = { getItem: () => raw, setItem: () => { writes++; } };
    const loaded = loadTimerSound(storage);
    assert.deepEqual(loaded.settings, createTimerSound());
    assert.match(loaded.notice!, /could not be loaded/);
    assert.equal(writes, 0);
  }
  const failing = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); } };
  assert.ok(loadTimerSound(failing).notice);
  assert.match(saveTimerSound(failing, createTimerSound())!, /could not be saved/);
  assert.ok(loadTimerSound(null).notice);
  assert.equal(saveTimerSound(null, createTimerSound()), null);
});

test('custom uploads accept supported formats within the limit and reject empty, large, or unrelated files', () => {
  for (const type of ['audio/mpeg', 'audio/wav', 'audio/ogg']) {
    assert.doesNotThrow(() => validateSoundFile({ type, size: MAX_SOUND_BYTES }));
  }
  assert.throws(() => validateSoundFile({ type: 'audio/mpeg', size: MAX_SOUND_BYTES + 1 }), /up to 1 MB/);
  assert.throws(() => validateSoundFile({ type: 'audio/mpeg', size: 0 }), /non-empty/);
  assert.throws(() => validateSoundFile({ type: 'text/html', size: 10 }), /MP3, WAV, or OGG/);
});
