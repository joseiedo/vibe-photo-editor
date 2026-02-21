                                                               RFC-ARCH-001
                                                          February 2026
                                                          Status: Informational


                    Architecture of the Photo Editor Application


Abstract

   This document describes the architecture of the Photo Editor web
   application: a client-side, stateless image editing tool built on
   TypeScript and the HTML5 Canvas API. It covers the layered structure,
   the roles of each module, the data flow between components, and the
   rationale behind key design decisions.

   This document is intended for contributors and maintainers who need
   to understand how the system is organized before modifying or
   extending it.


Status of This Memo

   This document describes the architecture as it exists at the time of
   writing. It is not a specification. It reflects decisions that have
   already been made and explains the reasoning behind them.

   As the project evolves, this document SHOULD be updated to reflect
   changes in structure, patterns, or rationale.


Table of Contents

   1.  Introduction
   2.  Guiding Principles
   3.  System Overview
   4.  Technology Stack
   5.  Layered Architecture
       5.1.  UI Layer
       5.2.  Editor Layer
       5.3.  Operations Layer
   6.  Key Components
       6.1.  ImageEditor
       6.2.  Canvas
       6.3.  History
       6.4.  Operations
       6.5.  UI Components
   7.  Data Flow
       7.1.  Standard Operation Flow
       7.2.  Live Preview Flow (Pending Adjustments)
   8.  Design Decisions
   9.  Internal Type System
   10. Constraints and Known Limitations
   11. Extension Points


------------------------------------------------------------------------

1.  Introduction

   The Photo Editor is a browser-based image editing application. It
   requires no server, no authentication, and no persistent storage.
   All editing occurs in memory. The user downloads their result before
   closing the tab.

   The application supports:

   - Geometric transforms: flip, rotate, crop, upscale
   - Photometric adjustments: brightness, contrast, saturation
   - Compositing: merging a second image at a chosen position
   - Drawing: rectangles and circles with configurable fill and stroke
   - History: undo and redo across all operations
   - Export: PNG or JPEG at full resolution

   The design philosophy is that the application must feel immediate.
   Preview feedback must be instant. Full-resolution operations must
   never block the UI. These two requirements drive most of the
   architectural decisions described in this document.


2.  Guiding Principles

   The following principles shaped the architecture:

   SEPARATION OF CONCERNS
      UI components own their DOM and event wiring. The editor layer
      owns state and coordinates operations. Operations are pure
      transformations with no awareness of UI or state.

   IMMUTABILITY OF IMAGE DATA
      No operation mutates an existing ImageBitmap. Every operation
      produces a new ImageBitmap. The previous bitmap is replaced in
      history, enabling clean undo/redo without defensive copying.

   DECOUPLED RESOLUTION
      The preview shown to the user and the image held in memory are
      maintained separately. The preview is scaled to the viewport.
      The stored image is always at original resolution. This separation
      makes the UI responsive regardless of image size.

   STATELESS OPERATIONS
      Each operation class is instantiated with its parameters and
      applied once. Operations do not hold mutable state between calls.
      This makes them easy to reason about, test, and extend.

   NO PREMATURE ABSTRACTION
      The codebase avoids shared utilities, registries, or plugin
      systems that are not needed now. New operations are added by
      creating a new class and calling it directly.


