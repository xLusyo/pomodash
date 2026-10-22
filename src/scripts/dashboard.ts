import { loadDashboard, saveDashboard } from '../lib/storage.ts';
import { pauseTimer, reconcileTimer } from '../lib/timer.ts';
import type { DashboardState, WidgetId } from '../lib/types.ts';
import { announce, getElement, initializeDialogs } from './dom';
import { initializeTimer } from './timer-controller';
import { initializeTodos } from './todo-controller';
import { initializeWidgetCanvas } from './widget-canvas';
import { initializeWidgetPicker } from './widget-picker';
import { initializeAppearance } from './appearance-controller';

function getBrowserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch (error) {
    console.error('PomoDash cannot access browser storage.', error);
    return null;
  }
}

function showStorageNotice(message: string | null): void {
  getElement<HTMLElement>('[data-storage-notice]').hidden = message === null;
  getElement<HTMLElement>('[data-notice-text]').textContent = message ?? '';
}

export function initializeDashboard(): void {
  const storage = getBrowserStorage();
  const loaded = loadDashboard(storage);
  let state: DashboardState = loaded.state;
  showStorageNotice(loaded.notice);
  initializeDialogs();
  initializeAppearance(storage);

  function setState(next: DashboardState): void {
    state = next;
    showStorageNotice(saveDashboard(storage, state));
    render();
  }

  const timer = initializeTimer({
    storage,
    read: () => state.timer,
    isVisible: () => state.widgets.includes('timer'),
    update: next => setState({ ...state, timer: next }),
  });
  const todos = initializeTodos({
    read: () => state.todos,
    update: next => setState({ ...state, todos: next }),
  });
  const canvas = initializeWidgetCanvas({
    read: () => state,
    move: (id, position) => setState({
      ...state,
      widgets: [...state.widgets.filter(widget => widget !== id), id],
      positions: { ...state.positions, [id]: position },
    }),
    resize: (id, size) => setState({
      ...state,
      widgets: [...state.widgets.filter(widget => widget !== id), id],
      sizes: { ...state.sizes, [id]: size },
    }),
    hide: id => setState({
      ...state,
      widgets: state.widgets.filter(widget => widget !== id),
      timer: id === 'timer' ? pauseTimer(state.timer, Date.now()) : state.timer,
    }),
  });
  const picker = initializeWidgetPicker({
    read: () => state.widgets,
    add: (id: WidgetId) => {
      if (state.widgets.includes(id)) return;
      setState({ ...state, widgets: [...state.widgets, id] });
      announce(`${id === 'timer' ? 'Pomodoro' : 'To-do list'} added to your workspace.`);
    },
  });

  function render(): void {
    canvas.render();
    picker.render();
    timer.render();
    todos.render();
  }

  const restoredTimer = state.widgets.includes('timer')
    ? reconcileTimer(state.timer, Date.now())
    : pauseTimer(state.timer, Date.now());
  if (restoredTimer !== state.timer) setState({ ...state, timer: restoredTimer });
  else render();
}
