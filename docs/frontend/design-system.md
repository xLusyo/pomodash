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

## Appearance

An icon-only Settings button sits beside Add widget in a floating bottom-right action group. It opens a centered native dialog up to 800px wide with Wallpaper, Fonts, and Colors tabs. Tabs support Left/Right arrows, Home, and End, and retain draft choices when switching sections. Changes preview live; Save changes commits them. Cancel, Escape, close, and backdrop dismissal restore the saved appearance. Reset appearance previews the defaults until saved.

Wallpaper accepts a local JPEG, PNG, or WebP up to 10 MB. Images cover the canvas, centered without repeating, and can be removed. Processing stays on-device and produces a resized image for local storage.

Font presets are Original (the default pairing), Modern (system UI throughout), and Bookish (Georgia/serif throughout). Body and heading font tokens apply across widgets and dialogs; countdown numerals remain tabular.

Accent presets are Terracotta (`#b75c43`, default), Sage (`#526448`), Ocean (`#2f6475`), Plum (`#75516c`), and Slate (`#4b6075`). They control focus actions, highlights, focus rings, and the focus timer ring. Break and todo sage colors retain their semantic role. Surfaces and text retain the light palette.

## Components and interaction

- Dashboard: full-page canvas, floating Add widget button, and a small prompt only when all widgets are hidden.
- Widget shell: consistent title, icon, hide action, and a bottom-right resize handle. Drag any non-interactive surface to move the widget freely; controls retain their normal behavior.
- Timer: segmented mode controls, progress ring, tabular countdown, start/pause, reset, settings, and four-session indicator.
- Todos: task entry, completion checkbox, inline editing, deletion, and completion progress. Titles support up to 200 characters.
- Native dialogs: focus containment, Escape dismissal, close controls, backdrop dismissal, and restored trigger focus.
- Use visible focus rings. Focus a widget and use arrow keys to move it; focus its resize handle and use arrow keys to resize it. Shift increases the step from 10 to 40 pixels. Escape cancels a pointer gesture. Honor reduced-motion preferences.
- Widgets may overlap; interacting with a widget brings it forward. Position and size remain within the canvas bounds. Minimum sizes are 320 × 560 pixels for the timer and 320 × 360 pixels for todos; smaller viewports constrain these dimensions as needed.
- Hiding a widget retains its contents, position, and size. Hiding the timer pauses it. Widget dimensions and positions persist locally.
