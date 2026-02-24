# Codebase Concerns

**Analysis Date:** 2026-02-24

## Tech Debt

**ImageBitmap Memory Management — Complex State Tracking:**
- Issue: `ImageEditor` manages three distinct ImageBitmap references (`currentImage`, `originalBeforeRemoval`, and cached masks) with manual lifecycle management. No centralized disposal mechanism.
- Files: `src/editor/ImageEditor.ts`, `src/editor/Canvas.ts`, `src/operations/RemoveBgOperation.ts`
- Impact: Risk of memory leaks if any code path forgets to call `.close()` on an ImageBitmap. Canvas 2D API doesn't automatically garbage collect ImageBitmaps until they're explicitly closed.
- Fix approach: Create a BitmapManager class that wraps ImageBitmap lifecycle (creation, tracking, disposal). Use WeakMaps to auto-clean when references are lost. Audit all callers of `createImageBitmap()` to ensure cleanup paths exist.

**Mask Caching Without Cache Invalidation Strategy:**
- Issue: `RemoveBgOperation.maskCache` is a static singleton that caches based only on image dimensions. No TTL, size limit, or explicit invalidation beyond `clearCache()` called on image load.
- Files: `src/operations/RemoveBgOperation.ts` (lines 16-17, 76)
- Impact: If user crops image to same dimensions as previous image, stale mask is reused. Cache persists for app lifetime, consuming GPU memory.
- Fix approach: Implement hash-based cache (MD5/SHA1 of image pixels) instead of dimension-based. Add cache size limit (e.g., max 3 entries). Add timestamp-based TTL (30 minutes).

**ImageEditor as God Object:**
- Issue: `ImageEditor` (312 lines) manages canvas rendering, history, adjustments, background removal, mask refinement, and UI state synchronization. Single responsibility violated.
- Files: `src/editor/ImageEditor.ts`
- Impact: Difficult to test individual features. Changes to one feature risk breaking others. High cognitive load for maintenance.
- Fix approach: Extract `RemoveBgController` (lines 177-246), `AdjustmentController` (lines 92-125), and `MaskController` to separate classes. Keep `ImageEditor` as coordinator.

**Inconsistent Error Handling in UI Layer:**
- Issue: Only `Toolbar` (line 55) has try-catch for background removal. Other operations (`CropSelector`, `ShapeDrawer`, `MaskBrush`) don't catch async errors. Unhandled rejections silently fail.
- Files: `src/ui/Toolbar.ts`, `src/ui/CropSelector.ts`, `src/ui/ShapeDrawer.ts`, `src/ui/MaskBrush.ts`
- Impact: User doesn't know if crop/shape/mask operation failed. UI state may become inconsistent (e.g., button disabled but operation didn't complete).
- Fix approach: Create `OperationErrorHandler` wrapper that all UI classes use. Show toast/snackbar on error, re-enable UI, log to console.

## Known Bugs

**Premultiplied Alpha Loss in Background Removal Workflow:**
- Symptoms: When background is removed, erased pixels (alpha=0) have RGB values set to 0 by Canvas 2D API. Refining mask with "restore" strokes copies from `originalBeforeRemoval` to work around this.
- Files: `src/editor/ImageEditor.ts` (lines 33-36, 214-216), `src/ui/MaskBrush.ts` (lines 12-15), `src/operations/RefineMaskOperation.ts` (lines 26-34)
- Trigger: Remove background → modify threshold → undo → re-remove with different params. Erased pixels lose their original color data.
- Workaround: Code stores pre-removal ImageBitmap and restores RGB from it. However, workaround itself has no cleanup on deactivate (potential memory leak).

**Unhandled Edge Case: Empty Image Dimensions:**
- Symptoms: If image has 0 width or 0 height (e.g., corrupted file), canvas operations fail silently or throw.
- Files: `src/editor/Canvas.ts` (line 241 has guard but only for preview), `src/operations/RemoveBgOperation.ts` (line 92 loops with 0 iterations)
- Trigger: Load image with corrupted file header
- Workaround: None — user gets blank canvas or JS error

**URL.createObjectURL Leak in Concurrent Operations:**
- Symptoms: If user triggers background removal → cancel → trigger again rapidly, multiple blob URLs are created but only the last is revoked.
- Files: `src/operations/RemoveBgOperation.ts` (lines 64, 79)
- Trigger: Rapid toggle of background removal UI
- Workaround: Finally block revokes URL, but race conditions possible with re-entrant calls

## Security Considerations

**Hugging Face Transformer Model Download Unverified:**
- Risk: Model file (RMBG-1.4) downloaded from Hugging Face CDN with no integrity check (no hash verification). MITM or compromised CDN could inject malicious WASM/JS.
- Files: `src/operations/RemoveBgOperation.ts` (line 35)
- Current mitigation: TLS transport security only. Browser cache caching.
- Recommendations: (1) Implement subresource integrity (SRI) if served via CDN. (2) Self-host model with hash verification. (3) Load model in Web Worker to sandbox execution. (4) Add CSP header to prevent inline script injection.

