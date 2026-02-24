# Testing Patterns

**Analysis Date:** 2026-02-24

## Test Framework

**Status:** Not detected

**No testing infrastructure found:**
- No `.test.ts`, `.spec.ts`, or `__tests__` directories in codebase
- No Jest, Vitest, Mocha, or other test runner in `package.json`
- No test-related dependencies detected
- No test configuration files (jest.config.ts, vitest.config.ts)

**Build & Dev Tools Only:**
- TypeScript: `^5.3.0` for compilation
- Vite: `^5.0.0` for bundling and dev server

**Implication:** Code validation occurs through TypeScript compilation and manual testing only.

## Manual Testing Approach

**Integration Testing via UI:**
- All testing is manual through browser interaction
- Features verified through user workflow (load image → apply operations → export)
- Real browser Canvas API and ImageBitmap APIs tested directly

**Type Safety as Validation:**
- Strict TypeScript mode provides compile-time checks
- `noUnusedLocals: true` and `noUnusedParameters: true` catch dead code
- Type constraints prevent many runtime errors

## Testability Patterns (Current Architecture)

**Dependency Injection:**
Classes accept dependencies via constructor, making them theoretically testable:
```typescript
export class Toolbar {
  constructor(editor: ImageEditor) {
    this.editor = editor;
    this.setupEventListeners();
  }
}
```

**Separable Concerns:**
- `Operation` interface enables operation pattern — could be mocked in tests
- `Canvas` and `History` are isolated modules — could be unit tested
- UI classes inherit from editor state rather than global state

**What Would Need Mocking for Tests:**

**DOM elements:** All UI classes access DOM directly:
```typescript
const uploadInput = document.getElementById('upload-input') as HTMLInputElement;
uploadInput.addEventListener('change', async (e) => { ... });
```
Would require JSDOM or similar.

**Canvas APIs:** Operations use OffscreenCanvas and ImageBitmap:
```typescript
const canvas = new OffscreenCanvas(image.width, image.height);
const ctx = canvas.getContext('2d');
```
Would require Canvas mock or headless browser.

**External APIs:** RemoveBgOperation calls Hugging Face transformers:
```typescript
const segmenter = await pipeline('image-segmentation', 'briaai/RMBG-1.4', {...});
```
Would need to mock or stub the pipeline function.

## Observable Quality Indicators (Without Formal Tests)

**Code organization supporting correctness:**

1. **Type Safety:**
   - All public methods have explicit return types
   - Operation interface contract: `interface Operation { apply(...); getDescription(): string; }`
   - State interfaces document expected structure: `interface EditorState`, `interface HistoryEntry`

2. **Resource Management:**
   - ImageBitmap lifecycle tracked explicitly
   - `History` class closes unused bitmaps: `e.image.close()`
   - Cleanup on state transitions: `this.pendingRemoveBg = null;`

3. **Error Prevention:**
   - Null checks before every Canvas operation
   - Boundary checking: `const sx = Math.max(0, Math.min(x, image.width));`
   - State validation: `if (!this.currentImage) return;`

4. **Testable Code Patterns:**
   - Pure functions used for computation: `isDefaultAdjustments(adj: AdjustmentValues): boolean`
   - Static helper methods for reusable logic: `AdjustOperation.buildFilter(adjustments)`
   - Separation of concerns: Canvas rendering, Operation application, History management

## Potential Test Coverage Strategy (If Tests Were Added)

**Unit Test Candidates:**

1. **History Management** (`src/editor/History.ts`):
   ```typescript
   // Test undo/redo logic
   // Test maxEntries cap and eviction
   // Test clear() functionality
   ```

2. **Type Checking** (`src/types.ts`):
   ```typescript
   // Ensure interfaces compile correctly
   // Verify union types work as expected
   ```

3. **Operation Classes** (`src/operations/`):
   ```typescript
   // FlipOperation: horizontal vs vertical transforms
   // RotateOperation: degree calculations
   // CropOperation: boundary clamping
   // AdjustOperation: filter string generation
   ```

4. **Helper Functions**:
   ```typescript
   // CropSelector.ts clamp() function
   // RemoveBgOperation.isDefaultAdjustments()
   ```

**Integration Test Candidates:**

1. **ImageEditor Workflow:**
   - Load image → apply operation → verify history updated
   - Pending adjustments → flush → apply to history

2. **UI State Synchronization:**
   - Load image → updateState() called → buttons enabled
   - Undo/redo → UI reflects state

3. **Background Removal with Refine:**
   - Run RemoveBg → pending state created
   - Apply strokes with refine brush → mask updated
   - Commit → history pushed

**E2E Test Candidates (Browser-based):**

1. Load image via file upload or paste
2. Apply transformations (flip, rotate, crop)
3. Adjust brightness/contrast/saturation
4. Remove background with threshold adjustment
5. Export as PNG/JPEG

## Validation Mechanisms in Place

**Compile-time Validation:**
- TypeScript strict mode catches type errors
- No implicit any
- All functions must have return type annotations

**Runtime Assertions:**
- Defensive null checks throughout
- Error throws with descriptive messages
- State validation before operations

**Browser DevTools:**
- Canvas operations visible in browser (no rendering errors)
- Console logs errors from failed operations
- Network tab shows model download progress

## Where Tests Would Be Placed

**Recommended structure if testing framework were added:**

```
src/
├── editor/
│   ├── History.ts
│   ├── History.test.ts          # Unit tests for undo/redo/eviction
│   ├── Canvas.ts
│   ├── Canvas.test.ts           # Unit tests for preview scaling
│   └── ImageEditor.ts
│       └── ImageEditor.test.ts  # Integration tests
├── operations/
│   ├── Operation.ts
│   ├── FlipOperation.ts
│   ├── FlipOperation.test.ts
│   ├── CropOperation.ts
│   ├── CropOperation.test.ts
│   └── ...
├── ui/
│   ├── Toolbar.ts
│   └── Toolbar.test.ts          # UI mocking required
└── types.ts
```

**Test file naming convention:** Same directory as source, `.test.ts` suffix

## Current Validation Flow

**Development:**
1. `npm run dev` — Vite dev server with HMR
2. TypeScript compilation errors prevent build
3. Manual browser testing of features

**Production:**
1. `npm run build` — TypeScript compilation then Vite build
2. Build fails if TypeScript errors
3. Output to `dist/` directory

**Command Reference:**
```bash
npm run dev       # Development server with hot reload
npm run build     # TypeScript check + Vite bundle
npm run preview   # Preview production build locally
```

---

*Testing analysis: 2026-02-24*

**Note:** This codebase currently lacks automated tests. For a photo editor with image manipulation features, formal tests (particularly unit tests for operations and integration tests for workflows) would significantly improve reliability and enable safe refactoring.