3.  System Overview

   The application is a single-page application (SPA). There is no
   backend. There is no network communication after the initial page
   load.

   High-level system topology:

   ┌────────────────────────────────────────────────────────────┐
   │                        Browser                             │
   │                                                            │
   │  ┌──────────────────────────────────────────────────────┐  │
   │  │                    index.html                        │  │
   │  │  ┌─────────────────────────────────────────────────┐ │  │
   │  │  │                  main.ts                        │ │  │
   │  │  │  instantiates all UI components and ImageEditor │ │  │
   │  │  └──────────────┬──────────────────────────────────┘ │  │
   │  │                 │                                     │  │
   │  │     ┌───────────▼───────────┐                        │  │
   │  │     │     UI Layer          │  event handlers         │  │
   │  │     │   (src/ui/)           │  ─────────────────►    │  │
   │  │     └───────────────────────┘                        │  │
   │  │                                ┌─────────────────┐   │  │
   │  │                                │  Editor Layer   │   │  │
   │  │                                │ (src/editor/)   │   │  │
   │  │                                └────────┬────────┘   │  │
   │  │                                         │            │  │
   │  │                                ┌────────▼────────┐   │  │
   │  │                                │ Operations Layer│   │  │
   │  │                                │(src/operations/)│   │  │
   │  │                                └─────────────────┘   │  │
   │  └──────────────────────────────────────────────────────┘  │
   └────────────────────────────────────────────────────────────┘

   All computation happens within the browser process. Image data never
   leaves the user's machine.


4.  Technology Stack

   Language:    TypeScript 5.3 (strict mode)
   Build Tool:  Vite 5.0
   Target:      ES2020 / modern browsers
   Canvas API:  HTMLCanvasElement (preview) + OffscreenCanvas (editing)
   Icons:       Lucide (runtime dependency, icon rendering only)
   Styling:     Plain CSS with custom properties (dark theme by default)
   Backend:     None

   TypeScript strict mode is enabled throughout. This catches type
   errors at compile time and enforces explicit handling of nullability
   and undefined values.

   Vite is used exclusively as a build tool and development server. It
   has no architectural impact on the runtime code.


5.  Layered Architecture

   The codebase is organized into three layers. Each layer has a single
   direction of dependency: UI depends on Editor; Editor depends on
   Operations. Operations depend on nothing.

   ┌─────────────────────────────────────────────────────────────┐
   │  UI Layer          src/ui/                                  │
   │  Manages DOM elements, user input, and display state        │
   └────────────────────────┬────────────────────────────────────┘
                            │  calls methods on
   ┌────────────────────────▼────────────────────────────────────┐
   │  Editor Layer      src/editor/                              │
   │  Orchestrates operations, history, and canvas rendering     │
   └────────────────────────┬────────────────────────────────────┘
                            │  instantiates and applies
   ┌────────────────────────▼────────────────────────────────────┐
   │  Operations Layer  src/operations/                          │
   │  Pure image transformations, return new ImageBitmap         │
   └─────────────────────────────────────────────────────────────┘

5.1.  UI Layer

   Files: src/ui/

   Each UI component is a class that:

   - Receives a reference to ImageEditor at construction time
   - Queries the DOM for its elements by ID
   - Attaches its own event listeners
   - Calls ImageEditor methods in response to user actions
   - Listens to the onStateChange callback to update disabled states

   Components do not communicate with each other directly. Coordination
   happens through the shared ImageEditor instance and through
   CategoryTabs, which manages which panel is currently active.

   Components:

   Toolbar           Upload, Undo/Redo, Download, Upscale controls,
                     Flip and Rotate buttons.

   Sliders           Brightness, Contrast, Saturation sliders.
                     Drives live preview via setPendingAdjustments.

   CategoryTabs      Tab switcher for Transform, Crop, Draw, Merge,
                     Adjust panels. Calls deactivation callbacks when
                     switching away from interactive tools.

   CropSelector      Drag-and-resize overlay on the preview canvas.
                     Converts preview-space coordinates into full-
                     resolution crop regions.

   ShapeDrawer       Drag-to-draw shapes on the preview canvas.
                     Scales drawn coordinates to full resolution
                     before applying.

   MergeDialog       Dialog for choosing a second image file and a
                     merge position (left, right, top, bottom).

   KeyboardShortcuts Global keyboard handler. Maps keys to ImageEditor
                     methods and UI actions without coupling to
                     individual components.

