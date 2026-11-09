import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAppearance } from '../src/lib/appearance.ts';
import { APPEARANCE_STORAGE_KEY } from '../src/lib/appearance-storage.ts';
import { createTimerSound } from '../src/lib/timer-sound.ts';
import { TIMER_SOUND_STORAGE_KEY } from '../src/lib/timer-sound-storage.ts';
import { saveSettings } from '../src/lib/settings-storage.ts';

const appearance = { ...createAppearance(), fontPreset: 'modern' as const };
const sound = { ...createTimerSound(), selected: 'bell' as const };

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

test('shared settings save retains the existing storage keys and supports tab-only settings', () => {
  const storage = memoryStorage();
  assert.equal(saveSettings(storage, appearance, sound), null);
  assert.deepEqual(JSON.parse(storage.values.get(APPEARANCE_STORAGE_KEY)!), appearance);
  assert.deepEqual(JSON.parse(storage.values.get(TIMER_SOUND_STORAGE_KEY)!), sound);
  assert.equal(saveSettings(null, appearance, sound), null);
});

test('sound storage failure restores the exact previous appearance or its absence', t => {
  t.mock.method(console, 'error', () => {});
  for (const previous of [null, '{"existing":"raw data"}']) {
    const storage = memoryStorage();
    if (previous !== null) storage.values.set(APPEARANCE_STORAGE_KEY, previous);
    storage.values.set(TIMER_SOUND_STORAGE_KEY, JSON.stringify(createTimerSound()));
    const originalWrite = storage.setItem;
    storage.setItem = (key, value) => {
      if (key === TIMER_SOUND_STORAGE_KEY) throw new Error('Quota exceeded');
      originalWrite(key, value);
    };
    assert.match(saveSettings(storage, appearance, sound)!, /Sound could not be saved/);
    assert.equal(storage.getItem(APPEARANCE_STORAGE_KEY), previous);
    assert.deepEqual(JSON.parse(storage.getItem(TIMER_SOUND_STORAGE_KEY)!), createTimerSound());
  }
});

test('unreadable storage and a failed first write leave both settings unchanged', t => {
  t.mock.method(console, 'error', () => {});
  const storage = memoryStorage();
  const originalRead = storage.getItem;
  storage.getItem = () => { throw new Error('Access denied'); };
  assert.match(saveSettings(storage, appearance, sound)!, /could not be saved/);
  assert.equal(storage.values.size, 0);
  storage.getItem = originalRead;
  storage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.match(saveSettings(storage, appearance, sound)!, /Appearance could not be saved/);
  assert.equal(storage.values.size, 0);
});

test('rollback failures report that appearance may have been saved', t => {
  t.mock.method(console, 'error', () => {});
  const storage = memoryStorage();
  const originalWrite = storage.setItem;
  storage.setItem = (key, value) => {
    if (key === TIMER_SOUND_STORAGE_KEY) throw new Error('Quota exceeded');
    originalWrite(key, value);
  };
  storage.removeItem = () => { throw new Error('Access denied'); };
  assert.match(saveSettings(storage, appearance, sound)!, /Appearance may have been saved/);
});

test('invalid drafts are rejected before any writes', () => {
  const storage = memoryStorage();
  assert.ok(saveSettings(storage, appearance, { ...sound, selected: 'custom', custom: null }));
  assert.equal(storage.values.size, 0);
});
