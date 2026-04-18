# Camera Presets

## Overview

Four camera preset buttons in the toolbar let you quickly switch to standard views: **Front**, **Top**, **Side**, and **Iso** (isometric). Clicking a button smoothly animates the camera to the preset position and target using an ease-out cubic curve.

## Where it lives

| File | Role |
|---|---|
| `src/components/ui/CameraPresets.tsx` | Button UI rendered in the toolbar |
| `src/components/CameraAnimator.tsx` | R3F component inside `<Canvas>` that animates the camera |
| `src/store/useStore.ts` | `activeCameraPreset` + `cameraTarget` state, `setActiveCameraPreset()` + `setCameraTarget()` actions |
| `src/components/ui/Toolbar.tsx` | Renders `<CameraPresets />` |
| `src/components/Scene.tsx` | Renders `<CameraAnimator />` inside the Canvas |

## Usage

1. Look at the toolbar (top of the screen).
2. Click one of the four icon buttons: **⊡** Front, **⊞** Top, **⊣** Side, **◇** Iso.
3. The camera smoothly animates to that view.
4. The active preset button is highlighted with a blue border.

## Implementation notes

- **Separation of concerns**: Button UI lives in the toolbar (outside the R3F Canvas). The actual camera animation runs inside a `<CameraAnimator>` component that uses `useThree` and `useFrame` hooks (which require being inside the Canvas).
- **State flow**: Button click → `setCameraTarget(position, target)` + `setActiveCameraPreset(id)` → `CameraAnimator` subscribes to store → starts animation → `useFrame` interpolates with ease-out cubic.
- **Animation duration**: 400ms with cubic ease-out (`1 - (1-t)³`).
- **Preset positions** are in world units (1 unit = 1000 mm), chosen to frame the default 4×3×2.5 m room nicely.
- The active preset is stored in Zustand so it persists across navigations.

## Testing

Visual regression test (`playwright/camera-presets/`) adds a cabinet and clicks the Front preset button, then screenshots after the animation completes.

```bash
node playwright/run.cjs camera-presets
node playwright/run.cjs camera-presets --update
```
