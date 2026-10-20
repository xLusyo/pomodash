import type { WidgetId } from '../lib/types.ts';
import { getElement } from './dom';

interface PickerOptions {
  read: () => WidgetId[];
  add: (widget: WidgetId) => void;
}

export function initializeWidgetPicker({ read, add }: PickerOptions) {
  const dialog = getElement<HTMLDialogElement>('#widget-picker');
  const options = dialog.querySelectorAll<HTMLButtonElement>('[data-add-widget]');
  document.querySelectorAll<HTMLButtonElement>('[data-open-picker]').forEach(button => {
    button.addEventListener('click', () => dialog.showModal());
  });
  options.forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.addWidget as WidgetId;
      add(id);
      dialog.close();
      getElement<HTMLElement>(`[data-widget="${id}"] h2`).focus();
    });
  });

  function render(): void {
    options.forEach(button => {
      const isAdded = read().includes(button.dataset.addWidget as WidgetId);
      button.disabled = isAdded;
      const status = getElement<HTMLElement>('[data-option-status]', button);
      status.textContent = isAdded ? 'Added ✓' : '+';
      status.classList.toggle('is-available', !isAdded);
    });
  }
  return { render };
}
