# System Design

## Architecture

PomoDash is a static Astro application with browser-side TypeScript and CSS. No framework runtime, server endpoints, accounts, analytics, or external services are required.

- `src/components`: page composition and focused visual components. The widget shell owns shared widget chrome; timer, timer settings, todo, and picker components own their markup.
- `src/lib`: shared types and pure timer, todo, position, and size operations. Storage is a separate boundary module.
- `src/scripts`: dashboard orchestration, feature controllers, timer/todo rendering, dialogs, and DOM access. Controllers read state and request updates through callbacks.
- `src/styles`: shared tokens and foundations, with separate dashboard, widget, timer, todo, and dialog styles.

The dashboard controller owns one typed state value. User events call feature logic, replace the relevant state, persist it, and render the affected interfaces. Todo rendering is skipped when the todo array is unchanged. Timer DOM updates are skipped when neither its state nor displayed second has changed.

## Persistence contract

localStorage key: `pomodash.workspace.v1`. The JSON object contains:

- `version: 1`
- `widgets`: ordered visible widget IDs (`timer`, `todos`), with no duplicates
- `positions`: optional mapping from widget ID to nonnegative finite `{ x, y }` canvas coordinates
- `sizes`: optional mapping from widget ID to positive finite `{ width, height }` dimensions
- `timer`: mode, status, minute durations, remaining milliseconds, deadline, completed focus count, and last completed mode
- `todos`: task IDs, titles, and completion flags

First visit shows one timer with 25/5/15-minute durations and an empty todo list. Widgets are singletons. Visibility changes preserve their contents, position, and size. Optional geometry fields let older grid workspaces load without resetting existing data. The visible widget list also retains stacking order after moving or resizing.

Validate JSON shape, supported version, widget IDs, unique task IDs, nonblank task titles, duration limits, and consistent timer values on load. Invalid data opens a fresh workspace with a notice and remains untouched until the next state change. Read/write failures show a notice while keeping the workspace usable in memory.

No multi-tab synchronization or cloud synchronization is included. Concurrent tabs save independently; the last successful write is retained.

## Appearance settings

Appearance is independent from timer and widget persistence. `pomodash.appearance.v1` stores JSON with `version: 1`, nullable `wallpaper` data URL, `fontPreset` (`original`, `modern`, `bookish`), and `accentPreset` (`terracotta`, `sage`, `ocean`, `plum`, `slate`). Existing workspace data is unchanged. Timer ticks never serialize wallpaper data.

The appearance controller owns saved settings and a dialog draft. Draft updates apply font/accent CSS variables and the canvas wallpaper immediately. Save writes the appearance key before committing the draft. Every other dismissal restores the saved settings. Failed writes retain the draft and keep the dialog open; unavailable storage permits an explicitly announced session-only save. Invalid appearance data falls back independently with a notice and is preserved until Save.

Wallpaper processing decodes local JPEG, PNG, or WebP files up to 10 MB, scales to a maximum 1920px longest edge without upscaling, and encodes WebP. Quality and dimensions decrease as needed to fit a data URL under 1 million characters. Browser fallback PNG encoding is accepted. Object URLs are revoked after processing. Request identifiers discard stale results after replacement, reset, removal, or dialog dismissal.

## Canvas behavior

- `widget-canvas` controls positioning, whole-surface dragging, visibility, and stacking. `widget-resize` separately controls corner resizing. Pure canvas helpers constrain coordinates and dimensions.
- Interactive elements are excluded from movement gestures. Pointer capture keeps drag/resize gestures active outside the initiating surface. Escape, pointer cancellation, or losing window focus restores the last saved geometry.
- Pointer gestures preview geometry locally and save on release; keyboard movement/resizing saves each step. Arrow keys move a focused widget or resize a focused corner handle, with 10-pixel steps or 40 pixels with Shift.
- On viewport changes, displayed geometry is constrained without overwriting the user's saved dimensions or coordinates. Widgets can overlap, and interacting brings the active widget forward.
- The canvas fills the viewport, with a minimum height sufficient for timer controls. Resized widgets retain accessible content through internal overflow rather than clipping controls.

## Timer behavior

- A running timer stores its deadline. Remaining time is calculated from the current timestamp rather than interval counts. Pausing stores remaining time and clears the deadline.
- A 250ms scheduler checks for expiration; displayed countdown updates occur once per displayed second. Visibility changes also reconcile the timer.
- Expiration records one completed session and prepares the next mode in an idle state. Time spent away never runs through additional sessions automatically.
- Every fourth completed focus session prepares a long break; other focus completions prepare short breaks. Break completion prepares focus.
- Mode switches and duration changes reset the current countdown and leave it idle. Duration settings accept whole minutes from 1 through 180.
- Hiding the timer pauses it. Reloading a visible running timer restores its deadline and reconciles elapsed time.

## Verification

Run `npm test` for timer, todo, canvas geometry, and persistence boundary tests with Node's built-in test runner. Run `npm run build` for production compilation. Browser checks cover native dialogs, CRUD, reload persistence, keyboard controls, free dragging, and corner resizing. Touch hardware validation remains distinct from desktop pointer checks.
