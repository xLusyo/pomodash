import { pauseTimer, reconcileTimer, resetTimer, startTimer, TIMER_MODES, updateDurations } from '../lib/timer.ts';
import type { TimerMode, TimerState } from '../lib/types.ts';
import { getElement } from './dom.ts';
import { createTimerView } from './timer-view.ts';
import { initializeTimerPictureInPicture } from './timer-pip-controller.ts';
import { initializeTimerSound } from './timer-sound-controller.ts';
import type { SoundStorage } from '../lib/timer-sound-storage.ts';

interface TimerOptions {
  storage: SoundStorage | null;
  read: () => TimerState;
  update: (timer: TimerState) => void;
  isVisible: () => boolean;
}

export function initializeTimer({ storage, read, update, isVisible }: TimerOptions) {
  const widget = getElement<HTMLElement>('[data-widget="timer"]');
  const dialog = getElement<HTMLDialogElement>('#timer-settings');
  const form = getElement<HTMLFormElement>('#timer-settings-form');
  const view = createTimerView();
  const sound = initializeTimerSound(storage);

  function reconcile(now = Date.now()): TimerState {
    const previous = read();
    const next = reconcileTimer(previous, now);
    if (previous !== next) {
      update(next);
      sound.complete();
    }
    return next;
  }

  function toggle(): void {
    sound.unlock();
    const now = Date.now();
    const previous = read();
    const current = reconcile(now);
    if (current !== previous) return;
    update(current.status === 'running' ? pauseTimer(current, now) : startTimer(current, now));
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
    sound.open();
    dialog.showModal();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const durations = {
      focus: Number(data.get('focus')), shortBreak: Number(data.get('shortBreak')), longBreak: Number(data.get('longBreak')),
    };
    if (!sound.save()) return;
    update(updateDurations(read(), durations));
    dialog.close();
  });

  function tick(): void {
    reconcile();
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
