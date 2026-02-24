# Roadmap: Photo Editor — Drawing Feature

## Overview

The existing photo editor already has rect/circle drawing via `ShapeDrawer` and `ShapeOperation`, plus a full history stack. This roadmap extends that foundation with a complete annotation system: four drawing tools (freehand, rectangle, circle, line/arrow) under a new "Draw" tab, followed by style controls (stroke color, fill color, stroke width, fill toggle) that let users control the appearance of every shape they draw.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Drawing Tools** - Draw tab with all four tools wired end-to-end and each stroke committed to history
- [ ] **Phase 2: Style Controls** - Stroke color, fill color, stroke width, and fill toggle available in the Draw tab

## Phase Details

### Phase 1: Drawing Tools
**Goal**: Users can annotate photos using four drawing tools from a dedicated Draw tab, with each stroke or shape baked into the image and individually undoable
**Depends on**: Nothing (first phase)
**Requirements**: DRAW-01, DRAW-02, DRAW-03, DRAW-04, UI-01, HIST-01
**Success Criteria** (what must be TRUE):
  1. User can activate the Draw tab and see drawing tool controls without affecting other tabs
  2. User can draw a freehand pencil stroke on the photo and see it committed to the image
  3. User can drag to draw a rectangle or circle shape on the photo
  4. User can drag to draw a straight line, with an option to add an arrowhead
  5. User can undo any single stroke or shape and redo it, independent of other operations
**Plans**: TBD

### Phase 2: Style Controls
**Goal**: Users can control the visual appearance of all drawing tools through color pickers, stroke width selection, and a fill toggle, with styles persisted across tool switches within a session
**Depends on**: Phase 1
**Requirements**: STYLE-01, STYLE-02, STYLE-03, STYLE-04
**Success Criteria** (what must be TRUE):
  1. User can pick a stroke color and any shape drawn after reflects that color
  2. User can choose thin, medium, or thick stroke width and drawn shapes reflect the selection
  3. User can toggle fill on for rectangles and circles and pick a separate fill color
  4. When fill is off, rectangles and circles render as outlines only
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Drawing Tools | 0/TBD | Not started | - |
| 2. Style Controls | 0/TBD | Not started | - |
