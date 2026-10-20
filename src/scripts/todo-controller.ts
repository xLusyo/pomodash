import { addTodo, deleteTodo, editTodo, toggleTodo } from '../lib/todos.ts';
import type { Todo } from '../lib/types.ts';
import { announce, getElement } from './dom';
import { createTodoView } from './todo-view';

interface TodoOptions {
  read: () => Todo[];
  update: (todos: Todo[]) => void;
}

export function initializeTodos({ read, update }: TodoOptions) {
  const form = getElement<HTMLFormElement>('#add-todo-form');
  const input = getElement<HTMLInputElement>('#new-todo');
  const list = getElement<HTMLUListElement>('[data-todo-list]');
  const view = createTodoView();

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!input.value.trim()) {
      input.setCustomValidity('Write a task before adding it.');
      input.reportValidity();
      return;
    }
    update(addTodo(read(), crypto.randomUUID(), input.value));
    input.value = '';
    input.focus();
    announce('Task added.');
  });
  input.addEventListener('input', () => input.setCustomValidity(''));

  function focusTask(id: string, selector: string): void {
    list.querySelector<HTMLElement>(`[data-todo-id="${CSS.escape(id)}"] ${selector}`)?.focus();
  }

  function stopEditing(item: HTMLElement): void {
    item.classList.remove('is-editing');
    getElement<HTMLFormElement>('.edit-todo-form', item).hidden = true;
    getElement<HTMLButtonElement>('[data-edit-todo]', item).focus();
  }

  list.addEventListener('change', event => {
    if (!(event.target instanceof HTMLInputElement) || event.target.type !== 'checkbox') return;
    const id = event.target.closest<HTMLElement>('[data-todo-id]')!.dataset.todoId!;
    update(toggleTodo(read(), id));
    focusTask(id, 'input[type="checkbox"]');
  });
  list.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button');
    const item = button?.closest<HTMLElement>('[data-todo-id]');
    if (!button || !item) return;
    const id = item.dataset.todoId!;
    if (button.hasAttribute('data-delete-todo')) {
      const items = [...list.children];
      const index = items.indexOf(item);
      const neighbor = items[index + 1] ?? items[index - 1];
      const nextId = (neighbor as HTMLElement | undefined)?.dataset.todoId;
      update(deleteTodo(read(), id));
      if (nextId) focusTask(nextId, '[data-delete-todo]');
      else input.focus();
      announce('Task deleted.');
      return;
    }
    if (button.hasAttribute('data-cancel-edit')) {
      stopEditing(item);
      return;
    }
    if (!button.hasAttribute('data-edit-todo')) return;
    item.classList.add('is-editing');
    getElement<HTMLFormElement>('.edit-todo-form', item).hidden = false;
    const editInput = getElement<HTMLInputElement>('.edit-todo-form input', item);
    editInput.value = read().find(todo => todo.id === id)!.title;
    editInput.select();
  });
  list.addEventListener('input', event => {
    if (event.target instanceof HTMLInputElement) event.target.setCustomValidity('');
  });
  list.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !(event.target instanceof Element)) return;
    const item = event.target.closest<HTMLElement>('.is-editing');
    if (item) stopEditing(item);
  });
  list.addEventListener('submit', event => {
    event.preventDefault();
    const editForm = event.target as HTMLFormElement;
    const editInput = getElement<HTMLInputElement>('input', editForm);
    if (!editInput.value.trim()) {
      editInput.setCustomValidity('A task needs a title.');
      editInput.reportValidity();
      return;
    }
    const id = editForm.closest<HTMLElement>('[data-todo-id]')!.dataset.todoId!;
    update(editTodo(read(), id, editInput.value));
    focusTask(id, '[data-edit-todo]');
    announce('Task updated.');
  });

  return { render: () => view.render(read()) };
}
