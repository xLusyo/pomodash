export type WidgetId = 'timer' | 'todos';
export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';
export type TimerStatus = 'idle' | 'running' | 'paused';

export interface TimerState {
  mode: TimerMode;
  status: TimerStatus;
  durations: Record<TimerMode, number>;
  remainingMs: number;
  endsAt: number | null;
  completedFocusSessions: number;
  lastCompleted: TimerMode | null;
}

export interface Todo {
  id: string;
  title: string;
  isComplete: boolean;
}

export interface DashboardState {
  version: 1;
  widgets: WidgetId[];
  positions?: Partial<Record<WidgetId, WidgetPosition>>;
  sizes?: Partial<Record<WidgetId, WidgetSize>>;
  timer: TimerState;
  todos: Todo[];
}

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}
