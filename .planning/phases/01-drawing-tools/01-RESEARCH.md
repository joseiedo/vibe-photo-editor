# Phase 1: Drawing Tools - Research

**Researched:** 2026-02-24
**Domain:** Canvas 2D API drawing tools, event-driven UI, Operation pattern extension
**Confidence:** HIGH

## Summary

Phase 1 extends an already-solid foundation. The codebase already has `ShapeDrawer` (rect/circle), `ShapeOperation`, a working history stack, and a "Draw" tab wired in `CategoryTabs`. The four tools needed — pencil, rectangle, circle, line/arrow — are all implementable directly with the Canvas 2D API at two resolutions (preview + OffscreenCanvas full-res), following the exact same `BaseOperation` → `applyOperation()` → history push pattern used by every existing operation.

The primary design challenge is the **pencil tool**: freehand strokes must accumulate many mouse/touch points during a single drag, then commit the entire stroke as a single history entry on mouseup. The existing `MaskBrush` class demonstrates exactly this pattern — collect points during a drag, call the editor once on mouseup. The pencil operation mirrors this exactly but draws to the image rather than modifying alpha.

The line/arrow tool is new territory for the codebase but straightforward with Canvas 2D: `moveTo`/`lineTo` for the shaft, arrowhead rendered as a closed triangle using trigonometry to position two flanking points. The arrowhead should be part of the same operation, toggled by an "Arrow" checkbox in the panel.

**Primary recommendation:** Extend `ShapeDrawer` into a unified `DrawingController` (or rename/expand in-place) that handles all four tool modes, add two new operations (`PencilOperation`, `LineOperation`) alongside the existing `ShapeOperation`, and add three HTML elements to `panel-draw`: pencil button, line button, and arrowhead toggle.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DRAW-01 | User can draw freehand strokes using a pencil tool | Canvas 2D `lineTo`/`moveTo` per point collected during mousemove; `MaskBrush` pattern for collect-then-commit; `PencilOperation` draws stroke path at full res |
| DRAW-02 | User can drag to draw a rectangle shape | Already exists in `ShapeOperation` + `ShapeDrawer`; needs wiring to new tool mode and unified controller |
| DRAW-03 | User can drag to draw a circle/ellipse shape | Already exists in `ShapeOperation` + `ShapeDrawer`; needs wiring to new tool mode and unified controller |
| DRAW-04 | User can drag to draw a straight line with optional arrowhead | New `LineOperation` using `moveTo`/`lineTo`; arrowhead drawn as closed triangle via trig; drag preview during mousedown→mousemove→mouseup |
| UI-01 | All drawing tools accessible from a dedicated "Draw" tab | `cat-draw` button and `panel-draw` div already exist in HTML; `CategoryTabs` already handles `draw` category; add pencil + line + arrowhead controls to panel |
| HIST-01 | Each drawing action is individually undoable via undo/redo | `applyOperation()` → `history.push()` already handles this for rect/circle; pencil and line must follow same pattern; single mouseup = single history entry |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Canvas 2D API | Browser native | Drawing paths, shapes, strokes at preview resolution | Already used throughout; zero dependency; PROJECT.md constraint: no SVG or external drawing libraries |
| OffscreenCanvas | Browser native | Full-resolution rendering in operations | Already used by all existing operations (`ShapeOperation`, `FlipOperation`, etc.) |
| TypeScript | 5.3.0 | Language | Already in use; strict mode enforced |
| Vite | 5.0.0 | Dev/build | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide | 0.575.0 | Icon buttons for tool palette | Use `Pencil`, `Minus` (or `ArrowRight`) icons for pencil and line tool buttons; already used for rect/circle |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native Canvas 2D | Fabric.js / Konva.js | External libs add bundle weight and mismatch the destructive-bake architecture; explicitly out of scope per PROJECT.md |
| Collect-then-commit stroke | Real-time applyOperation per point | Per-point commits would flood history; collect-then-commit is both faster and correct |

