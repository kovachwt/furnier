# Edge Banding Estimate

## Overview

The Cut List modal now shows an **Edge Banding Estimate** table that calculates the total length of edge banding needed per side (Top, Bottom, Left, Right) across all panels in the project. This helps users order the right amount of edge banding material.

## Where it lives

| File | Role |
|---|---|
| `src/utils/cutlist.ts` | `generateEdgeBandingEstimate()` function |
| `src/components/cutlist/CutListView.tsx` | Edge banding table in the Cut List modal |

## How it works

For each panel with edge banding enabled on a given side:
- **Top/Bottom** edges: the banding length equals the panel's **width**
- **Left/Right** edges: the banding length equals the panel's **height**

The lengths are summed across all panels and displayed in both millimeters and meters.

## Display

The estimate appears in the Cut List modal between the Bill of Materials and Assembly Order sections. It only shows when at least one panel has edge banding enabled.

| Side | Panels | Total Length |
|---|---|---|
| Top | 12 | 4.8 m (4800 mm) |
| Bottom | 12 | 4.8 m (4800 mm) |
| Left | 8 | 3.2 m (3200 mm) |
| Right | 8 | 3.2 m (3200 mm) |

## Notes

- Fixture pieces are excluded (they don't use real materials).
- The estimate is a **minimum** — in practice, order 5–10% extra to account for trimming and mistakes.
- Edge banding typically comes in 1–3 meter strips, so round up accordingly.
- This estimate does not differentiate between edge banding colors — all edges are summed together.
