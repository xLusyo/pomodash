import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addTodo, deleteTodo, editTodo, toggleTodo } from '../src/lib/todos.ts';

test('tasks can be added, edited, completed, reopened, and deleted without mutation', () => {
  const added = addTodo([], 'task-1', '  Read a chapter  ');
  assert.equal(added[0].title, 'Read a chapter');
  const edited = editTodo(added, 'task-1', 'Read two chapters');
  assert.equal(added[0].title, 'Read a chapter');
  const completed = toggleTodo(edited, 'task-1');
  assert.equal(completed[0].isComplete, true);
  assert.equal(toggleTodo(completed, 'task-1')[0].isComplete, false);
  assert.deepEqual(deleteTodo(completed, 'task-1'), []);
});

test('blank additions and edits preserve the original tasks', () => {
  const tasks = addTodo([], 'task-1', 'Keep this task');
  assert.equal(addTodo(tasks, 'task-2', '   '), tasks);
  assert.equal(editTodo(tasks, 'task-1', '\n\t'), tasks);
});
