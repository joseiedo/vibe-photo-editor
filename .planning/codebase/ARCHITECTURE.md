# Architecture

**Analysis Date:** 2026-02-24

## Pattern Overview

**Overall:** Layered MVC with command pattern for operations

**Key Characteristics:**
- Clear separation between editor logic, UI controls, and operations
- Immutable image state via history stack with undo/redo
- Deferred operation application (pending adjustments for preview before commit)
- ImageBitmap-based pixel manipulation with OffscreenCanvas for full-resolution work
- Event-driven UI state management tied to editor changes

## Layers

**Editor Layer:**
- Purpose: Core image editing state and operation orchestration
- Location: `src/editor/`
- Contains: `ImageEditor.ts` (main orchestrator), `Canvas.ts` (rendering), `History.ts` (undo/redo)
- Depends on: Operations layer, types
- Used by: UI layer

**Operations Layer:**
- Purpose: Implement discrete image transformations (flip, crop, adjust, remove background, etc.)
- Location: `src/operations/`
- Contains: `BaseOperation` abstract class, operation implementations (`FlipOperation`, `CropOperation`, `RemoveBgOperation`, etc.)
- Depends on: Types, external services (Hugging Face for background removal)
- Used by: Editor layer via `applyOperation()`

**UI Layer:**
- Purpose: User interaction handlers and DOM state management
- Location: `src/ui/`
- Contains: Control classes (`Toolbar`, `Sliders`, `CategoryTabs`, `MaskBrush`, `CropSelector`, `ShapeDrawer`, `MergeDialog`, `Filters`)
- Depends on: Editor layer
- Used by: Main entry point (`main.ts`)

**Rendering Layer:**
- Purpose: Canvas management at two resolutions (preview and full-resolution)
- Location: `src/editor/Canvas.ts`
- Contains: Preview canvas (HTMLCanvasElement) and full-resolution OffscreenCanvas
- Depends on: None
- Used by: Editor layer

## Data Flow

**Image Loading:**

1. User selects file via upload or pastes image
2. `Toolbar` receives file, calls `ImageEditor.loadImage(file)`
3. `ImageEditor` creates `ImageBitmap` from file, passes to `Canvas.setImage()`
4. `Canvas` creates OffscreenCanvas at full resolution, stores ImageBitmap reference
5. `Canvas.updatePreview()` scales image to fit preview container, renders to display canvas
6. `ImageEditor` pushes initial state to `History` with description 'Original'
7. UI state updates via `onStateChange` callback

**Operation Application:**

1. UI control (e.g., `Sliders`) calls editor method (e.g., `setPendingAdjustments()`)
2. For preview operations (adjustments): `Canvas.updatePreview(filter)` applies CSS filter to preview only
3. For committed operations: Control calls editor method that invokes `applyOperation(Operation)`
4. `ImageEditor.applyOperation()`:
   - Flushes any pending adjustments first
   - Gets full-resolution image from Canvas
   - Instantiates operation with parameters
   - Calls `operation.apply(fullResContext, imageBitmap)` → returns new ImageBitmap
   - Sets new image via `Canvas.setImage()`
   - Pushes to history with operation description
   - Triggers `onStateChange()` callback
5. UI controls receive callback, call `updateState()` to refresh button states

**Background Removal Workflow:**

1. User clicks "Remove Background" → `Toolbar` calls `ImageEditor.runRemoveBg(threshold, onProgress)`
2. `ImageEditor` flushes pending adjustments, calls `RemoveBgOperation.fetchMask(image, onProgress)`
3. `RemoveBgOperation` loads Hugging Face model (cached after first load), runs segmentation pipeline
4. Mask result stored in `ImageEditor.pendingRemoveBg` (not committed to history yet)
5. Preview updated immediately via `applyMaskPreview()` which applies mask at preview resolution only
6. User adjusts threshold slider → `previewRemoveBgThreshold()` updates preview instantly
7. User clicks "Apply" → `commitRemoveBg()` applies mask at full resolution, commits to history
8. `originalBeforeRemoval` image cached for refine brush to restore original pixels

**Refine Brush Workflow:**

