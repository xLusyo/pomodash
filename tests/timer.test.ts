import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTimer, formatTime, pauseTimer, reconcileTimer, remainingTime, resetTimer, startTimer, updateDurations } from '../src/lib/timer.ts';

test('pause and resume preserve remaining time without interval drift', () => {
  const running = startTimer(createTimer(), 1_000);
  assert.equal(remainingTime(running, 61_000), 24 * 60_000);
  const paused = pauseTimer(running, 61_000);
  assert.equal(paused.status, 'paused');
  assert.equal(paused.endsAt, null);
  assert.equal(remainingTime(paused, 1_000_000), 24 * 60_000);
  const resumed = startTimer(paused, 2_000_000);
  assert.equal(remainingTime(resumed, 2_060_000), 23 * 60_000);
});

test('restoring a running timer derives the time from its saved deadline', () => {
  const running = JSON.parse(JSON.stringify(startTimer(createTimer(), 1_000)));
  assert.equal(remainingTime(running, 301_000), 20 * 60_000);
  assert.equal(reconcileTimer(running, 301_000), running);
});

test('an expired focus session completes once and waits for the next Start', () => {
  const running = startTimer(createTimer(), 1_000);
  const next = reconcileTimer(running, 10_000_000);
  assert.equal(next.mode, 'shortBreak');
  assert.equal(next.status, 'idle');
  assert.equal(next.remainingMs, 5 * 60_000);
  assert.equal(next.completedFocusSessions, 1);
  assert.equal(next.lastCompleted, 'focus');
  assert.equal(reconcileTimer(next, 20_000_000), next);
});

test('every fourth focus session prepares a long break, then begins a new cycle', () => {
  let timer = createTimer();
  let now = 1_000;
  for (let session = 1; session <= 4; session++) {
    const focus = startTimer(timer, now);
    now = focus.endsAt!;
    const rest = reconcileTimer(focus, now);
    assert.equal(rest.mode, session === 4 ? 'longBreak' : 'shortBreak');
    assert.equal(rest.status, 'idle');
    const breakTimer = startTimer(rest, now);
    now = breakTimer.endsAt!;
    timer = reconcileTimer(breakTimer, now);
    assert.equal(timer.mode, 'focus');
    assert.equal(timer.status, 'idle');
    assert.equal(timer.completedFocusSessions, session);
  }
  const fifth = startTimer(timer, now);
  assert.equal(reconcileTimer(fifth, fifth.endsAt!).mode, 'shortBreak');
});

test('hiding pauses a running timer; hiding after expiry records completion', () => {
  const timer = startTimer(createTimer(), 1_000);
  assert.equal(pauseTimer(timer, 11_000).remainingMs, 1_490_000);
  assert.equal(pauseTimer(timer, timer.endsAt!).completedFocusSessions, 1);
});

test('mode and duration changes reset the current session without losing cycle history', () => {
  const timer = { ...startTimer(createTimer(), 1_000), completedFocusSessions: 2 };
  const rest = resetTimer(timer, 'longBreak');
  assert.equal(rest.remainingMs, 15 * 60_000);
  assert.equal(rest.status, 'idle');
  assert.equal(rest.endsAt, null);
  const changed = updateDurations(rest, { focus: 40, shortBreak: 8, longBreak: 20 });
  assert.equal(changed.remainingMs, 20 * 60_000);
  assert.equal(changed.completedFocusSessions, 2);
});

test('formatting rounds up partial seconds and supports three-digit minutes', () => {
  assert.equal(formatTime(1), '00:01');
  assert.equal(formatTime(60_001), '01:01');
  assert.equal(formatTime(180 * 60_000), '180:00');
});