**Clipboard Data Not Validated:**
- Risk: Paste handler accepts any image data from clipboard without validation. Could process unexpectedly large files (e.g., multi-GB image).
- Files: `src/ui/Toolbar.ts` (lines 72-82)
- Current mitigation: Browser's FileAPI validates MIME type string matching
- Recommendations: (1) Validate file size before calling `createImageBitmap()`. (2) Add max dimension limits (e.g., reject images > 8192x8192). (3) Catch OOM errors from `createImageBitmap()`.

**DOM Event Listener Accumulation:**
- Risk: If tools (Crop, Shape, Mask) are activated/deactivated repeatedly, multiple listeners could attach (if deactivate fails).
- Files: `src/ui/CropSelector.ts`, `src/ui/ShapeDrawer.ts`, `src/ui/MaskBrush.ts` (multiple addEventListener calls)
- Current mitigation: Deactivate removes listeners, but if exception thrown during deactivate, listeners remain
- Recommendations: (1) Use addEventListener options { once: true } for one-shot handlers. (2) Track listeners in Set and verify before attaching. (3) Use AbortController to clean up all listeners at once.

## Performance Bottlenecks

**Preview Rendering on Every Mouse Move:**
- Problem: `CropSelector.onMove()` and `ShapeDrawer` redraw preview on every mousemove event (fires 60+ times/sec).
- Files: `src/ui/CropSelector.ts` (line 90), `src/ui/ShapeDrawer.ts` (handleMouseMove)
- Cause: Overlay position updated immediately, no throttle/debounce
- Improvement path: (1) Throttle onMove to 16ms (60 FPS). (2) Only redraw overlay position (CSS transform), not full preview. (3) Use requestAnimationFrame instead of immediate updates.

**Full Image Pixel Iteration in Mask Application:**
- Problem: `RemoveBgOperation.applyMask()` (lines 92-98) has nested loop over every pixel: `O(width * height)`. Runs twice: once for preview, once for final.
- Files: `src/operations/RemoveBgOperation.ts` (lines 92-98)
- Cause: Threshold is applied pixel-by-pixel with no batching or SIMD optimization
- Improvement path: (1) Use GPU via WebGL/WebGPU for batch threshold. (2) Use Web Workers to process in parallel. (3) Cache interpolated mask at canvas resolution instead of recalculating.

**Model Load Blocks UI Thread:**
- Problem: First call to `RemoveBgOperation.loadSegmenter()` downloads ~150MB model synchronously on main thread.
- Files: `src/operations/RemoveBgOperation.ts` (lines 31-48)
- Cause: No Web Worker, no streaming download indicator during download
- Improvement path: (1) Lazy-load model in Web Worker on app init (not on first use). (2) Stream download with progress bar. (3) Cache model in IndexedDB between sessions.

**History Entries Not Lazy-Loaded:**
- Problem: All 50 history entries stored as full-resolution ImageBitmaps in memory at all times.
- Files: `src/editor/History.ts` (line 6: maxEntries = 50)
- Cause: No image downsampling or off-screen storage
- Improvement path: (1) Store only lower-res thumbnails in history. (2) Reconstruct operations on redo instead of storing full images. (3) Implement diff-based history (store only changed regions).

## Fragile Areas

**Mask Brush / Remove Background Workflow:**
- Files: `src/ui/MaskBrush.ts`, `src/editor/ImageEditor.ts` (originalBeforeRemoval), `src/operations/RefineMaskOperation.ts`
- Why fragile: Three classes coordinating ImageBitmap ownership. If undo() is called while MaskBrush is active, `originalBeforeRemoval` is nulled (line 258) but MaskBrush still holds preview copy. Restore strokes then fail silently.
- Safe modification: (1) Make `originalBeforeRemoval` lifecycle explicit (deactivate should free it, not undo). (2) Use MaskBrush to hold only active strokes, not a cache. (3) Refactor deactivation order in `main.ts` (lines 31-45) to guarantee cleanup.
- Test coverage: No tests for undo/redo during active background removal workflow.

**Coordinate System Conversions (Preview vs Full-Res):**
- Files: `src/ui/CropSelector.ts` (line 155), `src/ui/ShapeDrawer.ts`, `src/ui/MaskBrush.ts` (line 139-145)
- Why fragile: Multiple places convert preview pixels to full-res using `getPreviewScale()`. If canvas is resized (window.resize event line 50 in main.ts), scale changes but in-flight strokes may use stale scale.
- Safe modification: (1) Cache preview scale at stroke start, not at conversion time. (2) Validate all coordinates before applying. (3) Add unit tests for scale conversions at various aspect ratios.
- Test coverage: No tests for coordinate conversion edge cases (very small/large preview, extreme aspect ratios).

