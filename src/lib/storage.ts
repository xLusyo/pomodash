import { createTimer, TIMER_MODES } from './timer.ts';
import type { DashboardState, TimerMode } from './types.ts';

export const STORAGE_KEY = 'pomodash.workspace.v1';
type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>;

export function createDashboard(): DashboardState {
  return { version: 1, widgets: ['timer'], positions: {}, timer: createTimer(), todos: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMode(value: unknown): value is TimerMode {
  return TIMER_MODES.includes(value as TimerMode);
}

export function isDashboardState(value: unknown): value is DashboardState {
  if (!isRecord(value) || value.version !== 1) return false;
  if (!Array.isArray(value.widgets) || value.widgets.length > 2) return false;
  if (!value.widgets.every(widget => widget === 'timer' || widget === 'todos')) return false;
  if (new Set(value.widgets).size !== value.widgets.length) return false;
  if (value.positions !== undefined) {
    if (!isRecord(value.positions)) return false;
    if (!Object.entries(value.positions).every(([id, position]) =>
      (id === 'timer' || id === 'todos') && isRecord(position) &&
      typeof position.x === 'number' && Number.isFinite(position.x) && position.x >= 0 &&
      typeof position.y === 'number' && Number.isFinite(position.y) && position.y >= 0
    )) return false;
  }
  if (value.sizes !== undefined) {
    if (!isRecord(value.sizes)) return false;
    if (!Object.entries(value.sizes).every(([id, size]) =>
      (id === 'timer' || id === 'todos') && isRecord(size) &&
      typeof size.width === 'number' && Number.isFinite(size.width) && size.width > 0 &&
      typeof size.height === 'number' && Number.isFinite(size.height) && size.height > 0
    )) return false;
  }
  if (!Array.isArray(value.todos) || !value.todos.every(todo =>
    isRecord(todo) && typeof todo.id === 'string' && todo.id.length > 0 &&
    typeof todo.title === 'string' && todo.title.trim().length > 0 &&
    todo.title.length <= 200 && typeof todo.isComplete === 'boolean'
  )) return false;
  if (new Set(value.todos.map(todo => todo.id)).size !== value.todos.length) return false;

  const timer = value.timer;
  if (!isRecord(timer) || !isMode(timer.mode) || !isRecord(timer.durations)) return false;
  if (!TIMER_MODES.every(mode => {
    const duration = timer.durations as Record<string, unknown>;
    return typeof duration[mode] === 'number' && Number.isInteger(duration[mode]) &&
      duration[mode] >= 1 && duration[mode] <= 180;
  })) return false;
  if (!['idle', 'running', 'paused'].includes(timer.status as string)) return false;
  if (typeof timer.remainingMs !== 'number' || !Number.isFinite(timer.remainingMs) ||
    timer.remainingMs <= 0 || timer.remainingMs > (timer.durations[timer.mode] as number) * 60_000) return false;
  if (typeof timer.completedFocusSessions !== 'number' ||
    !Number.isSafeInteger(timer.completedFocusSessions) || timer.completedFocusSessions < 0) return false;
  if (timer.lastCompleted !== null && !isMode(timer.lastCompleted)) return false;
  if (timer.status === 'running') {
    return typeof timer.endsAt === 'number' && Number.isFinite(timer.endsAt) && timer.endsAt > 0 &&
      timer.endsAt <= 8_640_000_000_000_000;
  }
  return timer.endsAt === null;
}

export function loadDashboard(storage: StorageAccess | null): { state: DashboardState; notice: string | null } {
  if (!storage) return { state: createDashboard(), notice: 'Browser storage is unavailable. Changes will last only in this tab.' };
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error('PomoDash could not read the saved workspace.', error);
    return { state: createDashboard(), notice: 'Your workspace could not be loaded. Changes may not be saved.' };
  }
  if (raw === null) return { state: createDashboard(), notice: null };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isDashboardState(parsed)) return { state: parsed, notice: null };
  } catch (error) {
    console.error('PomoDash could not parse the saved workspace.', error);
  }
  return {
    state: createDashboard(),
    notice: 'Saved workspace data is invalid. A fresh workspace is open; your next change will replace the saved data.',
  };
}

export function saveDashboard(storage: StorageAccess | null, state: DashboardState): string | null {
  if (!storage) return 'Browser storage is unavailable. Changes will last only in this tab.';
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return null;
  } catch (error) {
    console.error('PomoDash could not save the workspace.', error);
    return 'Your latest changes could not be saved. Keep this tab open to retain them.';
  }
}
