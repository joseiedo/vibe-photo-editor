# Codebase Structure

**Analysis Date:** 2026-02-24

## Directory Layout

```
photo-editor/
├── src/
│   ├── main.ts                 # Application entry point, initializes editor and UI
│   ├── types.ts                # Shared type definitions and interfaces
│   ├── editor/                 # Editor core logic
│   │   ├── ImageEditor.ts      # Main orchestrator for image operations
│   │   ├── Canvas.ts           # Dual-resolution canvas management
│   │   └── History.ts          # Undo/redo stack with ImageBitmap lifecycle
│   ├── operations/             # Image transformations (command pattern)
│   │   ├── Operation.ts        # BaseOperation abstract class
│   │   ├── FlipOperation.ts
│   │   ├── RotateOperation.ts
│   │   ├── CropOperation.ts
│   │   ├── MergeOperation.ts
│   │   ├── AdjustOperation.ts  # Brightness/contrast/saturation
│   │   ├── ShapeOperation.ts   # Draw shapes on canvas
│   │   ├── UpscaleOperation.ts
│   │   ├── PosterizeOperation.ts
│   │   ├── RemoveBgOperation.ts  # Hugging Face background removal
│   │   └── RefineMaskOperation.ts  # Refine background mask with brush
│   └── ui/                     # User interaction controllers
│       ├── Toolbar.ts          # File upload, undo/redo, export, paste
│       ├── Sliders.ts          # Brightness/contrast/saturation controls
│       ├── CropSelector.ts     # Crop region selection UI
│       ├── MaskBrush.ts        # Refine background removal brush
│       ├── ShapeDrawer.ts      # Draw shapes on canvas
│       ├── MergeDialog.ts      # Merge images dialog
│       ├── Filters.ts          # Apply filters (posterize, etc.)
│       ├── CategoryTabs.ts     # Tab navigation between tool panels
│       └── KeyboardShortcuts.ts  # Keyboard event bindings
├── index.html                  # DOM structure, canvas element
├── package.json                # Dependencies: TypeScript, Vite, Hugging Face, Lucide
├── tsconfig.json               # TypeScript strict mode, ES2020 target
├── vite.config.ts              # Vite build configuration
└── .planning/codebase/         # GSD documentation
    └── ARCHITECTURE.md, STRUCTURE.md, etc.
```

## Directory Purposes

**`src/`:**
- Purpose: TypeScript source code
- Contains: All application logic, types, components
- Key files: `main.ts` (entry), `types.ts` (types)

**`src/editor/`:**
- Purpose: Core image editing engine
- Contains: State management (ImageEditor), rendering (Canvas), history (History)
- Key files:
  - `ImageEditor.ts`: 312 lines - Main facade orchestrating operations, state changes, preview management
  - `Canvas.ts`: 112 lines - Manages dual-resolution rendering (preview HTMLCanvas + full-res OffscreenCanvas)
  - `History.ts`: 56 lines - Undo/redo stack with resource cleanup

**`src/operations/`:**
- Purpose: Discrete, reusable image transformations
- Contains: 12 operation implementations following command pattern
- Key files:
  - `Operation.ts`: 10 lines - Abstract BaseOperation with async apply() interface
  - `FlipOperation.ts`, `RotateOperation.ts`, `CropOperation.ts`: Basic transforms
  - `AdjustOperation.ts`: Brightness/contrast/saturation via CSS filters
  - `RemoveBgOperation.ts`: 150+ lines - Hugging Face segmentation model integration, mask caching
  - `RefineMaskOperation.ts`: Stroke-based mask refinement
  - Others: Merge, Shape, Upscale, Posterize

**`src/ui/`:**
- Purpose: User interaction controllers, DOM event handling
- Contains: 11 controller classes, each owns DOM references and listeners
- Key files:
  - `Toolbar.ts`: 100 lines - Upload, undo/redo, download, paste, background removal
  - `Sliders.ts`: 60+ lines - Brightness/contrast/saturation sliders with live preview
  - `MaskBrush.ts`: 80+ lines - Refine brush with restore/erase modes
  - `CropSelector.ts`, `ShapeDrawer.ts`: Interactive canvas tools
  - `CategoryTabs.ts`: Tab switching, tool deactivation orchestration
  - `Filters.ts`, `MergeDialog.ts`, `KeyboardShortcuts.ts`: Specialized controls

**Project Root:**
- `index.html`: Single HTML file with canvas element `#preview-canvas`, control panels, scripts
- `package.json`: Defines dev scripts (dev, build, preview)
- `tsconfig.json`: TypeScript strict mode, ES2020 target, DOM lib
- `vite.config.ts`: Vite build bundler configuration

