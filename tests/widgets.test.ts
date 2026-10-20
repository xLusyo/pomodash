import assert from 'node:assert/strict';
import { test } from 'node:test';
import { constrainPosition, constrainSize, minimumWidgetSize, offsetPosition } from '../src/lib/canvas.ts';

const bounds = { width: 1024, height: 768, widgetWidth: 400, widgetHeight: 550 };

test('widgets can move freely in both axes without snapping', () => {
  const position = { x: 24, y: 24 };
  const moved = offsetPosition(position, { x: 139, y: 87 });
  assert.deepEqual(constrainPosition(moved, bounds), { x: 163, y: 111 });
  assert.deepEqual(position, { x: 24, y: 24 });
});

test('widgets remain reachable at every canvas edge', () => {
  assert.deepEqual(constrainPosition({ x: -80, y: -40 }, bounds), { x: 0, y: 0 });
  assert.deepEqual(constrainPosition({ x: 99999, y: 99999 }, bounds), { x: 624, y: 218 });
});

test('smaller canvases keep oversized widgets anchored and coordinates finite', () => {
  assert.deepEqual(constrainPosition({ x: 50, y: 50 }, { ...bounds, width: 300, height: 400 }), { x: 0, y: 0 });
  assert.deepEqual(constrainPosition({ x: 20.3, y: 37.8 }, bounds), { x: 20, y: 38 });
});

test('resizing respects usable widget dimensions and available canvas space', () => {
  const minimum = minimumWidgetSize('timer');
  const available = { width: 1000, height: 800 };
  assert.deepEqual(constrainSize({ width: 100, height: 100 }, minimum, available), { width: 320, height: 560 });
  assert.deepEqual(constrainSize({ width: 5000, height: 5000 }, minimum, available), available);
  assert.deepEqual(constrainSize({ width: 503.4, height: 620.7 }, minimum, available), { width: 503, height: 621 });
});

test('smaller viewports constrain saved dimensions without changing saved data', () => {
  const saved = { width: 1200, height: 900 };
  assert.deepEqual(constrainSize(saved, minimumWidgetSize('todos'), { width: 768, height: 700 }), { width: 768, height: 700 });
  assert.deepEqual(saved, { width: 1200, height: 900 });
});