1. User activates refine brush via `MaskBrush.activate()`
2. Captures preview-scale copy of `originalBeforeRemoval` image
3. User draws/paints on canvas with mouse
4. Mouse moves tracked, strokes collected in `MaskStroke[]` array
5. User deactivates brush → `MaskBrush.deactivate()` triggers `ImageEditor.applyRefineMask(strokes)`
6. `RefineMaskOperation` applies collected strokes, restores or erases pixels
7. Result committed to history

**State Management:**

- `ImageEditor` holds mutable state: current image, history, pending adjustments, pending mask
- UI controls hold DOM references and event listeners
- State changes propagate via `onStateChange()` callback passed to ImageEditor
- UI calls `updateState()` after operations complete
- Preview canvas updated immediately for instant feedback
- Full-resolution changes committed to history only on explicit user confirmation or completion

## Key Abstractions

**Operation Interface:**
- Purpose: Represents any transformable image operation
- Examples: `FlipOperation`, `CropOperation`, `AdjustOperation`, `RemoveBgOperation`, `UpscaleOperation`
- Pattern: Async apply() method receives full-resolution canvas context + ImageBitmap, returns new ImageBitmap
- Each operation is stateless, receives all parameters in constructor

**Canvas Abstraction:**
- Purpose: Manages dual-resolution rendering (preview for UI, full-res for export)
- Examples: `Canvas.ts`
- Pattern: Stores current ImageBitmap, full-res OffscreenCanvas, preview HTMLCanvasElement
- Handles scaling/fitting to container, filter application, export

**History Stack:**
- Purpose: Implements undo/redo with memory management
- Examples: `History.ts`
- Pattern: Circular buffer (50-entry limit), discards forward history on new operation, closes freed ImageBitmap resources

**UI Controller Pattern:**
- Purpose: Each control class owns its DOM elements and event listeners
- Examples: `Toolbar`, `Sliders`, `MaskBrush`, `CategoryTabs`
- Pattern: Constructor grabs DOM refs, calls `setupEventListeners()`, provides `updateState()` for UI refresh

## Entry Points

**Application Initialization:**
- Location: `src/main.ts`
- Triggers: `DOMContentLoaded` event
- Responsibilities:
  - Creates `ImageEditor` instance with canvas element
  - Instantiates all UI controller classes, passing editor reference
  - Sets up cross-deactivation callbacks (e.g., CropSelector deactivates ShapeDrawer)
  - Registers window resize handler to refresh preview

**UI Event Handlers:**
- Toolbar: File upload, undo/redo, download, upscale, background removal, flips, rotates, paste
- Sliders: Brightness/contrast/saturation adjustments
- CropSelector: Crop region selection and application
- MaskBrush: Refine background removal with restore/erase brush
- ShapeDrawer: Draw rectangles/circles on canvas
- MergeDialog: Merge second image from file
- Filters: Apply posterize and other filters
- CategoryTabs: Toggle between panels, deactivate active tools

## Error Handling

**Strategy:** Defensive with try-catch at async boundaries

**Patterns:**
- `RemoveBgOperation.loadSegmenter()`: Catches model loading errors in Toolbar, displays "Failed" status
- `ImageEditor.loadImage()`: File validation implicit via `createImageBitmap()` rejection
- `Canvas` methods: Throw errors if 2D context unavailable (fatal, not recoverable)
- UI operations wrapped in try-finally to re-enable buttons even on error
- URL cleanup in finally blocks (RemoveBgOperation.fetchMask)

## Cross-Cutting Concerns

**Logging:** `console.error()` for failures (background removal, operation errors)

**Validation:** Crop operation clamps region to image bounds; slider values are constrained at HTML level

**Authentication:** None (local-only application)

**Resource Management:**
- ImageBitmap objects explicitly closed when evicted from history
- OffscreenCanvas created per operation, discarded after ImageBitmap conversion
- Blob URLs created for download/clipboard revoked immediately after use
- Model cache cleared on new image load to free VRAM

**Performance Optimization:**
- Preview-resolution adjustments use CSS filter for instant feedback (no pixel pushing)
- Full-resolution operations deferred until commit (pending adjustments, pending mask)
- Mask cache reused if image dimensions match
- History limited to 50 entries to cap memory usage

---

*Architecture analysis: 2026-02-24*
