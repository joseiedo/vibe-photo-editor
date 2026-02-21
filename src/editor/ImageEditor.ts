import { Canvas } from './Canvas';
import { History } from './History';
import { Operation, CropRegion, MergePosition, AdjustmentValues, ShapeData } from '../types';
import { FlipOperation } from '../operations/FlipOperation';
import { RotateOperation } from '../operations/RotateOperation';
import { CropOperation } from '../operations/CropOperation';
import { MergeOperation } from '../operations/MergeOperation';
import { AdjustOperation } from '../operations/AdjustOperation';
import { ShapeOperation } from '../operations/ShapeOperation';
import { UpscaleOperation } from '../operations/UpscaleOperation';
import { RemoveBgOperation, MaskCache } from '../operations/RemoveBgOperation';
import { RefineMaskOperation, MaskStroke } from '../operations/RefineMaskOperation';

const DEFAULT_ADJUSTMENTS: AdjustmentValues = { brightness: 100, contrast: 100, saturation: 100 };

function isDefaultAdjustments(adj: AdjustmentValues): boolean {
  return adj.brightness === 100 && adj.contrast === 100 && adj.saturation === 100;
}

interface PendingRemoveBg {
  originalImage: ImageBitmap;
  mask: MaskCache;
  threshold: number;
}

export class ImageEditor {
  private canvas: Canvas;
  private history: History;
  private onStateChange: () => void;
  private pendingAdjustments: AdjustmentValues | null = null;
  private pendingRemoveBg: PendingRemoveBg | null = null;
  // Keeps the original image (before background removal) so the refine brush
  // can copy pixels from it when restoring — needed because Canvas 2D
  // premultiplies alpha and erased pixels lose their RGB values.
  private originalBeforeRemoval: ImageBitmap | null = null;

  constructor(canvasElement: HTMLCanvasElement, onStateChange: () => void) {
    this.canvas = new Canvas(canvasElement);
    this.history = new History();
    this.onStateChange = onStateChange;
  }

  async loadImage(file: File): Promise<void> {
    this.pendingRemoveBg = null;
    this.originalBeforeRemoval = null;
    RemoveBgOperation.clearCache();
    const bitmap = await createImageBitmap(file);
    this.canvas.setImage(bitmap);
    this.history.clear();
    this.history.push(bitmap, 'Original');
    this.onStateChange();
  }

  private async applyOperation(operation: Operation): Promise<void> {
    await this.flushAdjustments();
    await this.flushPendingMask();

    const currentImage = this.canvas.getImage();
    if (!currentImage) return;

    const ctx = this.canvas.getFullResContext();
    if (!ctx) return;

    const newImage = await operation.apply(ctx, currentImage);
    this.canvas.setImage(newImage);
    this.history.push(newImage, operation.getDescription());
    this.onStateChange();
  }

  async flipHorizontal(): Promise<void> {
    await this.applyOperation(new FlipOperation(true));
  }

  async flipVertical(): Promise<void> {
    await this.applyOperation(new FlipOperation(false));
  }

  async rotate(degrees: number): Promise<void> {
    await this.applyOperation(new RotateOperation(degrees));
  }

  async crop(region: CropRegion): Promise<void> {
    await this.applyOperation(new CropOperation(region));
  }

  async merge(file: File, position: MergePosition): Promise<void> {
    const secondImage = await createImageBitmap(file);
    await this.applyOperation(new MergeOperation(secondImage, position));
  }

  async applyAdjustments(adjustments: AdjustmentValues): Promise<void> {
    await this.applyOperation(new AdjustOperation(adjustments));
  }

  setPendingAdjustments(adjustments: AdjustmentValues): void {
    this.pendingAdjustments = adjustments;
    const filter = AdjustOperation.buildFilter(adjustments);
    this.canvas.updatePreview(filter);
  }

  clearPendingAdjustments(): void {
    this.pendingAdjustments = null;
    this.canvas.updatePreview();
  }

  hasPendingAdjustments(): boolean {
    return this.pendingAdjustments !== null && !isDefaultAdjustments(this.pendingAdjustments);
  }

  async flushAdjustments(): Promise<void> {
    // Clear pending BEFORE awaiting so re-entrant calls from applyOperation don't recurse.
    const adj = this.pendingAdjustments;
    this.pendingAdjustments = null;
    if (adj && !isDefaultAdjustments(adj)) {
      await this.applyAdjustments(adj);
    }
    this.canvas.updatePreview();
  }

  // kept for Sliders reset button
  resetPreview(): void {
    this.pendingAdjustments = null;
    this.canvas.updatePreview();
  }

  // Redraws the preview (respecting any pending adjustment filter) then calls
  // drawFn so callers can paint on top without touching the stored image.
  drawOnPreview(drawFn: (ctx: CanvasRenderingContext2D) => void): void {
    const filter = this.pendingAdjustments
      ? AdjustOperation.buildFilter(this.pendingAdjustments)
      : undefined;
    this.canvas.drawOnPreview(drawFn, filter);
  }

