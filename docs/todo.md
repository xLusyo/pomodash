# PomoDash tasks

## Base dashboard

- [x] Define the warm minimal design and desktop/tablet layout.
- [x] Build focused dashboard, widget shell, and widget picker components.
- [x] Add widget visibility, pointer/touch reordering, and keyboard move controls.
- [x] Implement the configurable Pomodoro timer and manual session transitions.
- [x] Implement todo creation, editing, completion, and deletion.
- [x] Add validated localStorage persistence and recovery notices.
- [x] Document component responsibilities, state flow, and design tokens.
- [x] Test timer logic, persistence boundaries, and widget ordering.
- [x] Verify desktop/tablet browser interactions and production build.
- [x] Review the final diff.

## Verification notes

- All 21 automated tests pass; the production build succeeds.
- Safari verified task creation/editing/completion/reopening/deletion, widget picker, pointer dragging, keyboard move controls, hide/restore, empty state, settings, running timer restoration, and manual transitions after expiration.
- Initial grid layout checked at desktop width, 768 × 1024 tablet portrait, and 1024 × 768 tablet landscape.
- Physical tablet touch dragging remains unverified; pointer events and larger touch targets are implemented.
- Initial-release browser QA data was removed, restoring the clean first-visit workspace.
- Free canvas and resizing verified in Safari: pointer resizing, keyboard resizing, dragging from the timer face and todo body, geometry restoration after reload, and normal timer controls. Existing user data was preserved.

## Future iterations

- [ ] Spotify widget.
- [ ] Weather widget.
- [ ] Revisit additional widgets and customization after feedback.

## Free canvas iteration

- [x] Remove page header, footer, introduction, and grid chrome; keep a floating widget picker.
- [x] Replace grid ordering with free canvas positioning and whole-surface dragging.
- [x] Preserve normal control interactions, keyboard movement, and cancellation.
- [x] Persist positions without losing existing timer or task data.
- [x] Verify movement, boundaries, reload restoration, and production build.
- [x] Add pointer and keyboard resizing with usable minimum dimensions.
- [x] Persist widget dimensions and verify resize/reload behavior.