**Installation:**
```bash
# No new dependencies required
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── editor/
│   ├── Canvas.ts          # unchanged
│   ├── History.ts         # unchanged
│   └── ImageEditor.ts     # add applyPencil() and applyLine() methods
├── operations/
│   ├── Operation.ts       # unchanged
│   ├── ShapeOperation.ts  # unchanged (rect+circle already work)
│   ├── PencilOperation.ts # NEW: replays collected stroke points at full res
│   └── LineOperation.ts   # NEW: draws a line with optional arrowhead at full res
├── types.ts               # add PencilStroke[], LineData types
└── ui/
    ├── ShapeDrawer.ts     # EXTEND: add pencil + line tool modes, unify all drawing in one controller
    └── KeyboardShortcuts.ts # add keyboard shortcuts for pencil (P) and line (L) tools
index.html                 # add pencil btn, line btn, arrowhead toggle to panel-draw
```

### Pattern 1: Collect-Then-Commit (from MaskBrush)
**What:** Collect canvas-coordinate points during mousemove, batch all points into a single operation call on mouseup.
**When to use:** For pencil tool — every individual point should NOT create a history entry; the full stroke is one undoable action.
**Example:**
```typescript
// Source: src/ui/MaskBrush.ts (existing pattern, adapted)
private handleMouseDown(e: MouseEvent): void {
  e.preventDefault();
  this.drawing = true;
  this.points = [];
  canvas.addEventListener('mousemove', this.onMouseMove);
  window.addEventListener('mouseup', this.onMouseUp);
  this.addPoint(this.getCanvasPoint(e));
}

private handleMouseMove(e: MouseEvent): void {
  if (!this.drawing) return;
  this.addPoint(this.getCanvasPoint(e));
  // render live preview on canvas without committing
  this.renderPencilPreview();
}

private handleMouseUp(): void {
  if (!this.drawing) return;
  this.drawing = false;
  canvas.removeEventListener('mousemove', this.onMouseMove);
  window.removeEventListener('mouseup', this.onMouseUp);
  if (this.points.length > 0) {
    this.editor.applyPencil(this.points);  // single history entry
  }
  this.points = [];
}
```

### Pattern 2: Preview-Coordinate to Full-Resolution Scaling (from ShapeDrawer.commit())
**What:** Collect coordinates at preview scale, scale up by `1 / editor.getPreviewScale()` before passing to the operation.
**When to use:** All drawing tools — preview canvas is smaller than the full-res image.
**Example:**
```typescript
// Source: src/ui/ShapeDrawer.ts commit() method
const scale = this.editor.getPreviewScale();
const fullResPoints = this.previewPoints.map(p => ({
  x: Math.round(p.x / scale),
  y: Math.round(p.y / scale),
}));
const lineWidth = Math.round(this.previewLineWidth / scale);
await this.editor.applyPencil({ points: fullResPoints, color: this.color, lineWidth });
```

### Pattern 3: Operation Implementation (from ShapeOperation)
**What:** Extend `BaseOperation`, accept data in constructor, implement `apply()` using OffscreenCanvas, return new `ImageBitmap`.
**When to use:** Both `PencilOperation` and `LineOperation` follow this pattern exactly.
**Example:**
```typescript
// Source: src/operations/ShapeOperation.ts (existing pattern)
export class PencilOperation extends BaseOperation {
  constructor(private stroke: PencilStroke) { super(); }

  async apply(_ctx: OffscreenCanvasRenderingContext2D, image: ImageBitmap): Promise<ImageBitmap> {
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    PencilOperation.draw(ctx, this.stroke);
    return this.createImageBitmap(canvas);
  }

  static draw(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, stroke: PencilStroke): void {
    if (stroke.points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  getDescription(): string { return 'Draw pencil stroke'; }
}
```

