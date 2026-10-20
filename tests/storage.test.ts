import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createDashboard, isDashboardState, loadDashboard, saveDashboard, STORAGE_KEY } from '../src/lib/storage.ts';
import { startTimer } from '../src/lib/timer.ts';

function memoryStorage(initial: string | null = null) {
  let value = initial;
  return {
    getItem: (key: string) => key === STORAGE_KEY ? value : null,
    setItem: (_key: string, next: string) => { value = next; },
  };
}

test('first visit has only a timer; valid state survives a JSON round trip', () => {
  const storage = memoryStorage();
  const first = loadDashboard(storage);
  assert.deepEqual(first.state.widgets, ['timer']);
  assert.equal(first.notice, null);
  const state = {
    ...first.state, widgets: ['todos', 'timer'] as const,
    timer: startTimer(first.state.timer, Date.now()),
    todos: [{ id: 'task-1', title: '<b>Write safely</b>', isComplete: true }],
  };
  const saved = { ...state, widgets: [...state.widgets] };
  assert.equal(saveDashboard(storage, saved), null);
  assert.deepEqual(loadDashboard(storage).state, saved);
});

test('malformed JSON is recoverable without silently overwriting the saved data', context => {
  context.mock.method(console, 'error', () => {});
  const storage = memoryStorage('{broken');
  assert.ok(loadDashboard(storage).notice?.includes('invalid'));
  assert.equal(storage.getItem(STORAGE_KEY), '{broken');
});

test('invalid versions, widgets, todos, durations, and timer values are rejected', () => {
  const valid = createDashboard();
  const invalid = [
    null, [], { ...valid, version: 2 },
    { ...valid, widgets: ['timer', 'timer'] },
    { ...valid, widgets: ['weather'] },
    { ...valid, todos: [{ id: 'x', title: '  ', isComplete: false }] },
    { ...valid, todos: [{ id: 'x', title: 'A', isComplete: false }, { id: 'x', title: 'B', isComplete: true }] },
    { ...valid, timer: { ...valid.timer, mode: 'unknown' } },
    { ...valid, timer: { ...valid.timer, durations: { focus: 0, shortBreak: 5, longBreak: 15 } } },
    { ...valid, timer: { ...valid.timer, durations: { focus: 1.5, shortBreak: 5, longBreak: 15 } } },
    { ...valid, timer: { ...valid.timer, remainingMs: Infinity } },
    { ...valid, timer: { ...valid.timer, remainingMs: 1_000_000_000 } },
    { ...valid, timer: { ...valid.timer, completedFocusSessions: -1 } },
    { ...valid, timer: { ...valid.timer, status: 'running', endsAt: null } },
    { ...valid, timer: { ...valid.timer, endsAt: 123 } },
  ];
  assert.equal(isDashboardState(valid), true);
  assert.equal(isDashboardState({ ...valid, widgets: [] }), true);
  invalid.forEach(state => assert.equal(isDashboardState(state), false));
  assert.ok(loadDashboard(memoryStorage(JSON.stringify({ ...valid, version: 2 }))).notice);
});

test('unavailable storage and quota failures return actionable notices', context => {
  context.mock.method(console, 'error', () => {});
  assert.ok(loadDashboard(null).notice?.includes('unavailable'));
  assert.ok(saveDashboard(null, createDashboard()));
  const failing = {
    getItem: () => { throw new Error('Access denied'); },
    setItem: () => { throw new Error('Quota exceeded'); },
  };
  assert.ok(loadDashboard(failing).notice?.includes('could not be loaded'));
  assert.ok(saveDashboard(failing, createDashboard())?.includes('could not be saved'));
});

test('free canvas positions survive reloads alongside existing widget data', () => {
  const storage = memoryStorage();
  const state = {
    ...createDashboard(),
    positions: { timer: { x: 139, y: 87 }, todos: { x: 541, y: 45 } },
  };
  assert.equal(saveDashboard(storage, state), null);
  assert.deepEqual(loadDashboard(storage).state, state);
  assert.equal(isDashboardState({ ...state, positions: { timer: { x: -1, y: 5 } } }), false);
  assert.equal(isDashboardState({ ...state, positions: { timer: { x: Infinity, y: 5 } } }), false);
  assert.equal(isDashboardState({ ...state, positions: { weather: { x: 1, y: 5 } } }), false);
});

test('existing grid workspaces load without losing timer settings or tasks', () => {
  const { positions, ...legacy } = createDashboard();
  legacy.timer.durations.focus = 40;
  legacy.timer.remainingMs = 40 * 60_000;
  legacy.todos = [{ id: 'kept-task', title: 'Keep this task', isComplete: false }];
  const loaded = loadDashboard(memoryStorage(JSON.stringify(legacy)));
  assert.equal(loaded.notice, null);
  assert.deepEqual(loaded.state, legacy);
});

test('resized dimensions persist and malformed dimensions are rejected', () => {
  const storage = memoryStorage();
  const state = { ...createDashboard(), sizes: { timer: { width: 560, height: 640 } } };
  saveDashboard(storage, state);
  assert.deepEqual(loadDashboard(storage).state, state);
  assert.equal(isDashboardState({ ...state, sizes: { timer: { width: 0, height: 640 } } }), false);
  assert.equal(isDashboardState({ ...state, sizes: { timer: { width: 500, height: NaN } } }), false);
});
