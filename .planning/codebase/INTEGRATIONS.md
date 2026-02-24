# External Integrations

**Analysis Date:** 2026-02-24

## APIs & External Services

**Hugging Face Model Hub:**
- Transformers.js SDK - ML inference for image processing
  - SDK/Client: `@huggingface/transformers` 3.8.1
  - Auth: None required - Models downloaded via HTTP
  - Model used: `briaai/RMBG-1.4` (semantic image segmentation for background removal)
  - Download location: Browser cache (downloaded on first use)
  - Used in: `src/operations/RemoveBgOperation.ts`

## Data Storage

**Databases:**
- None - Application is client-side only

**File Storage:**
- Local filesystem only (download via browser's download mechanism)
- Image upload: From user device via `<input type="file">` elements
  - `src/main.ts` - Canvas element receives images via file input
  - `index.html` - File input elements with `accept="image/*"`

**Caching:**
- In-memory caching via browser JavaScript:
  - Segmentation model cached in static property `RemoveBgOperation.segmenter`
  - Background removal mask cached in `RemoveBgOperation.maskCache` (keyed by image dimensions)
  - Canvas state cached via `History` class in `src/editor/History.ts`
  - No persistent cache (localStorage/IndexedDB not used)

**Image Processing:**
- Browser Canvas API (2D rendering context)
- Browser OffscreenCanvas API (off-main-thread rendering)
- ImageBitmap objects for memory-efficient image handling

## Authentication & Identity

**Auth Provider:**
- None - Application requires no authentication
- All operations client-side only

## Monitoring & Observability

**Error Tracking:**
- None configured

**Logs:**
- Progress callbacks for long-running operations
  - Example: `onProgress('Downloading model... ${Math.round(data.progress)}%')`
  - Used in: `src/operations/RemoveBgOperation.ts` line 37-42
  - No persistent logging

## CI/CD & Deployment

**Hosting:**
- Static file hosting required (no server runtime needed)
- CORS headers not required (same-origin only)
- Cross-Origin-Opener-Policy: same-origin
- Cross-Origin-Embedder-Policy: require-corp (required for SharedArrayBuffer)

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars:**
- None - Application requires no environment variables

**Secrets location:**
- Not applicable - No API keys or secrets needed

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## External Model Downloads

**Hugging Face ONNX Models:**
- Model: `briaai/RMBG-1.4`
  - Type: Semantic image segmentation (background removal)
  - Format: ONNX with WebAssembly execution
  - Download: Automatic on first `RemoveBgOperation.loadSegmenter()` call
  - Size: Approximately 100MB+ (downloaded and cached by browser)
  - Progress callback: User receives "Downloading model..." status messages
  - Reference: `src/operations/RemoveBgOperation.ts` lines 31-48

## Network Requirements

**Browser Access:**
- HTTPS required for Hugging Face model download (for production/CORS compliance)
- Localhost HTTP acceptable for development
- SharedArrayBuffer may require specific headers or HTTPS

**Performance Implications:**
- First model download blocks UI until completion (initial load ~100MB)
- Subsequent uses load from browser cache if available
- Model inference runs in browser (no network latency after download)

---

*Integration audit: 2026-02-24*
