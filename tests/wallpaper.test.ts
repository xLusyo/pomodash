import assert from 'node:assert/strict';
import { test } from 'node:test';
import { processWallpaper } from '../src/scripts/wallpaper.ts';

test('wallpaper rejects unsupported formats and oversized files before decoding', async () => {
  await assert.rejects(processWallpaper(new File(['<svg/>'], 'image.svg', { type: 'image/svg+xml' })), /JPEG, PNG, or WebP/);
  await assert.rejects(processWallpaper(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })), /smaller than 10 MB/);
});
