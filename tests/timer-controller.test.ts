import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initializeTimer } from '../src/scripts/timer-controller.ts';
import { createTimer, reconcileTimer, resetTimer, startTimer } from '../src/lib/timer.ts';
import type { TimerMode } from '../src/lib/types.ts';
import { mockTimerAudio } from './helpers/timer-audio.ts';
import { mockTimerDom, settleAudio } from './helpers/timer-dom.ts';

for (const mode of ['focus', 'shortBreak', 'longBreak'] as TimerMode[]) {
  test(`${mode} completion plays once across repeated ticks and visibility changes`, async t => {
    const dom = mockTimerDom(t);
    const audio = mockTimerAudio(t);
    let now = 1000;
    t.mock.method(Date, 'now', () => now);
    let timer = resetTimer(createTimer(), mode);
    const controller = initializeTimer({ storage: null, read: () => timer, update: next => { timer = next; }, isVisible: () => true });
    controller.render();
    dom.element('[data-toggle-timer]').click();
    now = timer.endsAt!;
    dom.tick();
    dom.tick();
    dom.document.dispatchEvent(new Event('visibilitychange'));
    await settleAudio();
    assert.equal(audio.sources.length, 3);
    assert.equal(timer.status, 'idle');
    assert.equal(timer.lastCompleted, mode);
  });
}

test('pause, reset, mode switches, restored completion, and renders stay silent', async t => {
  const dom = mockTimerDom(t);
  const audio = mockTimerAudio(t);
  const now = Date.now();
  let timer = startTimer(createTimer(), now);
  const controller = initializeTimer({ storage: null, read: () => timer, update: next => { timer = next; }, isVisible: () => true });
  controller.render();
  dom.element('[data-toggle-timer]').click();
  dom.element('[data-reset]').click();
  dom.modes[1].click();
  timer = reconcileTimer(startTimer(createTimer(), 1), now);
  controller.render();
  dom.tick();
  await settleAudio();
  assert.equal(audio.sources.length, 0);
});

test('a toggle at the deadline completes the existing session without starting another or repeating the alert', async t => {
  const dom = mockTimerDom(t);
  const audio = mockTimerAudio(t);
  let timer = startTimer(createTimer(), 1);
  t.mock.method(Date, 'now', () => timer.endsAt ?? 1_500_001);
  initializeTimer({ storage: null, read: () => timer, update: next => { timer = next; }, isVisible: () => true });
  dom.element('[data-toggle-timer]').click();
  dom.tick();
  await settleAudio();
  assert.equal(timer.status, 'idle');
  assert.equal(audio.sources.length, 3);
});
