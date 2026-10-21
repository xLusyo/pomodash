import { pauseTimer, reconcileTimer, resetTimer, startTimer, TIMER_MODES, updateDurations } from '../lib/timer.ts';
import type { TimerMode, TimerState } from '../lib/types.ts';
import { getElement } from './dom';
import { createTimerView } from './timer-view';
import { initializeTimerPictureInPicture } from './timer-pip-controller';

interface TimerOptions {
  read: () => TimerState;
  update: (timer: TimerState) => void;
  isVisible: () => boolean;
}

export function initializeTimer({ read, update, isVisible }: TimerOptions) {
  const widget = getElement<HTMLElement>('[data-widget="timer"]');
  const dialog = getElement<HTMLDialogElement>('#timer-settings');
  const form = getElement<HTMLFormElement>('#timer-settings-form');
  const view = createTimerView();

  function toggle(): void {
    const current = reconcileTimer(read(), Date.now());
    if (current !== read()) {
      update(current);
      return;
    }
    update(current.status === 'running' ? pauseTimer(current, Date.now()) : startTimer(current, Date.now()));
  }
  const reset = () => update(resetTimer(read()));
  getElement<HTMLButtonElement>('[data-toggle-timer]', widget).addEventListener('click', toggle);
  getElement<HTMLButtonElement>('[data-reset]', widget).addEventListener('click', reset);
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
    render();
  }
  let schedulerWindow: Window = window;
  let interval = schedulerWindow.setInterval(tick, 250);
  const pictureInPicture = initializeTimerPictureInPicture({
    read, isVisible, toggle, reset, refresh: tick,
    useSchedulerWindow: target => {
      schedulerWindow.clearInterval(interval);
      schedulerWindow = target;
      interval = schedulerWindow.setInterval(tick, 250);
    },
  });

  function render(): void {
    view.render(read());
    pictureInPicture.render();
  }

  document.addEventListener('visibilitychange', tick);
  return { render };
}
