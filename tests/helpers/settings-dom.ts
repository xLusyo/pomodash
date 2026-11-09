import type { TestContext } from 'node:test';
import { mockTimerDom, TimerElement } from './timer-dom.ts';

export function mockSettingsDom(t: TestContext) {
  const dom = mockTimerDom(t);
  for (const selector of ['#appearance-form', '[data-open-appearance]', '[data-wallpaper-file]', '[data-save-appearance]',
    '[data-remove-wallpaper]', '[data-wallpaper-preview]', '[data-appearance-message]', '[data-upload-wallpaper]',
    '[data-wallpaper-empty]', '[data-reset-appearance]']) {
    const element = new TimerElement();
    element.elements = dom.document.elements;
    dom.document.elements.set(selector, element);
  }
  const tabs = ['wallpaper', 'fonts', 'colors', 'sounds'].map(name => {
    const tab = new TimerElement();
    tab.setAttribute('aria-controls', `${name}-panel`);
    return tab;
  });
  const panels = ['wallpaper', 'fonts', 'colors', 'sounds'].map(id => Object.assign(new TimerElement(), { id: `${id}-panel` }));
  dom.element('#appearance-settings').querySelectorAll = selector => selector === '[role="tab"]' ? tabs : panels;
  const properties = new Map<string, string>();
  dom.document.documentElement.style.setProperty = (name: string, value: string) => { properties.set(name, value); };
  const previousInput = Object.getOwnPropertyDescriptor(globalThis, 'HTMLInputElement');
  Object.defineProperty(globalThis, 'HTMLInputElement', { value: TimerElement, configurable: true });
  t.after(() => {
    if (previousInput) Object.defineProperty(globalThis, 'HTMLInputElement', previousInput);
    else Reflect.deleteProperty(globalThis, 'HTMLInputElement');
  });
  function chooseAppearance(name: string, value: string) {
    const input = Object.assign(new TimerElement(), { type: 'radio', name, value });
    const event = new Event('change');
    Object.defineProperty(event, 'target', { value: input });
    dom.element('#appearance-form').dispatchEvent(event);
  }
  return { ...dom, tabs, panels, properties, chooseAppearance };
}
