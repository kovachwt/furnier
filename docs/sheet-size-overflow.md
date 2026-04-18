# Sheet-Size Overflow Warning

## Overview

When panels are too large to fit on any available sheet of their material (in both normal and rotated orientations), a warning appears at the top of the Cut List modal. This helps users catch design problems before ordering materials.

## Where it lives

| File | Role |
|---|---|
| `src/utils/cutlist.ts` | `findSheetOverflow()` function |
| `src/components/cutlist/CutListView.tsx` | Warning box in the Cut List modal |

## How it works

For each panel:
1. Look up the material's sheet dimensions (`sheetWidth`, `sheetHeight`).
2. Check if the panel fits in normal orientation: `width ≤ sheetWidth && height ≤ sheetHeight`.
3. Check if the panel fits rotated 90°: `width ≤ sheetHeight && height ≤ sheetWidth`.
4. If **neither** orientation fits, the panel is flagged as an overflow.

## Display

The warning appears as a red-bordered box at the top of the Cut List modal, showing:
- The piece name and panel name
- The panel dimensions
- The maximum sheet size for that material

Example:
> ⚠ 1 panel(s) too large for material sheet size:
> Cabinet / Back: 2600×1500mm — max sheet: 2440×1220mm

## Notes

- Fixture pieces are excluded (they don't use real materials).
- Panels without a matching material are ignored (no crash).
- The check is purely geometric — it doesn't account for saw kerf or edge banding clearance.
- This is a **warning**, not an error — the user can still proceed and manually handle the oversized panels.
