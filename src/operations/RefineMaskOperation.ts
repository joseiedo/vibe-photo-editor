import { BaseOperation } from './Operation';

export interface MaskStroke {
  x: number;       // full-resolution center x
  y: number;       // full-resolution center y
  radius: number;  // full-resolution radius
  mode: 'restore' | 'erase';
}

export class RefineMaskOperation extends BaseOperation {
  constructor(
    private strokes: MaskStroke[],
    private originalImage: ImageBitmap | null = null,
  ) {
    super();
  }

  async apply(_ctx: OffscreenCanvasRenderingContext2D, image: ImageBitmap): Promise<ImageBitmap> {
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const pixels = imageData.data;

    // Get original pixel data once upfront if any restore stroke needs it.
    let origPixels: Uint8ClampedArray | null = null;
    const needsOriginal = this.strokes.some(s => s.mode === 'restore');
    if (needsOriginal && this.originalImage) {
      const origCanvas = new OffscreenCanvas(this.originalImage.width, this.originalImage.height);
      const origCtx = origCanvas.getContext('2d')!;
      origCtx.drawImage(this.originalImage, 0, 0);
      origPixels = origCtx.getImageData(0, 0, this.originalImage.width, this.originalImage.height).data as Uint8ClampedArray;
    }

    for (const { x, y, radius, mode } of this.strokes) {
      const r2 = radius * radius;
      const minX = Math.max(0, Math.floor(x - radius));
      const maxX = Math.min(image.width - 1, Math.ceil(x + radius));
      const minY = Math.max(0, Math.floor(y - radius));
      const maxY = Math.min(image.height - 1, Math.ceil(y + radius));

      for (let py = minY; py <= maxY; py++) {
        for (let px = minX; px <= maxX; px++) {
          const dx = px - x;
          const dy = py - y;
          if (dx * dx + dy * dy <= r2) {
            const idx = (py * image.width + px) * 4;
            if (mode === 'erase') {
              pixels[idx + 3] = 0;
            } else if (origPixels) {
              // Copy all 4 channels from the original — avoids the
              // premultiplied-alpha problem where alpha=0 pixels lose their RGB.
              pixels[idx]     = origPixels[idx];
              pixels[idx + 1] = origPixels[idx + 1];
              pixels[idx + 2] = origPixels[idx + 2];
              pixels[idx + 3] = origPixels[idx + 3];
            }
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return this.createImageBitmap(canvas);
  }

  getDescription(): string {
    return 'Refine Mask';
  }
}
