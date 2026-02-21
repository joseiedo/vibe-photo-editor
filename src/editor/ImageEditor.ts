import { Canvas } from './Canvas';
import { History } from './History';
import { Operation, CropRegion, MergePosition, AdjustmentValues, ShapeData } from '../types';
import { FlipOperation } from '../operations/FlipOperation';
import { RotateOperation } from '../operations/RotateOperation';
import { CropOperation } from '../operations/CropOperation';
import { MergeOperation } from '../operations/MergeOperation';
import { AdjustOperation } from '../operations/AdjustOperation';
import { ShapeOperation } from '../operations/ShapeOperation';

const DEFAULT_ADJUSTMENTS: AdjustmentValues = { brightness: 100, contrast: 100, saturation: 100 };

function isDefaultAdjustments(adj: AdjustmentValues): boolean {
  return adj.brightness === 100 && adj.contrast === 100 && adj.saturation === 100;
}

export class ImageEditor {
  private canvas: Canvas;
  private history: History;
  private onStateChange: () => void;
  private pendingAdjustments: AdjustmentValues | null = null;

  constructor(canvasElement: HTMLCanvasElement, onStateChange: () => void) {
    this.canvas = new Canvas(canvasElement);
    this.history = new History();
    this.onStateChange = onStateChange;
  }

  async loadImage(file: File): Promise<void> {
    const bitmap = await createImageBitmap(file);
    this.canvas.setImage(bitmap);
    this.history.clear();
    this.history.push(bitmap, 'Original');
    this.onStateChange();
  }

  private async applyOperation(operation: Operation): Promise<void> {
    await this.flushAdjustments();

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

  // Refresh preview without clearing pending adjustments (used after shape tool deactivation)
  refreshPreview(): void {
    const filter = this.pendingAdjustments
      ? AdjustOperation.buildFilter(this.pendingAdjustments)
      : undefined;
    this.canvas.updatePreview(filter);
  }

  async applyShape(shape: ShapeData): Promise<void> {
    await this.applyOperation(new ShapeOperation(shape));
  }

  getDefaultAdjustments(): AdjustmentValues {
    return { ...DEFAULT_ADJUSTMENTS };
  }

  undo(): void {
    const entry = this.history.undo();
    if (entry) {
      this.canvas.setImage(entry.image);
      this.onStateChange();
    }
  }

  redo(): void {
    const entry = this.history.redo();
    if (entry) {
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

  getImageDimensions(): { width: number; height: number } | null {
    const image = this.canvas.getImage();
    if (!image) return null;
    return { width: image.width, height: image.height };
  }
}