### Pattern 4: Drag-to-Draw Shape Preview (from ShapeDrawer)
**What:** On mousedown start tracking drag origin; on mousemove call `editor.drawOnPreview()` to repaint image + live shape; on mouseup commit.
**When to use:** Rectangle, circle (already working), and line tools all use this pattern.
**Example for line:**
```typescript
// Source: adapted from src/ui/ShapeDrawer.ts renderPreview()
private renderLinePreview(): void {
  this.editor.drawOnPreview((ctx) => {
    LineOperation.draw(ctx, this.buildLine());
  });
}

private buildLine(): LineData {
  return {
    x1: this.dragStartX, y1: this.dragStartY,
    x2: this.currentX,   y2: this.currentY,
    color: this.color,
    lineWidth: this.lineWidth,
    arrowhead: this.arrowheadEnabled,
  };
}
```

### Pattern 5: Arrowhead Drawing
**What:** Compute two flanking points from the line vector using trigonometry, draw as a filled triangle.
**When to use:** `LineOperation.draw()` when `arrowhead === true`.
**Example:**
```typescript
// Source: Canvas 2D API standard pattern
static drawArrowhead(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  color: string, size: number
): void {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = size * 4; // scale arrowhead to lineWidth
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
```

### Anti-Patterns to Avoid
- **Committing on every mousemove point:** Creates one history entry per pixel of pencil stroke. Instead, collect all points and commit once on mouseup.
- **Adding a new controller class for drawing:** The existing `ShapeDrawer` already owns the "draw" tab's lifecycle. Add pencil/line modes to it, do not create a parallel controller that fights for the same DOM events.
- **Using the overlay div for line preview:** The shape overlay is a positioned `<div>` useful for the drag-box UI for rect/circle. For line and pencil, draw directly on the preview canvas via `editor.drawOnPreview()` — no overlay needed.
- **Not scaling to full resolution:** Drawing at preview coords and passing those raw coords to the operation means the stroke appears tiny on high-resolution images. Always divide by `getPreviewScale()`.
- **Separate `applyOperation()` calls for each point:** Same as committing per point — floods history. One stroke = one history entry.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Smooth freehand curves | Bezier smoothing, custom interpolation | Canvas 2D `lineTo` with `lineJoin: 'round'` and `lineCap: 'round'` | Round join/cap gives acceptable quality for annotation use; bezier adds complexity with no requirement |
| Arrowhead geometry | Custom arrow math | Standard `atan2`-based triangle (Pattern 5 above) | Well-understood, 10 lines, no library needed |
| History/undo | Custom undo stack | Existing `History.ts` via `applyOperation()` | Already handles memory management (ImageBitmap.close()), 50-entry cap, undo/redo pointers |
| Scale conversion | Custom DPI calculations | `editor.getPreviewScale()` (existing) | Canvas-native ratio; already used by ShapeDrawer |

**Key insight:** Every operation's "full-res rendering" is already solved by the `OffscreenCanvas` pattern in `ShapeOperation`. Copy that structure exactly.

## Common Pitfalls

### Pitfall 1: Preview Canvas Coordinate Drift
**What goes wrong:** Mouse coordinates from `clientX/clientY` do not map 1:1 to canvas pixels because the canvas is CSS-scaled.
**Why it happens:** The preview canvas has a CSS display size different from its pixel dimensions.
**How to avoid:** Use `getCanvasPoint()` pattern (from `MaskBrush`):
```typescript
const rect = canvas.getBoundingClientRect();
return {
  x: (e.clientX - rect.left) * (canvas.width / rect.width),
  y: (e.clientY - rect.top)  * (canvas.height / rect.height),
};
```
**Warning signs:** Strokes appear offset from where the user draws.

### Pitfall 2: Forgetting to Remove Event Listeners
**What goes wrong:** Mouse/touch events from a previous tool activation still fire after tool deactivation, causing phantom strokes.
**Why it happens:** `addEventListener` without matching `removeEventListener` on deactivate.
**How to avoid:** Follow `MaskBrush` pattern — store bound listener references as class fields, remove them in `deactivate()`.
**Warning signs:** Pencil draws when rect tool is active.

