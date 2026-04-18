# Piece Search / Filter

## Overview

The Piece List in the sidebar now includes a text search input. Typing a query filters the list to show only pieces whose names contain the search string (case-insensitive). A "no results" message appears when nothing matches.

## Where it lives

| File | Role |
|---|---|
| `src/components/ui/PieceList.tsx` | Search input + filtered list rendering |
| `src/index.css` | `.piece-search-input` and `.piece-search-no-results` styles |

## Usage

1. Switch to the **Edit** tab in the sidebar.
2. Under **Pieces**, use the search box above the list.
3. Type any substring — the list updates in real time.
4. Clear the search box to see all pieces again.

## Implementation notes

- Filtering is done purely client-side via `String.prototype.includes()` on `piece.name`.
- The search state is local to `PieceList` (`useState('')`) — it does not persist across navigations.
- The input is a standard controlled `<input type="text">` with `aria-label="Search pieces"` for accessibility.
- No debounce is needed since the filter is O(n) over the piece list (typically < 50 items).

## Testing

Visual regression test (`playwright/piece-search/`) adds three pieces (cabinet, bookshelf, desk), selects one, then types "desk" into the search input. The screenshot shows only the desk piece in the list.

```bash
node playwright/run.cjs piece-search
node playwright/run.cjs piece-search --update
```
