export class Canvas {
  private previewCanvas: HTMLCanvasElement;
  private previewCtx: CanvasRenderingContext2D;
  private fullResCanvas: OffscreenCanvas | null = null;
  private fullResCtx: OffscreenCanvasRenderingContext2D | null = null;
  private currentImage: ImageBitmap | null = null;

  constructor(canvasElement: HTMLCanvasElement) {
    this.previewCanvas = canvasElement;
    const ctx = canvasElement.getContext('2d');
    if (!ctx) throw new Error('Could not get 2d context');
    this.previewCtx = ctx;
  }

  setImage(image: ImageBitmap): void {
    this.currentImage = image;
    this.fullResCanvas = new OffscreenCanvas(image.width, image.height);
    this.fullResCtx = this.fullResCanvas.getContext('2d');
    if (!this.fullResCtx) throw new Error('Could not get offscreen context');

    this.fullResCtx.drawImage(image, 0, 0);
    this.updatePreview();
  }

  getImage(): ImageBitmap | null {
    return this.currentImage;
  }

  getFullResCanvas(): OffscreenCanvas | null {
    return this.fullResCanvas;
  }

  getFullResContext(): OffscreenCanvasRenderingContext2D | null {
    return this.fullResCtx;
  }

  updatePreview(filter?: string): void {
    if (!this.currentImage) return;

    const container = this.previewCanvas.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const padding = 40;
    const maxWidth = containerRect.width - padding;
    const maxHeight = containerRect.height - padding;

    const imageAspect = this.currentImage.width / this.currentImage.height;
    const containerAspect = maxWidth / maxHeight;

    let displayWidth: number;
    let displayHeight: number;

    if (imageAspect > containerAspect) {
      displayWidth = Math.min(maxWidth, this.currentImage.width);
      displayHeight = displayWidth / imageAspect;
    } else {
      displayHeight = Math.min(maxHeight, this.currentImage.height);
      displayWidth = displayHeight * imageAspect;
    }

    this.previewCanvas.width = displayWidth;
    this.previewCanvas.height = displayHeight;

    this.previewCtx.save();
    if (filter) {
      this.previewCtx.filter = filter;
    }
    this.previewCtx.drawImage(this.currentImage, 0, 0, displayWidth, displayHeight);
    this.previewCtx.restore();
  }

  getPreviewCanvas(): HTMLCanvasElement {
    return this.previewCanvas;
  }

  getPreviewScale(): number {
    if (!this.currentImage) return 1;
    return this.previewCanvas.width / this.currentImage.width;
  }

  async exportAsBlob(format: 'png' | 'jpeg', quality = 0.92): Promise<Blob> {
    if (!this.fullResCanvas) throw new Error('No image loaded');

    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    return await this.fullResCanvas.convertToBlob({ type: mimeType, quality });
  }

  clear(): void {
    this.currentImage = null;
    this.fullResCanvas = null;
    this.fullResCtx = null;
    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    this.previewCanvas.width = 0;
    this.previewCanvas.height = 0;
  }
}
