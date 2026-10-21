import { formatTime, MODE_LABELS, remainingTime } from '../lib/timer.ts';
import type { TimerState } from '../lib/types.ts';
import { getElement } from './dom.ts';

export function createTimerPipView(document: Document) {
  const root = getElement<HTMLElement>('.pip-timer', document);
  const countdown = getElement<HTMLElement>('[data-countdown]', root);
  const mode = getElement<HTMLElement>('[data-pip-mode]', root);
  const status = getElement<HTMLElement>('[data-pip-status]', root);
  const ring = getElement<SVGCircleElement>('[data-ring]', root);
  const toggle = getElement<HTMLButtonElement>('[data-toggle-timer]', root);
  const feedback = getElement<HTMLElement>('[data-pip-feedback]', root);
  let renderedTimer: TimerState | null = null;
  let renderedTime = '';

  function render(timer: TimerState, now = Date.now()): void {
    const remaining = remainingTime(timer, now);
    const formatted = formatTime(remaining);
    if (renderedTimer === timer && renderedTime === formatted) return;
    renderedTimer = timer;
    renderedTime = formatted;
    countdown.textContent = formatted;
    countdown.classList.toggle('is-long', formatted.length > 5);
    countdown.setAttribute('aria-label', `${MODE_LABELS[timer.mode]} time remaining`);
    mode.textContent = MODE_LABELS[timer.mode];
    root.classList.toggle('is-break', timer.mode !== 'focus');
    ring.style.strokeDashoffset = String(100 - Math.min(1, remaining / (timer.durations[timer.mode] * 60_000)) * 100);
    const isRunning = timer.status === 'running';
    toggle.textContent = isRunning ? 'Pause timer' : timer.status === 'paused' ? 'Resume timer' : timer.mode === 'focus' ? 'Start focus' : 'Start break';
    status.textContent = isRunning ? 'One moment at a time.' : timer.status === 'paused' ? 'A moment on pause.' : 'Ready when you are.';
    document.title = `${formatted} · ${MODE_LABELS[timer.mode]} — PomoDash`;
    feedback.hidden = timer.lastCompleted === null;
    const message = timer.lastCompleted === 'focus' ? 'Focus complete. Your break is ready.' : 'Break complete. Your focus is ready.';
    if (timer.lastCompleted !== null && feedback.textContent !== message) feedback.textContent = message;
  }

  return { render };
}
