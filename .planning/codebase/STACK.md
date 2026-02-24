# Technology Stack

**Analysis Date:** 2026-02-24

## Languages

**Primary:**
- TypeScript 5.3.0 - Used for all source code in `src/` directory
- HTML5 - Page structure in `index.html`
- CSS3 - Styling in `src/styles.css`

**Secondary:**
- JavaScript (ES2020 target) - Runtime execution via Vite

## Runtime

**Environment:**
- Node.js (version unspecified, supports ES2020 modules)
- Browser environment (modern browsers with ES2020, Canvas API, OffscreenCanvas, ImageBitmap support)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Vite 5.0.0 - Development server and build tool

**Build/Dev:**
- TypeScript 5.3.0 - Language and type checking
- No testing framework installed

## Key Dependencies

**Critical:**
- `@huggingface/transformers` 3.8.1 - ML model pipeline for background removal and image segmentation
  - Provides `pipeline()` function for loading ONNX/WebAssembly models
  - Uses `briaai/RMBG-1.4` model for semantic segmentation
  - Excludes from Vite optimization due to WebAssembly dependencies
- `lucide` 0.575.0 - Icon library
  - Provides `createElement`, `Square`, `Circle` icon components for shape drawing UI

**Infrastructure:**
- None - No database, cache, or external service clients configured

## Configuration

**Environment:**
- No `.env` files present - No runtime environment variables required
- Configuration is embedded in source code and `vite.config.ts`

**Build:**
- `vite.config.ts` - Vite build configuration
  - Output directory: `dist/`
  - Base path: `/`
  - Sets COOP/COEP headers required for `@huggingface/transformers` WebAssembly
  - Excludes `@huggingface/transformers` from Vite's dependency optimization

**TypeScript:**
- `tsconfig.json` configuration:
  - Target: ES2020
  - Module: ESNext (with import syntax)
  - Libraries: ES2020, DOM, DOM.Iterable
  - Module resolution: bundler
  - Strict mode: enabled
  - Unused variable/parameter detection enabled
  - Fallthrough cases in switch: forbidden

## Platform Requirements

**Development:**
- Node.js with npm
- Modern text editor or IDE with TypeScript support
- Command: `npm install` to install dependencies
- Command: `npm run dev` to start development server
- Command: `npm run build` to create production build

**Production:**
- Modern web browser with:
  - ES2020 JavaScript support
  - Canvas API support
  - OffscreenCanvas support
  - ImageBitmap support
  - WebAssembly support (for @huggingface/transformers)
  - SharedArrayBuffer or equivalent (for multi-threaded ONNX inference)
  - Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy support

**Build Process:**
- TypeScript compilation to JavaScript (via `tsc` CLI)
- Vite bundling and minification
- Output: Static files in `dist/` directory

---

*Stack analysis: 2026-02-24*
