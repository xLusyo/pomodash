import type { TestContext } from 'node:test';

export class TimerElement extends EventTarget {
  textContent = '';
  hidden = false;
  disabled = false;
  open = false;
  value = '';
  files: File[] = [];
  children: TimerElement[] = [];
  dataset: Record<string, string> = {};
  elements = new Map<string, TimerElement>();
  modes: TimerElement[] = [];
  attributes = new Map<string, string>();
  style = { strokeDashoffset: '', setProperty() {} };
  classList = { toggle() {}, add() {} };
  querySelector(selector: string) { return this.elements.get(selector) ?? null; }
  querySelectorAll(selector: string) { return selector === '[data-mode]' ? this.modes : []; }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  focus() {}
  append() {}
  importNode() { return {}; }
  showModal() { this.open = true; }
  close() { this.open = false; this.dispatchEvent(new Event('close')); }
  click() { this.dispatchEvent(new Event('click')); }
  change() { this.dispatchEvent(new Event('change')); }
  reportValidity() { return true; }
}

export function mockTimerDom(t: TestContext) {
  const document = Object.assign(new TimerElement(), {
    title: '', documentElement: new TimerElement(), head: new TimerElement(), body: new TimerElement(),
  });
  const selectors = [
    '[data-widget="timer"]', '#timer-settings', '#timer-settings-form', '[data-timer-sound]', '[data-sound-file]',
    '[data-sound-filename]', '[data-preview-sound]', '[data-remove-sound]', '[data-save-timer]', '[data-sound-message]',
    '[data-sound-notice]', '[data-open-settings]', '[data-announcement]', 'option[value="custom"]',
    '[data-countdown]', '[data-clock-label]', '[data-clock-caption]', '[data-ring]', '[data-toggle-label]',
    '[data-timer-feedback]', '[data-session-dots]', '[data-toggle-timer]', '[data-reset]', '[data-toggle-pip]',
    '[data-pip-label]', '[data-pip-notice]', '[data-pip-template]', '[data-start-icon]', '[data-pause-icon]',
    '[data-session-label]', '[name="focus"]', '[name="shortBreak"]', '[name="longBreak"]',
  ];
  for (const selector of selectors) document.elements.set(selector, new TimerElement());
  document.elements.forEach(element => { element.elements = document.elements; });
  const element = (selector: string) => document.elements.get(selector)!;
  element('[data-session-dots]').children = Array.from({ length: 4 }, () => new TimerElement());
  const modes = ['focus', 'shortBreak', 'longBreak'].map(mode => Object.assign(new TimerElement(), { dataset: { mode } }));
  element('[data-widget="timer"]').modes = modes;
  let tick: (() => void) | null = null;
  const window = {
    setInterval: (callback: () => void) => { tick = callback; return 1; }, clearInterval() {},
  };
  for (const [name, value] of Object.entries({ document, window })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, name, previous);
      else Reflect.deleteProperty(globalThis, name);
    });
  }
  return { document, element, modes, tick: () => tick?.(), window };
}

export const settleAudio = () => new Promise<void>(resolve => setImmediate(resolve));
