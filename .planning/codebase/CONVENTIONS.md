# Coding Conventions

**Analysis Date:** 2026-02-24

## Naming Patterns

**Files:**
- PascalCase for class-based files: `ImageEditor.ts`, `FlipOperation.ts`, `CategoryTabs.ts`
- Descriptive names with clear responsibility: `RemoveBgOperation.ts`, `MaskBrush.ts`
- One main export per file (class or set of related functions)

**Functions:**
- camelCase for all functions: `setPendingAdjustments()`, `applyMaskPreview()`, `buildFilter()`
- Verb-based names describing action: `apply()`, `getDescription()`, `setupEventListeners()`, `updateState()`
- Private methods prefixed with underscore: `_apply()` not used; instead use `private` keyword
- `get`/`set` prefixes for accessors: `getImage()`, `setImage()`, `getPreviewCanvas()`
- Boolean getters use `has`/`can` prefix: `hasImage()`, `canUndo()`, `hasPendingAdjustments()`

**Variables:**
- camelCase for all variables: `currentImage`, `pendingRemoveBg`, `brushRadius`
- Descriptive names for clarity: `originalBeforeRemoval` not `orig`, `currentIndex` not `idx`
- Private fields use `private` keyword: `private pendingAdjustments: AdjustmentValues | null = null;`
- Readonly constants in UPPER_SNAKE_CASE when static: `private maxEntries = 50;` (within class), `const DEFAULT_ADJUSTMENTS` (module-level)
- Type abbreviations in comment form for clarity when needed: `// full-resolution center x` in `MaskStroke`

**Types:**
- PascalCase for interfaces and types: `Operation`, `EditorState`, `HistoryEntry`, `CropRegion`
- Descriptive suffixes: `Operation`, `Values`, `Data`, `Cache`, `Stroke`
- Union types use lowercase: `type MergePosition = 'left' | 'right' | 'top' | 'bottom';`
- Generic descriptors in interfaces: `interface Box { x: number; y: number; width: number; height: number; }`

## Code Style

**Formatting:**
- TypeScript strict mode enabled (`"strict": true` in tsconfig.json)
- Target ES2020 with ESNext modules
- 2-space indentation (inferred from codebase)
- No semicolons required but present throughout

**Linting:**
- No `.eslintrc` or `.prettierrc` at root — TypeScript compiler is the primary enforcer
- Strict TypeScript checks in place:
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `noFallthroughCasesInSwitch: true`
  - `skipLibCheck: true` (for dependencies)

**Notable checks in use:**
- `allowImportingTsExtensions: true` — allows direct .ts imports
- `resolveJsonModule: true` — JSON can be imported directly

## Import Organization

**Order:**
1. Internal modules from parent directories: `import { ImageEditor } from '../editor/ImageEditor';`
2. Operations from `../operations/`: `import { FlipOperation } from '../operations/FlipOperation';`
3. UI modules from same layer: `import { Toolbar } from './ui/Toolbar';`
4. Type imports from `../types`: `import { Operation, CropRegion } from '../types';`
5. External libraries: `import { pipeline, RawImage } from '@huggingface/transformers';`

**Path Aliases:**
- None configured; relative paths used throughout
- Consistent relative path structure: `../` for parent layer, `./` for same layer

**Example from `src/editor/ImageEditor.ts`:**
```typescript
import { Canvas } from './Canvas';
import { History } from './History';
import { Operation, CropRegion, MergePosition, AdjustmentValues, ShapeData } from '../types';
import { FlipOperation } from '../operations/FlipOperation';
// ... more operations
import { RemoveBgOperation, MaskCache } from '../operations/RemoveBgOperation';
```

## Error Handling

**Patterns:**
- Null checks before use: `if (!ctx) throw new Error('Could not get context');`
- Optional chaining with `?.` operator: `document.getElementById('...')?.addEventListener()`
- Nullish coalescing for defaults: Used sparingly
- Try-catch for async operations with finally for cleanup:
  ```typescript
  try {
    const result = await segmenter(url);
    // process result
  } finally {
    URL.revokeObjectURL(url);
  }
  ```
