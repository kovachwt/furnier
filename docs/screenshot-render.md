# Screenshot / High-Res Render

## Overview

A **📷 Screenshot** button in the toolbar captures the current 3D viewport as a PNG image and triggers a browser download. The file is named after the project name (e.g. `Kitchen Layout.png`).

## Where it lives

| File | Role |
|---|---|
| `src/components/ui/ScreenshotButton.tsx` | Toolbar button (outside Canvas) |
| `src/components/ViewportCapture.tsx` | R3F component inside `<Canvas>` that performs the actual capture |
| `src/utils/screenshot.ts` | Utility to convert canvas to PNG data URL and trigger download |
| `src/store/useStore.ts` | `shouldCaptureViewport` flag + `takeScreenshot()` action |
| `src/components/Scene.tsx` | Renders `<ViewportCapture />` inside the Canvas |
| `src/components/ui/Toolbar.tsx` | Renders `<ScreenshotButton />` |

## Usage

1. Look at the right end of the toolbar (after the camera preset buttons).
2. Click the **📷** button.
3. A PNG file is downloaded to your browser's download folder.

## Implementation notes

- **Separation of concerns**: The button UI lives in the toolbar (outside the R3F Canvas). The actual capture happens inside `<ViewportCapture>`, which uses `useThree` and `useFrame` (which require being inside the Canvas).
- **State flow**: Button click → `takeScreenshot()` sets `shouldCaptureViewport: true` → `ViewportCapture`'s `useFrame` (priority 1) detects the flag → renders one extra frame → captures canvas → triggers download.
- **Debouncing**: The flag is cleared immediately when `useFrame` detects it, so rapid clicks are naturally debounced.
- **Image format**: PNG (lossless). The `captureCanvas` utility accepts a quality parameter but defaults to 1, which for `toDataURL('image/png')` produces a lossless PNG.
- **File naming**: Uses the project name from the store, with spaces replaced by underscores in the download filename.

## Testing

Visual regression test (`playwright/screenshot-button/`) adds a cabinet and clicks the screenshot button, then screenshots the viewport to verify the UI state.

```bash
node playwright/run.cjs screenshot-button
node playwright/run.cjs screenshot-button --update
```