## Key File Locations

**Entry Points:**
- `src/main.ts`: Initializes editor, UI controllers, sets up event listeners
- `index.html`: HTML entry point with DOM structure

**Configuration:**
- `tsconfig.json`: TypeScript configuration (strict mode, ES2020)
- `vite.config.ts`: Build configuration
- `package.json`: Dependencies and scripts

**Core Logic:**
- `src/editor/ImageEditor.ts`: Main orchestrator (312 lines)
- `src/editor/Canvas.ts`: Dual-resolution rendering (112 lines)
- `src/types.ts`: Shared types (Operation interface, EditorState, CropRegion, etc.)

**Operations:**
- `src/operations/Operation.ts`: Abstract base class
- `src/operations/RemoveBgOperation.ts`: Most complex operation (150+ lines, Hugging Face integration)

**Testing:**
- No test files present in codebase
- No testing framework configured

## Naming Conventions

**Files:**
- `*Operation.ts`: Image transformation classes (e.g., `FlipOperation.ts`, `CropOperation.ts`)
- `*Dialog.ts`: Modal/dialog UI components (e.g., `MergeDialog.ts`)
- `*.ts`: All source files are TypeScript

**Directories:**
- `src/editor/`: Core state and rendering
- `src/operations/`: Image transformations
- `src/ui/`: User controls

**Classes:**
- PascalCase: `ImageEditor`, `Canvas`, `FlipOperation`, `Toolbar`, `Sliders`

**Interfaces:**
- PascalCase: `Operation`, `EditorState`, `HistoryEntry`, `CropRegion`, `ShapeData`

**Methods and Functions:**
- camelCase: `loadImage()`, `applyOperation()`, `updatePreview()`, `setupEventListeners()`

**Properties:**
- camelCase: `currentImage`, `previewCanvas`, `onStateChange`, `pendingAdjustments`

**Type Names:**
- PascalCase: `MergePosition`, `ShapeType`, `AdjustmentValues`, `MaskStroke`

## Where to Add New Code

**New Image Operation:**
1. Create `src/operations/NewNameOperation.ts`
2. Extend `BaseOperation` from `src/operations/Operation.ts`
3. Implement `async apply()` and `getDescription()` methods
4. Add corresponding method to `ImageEditor` (e.g., `async newName()`) that calls `this.applyOperation()`
5. Wire UI control in appropriate UI class or new class in `src/ui/`

**New Filter/Effect:**
- Add to `src/operations/` as new Operation subclass
- Reference in `src/ui/Filters.ts` or create specialized panel class

**New UI Control/Panel:**
1. Create class in `src/ui/ControlName.ts`
2. Follow pattern: accept `ImageEditor` in constructor
3. Implement `setupEventListeners()` to grab DOM refs and bind handlers
4. Implement `updateState()` for state synchronization
5. Instantiate in `src/main.ts` after ImageEditor creation
6. Add corresponding DOM in `index.html`

**New Interactive Tool (like crop/draw):**
1. Create class in `src/ui/ToolName.ts` with `activate()`, `deactivate()`, `toggle()` methods
2. Register deactivation callback in `CategoryTabs` constructor
3. Add DOM controls for the tool in `index.html`
4. Follow MaskBrush/CropSelector pattern for mouse tracking

**Shared Utilities:**
- Add to `src/` directly (no utils/ directory currently)
- Or extend `src/types.ts` for type definitions

**New Type Definitions:**
- Add to `src/types.ts` alongside existing interfaces

## Special Directories

**`src/operations/`:**
- Purpose: Isolated operation implementations
- Generated: No
- Committed: Yes
- Pattern: Each file is one Operation subclass, no dependencies between operations except through BaseOperation

**`src/ui/`:**
- Purpose: UI control classes with DOM interaction
- Generated: No
- Committed: Yes
- Pattern: Each file is one controller class, all depend on ImageEditor, no inter-UI dependencies except through CategoryTabs

**`.planning/codebase/`:**
- Purpose: GSD documentation and planning artifacts
- Generated: Yes (by GSD commands)
- Committed: Yes (version controlled)

## Import Patterns

**Absolute imports from root (no relative paths):**
- `import { ImageEditor } from '../editor/ImageEditor'` ← Use relative paths within src/
- All imports are relative within src/

**Module structure:**
- Each class is exported as named export: `export class ClassName`
- Types exported from `src/types.ts` and re-imported as needed

---

*Structure analysis: 2026-02-24*