- Canvas context checks explicit: Every operation that gets a 2D/OffscreenCanvasRenderingContext2D checks for null

**Error throwing:**
- Direct Error throw with message: `throw new Error('Could not get context');`
- No custom error classes used
- Message is descriptive of what failed

**Graceful degradation:**
- UI elements checked with `?.` before event listener attachment
- Disabled states used for buttons when operations are invalid
- Early returns on null checks: `if (!currentImage) return;`

**Example from `src/operations/FlipOperation.ts`:**
```typescript
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Could not get context');
```

## Logging

**Framework:** `console` object only

**Patterns:**
- `console.error()` for error reporting: `console.error('Background removal failed:', err);`
- Status messages passed via callback: `onProgress()` function parameter (see `RemoveBgOperation`)
- UI status elements (`textContent`) for user-facing messages
- Progress tracking via callbacks: `(status: string) => void` pattern

**Example from `src/ui/Toolbar.ts`:**
```typescript
await this.editor.runRemoveBg(threshold, (msg) => { status.textContent = msg; });
```

## Comments

**When to Comment:**
- Complex algorithms: Detailed explanation of logic at the start of function
- Non-obvious state management: "Keeps the original image (before background removal) so the refine brush can copy pixels from it when restoring"
- Important side effects: "Clear pending BEFORE awaiting so re-entrant calls from applyOperation don't recurse."
- Constraints and caveats: "needed because Canvas 2D premultiplies alpha and erased pixels lose their RGB values"
- References to related functionality: Explains relationships between pending states

**Comment style:**
- `// Single line comments` for most inline explanations
- Multi-line for complex explanations (see `src/editor/ImageEditor.ts` lines 33-36)
- No JSDoc/TSDoc in current codebase
- Explanatory comments appear above or inline with the relevant code

**Example from `src/editor/ImageEditor.ts`:**
```typescript
// Keeps the original image (before background removal) so the refine brush
// can copy pixels from it when restoring — needed because Canvas 2D
// premultiplies alpha and erased pixels lose their RGB values.
private originalBeforeRemoval: ImageBitmap | null = null;
```

## Function Design

**Size:**
- Functions typically 5-30 lines
- Longer functions (50+ lines) seen only in UI setup: `setupEventListeners()` methods
- Split into private helper methods for readability

**Parameters:**
- Explicit parameter types required
- Parameters organized: basic values first, then objects/interfaces, callbacks last
- Callbacks as final parameter: `constructor(editor: ImageEditor, private onActivate: () => void = () => {})`
- Optional parameters have defaults: `onProgress: (status: string) => void = () => {}`

**Return Values:**
- Explicit return types: `: Promise<ImageBitmap>`, `: void`, `: boolean`
- Async operations return `Promise<T>`
- Void when no return: UI update methods (`updateState(): void`)
- Nullable returns documented: `: HistoryEntry | null`
- Static helper methods return new instances or computed values

**Example function from `src/editor/History.ts`:**
```typescript
undo(): HistoryEntry | null {
  if (!this.canUndo()) return null;
  this.currentIndex--;
  return this.entries[this.currentIndex];
}
```

## Module Design

**Exports:**
- Single main class export per file
- Related types/interfaces exported from same file: `export interface MaskCache` and `export class RemoveBgOperation`
- No barrel files; direct imports required

**Class structure:**
- Constructor as first method
- Private helper methods after public API
- Getter/setter pattern for state access
- Event setup in `setupEventListeners()` or `setupControls()` method

**Example from `src/operations/AdjustOperation.ts`:**
```typescript
export class AdjustOperation extends BaseOperation {
  constructor(private adjustments: AdjustmentValues) { }
  async apply(...) { }
  getDescription(): string { }
  static buildFilter(adjustments: AdjustmentValues): string { }
}
```

**Patterns observed:**
- Dependency injection via constructor: `constructor(editor: ImageEditor)`
- No singletons; instances passed as dependencies
- Static methods for reusable utilities: `AdjustOperation.buildFilter()`, `RemoveBgOperation.clearCache()`
- Stateful UI classes: Each category (Toolbar, Sliders, etc.) maintains local state

---

*Convention analysis: 2026-02-24*
