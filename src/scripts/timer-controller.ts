import { pauseTimer, reconcileTimer, resetTimer, startTimer, TIMER_MODES, updateDurations } from '../lib/timer.ts';
import type { TimerMode, TimerState } from '../lib/types.ts';
import { getElement } from './dom';
import { createTimerView } from './timer-view';

interface TimerOptions {
  read: () => TimerState;
  update: (timer: TimerState) => void;
}

export function initializeTimer({ read, update }: TimerOptions) {
  const widget = getElement<HTMLElement>('[data-widget="timer"]');
  const dialog = getElement<HTMLDialogElement>('#timer-settings');
  const form = getElement<HTMLFormElement>('#timer-settings-form');
  const view = createTimerView();

  getElement<HTMLButtonElement>('[data-toggle-timer]', widget).addEventListener('click', () => {
    const current = reconcileTimer(read(), Date.now());
    if (current !== read()) {
      update(current);
      return;
    }
    update(current.status === 'running' ? pauseTimer(current, Date.now()) : startTimer(current, Date.now()));
  });
  getElement<HTMLButtonElement>('[data-reset]', widget).addEventListener('click', () => update(resetTimer(read())));
  widget.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => {
    button.addEventListener('click', () => update(resetTimer(read(), button.dataset.mode as TimerMode)));
  });
  getElement<HTMLButtonElement>('[data-open-settings]', widget).addEventListener('click', () => {
    TIMER_MODES.forEach(mode => {
      getElement<HTMLInputElement>(`[name="${mode}"]`, form).value = String(read().durations[mode]);
    });
    dialog.showModal();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const durations = {
      focus: Number(data.get('focus')), shortBreak: Number(data.get('shortBreak')), longBreak: Number(data.get('longBreak')),
    };
    update(updateDurations(read(), durations));
    dialog.close();
  });

  function tick(): void {
    const previous = read();
    const next = reconcileTimer(previous, Date.now());
    if (previous !== next) update(next);
    view.render(read());
  }
  window.setInterval(tick, 250);
  document.addEventListener('visibilitychange', tick);
  return { render: () => view.render(read()) };
}
