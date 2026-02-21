import { ImageEditor } from '../editor/ImageEditor';
import { MaskStroke } from '../operations/RefineMaskOperation';

export class MaskBrush {
  private editor: ImageEditor;
  private active = false;
  private drawing = false;
  private mode: 'restore' | 'erase' = 'erase';
  private brushRadius = 20; // preview-space pixels

  private strokes: MaskStroke[] = [];
  // Preview-resolution copy of the image before background removal.
  // Used by paintPoint() to restore original pixel colours without hitting
  // the premultiplied-alpha problem (erased pixels have RGB=0 in the canvas).
  private originalImageData: ImageData | null = null;

  private readonly onMouseDown: (e: MouseEvent) => void;
  private readonly onMouseMove: (e: MouseEvent) => void;
  private readonly onMouseUp: () => void;

  constructor(editor: ImageEditor) {
    this.editor = editor;
    this.onMouseDown = this.handleMouseDown.bind(this);
    this.onMouseMove = this.handleMouseMove.bind(this);
    this.onMouseUp = this.handleMouseUp.bind(this);
    this.setupControls();
  }

  private setupControls(): void {
    document.getElementById('refine-brush-btn')?.addEventListener('click', () => this.toggle());

    document.getElementById('brush-restore-btn')?.addEventListener('click', () => {
      this.mode = 'restore';
      this.updateModeButtons();
    });

    document.getElementById('brush-erase-btn')?.addEventListener('click', () => {
      this.mode = 'erase';
      this.updateModeButtons();
    });

    const sizeSlider = document.getElementById('brush-size') as HTMLInputElement;
    const sizeValue = document.getElementById('brush-size-value') as HTMLSpanElement;
    sizeSlider?.addEventListener('input', () => {
      this.brushRadius = parseInt(sizeSlider.value, 10);
      sizeValue.textContent = sizeSlider.value;
    });
  }

  toggle(): void {
    this.active ? this.deactivate() : this.activate();
  }

  activate(): void {
    if (this.active) return;
    this.active = true;

    // Capture a preview-scale copy of the original (pre-removal) image so we
    // can read correct RGB values when painting restore strokes.
    const original = this.editor.getOriginalBeforeRemoval();
    const canvas = this.editor.getPreviewCanvas();
    if (original) {
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = canvas.width;
      tmpCanvas.height = canvas.height;
      const tmpCtx = tmpCanvas.getContext('2d')!;
      tmpCtx.drawImage(original, 0, 0, canvas.width, canvas.height);
      this.originalImageData = tmpCtx.getImageData(0, 0, canvas.width, canvas.height);
    } else {
      this.originalImageData = null;
    }

    canvas.style.cursor = 'crosshair';
    canvas.addEventListener('mousedown', this.onMouseDown);
    document.getElementById('refine-brush-btn')?.classList.add('active');
    document.getElementById('brush-controls')?.classList.remove('hidden');
    this.updateModeButtons();
  }

  deactivate(): void {
    if (!this.active) return;
    this.active = false;
    this.drawing = false;
    this.strokes = [];
    this.originalImageData = null;
    this.editor.closeOriginalBeforeRemoval();
    const canvas = this.editor.getPreviewCanvas();
    canvas.style.cursor = '';
    canvas.removeEventListener('mousedown', this.onMouseDown);
    canvas.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    document.getElementById('refine-brush-btn')?.classList.remove('active');
    document.getElementById('brush-controls')?.classList.add('hidden');
    this.editor.refreshPreview();
  }

  private updateModeButtons(): void {
    document.getElementById('brush-restore-btn')?.classList.toggle('btn-primary', this.mode === 'restore');
    document.getElementById('brush-erase-btn')?.classList.toggle('btn-primary', this.mode === 'erase');
  }

  private getCanvasPoint(e: MouseEvent): { x: number; y: number } {
    const canvas = this.editor.getPreviewCanvas();
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  private handleMouseDown(e: MouseEvent): void {
    e.preventDefault();
    this.drawing = true;
    this.strokes = [];
    const canvas = this.editor.getPreviewCanvas();
    canvas.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.paintPoint(this.getCanvasPoint(e));
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.drawing) return;
    this.paintPoint(this.getCanvasPoint(e));
  }

  private handleMouseUp(): void {
    if (!this.drawing) return;
    this.drawing = false;
    const canvas = this.editor.getPreviewCanvas();
    canvas.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    if (this.strokes.length > 0) {
      this.editor.applyRefineMask([...this.strokes]);
    }
    this.strokes = [];
  }

  private paintPoint(point: { x: number; y: number }): void {
    const scale = this.editor.getPreviewScale();

    // Record stroke in full-resolution coordinates
    this.strokes.push({
      x: point.x / scale,
      y: point.y / scale,
      radius: this.brushRadius / scale,
      mode: this.mode,
    });

    // Apply immediately to the preview canvas (fast — preview resolution only)
    const canvas = this.editor.getPreviewCanvas();
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const origPixels = this.originalImageData?.data ?? null;
    const r = this.brushRadius;
    const r2 = r * r;
    const minX = Math.max(0, Math.floor(point.x - r));
    const maxX = Math.min(canvas.width - 1, Math.ceil(point.x + r));
    const minY = Math.max(0, Math.floor(point.y - r));
    const maxY = Math.min(canvas.height - 1, Math.ceil(point.y + r));

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const dx = px - point.x;
        const dy = py - point.y;
        if (dx * dx + dy * dy <= r2) {
          const idx = (py * canvas.width + px) * 4;
          if (this.mode === 'erase') {
            pixels[idx + 3] = 0;
          } else if (origPixels) {
            // Copy all 4 channels from the pre-removal original so we get the
            // correct RGB instead of black (premultiplied-alpha artefact).
            pixels[idx]     = origPixels[idx];
            pixels[idx + 1] = origPixels[idx + 1];
            pixels[idx + 2] = origPixels[idx + 2];
            pixels[idx + 3] = origPixels[idx + 3];
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }
}
