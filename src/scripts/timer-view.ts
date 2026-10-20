import { formatTime, MODE_LABELS, remainingTime } from '../lib/timer.ts';
import type { TimerMode, TimerState } from '../lib/types.ts';
import { getElement } from './dom';

const captions: Record<TimerMode, string> = {
  focus: 'One thing at a time.', shortBreak: 'Take a little breathing room.', longBreak: 'You’ve earned a slower moment.',
};

export function createTimerView() {
  const widget = getElement<HTMLElement>('[data-widget="timer"]');
  const countdown = getElement<HTMLElement>('[data-countdown]', widget);
  const label = getElement<HTMLElement>('[data-clock-label]', widget);
  const caption = getElement<HTMLElement>('[data-clock-caption]', widget);
  const ring = getElement<SVGCircleElement>('[data-ring]', widget);
  const toggleLabel = getElement<HTMLElement>('[data-toggle-label]', widget);
  const feedback = getElement<HTMLElement>('[data-timer-feedback]', widget);
  const dots = getElement<HTMLElement>('[data-session-dots]', widget);
  let renderedTimer: TimerState | null = null;
  let renderedTime = '';

  function render(timer: TimerState, now = Date.now()): void {
    const remaining = remainingTime(timer, now);
    const formatted = formatTime(remaining);
    const hasStateChanged = renderedTimer !== timer;
    if (!hasStateChanged && renderedTime === formatted) return;
    renderedTime = formatted;
    if (countdown.textContent !== formatted) countdown.textContent = formatted;
    countdown.classList.toggle('is-long', formatted.length > 5);
    countdown.setAttribute('aria-label', `${MODE_LABELS[timer.mode]} time remaining`);
    ring.style.strokeDashoffset = String(100 - Math.min(1, remaining / (timer.durations[timer.mode] * 60_000)) * 100);
    const isRunning = timer.status === 'running';
    document.title = isRunning ? `${formatted} · ${MODE_LABELS[timer.mode]} — PomoDash` : 'PomoDash — Your space, your pace';
    if (!hasStateChanged) return;
    renderedTimer = timer;
    label.textContent = timer.status === 'paused' ? 'A MOMENT ON PAUSE' : timer.mode === 'focus' ? 'TIME TO FOCUS' : 'ROOM TO RECHARGE';
    caption.textContent = captions[timer.mode];
    widget.classList.toggle('is-break', timer.mode !== 'focus');
    widget.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.mode === timer.mode));
    });
    getElement<HTMLElement>('[data-start-icon]', widget).hidden = isRunning;
    getElement<HTMLElement>('[data-pause-icon]', widget).hidden = !isRunning;
    toggleLabel.textContent = isRunning ? 'Pause timer' : timer.status === 'paused' ? 'Resume timer' : timer.mode === 'focus' ? 'Start focus' : 'Start break';
    const inCycle = timer.completedFocusSessions % 4;
    const completed = timer.mode === 'longBreak' && timer.completedFocusSessions > 0 ? 4 : inCycle;
    [...dots.children].forEach((dot, index) => {
      dot.classList.toggle('is-complete', index < completed);
      dot.classList.toggle('is-current', timer.mode === 'focus' && index === inCycle);
    });
    dots.setAttribute('aria-label', `${completed} of 4 focus sessions completed`);
    getElement<HTMLElement>('[data-session-label]', widget).textContent = timer.mode === 'focus'
      ? `Session ${inCycle + 1} of 4` : `${completed} of 4 complete`;
    const completion = timer.lastCompleted;
    feedback.hidden = completion === null;
    const message = completion === 'focus'
      ? `Focus complete. Your ${MODE_LABELS[timer.mode].toLowerCase()} is ready when you are.`
      : 'Break complete. A fresh focus session is ready when you are.';
    if (completion !== null && feedback.textContent !== message) feedback.textContent = message;
  }
  return { render };
}
