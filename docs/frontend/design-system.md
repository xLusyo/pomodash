# PomoDash design system

## Direction

A warm, quiet workspace for focus. Support desktop and tablets from 768 CSS pixels, in portrait or landscape. The whole background is a free-positioned canvas, with a floating Add widget button and no page header, footer, or introduction. Phone layouts are outside the base release.

## Tokens

| Token | Value | Purpose |
| --- | --- | --- |
| Background | `#f6f5f1` | Dashboard canvas |
| Surface | `#fffefa` | Widget and dialog surfaces |
| Ink | `#30362f` | Main text and dark button |
| Muted | `#6c7066` | Secondary text |
| Line | `#e5e5dc` | Borders and dividers |
| Accent | `#b75c43` | Focus controls and emphasis |
| Accent hover | `#9e4b35` | Primary button hover |
| Accent soft | `#f4e9e2` | Gentle accent backgrounds |
| Sage | `#65785b` | Breaks, todos, and local status |
| Widget radius | `18px` | Widget corners |

Use system fonts only: Avenir Next / Segoe UI for controls and text, Iowan Old Style / Georgia for editorial headings. No remote fonts or image requests.

## Components and interaction

- Dashboard: full-page canvas, floating Add widget button, and a small prompt only when all widgets are hidden.
- Widget shell: consistent title, icon, hide action, and a bottom-right resize handle. Drag any non-interactive surface to move the widget freely; controls retain their normal behavior.
- Timer: segmented mode controls, progress ring, tabular countdown, start/pause, reset, settings, and four-session indicator.
- Todos: task entry, completion checkbox, inline editing, deletion, and completion progress. Titles support up to 200 characters.
- Native dialogs: focus containment, Escape dismissal, close controls, backdrop dismissal, and restored trigger focus.
- Use visible focus rings. Focus a widget and use arrow keys to move it; focus its resize handle and use arrow keys to resize it. Shift increases the step from 10 to 40 pixels. Escape cancels a pointer gesture. Honor reduced-motion preferences.
- Widgets may overlap; interacting with a widget brings it forward. Position and size remain within the canvas bounds. Minimum sizes are 320 × 560 pixels for the timer and 320 × 360 pixels for todos; smaller viewports constrain these dimensions as needed.
- Hiding a widget retains its contents, position, and size. Hiding the timer pauses it. Widget dimensions and positions persist locally.
