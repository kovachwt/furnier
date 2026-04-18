# Material Waste Report

## Overview

The Cut List modal now shows a **Material Waste** table that calculates the total sheet area, used area, waste area, and waste percentage per material. This helps users understand material efficiency and plan purchases.

## Where it lives

| File | Role |
|---|---|
| `src/utils/cutlist.ts` | `generateWasteReport()` function |
| `src/components/cutlist/CutListView.tsx` | Waste report table in the Cut List modal |

## How it works

1. The waste report uses the same bin-packing algorithm as the cut list to determine which sheets are needed.
2. For each material, it aggregates:
   - **Sheet count**: number of sheets required
   - **Total area**: total sheet area in m² (sheetWidth × sheetHeight × sheetCount)
   - **Used area**: sum of all panel areas placed on those sheets
   - **Waste area**: total area minus used area
   - **Waste %**: waste area as a percentage of total area (rounded to 1 decimal)

## Display

The waste report appears in the Cut List modal between the sheet overflow warning and the Bill of Materials. It only shows when at least one sheet is needed.

| Material | Sheets | Total Area (m²) | Used (m²) | Waste (m²) | Waste % |
|---|---|---|---|---|---|
| White Melamine 16mm | 2 | 11.62 | 8.45 | 3.17 | 27.3% |

## Notes

- Waste includes both cutting waste (unusable leftover pieces) and kerf waste (material lost to saw blade width).
- The waste percentage is a **lower bound** — in practice, actual waste may be higher due to defects or mistakes.
- Materials with no panels (unused materials) are not shown.
- The report is recalculated whenever pieces, materials, or saw kerf change.
