export function getElement<T extends Element>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`PomoDash could not find the required element: ${selector}`);
  return element;
}

export function initializeDialogs(): void {
  document.querySelectorAll<HTMLDialogElement>('dialog').forEach(dialog => {
    dialog.querySelectorAll<HTMLButtonElement>('[data-close-dialog]').forEach(button => {
      button.addEventListener('click', () => dialog.close());
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
  });
}

export function announce(message: string): void {
  getElement<HTMLElement>('[data-announcement]').textContent = message;
}
