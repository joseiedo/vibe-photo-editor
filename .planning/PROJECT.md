# Photo Editor — Drawing Feature

## What This Is

A browser-based photo editor built with TypeScript and the Canvas API. Users can load images, apply adjustments and filters, remove backgrounds, crop, and now annotate photos by drawing shapes and freehand strokes directly on the image.

## Core Value

Users can annotate photos with shapes and freehand pencil strokes, with the drawing baked into the final exported image.

## Requirements

### Validated

- ✓ Load images via file upload and Ctrl+V paste — existing
- ✓ Flip and rotate operations — existing
- ✓ Crop region selection and application — existing
- ✓ Brightness / contrast / saturation adjustments — existing
- ✓ AI background removal with threshold slider — existing
- ✓ Refine background removal brush (restore/erase) — existing
- ✓ Image upscaling — existing
- ✓ Posterize filter — existing
- ✓ Merge second image — existing
- ✓ Undo/redo (50-entry history with ImageBitmap memory management) — existing
- ✓ Download/export — existing
- ✓ Basic rectangle and circle drawing via ShapeDrawer — existing (partial)

### Active

- [ ] Free draw (pencil) tool for freehand strokes on canvas
- [ ] Line tool with optional arrowhead
- [ ] Color picker for stroke and fill color
- [ ] Stroke width control (thin / medium / thick)
- [ ] Fill toggle for rectangle and circle shapes
- [ ] All drawing tools accessible from a dedicated "Draw" tab
- [ ] Drawing committed to history (undo/redo each stroke or shape)

### Out of Scope

- Opacity/transparency controls — not requested for v1
- Floating toolbar overlay — "Draw" tab pattern chosen instead
- Text annotations — different tool class, not requested
- Non-destructive layer system — drawings bake into the image
- Eraser tool — not requested for v1

## Context

- **Codebase:** TypeScript 5, Vite 5, Canvas API (preview + OffscreenCanvas for full-res)
- **Architecture:** Layered MVC with Operation pattern; each edit is a `BaseOperation` that receives canvas context and returns a new `ImageBitmap`
- **Existing drawing:** `ShapeDrawer` class in `src/ui/` already handles rectangle/circle drawing but may lack style controls (color, fill, stroke width)
- **History:** Already implemented in `History.ts` — drawing ops should plug in via `applyOperation()`
- **Tab system:** `CategoryTabs` controls panel switching; "Draw" tab is a new panel entry

## Constraints

- **Tech stack:** Must use Canvas 2D API — no SVG or external drawing libraries
- **Destructive:** Drawings bake into the `ImageBitmap` via `applyOperation()` to integrate with existing history
- **No new dependencies:** Extend existing `ShapeDrawer` and operation pattern

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Destructive drawing via applyOperation() | Integrates with existing history/undo without new layer infrastructure | — Pending |
| New "Draw" tab | Consistent with existing CategoryTabs pattern | — Pending |
| Extend ShapeDrawer vs. new DrawingController | ShapeDrawer already exists for rect/circle; extend it to cover all drawing tools | — Pending |

---
*Last updated: 2026-02-24 after initialization*
