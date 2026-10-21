import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createAppearance, isAppearanceSettings, MAX_WALLPAPER_LENGTH } from '../src/lib/appearance.ts';
import { APPEARANCE_STORAGE_KEY, loadAppearance, saveAppearance } from '../src/lib/appearance-storage.ts';
import { createDashboard, saveDashboard, STORAGE_KEY } from '../src/lib/storage.ts';

test('appearance defaults retain the original workspace design', () => {
  assert.deepEqual(createAppearance(), { version: 1, wallpaper: null, fontPreset: 'original', accentPreset: 'terracotta' });
  assert.equal(loadAppearance({ getItem: () => null, setItem: () => {} }).notice, null);
});

test('appearance and workspace persist independently', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const settings = { ...createAppearance(), wallpaper: 'data:image/webp;base64,UklGRg==', fontPreset: 'modern' as const, accentPreset: 'ocean' as const };
  assert.equal(saveAppearance(storage, settings), null);
  const appearance = values.get(APPEARANCE_STORAGE_KEY);
  saveDashboard(storage, createDashboard());
  assert.equal(values.get(APPEARANCE_STORAGE_KEY), appearance);
  const workspace = values.get(STORAGE_KEY);
  saveAppearance(storage, { ...settings, wallpaper: null });
  assert.equal(values.get(STORAGE_KEY), workspace);
  assert.deepEqual(loadAppearance(storage).settings, { ...settings, wallpaper: null });
  saveAppearance(storage, settings);
  assert.deepEqual(loadAppearance(storage).settings, settings);
});

test('unsupported presets, versions, image URLs, and oversized images are rejected', () => {
  const valid = createAppearance();
  assert.equal(isAppearanceSettings(valid), true);
  for (const value of [null, [], {}, { ...valid, version: 2 }, { ...valid, fontPreset: 'remote' },
    { ...valid, accentPreset: '#fff' }, { ...valid, wallpaper: 'https://example.com/image.jpg' },
    { ...valid, wallpaper: 'data:image/svg+xml;base64,PHN2Zz4=' },
    { ...valid, wallpaper: 'data:image/webp;base64,"bad' },
    { ...valid, wallpaper: `data:image/webp;base64,${'a'.repeat(MAX_WALLPAPER_LENGTH)}` }]) {
    assert.equal(isAppearanceSettings(value), false);
  }
});

test('invalid saved appearance falls back without overwriting storage', context => {
  context.mock.method(console, 'error', () => {});
  for (const raw of ['{broken', JSON.stringify({ ...createAppearance(), fontPreset: 'missing' })]) {
    let writes = 0;
    const loaded = loadAppearance({ getItem: () => raw, setItem: () => { writes++; } });
    assert.deepEqual(loaded.settings, createAppearance());
    assert.ok(loaded.notice);
    assert.equal(writes, 0);
  }
});

test('unavailable storage supports session appearance and failed saves retain saved data', context => {
  context.mock.method(console, 'error', () => {});
  assert.ok(loadAppearance(null).notice?.includes('only in this tab'));
  assert.equal(saveAppearance(null, createAppearance()), null);
  const original = JSON.stringify(createAppearance());
  const storage = { getItem: () => original, setItem: () => { throw new Error('Quota exceeded'); } };
  assert.ok(saveAppearance(storage, { ...createAppearance(), fontPreset: 'bookish' }));
  assert.equal(storage.getItem(), original);
  assert.ok(loadAppearance({ ...storage, getItem: () => { throw new Error('Access denied'); } }).notice);
});
