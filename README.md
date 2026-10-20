# PomoDash

A private Pomodoro workspace for desktops and tablets from 768 CSS pixels. Add widgets to a full-page canvas, drag their surfaces to position them freely, and resize them from the bottom-right corner. Widget contents, positions, and dimensions stay in your browser's localStorage; no accounts, tracking, or backend.

## Development

Requires Node.js 22.22 or newer.

```sh
npm install
npm run dev -- --background
```

The local app is available at `http://localhost:4321`. Manage the background server with:

```sh
npm run dev -- status
npm run dev -- logs
npm run dev -- stop
```

## Verification

```sh
npm test
npm run build
```

Tests use Node's built-in test runner. The production build is written to `dist/`.

## Structure

- `src/components`: focused Astro components and shared widget shell.
- `src/lib`: typed state, timer/todo operations, canvas geometry, and storage validation.
- `src/scripts`: feature controllers, DOM views, and dashboard orchestration.
- `src/styles`: visual tokens and styles separated by feature.
- `tests`: timer, todo, movement/resize constraints, and storage boundary tests.

## Documentation

- [Task checklist and backlog](docs/todo.md)
- [Design system](docs/frontend/design-system.md)
- [System design and persistence](docs/system-design/system-design.md)

Spotify, weather, mobile layouts, cloud sync, and multi-tab synchronization are deferred.
