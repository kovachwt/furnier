# Dark / Light Theme Toggle

## Overview

A **☀ / 🌙** toggle button in the toolbar switches the entire UI between dark and light themes. The theme preference is persisted in `localStorage` and restored on page reload.

## Where it lives

| File | Role |
|---|---|
| `src/store/useStore.ts` | `darkTheme` state + `toggleTheme()` action |
| `src/components/ui/Toolbar.tsx` | Renders the ☀/🌙 toggle button |
| `src/App.tsx` | Applies `light` class to `<html>` and persists/restores theme |
| `src/components/Scene.tsx` | Uses `var(--bg-primary)` for Canvas background |
| `src/index.css` | `:root` (dark) and `:root.light` (light) CSS custom properties |

## Usage

1. Click the **☀** (sun) button in the toolbar to switch to light theme.
2. Click the **🌙** (moon) button to switch back to dark theme.
3. The preference is saved to `localStorage` and restored on reload.

## Theme colors

| Variable | Dark | Light |
|---|---|---|
| `--bg-primary` | `#1a1a2e` | `#f0f2f5` |
| `--bg-secondary` | `#16213e` | `#ffffff` |
| `--bg-panel` | `#1e2a45` | `#e8eaed` |
| `--bg-input` | `#253550` | `#ffffff` |
| `--bg-hover` | `#2a3f5f` | `#dfe1e5` |
| `--text-primary` | `#e0e0e0` | `#1a1a2e` |
| `--text-secondary` | `#a0a8b8` | `#5f6368` |
| `--accent` | `#4a9eff` | `#1a73e8` |
| `--danger` | `#ef4444` | `#d93025` |
| `--border` | `#2a3a55` | `#dadce0` |

## Implementation notes

- The toggle uses a single `darkTheme: boolean` store value. When `false`, the `light` class is added to `<html>`, which activates the `:root.light` CSS custom property overrides.
- The 3D viewport background uses `var(--bg-primary)` so it also switches with the theme.
- 3D scene materials (floor, walls, furniture) keep their real-world colors regardless of theme.
- Theme is persisted under the key `furniture-designer-theme` in localStorage.

## Testing

New visual regression test (`playwright/light-theme/`) adds a cabinet, toggles to light theme, and verifies the `light` class is applied.

```bash
node playwright/run.cjs light-theme
node playwright/run.cjs light-theme --update
```