### Pitfall 3: Pencil Stroke with Single Point
**What goes wrong:** A tap (no drag) collects only one point; `ctx.lineTo` with one point renders nothing visible.
**Why it happens:** `lineTo` requires at least two points to stroke.
**How to avoid:** Guard in `PencilOperation.draw()`: if `points.length < 2`, draw a small circle at the single point instead (using `arc()`).
**Warning signs:** Tapping the canvas with pencil tool does nothing.

### Pitfall 4: Line Tool Direction When Arrowhead is Present
**What goes wrong:** Arrowhead appears at the start point instead of the end, or points the wrong direction.
**Why it happens:** `atan2(y2-y1, x2-x1)` computes angle from x1,y1 toward x2,y2; arrowhead flanks placed wrong if subtraction order is reversed.
**How to avoid:** Always compute `angle = Math.atan2(y2 - y1, x2 - x1)` and draw arrowhead at `(x2, y2)`.
**Warning signs:** Arrow points backwards when dragging right.

### Pitfall 5: Shape Overlay Conflict
**What goes wrong:** Rect/circle tool overlay div intercepts mousedown events when pencil/line tool is active.
**Why it happens:** The overlay div `#shape-overlay` is visible during rect/circle mode; if switching tools without deactivating, the overlay stays visible.
**How to avoid:** `deactivate()` in `ShapeDrawer` already hides the overlay. Ensure tool switching always calls `deactivate()` first (already handled by `CategoryTabs` `onDeactivate` callback).
**Warning signs:** Can't start a pencil stroke because clicks land on the overlay.

### Pitfall 6: drawOnPreview() Repaints Full Image Each Call
**What goes wrong:** For pencil, calling `editor.drawOnPreview()` on every `mousemove` event means the full image is re-blitted on every pixel. On a slow machine or very large preview, this can cause visible lag.
**Why it happens:** `drawOnPreview()` calls `updatePreview()` first, then calls the provided function. `updatePreview()` redraws the whole image.
**How to avoid:** For pencil, avoid `editor.drawOnPreview()` during dragging. Instead, draw incrementally on the raw preview canvas context using the approach from `MaskBrush.paintPoint()` — call `editor.drawOnPreview()` once on mousedown, then draw subsequent segments directly on `canvas.getContext('2d')` during mousemove. On mouseup, call `editor.drawOnPreview()` once more to ensure a clean state before commit.
**Warning signs:** Pencil tool stutters on large images.

## Code Examples

Verified patterns from official sources and existing codebase:

### New type definitions (add to types.ts)
```typescript
// Follow existing ShapeData pattern
export interface Point {
  x: number;
  y: number;
}

export interface PencilStroke {
  points: Point[];
  color: string;
  lineWidth: number;
}

export interface LineData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  lineWidth: number;
  arrowhead: boolean;
}
```

### ImageEditor method additions (follow applyShape() pattern)
```typescript
// Source: src/editor/ImageEditor.ts existing applyShape()
async applyPencil(stroke: PencilStroke): Promise<void> {
  await this.applyOperation(new PencilOperation(stroke));
}

async applyLine(line: LineData): Promise<void> {
  await this.applyOperation(new LineOperation(line));
}
```

### ShapeDrawer tool mode extension
```typescript
// Source: adapted from existing ShapeDrawer.ts toggleTool() pattern
type DrawTool = ShapeType | 'pencil' | 'line';

// Add to ShapeDrawer:
private activeTool: DrawTool | null = null;

// Add pencil-specific state:
private pencilPoints: Point[] = [];
private isDrawingPencil = false;

// Add line-specific state:
private lineStart: Point | null = null;
private lineEnd: Point | null = null;
private arrowheadEnabled = false;
```

### HTML additions to panel-draw
```html
<!-- Add before existing shape buttons in panel-draw -->
<span class="panel-label">Draw</span>
<button id="draw-pencil-btn" class="btn btn-icon" title="Pencil (P)"></button>
<button id="draw-line-btn" class="btn btn-icon" title="Line (L)"></button>
<label class="btn btn-sm" title="Arrow tip on line">
  <input type="checkbox" id="draw-arrowhead" /> Arrow
</label>
<div class="separator"></div>
<!-- existing: shape-rect-btn, shape-circle-btn, separator, color, filled, line-width, apply -->
```

