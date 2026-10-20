import type { WidgetId, WidgetPosition, WidgetSize } from './types.ts';

export const CANVAS_PADDING = 24;

export interface CanvasBounds {
  width: number;
  height: number;
  widgetWidth: number;
  widgetHeight: number;
}

export function constrainPosition(position: WidgetPosition, bounds: CanvasBounds): WidgetPosition {
  const maxX = Math.max(0, bounds.width - bounds.widgetWidth);
  const maxY = Math.max(0, bounds.height - bounds.widgetHeight);
  return {
    x: Math.round(Math.max(0, Math.min(position.x, maxX))),
    y: Math.round(Math.max(0, Math.min(position.y, maxY))),
  };
}

export function offsetPosition(position: WidgetPosition, offset: WidgetPosition): WidgetPosition {
  return { x: position.x + offset.x, y: position.y + offset.y };
}

export function minimumWidgetSize(id: WidgetId): WidgetSize {
  return { width: 320, height: id === 'timer' ? 560 : 360 };
}

export function constrainSize(size: WidgetSize, minimum: WidgetSize, available: WidgetSize): WidgetSize {
  return {
    width: Math.round(Math.min(available.width, Math.max(minimum.width, size.width))),
    height: Math.round(Math.min(available.height, Math.max(minimum.height, size.height))),
  };
}