  // Refresh preview without clearing pending adjustments (used after shape tool deactivation
  // and on window resize).
  refreshPreview(): void {
    if (this.pendingRemoveBg) {
      this.applyMaskPreview(this.pendingRemoveBg.threshold);
      return;
    }
    const filter = this.pendingAdjustments
      ? AdjustOperation.buildFilter(this.pendingAdjustments)
      : undefined;
    this.canvas.updatePreview(filter);
  }

  async applyShape(shape: ShapeData): Promise<void> {
    await this.applyOperation(new ShapeOperation(shape));
  }

  async upscale(scale: number): Promise<void> {
    await this.applyOperation(new UpscaleOperation(scale));
  }

  async applyRefineMask(strokes: MaskStroke[]): Promise<void> {
    await this.applyOperation(new RefineMaskOperation(strokes, this.originalBeforeRemoval));
  }

  // --- Background removal ---

  // Runs the model (or uses the mask cache) and stores the result as pending.
  // The preview is updated immediately; nothing is committed to history yet.
  async runRemoveBg(threshold: number, onProgress: (status: string) => void): Promise<void> {
    await this.flushAdjustments();
    this.pendingRemoveBg = null;

    const currentImage = this.canvas.getImage();
    if (!currentImage) return;

    const mask = await RemoveBgOperation.fetchMask(currentImage, onProgress);
    this.pendingRemoveBg = { originalImage: currentImage, mask, threshold };
    this.applyMaskPreview(threshold);
    this.onStateChange();
  }

  // Updates the preview instantly when the threshold slider moves.
  previewRemoveBgThreshold(threshold: number): void {
    if (!this.pendingRemoveBg) return;
    this.pendingRemoveBg.threshold = threshold;
    this.applyMaskPreview(threshold);
  }

  // Commits the pending removal to history.
  async commitRemoveBg(): Promise<void> {
    if (!this.pendingRemoveBg) return;
    const { originalImage, mask, threshold } = this.pendingRemoveBg;
    this.pendingRemoveBg = null;

    const currentImage = this.canvas.getImage();
    if (!currentImage) return;

    const outCanvas = new OffscreenCanvas(currentImage.width, currentImage.height);
    RemoveBgOperation.applyMask(currentImage, mask, threshold, outCanvas);
    const newImage = await createImageBitmap(outCanvas);

    // Store the pre-removal image so the refine brush can copy original pixels
    // back when restoring (premultiplied-alpha means erased pixels have RGB=0).
    this.originalBeforeRemoval = originalImage;

    this.canvas.setImage(newImage);
    this.history.push(newImage, 'Remove Background');
    this.onStateChange();
  }

  hasPendingMask(): boolean {
    return this.pendingRemoveBg !== null;
  }

  private async flushPendingMask(): Promise<void> {
    if (this.pendingRemoveBg) {
      await this.commitRemoveBg();
    }
  }

  // Applies the stored mask at the given threshold to the preview canvas (fast — preview resolution only).
  private applyMaskPreview(threshold: number): void {
    if (!this.pendingRemoveBg) return;
    const { originalImage, mask } = this.pendingRemoveBg;

    const previewCanvas = this.canvas.getPreviewCanvas();
    const w = previewCanvas.width;
    const h = previewCanvas.height;
    if (w === 0 || h === 0) return;

    const tmpCanvas = new OffscreenCanvas(w, h);
    RemoveBgOperation.applyMask(originalImage, mask, threshold, tmpCanvas);
    this.canvas.drawOffscreenToPreview(tmpCanvas);
  }

  // --- History ---

  getDefaultAdjustments(): AdjustmentValues {
    return { ...DEFAULT_ADJUSTMENTS };
  }

  undo(): void {
    const entry = this.history.undo();
    if (entry) {
      this.pendingRemoveBg = null;
      this.originalBeforeRemoval = null;
      this.canvas.setImage(entry.image);
      this.onStateChange();
    }
  }

  redo(): void {
    const entry = this.history.redo();
    if (entry) {
      this.pendingRemoveBg = null;
      this.originalBeforeRemoval = null;
      this.canvas.setImage(entry.image);
      this.onStateChange();
    }
  }

  canUndo(): boolean {
    return this.history.canUndo();
  }

  canRedo(): boolean {
    return this.history.canRedo();
  }

  hasImage(): boolean {
    return this.canvas.getImage() !== null;
  }

  async exportAsBlob(format: 'png' | 'jpeg'): Promise<Blob> {
    return this.canvas.exportAsBlob(format);
  }

  getPreviewCanvas(): HTMLCanvasElement {
    return this.canvas.getPreviewCanvas();
  }

  getPreviewScale(): number {
    return this.canvas.getPreviewScale();
  }

  getOriginalBeforeRemoval(): ImageBitmap | null {
    return this.originalBeforeRemoval;
  }

  closeOriginalBeforeRemoval(): void {
    this.originalBeforeRemoval?.close();
    this.originalBeforeRemoval = null;
  }

  getImageDimensions(): { width: number; height: number } | null {
    const image = this.canvas.getImage();
    if (!image) return null;
    return { width: image.width, height: image.height };
  }
}
