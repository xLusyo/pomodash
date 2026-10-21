import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { createTimer, pauseTimer, reconcileTimer, startTimer, updateDurations } from '../src/lib/timer.ts';
import { initializeTimerPictureInPicture } from '../src/scripts/timer-pip-controller.ts';
import { createTimerPipView } from '../src/scripts/timer-pip-view.ts';

class TestElement extends EventTarget {
  textContent = '';
  hidden = false;
  disabled = false;
  lang = '';
  content = {};
  elements = new Map<string, TestElement>();
  attributes = new Map<string, string>();
  properties = new Map<string, string>();
  classes = new Set<string>();
  style = { setProperty: (name: string, value: string) => this.properties.set(name, value) };
  classList = {
    add: (name: string) => this.classes.add(name),
    toggle: (name: string, value: boolean) => value ? this.classes.add(name) : this.classes.delete(name),
  };
  querySelector(selector: string) { return this.elements.get(selector) ?? null; }
  querySelectorAll() { return []; }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  append() {}
  focus() {}
  click() { this.dispatchEvent(new Event('click')); }
}

class TestDocument extends TestElement {
  title = '';
  documentElement = new TestElement();
  head = new TestElement();
  body = new TestElement();
  importNode() { return {}; }
}

function setup(t: TestContext, supported = true) {
  const document = new TestDocument();
  for (const selector of ['[data-toggle-pip]', '[data-pip-label]', '[data-pip-notice]', '[data-pip-template]']) {
    document.elements.set(selector, new TestElement());
  }
  const button = document.querySelector('[data-toggle-pip]')!;
  const label = document.querySelector('[data-pip-label]')!;
  button.elements.set('[data-pip-label]', label);
  const pipDocument = new TestDocument();
  const root = new TestElement();
  pipDocument.elements.set('.pip-timer', root);
  for (const selector of ['[data-countdown]', '[data-pip-mode]', '[data-pip-status]', '[data-ring]', '[data-toggle-timer]', '[data-reset]', '[data-pip-feedback]']) {
    const element = new TestElement();
    root.elements.set(selector, element);
    pipDocument.elements.set(selector, element);
  }
  const target = Object.assign(new EventTarget(), {
    document: pipDocument,
    closed: false,
    close() { this.closed = true; this.dispatchEvent(new Event('pagehide')); },
  });
  let resolveWindow!: (value: Window) => void;
  let rejectWindow!: (reason: Error) => void;
  const request = new Promise<Window>((resolve, reject) => { resolveWindow = resolve; rejectWindow = reject; });
  let requests = 0;
  const mainWindow = supported ? { documentPictureInPicture: { requestWindow: () => { requests++; return request; } } } : {};
  let isDisconnected = false;
  class TestObserver {
    observe() {}
    disconnect() { isDisconnected = true; }
  }
  const globals = { window: mainWindow, document, MutationObserver: TestObserver, getComputedStyle: () => ({ getPropertyValue: () => 'test-accent' }) };
  Object.entries(globals).forEach(([name, value]) => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { value, configurable: true });
    t.after(() => {
      if (previous) Object.defineProperty(globalThis, name, previous);
      else Reflect.deleteProperty(globalThis, name);
    });
  });
  let timer = createTimer();
  let isVisible = true;
  let toggles = 0;
  let resets = 0;
  const schedulers: Window[] = [];
  const controller = initializeTimerPictureInPicture({
    read: () => timer,
    isVisible: () => isVisible,
    toggle: () => { toggles++; },
    reset: () => { resets++; },
    useSchedulerWindow: target => { schedulers.push(target); },
    refresh: () => controller.render(),
  });
  return {
    document, button, label, target, root, controller, schedulers, mainWindow,
    resolve: () => resolveWindow(target as unknown as Window),
    reject: rejectWindow,
    hide: () => { isVisible = false; controller.render(); },
    run: () => { timer = startTimer(timer, Date.now()); controller.render(); },
    counts: () => ({ requests, toggles, resets, isDisconnected }),
  };
}

const settle = () => new Promise<void>(resolve => setImmediate(resolve));

test('unsupported browsers explain why PiP is unavailable without requesting a window', t => {
  const app = setup(t, false);
  assert.equal(app.button.disabled, true);
  assert.match(app.document.querySelector('[data-pip-notice]')!.textContent, /unavailable/);
  app.button.click();
  assert.equal(app.counts().requests, 0);
});

test('a rejected PiP request restores the button and announces a retry message', async t => {
  const app = setup(t);
  const errors: unknown[][] = [];
  t.mock.method(console, 'error', (...args: unknown[]) => errors.push(args));
  app.button.click();
  assert.equal(app.button.disabled, true);
  app.reject(new Error('Request denied'));
  await settle();
  assert.equal(app.button.disabled, false);
  assert.equal(app.button.attributes.get('aria-pressed'), 'false');
  assert.match(app.document.querySelector('[data-pip-notice]')!.textContent, /try again/);
  assert.equal(errors.length, 1);
});

