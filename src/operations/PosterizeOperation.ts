import { BaseOperation } from './Operation';

export class PosterizeOperation extends BaseOperation {
  constructor(private levels: number) {
    super();
  }

  static applyToPixels(data: Uint8ClampedArray, levels: number): void {
    const step = 255 / (levels - 1);
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = Math.round(Math.floor(data[i]     * levels / 256) * step);
      data[i + 1] = Math.round(Math.floor(data[i + 1] * levels / 256) * step);
      data[i + 2] = Math.round(Math.floor(data[i + 2] * levels / 256) * step);
      // alpha (i + 3) unchanged
    }
  }

  async apply(_ctx: OffscreenCanvasRenderingContext2D, image: ImageBitmap): Promise<ImageBitmap> {
    const canvas = new OffscreenCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get context');

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    PosterizeOperation.applyToPixels(imageData.data, this.levels);
    ctx.putImageData(imageData, 0, 0);
    return this.createImageBitmap(canvas);
  }

  getDescription(): string {
    return `Posterize (${this.levels} levels)`;
  }
}
