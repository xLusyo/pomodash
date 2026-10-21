import type { TimerState } from '../lib/types.ts';
import { getElement } from './dom.ts';
import { createTimerPipView } from './timer-pip-view.ts';

interface PictureInPictureApi {
  requestWindow: (options: { width: number; height: number }) => Promise<Window>;
}

interface PictureInPictureOptions {
  read: () => TimerState;
  isVisible: () => boolean;
  toggle: () => void;
  reset: () => void;
  useSchedulerWindow: (target: Window) => void;
  refresh: () => void;
}

const appearanceProperties = [
  '--font-body', '--font-heading', '--accent', '--accent-hover', '--accent-soft',
];

export function initializeTimerPictureInPicture(options: PictureInPictureOptions) {
  const button = getElement<HTMLButtonElement>('[data-toggle-pip]');
  const label = getElement<HTMLElement>('[data-pip-label]', button);
  const notice = getElement<HTMLElement>('[data-pip-notice]');
  const template = getElement<HTMLTemplateElement>('[data-pip-template]');
  const api = (window as Window & { documentPictureInPicture?: PictureInPictureApi }).documentPictureInPicture;
  let pipWindow: Window | null = null;
  let view: ReturnType<typeof createTimerPipView> | null = null;
  let observer: MutationObserver | null = null;
  let isOpening = false;

  function showNotice(message: string | null): void {
    notice.textContent = message ?? '';
    notice.hidden = message === null;
  }

  function updateButton(): void {
    button.disabled = !api || isOpening;
    button.setAttribute('aria-pressed', String(pipWindow !== null));
    label.textContent = isOpening ? 'Opening picture in picture…' : pipWindow ? 'Close picture in picture' : 'Picture in picture';
  }

  function cleanup(target: Window): void {
    if (pipWindow !== target) return;
    observer?.disconnect();
    observer = null;
    view = null;
    pipWindow = null;
    target.removeEventListener('pagehide', onClose);
    target.document.removeEventListener('visibilitychange', options.refresh);
    options.useSchedulerWindow(window);
    updateButton();
  }

  function onClose(): void {
    if (pipWindow) cleanup(pipWindow);
  }

  function close(): void {
    if (!pipWindow) return;
    const target = pipWindow;
    cleanup(target);
    target.close();
  }

  async function toggleWindow(): Promise<void> {
    if (!api || isOpening) return;
    if (pipWindow) {
      close();
      return;
    }
    isOpening = true;
    showNotice(null);
    updateButton();
    let openedWindow: Window | null = null;
    try {
      openedWindow = await api.requestWindow({ width: 320, height: 340 });
      if (openedWindow.closed || !options.isVisible()) {
        openedWindow.close();
        return;
      }
      const target = openedWindow;
      pipWindow = target;
      target.addEventListener('pagehide', onClose, { once: true });
      target.document.documentElement.lang = document.documentElement.lang;
      target.document.documentElement.classList.add('pip-document');
      document.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style, link[rel="stylesheet"]').forEach(source => {
        const copy = source.cloneNode(true) as HTMLStyleElement | HTMLLinkElement;
        if (source instanceof HTMLLinkElement) (copy as HTMLLinkElement).href = source.href;
        target.document.head.append(copy);
      });
      function syncAppearance(): void {
        const style = getComputedStyle(document.documentElement);
        appearanceProperties.forEach(property => {
          target.document.documentElement.style.setProperty(property, style.getPropertyValue(property));
        });
      }
      syncAppearance();
      observer = new MutationObserver(syncAppearance);
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
      target.document.body.append(target.document.importNode(template.content, true));
      getElement<HTMLButtonElement>('[data-toggle-timer]', target.document).addEventListener('click', options.toggle);
      getElement<HTMLButtonElement>('[data-reset]', target.document).addEventListener('click', options.reset);
      view = createTimerPipView(target.document);
      target.document.addEventListener('visibilitychange', options.refresh);
      options.useSchedulerWindow(target);
      options.refresh();
      getElement<HTMLButtonElement>('[data-toggle-timer]', target.document).focus();
    } catch (error) {
      if (openedWindow) {
        cleanup(openedWindow);
        openedWindow.close();
      }
      console.error('PomoDash could not open the picture-in-picture timer.', error);
      showNotice('Could not open picture in picture. Please try again.');
    } finally {
      isOpening = false;
      updateButton();
    }
  }

  button.addEventListener('click', () => { void toggleWindow(); });
  if (!api) showNotice('Picture in picture is unavailable in this browser. Try a browser with Document Picture-in-Picture support over HTTPS or localhost.');
  updateButton();

  function render(): void {
    if (!options.isVisible()) {
      close();
      return;
    }
    if (pipWindow?.closed) cleanup(pipWindow);
    view?.render(options.read());
  }

  return { render };
}
