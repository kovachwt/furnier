# Panel Thickness Visualization Toggle

## Overview

The **▥ Thick** button in the toolbar toggles a 10× exaggeration of panel depth (thickness). Standard panels are only 16–25 mm thick, which at the scene's 1:1000 scale makes them nearly invisible. This toggle exaggerates them to a minimum of 5 mm in world units for clarity.

## Where it lives

| File | Role |
|---|---|
| `src/store/useStore.ts` | `showThickness` boolean state + `setShowThickness()` action |
| `src/components/ui/Toolbar.tsx` | Toggle button (▥ Thick) in the toolbar |
| `src/components/furniture/PanelMesh.tsx` | Reads `showThickness` and scales `panel.depth` by 10× (min 5 mm) |

## Usage

1. Open the toolbar (top of the screen).
2. Click **▥ Thick** — panel edges become clearly visible.
3. Click again to return to real-world thickness.

## Implementation notes

- Only `Panel` components are affected; legs, hardware, and fixtures are unchanged.
- The minimum exaggerated depth is 5 mm to prevent panels from looking comically thick on shallow pieces.
- This is a rendering-only toggle — it does not modify any panel geometry or affect cut-list calculations.

## Testing

Visual regression test (`playwright/thick-panels/`) adds a cabinet and toggles the Thick button, then screenshots.

```bash
node playwright/run.cjs thick-panels
node playwright/run.cjs thick-panels --update
```
