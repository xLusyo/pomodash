import type { TimerMode, TimerState } from './types.ts';

export const TIMER_MODES: TimerMode[] = ['focus', 'shortBreak', 'longBreak'];
export const MODE_LABELS: Record<TimerMode, string> = {
  focus: 'Focus',
  shortBreak: 'Short break',
  longBreak: 'Long break',
};

export function createTimer(): TimerState {
  return {
    mode: 'focus', status: 'idle',
    durations: { focus: 25, shortBreak: 5, longBreak: 15 },
    remainingMs: 25 * 60_000, endsAt: null,
    completedFocusSessions: 0, lastCompleted: null,
  };
}

export function remainingTime(timer: TimerState, now: number): number {
  return timer.status === 'running' && timer.endsAt !== null
    ? Math.max(0, timer.endsAt - now)
    : timer.remainingMs;
}

export function reconcileTimer(timer: TimerState, now: number): TimerState {
  if (timer.status !== 'running' || remainingTime(timer, now) > 0) return timer;

  const completedFocusSessions = timer.completedFocusSessions + (timer.mode === 'focus' ? 1 : 0);
  const mode = timer.mode === 'focus'
    ? completedFocusSessions % 4 === 0 ? 'longBreak' : 'shortBreak'
    : 'focus';

  return {
    ...timer, mode, completedFocusSessions,
    status: 'idle', endsAt: null,
    remainingMs: timer.durations[mode] * 60_000,
    lastCompleted: timer.mode,
  };
}

export function startTimer(timer: TimerState, now: number): TimerState {
  if (timer.status === 'running') return timer;
  return { ...timer, status: 'running', endsAt: now + timer.remainingMs, lastCompleted: null };
}

export function pauseTimer(timer: TimerState, now: number): TimerState {
  const current = reconcileTimer(timer, now);
  if (current.status !== 'running') return current;
  return { ...current, status: 'paused', remainingMs: remainingTime(current, now), endsAt: null };
}

export function resetTimer(timer: TimerState, mode = timer.mode): TimerState {
  return {
    ...timer, mode, status: 'idle', endsAt: null,
    remainingMs: timer.durations[mode] * 60_000, lastCompleted: null,
  };
}

export function updateDurations(timer: TimerState, durations: TimerState['durations']): TimerState {
  return resetTimer({ ...timer, durations });
}

export function formatTime(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