5.2.  Editor Layer

   Files: src/editor/

   The editor layer contains three classes.

   ImageEditor       The central orchestrator. Exposes all editing
                     operations as async methods. Holds references to
                     Canvas and History. Manages the pending-
                     adjustments concept.

   Canvas            Manages the dual-canvas system (described in
                     Section 8). Provides methods to load an image,
                     update the preview, and export at full resolution.

   History           Maintains a capped stack of ImageBitmap snapshots.
                     Supports push, undo, and redo.

5.3.  Operations Layer

   Files: src/operations/

   Each operation is a class that implements the Operation interface:

      interface Operation {
        apply(
          ctx: OffscreenCanvasRenderingContext2D,
          image: ImageBitmap
        ): Promise<ImageBitmap>;
        getDescription(): string;
      }

   Operations are the only place pixel manipulation occurs. They receive
   an OffscreenCanvas context and the current image, and they return a
   new ImageBitmap. They do not read or modify any other state.

   Available operations:

   FlipOperation      Mirror horizontally or vertically using canvas
                      translate + scale(-1, 1) / scale(1, -1).

   RotateOperation    Rotate by a multiple of 90 degrees, recalculating
                      canvas dimensions when width and height swap.

   CropOperation      Draw a subregion of the image onto a smaller
                      canvas. Input coordinates are clamped to image
                      bounds.

   MergeOperation     Draw two images side-by-side or stacked.
                      Scales the second image to match the dimension
                      along the merge axis.

   AdjustOperation    Apply brightness, contrast, and saturation using
                      CSS filter strings on a canvas context.

   ShapeOperation     Draw a rectangle or circle onto the image canvas.
                      Also exposes a static draw() method used for
                      live preview without committing to history.

   UpscaleOperation   Render the image onto a larger canvas with
                      imageSmoothingQuality set to 'high'.


6.  Key Components

6.1.  ImageEditor

   ImageEditor is the facade between the UI layer and the rest of the
   system. The UI never interacts with Canvas, History, or any
   Operation class directly.

   State held by ImageEditor:

   - Whether an image has been loaded
   - The current pending adjustment values (brightness, contrast,
     saturation) that have been previewed but not committed
   - A reference to the Canvas and History instances

   Responsibility delegation:

   - Applying an operation: delegates to Canvas and then History.push()
   - Undoing/redoing: delegates to History, then Canvas.setImage()
   - Live preview: delegates to Canvas.updatePreview()
   - Exporting: delegates to Canvas

   ImageEditor also flushes pending adjustments automatically before
   any non-adjustment operation. This ensures the committed history
   state always reflects what the user saw.

6.2.  Canvas

   Canvas manages two separate rendering surfaces:

   Preview Canvas (HTMLCanvasElement)
      This is the visible canvas element in the DOM. It is always
      scaled to fit the viewport with padding. The user interacts
      with this canvas for crop and shape tools. CSS filters are
      applied here for instant adjustment preview.

   Full-Resolution Canvas (OffscreenCanvas)
      This is never shown directly. It holds the image at its
      original pixel dimensions. All operations execute here. Export
      reads from here.

   The separation ensures that resizing the browser window or updating
   the adjustment sliders never triggers a full pixel-level re-render.
   The preview is a scaled copy; the full-resolution image is the
   source of truth.

6.3.  History

   History maintains a linear array of { image: ImageBitmap,
   description: string } entries. The maximum length is 50 entries.

   Behavior:

   - push(entry): appends to the array, discarding any entries after
     the current pointer (branching is not supported).
   - undo(): moves the pointer back one step and returns the image.
   - redo(): moves the pointer forward one step and returns the image.
   - canUndo() / canRedo(): checks for available steps.

   When the limit of 50 is reached, the oldest entry is removed before
   pushing the new one. This bounds memory usage.

6.4.  Operations

   BaseOperation is an abstract class providing shared canvas setup
   logic. All concrete operations extend it.

   Operations are constructed with their parameters and applied once.
   They are not reused. This makes each operation a self-contained
   record of what was done and with what values.

   The getDescription() method returns a short human-readable string
   used in history (e.g., "Flip Horizontal", "Crop", "Rotate 90°").

