# Requirements: Photo Editor — Drawing Feature

**Defined:** 2026-02-24
**Core Value:** Users can annotate photos with shapes and freehand pencil strokes, with the drawing baked into the final exported image.

## v1 Requirements

### Drawing Tools

- [ ] **DRAW-01**: User can draw freehand strokes using a pencil tool
- [ ] **DRAW-02**: User can drag to draw a rectangle shape
- [ ] **DRAW-03**: User can drag to draw a circle/ellipse shape
- [ ] **DRAW-04**: User can drag to draw a straight line with optional arrowhead

### Style Controls

- [ ] **STYLE-01**: User can pick stroke color via a color picker
- [ ] **STYLE-02**: User can select stroke width (thin / medium / thick)
- [ ] **STYLE-03**: User can toggle fill on/off for rectangle and circle shapes
- [ ] **STYLE-04**: User can pick fill color via a color picker (when fill is enabled)

### UI & History

- [ ] **UI-01**: All drawing tools are accessible from a dedicated "Draw" tab
- [ ] **HIST-01**: Each drawing action (stroke or shape) is individually undoable via undo/redo

## v2 Requirements

### Advanced Drawing

- **ADVD-01**: User can control stroke opacity/transparency
- **ADVD-02**: Eraser tool to remove specific strokes
- **ADVD-03**: Text annotation tool

## Out of Scope

| Feature | Reason |
|---------|--------|
| Opacity/transparency controls | Not requested for v1 |
| Floating toolbar overlay | "Draw" tab pattern chosen instead |
| Text annotations | Different tool class, not in scope |
| Non-destructive layer system | Drawings bake into the image — keeps arch simple |
| Eraser tool | Not requested for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DRAW-01 | Phase 1 | Pending |
| DRAW-02 | Phase 1 | Pending |
| DRAW-03 | Phase 1 | Pending |
| DRAW-04 | Phase 1 | Pending |
| UI-01 | Phase 1 | Pending |
| HIST-01 | Phase 1 | Pending |
| STYLE-01 | Phase 2 | Pending |
| STYLE-02 | Phase 2 | Pending |
| STYLE-03 | Phase 2 | Pending |
| STYLE-04 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-24*
*Last updated: 2026-02-24 after roadmap creation*