**Event Listener Management in CategoryTabs:**
- Files: `src/ui/CategoryTabs.ts` (lines 13-15)
- Why fragile: Tabs don't track which tool is active. If user clicks "crop" then "draw" then "crop" again, both `cropSelector.deactivate()` (from first close) and CategoryTabs' deactivate are called. Order matters.
- Safe modification: (1) Make deactivate() idempotent (safe to call twice). (2) Use a state machine for tool activation. (3) Add assertions to verify expected state.
- Test coverage: No tests for rapid tab switching.

## Scaling Limits

**History Memory Growth:**
- Current capacity: 50 entries × image size. For 4K image (4096×2160 RGBA = 35MB): 50 × 35MB = 1.75GB
- Limit: Browser heap limit (typically 2-4GB). Large image + many edits = OOM crash.
- Scaling path: (1) Implement operation replay (store operations, not images). (2) Compress history entries with zstd. (3) Move history to IndexedDB. (4) Make maxEntries configurable with warning.

**Background Removal Model Size:**
- Current capacity: Single 150MB model cached in memory permanently
- Limit: On low-end devices (512MB RAM), model alone consumes ~30% of heap
- Scaling path: (1) Support model quantization (INT8 instead of FP32). (2) Lazy unload after 5 minutes of inactivity. (3) Offer "lite" mode with smaller model.

**Canvas Resolution Scaling:**
- Current capacity: Full image resolution stored as ImageBitmap
- Limit: Browser max canvas size is ~16384×16384. Images > this fail silently.
- Scaling path: (1) Detect oversized images and downsample. (2) Implement tiled rendering for very large images. (3) Add user warning for non-optimal aspect ratios.

## Dependencies at Risk

**@huggingface/transformers ^3.8.1:**
- Risk: Loads and executes ONNX Runtime + ML.js (WASM modules) without CSP verification. Major version bump could introduce breaking API changes or security issues.
- Impact: Any update could break background removal feature entirely
- Migration plan: (1) Pin exact version or narrow range (^3.8.1 → ~3.8.0). (2) Test all minor version upgrades in CI. (3) Consider alternative: mediapipe (smaller, faster, but less accurate). (4) Self-host model + inference engine.

**lucide ^0.575.0:**
- Risk: Icon library used for shape drawer buttons. Updates could change icon size/style breaking UI layout.
- Impact: Minor — UI layout could shift
- Migration plan: (1) Lock icons to specific set (document which icons are used). (2) Pin lucide version. (3) Consider inline SVGs to eliminate dependency.

## Test Coverage Gaps

**Background Removal + Undo/Redo Workflow:**
- What's not tested: Removing background → undo → redo → remove again with different threshold
- Files: `src/editor/ImageEditor.ts`, `src/operations/RemoveBgOperation.ts`, `src/ui/MaskBrush.ts`
- Risk: `originalBeforeRemoval` may be stale or null, leading to broken restore strokes
- Priority: High

**Coordinate Conversion Edge Cases:**
- What's not tested: Preview scale conversions with extreme aspect ratios (1:10, 10:1), or when canvas is 0×0, or after rapid window resizes
- Files: `src/ui/CropSelector.ts`, `src/ui/ShapeDrawer.ts`
- Risk: Strokes applied at wrong position, or division by zero if scale is 0
- Priority: High

**Rapid Tool Activation/Deactivation:**
- What's not tested: Click crop → draw → crop → draw 10 times rapidly, then undo
- Files: `src/ui/CategoryTabs.ts`, `src/main.ts`
- Risk: Memory leaks (event listeners not cleaned up), state corruption, double-deactivation
- Priority: Medium

**Large Image Upload:**
- What's not tested: Upload 8000×8000 image, attempt operations, export, undo 20 times
- Files: `src/editor/ImageEditor.ts`, `src/operations/*`
- Risk: OOM crash, slow UI, unresponsive app
- Priority: Medium

**Paste Event Race Conditions:**
- What's not tested: Paste image while background removal is in progress
- Files: `src/ui/Toolbar.ts` (paste handler), `src/editor/ImageEditor.ts` (runRemoveBg)
- Risk: `pendingRemoveBg` state overwritten, mask applied to wrong image
- Priority: Medium

**Malformed Image Files:**
- What's not tested: Corrupted JPG, truncated PNG, invalid MIME type in clipboard
- Files: `src/ui/Toolbar.ts`, `src/editor/ImageEditor.ts` (loadImage)
- Risk: Unhandled JS exception, blank canvas, unclear error message to user
- Priority: Low

---

*Concerns audit: 2026-02-24*
