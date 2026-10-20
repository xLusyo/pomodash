import { constrainSize, minimumWidgetSize } from '../lib/canvas.ts';
import type { WidgetId, WidgetPosition, WidgetSize } from '../lib/types.ts';
import { announce, getElement } from './dom';

interface ResizeOptions {
  canvas: HTMLElement;
  widgets: HTMLElement[];
  position: (id: WidgetId) => WidgetPosition;
  save: (id: WidgetId, size: WidgetSize) => void;
  render: () => void;
}

interface ResizeState {
  widget: HTMLElement;
  id: WidgetId;
  pointerId: number;
  startX: number;
  startY: number;
  startSize: WidgetSize;
  size: WidgetSize;
}

export function initializeWidgetResize({ canvas, widgets, position, save, render }: ResizeOptions) {
  let active: ResizeState | null = null;

  function constrain(widget: HTMLElement, size: WidgetSize): WidgetSize {
    const id = widget.dataset.widget as WidgetId;
    const current = position(id);
    return constrainSize(size, minimumWidgetSize(id), {
      width: canvas.clientWidth - current.x,
      height: canvas.clientHeight - current.y,
    });
  }

  function finish(shouldSave: boolean): void {
    if (!active) return;
    const current = active;
    active = null;
    current.widget.classList.remove('is-resizing');
    document.body.classList.remove('is-resizing-widget');
    const handle = getElement<HTMLButtonElement>('[data-resize]', current.widget);
    if (handle.hasPointerCapture(current.pointerId)) handle.releasePointerCapture(current.pointerId);
    if (shouldSave) {
      save(current.id, current.size);
      announce('Widget size saved.');
    } else render();
  }

  widgets.forEach(widget => {
    const id = widget.dataset.widget as WidgetId;
    const handle = getElement<HTMLButtonElement>('[data-resize]', widget);
    handle.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      handle.focus({ preventScroll: true });
      const size = { width: widget.offsetWidth, height: widget.offsetHeight };
      active = {
        widget, id, pointerId: event.pointerId,
        startX: event.pageX, startY: event.pageY, startSize: size, size,
      };
      widget.classList.add('is-resizing');
      document.body.classList.add('is-resizing-widget');
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('lostpointercapture', () => finish(false));
    handle.addEventListener('keydown', event => {
      const step = event.shiftKey ? 40 : 10;
      const changes: Record<string, WidgetSize> = {
        ArrowLeft: { width: -step, height: 0 }, ArrowRight: { width: step, height: 0 },
        ArrowUp: { width: 0, height: -step }, ArrowDown: { width: 0, height: step },
      };
      const change = changes[event.key];
      if (!change) return;
      event.preventDefault();
      finish(false);
      save(id, constrain(widget, {
        width: widget.offsetWidth + change.width,
        height: widget.offsetHeight + change.height,
      }));
      announce('Widget size saved.');
    });
  });

  document.addEventListener('pointermove', event => {
    if (!active || active.pointerId !== event.pointerId) return;
    active.size = constrain(active.widget, {
      width: active.startSize.width + event.pageX - active.startX,
      height: active.startSize.height + event.pageY - active.startY,
    });
    active.widget.style.width = `${active.size.width}px`;
    active.widget.style.height = `${active.size.height}px`;
  });
  document.addEventListener('pointerup', event => {
    if (active?.pointerId === event.pointerId) finish(true);
  });
  document.addEventListener('pointercancel', event => {
    if (active?.pointerId === event.pointerId) finish(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') finish(false);
  });
  window.addEventListener('blur', () => finish(false));
  window.addEventListener('resize', () => finish(false));

  return {
    preview: (id: WidgetId) => active?.id === id ? active.size : undefined,
  };
}