### Keyboard shortcut additions (KeyboardShortcuts.ts)
```typescript
// Add to switch statement:
case 'p': click('draw-pencil-btn'); break;
case 'l': click('draw-line-btn'); break;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ShapeDrawer: position-then-apply overlay model | ShapeDrawer: drag-to-resize with 4 corner handles | Already in codebase | Rect/circle already support corner-handle drag; line should use simpler drag-start-to-end model (no overlay) |
| Single `ShapeType = 'rect' \| 'circle'` | Must extend to `DrawTool = ShapeType \| 'pencil' \| 'line'` | This phase | Requires updating `types.ts` |

**Deprecated/outdated:**
- None. The codebase is current.

## Open Questions

1. **Should the arrowhead toggle be a checkbox or a button toggle?**
   - What we know: Other toggles (`shape-filled-btn`) use a button with `btn-primary` active state. A checkbox is semantically clearer.
   - What's unclear: Which fits better visually in the narrow tool panel.
   - Recommendation: Use `<label><input type="checkbox" /> Arrow</label>` styled as a button, consistent with the existing `shape-filled-btn` icon button pattern. Keeps consistent "active state" visual language.

2. **Should pencil and line tool share the preview canvas cursor style?**
   - What we know: `MaskBrush` sets `canvas.style.cursor = 'crosshair'` during draw mode.
   - What's unclear: Whether pencil should use `crosshair` or a custom `cursor: url(...)` pencil cursor.
   - Recommendation: Use `crosshair` for both pencil and line tools. Custom cursors add complexity not required by spec.

3. **What happens to the shape-apply-btn during pencil/line mode?**
   - What we know: Currently `shape-apply-btn` is shown only when rect/circle overlay is active (confirm-then-commit model). Pencil/line use mouseup-to-commit (no preview step).
   - What's unclear: Whether the Apply button should be repurposed or hidden.
   - Recommendation: Hide `shape-apply-btn` when pencil/line is the active tool. The mouseup-to-commit UX is simpler and matches the requirement ("draw... and see it committed to the image").

4. **Minimum stroke width for arrowhead scaling**
   - What we know: Arrowhead size should scale with `lineWidth` for visual consistency.
   - What's unclear: The exact multiplier (4× lineWidth is common; `canvas2d` has no built-in arrowhead API).
   - Recommendation: Use `headLen = Math.max(lineWidth * 4, 12)` to prevent arrowheads that are too small to see at thin stroke widths.

## Sources

### Primary (HIGH confidence)
- Existing codebase — `src/ui/ShapeDrawer.ts`, `src/ui/MaskBrush.ts`, `src/operations/ShapeOperation.ts`, `src/editor/ImageEditor.ts`, `src/editor/Canvas.ts`, `src/types.ts`, `index.html` — direct code read; all patterns confirmed by reading actual source
- Existing codebase — `.planning/codebase/ARCHITECTURE.md`, `CONVENTIONS.md`, `STACK.md` — architecture and convention documentation read
- MDN Canvas 2D API — `lineTo`, `moveTo`, `arc`, `atan2`, `lineCap`, `lineJoin` patterns are stable browser API; no version concerns

### Secondary (MEDIUM confidence)
- `MaskBrush.ts` collect-then-commit pattern — verified by reading source; directly analogous to pencil stroke collection

### Tertiary (LOW confidence)
- Arrowhead size heuristic (4× lineWidth) — common practice but not officially specified; needs visual validation during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools are existing browser APIs already in use; zero new dependencies
- Architecture: HIGH — all patterns read directly from existing codebase source files
- Pitfalls: HIGH for coord scaling and event listeners (verified from existing code); MEDIUM for pencil performance (depends on image size in practice)

**Research date:** 2026-02-24
**Valid until:** 2026-04-24 (stable browser APIs; no fast-moving dependencies)
