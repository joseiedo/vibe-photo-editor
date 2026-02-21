import { CropRegion } from '../types';
import { BaseOperation } from './Operation';

export class CropOperation extends BaseOperation {
  constructor(private region: CropRegion) {
    super();
  }

  async apply(_ctx: OffscreenCanvasRenderingContext2D, image: ImageBitmap): Promise<ImageBitmap> {
    const { x, y, width, height } = this.region;

    // Clamp values to valid range
    const sx = Math.max(0, Math.min(x, image.width));
    const sy = Math.max(0, Math.min(y, image.height));
    const sw = Math.max(1, Math.min(width, image.width - sx));
    const sh = Math.max(1, Math.min(height, image.height - sy));

    const canvas = new OffscreenCanvas(sw, sh);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get context');

    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);

    return this.createImageBitmap(canvas);
  }

  getDescription(): string {
    return `Crop to ${Math.round(this.region.width)}x${Math.round(this.region.height)}`;
  }
}
