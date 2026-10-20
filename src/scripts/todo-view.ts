import type { Todo } from '../lib/types.ts';
import { getElement } from './dom';

export function createTodoView() {
  const list = getElement<HTMLUListElement>('[data-todo-list]');
  const template = getElement<HTMLTemplateElement>('#todo-item-template');
  let renderedTodos: Todo[] | null = null;

  function createItem(todo: Todo): HTMLElement {
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const item = getElement<HTMLElement>('.todo-item', fragment);
    item.dataset.todoId = todo.id;
    item.classList.toggle('is-complete', todo.isComplete);
    getElement<HTMLElement>('.todo-title', item).textContent = todo.title;
    getElement<HTMLInputElement>('input[type="checkbox"]', item).checked = todo.isComplete;
    getElement<HTMLElement>('[data-checkbox-label]', item).textContent = `${todo.isComplete ? 'Reopen' : 'Complete'} ${todo.title}`;
    getElement<HTMLButtonElement>('[data-edit-todo]', item).setAttribute('aria-label', `Edit ${todo.title}`);
    getElement<HTMLButtonElement>('[data-delete-todo]', item).setAttribute('aria-label', `Delete ${todo.title}`);
    return item;
  }

  function render(todos: Todo[]): void {
    if (todos === renderedTodos) return;
    renderedTodos = todos;
    const fragment = document.createDocumentFragment();
    todos.forEach(todo => fragment.append(createItem(todo)));
    list.replaceChildren(fragment);
    const completed = todos.filter(todo => todo.isComplete).length;
    getElement<HTMLElement>('[data-todo-empty]').hidden = todos.length > 0;
    getElement<HTMLElement>('[data-todo-count]').textContent = String(todos.length - completed);
    getElement<HTMLElement>('[data-todo-progress]').textContent = todos.length === 0 ? 'No tasks yet' : `${completed} of ${todos.length} complete`;
    getElement<HTMLElement>('[data-todo-progress-bar]').style.width = `${todos.length === 0 ? 0 : completed / todos.length * 100}%`;
  }

  return { render };
}
