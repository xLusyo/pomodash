import type { Todo } from './types.ts';

export function addTodo(todos: Todo[], id: string, title: string): Todo[] {
  const trimmed = title.trim();
  if (!trimmed) return todos;
  return [...todos, { id, title: trimmed, isComplete: false }];
}

export function editTodo(todos: Todo[], id: string, title: string): Todo[] {
  const trimmed = title.trim();
  if (!trimmed) return todos;
  return todos.map(todo => todo.id === id ? { ...todo, title: trimmed } : todo);
}

export function toggleTodo(todos: Todo[], id: string): Todo[] {
  return todos.map(todo => todo.id === id ? { ...todo, isComplete: !todo.isComplete } : todo);
}

export function deleteTodo(todos: Todo[], id: string): Todo[] {
  return todos.filter(todo => todo.id !== id);
}