test('repeated clicks make one request and hiding during opening closes the result', async t => {
  const app = setup(t);
  app.button.click();
  app.button.click();
  app.hide();
  app.resolve();
  await settle();
  assert.equal(app.counts().requests, 1);
  assert.equal(app.target.closed, true);
  assert.equal(app.button.disabled, false);
  assert.equal(app.button.attributes.get('aria-pressed'), 'false');
  assert.equal(app.schedulers.length, 0);
});

test('PiP renders shared state, forwards controls, and releases resources on native closure', async t => {
  const app = setup(t);
  app.button.click();
  app.resolve();
  await settle();
  assert.equal(app.button.attributes.get('aria-pressed'), 'true');
  assert.equal(app.root.querySelector('[data-countdown]')!.textContent, '25:00');
  assert.equal(app.target.document.documentElement.properties.get('--accent'), 'test-accent');
  assert.equal(app.target.document.documentElement.properties.has('--wallpaper'), false);
  app.root.querySelector('[data-toggle-timer]')!.click();
  app.root.querySelector('[data-reset]')!.click();
  assert.equal(app.counts().toggles, 1);
  assert.equal(app.counts().resets, 1);
  app.run();
  assert.equal(app.root.querySelector('[data-toggle-timer]')!.textContent, 'Pause timer');
  app.target.close();
  assert.equal(app.counts().isDisconnected, true);
  assert.equal(app.schedulers.at(-1), app.mainWindow);
  assert.equal(app.button.attributes.get('aria-pressed'), 'false');
  assert.equal(app.counts().toggles, 1);
});

test('hiding an open timer closes PiP and restores the dashboard scheduler', async t => {
  const app = setup(t);
  app.button.click();
  app.resolve();
  await settle();
  app.hide();
  assert.equal(app.target.closed, true);
  assert.equal(app.counts().isDisconnected, true);
  assert.equal(app.schedulers.at(-1), app.mainWindow);
  assert.equal(app.button.attributes.get('aria-pressed'), 'false');
});

test('failed window setup closes the partial window and disconnects observers', async t => {
  const app = setup(t);
  const errors: unknown[][] = [];
  t.mock.method(console, 'error', (...args: unknown[]) => errors.push(args));
  app.target.document.elements.delete('[data-reset]');
  app.button.click();
  app.resolve();
  await settle();
  assert.equal(app.target.closed, true);
  assert.equal(app.counts().isDisconnected, true);
  assert.equal(app.button.disabled, false);
  assert.equal(app.button.attributes.get('aria-pressed'), 'false');
  assert.equal(errors.length, 1);
});

test('floating countdown follows deadlines, pausing, and completion into the next mode', t => {
  const app = setup(t);
  const view = createTimerPipView(app.target.document as unknown as Document);
  const running = startTimer(createTimer(), 1_000);
  const countdown = app.root.querySelector('[data-countdown]')!;
  view.render(running, 11_000);
  assert.equal(countdown.textContent, '24:50');
  view.render(running, 61_000);
  assert.equal(countdown.textContent, '24:00');
  view.render(pauseTimer(running, 61_000), 1_000_000);
  assert.equal(countdown.textContent, '24:00');
  assert.equal(app.root.querySelector('[data-toggle-timer]')!.textContent, 'Resume timer');
  const completed = reconcileTimer(running, running.endsAt!);
  view.render(completed, running.endsAt!);
  assert.equal(countdown.textContent, '05:00');
  assert.equal(app.root.querySelector('[data-pip-mode]')!.textContent, 'Short break');
  assert.equal(app.root.querySelector('[data-toggle-timer]')!.textContent, 'Start break');
  assert.equal(app.root.classes.has('is-break'), true);
  assert.equal(app.root.querySelector('[data-pip-feedback]')!.hidden, false);
});

test('floating timer supports three-digit minutes and mode changes without stale feedback', t => {
  const app = setup(t);
  const view = createTimerPipView(app.target.document as unknown as Document);
  const timer = updateDurations(createTimer(), { focus: 180, shortBreak: 5, longBreak: 15 });
  view.render(timer, 0);
  assert.equal(app.root.querySelector('[data-countdown]')!.textContent, '180:00');
  assert.equal(app.root.querySelector('[data-countdown]')!.classes.has('is-long'), true);
  const running = startTimer(timer, 0);
  const completed = reconcileTimer(running, running.endsAt!);
  view.render(completed, running.endsAt!);
  view.render(startTimer(completed, running.endsAt!), running.endsAt!);
  assert.equal(app.root.querySelector('[data-countdown]')!.classes.has('is-long'), false);
  assert.equal(app.root.querySelector('[data-pip-feedback]')!.hidden, true);
});
