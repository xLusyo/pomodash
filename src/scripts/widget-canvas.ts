import { CANVAS_PADDING, constrainPosition, constrainSize, minimumWidgetSize, offsetPosition } from '../lib/canvas.ts';
import type { DashboardState, WidgetId, WidgetPosition, WidgetSize } from '../lib/types.ts';
import { announce, getElement } from './dom';
import { initializeWidgetResize } from './widget-resize';

interface CanvasOptions {
  read: () => DashboardState;
  move: (widget: WidgetId, position: WidgetPosition) => void;
  resize: (widget: WidgetId, size: WidgetSize) => void;
  hide: (widget: WidgetId) => void;
}

interface DragState {
  widget: HTMLElement;
  id: WidgetId;
  pointerId: number;
  startPointer: WidgetPosition;
  startPosition: WidgetPosition;
  position: WidgetPosition;
  hasMoved: boolean;
}

const INTERACTIVE_SURFACE = 'button, input, textarea, select, a, label, form, [contenteditable]';

export function initializeWidgetCanvas({ read, move, resize, hide }: CanvasOptions) {
  const canvas = getElement<HTMLElement>('[data-widget-canvas]');
  const widgets = [...canvas.querySelectorAll<HTMLElement>('[data-widget]')];
  const positions = new Map<WidgetId, WidgetPosition>();
  let drag: DragState | null = null;
  let frontLayer = 0;

  function bounds(widget: HTMLElement) {
    return {
      width: canvas.clientWidth,
      height: canvas.clientHeight,
      widgetWidth: widget.offsetWidth,
      widgetHeight: widget.offsetHeight,
    };
  }

  function place(widget: HTMLElement, position: WidgetPosition): void {
    widget.style.transform = `translate(${position.x}px, ${position.y}px)`;
    positions.set(widget.dataset.widget as WidgetId, position);
  }

  function bringToFront(widget: HTMLElement): void {
    widget.style.zIndex = String(++frontLayer);
  }

  function finishDrag(shouldSave: boolean): void {
    if (!drag) return;
    const current = drag;
    drag = null;
    current.widget.classList.remove('is-dragging');
    document.body.classList.remove('is-dragging-widget');
    if (current.widget.hasPointerCapture(current.pointerId)) {
      current.widget.releasePointerCapture(current.pointerId);
    }
    if (shouldSave && current.hasMoved) {
      move(current.id, current.position);
      announce('Widget position saved.');
      return;
    }
    place(current.widget, current.startPosition);
  }

  widgets.forEach(widget => {
    const id = widget.dataset.widget as WidgetId;
    getElement<HTMLButtonElement>('[data-hide]', widget).addEventListener('click', () => {
      finishDrag(false);
      hide(id);
      getElement<HTMLButtonElement>('.canvas-add-button').focus();
      announce(`${id === 'timer' ? 'Pomodoro' : 'To-do list'} hidden. Your data is kept.`);
    });

    widget.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      bringToFront(widget);
      if (!(event.target instanceof Element) || event.target.closest(INTERACTIVE_SURFACE)) return;
      event.preventDefault();
      widget.focus({ preventScroll: true });
      const position = positions.get(id)!;
      drag = {
        widget, id, pointerId: event.pointerId,
        startPointer: { x: event.pageX, y: event.pageY },
        startPosition: position, position, hasMoved: false,
      };
      widget.setPointerCapture(event.pointerId);
    });

    widget.addEventListener('lostpointercapture', () => finishDrag(false));
    widget.addEventListener('keydown', event => {
      if (event.target !== widget) return;
      const step = event.shiftKey ? 40 : 10;
      const offsets: Record<string, WidgetPosition> = {
        ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 },
        ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step },
      };
      const offset = offsets[event.key];
      if (!offset) return;
      event.preventDefault();
      finishDrag(false);
      bringToFront(widget);
      move(id, constrainPosition(offsetPosition(positions.get(id)!, offset), bounds(widget)));
      announce('Widget position saved.');
    });
  });

  document.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const offset = { x: event.pageX - drag.startPointer.x, y: event.pageY - drag.startPointer.y };
    if (!drag.hasMoved && Math.hypot(offset.x, offset.y) < 4) return;
    drag.hasMoved = true;
    drag.position = constrainPosition(offsetPosition(drag.startPosition, offset), bounds(drag.widget));
    drag.widget.classList.add('is-dragging');
    document.body.classList.add('is-dragging-widget');
    place(drag.widget, drag.position);
  });
  document.addEventListener('pointerup', event => {
    if (drag?.pointerId === event.pointerId) finishDrag(true);
  });
  document.addEventListener('pointercancel', event => {
    if (drag?.pointerId === event.pointerId) finishDrag(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') finishDrag(false);
  });
  window.addEventListener('blur', () => finishDrag(false));
  window.addEventListener('resize', () => {
    finishDrag(false);
    render();
  });

  function render(): void {
    const state = read();
    widgets.forEach(widget => {
      const wasHidden = widget.hidden;
      widget.hidden = !state.widgets.includes(widget.dataset.widget as WidgetId);
      if (!widget.style.zIndex) {
        widget.style.zIndex = String(state.widgets.indexOf(widget.dataset.widget as WidgetId) + 1);
        frontLayer = Math.max(frontLayer, state.widgets.length);
      } else if (!widget.hidden && wasHidden) bringToFront(widget);
    });
    const visible = widgets.filter(widget => !widget.hidden);
    const height = Math.max(window.innerHeight, 560 + CANVAS_PADDING * 2);
    canvas.style.height = `${height}px`;
    const defaultWidth = Math.min(440, (canvas.clientWidth - CANVAS_PADDING * 3) / 2);
    state.widgets.forEach(id => {
      const widget = widgets.find(element => element.dataset.widget === id)!;
      const size = constrainSize(
        resizing.preview(id) ?? state.sizes?.[id] ?? { width: defaultWidth, height: id === 'timer' ? 560 : 514 },
        minimumWidgetSize(id),
        { width: canvas.clientWidth, height },
      );
      widget.style.width = `${size.width}px`;
      widget.style.height = `${size.height}px`;
      const fallback = {
        x: id === 'timer' ? CANVAS_PADDING : defaultWidth + CANVAS_PADDING * 2,
        y: CANVAS_PADDING,
      };
      if (drag?.id !== id) place(widget, constrainPosition(state.positions?.[id] ?? fallback, bounds(widget)));
    });
    getElement<HTMLElement>('[data-canvas-empty]').hidden = visible.length > 0;
  }

  const resizing = initializeWidgetResize({
    canvas, widgets,
    position: id => positions.get(id)!,
    save: resize,
    render,
  });
  const observer = new ResizeObserver(render);
  widgets.forEach(widget => observer.observe(widget));
  return { render };
}
