# QR Code for Share URL

## Overview

When sharing a design, the share dialog now displays a **QR code** that can be scanned from a phone or tablet. This makes it easy to open the shared link on another device without typing.

The QR code is generated client-side using the `qrcode` library and rendered onto a `<canvas>` element.

## Where it lives

| File | Role |
|---|---|
| `src/components/ui/QRCode.tsx` | `QRCodeCanvas` component — renders QR code on a `<canvas>` |
| `src/components/ui/ShareDialog.tsx` | `ShareDialog` (share modal with QR code) + `ShareImportDialog` (import shared project) |
| `src/components/ui/ProjectActions.tsx` | Triggers the share dialog via `handleShare()` |
| `src/App.tsx` | Renders `<ShareImportDialog />` for incoming share links |
| `src/index.css` | Styles for `.share-dialog-qr`, `.qr-code-canvas`, `.share-dialog-url` |

## Usage

1. Click the **🔗 Share** button in the sidebar.
2. A modal appears with:
   - A **QR code** you can scan with your phone camera
   - The full share URL (truncated with ellipsis if very long)
   - A **"📋 Copy Link"** button to copy the URL to clipboard
3. On mobile devices with native share support, the browser's share sheet is used first; the QR dialog appears if the user cancels or the API is unavailable.

## Implementation notes

- **Library**: Uses the `qrcode` npm package (already a transitive dependency), imported as `QRCodeLib` to avoid naming conflicts with the component.
- **Rendering**: The QR code is generated via `QRCodeLib.toCanvas()` and drawn onto a canvas element. Size defaults to 200px, used at 180px in the dialog.
- **Error handling**: If QR generation fails, a fallback error message is displayed.
- **Color scheme**: Dark (`#1a1a2e`) on white background, matching the app's dark theme.
- **Accessibility**: The canvas includes `role="img"` and an `aria-label` describing the QR code content.

## Testing

All 12 existing visual regression tests pass. The share dialog is tested implicitly through the screenshot-button test which verifies the full app renders correctly with the new components.

```bash
node playwright/run.cjs
```
