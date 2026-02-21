import { BaseOperation } from './Operation';

export class UpscaleOperation extends BaseOperation {
  constructor(private scale: number) {
    super();
  }

  async apply(_ctx: OffscreenCanvasRenderingContext2D, image: ImageBitmap): Promise<ImageBitmap> {
    const newWidth = Math.round(image.width * this.scale);
    const newHeight = Math.round(image.height * this.scale);

    const canvas = new OffscreenCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get context');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, newWidth, newHeight);

    return this.createImageBitmap(canvas);
  }

  getDescription(): string {
    return `Upscale ${this.scale}×`;
  }
}