6.5.  UI Components

   Each component follows the same initialization pattern:

      constructor(editor: ImageEditor) {
        this.editor = editor;
        this.bindElements();   // query DOM by ID
        this.bindEvents();     // attach listeners
        editor.onStateChange = () => this.updateState();
      }

   The onStateChange callback is the only mechanism by which the editor
   signals the UI. It carries no payload; the UI queries the editor for
   current state (e.g., canUndo, canRedo, hasImage) and updates DOM
   accordingly.


7.  Data Flow

7.1.  Standard Operation Flow

   This describes what happens when the user clicks a button that
   commits an operation (e.g., Flip Horizontal).

   1. User clicks button in Toolbar.
   2. Toolbar calls editor.flipHorizontal().
   3. ImageEditor flushes any pending adjustments first.
   4. ImageEditor constructs new FlipOperation('horizontal').
   5. ImageEditor retrieves current ImageBitmap from Canvas.
   6. FlipOperation.apply() renders the flipped image onto an
      OffscreenCanvas and returns a new ImageBitmap.
   7. Canvas.setImage() stores the new ImageBitmap and redraws the
      preview canvas.
   8. History.push() stores the new ImageBitmap with description
      "Flip Horizontal".
   9. editor.onStateChange() is invoked.
   10. All UI components update their disabled states.

7.2.  Live Preview Flow (Pending Adjustments)

   This describes what happens when the user moves a slider.

   1. User moves the Brightness slider.
   2. Sliders calls editor.setPendingAdjustments({ brightness: 120,
      contrast: 100, saturation: 100 }).
   3. ImageEditor stores the pending values.
   4. Canvas.updatePreview() applies a CSS filter string to the preview
      canvas element (e.g., "brightness(1.2) contrast(1) saturate(1)").
   5. The browser applies the filter via GPU compositing. No pixel
      data is read or written.
   6. The OffscreenCanvas is unchanged.

   When the user subsequently applies any other operation:

   1. ImageEditor.flushAdjustments() is called first.
   2. If pending values differ from defaults, an AdjustOperation is
      applied and committed to history.
   3. The CSS filter on the preview canvas is cleared.
   4. The new operation then applies on top of the adjusted image.

   This design ensures:
   - Slider feedback is instant (no pixel computation).
   - Adjustment state is committed to history only when needed.
   - The user can move sliders freely without polluting history.


8.  Design Decisions

8.1.  Dual Canvas System

   Problem: Image editing requires full-resolution precision. UI
   requires responsiveness. A 12MP image processed synchronously on
   every slider move would freeze the browser.

   Decision: Maintain two separate canvases. The preview canvas is
   a scaled copy. The OffscreenCanvas holds the original. CSS filters
   are applied to the preview for adjustment preview; pixel operations
   happen only on OffscreenCanvas when committed.

   Consequence: The user always sees a scaled preview, which means the
   viewport size does not affect output quality.

8.2.  Strategy Pattern for Operations

   Problem: The set of supported image operations grows over time.
   Adding a new operation should not require modifying existing code.

   Decision: Define an Operation interface. Each operation is a
   separate class. ImageEditor applies operations through the interface.

   Consequence: Adding a new operation means creating one new file and
   one new call site in ImageEditor. No other files change.

8.3.  CSS Filters for Adjustment Preview

   Problem: Computing brightness/contrast/saturation on pixel data for
   every slider tick is too slow for real-time feedback.

   Decision: Apply CSS filter strings to the preview canvas element.
   The browser hardware-accelerates this via the GPU compositor. No
   JavaScript pixel loop is involved.

   Consequence: Adjustment preview is instantaneous regardless of
   image size. The tradeoff is that the committed result must use a
   canvas filter pass rather than per-pixel arithmetic, which may
   differ slightly from browser-native CSS rendering in edge cases.

