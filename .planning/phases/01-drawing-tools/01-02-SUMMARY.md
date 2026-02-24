---
phase: 01-drawing-tools
plan: "02"
subsystem: ui
tags: [canvas, drawing, typescript, keyboard-shortcuts, html]

# Dependency graph
requires:
  - 01-01 (PencilOperation, LineOperation, PencilStroke, LineData types)
provides:
  - applyPencil() and applyLine() facade methods on ImageEditor
  - Full pencil and line tool UI in ShapeDrawer (activateFreehand/deactivateFreehand lifecycle)
  - draw-pencil-btn, draw-line-btn, draw-arrowhead checkbox in panel-draw HTML
  - P and L keyboard shortcuts for pencil and line tool activation
affects: [ShapeDrawer, ImageEditor, KeyboardShortcuts, index.html]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Freehand tools (pencil/line) use activateFreehand/deactivateFreehand lifecycle separate from shape overlay lifecycle"
    - "Pencil incremental draw: segments drawn directly on canvas 2d ctx per mousemove (no full repaint); commit on mouseup via editor.applyPencil()"
    - "Line live preview: editor.drawOnPreview() called with LineOperation.draw() on mousemove; commit on mouseup via editor.applyLine()"
    - "Bound handler references stored as private class fields to enable clean addEventListener/removeEventListener symmetry"

key-files:
  created: []
  modified:
    - src/editor/ImageEditor.ts
    - src/ui/ShapeDrawer.ts
    - index.html
    - src/ui/KeyboardShortcuts.ts

key-decisions:
  - "P and L shortcuts remapped from posterize-slider/cat-filters to draw-pencil-btn/draw-line-btn — draw tool shortcuts take precedence over filters shortcuts"
  - "PencilOperation not imported in ShapeDrawer: incremental preview drawn directly on canvas ctx; only editor.applyPencil() used on commit (avoids full repaint per point)"
  - "Freehand tool toggle is separate from shape overlay toggle — deactivateFreehand() handles cursor and event cleanup independently of deactivate()"

# Metrics
duration: 3min
completed: 2026-02-24
---

# Phase 1 Plan 02: Drawing Tools UI Wiring Summary

**Extended ShapeDrawer with pencil/line tool modes, wired ImageEditor facade methods, added HTML controls, and remapped P/L keyboard shortcuts to activate freehand drawing tools**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-24T03:29:25Z
- **Completed:** 2026-02-24T03:32:48Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added `applyPencil()` and `applyLine()` methods to `ImageEditor` delegating to `applyOperation()` with new operation types
- Extended `ShapeDrawer` with `DrawTool` type union and full pencil/line event handling using `activateFreehand`/`deactivateFreehand` lifecycle
- Pencil tool: incremental segment drawing directly on canvas ctx per mousemove (avoids full repaint), commits `PencilStroke` on mouseup
- Line tool: live preview via `editor.drawOnPreview(LineOperation.draw)` on mousemove, commits `LineData` on mouseup with optional arrowhead
- Added `getCanvasPoint()` helper (mirroring MaskBrush pattern) and `buildLine()` helper
- Added pencil/line buttons and arrowhead checkbox to `#panel-draw` in `index.html`
- Remapped `P` and `L` keyboard shortcuts to activate pencil and line tools respectively

## Task Commits

Each task was committed atomically:

1. **Task 1: Add applyPencil() and applyLine() to ImageEditor** - `4a46a12` (feat)
2. **Task 2: Extend ShapeDrawer with pencil and line tool modes** - `7ed87ff` (feat)
3. **Task 3: Add HTML controls and keyboard shortcuts** - `b9e198b` (feat)

## Files Created/Modified

- `src/editor/ImageEditor.ts` — Added `applyPencil()`, `applyLine()` methods and their imports
- `src/ui/ShapeDrawer.ts` — Added `DrawTool` type, pencil/line state fields, bound handlers, `activateFreehand`/`deactivateFreehand`, all mouse event handlers, `getCanvasPoint()`, `buildLine()`, updated `toggleTool()` and `updateButtonStates()`
- `index.html` — Added `draw-pencil-btn`, `draw-line-btn`, `draw-arrowhead` checkbox in `#panel-draw` before shape buttons; removed stale `L`/`P` kbd hints from filters tab and posterize label
- `src/ui/KeyboardShortcuts.ts` — Remapped `p` to `draw-pencil-btn`, `l` to `draw-line-btn`; removed `cat-filters` and `posterize-slider` shortcuts for those keys

## Decisions Made

- **P/L shortcut remapping:** `p` and `l` previously bound to `posterize-slider` (focus) and `cat-filters` (click) respectively. These were reassigned to draw tool activation. The Filters tab remains accessible without a shortcut; posterize slider remains accessible via the Filters panel. Draw tool shortcuts take precedence per the plan requirements.
- **PencilOperation not imported in ShapeDrawer:** Incremental preview draws directly on `canvas.getContext('2d')` per segment, matching the plan's Research Pitfall 6 guidance (no full repaint per point). `PencilOperation.draw()` is not needed for preview; only `editor.applyPencil()` is called on mouseup.
- **Freehand lifecycle separate from shape overlay:** `activateFreehand`/`deactivateFreehand` manage cursor and canvas event listeners independently of the shape overlay/apply-btn flow, keeping concerns cleanly separated.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing cleanup] Added bound handler references for clean removeEventListener**
- **Found during:** Task 2
- **Issue:** The plan described adding/removing event listeners for pencil/line tools. Anonymous functions cannot be removed; stored references are required.
- **Fix:** Added `private readonly onPencilMouseDown/Move/Up` and `onLineMouseDown/Move/Up` bound handlers in constructor, used consistently in activate/deactivate.
- **Files modified:** src/ui/ShapeDrawer.ts

**2. [Rule 1 - Bug] Removed unused PencilOperation import**
- **Found during:** Task 2 TypeScript verification
- **Issue:** TypeScript TS6133 error — `PencilOperation` imported but never read (preview uses direct canvas draw, not `PencilOperation.draw()`).
- **Fix:** Removed unused import from ShapeDrawer.ts.
- **Files modified:** src/ui/ShapeDrawer.ts

**3. [Rule 1 - Stale UI] Removed stale kbd hints from Filters tab and Posterize label**
- **Found during:** Task 3
- **Issue:** After remapping `l` and `p` shortcuts, the `<kbd>L</kbd>` and `<kbd>P</kbd>` hints in `cat-filters` and the Posterize slider label would be misleading.
- **Fix:** Removed the kbd elements from those elements in index.html.
- **Files modified:** index.html

## Issues Encountered

None blocking. All TypeScript compilation checks passed on the first verification for Tasks 1 and 3. Task 2 required one minor fix (unused import removal) before TypeScript compiled clean.

## User Setup Required

None — no external services or configuration required.

## Next Phase Readiness

- All four drawing tools (pencil, line, rect, circle) are wired end-to-end
- Each mouseup creates one history entry (individually undoable via Ctrl+Z)
- ShapeDrawer, ImageEditor, and keyboard shortcuts are ready for Plan 03

## Self-Check: PASSED