8.4.  No Backend

   Decision: The application is entirely client-side. No server is
   involved at any point.

   Rationale: Image editing does not require persistence, sharing, or
   server-side computation for the feature set implemented. A backend
   would add infrastructure cost, latency, and data handling obligations
   with no benefit to the user.

   Consequence: Users must download their result before closing the tab.
   This is documented behavior, not a bug.

8.5.  Linear History

   Decision: History is a flat array with a pointer. Branching is not
   supported. Performing a new operation after an undo discards the
   redo stack.

   Rationale: Branching history is significantly more complex to
   implement and explain to users. Linear history is universally
   understood. The 50-entry limit bounds memory usage.

8.6.  Immutable ImageBitmap per Operation

   Decision: Each operation creates a new ImageBitmap. The input
   ImageBitmap is never modified.

   Rationale: ImageBitmap is a transferable object. Sharing mutable
   references between history entries and the active canvas state would
   create bugs that are difficult to trace. Immutability makes the
   history stack reliable.

8.7.  No Event Bus or Global State

   Decision: Components communicate only through the ImageEditor
   instance and the onStateChange callback. There is no shared event
   bus, observable store, or singleton beyond ImageEditor.

   Rationale: The application is small enough that shared state through
   a single well-defined object is sufficient. An event bus would
   obscure the flow of data without adding capability.


9.  Internal Type System

   The following TypeScript types define the internal contracts:

      interface Operation {
        apply(ctx: OffscreenCanvasRenderingContext2D,
              image: ImageBitmap): Promise<ImageBitmap>;
        getDescription(): string;
      }

      type CropRegion = {
        x: number; y: number; width: number; height: number;
      };

      type AdjustmentValues = {
        brightness: number;   // percentage: 100 = identity
        contrast: number;
        saturation: number;
      };

      type MergePosition = 'left' | 'right' | 'top' | 'bottom';

      type ShapeType = 'rect' | 'circle';

      type ShapeData = {
        type: ShapeType;
        x: number; y: number; width: number; height: number;
        color: string;
        lineWidth: number;
        filled: boolean;
      };

      type HistoryEntry = {
        image: ImageBitmap;
        description: string;
      };

   These types are defined in src/types.ts and imported where needed.
   They form the contracts between layers and between the operation
   classes themselves.


10.  Constraints and Known Limitations

   MEMORY USAGE
      Large images stored across 50 history entries can consume
      significant memory. ImageBitmap objects are not serializable and
      cannot be compressed. Users editing very large images may notice
      memory growth. Mitigation: the 50-entry cap limits the maximum
      retained size.

   NO UNDO ACROSS SESSIONS
      History is in-memory only. Reloading the page resets all state.
      This is a deliberate consequence of the no-backend decision.

   SINGLE ACTIVE ONSTATE CALLBACK
      The onStateChange property on ImageEditor is a single function
      reference, not a list of listeners. The current design assigns it
      once per session. Adding multiple listeners would require changing
      this to an array-based subscription.

   NO ACCESSIBILITY AUDIT
      Keyboard shortcuts exist but ARIA labels and roles have not been
      systematically applied. Screen reader support is limited.

   BROWSER COMPATIBILITY
      OffscreenCanvas is required. The application does not support
      browsers that lack this API. As of 2025, all major browsers
      support it.


11.  Extension Points

   To add a new image operation:

   1. Create a new file in src/operations/ extending BaseOperation.
   2. Implement apply() to produce a new ImageBitmap.
   3. Implement getDescription() to return a history label.
   4. Add a method to ImageEditor that instantiates the operation and
      calls applyOperation().
   5. Wire a UI element in the appropriate component.
   No other files require modification.

   To add a new UI panel or tool:

   1. Create a new class in src/ui/.
   2. Inject ImageEditor in the constructor.
   3. Query DOM elements and attach events.
   4. Register the panel in CategoryTabs if tab-based.
   5. Add any needed DOM to index.html.

   To change the history limit:

   Change the MAX_HISTORY constant in src/editor/History.ts.


------------------------------------------------------------------------

Authors

   Maintained by the project contributors.
   Last updated: February 2026.
